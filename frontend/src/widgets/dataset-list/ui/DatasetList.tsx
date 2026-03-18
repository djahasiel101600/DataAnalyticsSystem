import { useState } from 'react'
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
            'flex items-center gap-1 rounded-md group border border-transparent',
            selectedId === d.id && 'bg-accent border-l-2 border-l-primary text-accent-foreground'
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
                  'flex-1 text-left text-sm px-2 py-1.5 rounded truncate hover:bg-accent/70',
                  selectedId === d.id && 'font-medium'
                )}
              >
                {d.name}
              </button>
              <span className="text-xs text-muted-foreground">({d.rows.length})</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => removeDataset(d.id)}
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
