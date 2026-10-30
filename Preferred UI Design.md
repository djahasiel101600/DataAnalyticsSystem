`
import { useEffect, useState } from "react";
import {
CloudOff,
Database,
HardDriveDownload,
Layers,
Menu,
PanelRight,
RotateCcw,
ShieldCheck,
Sparkles,
Trash2,
Undo2,
Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { WorkbenchProvider, useWorkbench } from "@/store/workbench";
import { UploadZone } from "@/components/workbench/upload-zone";
import { DatasetList } from "@/components/workbench/dataset-list";
import { DataTable } from "@/components/workbench/data-table";
import { OperationsPanel } from "@/components/workbench/operations-panel";
import { ExportCard, ExportMenu } from "@/components/workbench/export-card";
import { SavedResults } from "@/components/workbench/saved-results";
import { SAMPLE_DATASETS, sampleTable } from "@/lib/data/samples";

function RailSection({
title,
children,
icon: Icon,
}: {
title: string;
children: React.ReactNode;
icon?: React.ComponentType<{ className?: string }>;
}) {
return (
<section className="space-y-2 border-b border-border px-3 py-3 last:border-b-0">
<h2 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
{Icon && <Icon className="h-3 w-3" />}
{title}
</h2>
{children}
</section>
);
}

function DataRail() {
const { datasets, sessionSaved, clearAll } = useWorkbench();

return (
<div className="scroll-slim h-full overflow-y-auto">
<RailSection title="Add data" icon={Upload}>
<UploadZone />
</RailSection>

      <RailSection title={`Datasets · ${datasets.length}`} icon={Database}>
        <DatasetList />
      </RailSection>

      <RailSection title="Export" icon={HardDriveDownload}>
        <ExportCard />
      </RailSection>

      <RailSection title="Saved results" icon={Layers}>
        <SavedResults />
      </RailSection>

      <div className="space-y-1 px-3 py-3">
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-success" />
          Files stay in this browser.
        </p>
        <p
          className={cn(
            "flex items-center gap-1.5 text-[10px]",
            sessionSaved ? "text-muted-foreground" : "text-warning",
          )}
        >
          {sessionSaved ? (
            <>
              <RotateCcw className="h-3 w-3" />
              Session saved — refresh keeps your work.
            </>
          ) : (
            <>
              <CloudOff className="h-3 w-3" />
              Too large to keep after a refresh. Export to be safe.
            </>
          )}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 h-7 w-full justify-start px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
          onClick={clearAll}
        >
          <Trash2 className="mr-1.5 h-3 w-3" />
          Clear everything
        </Button>
      </div>
    </div>

);
}

function StatusPill({
label,
value,
tone = "muted",
}: {
label: string;
value: string;
tone?: "muted" | "primary";
}) {
return (
<span
className={cn(
"inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
tone === "primary"
? "border-primary/30 bg-primary/10 text-primary"
: "border-border bg-muted/50 text-muted-foreground",
)} >
<span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
<span className="numeric text-foreground">{value}</span>
</span>
);
}

function EmptyState() {
const { addDataset, selectDataset } = useWorkbench();

const loadSamples = () => {
let firstId: string | null = null;
for (const sample of SAMPLE_DATASETS) {
const dataset = addDataset(sample.name, sampleTable(sample), "sample");
if (!firstId) firstId = dataset.id;
}
if (firstId) selectDataset(firstId);
};

const steps = [
{
icon: Upload,
title: "Add a file",
text: "Drop a CSV or Excel export, or load the sample data.",
},
{
icon: Menu,
title: "Pick an operation",
text: "Duplicates, lookup, filters, joins, pivots and more.",
},
{
icon: HardDriveDownload,
title: "Export the result",
text: "Download as CSV, Excel or JSON when it looks right.",
},
];

return (
<div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6">
<div className="grid-backdrop pointer-events-none absolute inset-0 opacity-70" aria-hidden />
<div className="relative w-full max-w-2xl text-center">
<div className="brand-mark mx-auto flex h-11 w-11 items-center justify-center rounded-xl">
<Database className="h-5 w-5 text-primary-foreground" />
</div>
<h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
Turn a spreadsheet into an answer
</h1>
<p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
Upload a CSV or Excel file, then clean, match and summarise it without writing a formula.
</p>

        <div className="mt-6 grid gap-2 text-left sm:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="panel p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[10px] font-semibold text-accent-foreground">
                    {index + 1}
                  </span>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <p className="mt-2 text-xs font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{step.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" onClick={loadSamples} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Load sample data
          </Button>
          <span className="text-[11px] text-muted-foreground">
            4 datasets · HR, activity, orders, products
          </span>
        </div>
      </div>
    </div>

);
}

function Workbench() {
const {
datasets,
result,
resultLabel,
activeDataset,
canUndo,
undo,
clearResult,
clearAll,
sessionSaved,
} = useWorkbench();

const [dataOpen, setDataOpen] = useState(false);
const [opsOpen, setOpsOpen] = useState(false);

useEffect(() => {
const onKeyDown = (event: KeyboardEvent) => {
if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z" || event.shiftKey) return;
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

const view = result
? { columns: result.columns, rows: result.rows, label: resultLabel ?? "Result", isResult: true }
: activeDataset
? {
columns: activeDataset.columns,
rows: activeDataset.rows,
label: activeDataset.name,
isResult: false,
}
: null;

return (
<div className="flex h-dvh flex-col overflow-hidden bg-background">
<header className="flex flex-none items-center gap-2 border-b border-border bg-card/80 px-3 py-2 backdrop-blur md:px-4">
<div className="brand-mark flex h-8 w-8 flex-none items-center justify-center rounded-lg">
<Database className="h-4 w-4 text-primary-foreground" />
</div>
<div className="min-w-0">
<p className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground">
Data Analytics
</p>
<p className="hidden truncate text-[10px] leading-tight text-muted-foreground sm:block">
Upload · clean · match · export
</p>
</div>

        <div className="ml-auto flex items-center gap-1.5">
          {!sessionSaved && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-1.5 py-1 text-[10px] font-medium text-warning sm:flex">
                  <CloudOff className="h-3 w-3" />
                  Not saved
                </span>
              </TooltipTrigger>
              <TooltipContent>The session is too large to keep after a refresh.</TooltipContent>
            </Tooltip>
          )}

          {canUndo && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={undo}
              title="Undo (Ctrl/Cmd+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </Button>
          )}

          {result && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              onClick={clearResult}
              title="Discard the result"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear result</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs lg:hidden"
            onClick={() => setDataOpen(true)}
          >
            <Layers className="h-3.5 w-3.5" />
            Data
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs xl:hidden"
            onClick={() => setOpsOpen(true)}
          >
            <PanelRight className="h-3.5 w-3.5" />
            Operations
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[272px] flex-none border-r border-border bg-card lg:block">
          <DataRail />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          {view ? (
            <div className="panel m-2 flex min-h-0 flex-1 flex-col overflow-hidden md:m-3">
              <div className="flex flex-none flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-5 items-center rounded px-1.5 text-[10px] font-semibold uppercase tracking-wide",
                      view.isResult ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {view.isResult ? "Result" : "Dataset"}
                  </span>
                  <h1 className="truncate text-sm font-semibold text-foreground" title={view.label}>
                    {view.label}
                  </h1>
                </div>
                <div className="flex items-center gap-1">
                  <StatusPill label="Rows" value={view.rows.length.toLocaleString()} tone={view.isResult ? "primary" : "muted"} />
                  <StatusPill label="Cols" value={String(view.columns.length)} />
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <ExportMenu />
                </div>
              </div>
              <DataTable columns={view.columns} rows={view.rows} caption={`${datasets.length} dataset(s) loaded`} />
            </div>
          ) : (
            <EmptyState />
          )}
        </main>

        <aside className="hidden w-[352px] flex-none border-l border-border bg-card xl:block">
          <OperationsPanel />
        </aside>
      </div>

      <Sheet open={dataOpen} onOpenChange={setDataOpen}>
        <SheetContent side="left" className="w-[310px] p-0 sm:w-[340px]">
          <SheetHeader className="border-b border-border px-3 py-2.5">
            <SheetTitle className="text-sm">Your data</SheetTitle>
          </SheetHeader>
          <div className="scroll-slim h-[calc(100dvh-49px)] overflow-y-auto">
            <DataRail />
            <div className="px-3 pb-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={clearAll}
              >
                <Trash2 className="mr-1.5 h-3 w-3" />
                Clear everything from this browser
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={opsOpen} onOpenChange={setOpsOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[400px]">
          <SheetHeader className="border-b border-border px-3 py-2.5">
            <SheetTitle className="text-sm">Operations</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <OperationsPanel />
          </div>
        </SheetContent>
      </Sheet>
    </div>

);
}

const Index = () => (
<WorkbenchProvider>
<Workbench />
</WorkbenchProvider>
);

export default Index;

`
