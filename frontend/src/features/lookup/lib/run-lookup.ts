import type { Dataset, DataRow } from '@/entities/dataset'

export interface KeyPair {
  /** Column from the source dataset. */
  sourceColumn: string
  /** Matching column from the lookup dataset. */
  lookupColumn: string
}

export interface LookupOptions {
  /** Case-insensitive key matching (default false). */
  ignoreCase?: boolean
  /** Trim whitespace around key values before matching (default false). */
  trim?: boolean
  /** Exclude source rows that have no match in the lookup dataset. */
  excludeUnmatched?: boolean
}

function normalizePart(value: unknown, opts: LookupOptions): string {
  let s = String(value ?? '')
  if (opts.trim) s = s.trim()
  if (opts.ignoreCase) s = s.toLowerCase()
  return s
}

/** Build a composite join key from a row using the given key pairs. */
function buildKey(pairs: KeyPair[], row: DataRow, opts: LookupOptions): string {
  return pairs.map((p) => normalizePart(row[p.sourceColumn], opts)).join('\t')
}

/** Check if every segment of the composite key is empty. */
function isAllEmptyKey(pairs: KeyPair[], row: DataRow, opts: LookupOptions): boolean {
  return pairs.every((p) => normalizePart(row[p.sourceColumn], opts) === '')
}

function assertColumns(columns: string[], required: string[], context: string): void {
  const missing = required.filter((c) => !columns.includes(c))
  if (missing.length > 0) {
    throw new Error(`${context}: requested columns do not exist on dataset: ${missing.join(', ')}`)
  }
}

/**
 * Left join: for each row in source, find first match in lookup by key pairs and append selected columns.
 *
 * Key matching:
 * - Uses explicit source→lookup column pairs, so column order in each dataset does not matter.
 * - Tries the primary key set first, then each fallback key set in order (first match found wins).
 * - Honors `ignoreCase` and `trim` options.
 * - Each key set (primary + fallbacks) is validated and filtered: pairs with empty columns are dropped,
 *   and sets that become empty are skipped (primary throws if empty).
 * - Empty composite keys never match:
 *     · Lookup rows whose composite key is all-empty are excluded from that key set's lookup map.
 *     · Source rows whose composite key is all-empty for a given key set never match via that key set.
 *   A source row with an empty primary key may still match via a fallback set that uses different,
 *   non-empty columns — this is intentional, since fallbacks exist to handle rows the primary key
 *   cannot cover. Use `_match_level` in the output to see which set (if any) matched.
 * - Duplicate keys: first occurrence wins, and duplicates are reported in diagnostics per key set.
 *
 * Output:
 * - Adds `_match_level` column: 'primary' | 'fallback_N' | 'unmatched'.
 * - When `excludeUnmatched` is true, unmatched source rows are dropped.
 * - Retrieved columns that collide with source columns throw an error.
 */
