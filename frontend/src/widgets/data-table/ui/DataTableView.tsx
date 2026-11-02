import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Filter,
  MessageSquareText,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import { useDatasets } from "@/app/store/DatasetsContext";
import type { DataRow } from "@/entities/dataset";
import { downloadCSV } from "@/features/export-data/lib/export-csv";
import { downloadJSON } from "@/features/export-data/lib/export-json";
import { downloadXLSX } from "@/features/export-data/lib/export-xlsx";
import { Button } from "@/shared/ui/button";
import {
  commitTableCommand,
  createAnnotation,
  createAnnotationCommand,
  createDeleteCommand,
  createEditCommand,
  createTableWorkspace,
  redoTableWorkspace,
  undoTableWorkspace,
  type TableAnnotation,
  type TableCommand,
  type TableWorkspace,
} from "@/app/store/table-workspace";
import {
  rowMatchesConditions,
  type FilterCombine,
  type FilterCondition,
  type FilterOperator,
  type FilterValueType,
} from "@/features/filter-sort/lib/run-filter-sort";

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];
const SELECT_WIDTH = 36;
const ROW_WIDTH = 52;
const DATA_WIDTH = 180;
const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
  { value: "not_empty", label: "Not empty" },
  { value: "empty", label: "Empty" },
];
const VALUE_FILTER_OPERATORS = new Set<FilterOperator>([
  "equals",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
]);

export interface TableHighlight {
  pattern: string;
  matchColumnHeader: string;
}

interface DataTableViewProps {
  columns: string[];
  rows: DataRow[];
  workspaceKey: string;
  maxRows?: number;
  highlight?: TableHighlight | null;
  showNullCounts?: boolean;
  showPagination?: boolean;
}

type SelectionScope = "page" | "filtered" | "all";
type SortState = { column: string; direction: "asc" | "desc" } | null;
interface AnnotationTarget {
  recordId: string;
  column?: string;
}

interface AnnotationPanelProps {
  heading: string;
  notes: TableAnnotation[];
  onSave: (noteId: string | null, text: string) => void;
  onDelete: (noteId: string) => void;
  onClose: () => void;
}

