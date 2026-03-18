import { useState, useEffect } from 'react'
import { useDatasets } from '@/app/store/DatasetsContext'
import { listRecipeNames, saveRecipe, loadRecipe, deleteRecipe } from '../lib/recipe-storage'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

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
    if (data) setResult(data)
  }

  const handleDelete = (name: string) => {
    deleteRecipe(name)
    refreshList()
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-sm font-medium">Saved results</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-3">
        <div>
          <Label>Save current result as</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Recipe name"
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!result || result.rows.length === 0 || !saveName.trim() || loading}
            >
              Save
            </Button>
          </div>
        </div>
        {names.length > 0 && (
          <div>
            <Label>Load saved</Label>
            <ul className="mt-1 space-y-1">
              {names.map((name) => (
                <li key={name} className="flex items-center justify-between gap-2 text-sm">
                  <button
                    type="button"
                    className="text-left hover:underline truncate"
                    onClick={() => handleLoad(name)}
                  >
                    {name}
                  </button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(name)}>
                    ×
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
