# Prompt — Generate Dashboard Data Map Excel Pair (Technical + Executive)

Copy **everything below the `---` line** into a new AI session when you want to build the same
two Excel governance workbooks for **any** dashboard (HSRL, PRL, a new product, etc.).

**Reference implementation in this repo (study before generating):**

| Artifact | Path |
|----------|------|
| Technical script | `Documentation/generate_data_map.py` |
| Executive script | `Documentation/generate_data_map_executive.py` |
| Technical output | `Documentation/{PRODUCT}_Dashboard_Accounting_Data_Map_Master.xlsx` |
| Executive output | `Documentation/{PRODUCT}_Dashboard_Data_Map_Executive_Summary.xlsx` |
| Spec notes | `Documentation/prompt_data_map_generator.md` |

---

## Your Task

Act as a **Senior Data Architect and Systems Analyst**.

Generate **TWO production-ready Python scripts** (`pandas` + `openpyxl`). Each script writes **one**
professional `.xlsx` file. Together they form a **complete data governance map** of the target
dashboard — one for engineers, one for non-technical stakeholders (executives, finance, clients,
auditors).

### Before writing any code — READ THE CODEBASE

Find every:

- Backend route / endpoint / aggregation function that powers a widget
- Frontend page, KPI card, chart, table, breakdown modal, comparison view, filter
- Accounting / GL / nominal code, DB table, column, or external source that feeds the UI
- Auth / settings / non-financial surfaces (login, manage users, toggles)
- Signing rules (`Math.abs`, negative Sage costs, volume-from-details parsing, etc.)
- API response keys the frontend actually reads (`response.data.shopProfit`, etc.)

Map **all of it** into both workbooks. **Be exhaustive** — every clickable KPI, chart slice,
breakdown row, and comparison column should have a row. If you find 80 mappings, write 80. If you
find 120, write 120.

---

## Deliverable 1 — Technical Master Workbook

| Item | Value |
|------|-------|
| **Script** | `Documentation/generate_data_map.py` |
| **Output** | `Documentation/{PRODUCT}_Dashboard_Accounting_Data_Map_Master.xlsx` |
| **Sheet name** | `Data Governance Map` |
| **Audience** | Backend developers, data engineers, DBAs, technical auditors |

Replace `{PRODUCT}` with the real product code (e.g. `HSRL`, `PRL`, `Acme`).

### 6 columns (exact headers, this order)

1. `Internal Accounting GL/Nominal Code` — center-aligned text
2. `Company Account Ledger Name` — text
3. `{PRODUCT} Dashboard Module / Pillar` — text (e.g. `Dashboard · Fuel Pillar`)
4. `Live UI Component / Chart Widget Name` — text
5. `Data Extraction & Functional Transformation Logic` — long wrapped text
6. `Production API Frontend Payload Key` — monospace (Consolas) string

### Content rules — technical workbook

**Column A (GL / source code)**

- Single nominal: `4000`, `4039`, `5039`
- Paired sales/cost: note the pair in column E (`4039` revenue ↔ `5039` cost)
- Aggregate KPIs: list all contributing codes, e.g.
  `"Revenue: 4000-4004, 4100-4102 | Cost: 5000-5005, 5041, 5046-5050"`
- Derived metrics: list inputs, e.g.
  `"Derived: Fuel Profit / Fuel Volume × 100 (pence per litre)"`
- Non-financial: table name, e.g. `hsrl_dashboard_users (id, email, role, …)`
- UI-only rows: `"UI-config only (no Sage ledger source)"`

**Column B** — exact ledger name from chart of accounts / `nominalCodeNames.js` / CSV.
Mark inferred names: `"(inferred) — confirm with chart of accounts"`.

**Column C** — dashboard section pillar, consistent naming:
`Dashboard · Fuel Pillar`, `Dashboard · Shop Pillar`, `Dashboard · EBITDA Pillar`,
`Site Comparison Page`, `Auth / Identity`, etc.

**Column D** — every widget that consumes this row (card + chart + modal):
`Shop Profit Card · GP Breakdown Modal · Shop & Valet Monthly Combo Charts`

**Column E** — precise technical logic engineers can verify against code:

