import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runAggregate, runPivot, type AggregateFn } from '../lib/run-aggregate'
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

const AGG_FNS: { value: AggregateFn; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
]

type AggregateSpec = { column: string; fn: AggregateFn }

export function AggregateForm() {
  const { datasets, getDataset, result, setResult } = useDatasets()
  const [source, setSource] = useState<'dataset' | 'result'>('dataset')
  const [datasetId, setDatasetId] = useState('')
  const [mode, setMode] = useState<'group' | 'pivot'>('group')
  const [groupBy, setGroupBy] = useState<string[]>([])
  const [aggregates, setAggregates] = useState<AggregateSpec[]>([{ column: '', fn: 'sum' }])
  const [pivotRowDim, setPivotRowDim] = useState('')
  const [pivotColDim, setPivotColDim] = useState('')
  const [pivotValueCol, setPivotValueCol] = useState('')
  const [pivotFn, setPivotFn] = useState<AggregateFn>('sum')
  const [running, setRunning] = useState(false)

  const data = source === 'result' && result ? result : datasetId ? getDataset(datasetId) : null
  const columns = data?.columns ?? []
  const rows = data?.rows ?? []
  const hasResult = result && result.rows.length > 0

  const toggleGroup = (col: string) =>
    setGroupBy((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]))

  const addAggregate = () => setAggregates((prev) => [...prev, { column: columns[0] ?? '', fn: 'sum' }])
  const removeAggregate = (i: number) =>
    setAggregates((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  const updateAggregate = (i: number, patch: Partial<AggregateSpec>) =>
    setAggregates((prev) => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)))

  const handleRun = () => {
    if (!data || columns.length === 0) return
    setRunning(true)
    try {
      if (mode === 'pivot') {
        if (!pivotRowDim || !pivotColDim || !pivotValueCol) return
        const { columns: outCols, rows: outRows } = runPivot(
          rows,
          pivotRowDim,
          pivotColDim,
          pivotValueCol,
          pivotFn
        )
        setResult({ columns: outCols, rows: outRows })
      } else {
        const validAggs = aggregates.filter((a) => a.column)
        if (groupBy.length === 0 || validAggs.length === 0) return
        const { columns: outCols, rows: outRows } = runAggregate(
          columns,
          rows,
          groupBy,
          validAggs
        )
        setResult({ columns: outCols, rows: outRows })
      }
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length === 0 && !hasResult) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Group by & aggregate</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Source</Label>
          <Select value={source} onValueChange={(v) => setSource(v as 'dataset' | 'result')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {hasResult && <SelectItem value="result">Current result</SelectItem>}
              <SelectItem value="dataset">Dataset</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {source === 'dataset' && (
          <div>
            <Label>Dataset</Label>
            <Select value={datasetId} onValueChange={setDatasetId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {datasets.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {columns.length > 0 && (
          <>
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as 'group' | 'pivot')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group by + aggregate</SelectItem>
                  <SelectItem value="pivot">Pivot table</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === 'group' && (
              <>
                <div>
                  <Label>Group by columns</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {columns.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        variant={groupBy.includes(c) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleGroup(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Aggregates</Label>
                  {aggregates.map((agg, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 mt-1">
                      <Select
                        value={agg.column}
                        onValueChange={(v) => updateAggregate(i, { column: v })}
                      >
                        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Column" /></SelectTrigger>
                        <SelectContent>
                          {columns.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={agg.fn}
                        onValueChange={(v) => updateAggregate(i, { fn: v as AggregateFn })}
                      >
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {AGG_FNS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAggregate(i)}>×</Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="mt-1" onClick={addAggregate}>
                    Add aggregate
                  </Button>
                </div>
              </>
            )}
            {mode === 'pivot' && (
              <>
                <div>
                  <Label>Row dimension</Label>
                  <Select value={pivotRowDim} onValueChange={setPivotRowDim}>
                    <SelectTrigger><SelectValue placeholder="Column" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Column dimension</Label>
                  <Select value={pivotColDim} onValueChange={setPivotColDim}>
                    <SelectTrigger><SelectValue placeholder="Column" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value column</Label>
                  <Select value={pivotValueCol} onValueChange={setPivotValueCol}>
                    <SelectTrigger><SelectValue placeholder="Column" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Aggregate function</Label>
                  <Select value={pivotFn} onValueChange={(v) => setPivotFn(v as AggregateFn)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AGG_FNS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button
              onClick={handleRun}
              disabled={
                running ||
                (mode === 'group' && (groupBy.length === 0 || aggregates.every((a) => !a.column))) ||
                (mode === 'pivot' && (!pivotRowDim || !pivotColDim || !pivotValueCol))
              }
            >
              {running ? 'Running...' : mode === 'pivot' ? 'Run pivot' : 'Run aggregate'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
