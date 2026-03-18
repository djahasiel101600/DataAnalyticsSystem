import type { Dataset, DataRow } from '@/entities/dataset'

export type DuplicateCheckMode = 'mark' | 'remove'
export type DuplicateCheckKeep = 'first' | 'last'

export interface DuplicateCheckOptions {
  ignoreCase?: boolean
  trim?: boolean
}

function normalizeKeyPart(value: unknown, opts: DuplicateCheckOptions): string {
  let s = String(value ?? '')
  if (opts.trim) s = s.trim()
  if (opts.ignoreCase) s = s.toLowerCase()
  return s
}

function rowKey(row: DataRow, keyColumns: string[], opts: DuplicateCheckOptions): string {
  return keyColumns.map((c) => normalizeKeyPart(row[c], opts)).join('\t')
}

/**
 * When mode is 'mark': returns all rows with _is_duplicate and _duplicate_count.
 * When mode is 'remove': returns only one row per key (keep first or last).
 */
export function runDuplicateCheck(
  dataset: Dataset,
  keyColumns: string[],
  mode: DuplicateCheckMode = 'mark',
  keep: DuplicateCheckKeep = 'first',
  options: DuplicateCheckOptions = {}
): { columns: string[]; rows: DataRow[] } {
  const opts = { ignoreCase: false, trim: false, ...options }
  if (keyColumns.length === 0) {
    const baseCols = [...dataset.columns, '_is_duplicate', '_duplicate_count']
    return {
      columns: mode === 'mark' ? baseCols : dataset.columns,
      rows: mode === 'mark'
        ? dataset.rows.map((r) => ({ ...r, _is_duplicate: 0, _duplicate_count: 1 }))
        : dataset.rows,
    }
  }

  const keyToCount = new Map<string, number>()
  for (const row of dataset.rows) {
    const key = rowKey(row, keyColumns, opts)
    keyToCount.set(key, (keyToCount.get(key) ?? 0) + 1)
  }

  if (mode === 'remove') {
    const seen = new Set<string>()
    const resultRows: DataRow[] = []
    const iter = keep === 'first' ? dataset.rows : [...dataset.rows].reverse()
    for (const row of iter) {
      const key = rowKey(row, keyColumns, opts)
      if (seen.has(key)) continue
      seen.add(key)
      resultRows.push({ ...row })
    }
    if (keep === 'last') resultRows.reverse()
    return { columns: dataset.columns, rows: resultRows }
  }

  const resultColumns = [...dataset.columns, '_is_duplicate', '_duplicate_count']
  const resultRows: DataRow[] = dataset.rows.map((row) => {
    const key = rowKey(row, keyColumns, opts)
    const count = keyToCount.get(key) ?? 1
    return {
      ...row,
      _is_duplicate: count > 1 ? 1 : 0,
      _duplicate_count: count,
    }
  })
  return { columns: resultColumns, rows: resultRows }
}
