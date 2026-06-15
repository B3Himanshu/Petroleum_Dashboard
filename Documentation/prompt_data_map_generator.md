# Prompt — Generate Dashboard Data Governance Map (2 Excel Files)

Copy everything below the `---` line and paste it into a new conversation with the
Claude session working on the target dashboard repo.

---

## Your Task

Act as a **Senior Data Architect and Systems Analyst**. Generate **TWO clean,
production-ready Python scripts** using `pandas` + `openpyxl`. Each script outputs
one professional `.xlsx` file. Together, the two files form a complete data
governance map of this dashboard — one for engineers, one for non-technical
stakeholders (executives, finance, clients, auditors).

Before writing anything, **read the codebase**. Find every:

- Backend route / endpoint / aggregation function that powers a dashboard widget
- Frontend page, KPI card, chart, table, breakdown modal, comparison view
- Accounting / GL / nominal code, data table, or external data source that flows
  into the UI
- Auth / user-management surface (login, manage users, settings)

Then map all of it into the two workbooks below. **Be exhaustive** — every
clickable element on the dashboard should appear as a row in both files. If you
find 50 rows worth of mappings, write 50. If you find 120, write 120.

---

## Deliverable 1 — Technical Workbook

**Script file:** `Documentation/generate_data_map.py`
**Output file:** `Documentation/Dashboard_Accounting_Data_Map_Master.xlsx`
**Sheet name:** `Data Governance Map`
**Audience:** Backend developers, data engineers, DBAs

### 6 columns (exact headers, in this order)

1. `Internal Accounting GL/Nominal Code` — center-aligned text
2. `Company Account Ledger Name` — text
3. `HSRL Dashboard Module / Pillar` — text (replace "HSRL" with the actual product/company name in this project)
4. `Live UI Component / Chart Widget Name` — text
5. `Data Extraction & Functional Transformation Logic` — long wrapped text
6. `Production API Frontend Payload Key` — monospace (Consolas) string

### Content rules for the technical workbook

- **Column 1** — the actual accounting/nominal code (e.g. `4000`, `5016`).
  - For aggregate KPIs that pull from many codes, list the codes:
    `"Revenue: 4000-4004 | Cost: 5000-5005, 5041, 5046-5050"`
  - For non-financial rows (auth, UI toggles), describe the source table/control.
- **Column 2** — actual ledger name from the chart of accounts (e.g. `Unleaded Petrol`, `Grocery - Purchase`).
- **Column 5** — precise technical logic: SQL fragments, code constant names, signing rules, fallback chains. Engineers should be able to verify accuracy against the code.
- **Column 6** — exact API payload key the frontend reads (e.g. `fuelSales · fuelVolume · netSalesBreakdown[].4000`).

---

## Deliverable 2 — Executive Plain-English Workbook

**Script file:** `Documentation/generate_data_map_executive.py`
**Output file:** `Documentation/Dashboard_Data_Map_Executive_Summary.xlsx`
**Sheet name:** `Executive Data Map`
**Audience:** Executives, finance, clients, auditors, anyone non-technical

### Rules — same row count and same row positions as Deliverable 1

- Row count: **identical** to Deliverable 1.
- Row 2 in File 1 = Row 2 in File 2 (same accounting code, same widget — different wording).
- Column headers: **identical text** to Deliverable 1.
- Same Deep Navy styling, same auto-fit, same gridlines, same frozen header.

### Plain-English writing rules (HARD requirements)

The non-technical reader is **a client, a board member, or your grandmother**.
They have **zero exposure** to SQL, programming, API design, or accounting software.

Every cell must follow ALL of these rules:

1. **No technical jargon.** Banned words/phrases include:
   - `SUM(...)`, `WHERE`, `GROUP BY`, `JOIN`, any SQL
   - `aggregate`, `derived`, `metric`, `denominator`, `chain`, `bucket`, `array`, `payload`
   - `endpoint`, `route`, `API`, `JSON`, `key`, `field`
   - `Math.abs`, `signed`, `boolean`, `null`, `nullable`
   - Code variable names (anything in `camelCase` or `snake_case` or `CONSTANT_CASE`)
   - File paths, function names, table names (unless absolutely unavoidable)
