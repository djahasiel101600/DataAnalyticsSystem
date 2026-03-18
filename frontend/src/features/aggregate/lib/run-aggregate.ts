import type { DataRow } from '@/entities/dataset'

export type AggregateFn = 'sum' | 'count' | 'avg' | 'min' | 'max'

export function runAggregate(
  _columns: string[],
  rows: DataRow[],
  groupByColumns: string[],
  aggregateColumns: { column: string; fn: AggregateFn }[]
): { columns: string[]; rows: DataRow[] } {
  const groups = new Map<string, DataRow[]>()
  for (const row of rows) {
    const key = groupByColumns.map((c) => String(row[c] ?? '')).join('\t')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  const outColumns = [...groupByColumns]
  for (const { column, fn } of aggregateColumns) {
    outColumns.push(`${column}_${fn}`)
  }

  const resultRows: DataRow[] = []
  for (const [key, groupRows] of groups) {
    const keyParts = key.split('\t')
    const out: DataRow = {}
    groupByColumns.forEach((c, i) => {
      out[c] = keyParts[i] ?? ''
    })
    for (const { column, fn } of aggregateColumns) {
      const values = groupRows.map((r) => r[column]).filter((v) => v !== '' && v !== null && v !== undefined)
      const nums = values.map((v) => (typeof v === 'number' ? v : Number(v))).filter((n) => !Number.isNaN(n))
      let val: string | number = ''
      if (fn === 'count') {
        val = groupRows.length
      } else if (fn === 'sum' && nums.length) {
        val = nums.reduce((a, b) => a + b, 0)
      } else if (fn === 'avg' && nums.length) {
        val = nums.reduce((a, b) => a + b, 0) / nums.length
      } else if (fn === 'min' && nums.length) {
        val = Math.min(...nums)
      } else if (fn === 'max' && nums.length) {
        val = Math.max(...nums)
      }
      out[`${column}_${fn}`] = val
    }
    resultRows.push(out)
  }

  return { columns: outColumns, rows: resultRows }
}

/**
 * Pivot: rows = rowDimension values, columns = colDimension values, cells = aggregate(valueColumn).
 */
export function runPivot(
  rows: DataRow[],
  rowDimension: string,
  colDimension: string,
  valueColumn: string,
  fn: AggregateFn
): { columns: string[]; rows: DataRow[] } {
  const rowVals = [...new Set(rows.map((r) => String(r[rowDimension] ?? '')))].sort()
  const colVals = [...new Set(rows.map((r) => String(r[colDimension] ?? '')))].sort()
  const columns = [rowDimension, ...colVals]

  const getCell = (rowVal: string, colVal: string): string | number => {
    const group = rows.filter(
      (r) => String(r[rowDimension] ?? '') === rowVal && String(r[colDimension] ?? '') === colVal
    )
    const nums = group.map((r) => r[valueColumn]).filter((v) => v !== '' && v != null)
    const numArr = nums.map((v) => (typeof v === 'number' ? v : Number(v))).filter((n) => !Number.isNaN(n))
    if (fn === 'count') return group.length
    if (fn === 'sum' && numArr.length) return numArr.reduce((a, b) => a + b, 0)
    if (fn === 'avg' && numArr.length) return numArr.reduce((a, b) => a + b, 0) / numArr.length
    if (fn === 'min' && numArr.length) return Math.min(...numArr)
    if (fn === 'max' && numArr.length) return Math.max(...numArr)
    return ''
  }

  const resultRows: DataRow[] = rowVals.map((rv) => {
    const out: DataRow = { [rowDimension]: rv }
    for (const cv of colVals) {
      out[cv] = getCell(rv, cv)
    }
    return out
  })

  return { columns, rows: resultRows }
}
