import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runMergeJoin, type JoinType } from '../lib/run-merge-join'
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
import { useOperationConfigState } from '@/app/store/OperationConfigContext'

const JOIN_TYPES: { value: JoinType; label: string }[] = [
  { value: 'inner', label: 'Inner' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'full', label: 'Full' },
]

export function MergeJoinForm() {
  const { datasets, getDataset, setResult } = useDatasets()
  const [leftId, setLeftId] = useOperationConfigState('merge', 'leftId', '')
  const [rightId, setRightId] = useOperationConfigState('merge', 'rightId', '')
  const [leftKeyColumns, setLeftKeyColumns] = useOperationConfigState<string[]>('merge', 'leftKeyColumns', [])
  const [rightKeyColumns, setRightKeyColumns] = useOperationConfigState<string[]>('merge', 'rightKeyColumns', [])
  const [joinType, setJoinType] = useOperationConfigState<JoinType>('merge', 'joinType', 'left')
  const [running, setRunning] = useState(false)
  const [diag, setDiag] = useState<string | null>(null)

  const left = leftId ? getDataset(leftId) : null
  const right = rightId ? getDataset(rightId) : null

  const toggleLeftKey = (col: string) =>
    setLeftKeyColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]))
  const toggleRightKey = (col: string) =>
    setRightKeyColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]))

  const handleRun = () => {
    if (!left || !right || leftKeyColumns.length === 0 || rightKeyColumns.length === 0) return
    setRunning(true)
    setDiag(null)
    try {
      const { columns, rows, diagnostics } = runMergeJoin(
        left,
        right,
        leftKeyColumns,
        rightKeyColumns,
        joinType,
        { strict: true }
      )
      setResult(
        { columns, rows },
        null,
        { name: 'Merge / join', configKey: 'merge' },
      )
      if (diagnostics.length > 0) setDiag(diagnostics.join(' ; '))
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length < 2) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Merge / Join</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Join type</Label>
          <Select value={joinType} onValueChange={(v) => setJoinType(v as JoinType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOIN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Left dataset</Label>
          <Select value={leftId} onValueChange={(v) => { setLeftId(v); setLeftKeyColumns([]) }}>
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
        {left && (
          <div>
            <Label>Left key columns (composite key)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {left.columns.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={leftKeyColumns.includes(c) ? 'default' : 'outline'}
                  size="sm"
                  className="max-w-full min-w-0 truncate"
                  title={c}
                  onClick={() => toggleLeftKey(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div>
          <Label>Right dataset</Label>
          <Select value={rightId} onValueChange={(v) => { setRightId(v); setRightKeyColumns([]) }}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {datasets.filter((d) => d.id !== leftId).map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {right && (
          <div>
            <Label>Right key columns (same order as left)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {right.columns.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={rightKeyColumns.includes(c) ? 'default' : 'outline'}
                  size="sm"
                  className="max-w-full min-w-0 truncate"
                  title={c}
                  onClick={() => toggleRightKey(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>
        )}
        {diag && (
          <p className="text-xs text-amber-700 dark:text-amber-300">{diag}</p>
        )}
        <Button
          onClick={handleRun}
          disabled={!left || !right || leftKeyColumns.length === 0 || rightKeyColumns.length === 0 || running}
        >
          {running ? 'Running...' : 'Run join'}
        </Button>
      </CardContent>
    </Card>
  )
}
