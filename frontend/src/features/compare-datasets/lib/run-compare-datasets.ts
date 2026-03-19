import type { Dataset, DataRow } from '@/entities/dataset'

export type ChangeType = 'added' | 'removed' | 'unchanged' | 'updated'

export interface CompareDatasetsOptions {
  /** Key column(s) to match rows between old and new. */
  keyColumns: string[]
  /** If true, compare all columns for "updated"; otherwise only key columns (so no updates). */
  detectUpdates?: boolean
  ignoreCase?: boolean
  trim?: boolean
}

function normalizePart(value: unknown, opts: { ignoreCase: boolean; trim: boolean }): string {
  let s = String(value ?? '')
  if (opts.trim) s = s.trim()
  if (opts.ignoreCase) s = s.toLowerCase()
  return s
}

function rowKey(row: DataRow, keyColumns: string[], opts: { ignoreCase: boolean; trim: boolean }): string {
  return keyColumns.map((c) => normalizePart(row[c], opts)).join('\t')
}

/** Compare two datasets on key columns. Returns summary + detail rows with _change_type. */
export function runCompareDatasets(
  oldDataset: Dataset,
  newDataset: Dataset,
  options: CompareDatasetsOptions
): {
  summary: { added: number; removed: number; unchanged: number; updated: number }
  columns: string[]
  rows: DataRow[]
} {
  const { keyColumns, detectUpdates = true, ignoreCase = false, trim = false } = options
  const opts = { ignoreCase, trim }

  const oldKeyToRow = new Map<string, DataRow>()
  for (const row of oldDataset.rows) {
    const k = rowKey(row, keyColumns, opts)
    oldKeyToRow.set(k, row)
  }
  const newKeyToRow = new Map<string, DataRow>()
  for (const row of newDataset.rows) {
    const k = rowKey(row, keyColumns, opts)
    newKeyToRow.set(k, row)
  }

  const allKeys = new Set([...oldKeyToRow.keys(), ...newKeyToRow.keys()])
  let added = 0
  let removed = 0
  let unchanged = 0
  let updated = 0

  const detailColumns = [...new Set([...oldDataset.columns, ...newDataset.columns, '_change_type', '_key'])]
  const detailRows: DataRow[] = []

  for (const key of allKeys) {
    const oldRow = oldKeyToRow.get(key)
    const newRow = newKeyToRow.get(key)
    if (!oldRow && newRow) {
      added++
      detailRows.push({ ...newRow, _change_type: 'added', _key: key })
    } else if (oldRow && !newRow) {
      removed++
      detailRows.push({ ...oldRow, _change_type: 'removed', _key: key })
    } else if (oldRow && newRow) {
      let changeType: ChangeType = 'unchanged'
      if (detectUpdates && keyColumns.length > 0) {
        const colsToCompare = newDataset.columns.filter((c) => !keyColumns.includes(c))
        const hasChange = colsToCompare.some((c) => String(oldRow[c] ?? '') !== String(newRow[c] ?? ''))
        if (hasChange) {
          updated++
          changeType = 'updated'
        } else {
          unchanged++
        }
      } else {
        unchanged++
      }
      detailRows.push({ ...newRow, _change_type: changeType, _key: key })
    }
  }

  const summary = { added, removed, unchanged, updated }
  return { summary, columns: detailColumns, rows: detailRows }
}
