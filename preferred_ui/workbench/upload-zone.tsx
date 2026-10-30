import { useCallback, useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ACCEPT_UPLOAD,
  LARGE_FILE_BYTES,
  ParseError,
  parseFile,
} from "@/lib/data/parse";
import { SAMPLE_DATASETS, sampleTable } from "@/lib/data/samples";
import { profileTable } from "@/lib/data/validate";
import type { TableData } from "@/lib/data/types";
import { useWorkbench } from "@/store/workbench";
import { cn } from "@/lib/utils";

interface Pending {
  name: string;
  data: TableData;
}

export function UploadZone() {
  const { addDataset, datasets, selectDataset } = useWorkbench();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);

  const readFiles = useCallback(async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    setError(null);
    setLoading(true);
    const next: Pending[] = [];
    const failures: string[] = [];

    for (const file of list) {
      try {
        const parsed = await parseFile(file);
        if (parsed.columns.length === 0) {
          failures.push(`${file.name} has no readable columns.`);
          continue;
        }
        next.push({
          name:
            file.name.replace(/\.(csv|xlsx|xls|xlsm|txt)$/i, "") || file.name,
          data: { columns: parsed.columns, rows: parsed.rows },
        });
        if (file.size > LARGE_FILE_BYTES) {
          toast.warning(
            `${file.name} is large — operations on it may be slow.`,
          );
        }
      } catch (cause) {
        failures.push(
          cause instanceof ParseError
            ? cause.message
            : `${file.name} could not be read.`,
        );
      }
    }

    setPending(next);
    setError(failures.length > 0 ? failures.join(" ") : null);
    setLoading(false);
  }, []);

  const commit = (items: Pending[]) => {
    for (const item of items) addDataset(item.name, item.data);
    setPending((prev) => prev.filter((p) => !items.includes(p)));
  };

  const loadSamples = () => {
    const already = new Set(datasets.map((d) => d.name));
    const missing = SAMPLE_DATASETS.filter(
      (sample) => !already.has(sample.name),
    );
    if (missing.length === 0) {
      toast.info("All sample datasets are already loaded.");
      return;
    }
    let firstId: string | null = null;
    for (const sample of missing) {
      const dataset = addDataset(sample.name, sampleTable(sample), "sample");
      if (!firstId) firstId = dataset.id;
    }
    if (firstId) selectDataset(firstId);
    toast.success(
      `${missing.length} sample dataset${missing.length === 1 ? "" : "s"} loaded.`,
    );
  };

  return (
    <div className="space-y-2.5">
      <div
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void readFiles(event.dataTransfer.files);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        className={cn(
          "rounded-xl border border-dashed px-3 py-4 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:border-primary/40",
          loading && "pointer-events-none opacity-70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_UPLOAD}
          multiple
          className="hidden"
          onChange={(event) => {
            const files = event.target.files;
            event.target.value = "";
            void readFiles(files);
          }}
        />
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Reading file…
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-1.5 h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground">
              Drop a CSV or Excel file
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              or choose a file from your computer
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-8"
              onClick={() => inputRef.current?.click()}
            >
              Browse files
            </Button>
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] leading-snug text-destructive">
          {error}
        </p>
      )}

      {pending.length > 0 && (
        <div className="animate-rise space-y-2">
          {pending.map((item) => {
            const profile = profileTable(item.data.columns, item.data.rows);
            return (
              <div
                key={item.name}
                className="rounded-lg border border-border bg-card p-2.5"
              >
                <div className="flex items-start gap-2">
                  <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="numeric text-[11px] text-muted-foreground">
                      {profile.rowCount.toLocaleString()} rows ·{" "}
                      {profile.columnCount} columns
                    </p>
                  </div>
                </div>
                {profile.totalEmpty > 0 && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-warning">
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" />
                    {profile.totalEmpty.toLocaleString()} empty cells in{" "}
                    {profile.withGaps.length} column
                    {profile.withGaps.length === 1 ? "" : "s"}. You can fill
                    them with the Clean operation.
                  </p>
                )}
                <div className="mt-2 flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => commit([item])}
                  >
                    Add dataset
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setPending((prev) => prev.filter((p) => p !== item))
                    }
                  >
                    Discard
                  </Button>
                </div>
              </div>
            );
          })}
          {pending.length > 1 && (
            <Button
              type="button"
              size="sm"
              className="h-7 w-full text-xs"
              onClick={() => commit(pending)}
            >
              Add all {pending.length}
            </Button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/25 p-2.5">
        <p className="text-[11px] font-medium text-foreground">
          No file handy?
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Load sample HR and order data to try the operations.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1.5 h-7 text-xs"
          onClick={loadSamples}
        >
          Load sample data
        </Button>
      </div>
    </div>
  );
}
