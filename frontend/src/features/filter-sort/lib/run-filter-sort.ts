import type { DataRow } from '@/entities/dataset'
import { parseDate } from '@/shared/lib/date-parse'

export type FilterOperator = 'equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'not_empty' | 'empty'

export type FilterValueType = 'text' | 'number' | 'date'

export interface FilterCondition {
  column: string
  operator: FilterOperator
  value: string
  valueType?: FilterValueType
}

function matchesCondition(row: DataRow, c: FilterCondition): boolean {
  const cell = row[c.column]
  const str = cell === null || cell === undefined ? '' : String(cell)
  const num = typeof cell === 'number' ? cell : Number(str)
  const isEmpty = str === '' || str === null || str === undefined
  const valueType = c.valueType ?? 'text'

  if (c.operator === 'not_empty') return !isEmpty
  if (c.operator === 'empty') return isEmpty

  if (valueType === 'date') {
    const cellTime = parseDate(cell)
    const valueTime = parseDate(c.value)
    if (Number.isNaN(cellTime) || Number.isNaN(valueTime)) {
      if (c.operator === 'equals') return false
      return false
    }
    switch (c.operator) {
      case 'equals':
        return cellTime === valueTime
      case 'gt':
        return cellTime > valueTime
      case 'gte':
        return cellTime >= valueTime
      case 'lt':
        return cellTime < valueTime
      case 'lte':
        return cellTime <= valueTime
      case 'contains':
        return str.toLowerCase().includes(c.value.toLowerCase())
      default:
        return String(cellTime) === c.value
    }
  }

  if (valueType === 'number') {
    const vNum = Number(c.value)
    switch (c.operator) {
      case 'equals':
        return !Number.isNaN(num) && num === vNum
      case 'contains':
        return str.toLowerCase().includes(c.value.toLowerCase())
      case 'gt':
        return !Number.isNaN(num) && !Number.isNaN(vNum) && num > vNum
      case 'gte':
        return !Number.isNaN(num) && !Number.isNaN(vNum) && num >= vNum
      case 'lt':
        return !Number.isNaN(num) && !Number.isNaN(vNum) && num < vNum
      case 'lte':
        return !Number.isNaN(num) && !Number.isNaN(vNum) && num <= vNum
      default:
        return true
    }
  }

  switch (c.operator) {
    case 'equals':
      return str === c.value
    case 'contains':
      return str.toLowerCase().includes(c.value.toLowerCase())
    case 'gt':
      return !Number.isNaN(num) && num > Number(c.value)
    case 'gte':
      return !Number.isNaN(num) && num >= Number(c.value)
    case 'lt':
      return !Number.isNaN(num) && num < Number(c.value)
    case 'lte':
      return !Number.isNaN(num) && num <= Number(c.value)
    default:
      return true
  }
}

export function filterRows(
  rows: DataRow[],
  column: string,
  operator: FilterOperator,
  value: string
): DataRow[] {
  return filterRowsByConditions(rows, [{ column, operator, value }], 'and')
}

export type FilterCombine = 'and' | 'or'

export function filterRowsByConditions(
  rows: DataRow[],
  conditions: FilterCondition[],
  combine: FilterCombine
): DataRow[] {
  if (conditions.length === 0) return rows
  return rows.filter((row) => {
    const results = conditions.map((c) => matchesCondition(row, c))
    return combine === 'and' ? results.every(Boolean) : results.some(Boolean)
  })
}

export type SortDirection = 'asc' | 'desc'

export interface SortSpec {
  column: string
  direction: SortDirection
  /** Compare as dates (parseDate) for this column. */
  asDate?: boolean
}

export function sortRows(
  rows: DataRow[],
  column: string,
  direction: SortDirection
): DataRow[] {
  return sortRowsMulti(rows, [{ column, direction }])
}

export function sortRowsMulti(rows: DataRow[], sortSpecs: SortSpec[]): DataRow[] {
  if (sortSpecs.length === 0) return [...rows]
  return [...rows].sort((a, b) => {
    for (const { column, direction, asDate } of sortSpecs) {
      const va = a[column]
      const vb = b[column]
      let cmp: number
      if (asDate) {
        const ta = parseDate(va)
        const tb = parseDate(vb)
        if (!Number.isNaN(ta) && !Number.isNaN(tb)) {
          cmp = ta - tb
        } else {
          cmp = String(va ?? '').localeCompare(String(vb ?? ''))
        }
      } else {
        const aNum = typeof va === 'number' ? va : Number(va)
        const bNum = typeof vb === 'number' ? vb : Number(vb)
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          cmp = aNum - bNum
        } else {
          cmp = String(va ?? '').localeCompare(String(vb ?? ''))
        }
      }
      if (direction === 'desc') cmp = -cmp
      if (cmp !== 0) return cmp
    }
    return 0
  })
}

export function filterAndSort(
  rows: DataRow[],
  column: string,
  filterOp: FilterOperator,
  filterValue: string,
  sortColumn: string | null,
  sortDir: SortDirection
): DataRow[] {
  let out = filterRows(rows, column, filterOp, filterValue)
  if (sortColumn) {
    out = sortRows(out, sortColumn, sortDir)
  }
  return out
}
