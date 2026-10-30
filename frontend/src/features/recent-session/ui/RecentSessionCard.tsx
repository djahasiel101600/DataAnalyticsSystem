import { useState, useEffect } from 'react'
import type { DataRow } from '@/entities/dataset'
import { useDatasets } from '@/app/store/DatasetsContext'
import { hasSavedSession, saveSession, loadSession, clearSavedSession } from '../lib/session-storage'
import { Button } from '@/shared/ui/button'

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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save session'}
        </Button>
        {hasSession && (
          <>
            <Button size="sm" className="h-7 text-xs" onClick={handleRestore}>
              Restore
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleClear}>
              Clear saved
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
