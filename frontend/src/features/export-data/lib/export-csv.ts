import type { DataRow } from '@/entities/dataset'

function escapeCSV(value: string | number): string {
  const s = String(value)
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function exportCSV(columns: string[], rows: DataRow[]): string {
  const header = columns.map(escapeCSV).join(',')
  const body = rows.map((row) => columns.map((c) => escapeCSV(row[c] ?? '')).join(',')).join('\r\n')
  return `${header}\r\n${body}`
}

export function downloadCSV(columns: string[], rows: DataRow[], filename = 'export.csv') {
  const csv = exportCSV(columns, rows)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
