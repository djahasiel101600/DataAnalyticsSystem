import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Dataset, DataRow } from '@/entities/dataset'
import {
  createTableWorkspace,
  type TableWorkspace,
} from './table-workspace'
import {
  appendOperationHistory,
  createOperationHistoryEntry,
  type OperationHistoryEntry,
  type OperationMetadata,
  type OperationResult,
} from './operation-history'
import { useOperationConfigurations } from './OperationConfigContext'

export interface ResultHighlight {
  pattern: string
  matchColumnHeader: string
}

const MAX_UNDO = 20

interface DatasetsState {
  datasets: Dataset[]
  result: OperationResult | null
  resultHighlight: ResultHighlight | null
  resultHistory: { result: OperationResult; operationId: string | null }[]
  operationHistory: OperationHistoryEntry[]
  currentOperationId: string | null
  tableWorkspaces: Record<string, TableWorkspace>
}

interface DatasetsContextValue extends DatasetsState {
  addDataset: (name: string, columns: string[], rows: DataRow[]) => Dataset
  removeDataset: (id: string) => void
  renameDataset: (id: string, name: string) => void
  setResult: (
    data: OperationResult | null,
    highlight?: ResultHighlight | null,
    operation?: OperationMetadata,
  ) => void
  restoreOperation: (id: string) => void
  getDataset: (id: string) => Dataset | undefined
  undo: () => void
  canUndo: boolean
  loadSession: (datasets: Dataset[], result: OperationResult | null) => void
  ensureTableWorkspace: (key: string, rows: DataRow[]) => void
  updateTableWorkspace: (
    key: string,
    rows: DataRow[],
    updater: (workspace: TableWorkspace) => TableWorkspace,
  ) => void
}

const DatasetsContext = createContext<DatasetsContextValue | null>(null)

let nextId = 1
function generateId() {
  return `ds-${nextId++}`
}

