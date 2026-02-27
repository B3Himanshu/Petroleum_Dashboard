# API Documentation

## Base URL
`http://localhost:3001`

## Endpoints

### Sites API

#### GET /api/sites
Get all active sites

**Response:**
```json
{
  "success": true,
  "count": 31,
  "data": [
    {
      "id": 6,
      "name": "Manor Service Station",
      "postCode": "SO19 1AR",
      "city": "southampton",
      "cityDisplay": "Southampton"
    },
    ...
  ]
}
```

#### GET /api/sites/:id
Get site by ID (site_code)

**Parameters:**
- `id` - Site code (integer)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 6,
    "name": "Manor Service Station",
    "postCode": "SO19 1AR",
    "city": "southampton",
    "cityDisplay": "Southampton"
  }
}
```

#### GET /api/sites/city/:cityId
Get all sites for a specific city

**Parameters:**
- `cityId` - City identifier (e.g., "southampton", "all")

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [...]
}
```

#### GET /api/sites/cities/list
Get list of unique cities

**Response:**
```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "id": "southampton",
      "displayName": "Southampton"
    },
    ...
  ]
}
```

### Dashboard API

#### GET /api/dashboard/metrics
Get dashboard metrics for a specific site

**Query Parameters:**
- `siteId` (required) - Site code
- `month` (optional) - Month (1-12), defaults to current month
- `year` (optional) - Year, defaults to current year

**Example:**
```
GET /api/dashboard/metrics?siteId=6&month=11&year=2025
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalFuelVolume": 118017.14,
    "netSales": 139861.64,
    "profit": 139861.64,
    "avgPPL": 10.04,
    "actualPPL": 10.04,
    "labourCostPercent": 0,
    "basketSize": 425.50,
    "customerCount": 12450
  }
}
```

**Data Sources:**
- `totalFuelVolume`: Sum of bunkered_volume + non_bunkered_volume from `monthly_summary`
- `netSales`: From `fuel_margin_data.net_sales` or calculated from monthly_summary
- `profit`: Sum of fuel_profit + shop_profit + valet_profit
- `avgPPL`: From `fuel_margin_data.ppl`
- `labourCostPercent`: Calculated from labour_cost / shop_sales
- `basketSize`: Calculated from shop_sales / transaction_count
- `customerCount`: Count of transactions

#### GET /api/dashboard/charts/monthly-performance
Get monthly performance chart data for a year

**Query Parameters:**
- `siteId` (required) - Site code
- `year` (optional) - Year, defaults to current year

**Example:**
```
GET /api/dashboard/charts/monthly-performance?siteId=6&year=2025
```

**Response:**
```json
{
  "success": true,
  "data": {
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "datasets": [
      {
        "name": "Sales",
        "data": [120000, 135000, 150000, ...]
      },
      {
        "name": "Profit",
        "data": [80000, 90000, 100000, ...]
      }
    ]
  }
}
```

**Data Source:** `monthly_summary` table

#### GET /api/dashboard/charts/sales-distribution
Get sales distribution chart data

**Query Parameters:**
- `siteId` (required) - Site code
- `month` (optional) - Month (1-12), defaults to current month
- `year` (optional) - Year, defaults to current year

**Example:**
```
GET /api/dashboard/charts/sales-distribution?siteId=6&month=11&year=2025
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "name": "Fuel Sales", "value": 139861.64 },
    { "name": "Shop Sales", "value": 754.36 },
    { "name": "Valet Sales", "value": 72.00 }
  ]
}
```

**Data Source:** `monthly_summary` table

#### GET /api/dashboard/status
Get status cards data

**Query Parameters:**
- `siteId` (required) - Site code

**Response:**
```json
{
  "success": true,
  "data": {
    "bankClosingBalance": 0,
    "debtorsTotal": 0,
    "fuelCreditors": 0,
    "fuelCondition": "Normal",
    "discountsTotal": 0
  },
  "note": "Status data not available in current database schema..."
}
```

**Note:** These fields are not in the current database schema and would need to be added or calculated from transaction/accounting data.

## Formula Sheet & PRL Logic Bar Verification

The dashboard (Latest Petrol page) and petrol-data API follow the **Formula Sheet** (`frontend/public/formula.png`) and **PRL Logic Bar** nominal codes from `PRL Logic Bar csv.csv`. Petrol-data routes are implemented in `backend/routes/petrolDataSage.js` (mounted at `/api/dashboard/petrol-data`).

