import { describe, it, expect } from 'vitest'
import { runLookup, type KeyPair } from './run-lookup'

const source = {
  id: 'ds-1',
  name: 'source',
  columns: ['employee_id', 'name', 'email'],
  rows: [
    { employee_id: 'E001', name: 'Alice', email: 'alice@test.com' },
    { employee_id: 'E002', name: 'Bob', email: 'bob@test.com' },
    { employee_id: 'E003', name: 'Carol', email: 'CAROL@TEST.COM' },
  ],
}

const lookup = {
  id: 'ds-2',
  name: 'lookup',
  columns: ['employee_id', 'department', 'role'],
  rows: [
    { employee_id: 'E001', department: 'Fleet', role: 'Driver' },
    { employee_id: 'E002', department: 'Warehouse', role: 'Picker' },
    { employee_id: 'E004', department: 'HR', role: 'Manager' },
  ],
}

// Helper: create a key pair array from column name(s)
const toPairs = (cols: string[]): KeyPair[] =>
  cols.map((col) => ({ sourceColumn: col, lookupColumn: col }))

describe('runLookup', () => {
  // ──────────────────────────── Happy path ────────────────────────────
  it('left join retrieves matching columns from lookup', () => {
    const { columns, rows } = runLookup(
      source,
      toPairs(['employee_id']),
      lookup,
      ['department', 'role'],
      []
    )
    expect(rows.length).toBe(3)
    expect(columns).toContain('department')
    expect(columns).toContain('role')
    expect(columns).toContain('_match_level')
    const e001 = rows.find((r) => r.employee_id === 'E001')
    expect(e001?.department).toBe('Fleet')
    expect(e001?.role).toBe('Driver')
    expect(e001?._match_level).toBe('primary')
    const e003 = rows.find((r) => r.employee_id === 'E003')
    expect(e003?.department).toBe('')
    expect(e003?._match_level).toBe('unmatched')
  })

  // ──────────────────── Validation / error surface ────────────────────
  it('throws when key columns do not exist', () => {
    expect(() =>
      runLookup(source, toPairs(['nonexistent']), lookup, ['department'], [])
    ).toThrow(/key set 1 source/)
    expect(() =>
      runLookup(source, toPairs(['employee_id']), lookup, ['nonexistent'], [])
    ).toThrow(/Lookup retrieve/)
  })

  it('throws when a fallback references a nonexistent column', () => {
    expect(() =>
      runLookup(
        source,
        toPairs(['employee_id']),
        lookup,
        ['department'],
        [toPairs(['nope'])],
      ),
    ).toThrow(/key set 2 source/)
  })

  it('throws when retrieved columns collide with source columns', () => {
    expect(() =>
      runLookup(
        source,
        toPairs(['employee_id']),
        lookup,
        ['name'], // 'name' exists on source too
        [],
      ),
    ).toThrow(/collide with existing source columns: name/)
  })

  it('throws when the primary key set is entirely empty', () => {
    expect(() =>
      runLookup(
        source,
        [{ sourceColumn: '', lookupColumn: '' }],
        lookup,
        ['department'],
        [],
      ),
    ).toThrow(/primary key set requires at least one complete/)
  })

  // ───────────────────── Case / trim normalization ─────────────────────
  it('ignoreCase matches keys case-insensitively', () => {
    const source2 = {
      ...source,
      rows: [
        { employee_id: 'e001', name: 'Alice', email: 'alice@test.com' },
        { employee_id: 'E002', name: 'Bob', email: 'bob@test.com' },
      ],
    }
    const { rows } = runLookup(
      source2,
      toPairs(['employee_id']),
      lookup,
      ['department'],
      [],
      { ignoreCase: true }
    )
    const e001 = rows.find((r) => r.employee_id === 'e001')
    expect(e001?.department).toBe('Fleet')
  })

  it('trim matches keys with whitespace trimmed', () => {
    const source3 = {
      ...source,
      rows: [{ employee_id: ' E001 ', name: 'Alice', email: 'alice@test.com' }],
    }
    const { rows } = runLookup(
      source3,
      toPairs(['employee_id']),
      lookup,
      ['department'],
      [],
      { trim: true }
    )
    expect(rows[0]?.department).toBe('Fleet')
  })

  // ─────────────────────── Fallback key sets ───────────────────────
  it('falls back when the primary key set misses', () => {
    const lookup2 = {
      ...lookup,
      columns: [...lookup.columns, 'email'],
      rows: lookup.rows.map((r, i) => ({
        ...r,
        email: ['alice@test.com', 'bob@test.com', 'carol@test.com'][i],
      })),
    }
    const { rows } = runLookup(
      source,
      toPairs(['employee_id']),
      lookup2,
      ['department'],
      [[{ sourceColumn: 'email', lookupColumn: 'email' }]],
    )
    // E003 has no employee_id in lookup but email matches (case-insensitive: no, exact).
    // 'CAROL@TEST.COM' vs 'carol@test.com' — exact match fails without ignoreCase.
    const e003 = rows.find((r) => r.employee_id === 'E003')
    expect(e003?._match_level).toBe('unmatched')
  })

  it('reports _match_level = fallback_1 when the fallback matches', () => {
    const lookup2 = {
      ...lookup,
      columns: [...lookup.columns, 'email'],
      rows: [
        ...lookup.rows.map((r) => ({ ...r, email: '' })),
        { employee_id: '', department: 'Support', role: 'Agent', email: 'carol@test.com' },
      ],
    }
    const source2 = {
      ...source,
      rows: [
        { employee_id: '', name: 'Carol', email: 'carol@test.com' },
      ],
    }
    const { rows } = runLookup(
      source2,
      toPairs(['employee_id']),
      lookup2,
      ['department'],
      [[{ sourceColumn: 'email', lookupColumn: 'email' }]],
    )
    expect(rows[0]?._match_level).toBe('fallback_1')
    expect(rows[0]?.department).toBe('Support')
  })

  it('preserves original fallback index when an earlier fallback set is empty', () => {
    const lookup2 = {
      ...lookup,
      columns: [...lookup.columns, 'email'],
      rows: [
        ...lookup.rows.map((r) => ({ ...r, email: '' })),
        { employee_id: '', department: 'Support', role: 'Agent', email: 'carol@test.com' },
      ],
    }
    const source2 = {
      ...source,
      rows: [{ employee_id: '', name: 'Carol', email: 'carol@test.com' }],
    }
    const { rows } = runLookup(
      source2,
      toPairs(['employee_id']),
      lookup2,
      ['department'],
      [
        [{ sourceColumn: '', lookupColumn: '' }], // empty set → dropped, but keeps index 1
        [{ sourceColumn: 'email', lookupColumn: 'email' }], // should label as fallback_2
      ],
    )
    // The valid fallback is at original index 2 → label fallback_2.
    expect(rows[0]?._match_level).toBe('fallback_2')
    expect(rows[0]?.department).toBe('Support')
  })

  it('skips fallback sets whose pairs reference no real column after cleaning', () => {
    // Fallback with only empty pairs should be treated as absent, not as a
    // match-everything set.
    const { rows } = runLookup(
      source,
      toPairs(['employee_id']),
      lookup,
      ['department'],
      [[{ sourceColumn: '', lookupColumn: '' }]],
    )
    const e003 = rows.find((r) => r.employee_id === 'E003')
    expect(e003?._match_level).toBe('unmatched')
  })

  // ───────────────────────── Empty keys ─────────────────────────
  it('skips lookup rows with empty composite keys and reports it', () => {
    const lookup2 = {
      ...lookup,
      rows: [
        ...lookup.rows,
        { employee_id: '', department: 'Ghost', role: 'N/A' },
      ],
    }
    const { rows, diagnostics } = runLookup(
      source,
      toPairs(['employee_id']),
      lookup2,
      ['department'],
      [],
    )
    expect(rows.find((r) => r.employee_id === 'E001')?.department).toBe('Fleet')
    // No row should have matched the empty-key lookup row.
    expect(rows.every((r) => r.department !== 'Ghost')).toBe(true)
    expect(diagnostics.join(' ')).toMatch(/primary.*empty key/i)
  })

  it('marks source rows with empty keys in every set as unmatched', () => {
    const source2 = {
      ...source,
      rows: [{ employee_id: '', name: 'Ghost', email: '' }],
    }
    const { rows, diagnostics } = runLookup(
      source2,
      toPairs(['employee_id']),
      lookup,
      ['department'],
      [],
    )
    expect(rows[0]?._match_level).toBe('unmatched')
    expect(diagnostics.join(' ')).toMatch(/empty key/i)
  })

  it('allows a fallback to match when the primary key is empty', () => {
    const lookup2 = {
      ...lookup,
      columns: [...lookup.columns, 'email'],
      rows: [
        ...lookup.rows,
        { employee_id: '', department: 'Support', role: 'Agent', email: 'carol@test.com' },
      ],
    }
    const source2 = {
      ...source,
      rows: [{ employee_id: '', name: 'Carol', email: 'carol@test.com' }],
    }
    const { rows } = runLookup(
      source2,
      toPairs(['employee_id']),
      lookup2,
      ['department'],
      [[{ sourceColumn: 'email', lookupColumn: 'email' }]],
    )
    expect(rows[0]?._match_level).toBe('fallback_1')
    expect(rows[0]?.department).toBe('Support')
  })

  // ───────────────────── Duplicate keys ─────────────────────
  it('uses first occurrence for duplicate lookup keys and reports the count', () => {
    const lookup2 = {
      ...lookup,
      rows: [
        ...lookup.rows,
        { employee_id: 'E001', department: 'Second', role: 'Second' },
      ],
    }
    const { rows, diagnostics } = runLookup(
      source,
      toPairs(['employee_id']),
      lookup2,
      ['department'],
      [],
    )
    const e001 = rows.find((r) => r.employee_id === 'E001')
    expect(e001?.department).toBe('Fleet')
    expect(diagnostics.join(' ')).toMatch(/primary.*duplicate key/i)
  })

  // ───────────────────── excludeUnmatched ─────────────────────
  it('excludeUnmatched drops unmatched rows and tags the summary', () => {
    const { rows, diagnostics } = runLookup(
      source,
      toPairs(['employee_id']),
      lookup,
      ['department'],
      [],
      { excludeUnmatched: true },
    )
    expect(rows.find((r) => r.employee_id === 'E003')).toBeUndefined()
    expect(rows.length).toBe(2)
    expect(diagnostics.join(' ')).toMatch(/unmatched \(excluded\)/)
  })
})