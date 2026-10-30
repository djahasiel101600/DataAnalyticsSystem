import { useEffect, useState, type ReactNode } from "react";
import {
  Database,
  Download,
  Eraser,
  Menu,
  ShieldCheck,
  Table2,
  Undo2,
  Upload,
  X,
  type LucideIcon,
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
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        Rows <span className="ml-1 tabular-nums text-foreground">{rows.toLocaleString()}</span>
      </span>
      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        Cols <span className="ml-1 tabular-nums text-foreground">{cols.toLocaleString()}</span>
      </span>
    </span>
  );
}

function RailSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-b border-border px-3 py-3 last:border-b-0">
      <h2 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function MainPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    datasets,
    getDataset,
    result,
    setResult,
    resultHighlight,
    undo,
    canUndo,
  } = useDatasets();
  const dataset = (selectedId ? getDataset(selectedId) : undefined) ?? datasets[0] ?? null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "z" ||
        event.shiftKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (canUndo) {
        event.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canUndo, undo]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="z-20 flex h-11 flex-none items-center gap-2.5 border-b border-border bg-card px-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open workspace sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Database className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[13px] font-semibold leading-tight text-foreground">
            Data Analytics
          </h1>
          <p className="hidden text-[10px] leading-tight text-muted-foreground sm:block">
            Upload · clean · match · export
          </p>
        </div>
        <div className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Your data stays in this browser
        </div>
      </header>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 top-11 z-30 bg-black/35 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close workspace sidebar"
        />
      )}

      <div className="flex min-h-0 flex-1">
        <aside
          aria-label="Workspace sidebar"
          className={[
            "fixed inset-y-11 left-0 z-40 flex w-[248px] flex-none -translate-x-full flex-col overflow-hidden border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0 shadow-xl" : "",
          ].join(" ")}
        >
          <div className="flex flex-none items-center justify-between border-b border-border px-3 py-2 lg:hidden">
            <span className="text-xs font-semibold">Workspace</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <RailSection title="Add data" icon={Upload}>
              <UploadZone />
            </RailSection>
            <RailSection title={`Datasets · ${datasets.length}`} icon={Database}>
              <DatasetList
                selectedId={dataset?.id ?? null}
                onSelect={handleSelect}
              />
            </RailSection>
            <RailSection title="Export" icon={Download}>
              <ExportButtons selectedDatasetId={dataset?.id} />
            </RailSection>
            <RailSection title="Saved results" icon={Table2}>
              <SavedRecipesCard />
            </RailSection>
            <div className="px-3 py-2">
              <CollapsibleSection title="Recent session" defaultOpen={false}>
                <RecentSessionCard />
              </CollapsibleSection>
            </div>
          </div>
          <div className="flex flex-none items-center gap-1.5 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" />
            Files stay in this browser.
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <section
            aria-label="Data workspace"
            aria-live="polite"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
            {result && (
              <div className="flex h-12 flex-none items-center justify-between gap-3 border-b border-border bg-card/60 px-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                    Result
                  </span>
                  <span className="truncate text-sm font-semibold">Processed data</span>
                  <Stat rows={result.rows.length} cols={result.columns.length} />
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  {canUndo && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={undo}
                      title="Undo last operation (Ctrl/Cmd+Z)"
                    >
                      <Undo2 className="mr-1 h-3.5 w-3.5" />
                      Undo
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setResult(null)}
                    title="Discard the result and go back to the dataset"
                  >
                    <Eraser className="mr-1 h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 p-2 sm:p-2">
              {result ? (
                <Card className="flex h-full min-h-0 flex-col overflow-hidden">
                  <CardContent className="flex min-h-0 flex-1 overflow-hidden p-0">
                    <DataTableView
                      columns={result.columns}
                      rows={result.rows}
                      workspaceKey="result"
                      highlight={resultHighlight}
                    />
                  </CardContent>
                </Card>
              ) : dataset ? (
                <Card className="flex h-full min-h-0 flex-col overflow-hidden">
                  <CardHeader className="flex flex-none flex-row items-center justify-between gap-3 border-b border-border px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Table2 className="h-4 w-4 flex-none text-muted-foreground" />
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                        Dataset
                      </span>
                      <CardTitle className="truncate text-sm">{dataset.name}</CardTitle>
                    </div>
                    <Stat rows={dataset.rows.length} cols={dataset.columns.length} />
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 overflow-hidden p-0">
                    <DataTableView
                      columns={dataset.columns}
                      rows={dataset.rows}
                      workspaceKey={`dataset:${dataset.id}`}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex h-full min-h-0 flex-col items-center justify-center">
                  <CardContent className="flex max-w-md flex-col items-center px-6 py-10 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Upload className="h-5 w-5" />
                    </span>
                    <h2 className="mt-4 text-base font-semibold">
                      Bring your data into the workspace
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Upload a CSV or Excel file to preview it, run an operation,
                      and export your results.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 lg:hidden"
                      onClick={() => setSidebarOpen(true)}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Open upload panel
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          <aside
            aria-label="Data operations"
            className="flex min-h-[38vh] max-h-[45vh] w-full flex-none flex-col overflow-hidden border-t border-border bg-card lg:min-h-0 lg:max-h-none lg:w-[320px] lg:border-l lg:border-t-0"
          >
            <OperationsPanel />
          </aside>
        </main>
      </div>
    </div>
  );
}
