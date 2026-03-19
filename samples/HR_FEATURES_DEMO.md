# HR Data Analytics Features – Demo Guide

This guide walks you through the HR-focused features using the sample CSV files in the `samples/` folder. Use these steps to validate uploads, detect inactivity, run exception reports, clean data, and compare datasets.

---

## Sample Files Overview

| File | Purpose |
|------|--------|
| **hr_daily_activity.csv** | Main daily export: 21 rows, mixed status casing, one duplicate (E003), varied `last_activity` dates for inactivity demo. |
| **hr_daily_activity_messy.csv** | Same structure with extra spaces, missing status/name, mixed case – for **validation** and **Clean data** demos. |
| **hr_master_subset.csv** | Subset of 8 employees – use as “master” so some daily rows are **Missing in master**. |
| **hr_daily_activity_next.csv** | “Next day” version: E005/E007 removed, E021 added, E009 status changed – for **Compare datasets** demo. |

---

## 1. Upload & Validation

**Goal:** See a validation summary before adding data to the app (required columns, null counts, invalid rows).

### Steps

1. Open the app and go to the **Upload** area.
2. In **Required columns (optional)**, enter:
   ```text
   employee_id, name, status, last_activity
   ```
3. **Upload** `samples/hr_daily_activity_messy.csv`.
4. Check the **Validation summary**:
   - **Rows / columns** count.
   - **Missing required:** none (all four columns exist).
   - **Rows with missing required values:** 2 (E005 has empty status, E007 has empty name).
   - Expand **Null/empty counts by column** to see per-column empty counts.
5. Click **Add to datasets** to use the data, or **Discard** to drop it.

**Tip:** Leave **Required columns** empty to only see row/column counts and null counts, without “missing required” or invalid-row checks.

---

## 2. Inactivity Check

**Goal:** Flag employees with no activity for more than X days (e.g. 3).

### Steps

1. **Upload** `samples/hr_daily_activity.csv` and add it to datasets (e.g. name: “Daily activity”).
2. Open **Operations** → **Inactivity**.
3. **Dataset:** “Daily activity”.
4. **Date / last activity column:** `last_activity`.
5. **Inactive after (days):** `3`.
6. **Reference date:** leave empty (uses today) or set a fixed date (e.g. `2025-03-18`).
7. Click **Run inactivity check**.

**Result:** The result table has extra columns:

- **`_days_inactive`** – days since `last_activity` (relative to reference date).
- **`_is_inactive`** – `1` if `_days_inactive` > 3, else `0`.

Use **Filter & sort** on `_is_inactive` = 1 to list only inactive employees, or export for payroll exclusion.

---

## 3. Exception Report

**Goal:** One report for Duplicates, Inactive, and Missing in master.

### Steps

1. Add two datasets:
   - **Daily:** upload `hr_daily_activity.csv` (e.g. “Daily activity”).
   - **Master:** upload `hr_master_subset.csv` (e.g. “Master subset”).
2. Open **Operations** → **Exceptions**.
3. **Primary dataset:** “Daily activity”.
4. **Key columns:** select `employee_id` (and optionally `name` if you use a composite key).
5. **Date column:** `last_activity` (optional but recommended).
6. **Inactive after (days):** `3`.
7. **Master dataset:** “Master subset”.
8. **Master key columns:** `employee_id`.
9. Click **Run exception report**.

**Result:** One table with **`_exception_type`** per row, e.g.:

- `Duplicate` – duplicate key (e.g. E003 appears twice in daily).
- `Inactive` – no activity for more than 3 days.
- `Missing in master` – key not in master subset (e.g. E003, E005, E007, …).
- Combined, e.g. `Duplicate; Inactive`.

Filter or export by `_exception_type` to handle each exception type.

---

## 4. Clean Data

**Goal:** Trim spaces, normalize case, standardize status values (e.g. Active / Inactive / Needs Review).

### Steps

1. Use **Daily activity** from `hr_daily_activity.csv` (or the messy file **hr_daily_activity_messy.csv** for stronger effect).
2. Open **Operations** → **Clean**.
3. **Dataset:** “Daily activity”.
4. **Columns to clean:** leave empty (all columns) or select only `name`, `status`, `department`.
5. Check **Trim spaces**.
6. Optionally check **Lowercase** or **Uppercase** (usually only for specific columns; for status we use standardize instead).
7. **Standardize column:** `status`.
8. **Mappings** (one per line, `value => Normalized`):
   ```text
   active => Active
   ACTIVE => Active
   inactive => Inactive
   Inactive => Inactive
   needs review => Needs Review
   Needs Review => Needs Review
   ```
9. Click **Run clean**.

**Result:** Same table with trimmed and standardized `status` (and any other cleaned columns). Use this output before **Inactivity** or **Exception report** for consistent status values.

---

## 5. Compare Datasets (Change Summary)

**Goal:** See Added, Removed, Unchanged, and Updated rows between two exports.

### Steps

1. Add two datasets:
   - **Old:** `hr_daily_activity.csv` (e.g. “Daily Mar 18”).
   - **New:** `hr_daily_activity_next.csv` (e.g. “Daily Mar 19”).
2. Open **Operations** → **Compare**.
3. **Old / previous dataset (A):** “Daily Mar 18”.
4. **New / current dataset (B):** “Daily Mar 19”.
5. **Key columns:** `employee_id`.
6. Check **Detect updated rows** to compare non-key columns (e.g. status, last_activity).
7. Click **Compare**.

**Result:** Table with:

- **`_change_type`:** `added` | `removed` | `unchanged` | `updated`.
- **`_key`:** key value (e.g. employee_id).

In the sample data you should see:

- **added:** E021 (Tom Phillips).
- **removed:** E005, E007.
- **updated:** E009 (e.g. status or last_activity changed).
- **unchanged:** remaining rows.

Filter by `_change_type` to review only changes, or export for audit.

---

## Suggested Workflow (End-to-End)

1. **Upload** daily CSV with required columns set → review **validation**, then **Add to datasets**.
2. **Clean** the dataset (trim + standardize `status`) → run **Inactivity check** (e.g. 3 days).
3. **Exception report** with master subset → fix duplicates, inactive, and missing-in-master.
4. **Filter & sort** on `_is_inactive` = 0 and status = Active → **Export** for payroll.
5. Next day: **Compare** previous export vs new daily → review added/removed/updated, then repeat from step 1.

---

## Date Format for `last_activity`

The app parses common date formats (e.g. `YYYY-MM-DD`, `MM/DD/YYYY`). The samples use **YYYY-MM-DD** (e.g. `2025-03-18`). For **Reference date** in Inactivity check, use the same format or leave blank for “today”.
