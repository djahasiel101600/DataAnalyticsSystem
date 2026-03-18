import type { DataRow } from '@/entities/dataset'

const RECIPES_KEY = 'data-analytics-recipes'

export interface SavedRecipe {
  name: string
  columns: string[]
  rows: DataRow[]
}

function loadAll(): Record<string, { columns: string[]; rows: DataRow[] }> {
  try {
    const raw = localStorage.getItem(RECIPES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAll(recipes: Record<string, { columns: string[]; rows: DataRow[] }>) {
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes))
  } catch {
    // quota or disabled
  }
}

export function listRecipeNames(): string[] {
  return Object.keys(loadAll()).sort()
}

export function saveRecipe(name: string, columns: string[], rows: DataRow[]) {
  const all = loadAll()
  all[name] = { columns, rows }
  saveAll(all)
}

export function loadRecipe(name: string): { columns: string[]; rows: DataRow[] } | null {
  return loadAll()[name] ?? null
}

export function deleteRecipe(name: string) {
  const all = loadAll()
  delete all[name]
  saveAll(all)
}