2. **Short sentences.** Maximum 15-20 words per sentence. If a thought needs more, split it.
3. **Active voice.** Say "The card adds these numbers" not "These numbers are added by the card".
4. **Concrete examples.** When introducing a number, hint at what it looks like:
   "shows a number like 14" or "shows a money value like £49,279".
5. **Plain words.**
   - Say "added up" not "aggregated"
   - Say "total" not "sum"
   - Say "divided by" not "ratio of" or "quotient"
   - Say "running costs" not "operational overheads"
   - Say "shows on the screen" not "renders in the UI"
   - Say "saved in a list" not "stored in a table"
   - Say "encrypted before saving" not "hashed with bcrypt cost 12"
6. **Explain WHY a number exists before HOW it's calculated.**
7. **Re-read every sentence asking:** "Could my mum understand this?" If no, rewrite.

### Examples — GOOD vs BAD

| Field | BAD (still too technical) | GOOD (truly plain) |
|---|---|---|
| Logic for Avg PPL | "Avg PPL = (fuelProfit / fuelVolume) x 100. Fallback denominator chain when volume is zero." | "How much money the business makes on each litre of fuel sold, shown in pence. Like making 15p of profit on every litre. If we don't know the litres, the system uses sales value instead." |
| Logic for Active Sites | "COUNT(DISTINCT dept_number) over window where any fuel revenue row exists. Excludes Head Office." | "How many petrol stations had any sales in the chosen dates. The head office is not counted because no fuel is sold there." |
| Logic for Net Profit | "netProfit = totalRevenue + totalCostRaw. Sage stores cost as negative." | "Net Profit is what's left after paying for the fuel we bought. It's our income minus our costs." |
| Logic for User Accounts | "User rows in hsrl_dashboard_users (role='user' or 'admin'). bcrypt cost-12." | "The list of people who can log into the dashboard. Passwords are scrambled before saving so no one can read them — not even the IT team." |
| Logic for View Toggle | "UI control: bar vs table render. Sort applied on signed profit value." | "A button that lets you choose how to view the same data — as cards with pictures, or as a plain table of numbers." |
| Module name | `Dashboard · EBITDA Pillar` | `EBITDA Section` |
| Column 6 (payload key) | `pplAfterOverheads · actualPPL` | `The PPL after Costs card on the dashboard.` |

### Special handling for non-accounting rows

- For **UI controls** (toggles, filters, view switchers): Column 1 should say something like:
  `"No accounting codes — uses the same data as the row above"`
- For **calculated metrics** (Gross Profit, EBITDA, ROI): Column 1 should list the source codes in plain words:
  `"All Fuel codes (4000-4005, 5000-5005) plus Shop codes plus Coffee/Valet codes"`
- For **auth / login / settings rows**: Column 1 should say:
  `"Login system — saves user accounts, separate from the financial data"`

---

## Styling (apply to BOTH workbooks)

```
Header row:
  - Fill:    Deep Navy  (#1F3864)
  - Font:    Calibri 11, bold, white
  - Align:   centered, wrap text
  - Height:  38px

Body cells:
  - Column 1:  Calibri 10, centered, wrap
  - Column 6 (technical workbook only):  Consolas 10, left, wrap
  - All other columns:  Calibri 10, left, wrap
  - Borders:  thin grey (#BFBFBF) on every cell — visible gridlines
  - Frozen header row (freeze_panes = "A2")

Column widths:
  - Auto-fit based on longest content per column, capped at width 80
    (so the long Logic column wraps instead of stretching off-screen)

Sheet view:
  - showGridLines = True
```

---

## Coverage Checklist — Every Dashboard Element Must Appear

For each item below that exists in your dashboard, create a row in BOTH workbooks
(same row position in both files):

