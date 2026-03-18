import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import {
  filterRowsByConditions,
  sortRowsMulti,
  type FilterOperator,
  type FilterCondition,
  type FilterValueType,
  type SortDirection,
  type SortSpec,
  type FilterCombine,
} from '../lib/run-filter-sort'
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

const FILTER_OPS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less or equal' },
  { value: 'not_empty', label: 'Not empty' },
  { value: 'empty', label: 'Empty' },
]

const defaultCondition = (): FilterCondition => ({
  column: '',
  operator: 'contains',
  value: '',
})

export function FilterSortForm() {
  const { datasets, getDataset, result, setResult } = useDatasets()
  const [source, setSource] = useState<'dataset' | 'result'>('dataset')
  const [datasetId, setDatasetId] = useState<string>('')
  const [conditions, setConditions] = useState<FilterCondition[]>([defaultCondition()])
  const [filterCombine, setFilterCombine] = useState<FilterCombine>('and')
  const [sortSpecs, setSortSpecs] = useState<SortSpec[]>([])
  const [running, setRunning] = useState(false)

  const data = source === 'result' && result
    ? result
    : datasetId
      ? getDataset(datasetId)
      : null
  const columns = data?.columns ?? []
  const rows = data?.rows ?? []

  const addCondition = () => setConditions((prev) => [...prev, defaultCondition()])
  const removeCondition = (i: number) =>
    setConditions((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  const updateCondition = (i: number, patch: Partial<FilterCondition>) =>
    setConditions((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  const addSort = () => setSortSpecs((prev) => [...prev, { column: columns[0] ?? '', direction: 'asc' }])
  const removeSort = (i: number) => setSortSpecs((prev) => prev.filter((_, j) => j !== i))
  const updateSort = (i: number, patch: Partial<SortSpec>) =>
    setSortSpecs((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const handleRun = () => {
    if (!data || columns.length === 0) return
    setRunning(true)
    try {
      const validConditions = conditions.filter((c) => c.column)
      let out = validConditions.length > 0
        ? filterRowsByConditions(rows, validConditions, filterCombine)
        : rows
      const validSorts = sortSpecs.filter((s) => s.column)
      if (validSorts.length > 0) out = sortRowsMulti(out, validSorts)
      setResult({ columns, rows: out })
    } finally {
      setRunning(false)
    }
  }

  const hasResult = result && result.rows.length > 0
  if (datasets.length === 0 && !hasResult) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filter & sort</CardTitle>
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
              <Label>Filter conditions (combine with)</Label>
              <Select value={filterCombine} onValueChange={(v) => setFilterCombine(v as FilterCombine)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">AND</SelectItem>
                  <SelectItem value="or">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {conditions.map((cond, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2 rounded border p-2">
                <div className="flex-1 min-w-[80px]">
                  <Label className="text-xs">Column</Label>
                  <Select
                    value={cond.column}
                    onValueChange={(v) => updateCondition(i, { column: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Column" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[120px]">
                  <Label className="text-xs">Operator</Label>
                  <Select
                    value={cond.operator}
                    onValueChange={(v) => updateCondition(i, { operator: v as FilterOperator })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FILTER_OPS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {['equals', 'contains', 'gt', 'gte', 'lt', 'lte'].includes(cond.operator) && (
                  <>
                    <div className="w-[90px]">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={cond.valueType ?? 'text'}
                        onValueChange={(v) => updateCondition(i, { valueType: v as FilterValueType })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-[100px]">
                      <Label className="text-xs">Value</Label>
                      <Input
                        value={cond.value}
                        onChange={(e) => updateCondition(i, { value: e.target.value })}
                        placeholder={cond.valueType === 'date' ? 'e.g. 2024-01-15' : 'Value'}
                      />
                    </div>
                  </>
                )}
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(i)}>×</Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addCondition}>
              Add condition
            </Button>

            <div>
              <Label>Sort by (multi-column)</Label>
              {sortSpecs.map((spec, i) => (
                <div key={i} className="flex flex-wrap items-end gap-2 mt-1">
                  <Select
                    value={spec.column}
                    onValueChange={(v) => updateSort(i, { column: v })}
                  >
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Column" /></SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={spec.direction}
                    onValueChange={(v) => updateSort(i, { direction: v as SortDirection })}
                  >
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={!!spec.asDate}
                      onChange={(e) => updateSort(i, { asDate: e.target.checked })}
                    />
                    Date
                  </label>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeSort(i)}>×</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="mt-1" onClick={addSort}>
                Add sort column
              </Button>
            </div>

            <Button onClick={handleRun} disabled={running}>
              {running ? 'Running...' : 'Apply filter & sort'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
