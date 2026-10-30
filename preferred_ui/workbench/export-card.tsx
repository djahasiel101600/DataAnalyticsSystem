import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  downloadCsv,
  downloadJson,
  downloadXlsx,
  XLSX_ROW_LIMIT,
} from "@/lib/data/export";
import { useWorkbench } from "@/store/workbench";

const FORMATS = [
  {
    key: "csv",
    label: "CSV",
    icon: FileText,
    hint: "Works in any spreadsheet app",
  },
  {
    key: "xlsx",
    label: "Excel",
    icon: FileSpreadsheet,
    hint: `Up to ${XLSX_ROW_LIMIT.toLocaleString()} rows`,
  },
  { key: "json", label: "JSON", icon: FileJson, hint: "For other tools" },
] as const;

type Format = (typeof FORMATS)[number]["key"];

function useExport() {
  const { result, resultLabel, activeDataset } = useWorkbench();
  const [error, setError] = useState<string | null>(null);

  const target =
    result ??
    (activeDataset
      ? { columns: activeDataset.columns, rows: activeDataset.rows }
      : null);
  const name = result
    ? (resultLabel ?? "result")
    : (activeDataset?.name ?? "dataset");

  const run = async (format: Format) => {
    if (!target) return;
    setError(null);
    try {
      if (format === "csv") downloadCsv(target, name);
      else if (format === "json") downloadJson(target, name);
      else await downloadXlsx(target, name);
      toast.success(`Downloading ${format.toUpperCase()}.`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Export failed.";
      setError(message);
      toast.error(message);
    }
  };

  return { target, name, error, run };
}

export function ExportCard() {
  const { target, name, error, run } = useExport();

  return (
    <div className="space-y-2">
      <p className="text-[11px] leading-snug text-muted-foreground">
        {target ? (
          <>
            Exporting{" "}
            <span className="font-medium text-foreground">{name}</span> ·{" "}
            <span className="numeric">
              {target.rows.length.toLocaleString()} rows
            </span>
          </>
        ) : (
          "Nothing to export yet."
        )}
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        {FORMATS.map((format) => {
          const Icon = format.icon;
          return (
            <Button
              key={format.key}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto flex-col gap-1 px-1 py-2"
              disabled={!target}
              onClick={() => run(format.key)}
              title={format.hint}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">{format.label}</span>
            </Button>
          );
        })}
      </div>

      {target && target.rows.length > XLSX_ROW_LIMIT && (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Excel export is unavailable above {XLSX_ROW_LIMIT.toLocaleString()}{" "}
          rows in the browser — use CSV.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] leading-snug text-destructive">
          {error}
        </p>
      )}

      <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Download className="h-3 w-3" />
        Files download straight from your browser.
      </p>
    </div>
  );
}

export function ExportMenu() {
  const { target, name, run } = useExport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!target}
        >
          <Download className="h-3.5 w-3.5" />
          Export
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="max-w-[180px] truncate text-[11px] font-normal text-muted-foreground">
          {name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FORMATS.map((format) => {
          const Icon = format.icon;
          return (
            <DropdownMenuItem
              key={format.key}
              onSelect={() => run(format.key)}
              className="gap-2 text-xs"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1">{format.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {format.hint}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