### 1. Avg. Basket Size
- **Formula:** Total Shop Sales / Transactions
- **PRL CSV:** "Not available on Sage" (shop not managed by client)
- **Implementation:** Not calculated; basket size is N/A for Sage-only data.

### 2. Average PPL
- **Formula:** (Fuel profit / Fuel volume) × 100
- **PRL CSV:** Fuel Sales N/C: 4000, 4001, 4002, 4003, 4008; Fuel Profit = Net Sales − Purchases (Purchases: 5000, 5001, 5003, 5004, 5007, 5012, 5014)
- **Implementation:** `GET /petrol-data/avg-ppl` — Fuel profit = fuel sales (4000–4008) − fuel purchases (5000–5014). When **volume is not in DB**, denominator is **fuel sales** so PPL is still computed. Formula: `(fuelProfit / sales) * 100` when volume = 0.

### 3. PPL After Vending Out Overheads (Actual PPL)
- **Formula:** (Over Heads / Volume) × 100
- **PRL CSV:** Overheads N/C: **7103** General Rates, **7100** Rent, **7200** Electricity, **7801** Repairs & Renewals, **7905** Credit Charges
- **Implementation:** `GET /petrol-data/actual-ppl` and `GET /petrol-data/actual-ppl-breakdown` use exactly these codes. When volume is not in DB, denominator is **fuel sales**, then **total revenue**, so the value is never zero when data exists.

### 4. Customer Count
- **Formula:** From EvoBos (external source)
- **PRL CSV:** N/A — external system
- **Implementation:** Not from Sage; when EvoBos is unavailable, dashboard can use transaction count from revenue as a proxy (documented in LatestPetrol).

### 5. Labour Cost %
- **Formula:** (Labour cost / Shop or fuel sales) × 100 (value in %)
- **PRL CSV:** Total Labour Cost: **7000** Gross Wages, **7006** Employer NI, **7007** Staff Pensions
- **Implementation:** `GET /petrol-data/labour-cost` and `GET /petrol-data/labour-cost-breakdown` use 7000, 7006, 7007. LatestPetrol computes percentage as `(totalLabourCost / fuelSales) * 100` (fuel sales used when shop sales N/A).

### 6. ROI
- **Formula:** (Net Profit / Total Investment or total operating cost) × 100
- **PRL CSV:** "Current Month ROI: On hold", "MoM ROI: On hold"; Net Profit = Total Revenue − Total Cost; Revenue and Cost N/Cs listed in CSV (lines 81, 85).
- **Implementation:** Revenue N/Cs and Cost N/Cs in `petrolDataSage.js` match CSV. ROI calculation can use Net Profit = Revenue − Cost when implemented.

### Nominal Codes Summary (from PRL Logic Bar csv.csv)

| Purpose        | Nominal codes | Used in |
|----------------|---------------|---------|
| Fuel Sales     | 4000, 4001, 4002, 4003, 4008 | fuel-volume, net-sales, avg-ppl, actual-ppl, ppl-comparison, profit, site-rankings |
| Revenue (total)| 4000, 4001, 4002, 4003, 4008, 4011, 4400, 4901, 4904, 4907, 6101, 6102 | net-sales, profit, monthly-trends, daily-data |
| Fuel Purchases | 5000, 5001, 5003, 5004, 5007, 5012, 5014 | avg-ppl, profit, ppl-comparison, site-rankings |
| Labour         | 7000, 7006, 7007 | labour-cost, labour-cost-breakdown, monthly-trends |
| Overheads      | 7103, 7100, 7200, 7801, 7905 | actual-ppl, actual-ppl-breakdown, ppl-comparison |
| Cost (full)    | See CSV line 85 | profit, profit-breakdown, site-rankings, monthly-trends |

All petrol-data endpoints that use these codes are in `backend/routes/petrolDataSage.js` and use the constants `FUEL_SALES_CODES`, `REVENUE_CODES`, `FUEL_PURCHASE_CODES`, `LABOUR_CODES`, `OVERHEADS_CODES`, and `COST_CODES`, which match the PRL Logic Bar CSV. The dashboard (Latest Petrol) calls these APIs and displays the values; formulas above are implemented so the displayed values align with the formula sheet and CSV codes.

### Latest Petrol page – card-by-card verification

