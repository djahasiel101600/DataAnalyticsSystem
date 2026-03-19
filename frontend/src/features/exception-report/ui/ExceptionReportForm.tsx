import { useMemo, useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runExceptionReport } from '../lib/run-exception-report'
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

export function ExceptionReportForm() {
  const { datasets, getDataset, setResult } = useDatasets()
  const [primaryId, setPrimaryId] = useState<string>('')
  const [keyColumns, setKeyColumns] = useState<string[]>([])
  const [dateColumn, setDateColumn] = useState<string>('')
  const [thresholdDays, setThresholdDays] = useState(3)
  const [masterId, setMasterId] = useState<string>('')
  const [masterKeyColumns, setMasterKeyColumns] = useState<string[]>([])
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [trim, setTrim] = useState(false)
  const [running, setRunning] = useState(false)

  const primary = primaryId ? getDataset(primaryId) : null
  const master = masterId ? getDataset(masterId) : null
  const primaryColumns = primary?.columns ?? []
  const availableMasters = useMemo(
    () => datasets.filter((d) => d.id !== primaryId),
    [datasets, primaryId]
  )

  const toggleKey = (col: string) => {
    setKeyColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }
  const toggleMasterKey = (col: string) => {
    setMasterKeyColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const handleRun = () => {
    if (!primary || keyColumns.length === 0) return
    setRunning(true)
    try {
      const opts: Parameters<typeof runExceptionReport>[1] = {
        keyColumns,
        ignoreCase,
        trim,
      }
      if (dateColumn) {
        opts.dateColumn = dateColumn
        opts.thresholdDays = thresholdDays
      }
      if (master && masterKeyColumns.length > 0) {
        opts.masterDataset = master
        opts.masterKeyColumns = masterKeyColumns
      }
      const { columns, rows } = runExceptionReport(primary, opts)
      setResult({ columns, rows })
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exception report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Primary dataset</Label>
          <Select
            value={primaryId}
            onValueChange={(v) => {
              setPrimaryId(v)
              setKeyColumns([])
              setMasterId('')
              setMasterKeyColumns([])
              setDateColumn('')
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
              <Label>Key columns (for duplicate &amp; coverage)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {primaryColumns.map((col) => (
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
            <div>
              <Label>Date column (optional, for inactivity)</Label>
              <Select value={dateColumn || '__none__'} onValueChange={(v) => setDateColumn(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {primaryColumns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dateColumn && (
              <div>
                <Label>Inactive after (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={thresholdDays}
                  onChange={(e) => setThresholdDays(Number(e.target.value) || 0)}
                />
              </div>
            )}
            <div>
              <Label>Master dataset (optional, for &quot;Missing in master&quot;)</Label>
              <Select
                value={masterId || '__none__'}
                onValueChange={(v) => {
                  setMasterId(v === '__none__' ? '' : v)
                  setMasterKeyColumns([])
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {availableMasters.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {master && (
              <div>
                <Label>Master key columns</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {master.columns.map((col) => (
                    <Button
                      key={col}
                      type="button"
                      variant={masterKeyColumns.includes(col) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleMasterKey(col)}
                    >
                      {col}
                    </Button>
                  ))}
                </div>
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
            <Button
              onClick={handleRun}
              disabled={
                running ||
                keyColumns.length === 0 ||
                (Boolean(masterId) && masterKeyColumns.length === 0)
              }
            >
              {running ? 'Running…' : 'Run exception report'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
