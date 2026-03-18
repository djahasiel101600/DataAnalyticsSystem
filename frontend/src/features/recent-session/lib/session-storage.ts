import type { Dataset } from '@/entities/dataset'

const SESSION_KEY = 'data-analytics-session'
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export interface SavedSession {
  datasets: Dataset[]
  result: { columns: string[]; rows: Record<string, unknown>[] } | null
}

export function hasSavedSession(): boolean {
  try {
    return !!localStorage.getItem(SESSION_KEY)
  } catch {
    return false
  }
}

export function saveSession(session: SavedSession): boolean {
  try {
    const raw = JSON.stringify(session)
    if (raw.length > MAX_SIZE) return false
    localStorage.setItem(SESSION_KEY, raw)
    return true
  } catch {
    return false
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearSavedSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
