import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TableProperties,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import type { DataRow } from "@/entities/dataset";

const DEFAULT_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

export interface TableHighlight {
  pattern: string;
  matchColumnHeader: string;
}

interface DataTableViewProps {
  columns: string[];
  rows: DataRow[];
  maxRows?: number;
  highlight?: TableHighlight | null;
  showNullCounts?: boolean;
  showPagination?: boolean;
}

function HighlightedCell({ value, pattern }: { value: string; pattern: string }) {
  try {
    const re = new RegExp(`(${pattern})`, "gi");
    const parts = value.split(re);
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <mark
              key={i}
              className="rounded bg-highlight px-0.5 font-medium text-highlight-foreground"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  } catch {
    return <span>{value}</span>;
  }
}

function empty(value: unknown): boolean {
  return value === "" || value === null || value === undefined;
}

export function DataTableView({
  columns,
  rows,
  maxRows = DEFAULT_PAGE_SIZE,
  highlight,
  showNullCounts = true,
  showPagination = true,
}: DataTableViewProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(maxRows ?? DEFAULT_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () => rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [rows, currentPage, pageSize],
  );

  useEffect(() => {
    setPage(0);
  }, [columns, rows, pageSize]);

  const nullCounts = useMemo(() => {
    if (!showNullCounts) return null;
    const counts: Record<string, number> = {};
    for (const column of columns) {
      counts[column] = rows.filter((row) => empty(row[column])).length;
    }
    return counts;
  }, [columns, rows, showNullCounts]);

  const tableColumns: ColumnDef<DataRow>[] = [
    {
      id: "row-number",
      header: "#",
      cell: ({ row }) => currentPage * pageSize + row.index + 1,
    },
    ...columns.map((column): ColumnDef<DataRow> => ({
      accessorKey: column,
      header: column,
      cell: ({ getValue, row }) => {
        const value = getValue();
        if (empty(value)) {
          return <span className="text-muted-foreground">—</span>;
        }
        const text = String(value);
        const isMatchCell =
          highlight &&
          highlight.matchColumnHeader &&
          row.original[highlight.matchColumnHeader] === column;
        if (isMatchCell && highlight.pattern) {
          return <HighlightedCell value={text} pattern={highlight.pattern} />;
        }
        return text;
      },
    })),
  ];

  const table = useReactTable({
    data: pageRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="min-w-max text-xs">
          <TableHeader className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={[
                      "h-8 whitespace-nowrap bg-muted/80 px-3 text-[10px] font-semibold normal-case tracking-normal text-muted-foreground",
                      index === 0 ? "w-10 px-2" : "",
                    ].join(" ")}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center text-muted-foreground"
                >
                  No rows
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="[&>td]:px-3 [&>td]:py-1.5 [&>td]:text-xs"
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={[
                        "max-w-[320px] truncate",
                        index === 0
                          ? "w-10 px-2 text-[10px] tabular-nums text-muted-foreground"
                          : "",
                      ].join(" ")}
                      title={index === 0 ? undefined : String(cell.getValue() ?? "")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <TableProperties className="h-3.5 w-3.5" />
          <span>
            {rows.length.toLocaleString()} rows · {columns.length} columns
          </span>
          {nullCounts && (
            <details className="relative">
              <summary className="cursor-pointer rounded px-1 hover:bg-muted">
                Null counts
              </summary>
              <div className="absolute bottom-7 left-0 z-20 max-h-40 min-w-48 overflow-auto rounded-md border border-border bg-card p-2 shadow-lg">
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {columns.map((column) => (
                    <span key={column}>
                      {column}: {nullCounts[column] ?? 0}
                    </span>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>

        {showPagination && rows.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-12 text-center text-[11px] text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages - 1}
              onClick={() =>
                setPage((value) => Math.min(totalPages - 1, value + 1))
              }
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
