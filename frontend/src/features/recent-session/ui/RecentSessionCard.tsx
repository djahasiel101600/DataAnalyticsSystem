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
    let active = true
    hasSavedSession()
      .then((exists) => {
        if (active) setHasSession(exists)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not check for a saved session.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveSession({ datasets, result })
      setHasSession(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the session.')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async () => {
    setSaving(true)
    setError(null)
    try {
      const session = await loadSession()
      if (!session) {
        setHasSession(false)
        return
      }
      const result = session.result
        ? { columns: session.result.columns, rows: session.result.rows as DataRow[] }
        : null
      applySession(session.datasets, result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not restore the saved session.')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    setError(null)
    try {
      await clearSavedSession()
      setHasSession(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not clear the saved session.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save session'}
        </Button>
        {hasSession && (
          <>
            <Button size="sm" className="h-7 text-xs" onClick={handleRestore} disabled={saving}>
              {saving ? 'Working…' : 'Restore'}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleClear} disabled={saving}>
              Clear saved
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
