import type { Dataset, DataRow } from '@/entities/dataset'

export type CleanAction = 'trim' | 'lowercase' | 'uppercase' | 'standardize'

export interface StandardizeRule {
  /** Column to apply to */
  column: string
  /** Map: original value -> normalized value (e.g. "active" -> "Active") */
  map: Record<string, string>
  /** If true, values not in map are left as-is; otherwise lowercased and looked up. */
  exactOnly?: boolean
}

export interface CleanDataOptions {
  /** Columns to clean; if empty, all columns. */
  columns?: string[]
  /** Apply trim to string values. */
  trim?: boolean
  /** Apply lowercase to string values. */
  lowercase?: boolean
  /** Apply uppercase to string values. */
  uppercase?: boolean
  /** Replace empty/null with this value (optional). */
  fillEmpty?: string
  /** Standardize specific column values (e.g. status: Active, active, ACTIVE -> Active). */
  standardizeRules?: StandardizeRule[]
}

function cleanCell(
  value: string | number | boolean | null,
  opts: { trim?: boolean; lowercase?: boolean; uppercase?: boolean; fillEmpty?: string }
): string | number | boolean {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'boolean') return value
  let s = String(value ?? '')
  if (opts.trim) s = s.trim()
  if (opts.fillEmpty !== undefined && s === '') return opts.fillEmpty
  if (opts.lowercase) s = s.toLowerCase()
  if (opts.uppercase) s = s.toUpperCase()
  return s
}

export function runCleanData(dataset: Dataset, options: CleanDataOptions = {}): { columns: string[]; rows: DataRow[] } {
  const {
    columns: colSet = dataset.columns,
    trim = false,
    lowercase = false,
    uppercase = false,
    fillEmpty,
    standardizeRules = [],
  } = options

  const columnsToClean = colSet.length > 0 ? colSet : dataset.columns
  
  // Build per-column standardize maps with case-insensitive lookup keys.
  // Keys are lowercased so that "Active => Active" matches cell values "active", "ACTIVE", etc.
  const stdByCol = new Map<string, { map: Record<string, string>; exactOnly: boolean }>()
  for (const r of standardizeRules) {
    if (!r.column) continue
    const lowercasedMap: Record<string, string> = {}
    for (const [k, v] of Object.entries(r.map)) {
      lowercasedMap[k.toLowerCase()] = v
    }
    stdByCol.set(r.column, { map: lowercasedMap, exactOnly: r.exactOnly ?? false })
  }

  const outRows: DataRow[] = dataset.rows.map((row) => {
    const out: DataRow = { ...row }
    for (const col of columnsToClean) {
      if (!(col in out)) continue
      const v = out[col]
      let result: string | number | boolean
      const std = stdByCol.get(col)
      if (std) {
        const s = String(v ?? '').trim()
        const exact = std.map[s]
        if (exact !== undefined) {
          result = exact
        } else if (std.exactOnly) {
          result = v ?? ''
        } else {
          result = std.map[s.toLowerCase()] ?? s
        }
      } else {
        result = cleanCell(
          v,
          { trim, lowercase, uppercase, fillEmpty }
        )
      }
      out[col] = result
    }
    return out
  })

  return { columns: dataset.columns, rows: outRows }
}