function AnnotationPanel({
  heading,
  notes,
  onSave,
  onDelete,
  onClose,
}: AnnotationPanelProps) {
  const [draft, setDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const save = () => {
    if (!draft.trim()) return;
    onSave(editingNoteId, draft.trim());
    setDraft("");
    setEditingNoteId(null);
  };

  return (
    <div className="flex max-h-48 flex-none flex-col gap-2 overflow-auto border-b border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <strong>{heading}</strong>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-[10px]"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
      <ul className="space-y-1">
        {notes.map((note) => (
          <li key={note.id} className="flex items-start gap-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                setEditingNoteId(note.id);
                setDraft(note.text);
              }}
              title="Click to edit"
            >
              {note.text}
              <span className="ml-2 text-[9px] text-muted-foreground">
                {new Date(note.updatedAt).toLocaleString()}
              </span>
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-destructive"
              onClick={() => {
                onDelete(note.id);
                if (editingNoteId === note.id) {
                  setEditingNoteId(null);
                  setDraft("");
                }
              }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-2"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a note or select one above to edit"
          aria-label="Annotation text"
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") onClose();
          }}
        />
        <Button
          size="sm"
          className="h-7 px-2 text-[10px]"
          disabled={!draft.trim()}
          onClick={save}
        >
          {editingNoteId ? "Save note" : "Add note"}
        </Button>
      </div>
    </div>
  );
}

function isEmpty(value: unknown): boolean {
  return value === "" || value === null || value === undefined;
}

function annotationsFor(
  workspace: TableWorkspace,
  target: AnnotationTarget,
): TableAnnotation[] {
  return target.column === undefined
    ? workspace.rowAnnotations[target.recordId] ?? []
    : workspace.cellAnnotations[
        JSON.stringify([target.recordId, target.column])
      ] ?? [];
}

function readEditValue(
  raw: string,
  column: string,
  records: TableWorkspace["records"],
): { valid: true; value: DataRow[string] } | { valid: false; message: string } {
  const values = records
    .map((record) => record.row[column])
    .filter((value) => value !== null && value !== undefined);
  const types = new Set(values.map((value) => typeof value));
  if (raw === "") {
    return {
      valid: true,
      value: types.size === 1 && types.has("string") ? "" : null,
    };
  }
  if (types.size === 1 && types.has("number")) {
    const value = Number(raw);
    return Number.isFinite(value)
      ? { valid: true, value }
      : { valid: false, message: "Enter a valid number." };
  }
  if (types.size === 1 && types.has("boolean")) {
    if (raw.toLowerCase() === "true") return { valid: true, value: true };
    if (raw.toLowerCase() === "false") return { valid: true, value: false };
    return { valid: false, message: "Enter true or false." };
  }
  return { valid: true, value: raw };
}

function formatValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export function DataTableView({
  columns,
  rows,
  workspaceKey,
  maxRows = 50,
  highlight,
  showNullCounts = true,
  showPagination = true,
}: DataTableViewProps) {
  const {
    tableWorkspaces,
    ensureTableWorkspace,
    updateTableWorkspace,
  } = useDatasets();
  const storedWorkspace = tableWorkspaces[workspaceKey];
  const workspace = useMemo(
    () =>
      storedWorkspace?.baseRows === rows
        ? storedWorkspace
        : createTableWorkspace(rows),
    [storedWorkspace, rows],
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(maxRows);
  const [search, setSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<FilterCondition[]>([]);
  const [filterCombine, setFilterCombine] = useState<FilterCombine>("and");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [sort, setSort] = useState<SortState>(null);
  const [selectionScope, setSelectionScope] =
    useState<SelectionScope>("page");
  const [editing, setEditing] = useState<{
    recordId: string;
    column: string;
    value: string;
    error: string;
  } | null>(null);
  const [bulkColumn, setBulkColumn] = useState(columns[0] ?? "");
  const [bulkValue, setBulkValue] = useState("");
  const [annotationTarget, setAnnotationTarget] =
    useState<AnnotationTarget | null>(null);
  const [exportFormat, setExportFormat] = useState<"csv" | "json" | "xlsx">(
    "csv",
  );
  const [pendingFocus, setPendingFocus] = useState<{
    recordId: string;
    column: string;
  } | null>(null);
  const lastClickedId = useRef<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLTableCellElement>());

  useEffect(() => {
    ensureTableWorkspace(workspaceKey, rows);
  }, [ensureTableWorkspace, workspaceKey, rows, storedWorkspace]);

  useEffect(() => {
    if (pendingFocus) {
      cellRefs.current
        .get(JSON.stringify([pendingFocus.recordId, pendingFocus.column]))
        ?.focus();
      setPendingFocus(null);
    }
  }, [pendingFocus, page, pageSize, workspace.records]);

  const updateWorkspace = (
    updater: (current: TableWorkspace) => TableWorkspace,
  ) => updateTableWorkspace(workspaceKey, rows, updater);

  const activeFilterConditions = useMemo(
    () => columnFilters.filter((condition) => condition.column),
    [columnFilters],
  );
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    let result = workspace.records.filter((record) => {
      if (
        activeFilterConditions.length > 0 &&
        !rowMatchesConditions(
          record.row,
          activeFilterConditions,
          filterCombine,
        )
      ) {
        return false;
      }
      if (!query) return true;
      const values = [
        ...columns.map((column) => formatValue(record.row[column])),
        ...(workspace.rowAnnotations[record.id] ?? []).map((note) => note.text),
        ...columns.flatMap(
          (column) =>
            workspace.cellAnnotations[
              JSON.stringify([record.id, column])
            ]?.map((note) => note.text) ?? [],
        ),
      ];
      return values.some((value) => value.toLocaleLowerCase().includes(query));
    });
    if (sort) {
      result = [...result].sort((a, b) => {
        const left = a.row[sort.column];
        const right = b.row[sort.column];
        let comparison = 0;
        if (typeof left === "number" && typeof right === "number") {
          comparison = left - right;
        } else {
          comparison = formatValue(left).localeCompare(formatValue(right), undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
        return sort.direction === "asc" ? comparison : -comparison;
      });
    }
    return result;
  }, [
    activeFilterConditions,
    columns,
    filterCombine,
    search,
    sort,
    workspace,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRecords = useMemo(
    () =>
      showPagination
        ? filteredRecords.slice(
            currentPage * pageSize,
            (currentPage + 1) * pageSize,
          )
        : filteredRecords,
    [currentPage, filteredRecords, pageSize, showPagination],
  );
  const selectedIds = new Set(workspace.selectedRecordIds);
  const selectedRecords = workspace.records.filter((record) =>
    selectedIds.has(record.id),
  );
  const targetRecords =
    selectionScope === "all"
      ? workspace.records
      : selectionScope === "filtered"
        ? filteredRecords
        : pageRecords;
  const modifiedCellCount = workspace.records.reduce(
    (count, record) =>
      count +
      columns.filter(
        (column) =>
          !Object.is(record.originalRow[column], record.row[column]),
      ).length,
    0,
  );
  const annotationCount =
    Object.values(workspace.rowAnnotations).reduce(
      (count, notes) => count + notes.length,
      0,
    ) +
    Object.values(workspace.cellAnnotations).reduce(
      (count, notes) => count + notes.length,
      0,
    );
  const frozenIndex = Math.max(
    -1,
    ...workspace.frozenColumns.map((column) => columns.indexOf(column)),
  );

  useEffect(() => {
    setPage(0);
  }, [search, columnFilters, filterCombine, sort, pageSize, workspaceKey, rows]);

  useEffect(() => {
    if (columns.length > 0 && !columns.includes(bulkColumn)) {
      setBulkColumn(columns[0]);
    }
  }, [bulkColumn, columns]);

  useEffect(() => {
    setColumnFilters((current) =>
      current.filter((condition) => columns.includes(condition.column)),
    );
  }, [columns]);

  const commit = (command: TableCommand | null) => {
    if (command) {
      updateWorkspace((current) => commitTableCommand(current, command));
    }
  };

  const setSelectedIds = (ids: string[]) => {
    updateWorkspace((current) => ({
      ...current,
      selectedRecordIds: Array.from(new Set(ids)).filter((id) =>
        current.records.some((record) => record.id === id),
      ),
    }));
  };

  const selectScope = () => {
    const ids = targetRecords.map((record) => record.id);
    if (ids.length === 0) return;
    const alreadySelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds(
      alreadySelected
        ? workspace.selectedRecordIds.filter((id) => !ids.includes(id))
        : [...workspace.selectedRecordIds, ...ids],
    );
  };

  const selectRecord = (
    recordId: string,
    visibleIndex: number,
    event: MouseEvent<HTMLInputElement>,
  ) => {
    const visibleIds = pageRecords.map((record) => record.id);
    if (event.shiftKey && lastClickedId.current) {
      const start = visibleIds.indexOf(lastClickedId.current);
      const end = visibleIds.indexOf(recordId);
      if (start >= 0 && end >= 0) {
        const range = visibleIds.slice(
          Math.min(start, end),
          Math.max(start, end) + 1,
        );
        setSelectedIds([...workspace.selectedRecordIds, ...range]);
      }
    } else if (event.metaKey || event.ctrlKey) {
      setSelectedIds(
        selectedIds.has(recordId)
          ? workspace.selectedRecordIds.filter((id) => id !== recordId)
          : [...workspace.selectedRecordIds, recordId],
      );
    } else {
      setSelectedIds(selectedIds.has(recordId) ? [] : [recordId]);
    }
    lastClickedId.current = visibleIds[visibleIndex] ?? recordId;
  };

  const startEdit = (recordId: string, column: string) => {
    const record = workspace.records.find((item) => item.id === recordId);
    if (!record) return;
    setEditing({
      recordId,
      column,
      value: formatValue(record.row[column]),
      error: "",
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    const record = workspace.records.find(
      (item) => item.id === editing.recordId,
    );
    if (!record) return;
    const parsed = readEditValue(editing.value, editing.column, workspace.records);
    if (!parsed.valid) {
      setEditing({ ...editing, error: parsed.message });
      return;
    }
    commit(
      createEditCommand("Edit", "Individual record", [
        {
          recordId: record.id,
          column: editing.column,
          before: record.row[editing.column],
          after: parsed.value,
        },
      ]),
    );
    setEditing(null);
  };

  const bulkEdit = () => {
    if (selectedRecords.length === 0 || !bulkColumn) return;
    const parsed = readEditValue(bulkValue, bulkColumn, workspace.records);
    if (!parsed.valid) {
      window.alert(parsed.message);
      return;
    }
    const changes = selectedRecords.map((record) => ({
      recordId: record.id,
      column: bulkColumn,
      before: record.row[bulkColumn],
      after: parsed.value,
    }));
    if (
      !window.confirm(
        `Apply this value to ${changes.filter((change) => !Object.is(change.before, change.after)).length} selected records in "${bulkColumn}"?`,
      )
    ) {
      return;
    }
    commit(createEditCommand("Bulk edit", "Selected records", changes));
  };

  const deleteRecords = (ids: string[], scope: string) => {
    const command = createDeleteCommand(workspace, ids, scope);
    if (
      command?.type !== "delete" ||
      !window.confirm(
        `Delete ${command.deleted.length} record(s) from ${scope}? This only affects the working session.`,
      )
    ) {
      return;
    }
    commit(command);
    setSelectedIds(workspace.selectedRecordIds.filter((id) => !ids.includes(id)));
  };

  const openAnnotations = (target: AnnotationTarget) => {
    setAnnotationTarget(target);
  };

  const saveAnnotation = (noteId: string | null, text: string) => {
    if (!annotationTarget || !text.trim()) return;
    const before = annotationsFor(workspace, annotationTarget);
    const existing = before.find((note) => note.id === noteId);
    const after = existing
      ? before.map((note) =>
          note.id === existing.id
            ? {
                ...note,
                text: text.trim(),
                updatedAt: new Date().toISOString(),
              }
            : note,
        )
      : [...before, createAnnotation(text.trim())];
    commit(
      createAnnotationCommand(
        annotationTarget.column === undefined
          ? "Row annotation"
          : "Cell annotation",
        annotationTarget.column === undefined
          ? "Individual record"
          : "Individual cell",
        annotationTarget.recordId,
        annotationTarget.column,
        before,
        after,
      ),
    );
  };

  const removeAnnotation = (noteId: string) => {
    if (!annotationTarget) return;
    const before = annotationsFor(workspace, annotationTarget);
    commit(
      createAnnotationCommand(
        annotationTarget.column === undefined
          ? "Row annotation"
          : "Cell annotation",
        "Individual annotation",
        annotationTarget.recordId,
        annotationTarget.column,
        before,
        before.filter((note) => note.id !== noteId),
      ),
    );
  };

  const exportSelected = () => {
    if (selectedRecords.length === 0) {
      window.alert("Select one or more rows before exporting.");
      return;
    }
    const selectedRows = selectedRecords.map((record) => record.row);
    const filename = `selected-rows-${selectedRows.length}`;
    if (exportFormat === "csv") downloadCSV(columns, selectedRows, `${filename}.csv`);
    else if (exportFormat === "json") downloadJSON(columns, selectedRows, `${filename}.json`);
    else downloadXLSX(columns, selectedRows, `${filename}.xlsx`);
  };

  const navigateCell = (
    filteredRecordIndex: number,
    columnIndex: number,
    rowDelta: number,
    columnDelta: number,
  ) => {
    const nextColumn = Math.max(
      0,
      Math.min(columns.length - 1, columnIndex + columnDelta),
    );
    const nextIndex = Math.max(
      0,
      Math.min(filteredRecords.length - 1, filteredRecordIndex + rowDelta),
    );
    const record = filteredRecords[nextIndex];
    if (!record || !columns[nextColumn]) return;
    setPage(Math.floor(nextIndex / pageSize));
    setPendingFocus({ recordId: record.id, column: columns[nextColumn] });
  };

  const renderValue = (
    recordId: string,
    column: string,
    value: DataRow[string],
  ) => {
    const cellKey = JSON.stringify([recordId, column]);
    const noteCount =
      workspace.cellAnnotations[cellKey]?.length ?? 0;
    if (editing?.recordId === recordId && editing.column === column) {
      return (
        <div className="min-w-40 space-y-1">
          <input
            autoFocus
            className="h-7 w-full rounded border border-input bg-background px-2 text-xs text-foreground"
            value={editing.value}
            aria-label={`Edit ${column}`}
            onChange={(event) =>
              setEditing({ ...editing, value: event.target.value, error: "" })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                saveEdit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setEditing(null);
              }
            }}
          />
          {editing.error && (
            <p className="text-[10px] text-destructive">{editing.error}</p>
          )}
          <div className="flex gap-1">
            <Button size="sm" className="h-6 px-2 text-[10px]" onClick={saveEdit}>
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }
    const text = isEmpty(value) ? "—" : formatValue(value);
    let pieces = [text];
    if (highlight?.pattern && highlight.matchColumnHeader === column && text !== "—") {
      try {
        pieces = text.split(new RegExp(`(${highlight.pattern})`, "gi"));
      } catch {
        pieces = [text];
      }
    }
    const modified = !Object.is(
      workspace.records.find((record) => record.id === recordId)?.originalRow[column],
      value,
    );
    const notes =
      workspace.cellAnnotations[JSON.stringify([recordId, column])] ?? [];
    return (
      <div className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 flex-1 truncate" title={text}>
          {pieces.map((piece, index) =>
            index % 2 === 1 ? (
              <mark key={index} className="rounded bg-highlight px-0.5">
                {piece}
              </mark>
            ) : (
              <span key={index}>{piece}</span>
            ),
          )}
        </span>
        {modified && <span className="h-1.5 w-1.5 flex-none rounded-full bg-primary" title="Modified in this session" />}
        {noteCount > 0 && (
          <button
            type="button"
            className="flex-none text-primary"
            aria-label={`${noteCount} annotations for ${column}`}
            title={notes.map((note) => note.text).join("\n")}
            onClick={(event) => {
              event.stopPropagation();
              openAnnotations({ recordId, column });
            }}
          >
            <MessageSquareText className="h-3 w-3" />
          </button>
        )}
        <button
          type="button"
          className="flex-none text-muted-foreground opacity-0 transition-opacity hover:text-primary focus:opacity-100 group-hover:opacity-100"
          aria-label={`Annotate ${column} cell`}
          title="Add or view cell annotations"
          onClick={(event) => {
            event.stopPropagation();
            openAnnotations({ recordId, column });
          }}
        >
          <MessageSquareText className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const nullCounts = useMemo(
    () =>
      Object.fromEntries(
        columns.map((column) => [
          column,
          workspace.records.filter((record) => isEmpty(record.row[column])).length,
        ]),
      ),
    [columns, workspace.records],
  );
  const parsedBulkValue = readEditValue(
    bulkValue,
    bulkColumn,
    workspace.records,
  );

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col text-xs"
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
        if (event.key === "Escape" && annotationTarget) {
          setAnnotationTarget(null);
          return;
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "z" &&
          !event.shiftKey
        ) {
          event.preventDefault();
          event.stopPropagation();
          updateWorkspace(undoTableWorkspace);
        } else if (
          (event.ctrlKey || event.metaKey) &&
          (event.key.toLowerCase() === "y" ||
            (event.key.toLowerCase() === "z" && event.shiftKey))
        ) {
          event.preventDefault();
          event.stopPropagation();
          updateWorkspace(redoTableWorkspace);
        }
      }}
    >
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <span className="font-medium tabular-nums">{selectedRecords.length} selected</span>
        <span className="text-muted-foreground">· {modifiedCellCount} modified cells · {annotationCount} annotations</span>
        <span className="ml-auto rounded bg-muted px-2 py-1 text-[10px] text-muted-foreground">
          Temporary working session
        </span>
      </div>

      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <input
          className="h-7 min-w-36 flex-1 rounded-md border border-input bg-background px-2 text-[11px] text-foreground sm:max-w-60"
          placeholder="Filter rows and annotations…"
          aria-label="Filter rows and annotations"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button
          size="sm"
          variant={activeFilterConditions.length > 0 ? "secondary" : "outline"}
          className="h-7 px-2 text-[10px]"
          aria-expanded={filterPanelOpen}
          onClick={() => setFilterPanelOpen((open) => !open)}
        >
          <Filter className="mr-1 h-3 w-3" />
          Filters
          {activeFilterConditions.length > 0 &&
            ` · ${activeFilterConditions.length}`}
        </Button>
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Select
          <select
            className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground"
            value={selectionScope}
            onChange={(event) =>
              setSelectionScope(event.target.value as SelectionScope)
            }
          >
            <option value="page">Current page</option>
            <option value="filtered">Filtered results</option>
            <option value="all">Entire dataset</option>
          </select>
        </label>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px]"
          disabled={targetRecords.length === 0}
          onClick={selectScope}
          title={`${targetRecords.length} records in this selection scope`}
        >
          {targetRecords.length > 0 &&
          targetRecords.every((record) => selectedIds.has(record.id))
            ? "Deselect scope"
            : `Select ${targetRecords.length}`}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[10px]"
          disabled={selectedRecords.length === 0}
          onClick={() => setSelectedIds([])}
        >
          Clear selection
        </Button>
        <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Freeze through
          <select
            className="h-7 max-w-36 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground"
            value={workspace.frozenColumns[workspace.frozenColumns.length - 1] ?? ""}
            onChange={(event) => {
              const endIndex = columns.indexOf(event.target.value);
              updateWorkspace((current) => ({
                ...current,
                frozenColumns:
                  endIndex < 0 ? [] : columns.slice(0, endIndex + 1),
              }));
            }}
            aria-label="Freeze columns through"
          >
            <option value="">No columns</option>
            {columns.map((column) => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </label>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[10px]"
          disabled={workspace.frozenColumns.length === 0}
          onClick={() =>
            updateWorkspace((current) => ({ ...current, frozenColumns: [] }))
          }
        >
          Unfreeze
        </Button>
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
          {filteredRecords.length.toLocaleString()} of{" "}
          {workspace.records.length.toLocaleString()} rows
          {(activeFilterConditions.length > 0 || search.trim() !== "") &&
            " · filtered"}
        </span>
      </div>

      {filterPanelOpen && (
        <section
          aria-label="Table filters"
          className="flex flex-none flex-col gap-2 border-b border-border bg-muted/20 px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium">Filter columns</span>
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              Combine
              <select
                className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground"
                value={filterCombine}
                onChange={(event) =>
                  setFilterCombine(event.target.value as FilterCombine)
                }
                aria-label="Combine table filters"
              >
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            </label>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px]"
              onClick={() =>
                setColumnFilters((current) => [
                  ...current,
                  {
                    column: columns[0] ?? "",
                    operator: "contains",
                    value: "",
                  },
                ])
              }
              disabled={columns.length === 0}
            >
              Add condition
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              onClick={() => {
                setColumnFilters([]);
                setFilterCombine("and");
              }}
              disabled={columnFilters.length === 0}
            >
              Clear filters
            </Button>
          </div>
          {columnFilters.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              No column filters are active.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {columnFilters.map((condition, index) => (
                <div
                  key={index}
                  className="flex min-w-0 flex-wrap items-center gap-1.5"
                >
                  <select
                    className="h-7 min-w-28 flex-1 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground"
                    value={condition.column}
                    onChange={(event) =>
                      setColumnFilters((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, column: event.target.value }
                            : item,
                        ),
                      )
                    }
                    aria-label={`Filter condition ${index + 1} column`}
                  >
                    {columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-7 min-w-28 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground"
                    value={condition.operator}
                    onChange={(event) =>
                      setColumnFilters((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                operator: event.target.value as FilterOperator,
                              }
                            : item,
                        ),
                      )
                    }
                    aria-label={`Filter condition ${index + 1} operator`}
                  >
                    {FILTER_OPERATORS.map((operator) => (
                      <option key={operator.value} value={operator.value}>
                        {operator.label}
                      </option>
                    ))}
                  </select>
                  {VALUE_FILTER_OPERATORS.has(condition.operator) && (
                    <>
                      <select
                        className="h-7 rounded-md border border-input bg-background px-1.5 text-[11px] text-foreground"
                        value={condition.valueType ?? "text"}
                        onChange={(event) =>
                          setColumnFilters((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    valueType: event.target
                                      .value as FilterValueType,
                                  }
                                : item,
                            ),
                          )
                        }
                        aria-label={`Filter condition ${index + 1} value type`}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                      </select>
                      <input
                        className="h-7 min-w-24 flex-1 rounded-md border border-input bg-background px-2 text-[11px] text-foreground"
                        value={condition.value}
                        onChange={(event) =>
                          setColumnFilters((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, value: event.target.value }
                                : item,
                            ),
                          )
                        }
                        aria-label={`Filter condition ${index + 1} value`}
                        placeholder={
                          condition.valueType === "date"
                            ? "YYYY-MM-DD"
                            : "Value"
                        }
                      />
                    </>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px]"
                    onClick={() =>
                      setColumnFilters((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    aria-label={`Remove filter condition ${index + 1}`}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-none flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-3 py-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px]"
          disabled={workspace.undoStack.length === 0}
          onClick={() => updateWorkspace(undoTableWorkspace)}
          title="Undo (Ctrl/Cmd+Z)"
        >
          <Undo2 className="mr-1 h-3 w-3" /> Undo
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[10px]"
          disabled={workspace.redoStack.length === 0}
          onClick={() => updateWorkspace(redoTableWorkspace)}
          title="Redo (Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z)"
        >
          <Redo2 className="mr-1 h-3 w-3" /> Redo
        </Button>
        <details className="relative">
          <summary className="flex h-7 cursor-pointer list-none items-center rounded-md border border-input bg-background px-2 text-[10px]">
            History · {workspace.history.length}
          </summary>
          <div className="absolute left-0 top-8 z-50 max-h-64 w-[min(34rem,85vw)] overflow-auto rounded-md border border-border bg-card p-2 shadow-lg">
            {workspace.history.length === 0 ? (
              <p className="p-2 text-muted-foreground">No changes in this session.</p>
            ) : (
              <ol className="space-y-1">
                {[...workspace.history].reverse().map((entry) => (
                  <li key={entry.id} className="border-b border-border/60 px-1 py-1.5 last:border-0">
                    <div className="font-medium">
                      {entry.action}
                      {entry.originalAction ? ` · ${entry.originalAction}` : ""}
                      {entry.column ? ` · ${entry.column}` : ""}
                    </div>
                    <div className="break-all text-[10px] text-muted-foreground">
                      Record {entry.recordId} · {entry.operationScope} · {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div className="break-all text-[10px] text-muted-foreground">
                      {JSON.stringify(entry.previousValue)} → {JSON.stringify(entry.newValue)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </details>
        <div className="ml-auto flex items-center gap-1.5">
          <select
            className="h-7 rounded-md border border-input bg-background px-1.5 text-[10px]"
            value={exportFormat}
            onChange={(event) =>
              setExportFormat(event.target.value as "csv" | "json" | "xlsx")
            }
            aria-label="Selected rows export format"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="xlsx">Excel</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={exportSelected}
            title={
              selectedRecords.length > 0
                ? `Export ${selectedRecords.length} selected working rows`
                : "Select rows to export"
            }
          >
            <Download className="mr-1 h-3 w-3" /> Export selected
          </Button>
          {selectedRecords.length === 0 && (
            <span className="text-[10px] text-muted-foreground">
              Select rows to enable export.
            </span>
          )}
        </div>
      </div>

      {selectedRecords.length > 0 && (
        <div className="flex flex-none flex-wrap items-center gap-2 border-b border-border bg-primary/5 px-3 py-2">
          <label className="flex items-center gap-1 text-[10px]">
            Bulk edit
            <select
              className="h-7 max-w-40 rounded-md border border-input bg-background px-1.5 text-[11px]"
              value={bulkColumn}
              onChange={(event) => setBulkColumn(event.target.value)}
            >
              {columns.map((column) => <option key={column} value={column}>{column}</option>)}
            </select>
          </label>
          <input
            className="h-7 min-w-24 rounded-md border border-input bg-background px-2 text-[11px]"
            value={bulkValue}
            onChange={(event) => setBulkValue(event.target.value)}
            aria-label="Bulk edit value"
            placeholder="New value"
          />
          <span className="text-[10px] text-muted-foreground">
            Preview: {selectedRecords.length} selected ·{" "}
            {selectedRecords.filter((record) =>
              !Object.is(
                record.row[bulkColumn],
                parsedBulkValue.valid ? parsedBulkValue.value : undefined,
              ),
            ).length} values change
          </span>
          <details className="relative">
            <summary className="cursor-pointer rounded border border-border px-2 py-1 text-[10px]">
              Preview changes
            </summary>
            <div className="absolute left-0 top-8 z-40 max-h-56 w-[min(22rem,80vw)] overflow-auto rounded-md border border-border bg-card p-2 shadow-lg">
              <p className="mb-1 font-medium">
                {selectedRecords.length} selected records · {bulkColumn}
              </p>
              <ul className="space-y-1">
                {selectedRecords.slice(0, 20).map((record) => (
                  <li key={record.id} className="break-all text-[10px] text-muted-foreground">
                    {columns[0] ? `${columns[0]}: ${formatValue(record.row[columns[0]]) || record.id} · ` : `${record.id} · `}
                    {formatValue(record.row[bulkColumn]) || "—"} →{" "}
                    {parsedBulkValue.valid
                      ? formatValue(parsedBulkValue.value) || "—"
                      : "Invalid value"}
                  </li>
                ))}
                {selectedRecords.length > 20 && (
                  <li className="text-[10px] text-muted-foreground">
                    …and {selectedRecords.length - 20} more records
                  </li>
                )}
              </ul>
            </div>
          </details>
          <Button
            size="sm"
            className="h-7 px-2 text-[10px]"
            onClick={bulkEdit}
            disabled={!bulkColumn}
          >
            Apply to selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px]"
            onClick={() => setBulkValue("")}
          >
            Cancel
          </Button>
          {selectedRecords.length === 1 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px]"
              onClick={() => openAnnotations({ recordId: selectedRecords[0].id })}
            >
              Annotate row
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-[10px]"
            onClick={() =>
              deleteRecords(
                selectedRecords.map((record) => record.id),
                `${selectionScope} selection`,
              )
            }
          >
            <Trash2 className="mr-1 h-3 w-3" /> Delete {selectedRecords.length}
          </Button>
        </div>
      )}

      {annotationTarget && (
        <AnnotationPanel
          key={JSON.stringify([annotationTarget.recordId, annotationTarget.column])}
          heading={
            annotationTarget.column
              ? `Cell notes · ${annotationTarget.column}`
              : "Row notes"
          }
          notes={annotationsFor(workspace, annotationTarget)}
          onSave={saveAnnotation}
          onDelete={removeAnnotation}
          onClose={() => setAnnotationTarget(null)}
        />
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        <table className="w-max min-w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col style={{ width: SELECT_WIDTH }} />
            <col style={{ width: ROW_WIDTH }} />
            {columns.map((column) => <col key={column} style={{ width: DATA_WIDTH }} />)}
          </colgroup>
          <thead className="sticky top-0 z-30">
            <tr>
              <th
                className="sticky left-0 z-40 border-b border-r border-border bg-muted px-2 py-2 text-center"
                style={{ width: SELECT_WIDTH }}
              >
                <input
                  type="checkbox"
                  aria-label={`Select ${selectionScope} rows`}
                  checked={
                    targetRecords.length > 0 &&
                    targetRecords.every((record) => selectedIds.has(record.id))
                  }
                  ref={(element) => {
                    if (element) {
                      element.indeterminate =
                        targetRecords.some((record) => selectedIds.has(record.id)) &&
                        !targetRecords.every((record) => selectedIds.has(record.id));
                    }
                  }}
                  onChange={selectScope}
                />
              </th>
              <th
                className="sticky z-40 border-b border-r border-border bg-muted px-2 py-2 text-center font-medium text-muted-foreground"
                style={{ left: SELECT_WIDTH, width: ROW_WIDTH }}
              >
                #
              </th>
              {columns.map((column, columnIndex) => {
                const frozen = columnIndex <= frozenIndex;
                const activeSort = sort?.column === column;
                return (
                  <th
                    key={column}
                    aria-sort={
                      activeSort
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={[
                      "border-b border-r border-border bg-muted px-2 py-2 text-left font-semibold",
                      frozen ? "sticky z-40 shadow-[2px_0_3px_-2px_hsl(var(--foreground)/0.4)]" : "",
                    ].join(" ")}
                    style={{
                      ...(frozen
                        ? { left: SELECT_WIDTH + ROW_WIDTH + columnIndex * DATA_WIDTH }
                        : {}),
                      width: DATA_WIDTH,
                    }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-1 truncate text-left"
                      onClick={() =>
                        setSort(
                          activeSort
                            ? {
                                column,
                                direction: sort.direction === "asc" ? "desc" : "asc",
                              }
                            : { column, direction: "asc" },
                        )
                      }
                      title={`Sort by ${column}`}
                    >
                      <span className="truncate">{column}</span>
                      {activeSort &&
                        (sort.direction === "asc" ? (
                          <ArrowUp className="h-3 w-3 flex-none" />
                        ) : (
                          <ArrowDown className="h-3 w-3 flex-none" />
                        ))}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="h-24 border-b border-border text-center text-muted-foreground"
                >
                  {workspace.records.length === 0 ? "No rows" : "No matching rows"}
                </td>
              </tr>
            ) : (
              pageRecords.map((record, rowIndex) => {
                const rowFrozen = frozenIndex >= 0;
                const rowNotes = workspace.rowAnnotations[record.id] ?? [];
                return (
                  <tr
                    key={record.id}
                    className={[
                      "group",
                      selectedIds.has(record.id) ? "bg-primary/5" : "hover:bg-muted/30",
                    ].join(" ")}
                  >
                    <td
                      className="sticky left-0 z-20 border-b border-r border-border bg-background px-2 py-1.5 text-center group-hover:bg-muted"
                      style={{ width: SELECT_WIDTH }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        aria-label={`Select row ${currentPage * pageSize + rowIndex + 1}`}
                        onClick={(event) =>
                          selectRecord(record.id, rowIndex, event)
                        }
                        onChange={() => undefined}
                      />
                    </td>
                    <td
                      className={[
                        "sticky z-20 border-b border-r border-border bg-background px-1 py-1.5 text-center tabular-nums text-muted-foreground group-hover:bg-muted",
                        rowFrozen ? "shadow-[2px_0_3px_-2px_hsl(var(--foreground)/0.4)]" : "",
                      ].join(" ")}
                      style={{ left: SELECT_WIDTH, width: ROW_WIDTH }}
                    >
                      <span>{currentPage * pageSize + rowIndex + 1}</span>
                      <div className="flex justify-center gap-0.5">
                        <button
                          type="button"
                          className={[
                            "text-muted-foreground hover:text-primary",
                            rowNotes.length ? "text-primary" : "opacity-0 group-hover:opacity-100",
                          ].join(" ")}
                          aria-label={`${rowNotes.length} row annotations`}
                          title={rowNotes.map((note) => note.text).join("\n") || "Add row annotation"}
                          onClick={() => openAnnotations({ recordId: record.id })}
                        >
                          <MessageSquareText className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete row"
                          title="Delete row"
                          onClick={() => deleteRecords([record.id], "Individual record")}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    {columns.map((column, columnIndex) => {
                      const frozen = columnIndex <= frozenIndex;
                      return (
                        <td
                          key={column}
                          ref={(element) => {
                            const key = JSON.stringify([record.id, column]);
                            if (element) cellRefs.current.set(key, element);
                            else cellRefs.current.delete(key);
                          }}
                          tabIndex={0}
                          className={[
                            "max-w-[320px] border-b border-r border-border bg-background px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary group-hover:bg-muted",
                            frozen ? "sticky z-20 shadow-[2px_0_3px_-2px_hsl(var(--foreground)/0.4)]" : "",
                          ].join(" ")}
                          style={{
                            ...(frozen
                              ? { left: SELECT_WIDTH + ROW_WIDTH + columnIndex * DATA_WIDTH }
                              : {}),
                            width: DATA_WIDTH,
                          }}
                          onDoubleClick={() => startEdit(record.id, column)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            const directions: Record<
                              string,
                              [number, number] | undefined
                            > = {
                              ArrowUp: [-1, 0],
                              ArrowDown: [1, 0],
                              ArrowLeft: [0, -1],
                              ArrowRight: [0, 1],
                              Tab: [0, event.shiftKey ? -1 : 1],
                            };
                            const direction = directions[event.key];
                            if (direction) {
                              if (event.key === "Tab") {
                                  const flatIndex =
                                    (currentPage * pageSize + rowIndex) *
                                      columns.length +
                                    columnIndex +
                                    direction[1];
                                  if (
                                    flatIndex < 0 ||
                                    flatIndex >= filteredRecords.length * columns.length
                                  ) {
                                    return;
                                  }
                                  event.preventDefault();
                                  const targetRecordIndex = Math.floor(
                                    flatIndex / columns.length,
                                  );
                                  const targetRecord =
                                    filteredRecords[targetRecordIndex];
                                  const targetColumn = columns[flatIndex % columns.length];
                                  if (targetRecord && targetColumn) {
                                    setPage(Math.floor(targetRecordIndex / pageSize));
                                    setPendingFocus({
                                      recordId: targetRecord.id,
                                      column: targetColumn,
                                    });
                                  }
                              } else {
                                event.preventDefault();
                                navigateCell(
                                  currentPage * pageSize + rowIndex,
                                  columnIndex,
                                  direction[0],
                                  direction[1],
                                );
                              }
                            } else if (event.key === "Enter" || event.key === "F2") {
                              event.preventDefault();
                              startEdit(record.id, column);
                            } else if (
                              event.key === "Delete" ||
                              event.key === "Backspace"
                            ) {
                              event.preventDefault();
                            }
                          }}
                        >
                          {renderValue(
                            record.id,
                            column,
                            record.row[column],
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{workspace.records.length.toLocaleString()} rows · {columns.length} columns</span>
          {filteredRecords.length !== workspace.records.length && (
            <span>· {filteredRecords.length.toLocaleString()} filtered</span>
          )}
          {showNullCounts && (
            <details className="relative">
              <summary className="cursor-pointer rounded px-1 hover:bg-muted">
                Null counts
              </summary>
              <div className="absolute bottom-7 left-0 z-20 max-h-40 min-w-48 overflow-auto rounded-md border border-border bg-card p-2 shadow-lg">
                {columns.map((column) => (
                  <div key={column}>{column}: {nullCounts[column]}</div>
                ))}
              </div>
            </details>
          )}
          <span className="hidden sm:inline">Double-click or press Enter to edit · Delete key does not remove rows</span>
        </div>
        {showPagination && filteredRecords.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              className="h-7 rounded-md border border-input bg-background px-1.5 text-[10px]"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} / page</option>)}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px]"
              disabled={currentPage <= 0}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className="min-w-12 text-center text-[10px] text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px]"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
