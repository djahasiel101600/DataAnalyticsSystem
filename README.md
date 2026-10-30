# Data Analytics System – A Beginner's Guide

Welcome! This guide will teach you how to use the Data Analytics System, step by step.
You do **not** need to be a programmer or a math expert. If you can use a spreadsheet (like Excel or Google Sheets), you can use this app.

Think of this app as a **smart spreadsheet helper**. You upload your data files, then use simple tools to clean them, combine them, find problems, and export reports.

---

## What is this app for?

Imagine you work in HR or at a shipping company. Every week you get CSV files with:
- A list of employees
- Who is active or inactive
- When they last worked
- Which department they are in

You need to combine these files, find duplicates, check who hasn't shown up in days, and make a payroll list. Doing this by hand is slow and easy to mess up.

This app does that work for you — no coding required.

---

## 0. How to start the app

You need two things running at the same time: the **backend** (the brain) and the **frontend** (the screen you see).

### Backend (Python/Django)

Open a terminal in the `backend` folder:

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # Mac/Linux
pip install -r requirements.txt

python manage.py runserver 8090
```

The backend will say it is running at **http://localhost:8090**.

### Frontend (React)

Open another terminal in the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at **http://localhost:5175**.

Open that address in your web browser and you will see the app.

> **Tip:** Keep both terminals open while you use the app. If you close one, the app will stop working.

---

## 1. The main screen

When you open the app, you will see three parts:

| Part | What it does |
|------|--------------|
| **Left sidebar** | Upload files, see your datasets, and choose operations |
| **Middle area** | Preview your data (like a table in Excel) |
| **Right side** | Operation forms where you pick settings and click "Run" |

### Important words you will see

- **Dataset** – A file you uploaded. Each file becomes one dataset.
- **Result** – The output after you run an operation. It starts empty.
- **Column** – A vertical category in your table (like `Name`, `Status`, `Date`).
- **Row** – One horizontal record (like one employee).
- **Key column** – A column used to match rows between two files (like `Email` or `Employee ID`).

---

## 2. Step 1: Upload your files

Before you can do anything, you need data.


---

## 3. The operations (what each button does)

The operations are in tabs in the middle-left area. Here is what each one does, with a simple example.

---

### 3.1 Duplicate Check

**What it does:** Finds rows that repeat based on columns you choose. It can either **mark** them (add a column saying "this is a duplicate") or **remove** them (keep only one copy).

**Real-world example:** You accidentally imported the same employee twice. You want to find and remove the extra copy.

**How to use:**
1. Pick your dataset.
2. Choose **Output**: Mark duplicates or Remove duplicates.
3. Pick **Key columns** — the columns that together make a row "the same." For example, if two rows have the same `Email` and `Hire Date`, they are duplicates.
4. Optional: turn on **Trim spaces** and **Ignore case** if your data has messy capitalization or extra spaces.
5. Click **Run duplicate check**.

**What you get:**
- A new column `_is_duplicate` (1 means it is a duplicate, 0 means it is not).
- A new column `_duplicate_count` (how many copies exist).
- If you chose Remove, only one row per key remains.

---

### 3.2 Lookup (like VLOOKUP in Excel)

Lookup appends selected Lookup Dataset columns to Source Dataset rows without
changing source row count or order.

1. Select different Source and Lookup datasets.
2. Configure the required Primary Strategy with one or more source-to-lookup
   key pairs. Every pair in a strategy must match.
3. Optionally add fallback strategies and move them to set their priority.
   A fallback is tried only after zero candidates; an ambiguous result stops
   the strategy chain.
4. Choose lookup columns to append, then run Lookup.

Trim and case-insensitive comparison are enabled by default. Empty/missing key
components never match, and text/numeric values are not automatically
converted. Duplicate lookup candidates are reported as ambiguous; no candidate
is chosen arbitrarily. Unmatched and ambiguous source rows remain in the
result with blank returned values. Review the Lookup panel's execution summary
and row-level diagnostics for strategy outcomes and row references.

---

### 3.3 Filter & Sort

**What it does:** Shows only the rows you care about, and puts them in the order you want.

**Real-world example:** Show only employees who are Inactive, sorted by name.

**How to use:**
1. Choose **Source**: a dataset or the current result.
2. Add conditions. Each condition has:
   - **Column:** which column to look at.
   - **Operator:** Equals, Contains, Greater than, Less than, Empty, Not empty, etc.
   - **Value:** what to match (for example, `Inactive`).
   - **Type:** Text, Number, or Date.
3. Choose **AND** (all conditions must be true) or **OR** (any condition can be true).
4. Add sort rules if you want (for example, sort by `Name` ascending).
5. Click **Apply filter & sort**.

**Examples:**
- `Status` **Equals** `Inactive` → only inactive employees.
- `Amount` **Greater than** `100` → only big orders.
- `Last Active` **Less than** `2025-03-15` → people who haven't worked recently (use **Date** type).

---

### 3.4 Regex Search

**What it does:** Searches for text patterns across one or more datasets.

**Real-world example:** Find every cell that contains the word "Widget" or matches an email pattern.

**How to use:**
1. Pick which datasets to search.
2. Choose **Search all columns** or pick specific columns.
3. Type a pattern, or pick a template like **Email address** or **US phone**.
4. Click **Search**.

**What you get:** Only the rows where the pattern was found, plus a column showing which dataset and column matched.

> **Tip:** If you are not familiar with regex, start with the **Contains (substring)** template and type a word you want to find.

---

### 3.5 Merge / Join

**What it does:** Combines two tables side by side, matching rows by a key column.

---

### 3.6 Coverage / Existence Check

**What it does:** Checks whether keys from one table exist in another table.

**Real-world example:** You have a daily activity list and a master employee list. You want to know which employees in the daily list are **not** in the master list.

**How to use:**
1. **Primary dataset:** the list you want to check.
2. **Primary key columns:** the matching column (for example, `Employee ID`).
3. **Reference dataset(s):** the master list(s).
4. **Reference key columns:** matching columns in the master list.
5. Choose **Output**: Annotate (add columns to every row), Only missing, or Only complete.
6. Click **Run coverage check**.

**What you get:** New columns like `_exists_in_master` and `_coverage_ok` (1 means found, 0 means missing).

---

### 3.7 Inactivity Check

**What it does:** Finds people who have not been active for a certain number of days.

**Real-world example:** Flag employees who haven't logged activity in more than 3 days, so they can be removed from payroll.

**How to use:**
1. Pick your dataset.
2. Pick **Date / last activity column** (for example, `Last Activity`).
3. Set **Inactive after (days)** — for example, `3`.
4. Optional: set a **Reference date** (defaults to today).
5. Click **Run inactivity check**.

**What you get:** New columns:
- `_days_inactive` — how many days since last activity.
- `_is_inactive` — `1` if inactive, `0` if active.
- `_date_inactive` — `1` if the date was missing or invalid.

> **Tip:** If a row has a blank date, it might be marked as inactive. Check the `_date_inactive` column to see which rows had missing dates.

---

### 3.8 Exception Report

**What it does:** Combines duplicate check, inactivity check, and coverage check into one report.

**Real-world example:** You want one table that shows:
- Which employees are duplicated
- Which are inactive
- Which are missing from the master list

**How to use:**
1. Pick your **Primary dataset**.
2. Pick **Key columns**.
3. Optionally pick a **Date column** and set inactive days.
4. Optionally pick a **Master dataset** for the missing-in-master check.
5. Click **Run exception report**.

**What you get:** Your original rows plus a column `_exception_type` that says things like:
- `Duplicate`
- `Inactive`
- `Missing in master`
- `Duplicate; Inactive` (both problems at once)
- blank (no problems)


---

### 3.10 Compare Datasets

**What it does:** Shows what changed between two versions of a file (added, removed, updated, or unchanged rows).

**Real-world example:** You have Monday's employee list and Tuesday's employee list. You want to see who was added, who left, and whose status changed.

**How to use:**
1. **Old dataset:** the earlier version.
2. **New dataset:** the newer version.
3. **Key columns:** the column that identifies each person (for example, `Employee ID`).
4. Turn on **Detect updated rows** if you want to see changes in non-key columns (like status changing from Active to Inactive).
5. Click **Compare**.

**What you get:** A column `_change_type` with values:
- `added` — in new but not old
- `removed` — in old but not new
- `unchanged` — same in both
- `updated` — key matches, but other info changed
- `_changed_columns` lists exactly which columns changed

---

### 3.11 Aggregate / Pivot

**What it does:** Summarizes data by grouping it.

**Real-world example:** Count how many inactive employees are in each department. Or add up total sales by region.

**Aggregate (Group by):**
1. Pick **Group by** columns (for example, `Department`).
2. Add aggregate rules:
   - Column: `Name`
   - Function: `Count` (counts non-empty values)
3. Click **Run aggregate**.

**Pivot table:**
1. Pick **Row dimension** (for example, `Region`).
2. Pick **Column dimension** (for example, `Product`).
3. Pick **Value column** (for example, `Amount`).
4. Pick a function (Sum, Count, Average, Min, Max).
5. Click **Run pivot**.


---

## 4. Export your results

After running an operation, look at the **Export** card on the right.

You can download your result as:
- **CSV** — works in Excel, Google Sheets, and almost everything.
- **Excel** — a nice spreadsheet file. For very large results, the app uses the server to create it.
- **JSON** — for programmers or other tools.

Click the button for the format you want. Your browser will download the file.

---

## 5. Save and undo

- **Undo:** Press `Ctrl + Z` (or `Cmd + Z` on Mac) to go back to the previous result. You can undo up to 20 times.
- **Saved results:** Save the current result with a name, and load it later.
- **Recent session:** Save all your datasets and the current result so you can reload them after refreshing the page.

---

## 6. Complete example: Payroll exclusion (HR + Slack)

This is a real workflow you might do every payroll period.

**Files you need:**
- `samples/hr_master.csv` — the master employee list
- `samples/slack_export.csv` — Slack activity and status
- `samples/terminations_register.csv` — people who left the company

**Goal:** Make a list of employees to exclude from payroll (inactive or offboarded in Slack).

### Step 1: Upload all three files
Upload `hr_master.csv`, `slack_export.csv`, and `terminations_register.csv`.

### Step 2: Merge HR master with Slack export
1. Go to **Merge / Join**.
2. **Left dataset:** `hr_master`
3. **Left key columns:** `email`
4. **Right dataset:** `slack_export`
5. **Right key columns:** `email`
6. **Join type:** Left
7. Click **Run join**.

**Expected:** 20 rows. Every HR employee is kept, and Slack columns are added where the email matches.

### Step 3: Filter to inactive and offboarded only
1. Go to **Filter & sort**.
2. **Source:** Current result.
3. Add condition: `Status` **Equals** `Inactive`.
4. Change combine to **OR**.
5. Add condition: `Status` **Equals** `Offboarded`.
6. Click **Apply filter & sort**.

**Expected:** 8 rows (6 inactive + 2 offboarded). This is your payroll exclusion list.

### Step 4: (Optional) Add termination dates
1. Go to **Merge / Join** again.
2. **Left dataset:** Current result (the 8 rows).
3. **Left key columns:** `email`
4. **Right dataset:** `terminations_register`

---

## 7. Common mistakes and how to avoid them

| Problem | Why it happens | How to fix |
|---------|---------------|------------|
| My merge produced fewer rows than I expected | You used Inner join, or your key columns don't match exactly | Try Left join. Check for extra spaces or different capitalization (turn on Trim spaces / Ignore case). |
| My date filter shows nothing | The dates are stored as text and don't match | Make sure you set the condition **Type** to **Date**. Use format `YYYY-MM-DD`. |
| My count includes blank rows | Count was counting all rows instead of filled cells | This is now fixed — count only counts non-empty values. |
| Rows with blank dates are marked inactive | Blank dates are treated as "very old" by default | Turn on **Strict** mode in Inactivity check, or look at the `_date_inactive` column. |
| My file won't upload | The file uses an unusual text encoding | The app now tries several encodings (UTF-8, UTF-8 with BOM, Latin-1, Windows-1252). If it still fails, try opening the file in Excel and saving it as CSV again. |
| Two rows look the same but aren't marked as duplicates | Extra spaces or capital differences | Turn on **Trim spaces** and **Ignore case** in Duplicate check. |

---

## 8. File formats and size

- **Supported:** `.csv` and `.xlsx` (Excel).
- **Large files:** Files bigger than 5 MB are parsed on the server automatically. The server can handle up to 50 MB.
- **Export limit:** Server-side Excel export is limited to 200,000 rows. For bigger results, use CSV.

---

## 9. Project structure

```
backend/        Django server (Python)
frontend/       React web app (TypeScript)
samples/        Example CSV files to try
docs/           Additional user guide
```

---

## 10. Need help?

- Use the **Ask AI** tab if you have an OpenAI API key configured.
- Look at the example files in the `samples/` folder.
- Check the validation summary after uploading to see if your data has missing values.

Happy analyzing! 📊


---

## 9. Project structure

```
backend/        Django server (Python)
frontend/       React web app (TypeScript)
samples/        Example CSV files to try
docs/           Additional user guide
```

---

## 10. Need help?

- Use the **Ask AI** tab if you have an OpenAI API key configured.
- Look at the example files in the `samples/` folder.
- Check the validation summary after uploading to see if your data has missing values.

Happy analyzing! 📊

5. **Right key columns:** `email`
6. **Join type:** Left
7. Click **Run join**.

**Expected:** Same 8 rows, now with `termination_date` and `reason` where available.

### Step 5: Sort by name
1. Go to **Filter & sort**.
2. Add a sort rule: `Name`, **Ascending**.
3. Click **Apply filter & sort**.

### Step 6: Count by department
1. Go to **Aggregate**.
2. **Group by:** `Department`.
3. Add aggregate: Column `Name`, Function `Count`.
4. Click **Run aggregate**.

**Expected:** Something like Fleet: 6, Warehouse: 1.

### Step 7: Export
1. Go to **Export**.
2. Click **CSV** or **Excel**.
3. Name it something like `payroll_exclusion_2025-03-18.csv`.

You now have a clean payroll exclusion list ready to send to the payroll team.

**What you get:** A summary table. For aggregate, one row per group. For pivot, a grid where rows are one category and columns are another.

---

### 3.12 Ask AI (optional)

**What it does:** Lets you ask questions in plain English about your data.

**Setup:** You need an OpenAI API key set in the backend. If you don't have one, this tab will say it is not configured.

**How to use:**
1. Pick which dataset or result to ask about.
2. Type a question like:
   - "Which columns should I use to merge these tables?"
   - "Summarize this data."
   - "Which employees are inactive?"
3. Click **Ask**.

The AI will look at your column names and a sample of your rows, then give you advice.

---

### 3.9 Clean Data

**What it does:** Fixes messy text in your data.

**Real-world example:** Your status column has `Active`, `ACTIVE`, `active`, and ` Inactive ` (with spaces). You want them all to be clean and consistent.

**How to use:**
1. Pick your dataset.
2. Choose **Columns to clean** (or leave blank for all columns).
3. Turn on options you want:
   - **Trim spaces:** removes extra spaces at the start and end.
   - **Lowercase:** makes everything small letters.
   - **Uppercase:** makes everything capital letters.
   - **Fill empty:** replaces blank cells with a value you choose (like `N/A`).
4. **Standardize column:** pick a column and type mappings like:
   ```
   active => Active
   ACTIVE => Active
   inactive => Inactive
   ```
5. Click **Run clean**.

**What you get:** Your data with cleaned and standardized values.


This is one of the most powerful features. Think of it like pasting two lists together where a column matches.

**Join types explained simply:**

| Join type | Keeps... | Best for |
|-----------|----------|----------|
| **Inner** | Rows that exist in **both** tables | "Only employees who appear in both HR and Slack" |
| **Left** | **All** rows from the left table; blanks where right doesn't match | Payroll: keep every employee, even if Slack data is missing |
| **Right** | **All** rows from the right table; blanks where left doesn't match | When the right table is your main list |
| **Full** | **All** rows from both tables | Finding mismatches between two systems |

**Real-world example:** Merge HR master (left) with Slack export (right) on `Email`, using **Left** join.

**How to use:**
1. Pick **Left dataset** (your main list).
2. Pick **Right dataset** (the table to attach).
3. Pick **Left key columns** and **Right key columns** (usually the same column, like `Email`). You can pick multiple for a composite key.
4. Pick **Join type**. For payroll, use **Left**.
5. Click **Run join**.

**Warning:** If your key column has the same value appearing many times (like the same email in two rows), the result can grow bigger than your original table. The app will show a warning if this happens.


**What it does:** Takes information from one table and attaches it to another, based on a matching column.

**Real-world example:** You have an employee list with `Email`, and a separate Slack list with `Email` and `Slack Status`. You want to add Slack Status to your employee list.

**How to use:**
1. **Source dataset:** your main table (employees).
2. **Source key columns:** pick `Email`.
3. **Lookup dataset:** the other table (Slack export).
4. **Lookup key columns:** pick `Email` (must be in the same order as the source keys).
5. **Columns to retrieve:** pick the columns you want to bring over, like `Slack Status`.
6. Optional: turn on **Ignore case** or **Trim spaces** if emails might have different capitalization or spaces.
7. Click **Run lookup**.

**What you get:** Your original table plus new columns with the looked-up values. Rows with no match get blank values.

1. Click **Browse** in the left sidebar.
2. Select one or more **CSV** or **Excel (.xlsx)** files.
3. You will see a **Validation summary** for each file:
   - Rows: how many records
   - Columns: how many categories
   - Missing required: if you asked for specific columns and they are missing
   - Null/empty counts: how many blank cells per column

4. Click **Add to datasets** to keep the file, or **Discard** to throw it away.

You will now see your files listed in the **Datasets** panel on the left. Click one to preview it.

> **Example files:** Try `samples/hr_master.csv` and `samples/slack_export.csv` to follow along with the payroll example at the end of this guide.

python manage.py runserver 8090
```

The backend will say it is running at **http://localhost:8090**.

### Frontend (React)

Open another terminal in the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at **http://localhost:5175**.

Open that address in your web browser and you will see the app.

> **Tip:** Keep both terminals open while you use the app. If you close one, the app will stop working.
