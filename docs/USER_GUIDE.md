# User Guide – Data Analytics System

This guide shows how to use the app end-to-end and how to get the most value from it: **combine datasets**, clean data, search, aggregate, export, and (optionally) ask AI for guidance.

---

## Quick start (5 minutes)

1. **Upload** one or more CSV/Excel files from the sidebar (Upload → **Browse**).  
   - Each file becomes a dataset in **Datasets**.
2. Click a dataset in **Datasets** to **inspect** it.
3. Use the **Operations** panel to run transformations. Each operation writes to **Result**.
4. Use **Export** to download the current result as CSV/Excel/JSON.

Tip: If an operation becomes long (many conditions), the operations panel scrolls so the table stays visible.

---

## Mental model (how the app works)

- **Datasets**: The raw uploaded tables (unchanged).
- **Result**: The output of the last operation.
- **Current result as input**: Many operations can use “Current result” as their source so you can chain steps.
- **Undo**: Reverts to the previous result (history is capped).
- **Saved results**: Save a named snapshot of the current result (for quick recall).
- **Recent session**: Save/restore datasets + current result in the browser.

---

## Inspecting data (before you operate)

When viewing a dataset or result:

- **Row count**: shown above the table.
- **Null/empty counts per column**: expand the details section to see missing values by column.
- **Pagination**: change page size and navigate across pages.

Why this matters:
- Null counts tell you which columns are safe to join on (keys should be mostly non-empty).
- Row count changes help confirm each operation did what you expected.

---

## Upload best practices

- **Prefer stable IDs** for joins (e.g. `employee_id`, `order_id`, `slack_id`). If you don’t have an ID, email often works.
- **Large files**: files above a threshold use server-side parsing (for CSV/XLSX).
- If you upload multiple files at once, each becomes its own dataset.

---

## Operations reference (what each feature is for)

### Duplicate check (data quality)

Use when you need to find or remove repeated records.

- **Mark duplicates**: adds `_is_duplicate` and `_duplicate_count`.
- **Remove duplicates**: keeps one row per key.
- **Keep first / keep last**: controls which duplicate survives.
- **Ignore case / trim spaces**: helps when keys have formatting differences (`\"Alice\"` vs `\" alice \"`).

Common HR example:
- Key = (`email`, `hire_date`) to find accidental repeated onboarding rows.

---

### Filter & sort (narrow down and order)

Use when you need a “working set” and want to order it for review.

- **Multiple conditions**: build complex filters (AND / OR).
- **Typed values**:
  - **Text**: equals/contains.
  - **Number**: gt/gte/lt/lte.
  - **Date**: date-aware comparisons (e.g. “before 2024-12-15”).
- **Multi-column sort**: sort by Date then Amount, etc.
- **Date sort** checkbox: compare a sort column as a date.

Common HR example:
- `last_active_date` (Date) < cutoff AND `status` = Inactive.

---

### Regex search (find patterns fast)

Use for audits and quick discovery.

- Search one column or all columns.
- Matches are **highlighted** in the result table.

Example:
- Find all rows with “Widget” in any product field.

---

### Lookup (VLOOKUP-style enrichment)

Use to “bring columns over” from a lookup table.

- **Multiple key columns**: composite lookups.
- **Same-table lookup**: lookup within a single dataset (useful for manager relationships).

Common HR example:
- In `employees`, lookup `manager_id` → `id` to bring manager name.

---

### Merge/Join (combine workbooks / worksheets)

Use when your data lives in **multiple files** (e.g. HR master + Slack export + terminations register).

You choose:
- **Left dataset**: the main list you want to keep.
- **Right dataset**: the dataset you want to attach columns from.
- **Left/right key columns**: which columns must match.
- **Join type**:
  - **Inner**: keep only rows that exist in both.
  - **Left**: keep all left rows; attach right matches; non-matches become blank.
  - **Right**: keep all right rows; attach left matches.
  - **Full**: keep all rows from both; good for reconciliation.

Practical guidance:
- If one dataset is your **source of truth**, make it the **left** side and use **Left join**.
- Use **Full join** when you want to find mismatches between systems.

---

### Aggregate (summaries and pivot tables)

Use to produce totals and roll-ups for reporting.

Two modes:
- **Group by + aggregate**: totals by one or more dimensions (e.g. Sum(Amount) by Region).
- **Pivot table**: row dimension × column dimension with an aggregate in each cell.

Tips:
- Start with **Count** to sanity-check groups.
- Add multiple aggregates in one run (e.g. Sum + Count).

---

## End-to-end workflow examples

### Example A: HR payroll exclusion from multiple workbooks (Slack twist)

Use these sample files:
- `samples/hr_master.csv`
- `samples/slack_export.csv`
- `samples/terminations_register.csv`

Workflow:
1. **Merge** `hr_master` (left) with `slack_export` (right) on `email`, join type **Left**.
2. **Filter** result where `status = Inactive OR Offboarded`.
3. (Optional) **Merge** that filtered result (left) with `terminations_register` (right) on `email`, join type **Left** to add termination date and reason.
4. **Sort** by `name`.
5. **Export** to CSV/Excel for payroll.

Expected row counts in the sample:
- 20 after the first merge
- 8 after filtering inactive/offboarded

See the step-by-step doc: `samples/HR_INACTIVE_EMPLOYEE_TASKS.md`.

---

### Example B: Orders + Products enrichment

Use:
- `samples/orders.csv` and `samples/products.csv`

Workflow:
1. **Merge** orders (left) with products (right) on `product_id`, join type **Left**.
2. Filter, aggregate, or export.

---

## Exporting (hand-off ready outputs)

- Export **current result** (or the selected dataset) as:
  - **CSV** (simple shareable)
  - **Excel** (for stakeholders)
  - **JSON** (for downstream tools)
- For large results, Excel export uses a **server-side endpoint** automatically.

---

## Saved results and sessions (repeatable work)

- **Saved results**: save a named snapshot (e.g. “Payroll exclusion – Mar 2026”).
- **Recent session**: save/restore datasets + result after refresh.

Use these when you do recurring monthly/weekly reporting.

---

## Ask AI (optional)

If enabled (backend `OPENAI_API_KEY` is set), the **Ask AI** tab can:
- Summarize your data and suggest next operations
- Suggest join keys and filter rules
- Explain which operation to use for a goal

The AI is sent:
- Column names, and
- Up to the first 5 rows as a sample

---

## Troubleshooting

- **My join produced fewer rows than expected**
  - If you used **Inner join**, try **Left join**.
  - Check key columns for blanks, case differences, or extra spaces (use “Trim spaces / Ignore case” where relevant).

- **Dates don’t filter correctly**
  - Set the filter condition **Type = Date**.
  - Use ISO format like `YYYY-MM-DD` for best results.

- **Dropdowns overlap / layout feels cramped**
  - Use the collapsible sidebar sections to reduce clutter.
  - The operations panel is capped and scrolls to keep the table visible.

---

## Sample data

- General feature samples: `samples/SAMPLE_QUESTIONS.md`
- HR multi-workbook workflow: `samples/HR_INACTIVE_EMPLOYEE_TASKS.md`

