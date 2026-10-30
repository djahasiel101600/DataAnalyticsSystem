import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DataRow } from "@/lib/data/types";
import { profileTable } from "@/lib/data/validate";

const PAGE_SIZES = [50, 100, 250];

export function DataTable({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: DataRow[];
  caption?: string;
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [showGaps, setShowGaps] = useState(false);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  useEffect(() => {
    setPage(0);
  }, [columns, rows, pageSize]);

  const visible = useMemo(
    () => rows.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [rows, safePage, pageSize],
  );

  const profile = useMemo(() => profileTable(columns, rows), [columns, rows]);

  if (columns.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        No columns to show.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scroll-slim min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-10 border-b border-border bg-muted/70 px-2 py-2 text-[10px] font-medium tabular-nums text-muted-foreground backdrop-blur">
                #
              </th>
              {columns.map((column) => {
                const gap = profile.columns.find((c) => c.column === column);
                const derived = column.startsWith("_");
                return (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      "sticky top-0 border-b border-border bg-muted/70 px-3 py-2 text-[11px] font-semibold backdrop-blur",
                      derived ? "text-primary" : "text-foreground",
                    )}
                  >
                    <span
                      className="block max-w-[220px] truncate"
                      title={column}
                    >
                      {column}
                    </span>
                    {gap && gap.empty > 0 && (
                      <span className="mt-0.5 block text-[10px] font-normal text-warning">
                        {gap.empty.toLocaleString()} empty
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const rowNumber = safePage * pageSize + index + 1;
              return (
                <tr
                  key={rowNumber}
                  className="group border-b border-border/60 hover:bg-accent/40"
                >
                  <td className="numeric px-2 py-1.5 text-[10px] text-muted-foreground">
                    {rowNumber}
                  </td>
                  {columns.map((column) => {
                    const value = row[column];
                    const isEmpty =
                      value === "" || value === null || value === undefined;
                    return (
                      <td
                        key={column}
                        className={cn(
                          "max-w-[320px] truncate px-3 py-1.5",
                          typeof value === "number" ? "numeric text-right" : "",
                          column.startsWith("_")
                            ? "bg-primary/[0.03] text-primary/90"
                            : "",
                        )}
                        title={isEmpty ? undefined : String(value)}
                      >
                        {isEmpty ? (
                          <span className="text-muted-foreground/60">—</span>
                        ) : (
                          String(value)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-12 text-center text-sm text-muted-foreground"
                >
                  No rows matched.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-t border-border bg-card/80 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <TableProperties className="h-3.5 w-3.5" />
          <span className="numeric">
            {rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"} ·{" "}
            {columns.length} column
            {columns.length === 1 ? "" : "s"}
          </span>
          {profile.totalEmpty > 0 && (
            <button
              type="button"
              onClick={() => setShowGaps((v) => !v)}
              className="rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning transition-colors hover:bg-warning/20"
            >
              {profile.totalEmpty.toLocaleString()} empty cells
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <select
            className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground outline-none"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="numeric min-w-[64px] text-center text-[11px] text-muted-foreground">
            {safePage + 1} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showGaps && (
        <div className="scroll-slim max-h-32 flex-none overflow-auto border-t border-border bg-muted/30 px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Empty cells by column
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {profile.withGaps.length === 0 && (
              <span className="text-muted-foreground">
                Every cell is filled.
              </span>
            )}
            {profile.withGaps.map((gap) => (
              <span key={gap.column} className="text-muted-foreground">
                {gap.column}:{" "}
                <span className="numeric font-medium text-foreground">
                  {gap.empty.toLocaleString()}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {caption ?? ""}
          </p>
        </div>
      )}
    </div>
  );
}
