import { describe, it, expect } from 'vitest'
import { runInactivityCheck } from './run-inactivity-check'

const dataset = {
  id: 'ds-1',
  name: 'activity',
  columns: ['employee_id', 'name', 'last_activity'],
  rows: [
    { employee_id: 'E001', name: 'Alice', last_activity: '2025-03-18' },
    { employee_id: 'E002', name: 'Bob', last_activity: '2025-03-10' },
    { employee_id: 'E003', name: 'Carol', last_activity: '' },
    { employee_id: 'E004', name: 'Dave', last_activity: 'not-a-date' },
  ],
}

describe('runInactivityCheck', () => {
  const refDate = '2025-03-20'

  it('flags inactive rows beyond threshold (legacy mode)', () => {
    const { rows } = runInactivityCheck(dataset, {
      dateColumn: 'last_activity',
      referenceDate: refDate,
      thresholdDays: 3,
    })
    // Alice: 3/18 → 2 days inactive → not inactive (2 <= 3)
    // Bob: 3/10 → 10 days inactive → inactive
    // Carol: blank → legacy: inactive
    // Dave: invalid → legacy: inactive
    expect(rows.find((r) => r.employee_id === 'E001')?._is_inactive).toBe(0)
    expect(rows.find((r) => r.employee_id === 'E002')?._is_inactive).toBe(1)
    expect(rows.find((r) => r.employee_id === 'E003')?._is_inactive).toBe(1)
    expect(rows.find((r) => r.employee_id === 'E004')?._is_inactive).toBe(1)
  })

  it('does NOT flag invalid dates as inactive in strict mode', () => {
    const { rows } = runInactivityCheck(dataset, {
      dateColumn: 'last_activity',
      referenceDate: refDate,
      thresholdDays: 3,
      strict: true,
    })
    // Carol: blank → strict: not inactive
    // Dave: invalid → strict: not inactive
    expect(rows.find((r) => r.employee_id === 'E003')?._is_inactive).toBe(0)
    expect(rows.find((r) => r.employee_id === 'E003')?._date_inactive).toBe(1)
    expect(rows.find((r) => r.employee_id === 'E004')?._is_inactive).toBe(0)
    expect(rows.find((r) => r.employee_id === 'E004')?._date_inactive).toBe(1)
  })

  it('includes _date_inactive column', () => {
    const { columns, rows } = runInactivityCheck(dataset, {
      dateColumn: 'last_activity',
      referenceDate: refDate,
      thresholdDays: 3,
      strict: true,
    })
    expect(columns).toContain('_date_inactive')
    expect(rows.find((r) => r.employee_id === 'E001')?._date_inactive).toBe(0)
    expect(rows.find((r) => r.employee_id === 'E003')?._date_inactive).toBe(1)
  })

  it('calculates days inactive correctly', () => {
    const { rows } = runInactivityCheck(dataset, {
      dateColumn: 'last_activity',
      referenceDate: refDate,
      thresholdDays: 3,
    })
    // Alice: 2025-03-20 - 2025-03-18 = 2 days
    expect(rows.find((r) => r.employee_id === 'E001')?._days_inactive).toBe(2)
    // Bob: 2025-03-20 - 2025-03-10 = 10 days
    expect(rows.find((r) => r.employee_id === 'E002')?._days_inactive).toBe(10)
  })
})
