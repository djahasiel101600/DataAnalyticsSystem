import type { DataRow } from '@/entities/dataset'

export interface ValidationResult {
  rowCount: number
  columnCount: number
  columns: string[]
  /** Columns that were required but missing from the file */
  missingRequiredColumns: string[]
  /** Per-column count of null/empty values */
  nullCounts: Record<string, number>
  /** Row indices (0-based) with at least one required column empty (if requiredColumns set) */
  invalidRowIndices: number[]
  valid: boolean
}

const empty = (v: unknown): boolean =>
  v === '' || v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

/**
 * Validate parsed upload data: required columns, null counts, invalid rows.
 * If requiredColumns is empty, missingRequiredColumns and invalidRowIndices are empty.
 */
export function validateUpload(
  columns: string[],
  rows: DataRow[],
  requiredColumns: string[] = []
): ValidationResult {
  const columnSet = new Set(columns)
  const missingRequiredColumns = requiredColumns.filter((c) => !columnSet.has(c))
  const nullCounts: Record<string, number> = {}
  for (const col of columns) {
    nullCounts[col] = 0
  }
  const invalidRowIndices: number[] = []
  const requiredSet = new Set(requiredColumns)

  rows.forEach((row, i) => {
    for (const col of columns) {
      if (empty(row[col])) nullCounts[col]++
    }
    if (requiredSet.size > 0) {
      const hasMissing = requiredColumns.some((col) => empty(row[col]))
      if (hasMissing) invalidRowIndices.push(i)
    }
  })

  const valid = missingRequiredColumns.length === 0 && invalidRowIndices.length === 0
  return {
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    missingRequiredColumns,
    nullCounts,
    invalidRowIndices,
    valid,
  }
}
