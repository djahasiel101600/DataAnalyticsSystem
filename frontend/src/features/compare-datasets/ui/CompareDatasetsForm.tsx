import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runCompareDatasets } from '../lib/run-compare-datasets'
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

export function CompareDatasetsForm() {
  const { datasets, getDataset, setResult } = useDatasets()
  const [oldId, setOldId] = useState<string>('')
  const [newId, setNewId] = useState<string>('')
  const [keyColumns, setKeyColumns] = useState<string[]>([])
  const [detectUpdates, setDetectUpdates] = useState(true)
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [trim, setTrim] = useState(false)
  const [running, setRunning] = useState(false)

  const oldDs = oldId ? getDataset(oldId) : null
  const newDs = newId ? getDataset(newId) : null
  const columns = newDs?.columns ?? oldDs?.columns ?? []
  const toggleKey = (col: string) => {
    setKeyColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const handleRun = () => {
    if (!oldDs || !newDs || keyColumns.length === 0) return
    setRunning(true)
    try {
      const { summary, columns: outCols, rows } = runCompareDatasets(oldDs, newDs, {
        keyColumns,
        detectUpdates,
        ignoreCase,
        trim,
      })
      setResult({ columns: outCols, rows })
      console.log('Compare summary:', summary)
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length < 2) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compare datasets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Old / previous dataset (A)</Label>
          <Select value={oldId} onValueChange={(v) => { setOldId(v); setKeyColumns([]); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>New / current dataset (B)</Label>
          <Select value={newId} onValueChange={(v) => { setNewId(v); setKeyColumns([]); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {oldDs && newDs && (
          <>
            <div>
              <Label>Key columns</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {columns.filter((c) => oldDs.columns.includes(c) && newDs.columns.includes(c)).map((col) => (
                  <Button
                    key={col}
                    type="button"
                    variant={keyColumns.includes(col) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleKey(col)}
                  >
                    {col}
                  </Button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={detectUpdates}
                onChange={(e) => setDetectUpdates(e.target.checked)}
              />
              Detect updated rows (compare non-key columns)
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} />
                Ignore case
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} />
                Trim spaces
              </label>
            </div>
            <Button
              onClick={handleRun}
              disabled={running || keyColumns.length === 0}
            >
              {running ? 'Running…' : 'Compare'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
