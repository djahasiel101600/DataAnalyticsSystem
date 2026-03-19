import { useCallback, useRef, useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { parseFile, parseFileServer, shouldUseServerParse, ACCEPT_UPLOAD } from '@/shared/lib/parse-file'
import { pickFromGoogleDrive, downloadDriveFileAsBlob } from '@/shared/lib/google-drive'
import { validateUpload } from '@/shared/lib/validate-upload'
import type { DataRow } from '@/entities/dataset'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { cn } from '@/shared/lib'

type PendingUpload = {
  name: string
  columns: string[]
  rows: DataRow[]
  validation: ReturnType<typeof validateUpload>
}

export function UploadZone() {
  const { addDataset } = useDatasets()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingUpload[] | null>(null)
  const [requiredColumnsText, setRequiredColumnsText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: File[] | FileList | null) => {
      const list = files ? Array.from(files) : []
      if (list.length === 0) return
      setError(null)
      setLoading(true)
      setPending(null)
      try {
        const next: PendingUpload[] = []
        for (let i = 0; i < list.length; i++) {
          const file = list[i]
          const { columns, rows } = shouldUseServerParse(file)
            ? await parseFileServer(file)
            : await parseFile(file)
          const baseName = file.name.replace(/\.(csv|xlsx|xls)$/i, '')
          const name = list.length > 1 ? `${baseName} (${i + 1})` : baseName
          const required = requiredColumnsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          const validation = validateUpload(columns, rows, required)
          next.push({ name, columns, rows, validation })
        }
        setPending(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse files')
      } finally {
        setLoading(false)
      }
    },
    [requiredColumnsText]
  )

  const confirmAdd = useCallback(() => {
    if (!pending || pending.length === 0) return
    for (const p of pending) {
      addDataset(p.name, p.columns, p.rows)
    }
    setPending(null)
  }, [pending, addDataset])

  const discardPending = useCallback(() => {
    setPending(null)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      processFiles(e.dataTransfer.files)
    },
    [processFiles]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      e.target.value = ''
      if (files.length) processFiles(files)
    },
    [processFiles]
  )

  const onImportDrive = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const picked = await pickFromGoogleDrive()
      const { blob, filename } = await downloadDriveFileAsBlob({
        fileId: picked.fileId,
        accessToken: picked.accessToken,
        mimeType: picked.mimeType,
        name: picked.name,
      })
      const file = new File([blob], filename, { type: picked.mimeType || blob.type })
      await processFiles([file])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google Drive import failed')
    } finally {
      setLoading(false)
    }
  }, [processFiles])

  return (
    <Card className="border-dashed">
      <CardContent className="p-3 space-y-3">
        {pending == null ? (
          <>
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={cn(
                'border-2 border-dashed rounded-md p-4 text-center transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                loading && 'pointer-events-none opacity-70'
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_UPLOAD}
                multiple
                className="hidden"
                onChange={onSelect}
              />
              {loading ? (
                <p className="text-muted-foreground text-sm">Parsing...</p>
              ) : (
                <>
                  <p className="text-muted-foreground text-xs mb-2">CSV or Excel</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => inputRef.current?.click()}
                    >
                      Browse
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={onImportDrive}
                    >
                      Import from Drive
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Required columns (optional, comma-separated)</Label>
              <Input
                className="mt-0.5 h-8 text-sm"
                placeholder="e.g. employee_id, name, status"
                value={requiredColumnsText}
                onChange={(e) => setRequiredColumnsText(e.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Validation summary</p>
            {pending.map((p) => (
              <div key={p.name} className="rounded-md border border-border p-2 text-xs space-y-1">
                <p className="font-medium">{p.name}</p>
                <p>Rows: {p.validation.rowCount} · Columns: {p.validation.columnCount}</p>
                {p.validation.missingRequiredColumns.length > 0 && (
                  <p className="text-destructive">Missing required: {p.validation.missingRequiredColumns.join(', ')}</p>
                )}
                {p.validation.invalidRowIndices.length > 0 && (
                  <p className="text-amber-600 dark:text-amber-500">
                    Rows with missing required values: {p.validation.invalidRowIndices.length}
                  </p>
                )}
                {Object.keys(p.validation.nullCounts).length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-muted-foreground">Null/empty counts by column</summary>
                    <ul className="mt-1 list-inside text-muted-foreground">
                      {p.columns.slice(0, 15).map((col) => (
                        <li key={col}>{col}: {p.validation.nullCounts[col]}</li>
                      ))}
                      {p.columns.length > 15 && <li>… and {p.columns.length - 15} more</li>}
                    </ul>
                  </details>
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button type="button" size="sm" onClick={confirmAdd}>
                Add to datasets
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={discardPending}>
                Discard
              </Button>
            </div>
          </div>
        )}
        {error && <p className="text-destructive text-xs">{error}</p>}
      </CardContent>
    </Card>
  )
}
