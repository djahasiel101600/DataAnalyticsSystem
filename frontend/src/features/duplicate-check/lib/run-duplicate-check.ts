import type { Dataset, DataRow } from '@/entities/dataset'
import { parseDate } from '@/shared/lib/date-parse'

export type DuplicateCheckMode = 'mark' | 'remove'
export type DuplicateCheckKeep = 'first' | 'last'

export type DuplicateKeepStrategy =
  | 'first'
  | 'last'
  | 'max'
  | 'min'
  | 'most_complete'
  | 'priority'

export type DuplicateCompareAs = 'auto' | 'text' | 'number' | 'date'

export interface DuplicateCheckOptions {
  ignoreCase?: boolean
  trim?: boolean
  /** How to pick the preserved row within each duplicate group. Defaults to keep first/last. */
  keepStrategy?: DuplicateKeepStrategy
  /** Used when keepStrategy is max/min/priority. */
  keepByColumn?: string
  /** How to compare keepByColumn for max/min. */
  compareAs?: DuplicateCompareAs
  /** Used when keepStrategy is priority. Earlier values win. */
  priorityValues?: string[]
  /** Used when keepStrategy is most_complete. If omitted, uses all columns. */
  completenessColumns?: string[]
  /** When mode is 'mark', include preview columns that show which row would be kept. */
  addKeepPreviewColumns?: boolean
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

function empty(v: unknown): boolean {
  return v === '' || v === null || v === undefined
}

function coerceNumber(v: unknown): number {
  if (typeof v === 'number') return v
  const n = Number(String(v ?? ''))
  return Number.isNaN(n) ? NaN : n
}

function compareValues(a: unknown, b: unknown, as: DuplicateCompareAs): number {
  if (as === 'date') {
    const ta = parseDate(a)
    const tb = parseDate(b)
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb
    // fallback to text
  }
  if (as === 'number') {
    const na = coerceNumber(a)
    const nb = coerceNumber(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    // fallback to text
  }
  if (as === 'auto') {
    const ta = parseDate(a)
    const tb = parseDate(b)
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb
    const na = coerceNumber(a)
    const nb = coerceNumber(b)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  }
  return String(a ?? '').localeCompare(String(b ?? ''))
}

function pickOrderForGroup(
  dataset: Dataset,
  groupIndices: number[],
  opts: Required<Pick<
    DuplicateCheckOptions,
    | 'keepStrategy'
    | 'keepByColumn'
    | 'compareAs'
    | 'priorityValues'
    | 'completenessColumns'
    | 'trim'
    | 'ignoreCase'
  >>
): number[] {
  const strat = opts.keepStrategy
  if (strat === 'first') return [...groupIndices].sort((a, b) => a - b)
  if (strat === 'last') return [...groupIndices].sort((a, b) => b - a)

  if (strat === 'most_complete') {
    const cols = (opts.completenessColumns?.length ? opts.completenessColumns : dataset.columns) as string[]
    return [...groupIndices].sort((ia, ib) => {
      const ra = dataset.rows[ia]
      const rb = dataset.rows[ib]
      const scoreA = cols.reduce((acc, c) => acc + (empty(ra[c]) ? 0 : 1), 0)
      const scoreB = cols.reduce((acc, c) => acc + (empty(rb[c]) ? 0 : 1), 0)
      if (scoreB !== scoreA) return scoreB - scoreA
      return ia - ib
    })
  }

  const col = opts.keepByColumn
  if (!col) return [...groupIndices].sort((a, b) => a - b)

  if (strat === 'priority') {
    const priority = opts.priorityValues ?? []
    const rank = (v: unknown) => {
      const s = normalizeKeyPart(v, opts)
      const idx = priority.findIndex((p) => normalizeKeyPart(p, opts) === s)
      return idx === -1 ? Number.POSITIVE_INFINITY : idx
    }
    return [...groupIndices].sort((ia, ib) => {
      const ra = dataset.rows[ia]
      const rb = dataset.rows[ib]
      const raRank = rank(ra[col])
      const rbRank = rank(rb[col])
      if (raRank !== rbRank) return raRank - rbRank
      return ia - ib
    })
  }

  if (strat === 'max' || strat === 'min') {
    const dir = strat === 'max' ? -1 : 1
    return [...groupIndices].sort((ia, ib) => {
      const ra = dataset.rows[ia]
      const rb = dataset.rows[ib]
      const cmp = compareValues(ra[col], rb[col], opts.compareAs)
      if (cmp !== 0) return cmp * dir
      return ia - ib
    })
  }

  return [...groupIndices].sort((a, b) => a - b)
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
  const opts = {
    ignoreCase: false,
    trim: false,
    keepStrategy: keep as DuplicateKeepStrategy,
    keepByColumn: options.keepByColumn ?? '',
    compareAs: options.compareAs ?? 'auto',
    priorityValues: options.priorityValues ?? [],
    completenessColumns: options.completenessColumns ?? [],
    addKeepPreviewColumns: options.addKeepPreviewColumns ?? true,
    ...options,
  }
  if (keyColumns.length === 0) {
    const baseCols = [...dataset.columns, '_is_duplicate', '_duplicate_count']
    const previewCols = ['_dup_group', '_dup_rank', '_dup_keep']
    return {
      columns: mode === 'mark'
        ? (opts.addKeepPreviewColumns ? [...baseCols, ...previewCols] : baseCols)
        : dataset.columns,
      rows: mode === 'mark'
        ? dataset.rows.map((r) => ({
          ...r,
          _is_duplicate: 0,
          _duplicate_count: 1,
          ...(opts.addKeepPreviewColumns ? { _dup_group: '', _dup_rank: 1, _dup_keep: 1 } : {}),
        }))
        : dataset.rows,
    }
  }

  const keyToIndices = new Map<string, number[]>()
  for (let i = 0; i < dataset.rows.length; i++) {
    const key = rowKey(dataset.rows[i], keyColumns, opts)
    const arr = keyToIndices.get(key) ?? []
    arr.push(i)
    keyToIndices.set(key, arr)
  }

  if (mode === 'remove') {
    const keptSet = new Set<number>()
    for (const indices of keyToIndices.values()) {
      const order = pickOrderForGroup(dataset, indices, opts)
      const keepIndex = order[0]
      if (keepIndex !== undefined) keptSet.add(keepIndex)
    }
    const rows = dataset.rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ idx }) => keptSet.has(idx))
      .sort((a, b) => a.idx - b.idx)
      .map(({ r }) => ({ ...r }))
    return { columns: dataset.columns, rows }
  }

  // mark mode (with optional keep-preview columns)
  const previewCols = ['_dup_group', '_dup_rank', '_dup_keep']
  const resultColumns = opts.addKeepPreviewColumns
    ? [...dataset.columns, '_is_duplicate', '_duplicate_count', ...previewCols]
    : [...dataset.columns, '_is_duplicate', '_duplicate_count']

  const indexToPreview = new Map<number, { group: string; rank: number; keep: number }>()
  let groupCounter = 0
  for (const indices of keyToIndices.values()) {
    groupCounter += 1
    const groupId = `G${groupCounter}`
    const order = pickOrderForGroup(dataset, indices, opts)
    for (let r = 0; r < order.length; r++) {
      const idx = order[r]
      indexToPreview.set(idx, { group: groupId, rank: r + 1, keep: r === 0 ? 1 : 0 })
    }
  }

  const resultRows: DataRow[] = dataset.rows.map((row, i) => {
    const key = rowKey(row, keyColumns, opts)
    const count = keyToIndices.get(key)?.length ?? 1
    const base: DataRow = {
      ...row,
      _is_duplicate: count > 1 ? 1 : 0,
      _duplicate_count: count,
    }
    if (!opts.addKeepPreviewColumns) return base
    const p = indexToPreview.get(i) ?? { group: '', rank: 1, keep: 1 }
    return { ...base, _dup_group: p.group, _dup_rank: p.rank, _dup_keep: p.keep }
  })
  return { columns: resultColumns, rows: resultRows }
}
