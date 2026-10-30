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

/**
 * Compare two datasets on key columns. Returns summary + detail rows with _change_type.
 *
 * Enhancements over previous version:
 * - Detects duplicate keys in old/new datasets (reported in summary as _duplicate_keys)
 * - For updated rows, adds _changed_columns listing which non-key columns changed
 * - For added/removed/updated rows, preserves both old and new context where possible
 */
export function runCompareDatasets(
  oldDataset: Dataset,
  newDataset: Dataset,
  options: CompareDatasetsOptions
): {
  summary: { added: number; removed: number; unchanged: number; updated: number; duplicate_keys: number }
  columns: string[]
  rows: DataRow[]
} {
  const { keyColumns, detectUpdates = true, ignoreCase = false, trim = false } = options
  const opts = { ignoreCase, trim }

  // Detect duplicate keys within each dataset
  const oldKeyCounts = new Map<string, number>()
  for (const row of oldDataset.rows) {
    const k = rowKey(row, keyColumns, opts)
    oldKeyCounts.set(k, (oldKeyCounts.get(k) ?? 0) + 1)
  }
  const newKeyCounts = new Map<string, number>()
  for (const row of newDataset.rows) {
    const k = rowKey(row, keyColumns, opts)
    newKeyCounts.set(k, (newKeyCounts.get(k) ?? 0) + 1)
  }
  const duplicateKeys = new Set<string>()
  for (const [k, c] of oldKeyCounts) {
    if (c > 1) duplicateKeys.add(k)
  }
  for (const [k, c] of newKeyCounts) {
    if (c > 1) duplicateKeys.add(k)
  }

  const oldKeyToRow = new Map<string, DataRow>()
  for (const row of oldDataset.rows) {
    const k = rowKey(row, keyColumns, opts)
    if (!oldKeyToRow.has(k)) oldKeyToRow.set(k, row) // keep first occurrence
  }
  const newKeyToRow = new Map<string, DataRow>()
  for (const row of newDataset.rows) {
    const k = rowKey(row, keyColumns, opts)
    if (!newKeyToRow.has(k)) newKeyToRow.set(k, row) // keep first occurrence
  }

  const allKeys = new Set([...oldKeyToRow.keys(), ...newKeyToRow.keys()])
  let added = 0
  let removed = 0
  let unchanged = 0
  let updated = 0

  const detailColumns = [...new Set([...oldDataset.columns, ...newDataset.columns, '_change_type', '_key', '_changed_columns'])]
  const detailRows: DataRow[] = []

  for (const key of allKeys) {
    const oldRow = oldKeyToRow.get(key)
    const newRow = newKeyToRow.get(key)
    if (!oldRow && newRow) {
      added++
      detailRows.push({ ...newRow, _change_type: 'added', _key: key, _changed_columns: '' })
    } else if (oldRow && !newRow) {
      removed++
      detailRows.push({ ...oldRow, _change_type: 'removed', _key: key, _changed_columns: '' })
    } else if (oldRow && newRow) {
      let changeType: ChangeType = 'unchanged'
      let changedColumns: string[] = []
      if (detectUpdates && keyColumns.length > 0) {
        const colsToCompare = newDataset.columns.filter((c) => !keyColumns.includes(c))
        for (const c of colsToCompare) {
          const oldVal = String(oldRow[c] ?? '')
          const newVal = String(newRow[c] ?? '')
          if (oldVal !== newVal) {
            changedColumns.push(c)
          }
        }
        if (changedColumns.length > 0) {
          updated++
          changeType = 'updated'
        } else {
          unchanged++
        }
      } else {
        unchanged++
      }
      detailRows.push({
        ...newRow,
        _change_type: changeType,
        _key: key,
        _changed_columns: changedColumns.join(', '),
      })
    }
  }

  const summary = { added, removed, unchanged, updated, duplicate_keys: duplicateKeys.size }
  return { summary, columns: detailColumns, rows: detailRows }
}
