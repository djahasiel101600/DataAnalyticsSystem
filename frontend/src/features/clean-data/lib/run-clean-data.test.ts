import { describe, it, expect } from 'vitest'
import { runCleanData } from './run-clean-data'

const dataset = {
  id: 'ds-1',
  name: 'dirty',
  columns: ['employee_id', 'name', 'status'],
  rows: [
    { employee_id: 'E001', name: ' Alice ', status: 'active' },
    { employee_id: 'E002', name: 'Bob', status: 'ACTIVE' },
    { employee_id: 'E003', name: 'Carol', status: 'Active' },
    { employee_id: 'E004', name: 'Dave', status: 'inactive' },
  ],
}

describe('runCleanData', () => {
  it('trim removes whitespace', () => {
    const { rows } = runCleanData(dataset, { columns: ['name'], trim: true })
    expect(rows[0]?.name).toBe('Alice')
    expect(rows[1]?.name).toBe('Bob')
  })

  it('standardize is case-insensitive for map keys', () => {
    const { rows } = runCleanData(dataset, {
      standardizeRules: [
        { column: 'status', map: { active: 'Active', inactive: 'Inactive' }, exactOnly: false },
      ],
    })
    // 'active' -> 'Active' (exact match)
    expect(rows[0]?.status).toBe('Active')
    // 'ACTIVE' -> lowercased 'active' -> 'Active' (case-insensitive)
    expect(rows[1]?.status).toBe('Active')
    // 'Active' -> lowercased 'active' -> 'Active' (case-insensitive)
    expect(rows[2]?.status).toBe('Active')
    // 'inactive' -> 'Inactive'
    expect(rows[3]?.status).toBe('Inactive')
  })

  it('standardize with capitalized map key still matches lowercase cell', () => {
    const { rows } = runCleanData(dataset, {
      standardizeRules: [
        { column: 'status', map: { Active: 'Active', Inactive: 'Inactive' }, exactOnly: false },
      ],
    })
    // Cell 'active', map key 'Active' → lowercased both → match
    expect(rows[0]?.status).toBe('Active')
    expect(rows[1]?.status).toBe('Active')
  })

  it('exactOnly leaves unmatched values as-is', () => {
    const { rows } = runCleanData(dataset, {
      standardizeRules: [
        { column: 'status', map: { active: 'Active' }, exactOnly: true },
      ],
    })
    expect(rows[0]?.status).toBe('Active') // exact match
    expect(rows[1]?.status).toBe('ACTIVE') // not exact, left as-is
  })

  it('lowercase and uppercase work', () => {
    const { rows: lower } = runCleanData(dataset, { columns: ['status'], lowercase: true })
    expect(lower.every((r) => String(r.status) === String(r.status).toLowerCase())).toBe(true)

    const { rows: upper } = runCleanData(dataset, { columns: ['status'], uppercase: true })
    expect(upper.every((r) => String(r.status) === String(r.status).toUpperCase())).toBe(true)
  })

  it('preserves boolean values and handles explicit nulls as empty values', () => {
    const typedDataset = {
      ...dataset,
      columns: ['active', 'note'],
      rows: [
        { active: false, note: null },
        { active: true, note: '' },
      ],
    }
    const { rows } = runCleanData(typedDataset, {
      columns: ['active', 'note'],
      lowercase: true,
      fillEmpty: 'missing',
    })

    expect(rows).toEqual([
      { active: false, note: 'missing' },
      { active: true, note: 'missing' },
    ])
  })
})
