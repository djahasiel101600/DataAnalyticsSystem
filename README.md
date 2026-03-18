# Data Analytics System

A web app to upload spreadsheets (CSV/Excel), run analytics operations (duplicate check, lookups across sheets, filter/sort, regex search, merge/join, aggregation), and export results. No login required.

**New:** Full user documentation is in `docs/USER_GUIDE.md`.

## Tech stack

- **Backend:** Django 5, Django REST Framework, django-cors-headers, pandas, openpyxl
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Feature Sliced Design
- **Parsing:** Papa Parse (CSV), SheetJS (XLSX) in the browser

## Prerequisites

- Python 3.10+
- Node.js 18+

## Backend (Django)

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver 8090
```

The API runs at **http://localhost:8090**. Endpoints: `GET /api/health/`, `POST /api/export/xlsx/`, `POST /api/parse/upload/`, `POST /api/ai/analytics/`.

**Optional – Ask AI:** To enable the "Ask AI" tab, set the `OPENAI_API_KEY` environment variable before starting the backend (e.g. `set OPENAI_API_KEY=sk-...` on Windows, or `export OPENAI_API_KEY=sk-...` on macOS/Linux). The AI uses your current data (column names and first 5 rows) to answer questions and suggest operations.

## Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5175**. The dev server proxies `/api` to Django on port 8090.

## Using the app

1. **Upload** – Drag and drop or select one or more CSV or Excel files. Each file becomes a named dataset in the sidebar.
2. **Inspect** – Click a dataset in the sidebar to view its rows and columns in the main area.
3. **Operations** – Use the sidebar tabs:
   - **Duplicate** – Select a dataset and key columns; run to mark duplicate rows.
   - **Lookup** – Pick source and lookup datasets, key columns, and columns to retrieve (VLOOKUP-style).
   - **Filter** – Filter and/or sort the current result or a dataset.
   - **Regex** – Search across one or more datasets with a regular expression.
   - **Merge** – Join two datasets (inner, left, right, full) on key columns.
   - **Aggregate** – Group by columns and compute sum, count, average, min, or max.
   - **Ask AI** – Ask natural-language questions about your data (summarize, suggest filters or merge keys). Requires `OPENAI_API_KEY` on the backend.
4. **Export** – After running an operation, use "Export as CSV" or "Export as Excel" to download the result.

## Merge/Join: Different join types (and why)

When you **Merge** two datasets, you pick:

- **Left dataset**: the “main list” you want to keep (e.g. HR master employees).
- **Right dataset**: the “lookup/enrichment” dataset you want to attach (e.g. Slack activity).
- **Key column(s)**: the columns that must match on both sides (e.g. `email`).
- **Join type**: controls which rows are kept in the output.

### Join types

- **Inner join**
  - **Keeps**: only rows where the key exists in **both** left and right.
  - **Why/when**: use when you only care about records that match across sources (e.g. “employees that have both HR record and Slack record”).

- **Left join**
  - **Keeps**: **all** rows from the **left** dataset; attaches matching columns from the right (missing matches become blank).
  - **Why/when**: use when the left dataset is your source of truth (common in HR/payroll). Example: keep all employees from HR master even if Slack export is missing a user.

- **Right join**
  - **Keeps**: **all** rows from the **right** dataset; attaches matching columns from the left.
  - **Why/when**: use when the right dataset is the source of truth (e.g. “all Slack users, enriched with HR info when present”).

- **Full (outer) join**
  - **Keeps**: **all** rows from **both** datasets; matches where possible; non-matching rows from either side still appear with blanks for missing columns.
  - **Why/when**: use for reconciliation and audits (e.g. “show me HR employees missing in Slack and Slack users missing in HR”).

### Quick examples (HR + Slack)

- **Payroll exclusion workflow**: start with **Left join** (HR master on the left) so nobody disappears accidentally.
- **Cross-system consistency check**: use **Full join** to find mismatches between systems.
- **Only employees with Slack activity**: use **Inner join**.

## Production build (optional)

Build the frontend and serve it from Django:

```bash
cd frontend
npm run build
cd ../backend
python manage.py runserver
```

Then open **http://localhost:8090**. The Django app serves the SPA for non-API routes when `frontend/dist` exists.

## Project structure

- `backend/` – Django project (`config/`) and API app (`api/`)
- `frontend/src/` – FSD layers: `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`
