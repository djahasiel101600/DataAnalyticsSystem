import { describe, it, expect } from 'vitest'
import { runCompareDatasets } from './run-compare-datasets'

const oldDs = {
  id: 'ds-1',
  name: 'old',
  columns: ['employee_id', 'name', 'status', 'department'],
  rows: [
    { employee_id: 'E001', name: 'Alice', status: 'Active', department: 'Fleet' },
    { employee_id: 'E002', name: 'Bob', status: 'Active', department: 'Warehouse' },
    { employee_id: 'E003', name: 'Carol', status: 'Inactive', department: 'Fleet' },
  ],
}

const newDs = {
  id: 'ds-2',
  name: 'new',
  columns: ['employee_id', 'name', 'status', 'department'],
  rows: [
    { employee_id: 'E001', name: 'Alice', status: 'Active', department: 'Fleet' },
    { employee_id: 'E002', name: 'Bob', status: 'Inactive', department: 'Warehouse' }, // status changed
    { employee_id: 'E004', name: 'Dave', status: 'Active', department: 'HR' }, // added
  ],
}

describe('runCompareDatasets', () => {
  it('detects added, removed, and updated rows', () => {
    const { summary, rows } = runCompareDatasets(oldDs, newDs, {
      keyColumns: ['employee_id'],
      detectUpdates: true,
    })
    expect(summary.added).toBe(1) // E004
    expect(summary.removed).toBe(1) // E003
    expect(summary.updated).toBe(1) // E002 status changed
    expect(summary.unchanged).toBe(1) // E001
    expect(rows.length).toBe(4)
  })

  it('reports changed columns for updated rows', () => {
    const { rows } = runCompareDatasets(oldDs, newDs, {
      keyColumns: ['employee_id'],
      detectUpdates: true,
    })
    const e002 = rows.find((r) => r.employee_id === 'E002')
    expect(e002?._change_type).toBe('updated')
    expect(e002?._changed_columns).toContain('status')
  })

  it('detects duplicate keys in datasets', () => {
    const oldWithDupes = {
      ...oldDs,
      rows: [...oldDs.rows, { ...oldDs.rows[0] }], // duplicate E001
    }
    const { summary } = runCompareDatasets(oldWithDupes, newDs, {
      keyColumns: ['employee_id'],
      detectUpdates: true,
    })
    expect(summary.duplicate_keys).toBe(1)
  })

  it('does not detect updates when detectUpdates is false', () => {
    const { summary } = runCompareDatasets(oldDs, newDs, {
      keyColumns: ['employee_id'],
      detectUpdates: false,
    })
    expect(summary.updated).toBe(0)
    expect(summary.unchanged).toBe(2) // E001, E002 treated as unchanged
  })

  it('includes _changed_columns column in output', () => {
    const { columns } = runCompareDatasets(oldDs, newDs, {
      keyColumns: ['employee_id'],
      detectUpdates: true,
    })
    expect(columns).toContain('_changed_columns')
  })
})
