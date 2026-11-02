import { useState, useEffect } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { listRecipeNames, saveRecipe, loadRecipe, deleteRecipe } from '../lib/recipe-storage'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

export function SavedRecipesCard() {
  const { result, setResult } = useDatasets()
  const [names, setNames] = useState<string[]>([])
  const [saveName, setSaveName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setNames(listRecipeNames())
  }, [])

  const refreshList = () => setNames(listRecipeNames())

  const handleSave = () => {
    if (!result || !saveName.trim()) return
    setLoading(true)
    try {
      saveRecipe(saveName.trim(), result.columns, result.rows)
      setSaveName('')
      refreshList()
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = (name: string) => {
    const data = loadRecipe(name)
    if (data) setResult(data, null, { name: `Saved result loaded: ${name}` })
  }

  const handleDelete = (name: string) => {
    deleteRecipe(name)
    refreshList()
  }

  return (
    <div className="space-y-2.5">
      <div>
        <Label className="text-[11px] text-muted-foreground">Save current result as</Label>
        <div className="mt-1 flex gap-1.5">
          <Input
            className="h-8 min-w-0 text-xs"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Name this result"
          />
          <Button
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={handleSave}
            disabled={!result || result.rows.length === 0 || !saveName.trim() || loading}
          >
            Save
          </Button>
        </div>
      </div>
      {names.length > 0 ? (
        <ul className="space-y-0.5">
          {names.map((name) => (
            <li key={name} className="flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                className="min-w-0 truncate text-left text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => handleLoad(name)}
              >
                {name}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-none"
                onClick={() => handleDelete(name)}
                aria-label={`Delete saved result ${name}`}
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Run an operation, then save the result here.
        </p>
      )}
    </div>
  )
}