- DB table + column (`HSRL_sage_audit_journal.amount`, `dept_number`, `sage_date`)
- SQL fragment or constant name (`SHOP_SALES_CODES`, `SUM_AMOUNT_SQL`)
- Date filter behaviour (range vs as-of end date for bank balance)
- Signing / display rules (`Math.abs` for display; raw sum for net profit)
- Special parsing (volume from `details` column, 4101 reversal subtract)
- Fallback chains (volume API → transition breakdown)
- Recent fixes with month if known (`May 2026 fix: signed shop profit`)

**Column F** — exact frontend payload path:

- Top-level keys: `grossProfit`, `shopSales`, `totalFuelVolume`
- Nested: `salesBreakdown[].4039`, `overheadsBreakdown[].7150`
- Route references for auth: `/api/auth/login`, `auth.user`
- Use ` · ` as separator between multiple keys

### Script structure (technical)

```python
ROWS = [
    # (gl_code, ledger_name, module, component, logic, payload_key)
    ("4000", "Unleaded Petrol", "Dashboard · Fuel Pillar", ...),
    ...
]
```

- `ROWS` is the **single source of truth** for cell content
- `main()` builds DataFrame → openpyxl workbook → save xlsx
- Idempotent: re-run overwrites the file cleanly

---

## Deliverable 2 — Executive Plain-English Workbook

| Item | Value |
|------|-------|
| **Script** | `Documentation/generate_data_map_executive.py` |
| **Output** | `Documentation/{PRODUCT}_Dashboard_Data_Map_Executive_Summary.xlsx` |
| **Sheet name** | `Executive Data Map` |
| **Audience** | Executives, finance, clients, auditors — **zero technical background** |

### Pairing rules (HARD — must match Deliverable 1)

| Rule | Requirement |
|------|-------------|
| Row count | **Identical** to technical workbook |
| Row order | Row N in file 1 = Row N in file 2 (same code, same widget) |
| Column headers | **Identical text** (including `{PRODUCT}` in column C header) |
| Styling | Same Deep Navy header, gridlines, frozen header, auto-fit |

Only columns **B, C, D, E, F** change wording. Column **A** stays the same code/source id.

### Plain-English writing rules (HARD)

The reader is a **client, board member, or auditor** with no SQL, API, or dev exposure.

Every cell must follow ALL rules:

1. **No technical jargon.** Banned: `SUM`, `WHERE`, `GROUP BY`, `JOIN`, SQL, `aggregate`,
   `payload`, `endpoint`, `JSON`, `Math.abs`, `camelCase`, file paths, function names,
   raw table names (unless unavoidable).
2. **Short sentences** — max 15–20 words; split long thoughts.
3. **Active voice** — "The card adds these numbers" not "These numbers are added".
4. **Concrete examples** — "shows a figure like £75K" or "about 14 sites".
5. **Plain words** — "added up" not "aggregated"; "divided by" not "quotient";
   "shows on the screen" not "renders in the UI".
6. **Explain WHY before HOW** — what business question does this number answer?
7. **Grandmother test** — re-read each sentence; if it needs explanation, rewrite.

### Column F in executive workbook

Replace API keys with **where the user sees it**:

| Technical (File 1) | Executive (File 2) |
|--------------------|----------------------|
| `shopSales · costBreakdown[].4039` | `Shows on the Shop Sales card and Shop Profit breakdown.` |
| `grossProfit · fuelProfit · shopProfit` | `The big Gross Profit number at the top of the dashboard.` |
| `/api/auth/login · auth.user` | `The login screen and Manage Users page.` |

### Special rows — executive column A wording

| Row type | Column A example |
|----------|------------------|
| UI toggle / filter | `No accounting codes — uses the same data as the row above` |
| Aggregate KPI | `Fuel codes 4000-4005 plus Shop codes 4032, 4034…` (plain list) |
| Auth | `Login system — saves user accounts, separate from financial data` |
| Config-only table | `Configured in app settings (not from accounting data)` |

### Script structure (executive)

- **Separate file** `generate_data_map_executive.py` (do not try to auto-translate in one script)
- **Own `ROWS` list** with **same length and order** as technical script
- Same styling except column F uses Calibri (not Consolas) in executive file