**Accounting / Financial rows (one row per nominal code OR per logical bucket):**
- Every revenue code your dashboard uses (e.g. fuel sales codes, shop sales codes)
- Every cost code (fuel purchase, shop purchase, valet purchase, etc.)
- Every income code that feeds Other Income / Misc Income
- Every labour code
- Every overheads code (split out individually if there are 5-10; bucket only if there are 20+)
- Every depreciation code (split out individually)
- Loan interest, corporation tax, any below-EBITDA deduction

**Aggregate KPI rows (one per KPI card visible on the dashboard):**
- Gross Profit, Net Profit, EBITDA, ROI
- Per-litre / per-unit metrics (Avg PPL, Actual PPL, etc.)
- Counts (Active Sites, Active Users, etc.)
- Averages (Avg Sale Per Site, etc.)
- Balances (Bank Balance, Stock Value, etc.)

**Chart rows (one per chart widget):**
- Time-series charts (monthly, daily, weekly)
- Composition charts (pie, donut, stacked bar)
- Comparison charts
- Trend charts

**Page / section rows (one per secondary page):**
- Comparison pages, ranking pages, detail pages
- Breakdown modals / popups
- Filter panels

**Operational rows (one per non-financial element):**
- Auth / login / user accounts
- Settings pages
- View toggles / chart-vs-table switchers
- Marketing / promotional / configured-list tables (note clearly if they don't pull from accounting)

---

## Sample Row Showing Both Versions Side-by-Side

For accounting code `4000 = Unleaded Petrol`:

**Technical workbook (Row 2):**

| Col | Value |
|---|---|
| A | `4000` |
| B | `Unleaded Petrol` |
| C | `Dashboard · Fuel Pillar` |
| D | `Net Sales KPI Card · Fuel Grade Mix Chart · Date-Wise Sales Chart` |
| E | `SUM(amount) WHERE nominal_code='4000' over selected date range. Litres parsed from details column with '/' separator. Sign: revenue stored negative in Sage; Math.abs applied for display.` |
| F | `fuelSales · fuelVolume · netSalesBreakdown[].4000` |

**Executive workbook (Row 2, same position):**

| Col | Value |
|---|---|
| A | `4000` |
| B | `Unleaded Petrol Sales` |
| C | `Fuel Sales Section` |
| D | `Total Sales figure on Home Screen, plus the Unleaded slice on the Fuel Mix chart` |
| E | `All the money taken from selling Unleaded petrol during the chosen dates. The number of litres sold is read from the short note attached to each sale.` |
| F | `Shows on the Total Sales card and the Fuel Volume card.` |

---

## Quality Bar — Before Saying "Done"

1. **Open the executive file. Read three random rows out loud to yourself.** If any sentence makes you pause to figure out what it means, rewrite it.
2. **Run both scripts and confirm:**
   - Same number of rows in both files
   - Same accounting code on the same row in both files
   - Both files open cleanly in Excel
   - Header row is Deep Navy with white bold text
   - Gridlines visible, frozen header, no truncated columns
3. **Confirm coverage:** every clickable element on your live dashboard has a row. If you have 12 KPI cards on screen, you should see 12 KPI rows in the workbooks.
4. **No `[INSERT_...]` placeholders left** unless something is genuinely unknown — in which case mark it `"Needs confirmation: ..."` so reviewers know to fill it in.

---

## Reuse / Re-run

Both scripts should be **idempotent** — running them again overwrites the `.xlsx`
files cleanly. Editing the `ROWS = [...]` list at the top of each script and
re-running should be the only way to change cell content.

Save both `.xlsx` files in the `Documentation/` folder. If `Documentation/` doesn't
exist, create it.

---

## When You Finish

Reply with:

1. The two file paths (script + output for each workbook = 4 paths total)
2. The total row count in each workbook (they should match)
3. A 3-line summary of what's covered (financial rows, KPI rows, chart rows, etc.)
4. A flag for anything you couldn't confidently map (e.g. inferred ledger names that need confirmation from the user's chart of accounts)
