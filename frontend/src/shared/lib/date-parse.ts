/**
 * Parse a value as a date. Returns numeric timestamp (ms) for comparison, or NaN if not parseable.
 * Handles: ISO strings, common US/UK formats, and numeric timestamps.
 */
export function parseDate(value: unknown): number {
  if (value === null || value === undefined) return NaN
  if (typeof value === 'number') {
    return value < 1e13 ? value * 1000 : value // assume seconds if small
  }
  const s = String(value).trim()
  if (!s) return NaN
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? NaN : d.getTime()
}

export function isDateLike(value: unknown): boolean {
  return !Number.isNaN(parseDate(value))
}