export function runLookup(
  source: Dataset,
  keyPairs: KeyPair[],
  lookup: Dataset,
  columnsToRetrieve: string[],
  fallbackKeySets: KeyPair[][] = [],
  options: LookupOptions = {}
): { columns: string[]; rows: DataRow[]; diagnostics: string[] } {
  const { ignoreCase = false, trim = false, excludeUnmatched = false } = options
  const opts: LookupOptions = { ignoreCase, trim, excludeUnmatched }
  const diagnostics: string[] = []

  // Detect retrieved-column name collisions before doing any work.
  const collisions = columnsToRetrieve.filter((c) => source.columns.includes(c))
  if (collisions.length > 0) {
    throw new Error(
      `Lookup: retrieved column(s) collide with existing source columns: ${collisions.join(', ')}. Rename the lookup column(s) or choose different columns to retrieve.`
    )
  }

  // Validate and filter every key set (primary AND fallbacks).
  const allKeySets: KeyPair[][] = [keyPairs, ...fallbackKeySets]
  const cleanedKeySets: { pairs: KeyPair[]; label: string }[] = []

  for (let i = 0; i < allKeySets.length; i++) {
    const pairs = allKeySets[i]
    const cleaned = pairs.filter((p) => p.sourceColumn && p.lookupColumn)
    if (cleaned.length === 0) {
      if (i === 0) {
        throw new Error(
          'Lookup: primary key set requires at least one complete source→lookup column pair.'
        )
      }
      // Skip empty fallback sets silently.
      continue
    }
    const label = i === 0 ? 'primary' : `fallback_${i}`
    assertColumns(
      source.columns,
      cleaned.map((p) => p.sourceColumn),
      `Lookup key set ${i + 1} source`
    )
    assertColumns(
      lookup.columns,
      cleaned.map((p) => p.lookupColumn),
      `Lookup key set ${i + 1} lookup`
    )
    cleanedKeySets.push({ pairs: cleaned, label })
  }

  assertColumns(lookup.columns, columnsToRetrieve, 'Lookup retrieve')

  // Build lookup maps for each cleaned key set.
  const lookupMaps = new Map<number, Map<string, DataRow>>()

  for (let i = 0; i < cleanedKeySets.length; i++) {
    const { pairs, label } = cleanedKeySets[i]
    const map = new Map<string, DataRow>()
    let duplicates = 0
    let emptyLookupKeys = 0

    for (const row of lookup.rows) {
      if (isAllEmptyKey(pairs, row, opts)) {
        emptyLookupKeys++
        continue
      }
      const key = buildKey(pairs, row, opts)
      if (map.has(key)) {
        duplicates++
      } else {
        map.set(key, row)
      }
    }

    lookupMaps.set(i, map)

    if (emptyLookupKeys > 0) {
      diagnostics.push(
        `Key set ${label} skipped ${emptyLookupKeys} lookup row(s) with empty key(s).`
      )
    }
    if (duplicates > 0) {
      diagnostics.push(
        `Key set ${label} has ${duplicates} duplicate key(s); first occurrence used.`
      )
    }
  }

  const resultColumns = [...source.columns]
  for (const col of columnsToRetrieve) {
    if (!resultColumns.includes(col)) {
      resultColumns.push(col)
    }
  }
  resultColumns.push('_match_level')

  const resultRows: DataRow[] = []
  let matchedCount = 0
  let unmatchedCount = 0
  let emptyKeySourceRows = 0

  for (const sourceRow of source.rows) {
    let matchedRow: DataRow | undefined
    let matchLevel = ''
    // True only if every key set we tried was skipped because its key was empty for this row.
    let skippedAllForEmptyKey = cleanedKeySets.length > 0

    for (let i = 0; i < cleanedKeySets.length; i++) {
      const { pairs, label } = cleanedKeySets[i]
      if (isAllEmptyKey(pairs, sourceRow, opts)) {
        // This key set cannot match this row (empty key). Keep trying others.
        continue
      }
      skippedAllForEmptyKey = false
      const key = buildKey(pairs, sourceRow, opts)
      const candidate = lookupMaps.get(i)?.get(key)
      if (candidate) {
        matchedRow = candidate
        matchLevel = label
        break
      }
    }

    if (matchedRow) {
      matchedCount++
      const out: DataRow = { ...sourceRow }
      for (const col of columnsToRetrieve) {
        out[col] = matchedRow[col] ?? ''
      }
      out._match_level = matchLevel
      resultRows.push(out)
    } else {
      unmatchedCount++
      if (skippedAllForEmptyKey) {
        emptyKeySourceRows++
      }
      if (!excludeUnmatched) {
        const out: DataRow = { ...sourceRow }
        for (const col of columnsToRetrieve) {
          out[col] = ''
        }
        out._match_level = 'unmatched'
        resultRows.push(out)
      }
    }
  }

  if (emptyKeySourceRows > 0) {
    diagnostics.push(
      `${emptyKeySourceRows} source row(s) had empty key(s) in every key set and were marked unmatched.`
    )
  }

  const unmatchedSuffix = excludeUnmatched ? ' (excluded)' : ''
  diagnostics.push(
    `Matched ${matchedCount} of ${source.rows.length} source row(s). ${unmatchedCount} unmatched${unmatchedSuffix}.`
  )

  return { columns: resultColumns, rows: resultRows, diagnostics }
}