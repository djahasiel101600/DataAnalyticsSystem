import type { Dataset, DataRow } from '@/entities/dataset'

export type JoinType = 'inner' | 'left' | 'right' | 'full'

/**
 * Joins two datasets on key columns.
 *
 * Semantics:
 * - inner: keep rows where the key exists in BOTH left and right (then expand left rows across matching right rows).
 * - left:  keep all left rows; attach matching right rows (expands left rows across matching right rows).
 * - right: keep all right rows; attach matching left rows.
 * - full:  keep all rows from both sides.
 *
 * Note on "expansion": if a key matches multiple rows on the many-side, the result can grow by more than the
 * input size. This is correct for a true join, but it is a frequent source of silently inflated row counts in
 * analytics pipelines. The form and the caller are expected to warn when:
 *   - a key value is duplicated on the join side (multiple match), or
 *   - the join would multiply rows beyond a safe threshold.
 */
function rowKey(row: DataRow, cols: string[]): string {
  return cols.map((c) => String(row[c] ?? '')).join('\t')
}

export interface RunMergeJoinOptions {
  /** Emit a diagnostic when a key is duplicated on the join side, causing row expansion. */
  strict?: boolean
}

/**
 * Returns the join result plus diagnostics.
 * `diagnostics` may be empty when `strict === false` (default) and no duplicated-key expansion is present.
 */
export function runMergeJoin(
  left: Dataset,
  right: Dataset,
  leftKeyColumns: string[],
  rightKeyColumns: string[],
  joinType: JoinType,
  options: RunMergeJoinOptions = {}
): { columns: string[]; rows: DataRow[]; diagnostics: string[] } {
  const { strict = false } = options
  const diagnostics: string[] = []

  // Validate that key columns exist on both sides.
  const leftKeyPresent = leftKeyColumns.every((c) => left.columns.includes(c))
  const rightKeyPresent = rightKeyColumns.every((c) => right.columns.includes(c))
  if (!leftKeyPresent || !rightKeyPresent) {
    const missingLeft = leftKeyColumns.filter((c) => !left.columns.includes(c))
    const missingRight = rightKeyColumns.filter((c) => !right.columns.includes(c))
    diagnostics.push(
      'Join aborted: key columns must exist on both datasets. Missing on left: ' +
        missingLeft.join(', ') +
        '; missing on right: ' +
        missingRight.join(', ')
    )
    return { columns: [], rows: [], diagnostics }
  }

  const leftCols = left.columns
  const rightCols = right.columns.filter((c) => !leftCols.includes(c))
  const columns = [...leftCols, ...rightCols]

  const rightMap = new Map<string, DataRow[]>()
  for (const row of right.rows) {
    const key = rowKey(row, rightKeyColumns)
    if (!rightMap.has(key)) rightMap.set(key, [])
    rightMap.get(key)!.push(row)
  }

  // Detect keys on the many-side that would cause row expansion.
  // For left/full joins the right side is the "many"; for right joins the left side is the "many".
  const manySideMap = joinType === 'left' || joinType === 'full'
    ? rightMap
    : leftRowsForValidation(left, leftKeyColumns)

  const duplicateKeys: string[] = []
  for (const [key, rows] of manySideMap) {
    if (rows.length > 1) duplicateKeys.push(key)
  }

  if (duplicateKeys.length > 0 && strict) {
    const preview = duplicateKeys.slice(0, 10).join(', ')
    const total = duplicateKeys.length
    diagnostics.push(
      `Join key(s) duplicated on join side: ${total} duplicate value(s). Example(s): ${preview}${total > 10 ? ' ...' : ''}. ` +
      'This can expand the output row count beyond the input size.'
    )
  }

  const result: DataRow[] = []
  const rightUsed = new Set<string>()

  if (joinType === 'inner' || joinType === 'left' || joinType === 'full') {
    for (const lr of left.rows) {
      const key = rowKey(lr, leftKeyColumns)
      const matches = rightMap.get(key) ?? []
      rightUsed.add(key)
      if (matches.length === 0 && joinType === 'inner') continue
      if (matches.length === 0) {
        const out: DataRow = { ...lr }
        for (const c of rightCols) out[c] = ''
        result.push(out)
        continue
      }
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
      // Preserve right key column values (they may overlap with left cols)
      for (const c of rightKeyColumns) out[c] = rr[c] ?? ''
      for (const c of rightCols) out[c] = rr[c] ?? ''
      result.push(out)
    }
  }

  return { columns, rows: result, diagnostics }
}

function leftRowsForValidation(left: Dataset, leftKeyColumns: string[]): Map<string, DataRow[]> {
  const map = new Map<string, DataRow[]>()
  for (const row of left.rows) {
    const key = rowKey(row, leftKeyColumns)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(row)
  }
  return map
}

