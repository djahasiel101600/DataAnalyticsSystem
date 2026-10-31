import type { Dataset } from '@/entities/dataset'
import type { OperationConfigurations } from '@/app/store/OperationConfigContext'

const DATABASE_NAME = 'data-analytics-session'
const DATABASE_VERSION = 2
const SESSION_STORE = 'sessions'
const LEGACY_SESSION_KEY = 'data-analytics-session'
const LEGACY_RECORD_KEY = 'recent'

export interface SavedSession {
  datasets: Dataset[]
  result: { columns: string[]; rows: Record<string, unknown>[] } | null
  operationConfigs: OperationConfigurations
}

export interface SavedSessionRecord {
  id: string
  name: string
  savedAt: number
  data: SavedSession
}

interface StoredSessionRecord extends SavedSessionRecord {
  version: 2
}

interface LegacyStoredSession {
  version: 1
  data: Omit<SavedSession, 'operationConfigs'> & {
    operationConfigs?: OperationConfigurations
  }
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

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isOperationConfigurations(value: unknown): value is OperationConfigurations {
  return isObject(value) && Object.values(value).every(isObject)
}

function isSessionData(value: unknown): value is SavedSession {
  if (!isObject(value)) return false
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
        dataset.columns.every((column) => typeof column === 'string') &&
        Array.isArray(dataset.rows),
    ) &&
    (session.result === null ||
      (isObject(session.result) &&
        Array.isArray(session.result.columns) &&
        session.result.columns.every((column) => typeof column === 'string') &&
        Array.isArray(session.result.rows))) &&
    (session.operationConfigs === undefined ||
      isOperationConfigurations(session.operationConfigs))
  )
}

function normalizeSessionData(value: unknown): SavedSession {
  if (!isSessionData(value)) {
    throw new Error('The saved session has an unsupported format or is corrupted.')
  }
  return {
    datasets: value.datasets,
    result: value.result,
    operationConfigs: value.operationConfigs ?? {},
  }
}

function isStoredSessionRecord(value: unknown): value is StoredSessionRecord {
  return (
    isObject(value) &&
    value.version === 2 &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.savedAt === 'number' &&
    isSessionData(value.data) &&
    isOperationConfigurations(value.data.operationConfigs)
  )
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function writeRecord(record: SavedSessionRecord): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SESSION_STORE, 'readwrite')
      transaction.objectStore(SESSION_STORE).put(
        { ...record, version: 2 } satisfies StoredSessionRecord,
        record.id,
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

async function migrateLegacyRecords(
  entries: { key: IDBValidKey; value: unknown }[],
): Promise<SavedSessionRecord[]> {
  const migrated: SavedSessionRecord[] = []
  for (const entry of entries) {
    if (entry.key !== LEGACY_RECORD_KEY) continue
    const value = entry.value as Partial<LegacyStoredSession> | null
    if (!value || value.version !== 1) continue
    const data = normalizeSessionData(value.data)
    const record = {
      id: makeId(),
      name: 'Recovered session',
      savedAt: Date.now(),
      data,
    }
    const database = await openDatabase()
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(SESSION_STORE, 'readwrite')
        const store = transaction.objectStore(SESSION_STORE)
        store.put({ ...record, version: 2 } satisfies StoredSessionRecord, record.id)
        store.delete(LEGACY_RECORD_KEY)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(
          transaction.error ?? new Error('Could not migrate the saved session.'),
        )
        transaction.onabort = () => reject(
          transaction.error ?? new Error('Session migration was cancelled.'),
        )
      })
    } finally {
      database.close()
    }
    migrated.push(record)
  }
  return migrated
}

export async function listSavedSessions(): Promise<SavedSessionRecord[]> {
  const database = await openDatabase()
  let entries: { key: IDBValidKey; value: unknown }[]
  try {
    const transaction = database.transaction(SESSION_STORE, 'readonly')
    const store = transaction.objectStore(SESSION_STORE)
    const [keys, values] = await Promise.all([
      readRequest(store.getAllKeys()),
      readRequest<unknown[]>(store.getAll()),
    ])
    entries = keys.map((key, index) => ({ key, value: values[index] }))
  } finally {
    database.close()
  }

  const migrated = await migrateLegacyRecords(entries)
  const records = entries
    .filter((entry) => entry.key !== LEGACY_RECORD_KEY)
    .map((entry) => {
      if (!isStoredSessionRecord(entry.value)) {
        throw new Error('A saved session has an unsupported format or is corrupted.')
      }
      return {
        id: entry.value.id,
        name: entry.value.name,
        savedAt: entry.value.savedAt,
        data: normalizeSessionData(entry.value.data),
      }
    })
  const legacyRaw = localStorage.getItem(LEGACY_SESSION_KEY)
  if (legacyRaw) {
    let legacy: unknown
    try {
      legacy = JSON.parse(legacyRaw)
    } catch {
      throw new Error('The saved session is corrupted and cannot be restored.')
    }
    const record = {
      id: makeId(),
      name: 'Recovered session',
      savedAt: Date.now(),
      data: normalizeSessionData(legacy),
    }
    await writeRecord(record)
    localStorage.removeItem(LEGACY_SESSION_KEY)
    migrated.push(record)
  }
  return [...records, ...migrated].sort((a, b) => b.savedAt - a.savedAt)
}

export async function saveSession(
  name: string,
  data: SavedSession,
): Promise<SavedSessionRecord> {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Enter a name for this session.')
  const record = {
    id: makeId(),
    name: trimmedName,
    savedAt: Date.now(),
    data: normalizeSessionData(data),
  }
  await writeRecord(record)
  localStorage.removeItem(LEGACY_SESSION_KEY)
  return record
}

export async function loadSession(id: string): Promise<SavedSession | null> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(SESSION_STORE, 'readonly')
    const stored = await readRequest<unknown>(
      transaction.objectStore(SESSION_STORE).get(id),
    )
    if (stored === undefined) return null
    if (!isStoredSessionRecord(stored)) {
      throw new Error('The saved session has an unsupported format or is corrupted.')
    }
    return normalizeSessionData(stored.data)
  } finally {
    database.close()
  }
}

export async function deleteSavedSession(id: string): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SESSION_STORE, 'readwrite')
      transaction.objectStore(SESSION_STORE).delete(id)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ?? new Error('Could not delete the saved session.'),
      )
      transaction.onabort = () => reject(
        transaction.error ?? new Error('Session deletion was cancelled.'),
      )
    })
  } finally {
    database.close()
  }
}

export async function clearSavedSessions(): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SESSION_STORE, 'readwrite')
      transaction.objectStore(SESSION_STORE).clear()
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(
        transaction.error ?? new Error('Could not clear saved sessions.'),
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
