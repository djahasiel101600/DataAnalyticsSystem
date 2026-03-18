import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runDuplicateCheck, type DuplicateCheckMode, type DuplicateCheckKeep, type DuplicateCheckOptions } from '../lib/run-duplicate-check'
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

export function DuplicateCheckForm() {
  const { datasets, getDataset, setResult } = useDatasets()
  const [datasetId, setDatasetId] = useState<string>('')
  const [keyColumns, setKeyColumns] = useState<string[]>([])
  const [mode, setMode] = useState<DuplicateCheckMode>('mark')
  const [keep, setKeep] = useState<DuplicateCheckKeep>('first')
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [trim, setTrim] = useState(false)
  const [running, setRunning] = useState(false)

  const dataset = datasetId ? getDataset(datasetId) : null
  const columns = dataset?.columns ?? []

  const toggleColumn = (col: string) => {
    setKeyColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const handleRun = () => {
    if (!dataset || keyColumns.length === 0) return
    setRunning(true)
    try {
      const opts: DuplicateCheckOptions = { ignoreCase, trim }
      const { columns: outCols, rows } = runDuplicateCheck(dataset, keyColumns, mode, keep, opts)
      setResult({ columns: outCols, rows })
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Duplicate check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Dataset</Label>
          <Select value={datasetId} onValueChange={setDatasetId}>
            <SelectTrigger>
              <SelectValue placeholder="Select dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dataset && (
          <>
            <div>
              <Label>Output</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as DuplicateCheckMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark">Mark duplicates (add columns)</SelectItem>
                  <SelectItem value="remove">Remove duplicates</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === 'remove' && (
              <div>
                <Label>When removing duplicates, keep</Label>
                <Select value={keep} onValueChange={(v) => setKeep(v as DuplicateCheckKeep)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First occurrence</SelectItem>
                    <SelectItem value="last">Last occurrence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <div>
              <Label>Key columns (select all that form the duplicate key)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {columns.map((col) => (
                  <Button
                    key={col}
                    type="button"
                    variant={keyColumns.includes(col) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleRun}
              disabled={keyColumns.length === 0 || running}
            >
              {running ? 'Running...' : 'Run duplicate check'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
