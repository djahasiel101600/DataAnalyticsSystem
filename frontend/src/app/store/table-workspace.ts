import type { DataRow } from "@/entities/dataset";

export type TableAction =
  | "Edit"
  | "Bulk edit"
  | "Delete"
  | "Row annotation"
  | "Cell annotation";

export interface TableRecord {
  id: string;
  originalRow: DataRow;
  row: DataRow;
}

export interface TableAnnotation {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface TableHistoryEntry {
  id: string;
  action: TableAction | "Undo" | "Redo";
  originalAction?: TableAction;
  recordId: string;
  column?: string;
  previousValue?: unknown;
  newValue?: unknown;
  timestamp: string;
  operationScope: string;
}

interface CellChange {
  recordId: string;
  column: string;
  before: DataRow[string];
  after: DataRow[string];
}

interface EditCommand {
  type: "edit";
  action: "Edit" | "Bulk edit";
  scope: string;
  changes: CellChange[];
}

interface DeleteCommand {
  type: "delete";
  action: "Delete";
  scope: string;
  deleted: { record: TableRecord; index: number }[];
}

interface AnnotationCommand {
  type: "annotation";
  action: "Row annotation" | "Cell annotation";
  scope: string;
  recordId: string;
  column?: string;
  before: TableAnnotation[];
  after: TableAnnotation[];
}

export type TableCommand = EditCommand | DeleteCommand | AnnotationCommand;

export interface TableWorkspace {
  baseRows: DataRow[];
  records: TableRecord[];
  rowAnnotations: Record<string, TableAnnotation[]>;
  cellAnnotations: Record<string, TableAnnotation[]>;
  selectedRecordIds: string[];
  frozenColumns: string[];
  undoStack: TableCommand[];
  redoStack: TableCommand[];
  history: TableHistoryEntry[];
}

let recordSequence = 0;
let annotationSequence = 0;
let historySequence = 0;
const MAX_UNDO = 100;

export function createTableWorkspace(baseRows: DataRow[]): TableWorkspace {
  return {
    baseRows,
    records: baseRows.map((row) => ({
      id: `record-${++recordSequence}`,
      originalRow: row,
      row,
    })),
    rowAnnotations: {},
    cellAnnotations: {},
    selectedRecordIds: [],
    frozenColumns: [],
    undoStack: [],
    redoStack: [],
    history: [],
  };
}

export function createAnnotation(text: string): TableAnnotation {
  const timestamp = new Date().toISOString();
  return {
    id: `annotation-${++annotationSequence}`,
    text,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function commandEntries(
  command: TableCommand,
): { recordId: string; column?: string; previousValue: unknown; newValue: unknown }[] {
  if (command.type === "edit") {
    return command.changes.map((change) => ({
      recordId: change.recordId,
      column: change.column,
      previousValue: change.before,
      newValue: change.after,
    }));
  }
  if (command.type === "delete") {
    return command.deleted.map(({ record }) => ({
      recordId: record.id,
      previousValue: record.row,
      newValue: null,
    }));
  }
  return [
    {
      recordId: command.recordId,
      ...(command.column === undefined ? {} : { column: command.column }),
      previousValue: command.before,
      newValue: command.after,
    },
  ];
}

function createHistoryEntries(
  command: TableCommand,
  mode: "apply" | "undo" | "redo",
): TableHistoryEntry[] {
  return commandEntries(command).map((entry) => ({
    id: `history-${++historySequence}`,
    action: mode === "apply" ? command.action : mode === "undo" ? "Undo" : "Redo",
    ...(mode === "apply" ? {} : { originalAction: command.action }),
    recordId: entry.recordId,
    ...(entry.column === undefined ? {} : { column: entry.column }),
    previousValue: mode === "undo" ? entry.newValue : entry.previousValue,
    newValue: mode === "undo" ? entry.previousValue : entry.newValue,
    timestamp: new Date().toISOString(),
    operationScope: command.scope,
  }));
}

function applyCommand(
  workspace: TableWorkspace,
  command: TableCommand,
  direction: "forward" | "backward",
): Pick<TableWorkspace, "records" | "rowAnnotations" | "cellAnnotations"> {
  if (command.type === "edit") {
    const records = workspace.records.map((record) => {
      const changes = command.changes.filter(
        (change) => change.recordId === record.id,
      );
      if (changes.length === 0) return record;
      const row = { ...record.row };
      for (const change of changes) {
        row[change.column] = direction === "forward" ? change.after : change.before;
      }
      return { ...record, row };
    });
    return {
      records,
      rowAnnotations: workspace.rowAnnotations,
      cellAnnotations: workspace.cellAnnotations,
    };
  }

  if (command.type === "delete") {
    if (direction === "forward") {
      const removedIds = new Set(command.deleted.map(({ record }) => record.id));
      return {
        records: workspace.records.filter((record) => !removedIds.has(record.id)),
        rowAnnotations: workspace.rowAnnotations,
        cellAnnotations: workspace.cellAnnotations,
      };
    }
    const records = [...workspace.records];
    for (const item of [...command.deleted].sort((a, b) => a.index - b.index)) {
      if (!records.some((record) => record.id === item.record.id)) {
        records.splice(Math.min(item.index, records.length), 0, item.record);
      }
    }
    return {
      records,
      rowAnnotations: workspace.rowAnnotations,
      cellAnnotations: workspace.cellAnnotations,
    };
  }

  const key =
    command.column === undefined
      ? command.recordId
      : JSON.stringify([command.recordId, command.column]);
  const notes = direction === "forward" ? command.after : command.before;
  const updateMap = (
    map: Record<string, TableAnnotation[]>,
    shouldUpdate: boolean,
  ) => {
    if (!shouldUpdate) return map;
    const next = { ...map };
    if (notes.length === 0) delete next[key];
    else next[key] = notes;
    return next;
  };
  return {
    records: workspace.records,
    rowAnnotations: updateMap(
      workspace.rowAnnotations,
      command.column === undefined,
    ),
    cellAnnotations: updateMap(
      workspace.cellAnnotations,
      command.column !== undefined,
    ),
  };
}

export function commitTableCommand(
  workspace: TableWorkspace,
  command: TableCommand,
): TableWorkspace {
  return {
    ...workspace,
    ...applyCommand(workspace, command, "forward"),
    undoStack: [...workspace.undoStack.slice(-(MAX_UNDO - 1)), command],
    redoStack: [],
    history: [...workspace.history, ...createHistoryEntries(command, "apply")],
  };
}

export function undoTableWorkspace(workspace: TableWorkspace): TableWorkspace {
  const command = workspace.undoStack[workspace.undoStack.length - 1];
  if (!command) return workspace;
  return {
    ...workspace,
    ...applyCommand(workspace, command, "backward"),
    undoStack: workspace.undoStack.slice(0, -1),
    redoStack: [...workspace.redoStack, command],
    history: [...workspace.history, ...createHistoryEntries(command, "undo")],
    selectedRecordIds:
      command.type === "delete"
        ? Array.from(
            new Set([
              ...workspace.selectedRecordIds,
              ...command.deleted.map(({ record }) => record.id),
            ]),
          )
        : workspace.selectedRecordIds,
  };
}

export function redoTableWorkspace(workspace: TableWorkspace): TableWorkspace {
  const command = workspace.redoStack[workspace.redoStack.length - 1];
  if (!command) return workspace;
  const deletedIds =
    command.type === "delete"
      ? new Set(command.deleted.map(({ record }) => record.id))
      : new Set<string>();
  return {
    ...workspace,
    ...applyCommand(workspace, command, "forward"),
    undoStack: [...workspace.undoStack, command].slice(-MAX_UNDO),
    redoStack: workspace.redoStack.slice(0, -1),
    history: [...workspace.history, ...createHistoryEntries(command, "redo")],
    selectedRecordIds: workspace.selectedRecordIds.filter(
      (id) => !deletedIds.has(id),
    ),
  };
}

export function createEditCommand(
  action: "Edit" | "Bulk edit",
  scope: string,
  changes: CellChange[],
): TableCommand | null {
  return changes.some((change) => !Object.is(change.before, change.after))
    ? { type: "edit", action, scope, changes }
    : null;
}

export function createDeleteCommand(
  workspace: TableWorkspace,
  recordIds: string[],
  scope: string,
): TableCommand | null {
  const ids = new Set(recordIds);
  const deleted = workspace.records.flatMap((record, index) =>
    ids.has(record.id) ? [{ record, index }] : [],
  );
  return deleted.length > 0
    ? { type: "delete", action: "Delete", scope, deleted }
    : null;
}

export function createAnnotationCommand(
  action: "Row annotation" | "Cell annotation",
  scope: string,
  recordId: string,
  column: string | undefined,
  before: TableAnnotation[],
  after: TableAnnotation[],
): TableCommand {
  return {
    type: "annotation",
    action,
    scope,
    recordId,
    ...(column === undefined ? {} : { column }),
    before,
    after,
  };
}
