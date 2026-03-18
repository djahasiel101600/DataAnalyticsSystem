import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Dataset, DataRow } from '@/entities/dataset'

export interface ResultHighlight {
  pattern: string
  matchColumnHeader: string
}

const MAX_UNDO = 20

interface DatasetsState {
  datasets: Dataset[]
  result: { columns: string[]; rows: DataRow[] } | null
  resultHighlight: ResultHighlight | null
  resultHistory: { columns: string[]; rows: DataRow[] }[]
}

interface DatasetsContextValue extends DatasetsState {
  addDataset: (name: string, columns: string[], rows: DataRow[]) => Dataset
  removeDataset: (id: string) => void
  renameDataset: (id: string, name: string) => void
  setResult: (data: { columns: string[]; rows: DataRow[] } | null, highlight?: ResultHighlight | null) => void
  getDataset: (id: string) => Dataset | undefined
  undo: () => void
  canUndo: boolean
  loadSession: (datasets: Dataset[], result: { columns: string[]; rows: DataRow[] } | null) => void
}

const DatasetsContext = createContext<DatasetsContextValue | null>(null)

let nextId = 1
function generateId() {
  return `ds-${nextId++}`
}

export function DatasetsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DatasetsState>({
    datasets: [],
    result: null,
    resultHighlight: null,
    resultHistory: [],
  })

  const addDataset = useCallback((name: string, columns: string[], rows: DataRow[]): Dataset => {
    const id = generateId()
    const dataset: Dataset = { id, name, columns, rows }
    setState((s) => ({
      ...s,
      datasets: [...s.datasets, dataset],
    }))
    return dataset
  }, [])

  const removeDataset = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      datasets: s.datasets.filter((d) => d.id !== id),
      result: s.result,
    }))
  }, [])

  const renameDataset = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      datasets: s.datasets.map((d) => (d.id === id ? { ...d, name } : d)),
    }))
  }, [])

  const setResult = useCallback((data: { columns: string[]; rows: DataRow[] } | null, highlight?: ResultHighlight | null) => {
    setState((s) => {
      const nextHistory = s.result && data
        ? [...s.resultHistory.slice(-(MAX_UNDO - 1)), s.result]
        : s.resultHistory
      return {
        ...s,
        result: data,
        resultHighlight: data === null ? null : (highlight !== undefined ? highlight : null),
        resultHistory: data ? nextHistory : s.resultHistory,
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState((s) => {
      if (s.resultHistory.length === 0) return s
      const prev = s.resultHistory[s.resultHistory.length - 1]
      return {
        ...s,
        result: prev,
        resultHighlight: null,
        resultHistory: s.resultHistory.slice(0, -1),
      }
    })
  }, [])

  const canUndo = state.resultHistory.length > 0

  const loadSession = useCallback((datasets: Dataset[], result: { columns: string[]; rows: DataRow[] } | null) => {
    setState({
      datasets,
      result,
      resultHighlight: null,
      resultHistory: [],
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
    getDataset,
    undo,
    canUndo,
    loadSession,
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
