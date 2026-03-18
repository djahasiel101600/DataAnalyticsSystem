/**
 * Normalized row: all values as string or number for display/export.
 */
export type DataRow = Record<string, string | number>

export interface Dataset {
  id: string
  name: string
  columns: string[]
  rows: DataRow[]
}

export type DatasetId = string
