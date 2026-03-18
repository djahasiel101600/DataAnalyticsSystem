import { useCallback, useRef, useState } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { parseFile, parseFileServer, shouldUseServerParse, ACCEPT_UPLOAD } from '@/shared/lib/parse-file'
import { pickFromGoogleDrive, downloadDriveFileAsBlob } from '@/shared/lib/google-drive'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { cn } from '@/shared/lib'

export function UploadZone() {
  const { addDataset } = useDatasets()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    async (files: File[] | FileList | null) => {
      const list = files ? Array.from(files) : []
      if (list.length === 0) return
      setError(null)
      setLoading(true)
      try {
        for (let i = 0; i < list.length; i++) {
          const file = list[i]
          const { columns, rows } = shouldUseServerParse(file)
            ? await parseFileServer(file)
            : await parseFile(file)
          const baseName = file.name.replace(/\.(csv|xlsx|xls)$/i, '')
          const name = list.length > 1 ? `${baseName} (${i + 1})` : baseName
          addDataset(name, columns, rows)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse files')
      } finally {
        setLoading(false)
      }
    },
    [addDataset]
  )

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
      <CardContent className="p-3">
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
        {error && <p className="text-destructive text-xs mt-1.5">{error}</p>}
      </CardContent>
    </Card>
  )
}
