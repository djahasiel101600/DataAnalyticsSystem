import { describe, expect, it } from "vitest";
import {
  commitTableCommand,
  createAnnotation,
  createAnnotationCommand,
  createDeleteCommand,
  createEditCommand,
  createTableWorkspace,
  redoTableWorkspace,
  undoTableWorkspace,
} from "./table-workspace";

describe("table workspace", () => {
  it("edits working rows without mutating source rows and supports undo/redo", () => {
    const sourceRows = [
      { name: "Ada", score: 8 },
      { name: "Lin", score: 9 },
    ];
    let workspace = createTableWorkspace(sourceRows);
    const record = workspace.records[0];

    const edit = createEditCommand("Edit", "Individual record", [
      {
        recordId: record.id,
        column: "score",
        before: 8,
        after: 10,
      },
    ]);
    if (!edit) throw new Error("Expected edit command");
    workspace = commitTableCommand(workspace, edit);

    expect(workspace.records[0].row.score).toBe(10);
    expect(sourceRows[0].score).toBe(8);
    expect(workspace.history[0].action).toBe("Edit");

    workspace = undoTableWorkspace(workspace);
    expect(workspace.records[0].row.score).toBe(8);
    expect(workspace.history[workspace.history.length - 1]?.action).toBe("Undo");

    workspace = redoTableWorkspace(workspace);
    expect(workspace.records[0].row.score).toBe(10);
    expect(workspace.history[workspace.history.length - 1]?.originalAction).toBe("Edit");
  });

  it("restores multi-row deletions to their original order", () => {
    const workspace = createTableWorkspace([
      { name: "first" },
      { name: "second" },
      { name: "third" },
      { name: "fourth" },
    ]);
    const deletedIds = [workspace.records[1].id, workspace.records[3].id];
    const command = createDeleteCommand(workspace, deletedIds, "Filtered results");
    expect(command?.type).toBe("delete");
    if (command?.type !== "delete") throw new Error("Expected delete command");

    const afterDelete = commitTableCommand(workspace, command);
    expect(afterDelete.records.map((record) => record.row.name)).toEqual([
      "first",
      "third",
    ]);
    const afterUndo = undoTableWorkspace(afterDelete);
    expect(afterUndo.records.map((record) => record.row.name)).toEqual([
      "first",
      "second",
      "third",
      "fourth",
    ]);
  });

  it("keeps row and cell annotations separate and undoable", () => {
    const workspace = createTableWorkspace([{ name: "Ada" }]);
    const recordId = workspace.records[0].id;
    const rowNote = createAnnotation("Review this row");
    let next = commitTableCommand(
      workspace,
      createAnnotationCommand(
        "Row annotation",
        "Individual record",
        recordId,
        undefined,
        [],
        [rowNote],
      ),
    );
    const cellNote = createAnnotation("Check the name");
    next = commitTableCommand(
      next,
      createAnnotationCommand(
        "Cell annotation",
        "Individual cell",
        recordId,
        "name",
        [],
        [cellNote],
      ),
    );

    expect(next.rowAnnotations[recordId]).toEqual([rowNote]);
    expect(next.cellAnnotations[JSON.stringify([recordId, "name"])]).toEqual([
      cellNote,
    ]);
    next = undoTableWorkspace(next);
    expect(next.cellAnnotations[JSON.stringify([recordId, "name"])]).toBeUndefined();
    expect(next.rowAnnotations[recordId]).toEqual([rowNote]);
  });

  it("invalidates redo after a new operation", () => {
    const workspace = createTableWorkspace([{ value: "before" }]);
    const recordId = workspace.records[0].id;
    const edit = createEditCommand("Edit", "Individual record", [
      { recordId, column: "value", before: "before", after: "after" },
    ]);
    if (!edit) throw new Error("Expected edit command");
    const changed = commitTableCommand(workspace, edit);
    const undone = undoTableWorkspace(changed);
    const secondEdit = createEditCommand("Edit", "Individual record", [
      { recordId, column: "value", before: "before", after: "new" },
    ]);
    if (!secondEdit) throw new Error("Expected second edit command");
    const final = commitTableCommand(undone, secondEdit);

    expect(final.redoStack).toHaveLength(0);
    expect(redoTableWorkspace(final)).toBe(final);
  });
});
