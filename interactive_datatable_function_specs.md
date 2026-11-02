# Interactive Data Table — Functional Specification

## 1. Overview

This specification defines an interactive, spreadsheet-like Data Table for a Data Analytics Web App. It combines advanced freeze panes, row selection, editing, deletion, annotations, and productivity features while preserving the integrity of the underlying dataset.

The feature must operate on the current working dataset and must not unexpectedly modify the original uploaded data.

## 2. Advanced Freeze Panes

**Selected behavior: Freeze headers and columns.**

Allow users to keep important table areas visible while scrolling horizontally and vertically.

### Required functionality

- Freeze the header row while scrolling vertically.
- Freeze one or multiple selected columns while scrolling horizontally.
- Freeze the header and selected columns simultaneously.
- Support spreadsheet-style freezing through a selected column. For example, freezing column C keeps columns A, B, and C visible.
- Allow users to unfreeze all panes.
- Maintain correct column alignment, widths, scrolling behavior, and sticky positioning.
- Ensure frozen areas remain visually distinguishable and do not overlap other table content.

Freezing panes changes only the table's presentation, not the underlying dataset.

## 3. Interactive Row Selection

**Selected behavior: Support page, filtered-results, and entire-dataset selection.**

Allow users to select individual rows or groups of rows for bulk operations.

### Required functionality

- Checkbox on each row.
- Header checkbox for selecting or deselecting rows.
- Ctrl-click (Windows/Linux) or Cmd-click (Mac) for selecting multiple individual rows.
- Shift-click for selecting a range of rows.
- Clear all selected rows.
- Display the number of selected rows.
- Support three selection scopes:
  - **Current page:** Select all rows currently displayed on the page.
  - **Filtered results:** Select every record matching the active filters, including records on other pages.
  - **Entire dataset:** Select every record in the working dataset, regardless of filters or pagination.

### Selection integrity

- Selection must use stable record identifiers rather than visible row positions or array indexes.
- Selection must remain reliable when sorting, filtering, scrolling, or changing pages.
- Clearly indicate whether selection applies to the current page, filtered results, or the entire dataset.
- Avoid silently applying bulk operations to more records than the user intended.
- Before a bulk operation, resolve and confirm the exact target records.

## 4. Row Editing

**Selected behavior: Both inline and bulk editing.**

Provide both individual and multi-record editing.

### 4.1 Inline editing

- Allow users to edit individual cells directly inside the table.
- Support entering edit mode through double-clicking a cell or using an explicit edit action.
- Provide Save and Cancel actions.
- Validate edited values according to the column's data type.
- Visually distinguish modified cells from unchanged cells.

### 4.2 Bulk editing

- Allow users to select multiple rows and apply the same value to a chosen column.
- Let users select the target column and specify the new value.
- Preview the affected records before applying the change.
- Validate the value against the target column's data type.
- Clearly indicate how many records will be modified.

### Editing safeguards

- Do not silently overwrite values.
- Prevent invalid values from being committed.
- Provide a way to cancel pending changes.
- Track modifications so users can review what changed.
- Editing must affect the working dataset, not the original uploaded file.

## 5. Row and Cell Annotations

**Selected behavior: Both row-level and cell-level annotations.**

Allow users to attach notes and contextual information to records without changing the actual data values.

### 5.1 Row-level annotations

- Add notes to an entire row.
- Edit and delete existing notes.
- Support multiple annotations per row.
- Display an annotation indicator on rows with notes.
- Provide a way to view all annotations associated with a row.

### 5.2 Cell-level annotations

- Attach notes to individual cells.
- Edit and delete cell annotations.
- Display an indicator on annotated cells.
- Allow users to view the note without modifying the cell's actual value.

### Annotation behavior

- Annotations must remain associated with the correct record and cell when users sort, filter, or reorder the table.
- Store annotations separately from dataset values.
- Allow users to search annotation text.
- Provide visual indicators without making the table unnecessarily cluttered.
- Use stable record identifiers and column identifiers to associate annotations; do not associate them using visible row positions.

## 6. Delete Rows

Allow users to delete individual or multiple selected records from the working dataset.

### Required functionality

- Delete a single row.
- Delete multiple selected rows.
- Provide a confirmation step before deleting multiple records.
- Display the number of records that will be deleted.
- Provide an Undo option after deletion.
- Update pagination, row counts, and filtered results appropriately.

### Data safety requirements

- Deletion must not permanently alter the original uploaded dataset.
- Deleted records should be recoverable through Undo, subject to the available undo history.
- Handle cases where selected records have already been removed or are no longer available.

## 7. Session-Based Persistence

**Selected behavior: Current working session only.**

Changes, annotations, and table preferences should be maintained during the current working session.

### Maintain during the session

- Cell edits.
- Bulk edits.
- Deleted rows, subject to Undo.
- Row-level annotations.
- Cell-level annotations.
- Freeze pane configuration.
- Current selection state, where appropriate.
- Undo/Redo history.
- Change history.

