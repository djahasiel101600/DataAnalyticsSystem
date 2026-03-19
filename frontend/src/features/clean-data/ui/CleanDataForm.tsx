import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runCleanData, type StandardizeRule } from '../lib/run-clean-data'
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

function parseStandardizeMap(text: string): Record<string, string> {
  const map: Record<string, string> = {}
  const lines = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  for (const line of lines) {
    const idx = line.search(/\s*(=>|->|:)\s*/)
    if (idx >= 0) {
      const sep = line.match(/\s*(=>|->|:)\s*/)?.[0] ?? ''
      const [from, to] = line.split(sep).map((s) => s.trim())
      if (from !== undefined) map[from] = to ?? from
    } else {
      map[line] = line
    }
  }
  return map
}

export function CleanDataForm() {
  const { datasets, getDataset, setResult } = useDatasets()
  const [datasetId, setDatasetId] = useState<string>('')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [trim, setTrim] = useState(true)
  const [lowercase, setLowercase] = useState(false)
  const [uppercase, setUppercase] = useState(false)
  const [fillEmpty, setFillEmpty] = useState('')
  const [standardizeColumn, setStandardizeColumn] = useState<string>('')
  const [standardizeMapText, setStandardizeMapText] = useState('')
  const [running, setRunning] = useState(false)

  const dataset = datasetId ? getDataset(datasetId) : null
  const columns = dataset?.columns ?? []

  const toggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const handleRun = () => {
    if (!dataset) return
    setRunning(true)
    try {
      const cols = selectedColumns.length > 0 ? selectedColumns : undefined
      const map = standardizeColumn && standardizeMapText.trim()
        ? parseStandardizeMap(standardizeMapText.trim())
        : undefined
      const standardizeRules: StandardizeRule[] = []
      if (standardizeColumn && map && Object.keys(map).length > 0) {
        standardizeRules.push({
          column: standardizeColumn,
          map,
          exactOnly: false,
        })
      }
      const { columns: outCols, rows } = runCleanData(dataset, {
        columns: cols,
        trim,
        lowercase,
        uppercase,
        fillEmpty: fillEmpty.trim() || undefined,
        standardizeRules,
      })
      setResult({ columns: outCols, rows })
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Clean data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Dataset</Label>
          <Select value={datasetId} onValueChange={(v) => { setDatasetId(v); setSelectedColumns([]); setStandardizeColumn(''); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dataset && (
          <>
            <div>
              <Label>Columns to clean (leave empty = all)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {columns.map((col) => (
                  <Button
                    key={col}
                    type="button"
                    variant={selectedColumns.includes(col) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleColumn(col)}
                  >
                    {col}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} />
                Trim spaces
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={lowercase} onChange={(e) => setLowercase(e.target.checked)} />
                Lowercase
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} />
                Uppercase
              </label>
            </div>
            <div>
              <Label>Fill empty with (optional)</Label>
              <Input
                value={fillEmpty}
                onChange={(e) => setFillEmpty(e.target.value)}
                placeholder="e.g. N/A"
              />
            </div>
            <div>
              <Label>Standardize column (optional)</Label>
              <Select value={standardizeColumn || '__none__'} onValueChange={(v) => setStandardizeColumn(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {columns.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {standardizeColumn && (
              <div>
                <Label>Mappings (one per line: value =&gt; Normalized)</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder={"active => Active\ninactive => Inactive\nACTIVE => Active"}
                  value={standardizeMapText}
                  onChange={(e) => setStandardizeMapText(e.target.value)}
                />
              </div>
            )}
            <Button onClick={handleRun} disabled={running}>
              {running ? 'Running…' : 'Run clean'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
