import type { DataRow } from '@/entities/dataset'

const SERVER_XLSX_THRESHOLD = 15000

export async function downloadXLSXServer(
  columns: string[],
  rows: DataRow[],
  filename = 'export.xlsx'
): Promise<void> {
  const body = JSON.stringify({
    columns,
    rows: rows.map((r) => {
      const arr: (string | number)[] = []
      for (const c of columns) {
        arr.push(r[c] ?? '')
      }
      return arr
    }),
  })
  const res = await fetch('/api/export/xlsx/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error || 'Export failed')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function shouldUseServerXLSX(rows: DataRow[]): boolean {
  return rows.length > SERVER_XLSX_THRESHOLD
}
