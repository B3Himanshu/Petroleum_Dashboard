# PRL Dashboard - Complete Cards & Charts Deep Dive Documentation

## Overview

This document provides an exhaustive technical deep-dive into ALL dashboard components including:

1. **Breakdown Cards** - Bank Balance, Bunkered, Non-Bunkered, Other Income
2. **Charts & Graphs** - Bar Charts, Pie Charts, Line Charts, Donut Charts
3. **Data Tables** - Top Performing Sites, Sites Needing Improvement
4. **KPI Cards** - All primary and secondary metrics

Each section covers the complete data flow from database to display.

---

# Table of Contents

## Part 1: Breakdown Cards
1. [Bank Closing Balance Card](#1-bank-closing-balance-card)
2. [Bunkered Breakdown Card](#2-bunkered-breakdown-card)
3. [Non-Bunkered Breakdown Card](#3-non-bunkered-breakdown-card)
4. [Other Income Breakdown Card](#4-other-income-breakdown-card)

## Part 2: Charts & Graphs
5. [Monthly Fuel Performance Bar Chart](#5-monthly-fuel-performance-bar-chart)
6. [Overall Sales Pie Chart](#6-overall-sales-pie-chart)
7. [Date-wise Data Line Chart](#7-date-wise-data-line-chart)
8. [Avg PPL vs Actual PPL Line Chart](#8-avg-ppl-vs-actual-ppl-line-chart)
9. [Profit Distribution Donut Chart](#9-profit-distribution-donut-chart)

## Part 3: Data Tables
10. [Top Performing Sites Table](#10-top-performing-sites-table)
11. [Sites Needing Improvement Table](#11-sites-needing-improvement-table)

## Part 4: Relationships & Validation
12. [Relationship Between All Components](#12-relationship-between-all-components)
13. [Data Validation Queries](#13-data-validation-queries)

---

# PART 1: BREAKDOWN CARDS

---

# 1. Bank Closing Balance Card

## 1.1 Card Overview

| Property | Value |
|----------|-------|
| **Location** | KPI Row 3 (after Quick Insights) |
| **Width** | Full width card |
| **Label** | "Bank Closing Balance" |
| **Sub-label** | "As of selected end date" |
| **Clickable** | Yes - opens modal with breakdown |
| **Icon** | None |
| **Color Theme** | Default card styling |

## 1.2 What This Card Shows

The **Bank Closing Balance** displays the total combined balance across all company bank accounts as of the selected end date. This is a **cumulative balance**, not a period-based figure.

### Key Concept: Closing Balance vs Period Transactions

| Type | Description |
|------|-------------|
| **Closing Balance** (What we show) | Sum of ALL transactions from beginning of time up to end date |
| **Period Transactions** (NOT what we show) | Sum of transactions only within the selected date range |

**Example:**
- If end date is 30 Nov 2025
- We sum ALL bank transactions from the first transaction ever (Nov 2012) up to 30 Nov 2025
- This gives the true bank balance as of that date

## 1.3 Data Source

### Database Table
```
Table: transactions
```

### Relevant Columns
| Column | Type | Purpose |
|--------|------|---------|
| `nominal_code` | VARCHAR(10) | Identifies bank account (1200, 1223, 1224) |
| `amount` | DECIMAL(15,2) | Transaction amount (+ve = debit, -ve = credit) |
| `transaction_date` | DATE | Date of transaction |
| `deleted_flag` | INTEGER | 0 = Active, 1 = Deleted |

### Bank Account Nominal Codes

| Code | Account Name | Description |
|------|--------------|-------------|
| **1200** | PRL HSBC | Main HSBC bank account for Platinum Retail Limited |
| **1223** | Edmonton A/C | Edmonton branch bank account |
| **1224** | Lloyds Bank | Lloyds banking account |

## 1.4 API Endpoint

```
GET /api/dashboard/bank-balance
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sites` | string | No | Comma-separated site codes (NOT USED for bank balance) |
| `start_date` | string | No | Start date YYYY-MM-DD (NOT USED for bank balance) |
| `end_date` | string | No | End date YYYY-MM-DD - calculates balance as of this date |

**Important:** Bank balance ignores site filter and start_date. Only end_date matters.

## 1.5 Backend Implementation

### File Location
```
backend/app/main.py
Lines: 727-761
Function: get_bank_balance()
```

### Complete Python Code
```python
@app.get("/api/dashboard/bank-balance")
def get_bank_balance(sites: Optional[str] = None, start_date: Optional[str] = None,
                     end_date: Optional[str] = None):
    """Get Bank Closing Balance as of end_date (codes 1223, 1224, 1200)"""
    conditions = ["deleted_flag = 0", "nominal_code IN ('1223', '1224', '1200')"]
    params = []

    if end_date:
        conditions.append("transaction_date <= %s")
        params.append(end_date)

    where = " AND ".join(conditions)

    query = f"""
        SELECT
            SUM(CASE WHEN nominal_code = '1223' THEN amount ELSE 0 END) as edmonton,
            SUM(CASE WHEN nominal_code = '1224' THEN amount ELSE 0 END) as lloyds,
            SUM(CASE WHEN nominal_code = '1200' THEN amount ELSE 0 END) as prl_hsbc
        FROM transactions
        WHERE {where}
    """

    result = execute_single(query, tuple(params) if params else None)
    edmonton = float(result["edmonton"] or 0)
    lloyds = float(result["lloyds"] or 0)
    prl_hsbc = float(result["prl_hsbc"] or 0)

    return {
        "edmonton": edmonton,
        "lloyds": lloyds,
        "prl_hsbc": prl_hsbc,
        "total": edmonton + lloyds + prl_hsbc
    }
```

## 1.6 SQL Query Deep Dive

### Complete SQL Query
```sql
SELECT
    SUM(CASE WHEN nominal_code = '1223' THEN amount ELSE 0 END) as edmonton,
    SUM(CASE WHEN nominal_code = '1224' THEN amount ELSE 0 END) as lloyds,
    SUM(CASE WHEN nominal_code = '1200' THEN amount ELSE 0 END) as prl_hsbc
FROM transactions
WHERE deleted_flag = 0
  AND nominal_code IN ('1223', '1224', '1200')
  AND transaction_date <= '2025-11-30'  -- Example end date
```

### Query Breakdown

| Clause | Purpose |
|--------|---------|
| `SUM(CASE WHEN...)` | Separates amounts by bank account |
| `deleted_flag = 0` | Excludes soft-deleted transactions |
| `nominal_code IN (...)` | Filters to only bank account codes |
| `transaction_date <= end_date` | Gets cumulative balance up to end date |

### Why No ABS() Function?

Unlike other cards, we do **NOT** use `ABS()` here because:
- Bank transactions can be positive (deposits) or negative (withdrawals)
- The running balance is the algebraic sum of all transactions
- Using ABS would give incorrect balance

## 1.7 Calculation Formula

```
Bank Closing Balance = Edmonton A/C + Lloyds Bank + PRL HSBC

Where each account balance:
Account Balance = SUM(all transactions for that account up to end_date)
```

### Example Calculation

| Account | Transactions Sum | Balance |
|---------|------------------|---------|
| Edmonton A/C (1223) | +500,000 - 350,000 + 100,000 | £250,000 |
| Lloyds Bank (1224) | +800,000 - 520,000 | £280,000 |
| PRL HSBC (1200) | +1,200,000 - 680,000 | £520,000 |
| **Total** | - | **£1,050,000** |

## 1.8 API Response

```json
{
    "edmonton": 250000.00,
    "lloyds": 280000.00,
    "prl_hsbc": 520000.00,
    "total": 1050000.00
}
```

## 1.9 Frontend Implementation

### Main Card Display

**File:** `frontend/js/app.js`
**Function:** `updateBankBalance()` (lines 265-274)

```javascript
function updateBankBalance(data) {
    // Main card
    document.getElementById('bankTotalValue').textContent = formatCurrency(data.total);

    // Modal breakdown
    document.getElementById('modalBankEdmonton').textContent = formatCurrency(data.edmonton);
    document.getElementById('modalBankLloyds').textContent = formatCurrency(data.lloyds);
    document.getElementById('modalBankPrlHsbc').textContent = formatCurrency(data.prl_hsbc);
    document.getElementById('modalBankTotal').textContent = formatCurrency(data.total);
}
```

### HTML Element IDs

| Element ID | Purpose | Format |
|------------|---------|--------|
| `bankTotalValue` | Main card display | Currency (£ X.XX M/K) |
| `modalBankEdmonton` | Modal - Edmonton account | Currency |
| `modalBankLloyds` | Modal - Lloyds account | Currency |
| `modalBankPrlHsbc` | Modal - PRL HSBC account | Currency |
| `modalBankTotal` | Modal - Total balance | Currency |

## 1.10 Modal Breakdown

### Modal Structure
```
┌─────────────────────────────────────────┐
│  Bank Closing Balance            [X]    │
├─────────────────────────────────────────┤
│  Edmonton A/C (1223)        £250,000    │
│  Lloyds Bank (1224)         £280,000    │
│  PRL HSBC (1200)            £520,000    │
│  ─────────────────────────────────────  │
│  Total Balance            £1,050,000    │
└─────────────────────────────────────────┘
```

## 1.11 Currency Formatting

**File:** `frontend/js/api.js`
**Function:** `formatCurrency()` (lines 135-147)

```javascript
function formatCurrency(value) {
    if (value === null || value === undefined) return '£ 0';
    const absValue = Math.abs(value);
    if (absValue >= 1000000) {
        return `£ ${(value / 1000000).toFixed(2)} M`;  // e.g., £1.05 M
    } else if (absValue >= 1000) {
        return `£ ${(value / 1000).toFixed(1)} K`;    // e.g., £250.0 K
    } else {
        return `£ ${value.toFixed(2)}`;               // e.g., £999.99
    }
}
```

---

# 2. Bunkered Breakdown Card

## 2.1 Card Overview

| Property | Value |
|----------|-------|
| **Location** | Breakdown Cards Row, First card (left) |
| **Header** | "Bunkered" |
| **Header Icon** | `local_gas_station` (Material Icons) |
| **Header Color** | Blue gradient (#3B82F6 to #1D4ED8) |
| **Clickable** | No |

## 2.2 What is a Bunkered Site?

A **bunkered site** is a fuel station that:

1. **Purchases fuel in bulk** - Buys large quantities directly from suppliers
2. **Stores fuel on-site** - Has large underground storage tanks (bunkers)
3. **Manages own inventory** - Tracks opening/closing stock values
4. **Has different margin structure** - Typically higher volumes, different pricing

### Bunkered vs Non-Bunkered Comparison

| Aspect | Bunkered | Non-Bunkered |
|--------|----------|--------------|
| Fuel Storage | Large on-site tanks | Minimal storage |
| Purchasing | Bulk orders | Frequent deliveries |
| Inventory Risk | Higher (price fluctuations) | Lower |
| Typical Volume | Higher | Lower |
| Margin Control | More control | Less control |

## 2.3 Complete List of Bunkered Sites (11 Sites)

| Site Code | Site Name |
|-----------|-----------|
| 10 | Lanner Moor Garage |
| 17 | Delph SS |
| 18 | Saxon Autopoint SS |
| 30 | Park View |
| 31 | Filleybrook SS |
| 33 | Swan Connect |
| 34 | Portland |
| 35 | Lower Lane |
| 36 | Vale SS |
| 43 | Yeovil SS |
| 44 | Canklow SS |

## 2.4 Data Source

### Database Tables
```
Primary: fuel_margin_data
Join: sites (for is_bunkered flag)
```

### SQL Query for Bunkered Data
```sql
SELECT
    SUM(CASE WHEN s.is_bunkered = TRUE THEN f.sale_volume ELSE 0 END) as bunkered_volume,
    SUM(CASE WHEN s.is_bunkered = TRUE THEN f.net_sales ELSE 0 END) as bunkered_sales,
    SUM(CASE WHEN s.is_bunkered = TRUE THEN f.fuel_profit ELSE 0 END) as bunkered_profit
FROM fuel_margin_data f
JOIN sites s ON f.site_code = s.site_code
WHERE f.site_code NOT IN (0, 1)
  AND (f.year > 2025 OR (f.year = 2025 AND f.month >= 5))
  AND (f.year < 2025 OR (f.year = 2025 AND f.month <= 11))
```

## 2.5 Metrics Displayed

| Metric | Element ID | Formula | Unit |
|--------|------------|---------|------|
| Volume | `bunkeredVolume` | `SUM(sale_volume)` WHERE bunkered | Liters |
| Sales | `bunkeredSales` | `SUM(net_sales)` WHERE bunkered | £ |
| Profit | `bunkeredProfit` | `SUM(fuel_profit)` WHERE bunkered | £ |

## 2.6 Profit Calculation

```
Fuel Profit = Net Sales + Closing Stock - Opening Stock - Purchases
```

## 2.7 API Response Fields

```json
{
    "bunkered_volume": 5000000.00,
    "bunkered_sales": 4500000.00,
    "bunkered_profit": 400000.00
}
```

## 2.8 Visual Display

```
┌─────────────────────────────────┐
│ ⛽ Bunkered                     │  ← Blue gradient header
├─────────────────────────────────┤
│ Volume            5.00 M L      │
│ Sales             £4.50 M       │
│ Profit            £400.0 K      │
└─────────────────────────────────┘
```

---

# 3. Non-Bunkered Breakdown Card

## 3.1 Card Overview

| Property | Value |
|----------|-------|
| **Location** | Breakdown Cards Row, Second card (middle) |
| **Header** | "Non-Bunkered" |
| **Header Icon** | `local_gas_station` (Material Icons) |
| **Header Color** | Green gradient (#10B981 to #059669) |
| **Clickable** | No |

## 3.2 What is a Non-Bunkered Site?

A **non-bunkered site** receives regular fuel deliveries without large on-site storage.

## 3.3 Complete List of Non-Bunkered Sites (18 Sites)

| Site Code | Site Name |
|-----------|-----------|
| 6 | Manor Service Station |
| 7 | Hen And Chicken SS |
| 9 | Salterton Road SS |
| 11 | Luton Road SS |
| 14 | Kings Lane SS |
| 19 | Jubits Lane SS |
| 20 | Worsley Brow |
| 23 | Auto Pitstop |
| 24 | Crown SS |
| 25 | Marsland SS |
| 29 | Gemini SS |
| 37 | Kensington SS |
| 38 | County Oak SS |
| 39 | Kings Of Sedgley |
| 40 | Gnosall SS |
| 41 | Minsterley SS |
| 42 | Nelson SS |
| 45 | Stanton Self Service |

## 3.4 SQL Query

```sql
SELECT
    SUM(CASE WHEN s.is_bunkered = FALSE OR s.is_bunkered IS NULL
        THEN f.sale_volume ELSE 0 END) as non_bunkered_volume,
    SUM(CASE WHEN s.is_bunkered = FALSE OR s.is_bunkered IS NULL
        THEN f.net_sales ELSE 0 END) as non_bunkered_sales,
    SUM(CASE WHEN s.is_bunkered = FALSE OR s.is_bunkered IS NULL
        THEN f.fuel_profit ELSE 0 END) as non_bunkered_profit
FROM fuel_margin_data f
JOIN sites s ON f.site_code = s.site_code
WHERE f.site_code NOT IN (0, 1)
```

## 3.5 API Response Fields

```json
{
    "non_bunkered_volume": 10000000.00,
    "non_bunkered_sales": 7500000.00,
    "non_bunkered_profit": 800000.00
}
```

## 3.6 Visual Display

```
┌─────────────────────────────────┐
│ ⛽ Non-Bunkered                 │  ← Green gradient header
├─────────────────────────────────┤
│ Volume           10.00 M L      │
│ Sales             £7.50 M       │
│ Profit            £800.0 K      │
└─────────────────────────────────┘
```

---

# 4. Other Income Breakdown Card

## 4.1 Card Overview

| Property | Value |
|----------|-------|
| **Location** | Breakdown Cards Row, Third card (right) |
| **Header** | "Other Income" |
| **Header Icon** | `payments` (Material Icons) |
| **Header Color** | Purple gradient (#8B5CF6 to #7C3AED) |
| **Clickable** | Yes - opens modal with breakdown |

## 4.2 Income Categories

| Code | Name | Description |
|------|------|-------------|
| **6100** | Fuel Commissions | Commission from fuel sales agreements |
| **6101** | Daily Facility Fees | Daily rental fees for facilities |
| **6102** | Valeting Commissions | Commission from car valeting services |

**Note:** Other Income is 100% profit (no associated costs)

## 4.3 SQL Query

```sql
SELECT
    ABS(SUM(CASE WHEN nominal_code = '6100' THEN amount ELSE 0 END)) as fuel_commissions,
    ABS(SUM(CASE WHEN nominal_code = '6101' THEN amount ELSE 0 END)) as daily_facility_fees,
    ABS(SUM(CASE WHEN nominal_code = '6102' THEN amount ELSE 0 END)) as valeting_commissions
FROM transactions
WHERE site_code NOT IN (0, 1)
  AND deleted_flag = 0
  AND nominal_code IN ('6100', '6101', '6102')
  AND transaction_date >= '2025-05-01'
  AND transaction_date <= '2025-11-30'
```

## 4.4 API Response

```json
{
    "fuel_commissions": 100000.00,
    "daily_facility_fees": 150000.00,
    "valeting_commissions": 50000.00,
    "total": 300000.00
}
```

## 4.5 Modal Breakdown

```
┌─────────────────────────────────────────┐
│  Other Income Breakdown          [X]    │
├─────────────────────────────────────────┤
│  Fuel Commissions (6100)    £100,000    │
│  Daily Facility Fees (6101) £150,000    │
│  Valeting Commissions (6102) £50,000    │
│  ─────────────────────────────────────  │
│  Total Other Income         £300,000    │
└─────────────────────────────────────────┘
```

---

# PART 2: CHARTS & GRAPHS

---

# 5. Monthly Fuel Performance Bar Chart

## 5.1 Chart Overview

| Property | Value |
|----------|-------|
| **Location** | Charts Row 1, Left side (large) |
| **Title** | "Monthly Fuel Performance" |
| **Chart Type** | Grouped Bar Chart |
| **Library** | Chart.js |
| **Canvas ID** | `monthlyTrendsChart` |

## 5.2 What This Chart Shows

Compares **Sales**, **Volume**, and **Profit** across months to identify trends and seasonal patterns.

## 5.3 Visual Representation

```
Monthly Fuel Performance

  │
  │     ██
  │     ██ ██                 ██
  │ ██  ██ ██  ██  ██  ██ ██  ██  ██  ██  ██
  │ ██  ██ ██  ██  ██  ██ ██  ██  ██  ██  ██
  │ ██  ██ ██  ██  ██  ██ ██  ██  ██  ██  ██
  └──────────────────────────────────────────────
    Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec

    ██ Sales   ██ Volume   ██ Profit
```

## 5.4 Data Source

### Database Table
```
Table: monthly_summary
```

### API Endpoint
```
GET /api/dashboard/monthly-trends
```

## 5.5 Backend Implementation

### File Location
```
backend/app/main.py
Lines: 517-544
Function: get_monthly_trends()
```

### Complete Python Code
```python
@app.get("/api/dashboard/monthly-trends")
def get_monthly_trends(sites: Optional[str] = None, year: Optional[int] = None,
                       months: Optional[str] = None, start_date: Optional[str] = None,
                       end_date: Optional[str] = None):
    """Get monthly trends for bar chart - Fuel only"""
    where, params = build_where_clause(sites, year, months, "", start_date, end_date)

    month_names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    query = f"""
        SELECT month,
            SUM(bunkered_sales + non_bunkered_sales) as sales,
            SUM(bunkered_volume + non_bunkered_volume) as volume,
            SUM(bunkered_sales + non_bunkered_sales -
                bunkered_purchases - non_bunkered_purchases) as profit
        FROM monthly_summary WHERE {where}
        GROUP BY month ORDER BY month
    """

    results = execute_query(query, tuple(params) if params else None)

    return [
        {
            "month_name": month_names[r["month"]],
            "sales": float(r["sales"] or 0),
            "volume": float(r["volume"] or 0),
            "profit": float(r["profit"] or 0)
        }
        for r in results
    ]
```

## 5.6 SQL Query Deep Dive

```sql
SELECT
    month,
    SUM(bunkered_sales + non_bunkered_sales) as sales,
    SUM(bunkered_volume + non_bunkered_volume) as volume,
    SUM(bunkered_sales + non_bunkered_sales -
        bunkered_purchases - non_bunkered_purchases) as profit
FROM monthly_summary
WHERE site_code NOT IN (0, 1)
  AND year = 2025
GROUP BY month
ORDER BY month
```

### Query Breakdown

| Field | Calculation |
|-------|-------------|
| `sales` | Bunkered Sales + Non-Bunkered Sales |
| `volume` | Bunkered Volume + Non-Bunkered Volume |
| `profit` | Total Sales - Total Purchases |

## 5.7 API Response

```json
[
    {"month_name": "May", "sales": 15000000.00, "volume": 12000000.00, "profit": 1200000.00},
    {"month_name": "Jun", "sales": 16500000.00, "volume": 13200000.00, "profit": 1350000.00},
    {"month_name": "Jul", "sales": 18000000.00, "volume": 14500000.00, "profit": 1500000.00},
    {"month_name": "Aug", "sales": 17500000.00, "volume": 14000000.00, "profit": 1400000.00},
    {"month_name": "Sep", "sales": 16000000.00, "volume": 12800000.00, "profit": 1300000.00},
    {"month_name": "Oct", "sales": 15500000.00, "volume": 12400000.00, "profit": 1250000.00},
    {"month_name": "Nov", "sales": 14500000.00, "volume": 11600000.00, "profit": 1150000.00}
]
```

## 5.8 Frontend Implementation

### JavaScript Code
**File:** `frontend/js/app.js`
**Function:** `updateMonthlyTrendsChart()` (lines 366-375)

```javascript
function updateMonthlyTrendsChart(data) {
    const labels = data.map(t => t.month_name);
    const datasets = [
        { label: 'Sales', data: data.map(t => t.sales), color: COLORS.primary },
        { label: 'Volume', data: data.map(t => t.volume), color: COLORS.teal },
        { label: 'Profit', data: data.map(t => t.profit), color: COLORS.orange }
    ];

    createBarChart('monthlyTrendsChart', labels, datasets);
}
```

### Chart.js Configuration
**File:** `frontend/js/charts.js`

```javascript
function createBarChart(canvasId, labels, datasets) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets.map(ds => ({
                label: ds.label,
                data: ds.data,
                backgroundColor: ds.color,
                borderRadius: 4
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
```

## 5.9 Data Series Details

| Series | Color | Color Code | What It Represents |
|--------|-------|------------|-------------------|
| Sales | Blue | #3B82F6 | Total fuel revenue |
| Volume | Teal | #14B8A6 | Total liters sold |
| Profit | Orange | #F97316 | Sales minus purchases |

---

# 6. Overall Sales Pie Chart

## 6.1 Chart Overview

| Property | Value |
|----------|-------|
| **Location** | Charts Row 1, Right side (small) |
| **Title** | "Overall Sales" |
| **Chart Type** | Pie Chart |
| **Library** | Chart.js |
| **Canvas ID** | `salesPieChart` |

## 6.2 What This Chart Shows

Shows the distribution of total sales across three categories:
- **Bunkered** - Sales from bunkered sites
- **Non-Bunkered** - Sales from non-bunkered sites
- **Other Income** - Non-fuel revenue

## 6.3 Visual Representation

```
        Overall Sales

           ╱╲
          ╱  ╲
         ╱ 35%╲      ← Bunkered (Blue)
        ╱      ╲
       ╱────────╲
      │   50%    │   ← Non-Bunkered (Green)
       ╲────────╱
        ╲  15% ╱     ← Other Income (Purple)
         ╲    ╱
          ╲  ╱
           ╲╱
```

## 6.4 API Endpoint

```
GET /api/dashboard/sales-distribution
```

## 6.5 Backend Implementation

### File Location
```
backend/app/main.py
Lines: 487-510
Function: get_sales_distribution()
```

### Complete Python Code
```python
@app.get("/api/dashboard/sales-distribution")
def get_sales_distribution(sites: Optional[str] = None, year: Optional[int] = None,
                           months: Optional[str] = None, start_date: Optional[str] = None,
                           end_date: Optional[str] = None):
    """Get pie chart data - bunkered/non-bunkered + other income"""
    where, params = build_where_clause(sites, year, months, "m", start_date, end_date)

    query = f"""
        SELECT
            SUM(CASE WHEN s.is_bunkered = TRUE
                THEN m.bunkered_sales + m.non_bunkered_sales ELSE 0 END) as bunkered,
            SUM(CASE WHEN s.is_bunkered = FALSE OR s.is_bunkered IS NULL
                THEN m.bunkered_sales + m.non_bunkered_sales ELSE 0 END) as non_bunkered
        FROM monthly_summary m
        JOIN sites s ON m.site_code = s.site_code
        WHERE {where}
    """
    r = execute_single(query, tuple(params) if params else None)

    # Get Other Income from transactions
    other_income_data = get_other_income_from_transactions(sites, start_date, end_date)

    return [
        {"category": "Bunkered", "amount": float(r["bunkered"] or 0)},
        {"category": "Non-Bunkered", "amount": float(r["non_bunkered"] or 0)},
        {"category": "Other Income", "amount": other_income_data["total"]}
    ]
```

## 6.6 SQL Query

```sql
SELECT
    SUM(CASE WHEN s.is_bunkered = TRUE
        THEN m.bunkered_sales + m.non_bunkered_sales ELSE 0 END) as bunkered,
    SUM(CASE WHEN s.is_bunkered = FALSE OR s.is_bunkered IS NULL
        THEN m.bunkered_sales + m.non_bunkered_sales ELSE 0 END) as non_bunkered
FROM monthly_summary m
JOIN sites s ON m.site_code = s.site_code
WHERE m.site_code NOT IN (0, 1)
```

## 6.7 API Response

```json
[
    {"category": "Bunkered", "amount": 4500000.00},
    {"category": "Non-Bunkered", "amount": 7500000.00},
    {"category": "Other Income", "amount": 300000.00}
]
```

## 6.8 Frontend Implementation

### JavaScript Code
```javascript
function updateSalesChart(data) {
    const labels = data.map(d => d.category);
    const values = data.map(d => d.amount);
    createPieChart('salesPieChart', labels, values);
}
```

### Chart.js Pie Chart
```javascript
function createPieChart(canvasId, labels, values) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}
```

## 6.9 Color Mapping

| Segment | Color | Hex Code |
|---------|-------|----------|
| Bunkered | Blue | #3B82F6 |
| Non-Bunkered | Green | #10B981 |
| Other Income | Purple | #8B5CF6 |

---

# 7. Date-wise Data Line Chart

## 7.1 Chart Overview

| Property | Value |
|----------|-------|
| **Location** | Charts Row 2, Left side (large) |
| **Title** | "Date-wise Data" |
| **Chart Type** | Multi-line Chart |
| **Library** | Chart.js |
| **Canvas ID** | `dailyChart` |
| **Filter** | Month dropdown selector |

## 7.2 What This Chart Shows

Daily trends for three metrics:
- **Fuel Volume** - Daily liters sold
- **Fuel Sales** - Daily revenue
- **Average PPL** - Daily profit per liter

## 7.3 Visual Representation

```
Date-wise Data                    [Month Filter ▼]

  │
  │    ╱╲      ╱╲
  │   ╱  ╲    ╱  ╲         ╱╲
  │  ╱    ╲  ╱    ╲       ╱  ╲
  │ ╱      ╲╱      ╲     ╱    ╲
  │╱                ╲   ╱      ╲
  │                  ╲ ╱        ╲
  │                   ╲
  └──────────────────────────────────
    1  5  10  15  20  25  30

    ── Fuel Volume   ── Fuel Sales   ── Average PPL
```

## 7.4 API Endpoint

```
GET /api/dashboard/daily-data
```

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `sites` | string | Site filter |
| `year` | int | Year filter |
| `month` | int | Month filter (1-12) |
| `start_date` | string | Start date |
| `end_date` | string | End date |

## 7.5 Backend Implementation

### File Location
```
backend/app/main.py
Lines: 547-600
Function: get_daily_data()
```

### Complete Python Code
```python
@app.get("/api/dashboard/daily-data")
def get_daily_data(sites: Optional[str] = None, year: Optional[int] = None,
                   month: Optional[int] = None, start_date: Optional[str] = None,
                   end_date: Optional[str] = None):
    """Get daily data for line chart - Fuel only"""
    conditions = ["site_code NOT IN (0, 1)"]
    params = []

    if sites:
        site_list = [int(s) for s in sites.split(",")]
        conditions.append(f"site_code IN ({','.join(['%s']*len(site_list))})")
        params.extend(site_list)

    if start_date and end_date:
        conditions.append("summary_date >= %s")
        conditions.append("summary_date <= %s")
        params.extend([start_date, end_date])
    else:
        if year:
            conditions.append("EXTRACT(YEAR FROM summary_date) = %s")
            params.append(year)
        if month:
            conditions.append("EXTRACT(MONTH FROM summary_date) = %s")
            params.append(month)

    where = " AND ".join(conditions)

    query = f"""
        SELECT
            summary_date as date,
            SUM(bunkered_volume + non_bunkered_volume) as fuel_volume,
            SUM(bunkered_sales + non_bunkered_sales) as fuel_sales,
            CASE WHEN SUM(bunkered_volume + non_bunkered_volume) > 0 THEN
                (SUM(bunkered_sales + non_bunkered_sales -
                     bunkered_purchases - non_bunkered_purchases) /
                 SUM(bunkered_volume + non_bunkered_volume) * 100)
            ELSE 0 END as avg_ppl
        FROM daily_summary
        WHERE {where}
        GROUP BY summary_date
        ORDER BY summary_date
    """

    results = execute_query(query, tuple(params) if params else None)

    return [
        {
            "date": str(r["date"]),
            "fuel_volume": float(r["fuel_volume"] or 0),
            "fuel_sales": float(r["fuel_sales"] or 0),
            "avg_ppl": round(float(r["avg_ppl"] or 0), 2)
        }
        for r in results
    ]
```

## 7.6 SQL Query Deep Dive

```sql
SELECT
    summary_date as date,
    SUM(bunkered_volume + non_bunkered_volume) as fuel_volume,
    SUM(bunkered_sales + non_bunkered_sales) as fuel_sales,
    CASE WHEN SUM(bunkered_volume + non_bunkered_volume) > 0 THEN
        (SUM(bunkered_sales + non_bunkered_sales -
             bunkered_purchases - non_bunkered_purchases) /
         SUM(bunkered_volume + non_bunkered_volume) * 100)
    ELSE 0 END as avg_ppl
FROM daily_summary
WHERE site_code NOT IN (0, 1)
  AND summary_date >= '2025-05-01'
  AND summary_date <= '2025-11-30'
GROUP BY summary_date
ORDER BY summary_date
```

### Calculations

| Field | Formula |
|-------|---------|
| `fuel_volume` | Bunkered Volume + Non-Bunkered Volume |
| `fuel_sales` | Bunkered Sales + Non-Bunkered Sales |
| `avg_ppl` | (Profit / Volume) × 100 |

## 7.7 API Response

```json
[
    {"date": "2025-11-01", "fuel_volume": 450000.00, "fuel_sales": 520000.00, "avg_ppl": 8.25},
    {"date": "2025-11-02", "fuel_volume": 480000.00, "fuel_sales": 555000.00, "avg_ppl": 8.40},
    {"date": "2025-11-03", "fuel_volume": 420000.00, "fuel_sales": 485000.00, "avg_ppl": 8.10},
    ...
]
```

## 7.8 Frontend Implementation

### JavaScript Code
```javascript
function updateDailyChart(data) {
    const labels = data.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const datasets = [
        { label: 'Fuel Volume', data: data.map(d => d.fuel_volume), color: '#3B82F6' },
        { label: 'Fuel Sales', data: data.map(d => d.fuel_sales), color: '#EC4899' },
        { label: 'Average PPL', data: data.map(d => d.avg_ppl), color: '#8B5CF6' }
    ];

    createLineChart('dailyChart', labels, datasets);
}
```

### Month Filter Handler
```javascript
async function updateDailyChartFilter() {
    const monthFilter = document.getElementById('dailyMonthFilter');
    const month = monthFilter ? monthFilter.value : null;

    const daily = await fetchDailyData(month);
    if (daily) {
        updateDailyChart(daily);
    }
}
```

## 7.9 Data Series Details

| Series | Color | Hex Code | Y-Axis |
|--------|-------|----------|--------|
| Fuel Volume | Blue | #3B82F6 | Liters |
| Fuel Sales | Pink | #EC4899 | £ |
| Average PPL | Purple | #8B5CF6 | Pence |

---

# 8. Avg PPL vs Actual PPL Line Chart

## 8.1 Chart Overview

| Property | Value |
|----------|-------|
| **Location** | Charts Row 2, Right side (small) |
| **Title** | "Avg PPL vs Actual PPL" |
| **Chart Type** | Dual-line Chart |
| **Library** | Chart.js |
| **Canvas ID** | `pplChart` |

## 8.2 What This Chart Shows

Compares two metrics over time:
- **Avg PPL** - Profit Per Liter (how much you earn per liter)
- **Actual PPL** - Overhead cost per liter (how much overheads consume per liter)

The gap between these lines shows the real net profit per liter.

## 8.3 Visual Representation

```
Avg PPL vs Actual PPL

  │
  │  ────────────────────────── Avg PPL (8p)
  │
  │  ══════════════════════════ Actual PPL (6p)
  │
  │
  └──────────────────────────────────
    1  5  10  15  20  25  30

    ── Avg PPL (Profit/Liter)
    ══ Actual PPL (Overheads/Liter)

    Gap = Real Net Profit per Liter (2p)
```

## 8.4 API Endpoint

```
GET /api/dashboard/ppl-comparison
```

## 8.5 Backend Implementation

### File Location
```
backend/app/main.py
Lines: 603-653
Function: get_ppl_comparison()
```

### Complete Python Code
```python
@app.get("/api/dashboard/ppl-comparison")
def get_ppl_comparison(sites: Optional[str] = None, year: Optional[int] = None,
                       month: Optional[int] = None, start_date: Optional[str] = None,
                       end_date: Optional[str] = None):
    """Get PPL comparison data"""
    conditions = ["site_code NOT IN (0, 1)"]
    params = []

    # ... filter building ...

    query = f"""
        SELECT
            summary_date as date,
            SUM(bunkered_volume + non_bunkered_volume) as volume,
            SUM(bunkered_sales + non_bunkered_sales -
                bunkered_purchases - non_bunkered_purchases) as profit,
            SUM(overheads) as overheads
        FROM daily_summary
        WHERE {where}
        GROUP BY summary_date
        HAVING SUM(bunkered_volume + non_bunkered_volume) > 0
        ORDER BY summary_date
    """

    results = execute_query(query, tuple(params) if params else None)

    return [
        {
            "date": str(r["date"]),
            "avg_ppl": round(float(r["profit"] or 0) / float(r["volume"]) * 100, 2),
            "actual_ppl": round(float(r["overheads"] or 0) / float(r["volume"]) * 100, 2)
        }
        for r in results
    ]
```

## 8.6 Calculations

| Metric | Formula | Meaning |
|--------|---------|---------|
| **Avg PPL** | `(Profit / Volume) × 100` | Pence earned per liter |
| **Actual PPL** | `(Overheads / Volume) × 100` | Pence overhead cost per liter |
| **Net PPL** | `Avg PPL - Actual PPL` | Real profit after overheads |

## 8.7 API Response

```json
[
    {"date": "2025-11-01", "avg_ppl": 8.25, "actual_ppl": 6.10},
    {"date": "2025-11-02", "avg_ppl": 8.40, "actual_ppl": 6.15},
    {"date": "2025-11-03", "avg_ppl": 8.10, "actual_ppl": 5.95},
    ...
]
```

## 8.8 Frontend Implementation

```javascript
function updatePplChart(data) {
    const labels = data.map(d => {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    const datasets = [
        { label: 'Avg PPL', data: data.map(d => d.avg_ppl), color: COLORS.primary },
        { label: 'Actual PPL', data: data.map(d => d.actual_ppl), color: COLORS.orange }
    ];

    createLineChart('pplChart', labels, datasets);
}
```

## 8.9 Interpretation Guide

| Scenario | Meaning |
|----------|---------|
| Avg PPL > Actual PPL | Profitable (making money after overheads) |
| Avg PPL = Actual PPL | Break-even (covering overheads exactly) |
| Avg PPL < Actual PPL | Loss (overheads exceed profit) |
| Gap widening | Improving profitability |
| Gap narrowing | Declining profitability |

---

# 9. Profit Distribution Donut Chart

## 9.1 Chart Overview

| Property | Value |
|----------|-------|
| **Location** | Below Site Rankings Tables |
| **Title** | "Profit Distribution by Site" |
| **Chart Type** | Donut Chart |
| **Library** | Chart.js |
| **Canvas ID** | `profitDonutChart` |

## 9.2 What This Chart Shows

Displays the profit contribution of each site as a percentage of total profit. Shows top 10 sites by profit.

## 9.3 Visual Representation

```
    Profit Distribution by Site

           ╭─────────╮
         ╱    Site    ╲
        │   1: 15%     │
        │   2: 12%     │
        │   3: 10%     │
        │    ...       │
        │   10: 5%     │
         ╲            ╱
           ╰─────────╯

    [Site 1] [Site 2] [Site 3] ... [Site 10]
```

## 9.4 API Endpoint

```
GET /api/dashboard/profit-by-site
```

## 9.5 Backend Implementation

### File Location
```
backend/app/main.py
Lines: 697-717
Function: get_profit_by_site()
```

### Complete Python Code
```python
@app.get("/api/dashboard/profit-by-site")
def get_profit_by_site(sites: Optional[str] = None, year: Optional[int] = None,
                       months: Optional[str] = None, start_date: Optional[str] = None,
                       end_date: Optional[str] = None):
    """Get profit by site for donut chart - Fuel only"""
    where, params = build_where_clause(sites, year, months, "m", start_date, end_date)

    query = f"""
        SELECT
            s.site_name,
            SUM(m.bunkered_sales + m.non_bunkered_sales -
                m.bunkered_purchases - m.non_bunkered_purchases) as profit
        FROM monthly_summary m
        JOIN sites s ON m.site_code = s.site_code
        WHERE {where}
        GROUP BY s.site_code, s.site_name
        ORDER BY profit DESC
        LIMIT 10
    """

    results = execute_query(query, tuple(params) if params else None)
    return [{"site_name": r["site_name"], "profit": float(r["profit"] or 0)} for r in results]
```

## 9.6 SQL Query

```sql
SELECT
    s.site_name,
    SUM(m.bunkered_sales + m.non_bunkered_sales -
        m.bunkered_purchases - m.non_bunkered_purchases) as profit
FROM monthly_summary m
JOIN sites s ON m.site_code = s.site_code
WHERE m.site_code NOT IN (0, 1)
GROUP BY s.site_code, s.site_name
ORDER BY profit DESC
LIMIT 10
```

## 9.7 API Response

```json
[
    {"site_name": "Manor Service Station", "profit": 185000.00},
    {"site_name": "Hen And Chicken SS", "profit": 165000.00},
    {"site_name": "Salterton Road SS", "profit": 152000.00},
    {"site_name": "Delph SS", "profit": 145000.00},
    {"site_name": "Saxon Autopoint SS", "profit": 138000.00},
    {"site_name": "Park View", "profit": 125000.00},
    {"site_name": "Crown SS", "profit": 118000.00},
    {"site_name": "Gemini SS", "profit": 112000.00},
    {"site_name": "Portland", "profit": 105000.00},
    {"site_name": "Worsley Brow", "profit": 98000.00}
]
```

## 9.8 Frontend Implementation

```javascript
function updateProfitDonutChart(data) {
    const labels = data.map(d => d.site_name);
    const values = data.map(d => d.profit);
    createDonutChart('profitDonutChart', labels, values);
}
```

### Donut Chart Configuration
```javascript
function createDonutChart(canvasId, labels, values) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#3B82F6', '#10B981', '#F97316', '#8B5CF6',
                    '#EC4899', '#14B8A6', '#F59E0B', '#EF4444',
                    '#6366F1', '#84CC16'
                ],
                borderWidth: 0,
                cutout: '60%'  // Creates the donut hole
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}
```

---

# PART 3: DATA TABLES

---

# 10. Top Performing Sites Table

## 10.1 Table Overview

| Property | Value |
|----------|-------|
| **Location** | Tables Row, Left side |
| **Title** | "Top Performing Sites" |
| **Table ID** | `topSitesTable` |
| **Shows** | Top 5 sites by Net Sales |

## 10.2 What This Table Shows

Ranks the best-performing fuel stations based on net sales, also showing their PPL and profit margin.

## 10.3 Visual Representation

```
┌──────────────────────────────────────────────────────────────┐
│                    Top Performing Sites                      │
├──────┬─────────────────────────┬───────────┬───────┬────────┤
│ Rank │ Site                    │ Net Sales │  PPL  │ Margin │
├──────┼─────────────────────────┼───────────┼───────┼────────┤
│  🥇  │ Manor Service Station   │ £2.50 M   │ 8.25p │ 10.2%  │
│  🥈  │ Hen And Chicken SS      │ £2.20 M   │ 7.95p │  9.8%  │
│  🥉  │ Salterton Road SS       │ £2.05 M   │ 8.10p │  9.5%  │
│  4   │ Delph SS                │ £1.95 M   │ 7.80p │  9.2%  │
│  5   │ Saxon Autopoint SS      │ £1.85 M   │ 8.05p │  9.0%  │
└──────┴─────────────────────────┴───────────┴───────┴────────┘
```

## 10.4 API Endpoint

```
GET /api/dashboard/site-rankings
```

## 10.5 Backend Implementation

### File Location
```
backend/app/main.py
Lines: 660-694
Function: get_site_rankings()
```

### Complete Python Code
```python
@app.get("/api/dashboard/site-rankings")
def get_site_rankings(sites: Optional[str] = None, year: Optional[int] = None,
                      months: Optional[str] = None, start_date: Optional[str] = None,
                      end_date: Optional[str] = None):
    """Get top/bottom sites - Fuel only"""
    where, params = build_where_clause(sites, year, months, "m", start_date, end_date)

    query = f"""
        SELECT
            s.site_name as name,
            SUM(m.bunkered_sales + m.non_bunkered_sales) as net_sales,
            SUM(m.bunkered_volume + m.non_bunkered_volume) as volume,
            SUM(m.bunkered_sales + m.non_bunkered_sales -
                m.bunkered_purchases - m.non_bunkered_purchases) as profit
        FROM monthly_summary m
        JOIN sites s ON m.site_code = s.site_code
        WHERE {where}
        GROUP BY s.site_code, s.site_name
        ORDER BY net_sales DESC
    """

    results = execute_query(query, tuple(params) if params else None)

    site_data = []
    for r in results:
        sales = float(r["net_sales"] or 0)
        vol = float(r["volume"] or 0)
        profit = float(r["profit"] or 0)
        ppl = round(profit / vol * 100, 2) if vol > 0 else 0
        margin = round(profit / sales * 100, 2) if sales > 0 else 0
        site_data.append({
            "name": r["name"],
            "net_sales": sales,
            "ppl": ppl,
            "margin": margin
        })

    return {
        "top": site_data[:5],
        "bottom": site_data[-5:][::-1] if len(site_data) > 5 else []
    }
```

## 10.6 SQL Query

```sql
SELECT
    s.site_name as name,
    SUM(m.bunkered_sales + m.non_bunkered_sales) as net_sales,
    SUM(m.bunkered_volume + m.non_bunkered_volume) as volume,
    SUM(m.bunkered_sales + m.non_bunkered_sales -
        m.bunkered_purchases - m.non_bunkered_purchases) as profit
FROM monthly_summary m
JOIN sites s ON m.site_code = s.site_code
WHERE m.site_code NOT IN (0, 1)
GROUP BY s.site_code, s.site_name
ORDER BY net_sales DESC
```

## 10.7 Calculated Columns

| Column | Formula | Unit |
|--------|---------|------|
| Net Sales | `SUM(bunkered_sales + non_bunkered_sales)` | £ |
| PPL | `(Profit / Volume) × 100` | Pence |
| Margin | `(Profit / Net Sales) × 100` | % |

## 10.8 API Response

```json
{
    "top": [
        {"name": "Manor Service Station", "net_sales": 2500000.00, "ppl": 8.25, "margin": 10.2},
        {"name": "Hen And Chicken SS", "net_sales": 2200000.00, "ppl": 7.95, "margin": 9.8},
        {"name": "Salterton Road SS", "net_sales": 2050000.00, "ppl": 8.10, "margin": 9.5},
        {"name": "Delph SS", "net_sales": 1950000.00, "ppl": 7.80, "margin": 9.2},
        {"name": "Saxon Autopoint SS", "net_sales": 1850000.00, "ppl": 8.05, "margin": 9.0}
    ],
    "bottom": [
        {"name": "Minsterley SS", "net_sales": 450000.00, "ppl": 5.20, "margin": 6.5},
        {"name": "Nelson SS", "net_sales": 520000.00, "ppl": 5.80, "margin": 7.0},
        {"name": "Gnosall SS", "net_sales": 580000.00, "ppl": 6.10, "margin": 7.2},
        {"name": "Stanton Self Service", "net_sales": 620000.00, "ppl": 6.40, "margin": 7.5},
        {"name": "Kings Of Sedgley", "net_sales": 680000.00, "ppl": 6.60, "margin": 7.8}
    ]
}
```

## 10.9 Frontend Implementation

### JavaScript Code
```javascript
function updateSiteRankings(data) {
    // Top Sites
    const topTable = document.getElementById('topSitesTable');
    if (topTable && data.top) {
        topTable.innerHTML = data.top.map((site, i) => `
            <tr>
                <td><span class="rank-badge ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</span></td>
                <td>${site.name}</td>
                <td>${formatCurrency(site.net_sales)}</td>
                <td>${site.ppl.toFixed(2)}p</td>
                <td>${site.margin.toFixed(1)}%</td>
            </tr>
        `).join('');
    }

    // Bottom Sites handled separately...
}
```

### Rank Badge Styling

| Rank | Class | Color |
|------|-------|-------|
| 1 | `gold` | Gold (#FFD700) |
| 2 | `silver` | Silver (#C0C0C0) |
| 3 | `bronze` | Bronze (#CD7F32) |
| 4-5 | (none) | Default gray |

---

# 11. Sites Needing Improvement Table

## 11.1 Table Overview

| Property | Value |
|----------|-------|
| **Location** | Tables Row, Right side |
| **Title** | "Sites Needing Improvement" |
| **Table ID** | `bottomSitesTable` |
| **Shows** | Bottom 5 sites by Net Sales |

## 11.2 What This Table Shows

Highlights the lowest-performing sites that may need attention, operational improvements, or investigation.

## 11.3 Visual Representation

```
┌──────────────────────────────────────────────────────────────┐
│                  Sites Needing Improvement                   │
├──────┬─────────────────────────┬───────────┬───────┬────────┤
│ Rank │ Site                    │ Net Sales │  PPL  │ Margin │
├──────┼─────────────────────────┼───────────┼───────┼────────┤
│  1   │ Minsterley SS           │ £450.0 K  │ 5.20p │  6.5%  │
│  2   │ Nelson SS               │ £520.0 K  │ 5.80p │  7.0%  │
│  3   │ Gnosall SS              │ £580.0 K  │ 6.10p │  7.2%  │
│  4   │ Stanton Self Service    │ £620.0 K  │ 6.40p │  7.5%  │
│  5   │ Kings Of Sedgley        │ £680.0 K  │ 6.60p │  7.8%  │
└──────┴─────────────────────────┴───────────┴───────┴────────┘
```

## 11.4 Data Source

Uses the same API response as Top Performing Sites:
```
GET /api/dashboard/site-rankings
```

The `bottom` array contains the 5 lowest-performing sites.

## 11.5 How Bottom Sites are Selected

```python
# From the sorted results (descending by net_sales):
# - Top 5 = First 5 items
# - Bottom 5 = Last 5 items (reversed for display)

site_data = [sorted by net_sales DESC]

return {
    "top": site_data[:5],                    # First 5 (highest)
    "bottom": site_data[-5:][::-1]           # Last 5, reversed (lowest first)
}
```

## 11.6 Frontend Implementation

```javascript
// Bottom Sites
const bottomTable = document.getElementById('bottomSitesTable');
if (bottomTable && data.bottom) {
    bottomTable.innerHTML = data.bottom.map((site, i) => `
        <tr>
            <td><span class="rank-badge">${i + 1}</span></td>
            <td>${site.name}</td>
            <td>${formatCurrency(site.net_sales)}</td>
            <td>${site.ppl.toFixed(2)}p</td>
            <td>${site.margin.toFixed(1)}%</td>
        </tr>
    `).join('');
}
```

## 11.7 Columns Explained

| Column | What It Shows | Significance for Improvement |
|--------|---------------|------------------------------|
| **Rank** | Position (1 = worst) | Priority for attention |
| **Site** | Station name | Identification |
| **Net Sales** | Total revenue | Volume indicator |
| **PPL** | Profit per liter | Margin efficiency |
| **Margin** | Profit percentage | Overall profitability |

## 11.8 Interpretation Guide

| Indicator | Meaning | Possible Actions |
|-----------|---------|------------------|
| Low Net Sales | Low customer traffic | Marketing, location analysis |
| Low PPL | Poor margin per liter | Pricing review, supplier negotiation |
| Low Margin | Low overall profitability | Cost reduction, operational efficiency |
| All metrics low | Fundamental issues | Major intervention, possible closure review |

---

# PART 4: RELATIONSHIPS & VALIDATION

---

# 12. Relationship Between All Components

## 12.1 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              DATABASE                                    │
├─────────────────────┬───────────────────────┬───────────────────────────┤
│   fuel_margin_data  │   monthly_summary     │      transactions         │
│   (203 records)     │   (61 records)        │      (66,039 records)     │
└─────────┬───────────┴───────────┬───────────┴───────────────┬───────────┘
          │                       │                           │
          ▼                       ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                   │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│   /summary      │  /monthly-trends│  /site-rankings │  /bank-balance    │
│   /daily-data   │  /sales-distrib │  /profit-by-site│  /other-income    │
└────────┬────────┴────────┬────────┴────────┬────────┴────────┬──────────┘
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            DASHBOARD UI                                  │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│   KPI Cards     │    Charts       │    Tables       │  Breakdown Cards  │
│   (7 cards)     │  (5 charts)     │  (2 tables)     │   (4 cards)       │
└─────────────────┴─────────────────┴─────────────────┴───────────────────┘
```

## 12.2 Net Sales Relationship

```
                    NET SALES (KPI Card)
                          │
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌───────────┐     ┌───────────┐
   │Bunkered │  +   │Non-Bunkered│  +  │Other Income│
   │ Sales   │      │  Sales     │     │           │
   └─────────┘      └───────────┘     └───────────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                          ▼
                   Pie Chart Shows
                   Distribution
```

## 12.3 Profit Relationship

```
                    PROFIT (KPI Card)
                          │
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐      ┌───────────┐     ┌───────────┐
   │Bunkered │  +   │Non-Bunkered│  +  │Other Income│
   │ Profit  │      │  Profit    │     │ (100%)    │
   └─────────┘      └───────────┘     └───────────┘
        │                 │
        └─────────────────┴─────────────────┐
                          │                 │
                    Donut Chart        Site Rankings
                    (by site)          (Top & Bottom)
```

## 12.4 Volume Relationship

```
                 TOTAL VOLUME (KPI Card)
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
   ┌─────────┐                       ┌───────────┐
   │Bunkered │          +            │Non-Bunkered│
   │ Volume  │                       │  Volume    │
   └─────────┘                       └───────────┘
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                    Daily Line Chart
                    (Volume over time)
```

## 12.5 PPL Relationship

```
                    AVG PPL (KPI Card)
                          │
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
   ┌─────────┐                       ┌───────────┐
   │  Profit │          ÷            │  Volume   │
   └─────────┘                       └───────────┘
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
                    PPL Line Chart
                    (Avg PPL vs Actual PPL)
```

## 12.6 Validation Rules

| Validation | Formula | Should Equal |
|------------|---------|--------------|
| Net Sales | Bunkered Sales + Non-Bunkered Sales + Other Income | total_net_sales |
| Profit | Bunkered Profit + Non-Bunkered Profit + Other Income | total_profit |
| Volume | Bunkered Volume + Non-Bunkered Volume | total_fuel_volume |
| Bank Balance | Edmonton + Lloyds + PRL HSBC | total |

---

# 13. Data Validation Queries

## 13.1 Verify Sites Classification

```sql
-- Bunkered count (should be 11)
SELECT COUNT(*) as bunkered_count
FROM sites
WHERE is_bunkered = TRUE AND site_code NOT IN (0, 1);

-- Non-Bunkered count (should be 18)
SELECT COUNT(*) as non_bunkered_count
FROM sites
WHERE (is_bunkered = FALSE OR is_bunkered IS NULL) AND site_code NOT IN (0, 1);
```

## 13.2 Verify Volume Split

```sql
SELECT
    SUM(CASE WHEN s.is_bunkered = TRUE THEN f.sale_volume ELSE 0 END) as bunkered_vol,
    SUM(CASE WHEN s.is_bunkered = FALSE OR s.is_bunkered IS NULL
        THEN f.sale_volume ELSE 0 END) as non_bunkered_vol,
    SUM(f.sale_volume) as total_vol
FROM fuel_margin_data f
JOIN sites s ON f.site_code = s.site_code
WHERE f.site_code NOT IN (0, 1);

-- Verify: bunkered_vol + non_bunkered_vol = total_vol
```

## 13.3 Verify Bank Balance Accounts

```sql
SELECT
    nominal_code,
    COUNT(*) as txn_count,
    SUM(amount) as balance
FROM transactions
WHERE nominal_code IN ('1200', '1223', '1224')
  AND deleted_flag = 0
GROUP BY nominal_code
ORDER BY nominal_code;
```

## 13.4 Verify Other Income Codes

```sql
SELECT
    nominal_code,
    COUNT(*) as txn_count,
    ABS(SUM(amount)) as total
FROM transactions
WHERE nominal_code IN ('6100', '6101', '6102')
  AND deleted_flag = 0
  AND site_code NOT IN (0, 1)
GROUP BY nominal_code
ORDER BY nominal_code;
```

## 13.5 Verify Monthly Trends Data

```sql
SELECT
    month,
    COUNT(DISTINCT site_code) as site_count,
    SUM(bunkered_sales + non_bunkered_sales) as total_sales
FROM monthly_summary
WHERE site_code NOT IN (0, 1)
GROUP BY month
ORDER BY month;
```

## 13.6 Verify Daily Summary Data

```sql
SELECT
    MIN(summary_date) as first_date,
    MAX(summary_date) as last_date,
    COUNT(*) as record_count,
    COUNT(DISTINCT site_code) as site_count
FROM daily_summary
WHERE site_code NOT IN (0, 1);
```

---

# Appendix: Quick Reference

## Chart Types Summary

| Chart | Type | Library | Canvas ID |
|-------|------|---------|-----------|
| Monthly Performance | Bar | Chart.js | monthlyTrendsChart |
| Overall Sales | Pie | Chart.js | salesPieChart |
| Date-wise Data | Line | Chart.js | dailyChart |
| PPL Comparison | Line | Chart.js | pplChart |
| Profit Distribution | Donut | Chart.js | profitDonutChart |

## API Endpoints Summary

| Endpoint | Returns | Used By |
|----------|---------|---------|
| `/api/dashboard/summary` | All KPIs + breakdown data | KPI cards, breakdown cards |
| `/api/dashboard/monthly-trends` | Monthly aggregates | Bar chart |
| `/api/dashboard/sales-distribution` | Category breakdown | Pie chart |
| `/api/dashboard/daily-data` | Daily metrics | Line chart |
| `/api/dashboard/ppl-comparison` | PPL metrics | PPL line chart |
| `/api/dashboard/site-rankings` | Top/bottom sites | Both tables |
| `/api/dashboard/profit-by-site` | Site profit data | Donut chart |
| `/api/dashboard/bank-balance` | Bank accounts | Bank card |

## Color Palette

| Color Name | Hex Code | Used For |
|------------|----------|----------|
| Primary Blue | #3B82F6 | Bunkered, Sales |
| Green | #10B981 | Non-Bunkered |
| Purple | #8B5CF6 | Other Income, PPL |
| Orange | #F97316 | Profit, Actual PPL |
| Pink | #EC4899 | Fuel Sales |
| Teal | #14B8A6 | Volume |

---

# Version Information

| Property | Value |
|----------|-------|
| Document Version | 2.0 |
| Last Updated | January 2025 |
| Dashboard Version | 2.0.0 |
| Database | PostgreSQL 15 on Google Cloud SQL |
| Backend | FastAPI 0.109.0 |
| Frontend | Vanilla JS + Chart.js |

---

*End of Complete Documentation*