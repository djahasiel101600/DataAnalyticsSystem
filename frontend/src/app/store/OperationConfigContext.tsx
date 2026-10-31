import {
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

export type OperationConfigurations = Record<string, Record<string, unknown>>

type OperationConfigStore = {
  getAll: () => OperationConfigurations
  replaceAll: (configurations: OperationConfigurations) => void
  reset: (operation: string) => void
  subscribe: (operation: string, listener: () => void) => () => void
  getOperation: (operation: string) => Record<string, unknown>
  setValue: (operation: string, key: string, value: unknown | ((previous: unknown) => unknown), fallback: unknown) => void
}

const EMPTY_CONFIG: Record<string, unknown> = {}
const OperationConfigContext = createContext<OperationConfigStore | null>(null)

function createOperationConfigStore(): OperationConfigStore {
  let configurations: OperationConfigurations = {}
  const listeners = new Map<string, Set<() => void>>()

  const notify = (operation: string) => {
    listeners.get(operation)?.forEach((listener) => listener())
  }

  return {
    getAll: () => configurations,
    replaceAll: (next) => {
      const operations = new Set([
        ...Object.keys(configurations),
        ...Object.keys(next),
        ...listeners.keys(),
      ])
      configurations = next
      operations.forEach(notify)
    },
    reset: (operation) => {
      if (!(operation in configurations)) return
      const next = { ...configurations }
      delete next[operation]
      configurations = next
      notify(operation)
    },
    subscribe: (operation, listener) => {
      const operationListeners = listeners.get(operation) ?? new Set()
      operationListeners.add(listener)
      listeners.set(operation, operationListeners)
      return () => {
        operationListeners.delete(listener)
        if (operationListeners.size === 0) listeners.delete(operation)
      }
    },
    getOperation: (operation) => configurations[operation] ?? EMPTY_CONFIG,
    setValue: (operation, key, value, fallback) => {
      const current = configurations[operation] ?? EMPTY_CONFIG
      const previous = key in current ? current[key] : fallback
      const nextValue =
        typeof value === 'function'
          ? (value as (previous: unknown) => unknown)(previous)
          : value
      if (Object.is(previous, nextValue) && key in current) return
      configurations = {
        ...configurations,
        [operation]: { ...current, [key]: nextValue },
      }
      notify(operation)
    },
  }
}

export function OperationConfigProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<OperationConfigStore | null>(null)
  if (!storeRef.current) storeRef.current = createOperationConfigStore()
  return (
    <OperationConfigContext.Provider value={storeRef.current}>
      {children}
    </OperationConfigContext.Provider>
  )
}

function useOperationConfigStore() {
  const store = useContext(OperationConfigContext)
  if (!store) throw new Error('Operation config hooks must be used within OperationConfigProvider')
  return store
}

export function useOperationConfigState<T>(
  operation: string,
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const store = useOperationConfigStore()
  const operationConfig = useSyncExternalStore(
    (listener) => store.subscribe(operation, listener),
    () => store.getOperation(operation),
    () => EMPTY_CONFIG,
  )
  const value = (key in operationConfig ? operationConfig[key] : initialValue) as T
  const setValue: Dispatch<SetStateAction<T>> = (next) => {
    store.setValue(operation, key, next, initialValue)
  }
  return [value, setValue]
}

export function useOperationConfigurations() {
  return useOperationConfigStore()
}
