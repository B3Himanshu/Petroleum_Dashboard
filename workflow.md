# HSRL Petroleum Dashboard — Visual Workflow

How data travels from the database to every card, chart, pie, and table on the dashboard.
Read each diagram **left → right**: *where the data lives* → *what we do to it* → *what the user sees*.
(Excludes login / admin / settings.)

---

## 1. The Big Picture

```mermaid
flowchart LR
  subgraph DB["🗄️ Database"]
    J[("Sage Journal<br/>all transactions")]
    V[("2025 Volume<br/>true litres")]
    DPT[("Departments<br/>site list")]
  end

  subgraph CALC["⚙️ Backend (does the maths)"]
    DR["Per-site & Sage logic"]
    PD["Date-range 'petrol-data' logic"]
    ST["Site list logic"]
  end

  subgraph SCREENS["🖥️ Dashboard Screens"]
    P1["Fuel Dashboard"]
    P2["Business Performance"]
    P3["Comparison"]
  end

  subgraph SHOW["📊 What the user sees"]
    K["KPI Cards"]
    C["Charts"]
    PIE["Pie / Donut"]
    T["Tables"]
  end

  J --> DR & PD & ST
  V --> DR & PD
  DPT --> ST
  DR --> P1
  PD --> P2 & P3
  ST --> P1 & P3
  P1 & P2 & P3 --> K & C & PIE & T
```

**The golden rule of this data:** every transaction is tagged with a **nominal code** (what kind of money it is) and a **site**. Almost every number on the dashboard is just *"pick the right codes, add them up, sometimes divide."*

---

## 2. The Money Buckets (nominal codes)

```mermaid
flowchart TD
  J[("Sage Journal")] --> FS["⛽ Fuel Sales £<br/>codes 4000–4004"]
  J --> FV["🛢️ Fuel Volume<br/>4000–4004 + 4101"]
  J --> SH["🏪 Shop<br/>4032–4039 / costs 50xx"]
  J --> CV["☕ Coffee & Valet<br/>4028–4031 / costs 50xx"]
  J --> FP["💷 Fuel Purchase / Cost<br/>5000–5005"]
  J --> OH["🏢 Overheads<br/>7100–8207"]
  J --> LB["👷 Labour<br/>7000, 7001, 7005"]
  J --> BK["🏦 Bank<br/>1200, 1223, 1224…"]
  J --> OI["➕ Other Income<br/>6100–6102"]
```

**Two rules to remember:**
- **Costs are stored as negative numbers.** So to subtract a cost you simply *add* it (sales `45` + cost `−37` = profit `8`). Never flip the sign yourself.
- **Code 4101 (bunkered) counts for litres only — never for £ sales.** If its note says *"reversal,"* the litres are subtracted, not added.

---

## 3. KPI Card Flows

### Fuel Volume → Net Sales → Profit (the core chain)

```mermaid
flowchart LR
  V[("2025 litres")] --> VOL
  J[("Journal details")] -->|"read litres after the '/'"| VOL["Total Fuel Volume<br/>(litres)"]
  VOL --> CARD1{{"⛽ Total Volume card"}}

  J -->|"add up fuel + bunker sales"| NS["Net Sales"]
  NS --> CARD2{{"💷 Net Sales card"}}

  NS --> GP["Gross Profit<br/>= fuel profit + shop profit + valet profit"]
  J -->|"add fuel cost (negative)"| GP
  GP --> CARD3{{"📈 Profit card"}}
```

| Card | In plain words | Feeds |
|---|---|---|
| **Total Fuel Volume** | True litres: 2025 from the volume table, 2026+ read out of the transaction note. | PPL cards |
| **Net Sales** | Add up every revenue transaction for the chosen sites & dates. | Profit, Margin |
| **Gross Profit** | Fuel profit (sales − cost) **plus** shop profit **plus** valet profit. Shop/valet keep their sign so a loss pulls profit down. | PPL, Margin, ROI |

### Pence-Per-Litre family (profit spread over litres)

