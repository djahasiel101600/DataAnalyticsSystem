import type { Dataset, DataRow } from '@/entities/dataset'

export type JoinType = 'inner' | 'left' | 'right' | 'full'

function rowKey(row: DataRow, cols: string[]): string {
  return cols.map((c) => String(row[c] ?? '')).join('\t')
}

export function runMergeJoin(
  left: Dataset,
  right: Dataset,
  leftKeyColumns: string[],
  rightKeyColumns: string[],
  joinType: JoinType
): { columns: string[]; rows: DataRow[] } {
  const rightMap = new Map<string, DataRow[]>()
  for (const row of right.rows) {
    const key = rowKey(row, rightKeyColumns)
    if (!rightMap.has(key)) rightMap.set(key, [])
    rightMap.get(key)!.push(row)
  }

  const leftCols = left.columns
  const rightCols = right.columns.filter((c) => !leftCols.includes(c))
  const columns = [...leftCols, ...rightCols]

  const result: DataRow[] = []
  const rightUsed = new Set<string>()

  for (const lr of left.rows) {
    const key = rowKey(lr, leftKeyColumns)
    const matches = rightMap.get(key) ?? []
    rightUsed.add(key)
    if (matches.length === 0) {
      if (joinType === 'left' || joinType === 'full') {
        const out: DataRow = { ...lr }
        for (const c of rightCols) out[c] = ''
        result.push(out)
      }
    } else {
      for (const rr of matches) {
        const out: DataRow = { ...lr }
        for (const c of rightCols) out[c] = rr[c] ?? ''
        result.push(out)
      }
    }
  }

  if (joinType === 'right' || joinType === 'full') {
    for (const rr of right.rows) {
      const key = rowKey(rr, rightKeyColumns)
      if (rightUsed.has(key)) continue
      const out: DataRow = {}
      for (const c of leftCols) out[c] = ''
      for (const c of rightCols) out[c] = rr[c] ?? ''
      result.push(out)
    }
  }

  return { columns, rows: result }
}
