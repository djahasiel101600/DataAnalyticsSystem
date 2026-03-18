import { useState, useEffect } from 'react'
import type { DataRow } from '@/entities/dataset'
import { useDatasets } from '@/app/store/DatasetsContext'
import { hasSavedSession, saveSession, loadSession, clearSavedSession } from '../lib/session-storage'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

export function RecentSessionCard() {
  const { datasets, result, loadSession: applySession } = useDatasets()
  const [hasSession, setHasSession] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setHasSession(hasSavedSession())
  }, [])

  const handleSave = () => {
    setSaving(true)
    setError(null)
    const ok = saveSession({ datasets, result })
    setSaving(false)
    if (ok) setHasSession(true)
    else setError('Session too large to save (max 2MB)')
  }

  const handleRestore = () => {
    const session = loadSession()
    if (session) {
      const result = session.result
        ? { columns: session.result.columns, rows: session.result.rows as DataRow[] }
        : null
      applySession(session.datasets, result)
      setError(null)
    }
  }

  const handleClear = () => {
    clearSavedSession()
    setHasSession(false)
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-sm font-medium">Recent session</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save session'}
          </Button>
          {hasSession && (
            <>
              <Button size="sm" onClick={handleRestore}>
                Restore session
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClear}>
                Clear saved
              </Button>
            </>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