```mermaid
flowchart LR
  GP["Gross Profit"] --> AVG["Gross PPL<br/>profit ÷ litres × 100"]
  OH["Overheads total"] --> ACT["Overhead PPL<br/>overheads ÷ litres × 100"]
  AVG --> AFTER["PPL after Overheads<br/>= Gross PPL − Overhead PPL"]
  ACT --> AFTER
  AVG --> C1{{"Avg PPL card"}}
  ACT --> C2{{"Actual PPL card"}}
  AFTER --> C3{{"PPL-after-O/H card"}}
```

*Litres ("denom") = real volume when we have it, otherwise the fuel-sales £ as a stand-in.*

### Profit ladder (how one number rolls up to the next)

```mermaid
flowchart TD
  NS["Net Sales"] --> GP["Gross Profit"]
  GP --> EB["EBITA<br/>= Gross Profit + other income − overheads"]
  EB --> NP["Net Profit<br/>= EBITA − depreciation − loan interest − corporation tax"]
  NP --> ROI["ROI %<br/>= Net Profit ÷ money invested × 100"]
  EB --> C1{{"EBITA card"}}
  NP --> C2{{"Net Profit card"}}
  ROI --> C3{{"ROI card / gauge"}}
```

### Standalone cards

```mermaid
flowchart LR
  J[("Journal")] -->|"wages + NI + pensions"| LB["Labour Cost"] --> CL{{"👷 Labour card"}}
  J -->|"add purchase codes"| TP["Total Purchases"] --> CT{{"🛒 Purchases card"}}
  J -->|"running balance up to end date"| BK["Bank Balance"] --> CB{{"🏦 Bank card"}}
  J -->|"count distinct sites"| AS["Active Sites"] --> CA{{"🏬 Active Sites card"}}
  AS --> AVGS["Avg Sale / Site<br/>= revenue ÷ active sites"] --> CV{{"📊 Avg/Site card"}}
  J -->|"shop sales − shop cost"| SP["Shop Profit"] --> CSP{{"🏪 Shop card"}}
  J -->|"valet sales − valet cost"| VP["Valet Profit"] --> CVP{{"☕ Coffee & Valet card"}}
```

| Card | In plain words |
|---|---|
| **Profit Margin** | Profit as a % of revenue. |
| **Labour Cost** | Gross wages + employer NI + pensions. |
| **Bank Balance** | Running total of all bank movements up to the end date (closing position). |
| **Avg Sale / Site** | Total revenue split evenly across the active sites. |

> **Heads-up:** the *Bunkered / Non-Bunkered breakdown* cards on the petrol-data route currently return **zeros** (stub). The working version lives in the legacy dashboard modal. *Status cards* (debtors, creditors, discounts) are **hardcoded zeros** — no live calculation behind them yet.

---

## 4. Chart Flows

```mermaid
flowchart LR
  J[("Journal + 2025 litres")] --> M["Group by month"]
  M --> MT["Monthly Trends<br/>sales · profit · volume · PPL per month"]
  MT --> CH1{{"📈 Monthly Performance / Volume-vs-PPL"}}

  J --> OHM["Overheads grouped by category, per month"]
  OHM --> CH2{{"📉 Overhead Trends"}}

  J --> ROIM["Profit ladder run month by month"]
  ROIM --> CH3{{"📊 ROI Trend"}}

  J --> SITE["Profit calculated per site, top 10"]
  SITE --> CH4{{"🏆 Profit by Site"}}

  J --> GRADE["Split by fuel grade (4000–4004)"]
  GRADE --> CH5{{"⛽ Fuel Grade Breakdown"}}
```

| Chart | What it shows |
|---|---|
| **Monthly Trends** | Sales, profit, litres, and PPL plotted month by month for the selected sites. |
| **PPL Comparison** | Gross PPL vs Actual PPL side by side. |
| **Overhead Trends** | Each overhead category as its own monthly line. |
| **ROI Trend** | The full profit ladder recalculated for every month. |
| **Profit by Site** | Each site's fuel profit, ranked, top 10. |
| **Fuel Grade / Volume Transition** | Litres (and £) broken out per fuel grade. |
| **Daily / Date-wise** | Revenue per day across the range. |

> **Decoration only (no live data):** PPI, Product Summary, Sales Summary, Shop Product Categories, Shop/Valet Margins, Valeting Categories, Orders Donut. These render sample/random numbers.

---

## 5. Pie & Donut Flows

