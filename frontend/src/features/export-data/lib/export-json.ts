import type { DataRow } from '@/entities/dataset'

export function downloadJSON(columns: string[], rows: DataRow[], filename = 'export.json') {
  const data = rows.map((row) => {
    const obj: Record<string, string | number> = {}
    for (const c of columns) {
      obj[c] = row[c] ?? ''
    }
    return obj
  })
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