### Session boundaries

- Changes do not need to persist after the working session ends.
- Do not silently save these changes into the original uploaded file or permanently modify the saved dataset.
- Clearly communicate when changes are temporary.
- If the session is about to expire or the user navigates away, warn about unsaved session changes when technically possible.
- Define the session lifecycle using the application's existing session and state-management architecture.

## 8. Undo and Redo

Provide a reliable way to reverse and restore supported operations.

### Required functionality

- Undo the most recent supported operation.
- Redo an operation that was undone.
- Support undo/redo for:
  - Individual cell edits.
  - Bulk edits.
  - Row deletions.
  - Row annotation changes.
  - Cell annotation changes.
- Provide Undo and Redo controls.
- Support keyboard shortcuts where appropriate:
  - `Ctrl + Z` / `Cmd + Z`: Undo.
  - `Ctrl + Y` or `Ctrl + Shift + Z` / `Cmd + Shift + Z`: Redo.

Undo and Redo must operate on actual changes, not just visual table states. They must not accidentally reverse unrelated actions. New committed operations after an Undo should follow conventional redo-history invalidation behavior.

## 9. Change History

Provide a session-based history of modifications made to the working dataset.

Each history entry should capture, where applicable:

| Information     | Description                                        |
| --------------- | -------------------------------------------------- |
| Action          | Edit, bulk edit, delete, annotation, undo, or redo |
| Record          | Affected record identifier                         |
| Column          | Affected column, when applicable                   |
| Previous value  | Value before the modification                      |
| New value       | Value after the modification                       |
| Timestamp       | Time the operation occurred                        |
| Operation scope | Individual record or bulk operation                |

Users should be able to review changes and understand what happened to their data.

Change history should remain available during the current session. History should distinguish an original operation from a later Undo or Redo action, while keeping the resulting data state accurate.

## 10. Keyboard Navigation

Provide spreadsheet-like keyboard interaction to improve efficiency.

### Required behavior

- Arrow keys to navigate between cells.
- Enter to enter or confirm editing, depending on the current interaction state.
- Escape to cancel editing or close an active interaction.
- Tab and Shift + Tab to move between cells.
- Delete/Backspace behavior should be carefully controlled to prevent accidental data loss.
- Keyboard shortcuts for Undo and Redo.
- Clearly distinguish keyboard navigation from text entry while editing a cell.

Keyboard shortcuts must not interfere with normal browser behavior, text inputs, or assistive technology. Shortcuts should be disabled or adapted when focus is inside an input, textarea, or other editable control where the shortcut has a different expected meaning.

## 11. Export Selected Rows

Allow users to export selected records without exporting the entire dataset.

### Required functionality

- Export selected rows.
- Support exporting the current selection regardless of the active page.
- Respect the selected records' current working values, including session edits.
- Preserve column names and data types as appropriately supported by the export format.
- Provide clear feedback when no rows are selected.
- Prevent accidental export of the entire dataset when the user intended to export only selected records.
- Make the export scope clear before the export is generated.

The implementation should follow the app's existing export formats and conventions rather than introduce an unrelated export mechanism.

## 12. Proposed Data Table Layout

The following is a conceptual arrangement of controls, not a requirement to reproduce an exact design.

```text
+------------------------------------------------------------------+
| Data Table                                      Working session  |
+------------------------------------------------------------------+
| 12 selected       3 modified       2 annotated                    |
| [Edit] [Delete] [Annotate] [Export selected]                      |
+------------------------------------------------------------------+
| Table controls                                [Undo] [Redo] [History]
| Freeze panes: Header + Columns A-C                               |
+------------------------------------------------------------------+
| [x] | ID  | Name       | Status  | Notes                           |
| [x] | 001 | Record A   | Active  | Comment                         |
| [x] | 002 | Record B   | Pending | —                               |
| [x] | 003 | Record C   | Active  | Comment                         |
+------------------------------------------------------------------+
```

## 13. Table-Level Filtering

Ordinary filtering is a Data Table view feature and must not replace or mutate
the working dataset.

- Filter by one or more columns using the supported comparison conditions.
- Combine conditions with AND or OR.
- Edit or remove individual conditions, or clear all conditions.
- Show the matching row count alongside the underlying working-row count.
- Apply filtering before sorting and pagination; selection scopes must use the
  active filtered view except when the user explicitly selects the entire
  dataset.
- Recalculate filters from the complete working dataset whenever conditions
  change, so replacing one condition with another can reveal previously hidden
  rows.

The separate Filter & Sort operation remains available when a user intends to
produce a transformed result dataset. It is not the ordinary Data Table view
filter.

## 14. Operation History

Record successful data operations in execution order with a stable identifier,
timestamp, configuration snapshot, and result snapshot. A history entry can be
inspected without changing the current working result. Restoring an entry is a
separate, explicit action; it must not re-execute the operation. Keep newer
entries available after restoring an earlier result so users can return to
later work.
