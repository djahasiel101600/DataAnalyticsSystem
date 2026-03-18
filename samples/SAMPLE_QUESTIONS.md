# Sample Data & Questions – Data Analytics System

Use the CSV files in this folder to try the app’s features. Upload them from the sidebar, then work through the questions below.

**Excel:** All samples are CSV. To test Excel upload, open any CSV in Excel and use *Save As → Excel Workbook (.xlsx)*, then upload the saved file.

---

## Files


| File                 | Description                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------- |
| **sales_sample.csv** | Sales by Region, Product, Date, Amount, Quantity, SalesRep. Includes intentional duplicates. |
| **employees.csv**    | Employees with id, name, department, and manager_id (for same-table lookup).                 |
| **orders.csv**       | Orders with order_id, customer_id, product_id, order_date, quantity, unit_price.             |
| **products.csv**     | Product lookup: product_id, product_name, category.                                          |


---

## 1. Upload & inspect

- **Upload** all four files from the sidebar (drag-and-drop or “Select files”).
- **Select** “sales_sample” in the Datasets list.
- **Inspect**: Open “Null/empty counts per column” in the data table. Try **pagination** (e.g. 50/100 per page, Previous/Next) if you have larger data later.

---

## 2. Duplicate check

**Question:** *Which rows in sales_sample are duplicates on (Region, Product, Date), and how many copies of each?*

- Operations → **Duplicate** tab.
- Dataset: **sales_sample**.
- Output: **Mark duplicates (add columns)**.
- Key columns: select **Region**, **Product**, **Date**.
- Optional: enable **Trim spaces** and **Ignore case**.
- **Run**. Check `_is_duplicate` (1 = duplicate) and `_duplicate_count`.

**Question:** *Give me one row per (Region, Product, Date), keeping the first occurrence.*

- Same tab, switch Output to **Remove duplicates**.
- When removing duplicates, keep: **First occurrence**.
- Key columns: **Region**, **Product**, **Date**.
- **Run**. Result should have fewer rows than the original.

---

## 3. Filter & sort

**Question:** *Show only sales from 2024-02-01 onward, with Amount ≥ 900, sorted by Date then Amount descending.*

- Operations → **Filter** tab.
- Source: **Dataset** → **sales_sample** (or use **Current result** if you already have one).
- Add two conditions:  
  - Column **Date**, type **Date**, operator **Greater or equal**, value `2024-02-01`.  
  - Column **Amount**, type **Number**, operator **Greater or equal**, value `900`.
- Combine with **AND**.
- Sort: add **Date** ascending, then **Amount** descending. Optionally check **Date** for the Date sort column.
- **Apply filter & sort**.

**Question:** *Show rows where SalesRep is “Alice” OR “Carol”.*

- Add two conditions: **SalesRep** **Equals** `Alice` and **SalesRep** **Equals** `Carol`.
- Combine with **OR**.

---

## 4. Regex search & highlight

**Question:** *Find all cells containing “Widget” and see them highlighted in the result.*

- Operations → **Regex** tab.
- Source: **sales_sample** (or current result).
- Pattern: `Widget`.
- Check **Search all columns** (or pick one).
- **Run**. In the result table, matches should appear **highlighted**.

---

## 5. Lookup (same-table)

**Question:** *For each employee, show the manager’s name (using manager_id).*

- Operations → **Lookup** tab.
- Source dataset: **employees**.
- Lookup dataset: **Same table** (employees).
- Source key column(s): **manager_id**.
- Lookup key column(s): **id**.
- Lookup value column(s): e.g. **name** (to get manager name).
- **Run**. Result should add the manager’s name for each row.

---

## 6. Merge/join (multiple key columns)

**Question:** *Attach product name and category to each order.*

- Upload **orders.csv** and **products.csv** if not already loaded.
- Operations → **Merge** tab.
- Left: **orders**, Right: **products**.
- Left key column(s): **product_id**.
- Right key column(s): **product_id**.
- Join type: **Left** (keep all orders).
- **Run**. Result should have order columns plus product_name and category.

*(If you create a dataset with composite keys, e.g. Region+Product, you can join on multiple key columns on both sides.)*

---

## 7. Aggregation (group by + multiple aggregates)

**Question:** *Total Amount and total Quantity by Region.*

- Operations → **Aggregate** tab.
- Mode: **Group by + aggregate**.
- Group by: **Region**.
- Add aggregate: column **Amount**, function **Sum**.
- Add another: column **Quantity**, function **Sum**.
- Source: **sales_sample** (or current result).
- **Run**.

**Question:** *Number of sales per SalesRep.*

- Group by: **SalesRep**.
- Aggregate: column **Amount** (or any), function **Count**.
- **Run**.

---

## 8. Pivot table

**Question:** *Regions as rows, Products as columns, values = Sum(Amount).*

- Operations → **Aggregate** tab.
- Mode: **Pivot table**.
- Row dimension: **Region**.
- Column dimension: **Product**.
- Value column: **Amount**.
- Function: **Sum**.
- Source: **sales_sample**.
- **Run**. You get a classic region × product summary.

---

## 9. Export

- With any **result** (or a dataset) selected, use the **Export** card.
- Export as **CSV**, **Excel**, or **JSON**.
- For large result sets, Excel uses **server-side export** automatically.

---

## 10. Saved results & session

- After running an operation, use **Saved results**: enter a name (e.g. “Sales by region”) and **Save**. Later, **Load** that name to restore that result.
- Use **Recent session**: **Save session** to store datasets + result in the browser. **Restore session** to bring them back after a refresh.

---

## Quick checklist


| Feature                        | File(s)           | What to try                            |
| ------------------------------ | ----------------- | -------------------------------------- |
| Upload & inspect               | Any               | Upload, null counts, pagination        |
| Duplicate (mark)               | sales_sample      | Key: Region, Product, Date             |
| Duplicate (remove, keep first) | sales_sample      | Same key, remove duplicates            |
| Filter (date + number)         | sales_sample      | Date ≥ 2024-02-01, Amount ≥ 900        |
| Filter AND/OR                  | sales_sample      | Multiple conditions                    |
| Sort (multi-column, date)      | sales_sample      | Date asc, Amount desc                  |
| Regex + highlight              | sales_sample      | Pattern “Widget”                       |
| Same-table lookup              | employees         | manager_id → id, get name              |
| Merge/join                     | orders + products | product_id → product_id                |
| Group + aggregate              | sales_sample      | Sum(Amount), Sum(Quantity) by Region   |
| Pivot                          | sales_sample      | Rows=Region, Cols=Product, Sum(Amount) |
| Export                         | Any result        | CSV, Excel, JSON                       |
| Saved results                  | Any result        | Save name, load later                  |
| Recent session                 | Any               | Save session, restore                  |


