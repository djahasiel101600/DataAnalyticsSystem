import { describe, it, expect } from 'vitest'
import {
  filterRowsByConditions,
  rowMatchesConditions,
  type FilterCondition,
} from './run-filter-sort'

const rows = [
  { id: '1', name: 'Alice', last_active: '2025-03-18', amount: '100' },
  { id: '2', name: 'Bob', last_active: '2025-03-10', amount: '200' },
  { id: '3', name: 'Carol', last_active: '', amount: '300' },
  { id: '4', name: 'Dave', last_active: '2025-03-20T10:00:00Z', amount: '400' },
]

const filterAnd = (conds: FilterCondition[]) => filterRowsByConditions(rows, conds, 'and')

describe('filterRowsByConditions - date handling', () => {
  const baseCondition: FilterCondition = {
    column: 'last_active',
    operator: 'equals',
    value: '2025-03-18',
    valueType: 'date',
  }

  it('date equals matches calendar day regardless of time component', () => {
    const cond = { ...baseCondition }
    const result = filterAnd([cond])
    expect(result.length).toBe(1)
    expect(result[0]?.id).toBe('1')
  })

  it('date equals matches timestamp stored as date-only input', () => {
    const cond = { ...baseCondition, value: '2025-03-20' }
    const result = filterAnd([cond])
    expect(result.length).toBe(1)
    expect(result[0]?.id).toBe('4')
  })

  it('date gt filters correctly', () => {
    const cond: FilterCondition = {
      column: 'last_active',
      operator: 'gt',
      value: '2025-03-15',
      valueType: 'date',
    }
    const result = filterAnd([cond])
    expect(result.length).toBe(2)
    expect(result.map((r) => r.id).sort()).toEqual(['1', '4'])
  })

  it('date lt filters correctly', () => {
    const cond: FilterCondition = {
      column: 'last_active',
      operator: 'lt',
      value: '2025-03-15',
      valueType: 'date',
    }
    const result = filterAnd([cond])
    expect(result.length).toBe(1)
    expect(result[0]?.id).toBe('2')
  })

  it('invalid/unparseable dates return no matches', () => {
    const cond: FilterCondition = {
      column: 'last_active',
      operator: 'equals',
      value: 'not-a-date',
      valueType: 'date',
    }
    const result = filterAnd([cond])
    expect(result.length).toBe(0)
  })

  it('blank date cells are not matched by date equals', () => {
    const cond = { ...baseCondition, value: '2025-03-18' }
    const result = filterAnd([cond])
    expect(result.length).toBe(1)
    expect(result[0]?.id).toBe('1')
  })

  it('date contains returns false (not meaningful for dates)', () => {
    const cond: FilterCondition = {
      column: 'last_active',
      operator: 'contains',
      value: '2025',
      valueType: 'date',
    }
    const result = filterAnd([cond])
    expect(result.length).toBe(0)
  })
})

describe('filterRowsByConditions - number handling', () => {
  it('number gt works correctly', () => {
    const cond: FilterCondition = {
      column: 'amount',
      operator: 'gt',
      value: '150',
      valueType: 'number',
    }
    const result = filterAnd([cond])
    expect(result.length).toBe(3) // Bob (200), Carol (300), Dave (400)
  })

  it('non-numeric values are excluded from number comparisons', () => {
    const rowsWithText = [...rows, { id: '5', name: 'Eve', last_active: '2025-03-18', amount: 'N/A' }]
    const cond: FilterCondition = {
      column: 'amount',
      operator: 'gt',
      value: '150',
      valueType: 'number',
    }
    const result = filterRowsByConditions(rowsWithText, [cond], 'and')
    expect(result.length).toBe(3) // Bob (200), Carol (300), Dave (400); N/A excluded
  })
})

describe('filterRowsByConditions - text handling', () => {
  it('text equals is case-sensitive', () => {
    const cond: FilterCondition = {
      column: 'name',
      operator: 'equals',
      value: 'Alice',
    }
    const result = filterAnd([cond])
    expect(result.length).toBe(1)
    expect(result[0]?.id).toBe('1')
  })

  it('text contains is case-insensitive', () => {
    const cond: FilterCondition = {
      column: 'name',
      operator: 'contains',
      value: 'ALICE',
    }
    const result = filterAnd([cond])
    expect(result.length).toBe(1)
    expect(result[0]?.id).toBe('1')
  })

  it('not_empty and empty work correctly', () => {
    const notEmpty: FilterCondition = {
      column: 'last_active',
      operator: 'not_empty',
      value: '',
    }
    const result = filterAnd([notEmpty])
    expect(result.length).toBe(3)

    const empty: FilterCondition = {
      column: 'last_active',
      operator: 'empty',
      value: '',
    }
    const result2 = filterAnd([empty])
    expect(result2.length).toBe(1)
    expect(result2[0]?.id).toBe('3')
  })

  it('evaluates a new condition against a row independently of previous results', () => {
    const notEmpty: FilterCondition = {
      column: 'last_active',
      operator: 'not_empty',
      value: '',
    }
    const empty: FilterCondition = {
      column: 'last_active',
      operator: 'empty',
      value: '',
    }
    const firstFiltered = filterRowsByConditions(rows, [notEmpty], 'and')

    expect(firstFiltered).toHaveLength(3)
    expect(rowMatchesConditions(rows[2], [empty], 'and')).toBe(true)
    expect(filterRowsByConditions(rows, [empty], 'and').map((row) => row.id)).toEqual([
      '3',
    ])
  })
})
