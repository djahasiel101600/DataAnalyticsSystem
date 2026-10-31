import { useCallback, useEffect, useState } from 'react'
import type { DataRow } from '@/entities/dataset'
import { useDatasets } from '@/app/store/DatasetsContext'
import { useOperationConfigurations } from '@/app/store/OperationConfigContext'
import {
  clearSavedSessions,
  deleteSavedSession,
  listSavedSessions,
  loadSession,
  saveSession,
  type SavedSessionRecord,
} from '../lib/session-storage'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

function formatSavedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

export function RecentSessionCard() {
  const { datasets, result, loadSession: applySession } = useDatasets()
  const operationConfigs = useOperationConfigurations()
  const [sessionName, setSessionName] = useState('')
  const [savedSessions, setSavedSessions] = useState<SavedSessionRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshSessions = useCallback(async () => {
    const records = await listSavedSessions()
    setSavedSessions(records)
  }, [])

  useEffect(() => {
    let active = true
    listSavedSessions()
      .then((records) => {
        if (active) setSavedSessions(records)
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Could not load saved sessions.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const handleSave = async () => {
    if (!sessionName.trim()) {
      setError('Enter a name for this session.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await saveSession(sessionName, {
        datasets,
        result,
        operationConfigs: operationConfigs.getAll(),
      })
      setSessionName('')
      await refreshSessions()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the session.')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      const session = await loadSession(id)
      if (!session) {
        await refreshSessions()
        return
      }
      const restoredResult = session.result
        ? { columns: session.result.columns, rows: session.result.rows as DataRow[] }
        : null
      applySession(session.datasets, restoredResult)
      operationConfigs.replaceAll(session.operationConfigs)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not restore the saved session.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    setError(null)
    try {
      await deleteSavedSession(id)
      await refreshSessions()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the saved session.')
    } finally {
      setSaving(false)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Delete all saved sessions? This cannot be undone.')) return
    setSaving(true)
    setError(null)
    try {
      await clearSavedSessions()
      setSavedSessions([])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not clear saved sessions.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Input
          className="h-8 min-w-0 text-xs"
          value={sessionName}
          onChange={(event) => setSessionName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSave()
          }}
          placeholder="Name this session"
          aria-label="Session name"
          maxLength={100}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 text-xs"
          onClick={handleSave}
          disabled={saving || !sessionName.trim()}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
      {savedSessions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium text-muted-foreground">
              Saved sessions · {savedSessions.length}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px] text-muted-foreground"
              onClick={handleClearAll}
              disabled={saving}
            >
              Clear all
            </Button>
          </div>
          <ul className="space-y-1.5">
            {savedSessions.map((session) => (
              <li
                key={session.id}
                className="min-w-0 rounded-md border border-border p-2"
              >
                <p className="break-words text-xs font-medium" title={session.name}>
                  {session.name}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatSavedAt(session.savedAt)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {session.data.datasets.length} datasets
                  {Object.keys(session.data.operationConfigs).length > 0 &&
                    ` · ${Object.keys(session.data.operationConfigs).length} configured operations`}
                </p>
                <div className="mt-1 flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => handleRestore(session.id)}
                    disabled={saving}
                  >
                    Restore
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px] text-muted-foreground"
                    onClick={() => handleDelete(session.id)}
                    disabled={saving}
                    aria-label={`Delete ${session.name}`}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
