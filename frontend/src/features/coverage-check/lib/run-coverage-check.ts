import type { Dataset, DataRow } from '@/entities/dataset'

export type CoverageRule = 'all' | 'any'
export type CoverageOutputMode = 'annotate' | 'only_missing' | 'only_complete'

export interface CoverageCheckReference {
  dataset: Dataset
  keyColumns: string[]
}

export interface CoverageCheckOptions {
  rule?: CoverageRule
  outputMode?: CoverageOutputMode
  ignoreCase?: boolean
  trim?: boolean
  /** Adds a computed key column for debugging. */
  addKeyColumn?: boolean
}

function normalizePart(value: unknown, opts: Required<Pick<CoverageCheckOptions, 'ignoreCase' | 'trim'>>): string {
  let s = String(value ?? '')
  if (opts.trim) s = s.trim()
  if (opts.ignoreCase) s = s.toLowerCase()
  return s
}

function makeKey(row: DataRow, keyColumns: string[], opts: Required<Pick<CoverageCheckOptions, 'ignoreCase' | 'trim'>>): string {
  return keyColumns.map((c) => normalizePart(row[c], opts)).join('\t')
}

function safeColName(name: string): string {
  return name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()
}

export function runCoverageCheck(
  primary: Dataset,
  primaryKeyColumns: string[],
  references: CoverageCheckReference[],
  opts: CoverageCheckOptions = {}
): { columns: string[]; rows: DataRow[] } {
  const options = {
    rule: 'all' as CoverageRule,
    outputMode: 'annotate' as CoverageOutputMode,
    ignoreCase: false,
    trim: false,
    addKeyColumn: true,
    ...opts,
  }

  const norm = { ignoreCase: options.ignoreCase, trim: options.trim }
  const refs = references.filter((r) => r.keyColumns.length > 0)

  const refKeyToCount = new Map<string, Map<string, number>>()
  const refSafeName = new Map<string, string>()

  for (const ref of refs) {
    const safe = safeColName(ref.dataset.name)
    refSafeName.set(ref.dataset.id, safe)
    const map = new Map<string, number>()
    for (const row of ref.dataset.rows) {
      const k = makeKey(row, ref.keyColumns, norm)
      map.set(k, (map.get(k) ?? 0) + 1)
    }
    refKeyToCount.set(ref.dataset.id, map)
  }

  const existsCols = refs.map((r) => `_exists_in_${refSafeName.get(r.dataset.id) ?? safeColName(r.dataset.name)}`)
  const countCols = refs.map((r) => `_match_count_${refSafeName.get(r.dataset.id) ?? safeColName(r.dataset.name)}`)
  const extraCols = [
    ...(options.addKeyColumn ? ['_key'] : []),
    ...existsCols,
    ...countCols,
    '_missing_in',
    '_coverage_ok',
  ]

  const outColumns = [...primary.columns, ...extraCols]

  const annotated: DataRow[] = primary.rows.map((row) => {
    const key = makeKey(row, primaryKeyColumns, norm)
    const missing: string[] = []
    const out: DataRow = { ...row }

    if (options.addKeyColumn) out._key = key

    const existenceFlags: number[] = []
    for (const ref of refs) {
      const safe = refSafeName.get(ref.dataset.id) ?? safeColName(ref.dataset.name)
      const map = refKeyToCount.get(ref.dataset.id) ?? new Map<string, number>()
      const cnt = map.get(key) ?? 0
      const exists = cnt > 0 ? 1 : 0
      out[`_exists_in_${safe}`] = exists
      out[`_match_count_${safe}`] = cnt
      existenceFlags.push(exists)
      if (!exists) missing.push(ref.dataset.name)
    }

    const ok =
      refs.length === 0
        ? 1
        : options.rule === 'all'
          ? (existenceFlags.every((v) => v === 1) ? 1 : 0)
          : (existenceFlags.some((v) => v === 1) ? 1 : 0)

    out._missing_in = missing.join(', ')
    out._coverage_ok = ok
    return out
  })

  const filtered =
    options.outputMode === 'only_missing'
      ? annotated.filter((r) => Number(r._coverage_ok) === 0)
      : options.outputMode === 'only_complete'
        ? annotated.filter((r) => Number(r._coverage_ok) === 1)
        : annotated

  return { columns: outColumns, rows: filtered }
}

