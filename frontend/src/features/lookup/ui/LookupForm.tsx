import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runLookup } from '../lib/run-lookup'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export function LookupForm() {
  const { datasets, getDataset, setResult } = useDatasets()
  const [sourceId, setSourceId] = useState<string>('')
  const [sourceKeyColumns, setSourceKeyColumns] = useState<string[]>([])
  const [lookupId, setLookupId] = useState<string>('')
  const [lookupKeyColumns, setLookupKeyColumns] = useState<string[]>([])
  const [retrieveColumns, setRetrieveColumns] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const source = sourceId ? getDataset(sourceId) : null
  const lookup = lookupId ? getDataset(lookupId) : null
  const lookupCols = lookup?.columns ?? []
  const isSameTable = sourceId && sourceId === lookupId

  const toggleSourceKey = (col: string) => {
    setSourceKeyColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }
  const toggleLookupKey = (col: string) => {
    setLookupKeyColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }
  const toggleRetrieve = (col: string) => {
    setRetrieveColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const handleRun = () => {
    if (!source || !lookup || sourceKeyColumns.length === 0 || lookupKeyColumns.length === 0 || retrieveColumns.length === 0) return
    setRunning(true)
    try {
      const { columns, rows } = runLookup(
        source,
        sourceKeyColumns,
        lookup,
        lookupKeyColumns,
        retrieveColumns
      )
      setResult({ columns, rows })
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lookup (cross-sheet)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Source dataset</Label>
          <Select value={sourceId} onValueChange={(v) => { setSourceId(v); setSourceKeyColumns([]) }}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Source key columns (composite key)</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {source?.columns.map((col) => (
              <Button
                key={col}
                type="button"
                variant={sourceKeyColumns.includes(col) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSourceKey(col)}
              >
                {col}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label>Lookup dataset {isSameTable && '(same-table lookup)'}</Label>
          <Select value={lookupId} onValueChange={(v) => { setLookupId(v); setLookupKeyColumns([]); setRetrieveColumns([]) }}>
            <SelectTrigger>
              <SelectValue placeholder="Select lookup table" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}{d.id === sourceId ? ' (same table)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {lookup && (
          <>
            <div>
              <Label>Lookup key columns (same order as source key)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {lookupCols.map((col) => (
                  <Button
                    key={col}
                    type="button"
                    variant={lookupKeyColumns.includes(col) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleLookupKey(col)}
                  >
                    {col}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Columns to retrieve from lookup</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {lookupCols.map((col) => (
                  <Button
                    key={col}
                    type="button"
                    variant={retrieveColumns.includes(col) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleRetrieve(col)}
                  >
                    {col}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleRun}
              disabled={sourceKeyColumns.length === 0 || lookupKeyColumns.length === 0 || retrieveColumns.length === 0 || running}
            >
              {running ? 'Running...' : 'Run lookup'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
