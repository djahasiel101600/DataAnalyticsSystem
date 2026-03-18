import type { DataRow } from '@/entities/dataset'

/**
 * Run regex across selected datasets and columns. Returns rows that match, with _source_dataset and _matched_column.
 */
export function runRegexSearch(
  datasets: { id: string; name: string; columns: string[]; rows: DataRow[] }[],
  selectedColumns: Record<string, string[]>, // datasetId -> column names (empty = all)
  regexPattern: string,
  searchAllColumns: boolean
): { columns: string[]; rows: DataRow[] } {
  let re: RegExp
  try {
    re = new RegExp(regexPattern)
  } catch {
    throw new Error('Invalid regex pattern')
  }

  const resultRows: DataRow[] = []
  const allColumns = new Set<string>(['_source_dataset', '_matched_column'])

  for (const ds of datasets) {
    const cols = searchAllColumns ? ds.columns : (selectedColumns[ds.id] ?? [])
    const columnsToSearch = cols.length > 0 ? cols : ds.columns

    for (const row of ds.rows) {
      for (const col of columnsToSearch) {
        const val = row[col]
        const str = val === null || val === undefined ? '' : String(val)
        if (re.test(str)) {
          Object.keys(row).forEach((k) => allColumns.add(k))
          resultRows.push({
            ...row,
            _source_dataset: ds.name,
            _matched_column: col,
          } as DataRow)
          break
        }
      }
    }
  }

  const columns = Array.from(allColumns)
  return { columns, rows: resultRows }
}
