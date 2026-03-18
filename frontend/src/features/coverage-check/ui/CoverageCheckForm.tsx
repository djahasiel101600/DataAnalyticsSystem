import { useMemo, useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runCoverageCheck, type CoverageOutputMode } from '../lib/run-coverage-check'
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
import type { Dataset } from '@/entities/dataset'

type RefConfig = {
  datasetId: string
  keyColumns: string[]
}

export function CoverageCheckForm() {
  const { datasets, getDataset, setResult } = useDatasets()
  const [primaryId, setPrimaryId] = useState<string>('')
  const [primaryKeyColumns, setPrimaryKeyColumns] = useState<string[]>([])
  const [refs, setRefs] = useState<RefConfig[]>([])
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [trim, setTrim] = useState(false)
  const [outputMode, setOutputMode] = useState<CoverageOutputMode>('annotate')
  const [running, setRunning] = useState(false)

  const primary = primaryId ? getDataset(primaryId) : null
  const primaryColumns = primary?.columns ?? []

  const availableRefs = useMemo(
    () => datasets.filter((d) => d.id !== primaryId),
    [datasets, primaryId]
  )

  const togglePrimaryKey = (col: string) => {
    setPrimaryKeyColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const toggleRef = (id: string) => {
    setRefs((prev) => {
      const exists = prev.some((r) => r.datasetId === id)
      if (exists) return prev.filter((r) => r.datasetId !== id)
      // default ref key columns: intersection with primary selection if possible
      const refDs = getDataset(id)
      const suggested = refDs
        ? primaryKeyColumns.filter((c) => refDs.columns.includes(c))
        : []
      return [...prev, { datasetId: id, keyColumns: suggested }]
    })
  }

  const updateRefKeys = (id: string, col: string) => {
    setRefs((prev) =>
      prev.map((r) =>
        r.datasetId !== id
          ? r
          : {
            ...r,
            keyColumns: r.keyColumns.includes(col)
              ? r.keyColumns.filter((c) => c !== col)
              : [...r.keyColumns, col],
          }
      )
    )
  }

  const handleRun = () => {
    if (!primary || primaryKeyColumns.length === 0 || refs.length === 0) return
    const resolvedRefs: { dataset: Dataset; keyColumns: string[] }[] = []
    for (const r of refs) {
      const ds = getDataset(r.datasetId)
      if (!ds || r.keyColumns.length === 0) continue
      resolvedRefs.push({ dataset: ds, keyColumns: r.keyColumns })
    }
    if (resolvedRefs.length === 0) return

    setRunning(true)
    try {
      const { columns, rows } = runCoverageCheck(primary, primaryKeyColumns, resolvedRefs, {
        rule: 'all',
        outputMode,
        ignoreCase,
        trim,
        addKeyColumn: true,
      })
      setResult({ columns, rows })
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length < 2) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Coverage / Existence check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Primary dataset (A)</Label>
          <Select
            value={primaryId}
            onValueChange={(v) => {
              setPrimaryId(v)
              setPrimaryKeyColumns([])
              setRefs([])
            }}
          >
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

        {primary && (
          <>
            <div>
              <Label>Primary key columns (composite key)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {primaryColumns.map((col) => (
                  <Button
                    key={col}
                    type="button"
                    variant={primaryKeyColumns.includes(col) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePrimaryKey(col)}
                  >
                    {col}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Choose the columns that uniquely identify a record in A.
              </p>
            </div>

            <div>
              <Label>Reference datasets (B, C, …)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {availableRefs.map((d) => {
                  const selected = refs.some((r) => r.datasetId === d.id)
                  return (
                    <Button
                      key={d.id}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleRef(d.id)}
                    >
                      {d.name}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Rule is <b>ALL</b> by default: a row in A is “OK” only if it exists in every selected reference.
              </p>
            </div>

            {refs.length > 0 && (
              <div className="space-y-2">
                <Label>Reference key columns</Label>
                {refs.map((r) => {
                  const ds = getDataset(r.datasetId)
                  if (!ds) return null
                  return (
                    <div key={r.datasetId} className="rounded-md border border-border p-2">
                      <p className="text-sm font-medium">{ds.name}</p>
                      <p className="text-xs text-muted-foreground mb-1">
                        Choose key columns in this reference (same order/meaning as primary keys).
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ds.columns.map((c) => (
                          <Button
                            key={c}
                            type="button"
                            variant={r.keyColumns.includes(c) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateRefKeys(r.datasetId, c)}
                          >
                            {c}
                          </Button>
                        ))}
                      </div>
                      {r.keyColumns.length === 0 && (
                        <p className="text-xs text-destructive mt-1">
                          Select at least one key column for {ds.name}.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignoreCase}
                  onChange={(e) => setIgnoreCase(e.target.checked)}
                />
                Ignore case
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={trim}
                  onChange={(e) => setTrim(e.target.checked)}
                />
                Trim spaces
              </label>
            </div>

            <div>
              <Label>Output</Label>
              <Select value={outputMode} onValueChange={(v) => setOutputMode(v as CoverageOutputMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annotate">Annotate primary rows (default)</SelectItem>
                  <SelectItem value="only_missing">Only missing</SelectItem>
                  <SelectItem value="only_complete">Only complete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRun}
              disabled={
                running ||
                primaryKeyColumns.length === 0 ||
                refs.length === 0 ||
                refs.some((r) => r.keyColumns.length === 0)
              }
            >
              {running ? 'Running…' : 'Run coverage check'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

