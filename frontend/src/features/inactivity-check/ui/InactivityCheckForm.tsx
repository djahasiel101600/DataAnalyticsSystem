import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runInactivityCheck } from '../lib/run-inactivity-check'
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

export function InactivityCheckForm() {
  const { datasets, getDataset, setResult } = useDatasets()
  const [datasetId, setDatasetId] = useState<string>('')
  const [dateColumn, setDateColumn] = useState<string>('')
  const [thresholdDays, setThresholdDays] = useState(3)
  const [referenceDate, setReferenceDate] = useState('')
  const [running, setRunning] = useState(false)

  const dataset = datasetId ? getDataset(datasetId) : null
  const columns = dataset?.columns ?? []
  const dateColumns = columns.filter((c) => c) // all for now; could filter by name pattern

  const handleRun = () => {
    if (!dataset || !dateColumn) return
    setRunning(true)
    try {
      const ref = referenceDate.trim() || undefined
      const { columns: outCols, rows } = runInactivityCheck(dataset, {
        dateColumn,
        thresholdDays: Number(thresholdDays) || 3,
        referenceDate: ref,
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
        <CardTitle className="text-base">Inactivity check</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Dataset</Label>
          <Select
            value={datasetId}
            onValueChange={(v) => {
              setDatasetId(v)
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
        {dataset && (
          <>
            <div>
              <Label>Date / last activity column</Label>
              <Select value={dateColumn} onValueChange={setDateColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {dateColumns.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Inactive after (days)</Label>
              <Input
                type="number"
                min={0}
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                Rows with no activity for more than this many days are flagged as inactive.
              </p>
            </div>
            <div>
              <Label>Reference date (optional)</Label>
              <Input
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-0.5">
                Leave empty to use today.
              </p>
            </div>
            <Button
              onClick={handleRun}
              disabled={running || !dateColumn}
            >
              {running ? 'Running…' : 'Run inactivity check'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
