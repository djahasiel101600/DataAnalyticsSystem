import type { Dataset, DataRow } from '@/entities/dataset'
import { runInactivityCheck } from '@/features/inactivity-check/lib/run-inactivity-check'
import { runCoverageCheck } from '@/features/coverage-check/lib/run-coverage-check'
import { runDuplicateCheck } from '@/features/duplicate-check/lib/run-duplicate-check'

export interface ExceptionReportOptions {
  /** Key columns for duplicate check and coverage. */
  keyColumns: string[]
  /** If set, run inactivity check and flag rows with no activity for more than thresholdDays. */
  dateColumn?: string
  thresholdDays?: number
  referenceDate?: string | number
  /** If set, run coverage check against this master; rows missing in master get "Missing in master". */
  masterDataset?: Dataset
  masterKeyColumns?: string[]
  ignoreCase?: boolean
  trim?: boolean
}

/**
 * Single table with _exception_type: "Duplicate" | "Inactive" | "Missing in master" | "Duplicate; Inactive" | etc.
 * Rows with no issues have _exception_type = "".
 */
export function runExceptionReport(
  primary: Dataset,
  options: ExceptionReportOptions
): { columns: string[]; rows: DataRow[] } {
  const {
    keyColumns,
    dateColumn,
    thresholdDays = 3,
    referenceDate,
    masterDataset,
    masterKeyColumns = [],
    ignoreCase = false,
    trim = false,
  } = options

  // 1) Duplicate check (mark)
  const dupResult = runDuplicateCheck(primary, keyColumns, 'mark', 'first', {
    ignoreCase,
    trim,
    addKeepPreviewColumns: false,
  })
  const dupByIndex = dupResult.rows.map((r) => Number(r._is_duplicate) === 1)

  // 2) Inactivity (optional)
  let inactiveByIndex: boolean[] = []
  if (dateColumn && primary.columns.includes(dateColumn)) {
    const inactResult = runInactivityCheck(primary, {
      dateColumn,
      thresholdDays,
      referenceDate,
    })
    inactiveByIndex = inactResult.rows.map((r) => Number(r._is_inactive) === 1)
  }

  // 3) Coverage (optional)
  let missingByIndex: boolean[] = []
  if (masterDataset && masterKeyColumns.length > 0) {
    const covResult = runCoverageCheck(
      primary,
      keyColumns,
      [{ dataset: masterDataset, keyColumns: masterKeyColumns }],
      { rule: 'all', outputMode: 'annotate', ignoreCase, trim, addKeyColumn: false }
    )
    missingByIndex = covResult.rows.map((r) => Number(r._coverage_ok) === 0)
  }

  const outColumns = [...primary.columns, '_exception_type']
  const outRows: DataRow[] = primary.rows.map((row, i) => {
    const types: string[] = []
    if (dupByIndex[i]) types.push('Duplicate')
    if (inactiveByIndex[i] ?? false) types.push('Inactive')
    if (missingByIndex[i] ?? false) types.push('Missing in master')
    return {
      ...row,
      _exception_type: types.join('; ') || '',
    }
  })

  return { columns: outColumns, rows: outRows }
}
