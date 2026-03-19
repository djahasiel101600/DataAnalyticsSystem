import { useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { runRegexSearch } from '../lib/run-regex-search'
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

const REGEX_TEMPLATES: { id: string; label: string; value: string; note?: string }[] = [
  { id: 'custom', label: 'Custom', value: '' },
  { id: 'contains_text', label: 'Contains (substring)', value: 'your_text' },
  { id: 'starts_with', label: 'Starts with', value: '^prefix' },
  { id: 'ends_with', label: 'Ends with', value: 'suffix$' },
  {
    id: 'email',
    label: 'Email address',
    value: '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$',
    note: 'Replace/adjust if needed for your domain rules',
  },
  { id: 'digits', label: 'Only digits', value: '^\\d+$' },
  { id: 'digits_any', label: 'Digits anywhere', value: '\\d+' },
  {
    id: 'phone_us',
    label: 'US phone (simple)',
    value: '^\\+?1?\\s*\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4}$',
  },
  { id: 'date_ymd', label: 'Date YYYY-MM-DD', value: '^\\d{4}-\\d{2}-\\d{2}$' },
  { id: 'caps_words', label: 'Capital words', value: '\\b[A-Z]{2,}\\b' },
  { id: 'empty', label: 'Empty value', value: '^$' },
]

export function RegexSearchForm() {
  const { datasets, setResult } = useDatasets()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [columnsByDs, setColumnsByDs] = useState<Record<string, string[]>>({})
  const [regex, setRegex] = useState('')
  const [templateId, setTemplateId] = useState('custom')
  const [searchAll, setSearchAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const toggleDataset = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleColumn = (dsId: string, col: string) => {
    setColumnsByDs((prev) => {
      const arr = prev[dsId] ?? []
      const next = arr.includes(col) ? arr.filter((c) => c !== col) : [...arr, col]
      return { ...prev, [dsId]: next }
    })
  }

  const handleTest = () => {
    setError(null)
    try {
      new RegExp(regex)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid regex')
    }
  }

  const handleRun = () => {
    if (selectedIds.length === 0 || !regex.trim()) return
    setError(null)
    setRunning(true)
    try {
      const dsList = datasets.filter((d) => selectedIds.includes(d.id))
      const { columns, rows } = runRegexSearch(dsList, columnsByDs, regex, searchAll)
      setResult(
        { columns, rows },
        { pattern: regex, matchColumnHeader: '_matched_column' }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setRunning(false)
    }
  }

  if (datasets.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Regex search (cross-sheet)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Datasets to search</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {datasets.map((d) => (
              <Button
                key={d.id}
                type="button"
                variant={selectedIds.includes(d.id) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleDataset(d.id)}
              >
                {d.name}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={searchAll}
              onChange={(e) => setSearchAll(e.target.checked)}
            />
            Search all columns
          </Label>
        </div>
        {!searchAll && selectedIds.length > 0 && (
          <div>
            <Label>Columns per dataset (optional; leave empty for all)</Label>
            {datasets.filter((d) => selectedIds.includes(d.id)).map((d) => (
              <div key={d.id} className="mt-1">
                <span className="text-xs text-muted-foreground">{d.name}:</span>
                <div className="flex flex-wrap gap-1">
                  {d.columns.map((col) => (
                    <Button
                      key={col}
                      type="button"
                      variant={(columnsByDs[d.id] ?? []).includes(col) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleColumn(d.id, col)}
                    >
                      {col}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <Label>Regex templates</Label>
          <Select
            value={templateId}
            onValueChange={(v) => {
              setTemplateId(v)
              const tmpl = REGEX_TEMPLATES.find((t) => t.id === v)
              if (tmpl) {
                setError(null)
                setRegex(tmpl.value)
              }
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {REGEX_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templateId !== 'custom' && REGEX_TEMPLATES.find((t) => t.id === templateId)?.note && (
            <p className="text-xs text-muted-foreground mt-1">
              {REGEX_TEMPLATES.find((t) => t.id === templateId)?.note}
            </p>
          )}
        </div>

        <div>
          <Label>Regex pattern</Label>
          <Input
            value={regex}
            onChange={(e) => {
              setTemplateId('custom')
              setRegex(e.target.value)
            }}
            placeholder="e.g. ^[A-Z]+"
          />
          <Button type="button" variant="outline" size="sm" className="mt-1" onClick={handleTest}>
            Test regex
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleRun}
          disabled={selectedIds.length === 0 || !regex.trim() || running}
        >
          {running ? 'Searching...' : 'Search'}
        </Button>
      </CardContent>
    </Card>
  )
}
