import type { Dataset, DataRow } from '@/entities/dataset'

function rowKey(row: DataRow, cols: string[]): string {
  return cols.map((c) => String(row[c] ?? '')).join('\t')
}

/**
 * Left join: for each row in source, find first match in lookup by key (single or composite) and append selected columns.
 * Supports same-table lookup (source === lookup).
 */
export function runLookup(
  source: Dataset,
  sourceKeyColumns: string[],
  lookup: Dataset,
  lookupKeyColumns: string[],
  columnsToRetrieve: string[]
): { columns: string[]; rows: DataRow[] } {
  const lookupMap = new Map<string, DataRow>()
  for (const row of lookup.rows) {
    const key = rowKey(row, lookupKeyColumns)
    if (!lookupMap.has(key)) {
      lookupMap.set(key, row)
    }
  }

  const resultColumns = [...source.columns]
  for (const col of columnsToRetrieve) {
    if (!resultColumns.includes(col)) {
      resultColumns.push(col)
    }
  }

  const resultRows: DataRow[] = source.rows.map((sourceRow) => {
    const key = rowKey(sourceRow, sourceKeyColumns)
    const lookupRow = lookupMap.get(key)
    const out: DataRow = { ...sourceRow }
    for (const col of columnsToRetrieve) {
      out[col] = lookupRow ? (lookupRow[col] ?? '') : ''
    }
    return out
  })

  return { columns: resultColumns, rows: resultRows }
}
