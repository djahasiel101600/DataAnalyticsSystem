import type { Dataset } from '@/entities/dataset'

const DATABASE_NAME = 'data-analytics-session'
const DATABASE_VERSION = 1
const SESSION_STORE = 'sessions'
const SESSION_KEY = 'recent'
const LEGACY_SESSION_KEY = 'data-analytics-session'

export interface SavedSession {
  datasets: Dataset[]
  result: { columns: string[]; rows: Record<string, unknown>[] } | null
}

interface StoredSession {
  version: 1
  data: SavedSession
}

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('This browser does not support session storage.'))
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SESSION_STORE)) {
        request.result.createObjectStore(SESSION_STORE)
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(
      new Error(
        request.error
          ? `Could not open browser session storage: ${request.error.message}`
          : 'Could not open browser session storage.',
      ),
    )
    request.onblocked = () => reject(
      new Error('Browser session storage is blocked by another open tab.'),
    )
  })
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Session storage read failed.'))
  })
}

function isSavedSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<SavedSession>
  return (
    Array.isArray(session.datasets) &&
    session.datasets.every(
      (dataset) =>
        dataset !== null &&
        typeof dataset === 'object' &&
        typeof dataset.id === 'string' &&
        typeof dataset.name === 'string' &&
        Array.isArray(dataset.columns) &&
        Array.isArray(dataset.rows),
    ) &&
    (session.result === null ||
      (typeof session.result === 'object' &&
        Array.isArray(session.result.columns) &&
        session.result.columns.every((column) => typeof column === 'string') &&
        Array.isArray(session.result.rows)))
  )
}

function isStoredSession(value: unknown): value is StoredSession {
  if (!value || typeof value !== 'object') return false
  const stored = value as Partial<StoredSession>
  return stored.version === 1 && isSavedSession(stored.data)
}

async function writeSession(session: SavedSession): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SESSION_STORE, 'readwrite')
      transaction.objectStore(SESSION_STORE).put(
        { version: 1, data: session } satisfies StoredSession,
        SESSION_KEY,
      )
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ?? new Error('Could not save the session.'),
      )
      transaction.onabort = () => reject(
        transaction.error ?? new Error('Session save was cancelled.'),
      )
    })
  } finally {
    database.close()
  }
}

async function readStoredSession(): Promise<SavedSession | null> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(SESSION_STORE, 'readonly')
    const stored = await readRequest<unknown>(
      transaction.objectStore(SESSION_STORE).get(SESSION_KEY),
    )
    if (stored === undefined) return null
    if (!isStoredSession(stored)) {
      throw new Error('The saved session has an unsupported format or is corrupted.')
    }
    return stored.data
  } finally {
    database.close()
  }
}

export async function hasSavedSession(): Promise<boolean> {
  const session = await readStoredSession()
  if (session) return true
  return localStorage.getItem(LEGACY_SESSION_KEY) !== null
}

export async function saveSession(session: SavedSession): Promise<void> {
  try {
    await writeSession(session)
    localStorage.removeItem(LEGACY_SESSION_KEY)
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error('Could not save the session.')
  }
}

export async function loadSession(): Promise<SavedSession | null> {
  const stored = await readStoredSession()
  if (stored) return stored

  const legacyRaw = localStorage.getItem(LEGACY_SESSION_KEY)
  if (!legacyRaw) return null
  let legacy: unknown
  try {
    legacy = JSON.parse(legacyRaw)
  } catch {
    throw new Error('The saved session is corrupted and cannot be restored.')
  }
  if (!isSavedSession(legacy)) {
    throw new Error('The saved session has an unsupported format and cannot be restored.')
  }

  await writeSession(legacy)
  localStorage.removeItem(LEGACY_SESSION_KEY)
  return legacy
}

export async function clearSavedSession(): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SESSION_STORE, 'readwrite')
      transaction.objectStore(SESSION_STORE).delete(SESSION_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ?? new Error('Could not clear the saved session.'),
      )
      transaction.onabort = () => reject(
        transaction.error ?? new Error('Session clear was cancelled.'),
      )
    })
    localStorage.removeItem(LEGACY_SESSION_KEY)
  } finally {
    database.close()
  }
}
