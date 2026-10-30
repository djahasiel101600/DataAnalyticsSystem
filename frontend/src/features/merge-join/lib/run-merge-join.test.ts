import { describe, it, expect } from 'vitest'
import { runMergeJoin } from './run-merge-join'

const left = {
  id: 'ds-1',
  name: 'left',
  columns: ['employee_id', 'name', 'department'],
  rows: [
    { employee_id: 'E001', name: 'Alice', department: 'Fleet' },
    { employee_id: 'E002', name: 'Bob', department: 'Warehouse' },
    { employee_id: 'E003', name: 'Carol', department: 'Fleet' },
  ],
}

const right = {
  id: 'ds-2',
  name: 'right',
  columns: ['employee_id', 'status', 'last_active'],
  rows: [
    { employee_id: 'E001', status: 'Active', last_active: '2025-03-18' },
    { employee_id: 'E002', status: 'Inactive', last_active: '2025-03-10' },
    { employee_id: 'E004', status: 'Offboarded', last_active: '2025-01-01' },
  ],
}

describe('runMergeJoin', () => {
  it('left join keeps all left rows with matching right data', () => {
    const { rows, diagnostics } = runMergeJoin(left, right, ['employee_id'], ['employee_id'], 'left')
    expect(rows.length).toBe(3)
    expect(diagnostics.length).toBe(0)
    const e001 = rows.find((r) => r.employee_id === 'E001')
    expect(e001?.status).toBe('Active')
    const e004 = rows.find((r) => r.employee_id === 'E004')
    expect(e004).toBeUndefined() // left join: right-only rows excluded
  })

  it('inner join keeps only matching keys', () => {
    const { rows } = runMergeJoin(left, right, ['employee_id'], ['employee_id'], 'inner')
    expect(rows.length).toBe(2) // E001, E002 only
  })

  it('right join keeps all right rows', () => {
    const { rows } = runMergeJoin(left, right, ['employee_id'], ['employee_id'], 'right')
    expect(rows.length).toBe(3) // E001, E002, E004
    const e004 = rows.find((r) => r.employee_id === 'E004')
    expect(e004?.name).toBe('') // left-only columns blank for right-only rows
  })

  it('full join keeps all rows from both sides', () => {
    const { rows } = runMergeJoin(left, right, ['employee_id'], ['employee_id'], 'full')
    expect(rows.length).toBe(4) // E001, E002, E003, E004
  })

  it('detects duplicate keys on join side with strict mode', () => {
    const rightWithDupes = {
      ...right,
      rows: [
        ...right.rows,
        { employee_id: 'E001', status: 'Active2', last_active: '2025-03-19' }, // duplicate E001
      ],
    }
    const { rows, diagnostics } = runMergeJoin(
      left,
      rightWithDupes,
      ['employee_id'],
      ['employee_id'],
      'left',
      { strict: true }
    )
    // E001 matches twice → output expands to 4 rows
    expect(rows.length).toBe(4)
    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics[0]).toContain('duplicated')
  })

  it('rejects missing key columns', () => {
    const { rows, diagnostics } = runMergeJoin(left, right, ['nonexistent'], ['employee_id'], 'left')
    expect(rows.length).toBe(0)
    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics[0]).toContain('Missing on left')
  })

  it('composite key join works correctly', () => {
    const leftComposite = {
      id: 'ds-3',
      name: 'leftComposite',
      columns: ['region', 'date', 'amount'],
      rows: [
        { region: 'North', date: '2024-01-15', amount: '100' },
        { region: 'South', date: '2024-01-15', amount: '200' },
      ],
    }
    const rightComposite = {
      id: 'ds-4',
      name: 'rightComposite',
      columns: ['region', 'date', 'units'],
      rows: [
        { region: 'North', date: '2024-01-15', units: '10' },
        { region: 'South', date: '2024-01-16', units: '20' },
      ],
    }
    const { rows } = runMergeJoin(
      leftComposite,
      rightComposite,
      ['region', 'date'],
      ['region', 'date'],
      'inner'
    )
    expect(rows.length).toBe(1) // only North + 2024-01-15 matches
    expect(rows[0]?.amount).toBe('100')
    expect(rows[0]?.units).toBe('10')
  })
})
