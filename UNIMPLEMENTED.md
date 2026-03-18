# Unimplemented Operations and Features

This list is based on the [Data Analytics System definition](.cursor/plans/data_analytics_system_definition_cc73e0eb.plan.md) and the current codebase. Items below are either called out as optional in the plan or are natural extensions not yet built.

---

## Data quality (duplicate check)

- **Remove duplicates** – Option to output only unique rows (drop duplicates) instead of marking them.
- **Keep first / keep last** – When removing duplicates, choose whether to keep the first or last row per key (currently only “mark” is implemented).

---

## Lookups

- **Multiple key columns** – Lookup/join on a composite key (e.g. `[Country, Code]`) instead of a single column per side.
- **Same-table lookup** – Lookup within the same dataset (e.g. “verify value exists in another column of the same sheet”) with a dedicated UI.

---

## Filter and sort

- **Multiple filter conditions** – Combine several conditions (e.g. Column A = "X" AND Column B > 10) with AND/OR.
- **Multi-column sort** – Sort by several columns in order (e.g. sort by Name, then by Date).

---

## Advanced search (regex)

- **Highlight matches** – Visually highlight the matched text in the result table cells.
- **Search all columns** is implemented (checkbox); no other regex UX gaps noted.

---

## Merge/join

- **Multiple key columns** – Join on composite keys (e.g. `[ID, Date]` for left and right) instead of a single key per side.

---

## Aggregation

- **Simple pivot** – Pivot-style output: one dimension as rows, another as columns, values as an aggregate (e.g. rows = Region, columns = Year, values = Sum(Sales)).
- **Multiple aggregate columns** – Apply more than one aggregate (e.g. Sum(Revenue) and Count(Orders)) in a single run; currently only one aggregate column per run.

---

## Inspect / data table

- **Null (empty) counts per column** – In inspect view, show count of empty/null values per column.
- **Pagination or virtualization** – Navigate or scroll through all rows; currently only the first 50 rows are shown.

---

## Export

- **Server-side export for very large data** – Use the existing Django `POST /api/export/xlsx/` for big result sets instead of generating XLSX in the browser (to avoid memory limits).
- **Additional export formats** – e.g. JSON, or more Excel options, if desired.

---

## UX and persistence (from plan “later” list)

- **Undo / redo** – Revert or reapply the last operation(s).
- **Named steps / recipes** – Save a sequence of operations (e.g. “Filter → Lookup → Export”) and replay it.
- **Recent files in local storage** – Remember last uploaded files or session for quick reload (no login).

---

## Other (from plan “etc.”)

- **Formulas** – Excel-like or custom formulas in cells.
- **Date parsing / date-aware operations** – Treat columns as dates and support date filters or grouping.
- **More dedupe strategies** – e.g. fuzzy matching, ignore case, trim spaces (in addition to exact key match).

---

## Backend / processing

- **Server-side parsing for very large files** – Upload file to Django, parse with pandas/openpyxl, stream or return JSON for datasets that are too large to parse in the browser.
- **Large-file streaming** – Chunked read/process for big CSV/Excel on the server.
