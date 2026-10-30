import type { Dataset, DataRow } from '@/entities/dataset'
import { parseDate } from '@/shared/lib/date-parse'

export interface InactivityCheckOptions {
  /** Date column name (e.g. last_activity, updated_at) */
  dateColumn: string
  /** Reference date (default: today). ISO string or timestamp. */
  referenceDate?: string | number
  /** Flag as inactive when days since last activity > this. Default 3. */
  thresholdDays?: number
  /**
   * When true, rows with missing/invalid dates are NOT flagged as inactive;
   * they get _date_invalid = 1 instead. When false (default), missing dates
   * are treated as very old (inactive if threshold > 0) for backward compat.
   */
  strict?: boolean
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function dayStart(ts: number): number {
  const d = new Date(ts)
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Adds _days_inactive (number), _is_inactive (0 | 1), and _date_inactive (0 | 1) to each row.
 *
 * Rows with missing/invalid dates:
 * - strict=false (default): _days_inactive = 999999, flagged inactive if threshold > 0 (legacy behavior)
 * - strict=true: _days_inactive = 0, _date_inactive = 1, NOT flagged inactive
 */
export function runInactivityCheck(
  dataset: Dataset,
  options: InactivityCheckOptions
): { columns: string[]; rows: DataRow[] } {
  const {
    dateColumn,
    referenceDate,
    thresholdDays = 3,
    strict = false,
  } = options

  const ref = referenceDate != null
    ? (typeof referenceDate === 'number' ? referenceDate : parseDate(referenceDate))
    : Date.now()
  const refDay = Number.isNaN(ref) ? dayStart(Date.now()) : dayStart(ref)

  const outColumns = [...dataset.columns, '_days_inactive', '_is_inactive', '_date_inactive']
  const outRows: DataRow[] = dataset.rows.map((row) => {
    const cell = row[dateColumn]
    const ts = parseDate(cell)
    const dateInvalid = Number.isNaN(ts)
    let daysInactive: number
    let isInactive: number

    if (dateInvalid) {
      daysInactive = 0
      // In strict mode, missing dates are not flagged inactive.
      // In legacy mode, they are treated as very old (inactive if threshold > 0).
      isInactive = strict ? 0 : thresholdDays > 0 ? 1 : 0
    } else {
      daysInactive = Math.floor((refDay - dayStart(ts)) / MS_PER_DAY)
      isInactive = daysInactive > thresholdDays ? 1 : 0
    }
    return {
      ...row,
      _days_inactive: daysInactive,
      _is_inactive: isInactive,
      _date_inactive: dateInvalid ? 1 : 0,
    }
  })

  return { columns: outColumns, rows: outRows }
}
