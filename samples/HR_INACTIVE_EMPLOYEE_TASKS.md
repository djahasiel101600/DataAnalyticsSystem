# HR Task: Monitor Inactive Employees for Payroll Exclusion (Multi‑Workbook)

This guide uses **three separate worksheets/workbooks** that mimic real HR and Slack exports. You will **combine** them with **Merge/Join**, then filter and export so inactive employees are **excluded from the next payroll**.

---

## The three workbooks (upload as separate files)

| File | Role | Key columns |
|------|------|-------------|
| **`hr_master.csv`** | HR’s master employee list | employee_id, name, email, role, department, manager_email, hire_date, location |
| **`slack_export.csv`** | Slack activity export | slack_id, email, last_active_date, status (Active / Inactive / Offboarded) |
| **`terminations_register.csv`** | HR terminations log | email, termination_date, reason |

- **Link key between workbooks:** `email` (same person in HR master, Slack, and terminations).
- **Goal:** Combine HR master + Slack to get “who is inactive,” then optionally add termination dates from the register, and produce the payroll-exclusion list.

---

## Task 1: Combine HR master and Slack export (Merge workbooks)

**Goal:** One table that has both HR details (name, department, etc.) and Slack status.

1. Upload **all three** files in the app: `hr_master.csv`, `slack_export.csv`, `terminations_register.csv`. You’ll see three datasets in the sidebar.
2. Go to **Merge** (under Operations).
3. **Left dataset:** **hr_master** (HR’s list – we keep every employee and add Slack data when it exists).
4. **Right dataset:** **slack_export** (Slack activity).
5. **Left key column(s):** select **email**.
6. **Right key column(s):** select **email**.
7. **Join type:** **Left** (keep all HR employees; add Slack columns where email matches).
8. Click **Run**.

**Expected:** One table with all HR columns plus `slack_id`, `last_active_date`, and `status` from Slack. Rows that exist in HR but not in Slack will have empty status (you can treat those as “no Slack” or exclude later).

---

## Task 2: Filter to inactive and offboarded only (payroll exclusion list)

**Goal:** Keep only employees who must be **excluded from the next payroll** (Slack status = Inactive or Offboarded).

1. **Filter & sort** – Source: **Current result** (the merged table from Task 1).
2. Add **first condition:**
   - Column: **status**
   - Operator: **Equals**
   - Value: `Inactive`
3. **Combine with:** **OR**
4. Add **second condition:**
   - Column: **status**
   - Operator: **Equals**
   - Value: `Offboarded`
5. Click **Apply filter & sort**.

**Expected:** **8 rows** (6 Inactive + 2 Offboarded). This is your core payroll-exclusion list from the combined workbook.

---

## Task 3 (Optional): Add termination dates from the terminations register

**Goal:** Enrich the exclusion list with **termination_date** and **reason** from the terminations workbook for the 2 offboarded employees.

1. Start from the **current result** (8 rows from Task 2).
2. Go to **Merge** again.
3. **Left dataset:** **Current result** (the 8-row exclusion list).
4. **Right dataset:** **terminations_register**.
5. **Left key column(s):** **email**
6. **Right key column(s):** **email**
7. **Join type:** **Left** (keep all 8; add termination_date and reason where there is a match).
8. Run.

**Expected:** Same 8 rows, with two new columns: `termination_date` and `reason`. The 2 offboarded employees (Daniel White, Rachel Robinson) will have dates and reasons; the 6 Inactive will have those columns empty. Payroll can use this for reporting.

---

## Task 4: Sort the exclusion list for payroll

**Goal:** Hand off a clean, sorted list (e.g. by name).

1. **Filter & sort** – Source: **Current result**.
2. Add **Sort:** Column **name**, Direction **Ascending**.
3. (Optional) Add a second sort: **employee_id** Ascending.
4. Apply.

**Expected:** Same 8 rows, sorted A–Z by name (and optionally by employee_id), ready for payroll.

---

## Task 5: Count exclusions by department (reporting)

**Goal:** Know how many employees to exclude per department (from the combined data).

1. With the **current result** still the 8-row exclusion list (with or without Task 3).
2. Go to **Aggregate**.
3. Mode: **Group by + aggregate**.
4. Group by: **department**.
5. Add aggregate: Column **name** (or **email**), Function **Count**.
6. Run.

**Expected:** One row per department with a count, e.g. **Fleet: 6**, **Warehouse: 1**. (HR has 0 in the exclusion list in this sample.)

---

## Task 6: Count by status (Inactive vs Offboarded)

**Goal:** Separate counts for “Inactive” vs “Offboarded” for HR reporting.

1. Source: **Current result** (8-row exclusion list).
2. **Aggregate** – Group by: **status**; Aggregate: **Count** on **name** (or **email**).
3. Run.

**Expected:** **Inactive: 6**, **Offboarded: 2**.

---

## Task 7: Export the payroll-exclusion list

**Goal:** Send the final list (combined workbooks, filtered and sorted) to payroll.

1. With the **current result** showing the 8-row exclusion list (sorted if you did Task 4).
2. Use **Export** in the sidebar.
3. Export as **CSV** or **Excel** (e.g. `payroll_exclusion_YYYY-MM-DD.csv`).

**Expected:** One file with the 8 employees to exclude, with columns from HR master + Slack (+ termination_date/reason if you did Task 3).

---

## Quick checklist (accuracy test)

| Step | What to do | What you should see |
|------|------------|---------------------|
| 1 | Upload `hr_master.csv`, `slack_export.csv`, `terminations_register.csv` | 3 datasets in sidebar |
| 2 | Merge hr_master (left) + slack_export (right) on **email**, type Left | 20 rows, HR + Slack columns |
| 3 | Filter result: status = Inactive **OR** Offboarded | **8 rows** |
| 4 | (Optional) Merge result + terminations_register on **email**, Left | 8 rows + termination_date, reason |
| 5 | Sort by name | Same 8 rows, A–Z |
| 6 | Aggregate by department (count) | Fleet: 6, Warehouse: 1 |
| 7 | Aggregate by status (count) | Inactive: 6, Offboarded: 2 |
| 8 | Export to CSV/Excel | File with 8 rows for payroll |

---

## Why use multiple workbooks?

- **HR master** = single source of truth for who is an employee (role, department, hire date).
- **Slack export** = activity/status from another system; you don’t maintain it in HR.
- **Terminations register** = official offboarding dates and reasons.

Combining them in the app (instead of manually in Excel) keeps the process repeatable: re-upload the latest Slack export and terminations register, run the same Merge and Filter steps, and get an up-to-date exclusion list for the next payroll.

---

## Notes for your company

- In production, use your real **HR master**, **Slack (or similar) export**, and **terminations** workbook; ensure they share a common key (e.g. **email** or **employee_id**).
- Use **Left** join from HR master so you never drop employees; missing Slack data just shows as blank and can be handled in the filter step.
- Adjust the **Filter** step if your policy is different (e.g. “exclude only if status = Offboarded” or “last_active_date before cutoff”).