```mermaid
flowchart LR
  J[("Journal")] --> SPLIT["Split revenue into 3 buckets"]
  SPLIT --> F["⛽ Fuel"]
  SPLIT --> S["🏪 Shop"]
  SPLIT --> C["☕ Coffee & Valet"]
  F & S & C --> PIE{{"🥧 Sales Distribution pie"}}

  J --> BV["Group volume by bunkered flag"]
  BV --> B1["Bunkered"] & B2["Non-Bunkered"]
  B1 & B2 --> PIE2{{"🥧 Fuel Supply Type pie"}}
```

| Pie / Donut | Slices | How each slice is sized |
|---|---|---|
| **Sales Distribution** | Fuel · Shop · Coffee & Valet | Add up each bucket separately; slice = its share of the total. |
| **Fuel Supply Type** | Bunkered · Non-Bunkered | Group litres by the site's bunkered flag. |
| **Bunkered vs Non-Bunkered (Sales / Profit)** | 2 slices | Compare the two breakdowns' sales (or profit). |
| **Fuel Grade Mix** | per grade (+ shop/valet) | Volume share per grade; profit share worked out per grade on the screen. |
| **Comparison Pie** | Fuel · Shop · Coffee & Valet | One site's revenue split into the three buckets. |

---

## 6. Table Flows

```mermaid
flowchart LR
  J[("Journal")] --> ROWS["List the relevant codes,<br/>add up each one"]
  ROWS --> BRK{{"📋 Breakdown tables<br/>(Net Sales · Profit · Labour · Overheads · Purchases · Bank)"}}

  J --> PERSITE["Profit per site"]
  PERSITE --> RANK["Sort high → low"]
  RANK --> TOP{{"🏆 Top performers"}}
  RANK --> BOT{{"⚠️ Sites needing improvement"}}
```

| Table | What it lists | Order |
|---|---|---|
| **Breakdown tables** | One row per nominal code with its total (Net Sales, Profit, Labour, Overheads, Purchases, Bank). | by code |
| **Site Rankings** | Each site's sales, profit, and PPL/margin. | profit, high → low (top 5 / bottom 5) |
| **Site-wise Fuel Volume** | Litres per site. | highest first |
| **Metrics Comparison** | Every headline number per site, side by side. | by chosen metric |

---

## 7. Comparison Flow (site vs site)

```mermaid
flowchart LR
  S1["Site A numbers"] --> CALC["Work out the same KPIs<br/>for both sites on screen"]
  S2["Site B numbers"] --> CALC
  CALC --> DIFF["Difference<br/>= |A − B| for each metric"]
  DIFF --> OUT{{"⚖️ Comparison cards · bars · pies"}}
```

- Each site's profit, margin, labour %, volume, and PPL are rebuilt **in the browser** from the per-site responses.
- The comparison shows the **absolute difference** between the two sites for each metric (Sales diff, Profit diff, Volume diff).
- If neither site has volume data, the view automatically switches from **PPL** to **Margin %**.

---

## 8. Rules That Trip People Up

```mermaid
flowchart TD
  A["💡 Sign & edge rules"]
  A --> R1["Costs are negative → add them, don't flip them"]
  A --> R2["Code 4101 = litres only, never £ sales"]
  A --> R3["4101 'reversal' note → subtract those litres"]
  A --> R4["Gross Profit breakdown = exactly 3 rows:<br/>Fuel · Shop · Coffee & Valet"]
  A --> R5["Shop/Valet losses pull profit DOWN<br/>(only fuel is forced positive)"]
```

**Other quirks worth knowing:**
- Legacy `/api/dashboard/metrics` forces the total profit positive — this breaks the "losses subtract" rule; use the petrol-data routes for trustworthy profit.
- The "volume" field on a couple of by-site endpoints is actually a **£ amount**, not litres.
- All site postcodes are blank, so every site resolves to city *"unknown"* (the city map/list comes back empty).
- `petrol-data` *bunkered / non-bunkered breakdown* and the *status cards* are placeholders returning zeros.

---

*This file is a workflow/flow reference — for the exact code-level formulas, see the backend routes (`dashboard.js`, `petrolDataSage.js`, `sageDashboard.js`).*
