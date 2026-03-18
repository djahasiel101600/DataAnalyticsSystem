import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import {
  runDuplicateCheck,
  type DuplicateCheckMode,
  type DuplicateCheckKeep,
  type DuplicateCheckOptions,
  type DuplicateKeepStrategy,
  type DuplicateCompareAs,
} from '../lib/run-duplicate-check'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
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
  const [keepStrategy, setKeepStrategy] = useState<DuplicateKeepStrategy>('first')
  const [keepByColumn, setKeepByColumn] = useState<string>('')
  const [compareAs, setCompareAs] = useState<DuplicateCompareAs>('auto')
  const [priorityValues, setPriorityValues] = useState<string>('') // comma-separated
  const [addKeepPreviewColumns, setAddKeepPreviewColumns] = useState(true)
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
      const opts: DuplicateCheckOptions = {
        ignoreCase,
        trim,
        keepStrategy: mode === 'remove' ? keepStrategy : keepStrategy,
        keepByColumn,
        compareAs,
        priorityValues: priorityValues
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        addKeepPreviewColumns,
      }
      const effectiveKeep: DuplicateCheckKeep =
        keepStrategy === 'last' ? 'last' : 'first'
      const { columns: outCols, rows } = runDuplicateCheck(dataset, keyColumns, mode, effectiveKeep, opts)
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

            <div>
              <Label>Preserve row by</Label>
              <Select value={keepStrategy} onValueChange={(v) => setKeepStrategy(v as DuplicateKeepStrategy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First occurrence</SelectItem>
                  <SelectItem value="last">Last occurrence</SelectItem>
                  <SelectItem value="most_complete">Most complete (fewest blanks)</SelectItem>
                  <SelectItem value="max">Max of a column</SelectItem>
                  <SelectItem value="min">Min of a column</SelectItem>
                  <SelectItem value="priority">Priority list (preferred values)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                This controls which row is kept within each duplicate group.
              </p>
            </div>

            {(keepStrategy === 'max' || keepStrategy === 'min' || keepStrategy === 'priority') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label>Keep by column</Label>
                  <Select value={keepByColumn} onValueChange={setKeepByColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(keepStrategy === 'max' || keepStrategy === 'min') && (
                  <div>
                    <Label>Compare as</Label>
                    <Select value={compareAs} onValueChange={(v) => setCompareAs(v as DuplicateCompareAs)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {keepStrategy === 'priority' && (
              <div>
                <Label>Priority values (comma-separated, left = best)</Label>
                <Input
                  value={priorityValues}
                  onChange={(e) => setPriorityValues(e.target.value)}
                  placeholder="e.g. Active, Inactive, Offboarded"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If a value isn’t in the list, it is treated as lowest priority.
                </p>
              </div>
            )}

            {mode === 'mark' && (
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addKeepPreviewColumns}
                    onChange={(e) => setAddKeepPreviewColumns(e.target.checked)}
                  />
                  Add keep preview columns (_dup_group, _dup_rank, _dup_keep)
                </label>
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
              disabled={
                keyColumns.length === 0 ||
                running ||
                ((keepStrategy === 'max' || keepStrategy === 'min' || keepStrategy === 'priority') && !keepByColumn)
              }
            >
              {running ? 'Running...' : 'Run duplicate check'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
