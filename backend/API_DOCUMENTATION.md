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
    { "name": "Coffee & Valet", "value": 72.00 }
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

## Formula Sheet & Wireframe Verification

The dashboard (Latest Petrol page) and petrol-data API follow the **Formula Sheet** (`frontend/public/formula.png`) and the **wireframe** nominal codes from **`wireframe.csv`** (project root). Do not use `HSRL_ui/PRL Logic Bar csv.csv`. Petrol-data routes are in `backend/routes/petrolDataSage.js` (mounted at `/api/dashboard/petrol-data`).

### 1. Avg. Basket Size
- **Formula:** Total Shop Sales / Transactions
- **Wireframe:** "Not available on Sage" (shop not managed by client)
- **Implementation:** Not calculated; basket size is N/A for Sage-only data.

### 2. Average PPL
- **Formula:** (Fuel profit / Fuel volume) × 100
- **Wireframe:** Fuel Sales N/C: 4000, 4001, 4002, 4003, 4004; Fuel Profit = Net Sales + Closing Stock − Opening Stock − Purchases (Purchases: 5000–5005)
- **Implementation:** `GET /petrol-data/avg-ppl` — Fuel profit from 14 N/Cs (4000–4005, 5000–5005, 5050). When volume is not in DB, denominator is fuel sales. Formula: `(fuelProfit / volume or sales) * 100`.

### 3. PPL After Overheads (Actual PPL)
- **Formula:** (Fuel Profit after overheads / Site Sales Volume) × 100
- **Wireframe:** Overheads N/C: **7150** Rent, **7151** Rates, **7200** Electricity, **7600** General Repairs, **7906** Credit Charges
- **Implementation:** `GET /petrol-data/actual-ppl` and `GET /petrol-data/actual-ppl-breakdown` use these codes. When volume is not in DB, denominator is fuel sales then total revenue.

### 4. Customer Count
- **Formula:** From EvoBos (external source)
- **Wireframe:** N/A — external system
- **Implementation:** Not from Sage; dashboard can use transaction count from revenue as a proxy when EvoBos is unavailable.

### 5. Labour Cost %
- **Formula:** (Total Labour Cost / Fuel Sales) × 100
- **Wireframe:** Total Labour Cost: **7000** Gross Wages + **7001** Employer NI + **7005** Staff Pensions
- **Implementation:** `GET /petrol-data/labour-cost` and `GET /petrol-data/labour-cost-breakdown` use 7000, 7001, 7002, 7003, 7005. LatestPetrol computes `(totalLabourCost / fuelSales) * 100`.

### 6. ROI
- **Formula:** (Net Profit / Investment) × 100
- **Wireframe:** "Current Month ROI: On hold", "MoM ROI: On hold"; Net Profit = Total Revenue − Total Cost; Revenue/Cost N/Cs in wireframe (items 15–18).
- **Implementation:** Revenue and Cost N/Cs in `petrolDataSage.js` follow wireframe.csv; ROI = (netProfit / investment) × 100.

### Nominal Codes Summary (from wireframe.csv)

| Purpose        | Nominal codes | Used in |
|----------------|---------------|---------|
| Fuel Sales     | 4000, 4001, 4002, 4003, 4004 | fuel-volume, net-sales, avg-ppl, actual-ppl, ppl-comparison, profit, site-rankings |
| Shop Sales     | 4032, 4034, 4036 | Total Site Revenue (shop component) |
| Coffee & Valet | 4028, 4029, 4030, 4031, 4017 | Total Site Revenue (coffee/Costa + valet component) |
| Revenue (total)| 4000–4004, 4xxx, 41xx, 44xx, 445x per wireframe/CSV | net-sales, profit, monthly-trends, daily-data |
| Fuel Purchases | 5000, 5001, 5002, 5003, 5004, 5005, 5050 | avg-ppl, profit, ppl-comparison, site-rankings |
| Labour         | 7000, 7001, 7002, 7003, 7005 | labour-cost, labour-cost-breakdown, monthly-trends |
| Overheads      | 7150, 7151, 7200, 7600, 7906 | actual-ppl, actual-ppl-breakdown, ppl-comparison |
| Cost (full)    | 5xxx, 7xxx, 8xxx, 9xxx from All Nominal code.csv | profit, profit-breakdown, site-rankings, monthly-trends |

All petrol-data endpoints use the constants in `petrolDataSage.js` (`FUEL_SALES_CODES`, `REVENUE_CODES`, `OVERHEADS_CODES`, `LABOUR_CODES`, etc.), which follow **wireframe.csv**. The dashboard (Latest Petrol) calls these APIs; formulas align with the wireframe.

### Latest Petrol page – card-by-card verification

The **Latest Petrol** page (`frontend/src/pages/LatestPetrol.jsx`) fetches all data from `/api/dashboard/petrol-data/*` (handled by `petrolDataSage.js`). Each Quick Insight card follows **wireframe.csv**:

| Card | Formula / wireframe.csv | API used | Applied correctly |
|------|---------------------------|----------|--------------------|
| 1. Total Site Revenue | Fuel 4000–4004, Shop 4032/4034/4036, Valet 4028–4031/4017 | `getPetrolNetSales` | Yes – totalRevenue/fuelSales from net-sales (REVENUE_CODES). |
| 2. Total Fuel Volume + Avg PPL | (Fuel profit / Fuel volume)×100; volume from details (5000–5004) | `getPetrolFuelVolume`, `getPetrolAvgPPL`, `getPetrolFuelVolumeBreakdown` | Yes – fuel sales N/C 4000–4004; when volume=0, denominator = fuel sales. |
| 3. Shop Sales | Wireframe: 4032, 4034, 4036 | (included in revenue) | Yes – shop component in revenue. |
| 4. Avg Basket Size | Wireframe: "Not available on Sage" | (none) | Yes – shows 0. |
| 5. Total Net Profit | Net Profit = Revenue − Cost (wireframe item 5, 15) | `getPetrolProfit`, `getPetrolProfitBreakdown` | Yes – REVENUE_CODES − COST_CODES; 14 fuel profit N/Cs. |
| 6. PPL After Overheads | Overheads: 7150, 7151, 7200, 7600, 7906 | `getPetrolAvgPPL`, `getPetrolActualPPL` | Yes – actual-ppl uses OVERHEADS_CODES. |
| 7. Shop Margin | Wireframe: "Not available on Sage" | (none) | Yes – shows 0. |
| 8. Labour Cost % | 7000 + 7001 + 7005; % = (Total Labour Cost / Fuel Sales)×100 | `getPetrolLabourCost`, `getPetrolNetSales` | Yes – LABOUR_CODES; % = (totalLabourCost / fuelSales)×100. |
| 9. Customer Count | From EvoBos (external) | (none) | Yes – 0 or proxy when N/A. |
| 10. ROI | (Net Profit / Investment)×100; wireframe ROI on hold | `getPetrolROI`, `getPetrolProfit`, etc. | Yes – Net Profit and Investment N/Cs per wireframe/CSV. |

Charts and tables use `getPetrolMonthlyTrends`, `getPetrolPPLComparison`, `getPetrolSiteRankings`, `getPetrolProfitBySite`; all nominal codes in `petrolDataSage.js` follow **wireframe.csv**. Overheads use `getPetrolActualPPLBreakdown` (7150, 7151, 7200, 7600, 7906).

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

