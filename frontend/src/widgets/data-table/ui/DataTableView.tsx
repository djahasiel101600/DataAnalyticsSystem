import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Button } from '@/shared/ui/button'
import type { DataRow } from '@/entities/dataset'

const DEFAULT_PAGE_SIZE = 50
const PAGE_SIZE_OPTIONS = [50, 100, 200, 500]

export interface TableHighlight {
  pattern: string
  matchColumnHeader: string
}

interface DataTableViewProps {
  columns: string[]
  rows: DataRow[]
  maxRows?: number
  highlight?: TableHighlight | null
  showNullCounts?: boolean
  showPagination?: boolean
}

function HighlightedCell({ value, pattern }: { value: string; pattern: string }) {
  try {
    const re = new RegExp(`(${pattern})`, 'gi')
    const parts = value.split(re)
    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <mark key={i} className="bg-highlight text-highlight-foreground rounded px-0.5 font-medium shadow-sm">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    )
  } catch {
    return <span>{value}</span>
  }
}

function empty(v: unknown): boolean {
  return v === '' || v === null || v === undefined
}

export function DataTableView({
  columns,
  rows,
  maxRows = DEFAULT_PAGE_SIZE,
  highlight,
  showNullCounts = true,
  showPagination = true,
}: DataTableViewProps) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(maxRows ?? DEFAULT_PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages - 1)
  const pageRows = useMemo(
    () => rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize),
    [rows, currentPage, pageSize]
  )

  const nullCounts = useMemo(() => {
    if (!showNullCounts) return null
    const counts: Record<string, number> = {}
    for (const col of columns) {
      counts[col] = rows.filter((r) => empty(r[col])).length
    }
    return counts
  }, [columns, rows, showNullCounts])

  const tableColumns: ColumnDef<DataRow>[] = columns.map((col) => ({
    accessorKey: col,
    header: col,
    cell: ({ getValue, row }) => {
      const v = getValue()
      if (v === '' || v === null || v === undefined) {
        return <span className="text-muted-foreground">—</span>
      }
      const str = String(v)
      const isMatchCell = highlight && highlight.matchColumnHeader && row.original[highlight.matchColumnHeader] === col
      if (isMatchCell && highlight.pattern) {
        return <HighlightedCell value={str} pattern={highlight.pattern} />
      }
      return str
    },
  }))

  const table = useReactTable({
    data: pageRows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {rows.length} row{rows.length !== 1 ? 's' : ''}
        {showPagination && rows.length > pageSize && ` · Page ${currentPage + 1} of ${totalPages}`}
      </p>
      {nullCounts && (
        <details className="text-xs text-muted-foreground">
          <summary>Null/empty counts per column</summary>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {columns.map((col) => (
              <span key={col}>
                {col}: {nullCounts[col] ?? 0}
              </span>
            ))}
          </div>
        </details>
      )}
      {showPagination && rows.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </Button>
          <select
            className="h-9 rounded-md border px-2 text-sm"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(0)
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>
      )}
      <div className="rounded-md border overflow-auto max-h-[60vh] min-w-0 w-full">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No rows
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
