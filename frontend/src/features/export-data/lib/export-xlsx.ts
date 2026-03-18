import * as XLSX from 'xlsx'
import type { DataRow } from '@/entities/dataset'

export function downloadXLSX(columns: string[], rows: DataRow[], filename = 'export.xlsx') {
  const wsData = [columns] as (string | number)[][]
  for (const row of rows) {
    wsData.push(columns.map((c) => row[c] ?? ''))
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Export')
  XLSX.writeFile(wb, filename)
}
