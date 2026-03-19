import type { Dataset, DataRow } from '@/entities/dataset'
import { parseDate } from '@/shared/lib/date-parse'

export interface InactivityCheckOptions {
  /** Date column name (e.g. last_activity, updated_at) */
  dateColumn: string
  /** Reference date (default: today). ISO string or timestamp. */
  referenceDate?: string | number
  /** Flag as inactive when days since last activity > this. Default 3. */
  thresholdDays?: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function dayStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Adds _days_inactive (number) and _is_inactive (0 | 1) to each row.
 * Rows with missing/invalid date are treated as very old (inactive if threshold > 0).
 */
export function runInactivityCheck(
  dataset: Dataset,
  options: InactivityCheckOptions
): { columns: string[]; rows: DataRow[] } {
  const {
    dateColumn,
    referenceDate,
    thresholdDays = 3,
  } = options

  const ref = referenceDate != null
    ? (typeof referenceDate === 'number' ? referenceDate : parseDate(referenceDate))
    : Date.now()
  const refDay = Number.isNaN(ref) ? dayStart(Date.now()) : dayStart(ref)

  const outColumns = [...dataset.columns, '_days_inactive', '_is_inactive']
  const outRows: DataRow[] = dataset.rows.map((row) => {
    const cell = row[dateColumn]
    const ts = parseDate(cell)
    const daysInactive = Number.isNaN(ts)
      ? 999999
      : Math.floor((refDay - dayStart(ts)) / MS_PER_DAY)
    const isInactive = daysInactive > thresholdDays ? 1 : 0
    return {
      ...row,
      _days_inactive: daysInactive,
      _is_inactive: isInactive,
    }
  })

  return { columns: outColumns, rows: outRows }
}