---

## Styling (apply to BOTH workbooks)

```
Header row:
  Fill:     Deep Navy #1F3864
  Font:     Calibri 11, bold, white
  Align:    centered, wrap text
  Height:   38px

Body:
  Column 1: Calibri 10, centered, wrap
  Column 6 (technical only): Consolas 10, left, wrap
  All other columns: Calibri 10, left, wrap
  Borders:  thin grey #BFBFBF on every cell
  Freeze:   freeze_panes = "A2"
  Gridlines: showGridLines = True

Column widths:
  Auto-fit per column from longest content, cap at 80
```

---

## Coverage checklist — every dashboard element gets a row

Create rows in **both** files (same position) for each item that exists in the target dashboard.

### A. Accounting / financial (one row per nominal OR logical bucket)

- [ ] Every **revenue** code used (fuel, shop, valet, bunkering, misc)
- [ ] Every **cost / purchase** code (fuel, shop, valet)
- [ ] **Other / misc income** codes feeding EBITDA or net profit
- [ ] **Labour** codes (7000–7005 etc.)
- [ ] **Operating overheads** (split individually if ≤10; bucket if 20+)
- [ ] **Depreciation** codes (8200–8207 etc.) — individually
- [ ] **Loan interest**, **corporation tax**, below-EBITDA deductions
- [ ] **Bank balance** codes (1200-series or equivalent)
- [ ] **Investment / ROI** denominator codes if applicable

### B. Aggregate KPI cards (one row per visible headline metric)

- [ ] Gross Profit (list all pillar codes; note signed shop/valet losses)
- [ ] Net Profit / Total Net Profit
- [ ] EBITDA / EBITA
- [ ] Per-litre metrics (Avg PPL, Actual PPL / PPL after Overheads)
- [ ] ROI (+ monthly trend if present)
- [ ] Active Sites / Active Users
- [ ] Bank Balance
- [ ] Average Sale Per Site / basket size / margin %
- [ ] Total Site Revenue, Fuel Volume, Shop Profit, Valet Profit (if separate cards)

### C. Charts (one row per chart widget)

- [ ] Monthly performance / trend (GP, EBITDA, volume)
- [ ] Daily / date-wise line chart
- [ ] Pie / donut (sales mix, profit distribution, fuel grade mix)
- [ ] Stacked bar (monthly fuel, shop/valet combo)
- [ ] Bunkering / specialty charts
- [ ] PPL comparison chart
- [ ] ROI trend chart
- [ ] Comparison page bar/pie charts

### D. Tables & secondary pages

- [ ] Top performing sites
- [ ] Sites needing improvement
- [ ] Site comparison page (A vs B)
- [ ] Metrics / multi-site grid
- [ ] Marketing / config tables (flag as non-ledger)
- [ ] Chart vs table view toggles

### E. Breakdown modals (fold into parent row OR separate row if distinct logic)

- [ ] Shop sales breakdown, shop cost breakdown
- [ ] Fuel grade breakdown, bunkered breakdown
- [ ] Overhead breakdown, labour breakdown
- [ ] Net profit / depreciation breakdown
- [ ] Gross profit breakdown popup (3 rows: Fuel, Shop, Coffee & Valet)

### F. Operational / non-financial

- [ ] Login (user + admin)
- [ ] Manage users / settings
- [ ] Date range filter (reference which metrics it affects)
- [ ] Site filter / multi-select
- [ ] Theme toggle (optional single row: UI only)

---

## Row ordering convention (recommended)

Keep both files in this section order so reviewers can scan:

1. Fuel sales codes (4000–4004, 4100–4102)
2. Fuel cost codes (5000–5050, 5041, 5046–5049)
3. Shop sales codes
4. Shop cost codes
5. Valet / coffee sales codes
6. Valet / coffee cost codes
7. Misc / other income codes
8. Labour codes
9. Operating overhead codes
10. Depreciation codes
11. Loan interest + corporation tax
12. **Aggregate KPI rows** (Gross Profit, Net Profit, EBITDA, PPL, ROI, Active Sites, Bank, Avg/Site)
13. **Chart rows** (monthly, daily, pie, combo, bunkering, PPL comparison, marketing)
14. **Comparison pages** (site comparison, metrics grid, view toggle)
15. **Auth / identity** (last)

