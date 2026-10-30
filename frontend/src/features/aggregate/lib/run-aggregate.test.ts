import { describe, it, expect } from 'vitest'
import { runAggregate, runPivot, type AggregateFn } from './run-aggregate'

const rows = [
  { region: 'North', product: 'Widget A', amount: '100', qty: '10' },
  { region: 'North', product: 'Widget A', amount: '200', qty: '5' },
  { region: 'North', product: 'Widget B', amount: '', qty: '3' },
  { region: 'South', product: 'Widget A', amount: '150', qty: '8' },
  { region: 'South', product: 'Widget B', amount: '50', qty: '' },
  { region: 'South', product: 'Widget B', amount: 'invalid', qty: '2' },
]

describe('runAggregate', () => {
  it('sum aggregates correctly per group', () => {
    const { rows: result } = runAggregate(
      [],
      rows,
      ['region'],
      [{ column: 'amount', fn: 'sum' as AggregateFn }]
    )
    const north = result.find((r) => r.region === 'North')
    const south = result.find((r) => r.region === 'South')
    expect(north?.amount_sum).toBe(300) // 100 + 200 (empty excluded)
    expect(south?.amount_sum).toBe(200) // 150 + 50 ('invalid' excluded)
  })

  it('count counts non-empty values, not rows', () => {
    const { rows: result } = runAggregate(
      [],
      rows,
      ['region'],
      [{ column: 'amount', fn: 'count' as AggregateFn }]
    )
    const north = result.find((r) => r.region === 'North')
    const south = result.find((r) => r.region === 'South')
    expect(north?.amount_count).toBe(2) // 2 non-empty amounts in North (100, 200)
    expect(south?.amount_count).toBe(3) // 3 non-empty in South (150, 50, 'invalid')
  })

  it('avg divides by non-empty numeric values', () => {
    const { rows: result } = runAggregate(
      [],
      rows,
      ['region'],
      [{ column: 'amount', fn: 'avg' as AggregateFn }]
    )
    const north = result.find((r) => r.region === 'North')
    expect(north?.amount_avg).toBe(150) // (100 + 200) / 2
  })

  it('min and max work correctly', () => {
    const { rows: result } = runAggregate(
      [],
      rows,
      ['region'],
      [
        { column: 'amount', fn: 'min' as AggregateFn },
        { column: 'amount', fn: 'max' as AggregateFn },
      ]
    )
    const north = result.find((r) => r.region === 'North')
    expect(north?.amount_min).toBe(100)
    expect(north?.amount_max).toBe(200)
  })

  it('multiple aggregate columns work', () => {
    const { rows: result } = runAggregate(
      [],
      rows,
      ['region'],
      [
        { column: 'amount', fn: 'sum' as AggregateFn },
        { column: 'qty', fn: 'sum' as AggregateFn },
      ]
    )
    const north = result.find((r) => r.region === 'North')
    expect(north?.amount_sum).toBe(300)
    expect(north?.qty_sum).toBe(18) // 10 + 5 + 3 (empty excluded)
  })
})

describe('runPivot', () => {
  it('pivot produces correct cross-tab', () => {
    const { columns, rows: result } = runPivot(
      rows,
      'region',
      'product',
      'amount',
      'sum' as AggregateFn
    )
    expect(columns).toContain('region')
    expect(columns).toContain('Widget A')
    expect(columns).toContain('Widget B')
    const north = result.find((r) => r.region === 'North')
    expect(north?.['Widget A']).toBe(300) // 100 + 200
    expect(north?.['Widget B']).toBe('') // empty amount
  })

  it('pivot count uses non-empty values', () => {
    const { rows: result } = runPivot(
      rows,
      'region',
      'product',
      'amount',
      'count' as AggregateFn
    )
    const north = result.find((r) => r.region === 'North')
    expect(north?.['Widget A']).toBe(2) // 2 non-empty amounts
    expect(north?.['Widget B']).toBe(0) // 1 row but amount is empty
  })

  it('handles empty dataset', () => {
    const { columns, rows: result } = runPivot(
      [],
      'region',
      'product',
      'amount',
      'sum' as AggregateFn
    )
    expect(columns).toEqual(['region'])
    expect(result).toEqual([])
  })
})
