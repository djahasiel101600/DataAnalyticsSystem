import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { askAI } from '../lib/ask-ai'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export function AskAIForm() {
  const { result, datasets, getDataset } = useDatasets()
  const [datasetChoice, setDatasetChoice] = useState<string>('')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dataset = datasetChoice ? getDataset(datasetChoice) : datasets[0] ?? null
  const data = result ?? (dataset ? { columns: dataset.columns, rows: dataset.rows } : null)
  const columns = data?.columns ?? []
  const rows = data?.rows ?? []

  const handleSubmit = async () => {
    const q = message.trim()
    if (!q) return
    setError(null)
    setReply(null)
    setLoading(true)
    try {
      const { reply: r } = await askAI({
        message: q,
        columns,
        sampleRows: rows,
      })
      setReply(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ask AI</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ask questions about your data: summarize, get suggestions for filters or merge keys, or explain next steps.
        </p>
        <div>
          <Label>Question</Label>
          <textarea
            className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Summarize this data. Which columns should I use for merge?"
            disabled={loading}
          />
        </div>
        {data && (
          <p className="text-xs text-muted-foreground">
            Using context: {columns.length} columns, {rows.length} rows (first 5 sent as sample).
          </p>
        )}
        {!result && datasets.length > 0 && (
          <div>
            <Label className="text-xs">Use dataset for context</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={datasetChoice || datasets[0]?.id || ''}
              onChange={(e) => setDatasetChoice(e.target.value)}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
        {!data && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Upload a dataset or run an operation to include data context in your question.
          </p>
        )}
        <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
          {loading ? 'Thinking…' : 'Ask'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {reply && (
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
            {reply}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
