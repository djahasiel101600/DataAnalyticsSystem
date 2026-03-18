import { useState } from 'react'
import { UploadZone } from '@/features/upload-datasets'
import { DatasetList } from '@/widgets/dataset-list'
import { OperationsPanel } from '@/widgets/operations-panel'
import { ExportButtons } from '@/features/export-data'
import { SavedRecipesCard } from '@/features/saved-recipes'
import { RecentSessionCard } from '@/features/recent-session'
import { DataTableView } from '@/widgets/data-table'
import { useDatasets } from '@/app/store/DatasetsContext'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { CollapsibleSection } from '@/shared/ui/collapsible'

export function MainPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { getDataset, result, setResult, resultHighlight, undo, canUndo } = useDatasets()
  const dataset = selectedId ? getDataset(selectedId) : null

  return (
    <div className="h-dvh min-h-screen flex flex-row bg-background">
      <aside className="w-[300px] flex-shrink-0 flex flex-col border-r border-border bg-card overflow-hidden">
        <header className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <h1 className="text-lg font-bold tracking-tight text-primary">Data Analytics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Upload, process, export.</p>
        </header>
        <div data-sidebar className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-2">
          <CollapsibleSection title="Upload" defaultOpen={true}>
            <UploadZone />
          </CollapsibleSection>
          <CollapsibleSection title="Datasets" defaultOpen={true}>
            <DatasetList selectedId={selectedId} onSelect={setSelectedId} />
          </CollapsibleSection>
          <CollapsibleSection title="Export" defaultOpen={false}>
            <ExportButtons selectedDatasetId={selectedId} />
          </CollapsibleSection>
          <CollapsibleSection title="Saved results" defaultOpen={false}>
            <SavedRecipesCard />
          </CollapsibleSection>
          <CollapsibleSection title="Recent session" defaultOpen={false}>
            <RecentSessionCard />
          </CollapsibleSection>
        </div>
      </aside>
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
          <section className="flex-shrink-0 min-h-0 max-h-[42vh] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-card/50" aria-label="Operations">
            <div className="p-3">
              <OperationsPanel />
            </div>
          </section>
          <section className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden" aria-label="Data view">
            {result ? (
              <Card className="overflow-hidden flex-1 min-h-0 flex flex-col border-primary/20 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between gap-4 py-3 flex-shrink-0 bg-muted/30 border-b border-border">
                  <CardTitle className="text-lg text-foreground">Result</CardTitle>
                  <div className="flex gap-2 flex-shrink-0">
                    {canUndo && (
                      <Button variant="secondary" size="sm" onClick={undo}>
                        Undo
                      </Button>
                    )}
<Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => setResult(null)}>
                    Clear result
                  </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto flex-1 min-h-0 pt-0">
                  <DataTableView columns={result.columns} rows={result.rows} highlight={resultHighlight} />
                </CardContent>
              </Card>
            ) : dataset ? (
              <Card className="overflow-hidden flex-1 min-h-0 flex flex-col border-border shadow-sm">
                <CardHeader className="py-3 flex-shrink-0 bg-muted/30 border-b border-border">
                  <CardTitle className="text-lg text-foreground">{dataset.name}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto flex-1 min-h-0 pt-0">
                  <DataTableView columns={dataset.columns} rows={dataset.rows} />
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 min-h-0 flex flex-col">
                <CardContent className="py-8 flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground text-center max-w-md">
                    Upload CSV or Excel files from the sidebar, select a dataset, then use the operations above to filter, merge, aggregate, and more.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