export function DatasetsProvider({ children }: { children: React.ReactNode }) {
  const operationConfigs = useOperationConfigurations()
  const [state, setState] = useState<DatasetsState>({
    datasets: [],
    result: null,
    resultHighlight: null,
    resultHistory: [],
    operationHistory: [],
    currentOperationId: null,
    tableWorkspaces: {},
  })

  useEffect(() => {
    const hasPendingChanges = Object.values(state.tableWorkspaces).some((workspace) => {
      if (workspace.records.length !== workspace.baseRows.length) return true
      if (
        Object.values(workspace.rowAnnotations).some((notes) => notes.length > 0) ||
        Object.values(workspace.cellAnnotations).some((notes) => notes.length > 0)
      ) {
        return true
      }
      return workspace.records.some((record) =>
        Object.keys(record.originalRow).some(
          (column) => !Object.is(record.originalRow[column], record.row[column]),
        ),
      )
    })
    if (!hasPendingChanges) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [state.tableWorkspaces])

  const addDataset = useCallback((name: string, columns: string[], rows: DataRow[]): Dataset => {
    const id = generateId()
    const dataset: Dataset = { id, name, columns, rows }
    const operation = createOperationHistoryEntry(
      { columns, rows },
      {
        name: `Dataset uploaded: ${name}`,
        config: { datasetId: id, datasetName: name },
        datasetId: id,
      },
    )
    setState((s) => ({
      ...s,
      datasets: [...s.datasets, dataset],
      operationHistory: appendOperationHistory(s.operationHistory, operation),
    }))
    return dataset
  }, [])

  const removeDataset = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      datasets: s.datasets.filter((d) => d.id !== id),
      result: s.result,
      tableWorkspaces: Object.fromEntries(
        Object.entries(s.tableWorkspaces).filter(([key]) => key !== `dataset:${id}`),
      ),
    }))
  }, [])

  const renameDataset = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      datasets: s.datasets.map((d) => (d.id === id ? { ...d, name } : d)),
    }))
  }, [])

  const setResult = useCallback((
    data: OperationResult | null,
    highlight?: ResultHighlight | null,
    metadata?: OperationMetadata,
  ) => {
    const operation = data
      ? createOperationHistoryEntry(
          data,
          metadata
            ? {
                ...metadata,
                config:
                  metadata.config ??
                  (metadata.configKey
                    ? operationConfigs.getSnapshot(metadata.configKey)
                    : undefined),
              }
            : { name: 'Result loaded' },
        )
      : null
    setState((s) => {
      const nextHistory = s.result && data
        ? [...s.resultHistory.slice(-(MAX_UNDO - 1)), {
            result: s.result,
            operationId: s.currentOperationId,
          }]
        : s.resultHistory
      return {
        ...s,
        result: data,
        resultHighlight: data === null ? null : (highlight !== undefined ? highlight : null),
        resultHistory: data ? nextHistory : s.resultHistory,
        operationHistory: operation
          ? appendOperationHistory(s.operationHistory, operation)
          : s.operationHistory,
        currentOperationId: operation?.id ?? null,
      }
    })
  }, [operationConfigs])

  const restoreOperation = useCallback((id: string) => {
    setState((s) => {
      const entry = s.operationHistory.find((item) => item.id === id)
      if (!entry) return s
      const nextHistory = s.result
        ? [...s.resultHistory.slice(-(MAX_UNDO - 1)), {
            result: s.result,
            operationId: s.currentOperationId,
          }]
        : s.resultHistory
      return {
        ...s,
        result: entry.result,
        resultHighlight: null,
        resultHistory: nextHistory,
        currentOperationId: entry.id,
        tableWorkspaces: Object.fromEntries(
          Object.entries(s.tableWorkspaces).filter(([key]) => key !== 'result'),
        ),
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState((s) => {
      if (s.resultHistory.length === 0) return s
      const prev = s.resultHistory[s.resultHistory.length - 1]
      return {
        ...s,
        result: prev.result,
        resultHighlight: null,
        resultHistory: s.resultHistory.slice(0, -1),
        currentOperationId: prev.operationId,
      }
    })
  }, [])

  const canUndo = state.resultHistory.length > 0

  const ensureTableWorkspace = useCallback((key: string, rows: DataRow[]) => {
    setState((s) => {
      if (s.tableWorkspaces[key]?.baseRows === rows) return s
      return {
        ...s,
        tableWorkspaces: {
          ...s.tableWorkspaces,
          [key]: createTableWorkspace(rows),
        },
      }
    })
  }, [])

  const updateTableWorkspace = useCallback(
    (
      key: string,
      rows: DataRow[],
      updater: (workspace: TableWorkspace) => TableWorkspace,
    ) => {
      setState((s) => {
        const current =
          s.tableWorkspaces[key]?.baseRows === rows
            ? s.tableWorkspaces[key]
            : createTableWorkspace(rows)
        return {
          ...s,
          tableWorkspaces: {
            ...s.tableWorkspaces,
            [key]: updater(current),
          },
        }
      })
    },
    [],
  )

  const loadSession = useCallback((datasets: Dataset[], result: OperationResult | null) => {
    setState({
      datasets,
      result,
      resultHighlight: null,
      resultHistory: [],
      operationHistory: [],
      currentOperationId: null,
      tableWorkspaces: {},
    })
  }, [])

  const getDataset = useCallback(
    (id: string) => state.datasets.find((d) => d.id === id),
    [state.datasets]
  )

  const value: DatasetsContextValue = {
    ...state,
    addDataset,
    removeDataset,
    renameDataset,
    setResult,
    restoreOperation,
    getDataset,
    undo,
    canUndo,
    loadSession,
    ensureTableWorkspace,
    updateTableWorkspace,
  }

  return (
    <DatasetsContext.Provider value={value}>
      {children}
    </DatasetsContext.Provider>
  )
}

export function useDatasets(): DatasetsContextValue {
  const ctx = useContext(DatasetsContext)
  if (!ctx) throw new Error('useDatasets must be used within DatasetsProvider')
  return ctx
}
