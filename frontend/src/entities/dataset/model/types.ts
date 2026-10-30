/**
 * Normalized row values used by imported datasets and lookup operations.
 */
export type DataRow = Record<string, string | number | boolean | null>

export interface Dataset {
  id: string
  name: string
  columns: string[]
  rows: DataRow[]
}

export type DatasetId = string
