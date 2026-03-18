import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { DataRow } from '@/entities/dataset'

const ACCEPT_CSV = '.csv'
const ACCEPT_XLSX = '.xlsx,.xls'

export const ACCEPT_UPLOAD = `${ACCEPT_CSV},${ACCEPT_XLSX}`

function normalizeRow(raw: Record<string, unknown>): DataRow {
  const out: DataRow = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) {
      out[k] = ''
    } else if (typeof v === 'number' && !Number.isNaN(v)) {
      out[k] = v
    } else {
      out[k] = String(v)
    }
  }
  return out
}

export function parseCSV(file: File): Promise<{ columns: string[]; rows: DataRow[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results: Papa.ParseResult<Record<string, unknown>>) {
        const rows = results.data
        if (rows.length === 0) {
          resolve({ columns: [], rows: [] })
          return
        }
        const columns = Object.keys(rows[0])
        const normalized = rows.map((r) => normalizeRow(r))
        resolve({ columns, rows: normalized })
      },
      error(err: Error) {
        reject(err)
      },
    })
  })
}

export function parseXLSX(file: File): Promise<{ columns: string[]; rows: DataRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data || typeof data !== 'object') {
          reject(new Error('Failed to read file'))
          return
        }
        const wb = XLSX.read(data, { type: 'array' })
        const firstSheet = wb.SheetNames[0]
        if (!firstSheet) {
          resolve({ columns: [], rows: [] })
          return
        }
        const ws = wb.Sheets[firstSheet]
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        if (json.length === 0) {
          resolve({ columns: [], rows: [] })
          return
        }
        const columns = Object.keys(json[0])
        const rows = json.map((r) => normalizeRow(r))
        resolve({ columns, rows })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function parseFile(file: File): Promise<{ columns: string[]; rows: DataRow[] }> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv')) return parseCSV(file)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXLSX(file)
  return Promise.reject(new Error(`Unsupported format: ${file.name}`))
}

/** Threshold above which to use server-side parsing (5MB). */
export const LARGE_FILE_THRESHOLD_BYTES = 5 * 1024 * 1024

export function shouldUseServerParse(file: File): boolean {
  const name = file.name.toLowerCase()
  return (
    file.size > LARGE_FILE_THRESHOLD_BYTES &&
    (name.endsWith('.csv') || name.endsWith('.xlsx'))
  )
}

/**
 * Parse file on the server (Django /api/parse/upload/). Use for large files.
 */
export async function parseFileServer(
  file: File
): Promise<{ columns: string[]; rows: DataRow[] }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/parse/upload/', {
    method: 'POST',
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText)
  }
  const columns = (data as { columns?: string[] }).columns ?? []
  const rawRows = (data as { rows?: Record<string, unknown>[] }).rows ?? []
  const rows = rawRows.map((r) => normalizeRow(r))
  return { columns, rows }
}