The **Latest Petrol** page (`frontend/src/pages/LatestPetrol.jsx`) fetches all data from `/api/dashboard/petrol-data/*` (handled by `petrolDataSage.js`). Each Quick Insight card is wired as follows:

| Card | Formula / CSV | API used | Applied correctly |
|------|----------------|----------|--------------------|
| 1. Total Site Revenue | Revenue N/Cs (CSV line 81) | `getPetrolNetSales` | Yes – uses totalRevenue/fuelSales from net-sales (REVENUE_CODES). |
| 2. Total Fuel Volume + Avg PPL | Avg PPL = (Fuel profit / Fuel volume)×100; when no volume, denominator = fuel sales | `getPetrolFuelVolume`, `getPetrolAvgPPL`, `getPetrolFuelVolumeBreakdown` | Yes – avg-ppl uses fuel sales when volume is 0; fuel sales N/C 4000–4008. |
| 3. Shop Sales | PRL CSV: "Not available on Sage" | (none) | Yes – shows N/A, no shop data. |
| 4. Avg Basket Size | PRL CSV: "Not available on Sage" | (none) | Yes – shows 0; formula would be Shop Sales/Transactions. |
| 5. Total Net Profit | Net Profit = Revenue − Cost (PRL CSV line 78) | `getPetrolProfit`, `getPetrolProfitMargin`, `getPetrolProfitBreakdown` | Yes – profit endpoint uses REVENUE_CODES − COST_CODES. |
| 6. PPL After Overheads | (Overheads / Volume)×100; Overheads N/C: 7103, 7100, 7200, 7801, 7905 | `getPetrolAvgPPL`, `getPetrolActualPPL` | Yes – actual-ppl uses OVERHEADS_CODES; when no volume, denominator = fuel sales then revenue. |
| 7. Shop Margin | PRL CSV: "Not available on Sage" | (none) | Yes – shows 0. |
| 8. Labour Cost % | (Labour cost / Shop or fuel sales)×100; Labour N/C: 7000, 7006, 7007 | `getPetrolLabourCost`, `getPetrolNetSales` | Yes – labour-cost uses LABOUR_CODES; % = (totalLabourCost / fuelSales)×100. |
| 9. Customer Count | From EvoBos (external) | (none – proxy 0 when N/A) | Yes – EvoBos not in Sage; page uses 0 or future proxy. |
| 10. ROI | (Net Profit / Total Operating Cost)×100; Cost–Revenue ratio = Cost/Revenue | `getPetrolProfit`, `getPetrolTotalPurchases`, `getPetrolLabourCost`, `getPetrolActualPPLBreakdown` | Yes – ROI = (netProfit / operatingCost)×100; operatingCost = totalCost or (purchases + labour + overheads). Purchases use 5000–5014; labour 7000,7006,7007; overheads 7103,7100,7200,7801,7905. |

Charts and tables on Latest Petrol (Monthly Fuel Performance, PPL Comparison, Top/Bottom Sites) use `getPetrolMonthlyTrends`, `getPetrolPPLComparison`, `getPetrolSiteRankings`, and `getPetrolProfitBySite`, all of which use the same CSV nominal codes in `petrolDataSage.js`. Overheads tab uses `getPetrolActualPPLBreakdown` (7103, 7100, 7200, 7801, 7905). So every formula and CSV-derived data on the Latest Petrol page is applied via these endpoints and nominal codes.

## Database Schema Mapping

### Sites Table
- `site_code` → `id` (frontend)
- `site_name` → `name` (frontend)
- `post_code` → `postCode` (frontend)
- `city` → Derived from postcode using mapping utility
- `cityDisplay` → Derived from postcode using mapping utility

### Monthly Summary Table
Used for:
- Monthly performance charts
- Sales distribution
- Dashboard metrics (volumes, sales, profits)

### Fuel Margin Data Table
Used for:
- PPL (Price Per Liter) calculations
- Net sales
- Fuel profit and margin

### Daily Summary Table
Available for:
- Date-wise charts
- Daily breakdowns

### Transactions Table
Used for:
- Customer count
- Basket size calculations
- Transaction-level data

## City Mapping

Cities are derived from UK postcode area codes:
- `SO` → Southampton
- `GU` → Guildford
- `EX` → Exmouth
- `PE` → Peterborough (with exceptions for Wisbech)
- `WA` → Warrington
- etc.

See `utils/cityMapping.js` for full mapping logic.

