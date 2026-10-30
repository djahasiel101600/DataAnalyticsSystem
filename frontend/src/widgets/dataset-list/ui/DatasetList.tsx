import { useState } from 'react'
import { Database } from 'lucide-react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib'

interface DatasetListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function DatasetList({ selectedId, onSelect }: DatasetListProps) {
  const { datasets, removeDataset, renameDataset } = useDatasets()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const saveEdit = () => {
    if (editingId) {
      renameDataset(editingId, editName.trim() || 'Unnamed')
      setEditingId(null)
    }
  }

  if (datasets.length === 0) return <p className="text-xs text-muted-foreground px-1">No datasets yet. Upload files above.</p>

  return (
    <div className="space-y-0.5">
      {datasets.map((d) => (
        <div
          key={d.id}
          className={cn(
            'group flex items-center gap-1 rounded-lg border border-transparent',
            selectedId === d.id && 'border-primary/10 bg-accent text-accent-foreground'
          )}
        >
          {editingId === d.id ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="h-8 text-sm flex-1"
              autoFocus
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSelect(d.id)}
                onDoubleClick={() => startEdit(d.id, d.name)}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent/70',
                  selectedId === d.id && 'font-medium'
                )}
              >
                <Database className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                <span className="truncate">{d.name}</span>
              </button>
              <span className="px-1 text-[10px] tabular-nums text-muted-foreground">{d.rows.length}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => removeDataset(d.id)}
                aria-label={`Remove dataset ${d.name}`}
              >
                ×
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
