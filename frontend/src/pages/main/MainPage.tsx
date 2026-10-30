import { useEffect, useState } from "react";
import {
  Menu,
  X,
  Undo2,
  Eraser,
  Table2,
  Upload,
  MousePointerClick,
  SlidersHorizontal,
} from "lucide-react";
import { UploadZone } from "@/features/upload-datasets";
import { DatasetList } from "@/widgets/dataset-list";
import { OperationsPanel } from "@/widgets/operations-panel";
import { ExportButtons } from "@/features/export-data";
import { SavedRecipesCard } from "@/features/saved-recipes";
import { RecentSessionCard } from "@/features/recent-session";
import { DataTableView } from "@/widgets/data-table";
import { useDatasets } from "@/app/store/DatasetsContext";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CollapsibleSection } from "@/shared/ui/collapsible";

function Stat({ rows, cols }: { rows: number; cols: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="rounded-full bg-muted px-2 py-0.5 font-medium tabular-nums">
        {rows.toLocaleString()} rows
      </span>
      <span className="rounded-full bg-muted px-2 py-0.5 font-medium tabular-nums">
        {cols.toLocaleString()} columns
      </span>
    </span>
  );
}

function GuideStep({
  icon,
  n,
  title,
  text,
}: {
  icon: React.ReactNode;
  n: number;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-border bg-card p-4 text-left">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          <span className="text-muted-foreground mr-1">{n}.</span>
          {title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

export function MainPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer only
  const { getDataset, result, setResult, resultHighlight, undo, canUndo } =
    useDatasets();
  const dataset = selectedId ? getDataset(selectedId) : null;

  // Ctrl/Cmd+Z to undo (ignored while typing in a field)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        !(e.ctrlKey || e.metaKey) ||
        e.key.toLowerCase() !== "z" ||
        e.shiftKey
      )
        return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      )
        return;
      if (canUndo) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUndo, undo]);

  // Close the mobile drawer once a dataset is chosen
  const handleSelect = (id: string | null) => {
    setSelectedId(id);
    setSidebarOpen(false);
  };

  return (
    <div className="h-dvh flex flex-row bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Workspace sidebar"
        className={[
          "z-40 w-[300px] flex-shrink-0 flex flex-col border-r border-border bg-card overflow-hidden",
          "fixed inset-y-0 left-0 transition-transform duration-200 md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full",
        ].join(" ")}
      >
        <header className="flex-shrink-0 flex items-start justify-between px-4 pt-4 pb-3 border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary">
              Data Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload, process, export.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden -mr-2"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div
          data-sidebar
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 flex flex-col gap-2"
        >
          <CollapsibleSection title="Upload" defaultOpen={true}>
            <UploadZone />
          </CollapsibleSection>
          <CollapsibleSection title="Datasets" defaultOpen={true}>
            <DatasetList selectedId={selectedId} onSelect={handleSelect} />
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
        {/* Top bar: mobile menu + current context */}
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-border bg-card/60 px-4 py-2.5 md:px-6">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <nav
            aria-label="Current view"
            className="flex min-w-0 items-center gap-2 text-sm"
          >
            <span className="text-muted-foreground">Dataset</span>
            <span className="text-muted-foreground">/</span>
            <span className="truncate font-medium text-foreground">
              {dataset ? dataset.name : "None selected"}
            </span>
            {result && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Result
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="flex-1 min-h-0 flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
          {/* Operations: collapsible so the table can take the full height when needed */}
          <section
            className="flex-shrink-0 min-h-0 max-h-[42vh] overflow-y-auto overflow-x-hidden rounded-lg border border-border bg-card/50"
            aria-label="Operations"
          >
            <div className="p-3">
              <CollapsibleSection title="Operations" defaultOpen={true}>
                <OperationsPanel />
              </CollapsibleSection>
            </div>
          </section>

          <section
            className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden"
            aria-label="Data view"
            aria-live="polite"
          >
            {result ? (
              <Card className="overflow-hidden flex-1 min-h-0 flex flex-col border-primary/30 shadow-md">
                <CardHeader className="flex flex-col gap-3 py-3 flex-shrink-0 bg-primary/5 border-b border-border sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-lg text-foreground">
                      Result
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Stat
                        rows={result.rows.length}
                        cols={result.columns.length}
                      />
                      {dataset && (
                        <span className="text-xs text-muted-foreground truncate">
                          Selected dataset: {dataset.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {canUndo && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={undo}
                        title="Undo last operation (Ctrl/Cmd+Z)"
                      >
                        <Undo2 className="mr-1.5 h-4 w-4" />
                        Undo
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => setResult(null)}
                      title="Discard the result and go back to the dataset"
                    >
                      <Eraser className="mr-1.5 h-4 w-4" />
                      Clear result
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto flex-1 min-h-0 pt-0">
                  <DataTableView
                    columns={result.columns}
                    rows={result.rows}
                    highlight={resultHighlight}
                  />
                </CardContent>
              </Card>
            ) : dataset ? (
              <Card className="overflow-hidden flex-1 min-h-0 flex flex-col border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-4 py-3 flex-shrink-0 bg-muted/30 border-b border-border">
                  <div className="flex min-w-0 items-center gap-2">
                    <Table2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <CardTitle className="truncate text-lg text-foreground">
                      {dataset.name}
                    </CardTitle>
                  </div>
                  <Stat
                    rows={dataset.rows.length}
                    cols={dataset.columns.length}
                  />
                </CardHeader>
                <CardContent className="overflow-x-auto flex-1 min-h-0 pt-0">
                  <DataTableView
                    columns={dataset.columns}
                    rows={dataset.rows}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 min-h-0 flex flex-col">
                <CardContent className="flex-1 flex flex-col items-center justify-center gap-6 py-8 overflow-y-auto">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground">
                      Get started
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Three quick steps to analyze your data.
                    </p>
                  </div>
                  <ol className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
                    <GuideStep
                      n={1}
                      icon={<Upload className="h-4 w-4" />}
                      title="Upload"
                      text="Add CSV or Excel files from the sidebar."
                    />
                    <GuideStep
                      n={2}
                      icon={<MousePointerClick className="h-4 w-4" />}
                      title="Select"
                      text="Pick a dataset in the Datasets list to preview it."
                    />
                    <GuideStep
                      n={3}
                      icon={<SlidersHorizontal className="h-4 w-4" />}
                      title="Process"
                      text="Filter, merge, aggregate and more, then export."
                    />
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="mr-1.5 h-4 w-4" />
                    Open sidebar
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