---

## Sample row — both versions side by side

**Accounting code `4039` = EV Revenue (shop sales)**

**Technical workbook (row N):**

| Col | Value |
|-----|-------|
| A | `4039` |
| B | `EV Revenue` |
| C | `Dashboard · Shop Pillar` |
| D | `Shop Profit Card · GP Breakdown Modal` |
| E | `SUM(amount) WHERE nominal_code='4039' over date range. Paired with cost 5039. Included in SHOP_SALES_CODES. Sign: Math.abs for shopSales display; shopProfit = abs(sales) - abs(cost).` |
| F | `shopSales · salesBreakdown[].4039` |

**Executive workbook (row N, same position):**

| Col | Value |
|-----|-------|
| A | `4039` |
| B | `EV Charging Revenue` |
| C | `Shop Sales Section` |
| D | `Shop Sales card and Shop Profit breakdown` |
| E | `Money earned from electric vehicle charging during the chosen dates. Costs for running the chargers are tracked separately under code 5039.` |
| F | `Shows on the Shop Sales card and the Shop Profit section on the dashboard.` |

---

## Quality bar — before saying "Done"

1. **Row parity:** `len(ROWS)` identical in both Python files; spot-check 5 random rows for same code in column A.
2. **Run both scripts:** `python Documentation/generate_data_map.py` and `python Documentation/generate_data_map_executive.py`.
3. **Open both xlsx files:** Deep Navy header, frozen row 1, gridlines, no broken columns.
4. **Coverage audit:** Count KPI cards on the live dashboard → should match KPI rows in the workbook.
5. **Code sync:** Spot-check 3 nominal codes against `petrolDataSage.js` (or equivalent) — codes in Excel must match `SHOP_SALES_CODES`, `SHOP_COST_CODES`, etc.
6. **Executive read-aloud:** Read 3 random executive rows aloud; rewrite any sentence that makes you pause.
7. **No placeholders:** No `[INSERT_...]` unless marked `Needs confirmation: …`.

---

## Adaptation variables — fill in for each new dashboard

When reusing this prompt for a **different** dashboard, state these at the top of your session:

```
PRODUCT_NAME:        e.g. Acme Retail Dashboard
PRODUCT_CODE:        e.g. ACME (used in xlsx filename and column C header)
PRIMARY_PAGE:        e.g. frontend/src/pages/Dashboard.jsx
BACKEND_ROUTES:      e.g. backend/routes/dashboardData.js
TRANSACTIONS_TABLE:  e.g. acme_sage_audit_journal
NOMINAL_NAMES_FILE:  e.g. backend/data/nominalCodeNames.js
API_PREFIX:          e.g. /api/dashboard/acme-data
DATE_COLUMN:         e.g. sage_date
AMOUNT_COLUMN:       e.g. amount
SITE_KEY_COLUMN:     e.g. dept_number
CHART_OF_ACCOUNTS:   path to CSV or markdown nominal reference
PILLARS:             e.g. Fuel, Shop, Valet, Overheads, Comparison
```

The AI must read those paths in the repo and produce scripts named/outputting:

- `{PRODUCT_CODE}_Dashboard_Accounting_Data_Map_Master.xlsx`
- `{PRODUCT_CODE}_Dashboard_Data_Map_Executive_Summary.xlsx`

---

## When you finish — reply with

1. Four paths: both `.py` scripts + both `.xlsx` outputs
2. Total row count in each workbook (must match)
3. Three-line summary: how many financial rows, KPI rows, chart rows, auth rows
4. List of anything flagged `Needs confirmation` (inferred ledger names, guessed payload keys)
5. Command to regenerate: `pip install pandas openpyxl && python Documentation/generate_data_map.py && python Documentation/generate_data_map_executive.py`

---

## Maintenance note

When dashboard code changes (new nominal codes, new KPI cards, API renames):

1. Update `ROWS` in **both** Python files at the **same index**
2. Re-run both scripts
3. Commit the `.py` files; xlsx may be committed or generated at release time per team policy

**HSRL reference row count:** 99 rows (as of the scripts in this repo).
