# Petrol Data Page - Complete Documentation

## Overview
The **Petrol Data** page is a comprehensive petroleum station analytics dashboard that displays detailed KPI metrics, breakdowns, charts, and rankings for petrol station operations. It's located at the `/petrol-data` route and provides historical data analysis using a date range filter.

---

## Page Structure & Layout

### 1. **Header Section**
- **Sidebar Navigation** - Toggle-able left navigation menu
- **Top Header** - Displays total sales across all sites with theme toggle and notifications
- **Page Title** - "Petrol Data" with fuel icon and subtitle

### 2. **Main Sections** (in order)
1. Date Range Filter
2. Main KPI Cards (6 metrics)
3. Quick Insights (4 metrics)
4. Breakdown Cards (4 card sections)
5. Charts & Graphs (3 visualizations)
6. Site Rankings Tables (2 tables)

---

## Data Source & Flow

### Backend API Endpoints
The page communicates with these endpoints via `dashboardAPI` service:

**Base URL:** `http://localhost:3001/api/dashboard`

All endpoints use date ranges (start_date, end_date) or end_date as parameters.

---

## Formulas & Calculations

### **Main KPI Metrics Formulas**

#### 1. **Total Fuel Volume**
```
Total Fuel Volume = Bunkered Volume + Non-Bunkered Volume

Where:
  Bunkered Volume = SUM(transaction_amount) 
                    WHERE category = 'bunkered' 
                    AND transaction_date BETWEEN startDate AND endDate

  Non-Bunkered Volume = SUM(transaction_amount) 
                        WHERE category = 'non_bunkered' 
                        AND transaction_date BETWEEN startDate AND endDate

Unit: Liters (L)
Display: ML (if >= 1,000,000 L) or K L (if >= 1,000 L) or L
```

#### 2. **Total Net Sales**
```
Total Net Sales = Bunkered Sales + Non-Bunkered Sales + Other Income

Where:
  Bunkered Sales = SUM(sales_amount) 
                   WHERE category = 'bunkered_sales' 
                   AND transaction_date BETWEEN startDate AND endDate

  Non-Bunkered Sales = SUM(sales_amount) 
                       WHERE category = 'non_bunkered_sales' 
                       AND transaction_date BETWEEN startDate AND endDate

  Other Income = SUM(transaction_amount) 
                 WHERE nominal_code IN (6100, 6101, 6102) 
                 AND transaction_date BETWEEN startDate AND endDate

Unit: Currency (£)
Display: £ (formatted with K for thousands, M for millions)
```

#### 3. **Total Profit**
```
Total Profit = Fuel Profit + Other Income Profit

Where:
  Fuel Profit = (Bunkered Sales - Bunkered Purchases) + 
                (Non-Bunkered Sales - Non-Bunkered Purchases)

  Bunkered Profit = SUM(sales_amount) - SUM(purchases_amount) 
                    WHERE category = 'bunkered'

  Non-Bunkered Profit = SUM(sales_amount) - SUM(purchases_amount) 
                        WHERE category = 'non_bunkered'

  Other Income Profit = SUM(transaction_amount) 
                        WHERE nominal_code IN (6100, 6101, 6102)

Unit: Currency (£)
Display: £ (formatted with K for thousands, M for millions)
```

#### 4. **Average PPL (Pence Per Liter)**
```
Average PPL = SUM(ppl_value × quantity) / SUM(quantity)
            = Weighted Average across all transactions

Where:
  ppl_value = Price per unit from fuel_margin_data
  quantity = Sale volume for each transaction
  
Formula by fuel type:
  Avg PPL Bunkered = SUM(bunkered_ppl × bunkered_volume) / 
                     SUM(bunkered_volume)
  
  Avg PPL Non-Bunkered = SUM(non_bunkered_ppl × non_bunkered_volume) / 
                         SUM(non_bunkered_volume)

Unit: Pence (p) per liter
Display: X.XX p
Range: Typical 100-150p for petrol
```

#### 5. **Actual PPL**
```
Actual PPL = Total Overheads / Total Fuel Volume

Where:
  Total Overheads = SUM(transaction_amount) 
                    WHERE nominal_code IN (7000, 7100, 7200, ...) 
                    AND transaction_date BETWEEN startDate AND endDate

  Total Fuel Volume = (as calculated in metric #1)

Unit: Pence (p) per liter
Display: X.XX p
Interpretation: Overhead costs attributed to each liter sold
```

#### 6. **Total Labour Cost**
```
Total Labour Cost = SUM(labour_transactions)

Where:
  Labour Cost = SUM(transaction_amount) 
                WHERE nominal_code IN (8100, 8110, 8120) 
                AND transaction_date BETWEEN startDate AND endDate

Unit: Currency (£)
Display: £ (formatted with K for thousands, M for millions)
Breakdown: By labour cost category/code
```

---

### **Quick Insights Formulas**

#### 1. **Active Sites**
```
Active Sites = COUNT(DISTINCT site_code)

Where:
  COUNT distinct sites that have ANY transaction 
  WHERE transaction_date BETWEEN startDate AND endDate

Unit: Count/Number
Display: Integer (e.g., 15 sites)
```

#### 2. **Profit Margin**
```
Profit Margin % = (Total Profit / Total Net Sales) × 100

Where:
  Total Profit = (as calculated in metric #3)
  Total Net Sales = (as calculated in metric #2)

Unit: Percentage (%)
Display: X.X% (e.g., 12.5%)
Range: Typical 8-15% for petrol stations
Formula: (Profit ÷ Sales) × 100
```

#### 3. **Average Sale Per Site**
```
Average Sale Per Site = Total Net Sales / Active Sites

Where:
  Total Net Sales = (as calculated in metric #2)
  Active Sites = (as calculated above)

Unit: Currency (£)
Display: £ (formatted with K for thousands)
Interpretation: Average revenue per operational site
Formula: Total Sales ÷ Number of Sites
```

#### 4. **Total Purchases**
```
Total Purchases = Bunkered Purchases + Non-Bunkered Purchases + 
                  Other Purchases

Where:
  Bunkered Purchases = SUM(purchase_amount) 
                       WHERE category = 'bunkered' 
                       AND transaction_date BETWEEN startDate AND endDate

  Non-Bunkered Purchases = SUM(purchase_amount) 
                           WHERE category = 'non_bunkered' 
                           AND transaction_date BETWEEN startDate AND endDate

  Other Purchases = SUM(transaction_amount) 
                    WHERE nominal_code IN (5000, 5001, 5003, 5004, 5014)

Unit: Currency (£)
Display: £ (formatted with K for thousands, M for millions)
```

---

### **Breakdown Cards Formulas**

#### 1. **Bank Closing Balance**
```
Bank Closing Balance = SUM(account_balance)

Where:
  Account Balance = Current balance of each bank account 
                    AS OF endDate

  Total = SUM(Current Account Balance + Savings Account Balance + ...)

Unit: Currency (£)
Display: £ (formatted with K for thousands, M for millions)
Timing: Point-in-time snapshot as of endDate (NOT date range)
Formula: Sum of all account balances on specific date
```

#### 2. **Bunkered Breakdown**
```
Bunkered Volume = SUM(transaction_amount) 
                  WHERE category = 'bunkered'

Bunkered Sales = SUM(sales_amount) 
                 WHERE category = 'bunkered_sales'

Bunkered Profit = Bunkered Sales - Bunkered Purchases
                = SUM(sales_amount) - SUM(purchases_amount) 
                  WHERE category = 'bunkered'

Unit: 
  Volume: Liters (L) or Million Liters (ML)
  Sales/Profit: Currency (£)
```

#### 3. **Non-Bunkered Breakdown**
```
Non-Bunkered Volume = SUM(transaction_amount) 
                      WHERE category = 'non_bunkered'

Non-Bunkered Sales = SUM(sales_amount) 
                     WHERE category = 'non_bunkered_sales'

Non-Bunkered Profit = Non-Bunkered Sales - Non-Bunkered Purchases
                    = SUM(sales_amount) - SUM(purchases_amount) 
                      WHERE category = 'non_bunkered'

Unit: 
  Volume: Liters (L) or Million Liters (ML)
  Sales/Profit: Currency (£)
```

#### 4. **Other Income Summary**
```
Total Other Income = SUM(transaction_amount)

Where:
  Other Income = SUM(transaction_amount) 
                 WHERE nominal_code IN (6100, 6101, 6102) 
                 AND transaction_date BETWEEN startDate AND endDate

  6100 = Shop Sales
  6101 = Valet Services
  6102 = Sundry Income

Unit: Currency (£)
Display: £ (formatted with K for thousands, M for millions)
Breakdown: By income code (6100, 6101, 6102)
```

---

### **Chart Data Formulas**

#### 1. **Monthly Fuel Performance Chart**
```
For each month within the date range:

Monthly Fuel Volume = SUM(transaction_amount) 
                      WHERE YEAR = {month_year} 
                      AND MONTH = {month_number}

Monthly Net Sales = SUM(sales_amount) 
                    WHERE YEAR = {month_year} 
                    AND MONTH = {month_number}

Monthly Profit = SUM(sales) - SUM(purchases) 
                 WHERE YEAR = {month_year} 
                 AND MONTH = {month_number}

Output: Array of objects with month, volume, sales, profit
```

#### 2. **Date-Wise Data Chart**
```
For each day within the date range:

Daily Fuel Volume = SUM(transaction_amount) 
                    WHERE DATE(transaction_date) = {specific_date}

Daily Net Sales = SUM(sales_amount) 
                  WHERE DATE(transaction_date) = {specific_date}

Daily Profit = SUM(sales) - SUM(purchases) 
               WHERE DATE(transaction_date) = {specific_date}

Output: Array of objects with date, volume, sales, profit (daily)
```

#### 3. **PPL Comparison Chart**
```
For date range:

Average PPL = SUM(ppl × quantity) / SUM(quantity)
            (as calculated in metric #4)

Actual PPL = Total Overheads / Total Fuel Volume
           (as calculated in metric #5)

Daily/Monthly PPL = SUM(ppl × quantity) / SUM(quantity) 
                    FOR each time period

Output: Comparison data showing Avg PPL vs Actual PPL trends
```

#### 4. **Profit Distribution Chart**
```
Fuel Profit Component = (Bunkered + Non-Bunkered) Sales - Purchases
                      = Total Fuel Profit

Other Income Component = SUM(transaction_amount) 
                         WHERE nominal_code IN (6100, 6101, 6102)

Total Profit Segments = [
  {
    name: "Fuel Profit",
    value: Fuel Profit,
    percentage: (Fuel Profit / Total Profit) × 100
  },
  {
    name: "Other Income",
    value: Other Income,
    percentage: (Other Income / Total Profit) × 100
  }
]

Output: Donut/Pie chart showing profit distribution percentages
```

---

### **Table Data Formulas**

#### 1. **Top Performing Sites Table**
```
For each site:

Site Total Sales = SUM(sales_amount) 
                   WHERE site_code = {site_code} 
                   AND transaction_date BETWEEN startDate AND endDate

Site Total Profit = SUM(sales) - SUM(purchases) 
                    WHERE site_code = {site_code}

Site Profit Margin = (Site Profit / Site Sales) × 100

Site Fuel Volume = SUM(fuel_volume) 
                   WHERE site_code = {site_code}

Ranking: RANK by Site Profit DESC (highest first)
Display: Top 10 sites by profit
```

#### 2. **Sites Needing Improvement Table**
```
For each site:

Site Current Sales = SUM(sales_amount) 
                     WHERE site_code = {site_code} 
                     AND transaction_date BETWEEN startDate AND endDate

Site Expected Sales = Average of all sites' sales 
                    OR Target sales per site configuration
                    = SUM(all sales) / COUNT(active sites)

Sales Gap = Expected Sales - Current Sales
          = How much below average

% Below Target = (Sales Gap / Expected Sales) × 100
               = Percentage difference from expected

Ranking: RANK by Sales Gap DESC (worst performers first)
Display: Bottom 10 sites with lowest sales/highest gaps
```

---

## Summary Formulas Table

| Metric | Core Formula | Category |
|--------|--------------|----------|
| Total Fuel Volume | Bunkered Vol + Non-Bunkered Vol | Volume |
| Total Net Sales | Fuel Sales + Other Income | Revenue |
| Total Profit | (Sales - Purchases) + Other Income | Profit |
| Avg PPL | Σ(PPL × Qty) / Σ(Qty) | Price |
| Actual PPL | Overheads / Fuel Volume | Cost |
| Labour Cost | Σ(Labour Transactions) | Cost |
| Active Sites | COUNT(DISTINCT site_code) | Count |
| Profit Margin | (Profit / Sales) × 100 | % |
| Avg Sale/Site | Total Sales / Active Sites | Average |
| Total Purchases | Σ(Purchase Amounts) | Cost |
| Bank Balance | Σ(Account Balances) | Balance |
| Bunkered Sales | Σ(Bunkered Sales) | Revenue |
| Bunkered Profit | (Bunkered Sales - Purchases) | Profit |
| Non-Bunkered Sales | Σ(Non-Bunkered Sales) | Revenue |
| Non-Bunkered Profit | (Non-Bunkered Sales - Purchases) | Profit |
| Other Income | Σ(Codes 6100, 6101, 6102) | Revenue |

---

## KPI Cards & Metrics

### **SECTION 1: Main KPI Cards (6 Cards)**
These are the primary metrics, fetched automatically when date range changes.

#### 1. **Total Fuel Volume** 
- **Component:** `PetrolKPICard`
- **Data Source:** `dashboardAPI.getPetrolFuelVolume(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/fuel-volume?startDate={}&endDate={}`
- **Value Type:** Liters (L) or Million Liters (ML)
- **Breakdown:** ✅ Clickable - Opens modal showing:
  - Bunkered volume
  - Non-bunkered volume
  - Per-category breakdown
- **Endpoint for Breakdown:** `dashboardAPI.getPetrolFuelVolumeBreakdown(startDate, endDate)`

#### 2. **Total Net Sales**
- **Component:** `NetSalesKPICard`
- **Data Source:** `dashboardAPI.getPetrolNetSales(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/net-sales?startDate={}&endDate={}`
- **Value Type:** Currency (£)
- **Breakdown:** ✅ Clickable - Shows:
  - Fuel sales (bunkered + non-bunkered)
  - Other income breakdown (codes: 6100, 6101, 6102)
  - Transaction counts
- **Endpoint for Breakdown:** `dashboardAPI.getPetrolNetSalesBreakdown(startDate, endDate)`

#### 3. **Total Profit**
- **Component:** `ProfitKPICard`
- **Data Source:** `dashboardAPI.getPetrolProfit(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/profit?startDate={}&endDate={}`
- **Value Type:** Currency (£)
- **Breakdown:** ✅ Clickable - Shows:
  - Fuel profit breakdown (bunkered & non-bunkered)
  - Other income breakdown
  - Sales vs purchases comparison
- **Endpoint for Breakdown:** `dashboardAPI.getPetrolProfitBreakdown(startDate, endDate)`

#### 4. **Average PPL (Pence Per Liter)**
- **Component:** `AvgPPLKPICard`
- **Data Source:** `dashboardAPI.getPetrolAvgPPL(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/avg-ppl?startDate={}&endDate={}`
- **Value Type:** Pence (p)
- **Breakdown:** ❌ Not clickable (display only)
- **Notes:** Weighted average across all transactions in date range

#### 5. **Actual PPL**
- **Component:** `ActualPPLKPICard`
- **Data Source:** `dashboardAPI.getPetrolActualPPL(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/actual-ppl?startDate={}&endDate={}`
- **Value Type:** Pence (p)
- **Breakdown:** ✅ Clickable - Opens "Overheads Breakdown" modal
- **Endpoint for Breakdown:** `dashboardAPI.getPetrolActualPPLBreakdown(startDate, endDate)`
- **Notes:** Represents overhead costs per liter

#### 6. **Total Labour Cost**
- **Component:** `LabourCostKPICard`
- **Data Source:** `dashboardAPI.getPetrolLabourCost(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/labour-cost?startDate={}&endDate={}`
- **Value Type:** Currency (£)
- **Breakdown:** ✅ Clickable - Shows:
  - Labour cost breakdown by category
  - Transaction counts per category
- **Endpoint for Breakdown:** `dashboardAPI.getPetrolLabourCostBreakdown(startDate, endDate)`

---

### **SECTION 2: Quick Insights (4 Cards)**
Secondary metrics that provide quick analysis. Auto-loaded with date range.

#### 1. **Active Sites**
- **Component:** `ActiveSitesKPICard`
- **Data Source:** `dashboardAPI.getPetrolActiveSites(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/active-sites?startDate={}&endDate={}`
- **Value Type:** Count (number)
- **Breakdown:** ❌ Not clickable

#### 2. **Profit Margin**
- **Component:** `ProfitMarginKPICard`
- **Data Source:** `dashboardAPI.getPetrolProfitMargin(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/profit-margin?startDate={}&endDate={}`
- **Value Type:** Percentage (%)
- **Breakdown:** ❌ Not clickable
- **Formula:** (Profit / Net Sales) × 100

#### 3. **Average Sale Per Site**
- **Component:** `AvgSalePerSiteKPICard`
- **Data Source:** `dashboardAPI.getPetrolAvgSalePerSite(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/avg-sale-per-site?startDate={}&endDate={}`
- **Value Type:** Currency (£)
- **Breakdown:** ❌ Not clickable

#### 4. **Total Purchases**
- **Component:** `TotalPurchasesKPICard`
- **Data Source:** `dashboardAPI.getPetrolTotalPurchases(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/total-purchases?startDate={}&endDate={}`
- **Value Type:** Currency (£)
- **Breakdown:** ✅ Clickable - Shows:
  - Purchase breakdown by category (e.g., 5000, 5001, 5003, 5004, 5014)
  - Transaction counts
- **Endpoint for Breakdown:** `dashboardAPI.getPetrolTotalPurchasesBreakdown(startDate, endDate)`

---

### **SECTION 3: Breakdown Cards (4 Cards)**

#### 1. **Bank Closing Balance** (Full width card)
- **Component:** `BankClosingBalanceCard`
- **Data Source:** `dashboardAPI.getPetrolBankBalance(endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/bank-balance?endDate={}`
- **Value Type:** Currency (£)
- **Breakdown:** ✅ Clickable - Shows:
  - Bank balance by account/category
  - As of specific date
- **Endpoint for Breakdown:** `dashboardAPI.getPetrolBankBalanceBreakdown(endDate)`
- **Notes:** Uses only endDate (point-in-time snapshot)

#### 2. **Bunkered Breakdown Card**
- **Component:** `BunkeredBreakdownCard`
- **Data Source:** `dashboardAPI.getPetrolBunkeredBreakdown(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/bunkered-breakdown?startDate={}&endDate={}`
- **Shows:**
  - Volume (in liters/ML)
  - Sales (in £)
  - Profit (in £)
- **Breakdown:** ❌ Not clickable (already shows summary)

#### 3. **Non-Bunkered Breakdown Card**
- **Component:** `NonBunkeredBreakdownCard`
- **Data Source:** `dashboardAPI.getPetrolNonBunkeredBreakdown(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/non-bunkered-breakdown?startDate={}&endDate={}`
- **Shows:**
  - Volume (in liters/ML)
  - Sales (in £)
  - Profit (in £)
- **Breakdown:** ❌ Not clickable (already shows summary)

#### 4. **Other Income Breakdown Card**
- **Component:** `OtherIncomeBreakdownCard`
- **Data Source:** `dashboardAPI.getPetrolOtherIncomeSummary(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/other-income-summary?startDate={}&endDate={}`
- **Value Type:** Currency (£) - Total other income
- **Breakdown:** ✅ Clickable - Shows:
  - Income codes breakdown (6100, 6101, 6102)
  - Transaction counts
- **Endpoint for Breakdown:** Uses `getPetrolNetSalesBreakdown()` and filters for codes 6100, 6101, 6102

---

## Charts & Visualizations

### **SECTION 4: Charts & Graphs (3 Charts)**

#### 1. **Monthly Fuel Performance Chart**
- **Component:** `MonthlyFuelPerformanceChart`
- **Data Source:** `dashboardAPI.getPetrolMonthlyPerformance(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/monthly-performance?startDate={}&endDate={}`
- **Chart Type:** Line/Bar chart
- **Metrics Shown:**
  - Fuel volume per month
  - Net sales per month
  - Profit per month
- **Size:** Full width, large
- **Responsive:** Yes
- **Updates:** When date range changes

#### 2. **Date-Wise Data Chart**
- **Component:** `DateWiseDataChart`
- **Data Source:** `dashboardAPI.getPetrolDateWiseData(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/date-wise-data?startDate={}&endDate={}`
- **Chart Type:** Line chart (daily data)
- **Metrics Shown:**
  - Daily fuel volume
  - Daily sales
  - Daily profit
- **Size:** 2/3 width on desktop, full width on mobile
- **Responsive:** Yes

#### 3. **PPL Comparison Chart**
- **Component:** `PPLComparisonChart`
- **Data Source:** `dashboardAPI.getPetrolPPLComparison(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/ppl-comparison?startDate={}&endDate={}`
- **Chart Type:** Bar/Comparison chart
- **Metrics Shown:**
  - Average PPL vs Actual PPL
  - PPL trends over time
- **Size:** 1/3 width on desktop, full width on mobile
- **Updates:** When date range changes

#### 4. **Profit Distribution Chart**
- **Component:** `ProfitDistributionChart`
- **Data Source:** `dashboardAPI.getPetrolProfitDistribution(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/profit-distribution?startDate={}&endDate={}`
- **Chart Type:** Donut/Pie chart
- **Shows:**
  - Fuel profit segment
  - Other income segment
  - Distribution percentages
- **Size:** Full width
- **Updates:** When date range changes

---

## Tables & Rankings

### **SECTION 5: Site Rankings Tables (2 Tables)**

#### 1. **Top Performing Sites Table**
- **Component:** `PetrolTopPerformingSitesTable`
- **Data Source:** `dashboardAPI.getPetrolTopPerformingSites(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/top-performing-sites?startDate={}&endDate={}`
- **Columns:**
  - Site Code/Name
  - Profit
  - Sales
  - Volume
  - Profit Margin %
- **Sorting:** By profit (descending)
- **Rows:** Top 10 or Top 5 (configurable)
- **Size:** 1/2 width on desktop, full width on mobile

#### 2. **Sites Needing Improvement Table**
- **Component:** `PetrolSitesNeedingImprovementTable`
- **Data Source:** `dashboardAPI.getPetrolSitesNeedingImprovement(startDate, endDate)`
- **Endpoint:** `GET /api/dashboard/petrol/sites-needing-improvement?startDate={}&endDate={}`
- **Columns:**
  - Site Code/Name
  - Current Sales
  - Expected Sales
  - Gap/Variance
  - % Below Target
- **Sorting:** By variance (ascending/descending)
- **Rows:** Bottom 10 or Bottom 5 (configurable)
- **Size:** 1/2 width on desktop, full width on mobile

---

## Date Range Filter

### **Time-Based Data Loading**

#### How It Works:
1. **Default Range:** Last 30 days from today
2. **Presets:**
   - Last month (full previous month)
   - This month (current month to today)
3. **Custom Range:** User can select any date range

#### Update Trigger:
When user changes date range:
- **Immediately triggers:** All auto-fetch useEffect hooks for KPIs and charts
- **All metrics reload** with new date range parameters

#### Endpoints Called on Date Change:
```
1. getPetrolFuelVolume()
2. getPetrolNetSales()
3. getPetrolProfit()
4. getPetrolAvgPPL()
5. getPetrolActualPPL()
6. getPetrolLabourCost()
7. getPetrolActiveSites()
8. getPetrolProfitMargin()
9. getPetrolAvgSalePerSite()
10. getPetrolTotalPurchases()
11. getPetrolBunkeredBreakdown()
12. getPetrolNonBunkeredBreakdown()
13. getPetrolOtherIncomeSummary()
14. getPetrolMonthlyPerformance()
15. getPetrolDateWiseData()
16. getPetrolProfitDistribution()
17. getPetrolTopPerformingSites()
18. getPetrolSitesNeedingImprovement()
```

#### Special Case:
- **Bank Balance:** Uses only `endDate` parameter (point-in-time snapshot)
- **Breakdown modals:** Only fetch data on-demand when user clicks the card

---

## Data Loading States

### Loading States:
Each metric has its own loading state:
- `loadingFuelVolume`, `loadingNetSales`, `loadingProfit`, etc.

### Error Handling:
Each metric has error state:
- `fuelVolumeError`, `netSalesError`, `profitError`, etc.

### Visual Feedback:
- **Loading:** Skeleton loaders or animated placeholders
- **Error:** Red error message box with error text
- **Success:** Card displays formatted value

### State Shape (Example for Fuel Volume):
```javascript
const [totalFuelVolume, setTotalFuelVolume] = useState(null); // Value
const [loadingFuelVolume, setLoadingFuelVolume] = useState(false); // Loading state
const [fuelVolumeError, setFuelVolumeError] = useState(null); // Error message
```

---

## Data Formatting & Display

### Volume Formatting:
```javascript
formatVolume(liters) {
  >= 1,000,000 L  → X.XX ML (Million Liters)
  >= 1,000 L      → X K L (Thousand Liters)
  < 1,000 L       → X.XX L (Liters)
}
```

### Currency Formatting:
```javascript
formatCurrency(amount) {
  >= £1,000,000   → £X.XXM (Millions)
  >= £1,000       → £XK (Thousands)
  < £1,000        → £X.XX (Pounds)
}
```

### Other Formats:
- **PPL:** `X.XX p` (Pence per liter)
- **Percentage:** `X.X%` (Profit margin, improvements)
- **Count:** `X,XXX` (Sites, transactions)

---

## Modal Breakdowns

### Breakdown Modal Component: `CardDetailModal`

Each breakdown modal shows detailed information when a KPI card is clicked:

#### Structure:
```
Modal Title
├─ Loading State (skeleton loaders)
├─ Error State (red error message)
└─ Data State
   ├─ Individual line items (DetailItem component)
   ├─ Sub-totals (optional)
   └─ Grand Total (isTotal={true})
```

#### DetailItem Component:
```javascript
<DetailItem
  label="Item label"          // e.g., "Bunkered"
  value="£10,000"             // Formatted value
  subValue="Transaction info" // Additional details
  code="5000"                 // Nominal code (optional)
  isTotal={false}             // Boolean to style as total row
/>
```

---

## Page Navigation & Links

### Sidebar Navigation:
- **Dashboard** → `/` (Home/Index page)
- **Site Comparison** → `/comparison`
- **Metrics Comparison** → `/metrics-comparison`
- **Petrol Data** → `/petrol-data` (Current page ✓)

### Header Navigation:
- **Total Sales Display** - Shows all-time sales across all sites
- **Theme Toggle** - Light/Dark mode switcher
- **Notifications** - Bell icon with unread count
- **Profile** - User avatar (PRL initials)

### Other Links on Page:
- **All KPI cards** - Some are clickable for breakdown modals
- **All chart titles** - Navigable to detailed chart view (optional)
- **All table rows** - May link to site detail view (optional)

---

## API Response Structure (Examples)

### Get Fuel Volume Response:
```json
{
  "success": true,
  "data": {
    "totalFuelVolume": 125000,
    "startDate": "2026-01-07",
    "endDate": "2026-02-06",
    "timestamp": "2026-02-06T13:45:00Z"
  }
}
```

### Get Fuel Volume Breakdown Response:
```json
{
  "success": true,
  "data": {
    "totalVolume": 125000,
    "breakdown": [
      {
        "name": "Bunkered",
        "volume": 75000,
        "transactionCount": 450
      },
      {
        "name": "Non-Bunkered",
        "volume": 50000,
        "transactionCount": 320
      }
    ],
    "startDate": "2026-01-07",
    "endDate": "2026-02-06"
  }
}
```

### Get Bank Balance Response:
```json
{
  "success": true,
  "data": {
    "totalBalance": 250000,
    "breakdown": [
      {
        "code": "1001",
        "name": "Current Account",
        "balance": 150000,
        "transactionCount": 120
      },
      {
        "code": "1002",
        "name": "Savings Account",
        "balance": 100000,
        "transactionCount": 45
      }
    ],
    "endDate": "2026-02-06",
    "timestamp": "2026-02-06T13:45:00Z"
  }
}
```

---

## State Management & Performance

### State Variables (Total: 60+)
Main state categories:
1. **UI State** - `sidebarOpen`, `isTablet`, `isMobile`
2. **Date Filter** - `startDate`, `endDate`
3. **Metrics Data** - `totalFuelVolume`, `totalNetSales`, `totalProfit`, etc. (13 metrics)
4. **Loading States** - `loadingFuelVolume`, `loadingNetSales`, etc. (18+ loading states)
5. **Error States** - `fuelVolumeError`, `netSalesError`, etc. (18+ error states)
6. **Modal States** - `breakdownModalOpen`, `netSalesBreakdownModalOpen`, etc. (10+ modal states)
7. **Modal Data** - `breakdownData`, `netSalesBreakdownData`, etc. (10+ modal data states)
8. **Other State** - `totalSalesAllSites` (global sales counter)

### useEffect Hooks (Total: 16+)
Triggers for data fetching:
1. Component mount - `getTotalSales()` (runs once)
2. `[startDate, endDate]` changes - All 13 metrics refetch
3. `[endDate]` changes - Bank balance special case
4. `[window.innerWidth]` changes - Responsive behavior

### Performance Optimizations:
- ✅ Memoized components where applicable
- ✅ Conditional rendering for loading/error states
- ✅ Date range prefixes to avoid duplicate calls
- ✅ Modal data fetched on-demand (not upfront)
- ⚠️ Could implement: React Query/SWR for better caching

---

## Error Handling Flow

### When API Call Fails:
1. **Try-Catch Block** - Captures error
2. **setLoading(false)** - Stops loading indicator
3. **setError(error.message)** - Stores error message
4. **setValue(0 or null)** - Sets default/empty value
5. **Console.error()** - Logs error in browser console

### User Sees:
```
❌ Error Box
   Error loading breakdown
   Failed to fetch fuel volume
```

### Example Error Log:
```
❌ [PetrolData] Error fetching fuel volume: {
  "error": "Network error",
  "message": "Failed to fetch fuel volume",
  "timestamp": "2026-02-06T13:45:00Z"
}
```

---

## Key Features & Functionality

### ✅ Implemented Features:
1. Date range filtering with presets
2. 13 KPI metrics with auto-refresh
3. Detailed breakdown modals for 8 metrics
4. 3 interactive charts with date filters
5. 2 ranking tables (top/bottom performers)
6. Responsive design (mobile/tablet/desktop)
7. Loading states with skeletons
8. Error handling with user-friendly messages
9. Light/dark theme support
10. Sidebar navigation toggle
11. Total sales display in header

### 🔄 Data Flow Diagram:
```
Date Range Change
    ↓
handleDateRangeChange()
    ↓
Set startDate & endDate
    ↓
[startDate, endDate] dependency triggers useEffect hooks
    ↓
15 API calls to backend for all metrics
    ↓
Set respective state values
    ↓
Components re-render with new data
    ↓
Charts/Cards update visually
```

### 🖱️ User Interaction Flow:
```
User clicks KPI card
    ↓
handleKPICardClick() / handleNetSalesCardClick() / etc.
    ↓
Open breakdown modal
    ↓
Fetch breakdown data from API
    ↓
Show loading skeleton
    ↓
Data arrives
    ↓
Render DetailItem components with breakdown info
    ↓
User closes modal
```

---

## Database Tables Used (Backend)

The backend queries these PostgreSQL tables for Petrol Data:

1. **transactions** - Individual transaction records
   - Filters: `transaction_date`, `category`, `nominal_code`
   - Used for: Fuel volume, sales, purchases, labour cost

2. **fuel_margin_data** - Fuel margin and PPL data
   - Filters: `transaction_date`
   - Used for: Net sales, PPL calculations, profit

3. **monthly_summary** - Monthly aggregated data
   - Used for: Monthly performance chart

4. **sites** - Site master data
   - Used for: Top/bottom performing sites tables

5. **bank_accounts** - Bank account balances
   - Used for: Bank closing balance

---

## Responsive Breakpoints

### Mobile (< 640px):
- Single column grid
- Smaller font sizes
- Collapsed charts
- Vertical stacking of cards

### Tablet (640px - 1024px):
- 2 column grids
- Medium font sizes
- Standard layouts

### Desktop (> 1024px):
- 3-4 column grids
- Full layouts
- Side-by-side charts
- Full-width tables

### State Detection:
```javascript
const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
const [isTablet, setIsTablet] = useState(
  window.innerWidth >= 640 && window.innerWidth < 1024
);
```

---

## Summary of All APIs Used

| Metric | Endpoint | Method | Parameters |
|--------|----------|--------|------------|
| Fuel Volume | `/petrol/fuel-volume` | GET | startDate, endDate |
| Net Sales | `/petrol/net-sales` | GET | startDate, endDate |
| Profit | `/petrol/profit` | GET | startDate, endDate |
| Avg PPL | `/petrol/avg-ppl` | GET | startDate, endDate |
| Actual PPL | `/petrol/actual-ppl` | GET | startDate, endDate |
| Labour Cost | `/petrol/labour-cost` | GET | startDate, endDate |
| Active Sites | `/petrol/active-sites` | GET | startDate, endDate |
| Profit Margin | `/petrol/profit-margin` | GET | startDate, endDate |
| Avg Sale/Site | `/petrol/avg-sale-per-site` | GET | startDate, endDate |
| Total Purchases | `/petrol/total-purchases` | GET | startDate, endDate |
| Bank Balance | `/petrol/bank-balance` | GET | endDate |
| Bunkered Breakdown | `/petrol/bunkered-breakdown` | GET | startDate, endDate |
| Non-Bunkered Breakdown | `/petrol/non-bunkered-breakdown` | GET | startDate, endDate |
| Other Income Summary | `/petrol/other-income-summary` | GET | startDate, endDate |
| Monthly Performance | `/petrol/monthly-performance` | GET | startDate, endDate |
| Date-Wise Data | `/petrol/date-wise-data` | GET | startDate, endDate |
| PPL Comparison | `/petrol/ppl-comparison` | GET | startDate, endDate |
| Profit Distribution | `/petrol/profit-distribution` | GET | startDate, endDate |
| Top Performing Sites | `/petrol/top-performing-sites` | GET | startDate, endDate |
| Sites Needing Improvement | `/petrol/sites-needing-improvement` | GET | startDate, endDate |

---

## Component Structure

### Page Component: `PetrolData.jsx` (1307 lines)

**Key Imports:**
```javascript
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { PetrolKPICard } from "@/components/dashboard/PetrolKPICard";
import { NetSalesKPICard } from "@/components/dashboard/NetSalesKPICard";
import { ProfitKPICard } from "@/components/dashboard/ProfitKPICard";
import { AvgPPLKPICard } from "@/components/dashboard/AvgPPLKPICard";
import { ActualPPLKPICard } from "@/components/dashboard/ActualPPLKPICard";
import { LabourCostKPICard } from "@/components/dashboard/LabourCostKPICard";
import { ActiveSitesKPICard } from "@/components/dashboard/ActiveSitesKPICard";
import { ProfitMarginKPICard } from "@/components/dashboard/ProfitMarginKPICard";
import { AvgSalePerSiteKPICard } from "@/components/dashboard/AvgSalePerSiteKPICard";
import { TotalPurchasesKPICard } from "@/components/dashboard/TotalPurchasesKPICard";
import { BankClosingBalanceCard } from "@/components/dashboard/BankClosingBalanceCard";
import { BunkeredBreakdownCard } from "@/components/dashboard/BunkeredBreakdownCard";
import { NonBunkeredBreakdownCard } from "@/components/dashboard/NonBunkeredBreakdownCard";
import { OtherIncomeBreakdownCard } from "@/components/dashboard/OtherIncomeBreakdownCard";
import { MonthlyFuelPerformanceChart } from "@/components/dashboard/MonthlyFuelPerformanceChart";
import { DateWiseDataChart } from "@/components/dashboard/DateWiseDataChart";
import { PPLComparisonChart } from "@/components/dashboard/PPLComparisonChart";
import { ProfitDistributionChart } from "@/components/dashboard/ProfitDistributionChart";
import { PetrolTopPerformingSitesTable } from "@/components/dashboard/PetrolTopPerformingSitesTable";
import { PetrolSitesNeedingImprovementTable } from "@/components/dashboard/PetrolSitesNeedingImprovementTable";
import { CardDetailModal, DetailItem } from "@/components/dashboard/CardDetailModal";
```

**Child Components Used:** 23 specialized components

---

## Future Enhancements

### Potential Improvements:
1. **Data Caching** - Implement React Query or SWR for automatic caching
2. **Export Functionality** - Export chart data to CSV/Excel
3. **Custom Date Range Presets** - Add "Last 90 days", "Year-to-date", etc.
4. **Real-time Updates** - WebSocket for live data updates
5. **Custom Metrics** - Allow users to create custom KPIs
6. **Comparison Mode** - Compare different date ranges side-by-side
7. **Drill-down Views** - Click on chart points to see detailed data
8. **Email Reports** - Scheduled report delivery
9. **API Caching Layer** - Backend cache for common queries
10. **Performance Analytics** - Track which metrics are most accessed

---

## Troubleshooting Guide

### Issue: Data not loading
- **Check:** Date range is valid (startDate <= endDate)
- **Check:** Network tab for API error messages
- **Check:** Backend server is running on port 3001
- **Solution:** Clear browser cache and reload

### Issue: Breakdown modal shows "No data available"
- **Check:** Date range has transactions
- **Check:** API endpoint exists in backend
- **Check:** Database has data for selected period

### Issue: Charts showing blank
- **Check:** Data is returned from API
- **Check:** Chart library (Recharts) is properly imported
- **Check:** Window width is sufficient for chart rendering

### Issue: Sidebar not toggling
- **Check:** `setSidebarOpen()` is being called
- **Check:** CSS classes for transform animation are present
- **Check:** z-index values don't conflict

### Debug Mode:
Browser console will show detailed logs:
```
📊 [PetrolData] Fetching fuel volume: { startDate, endDate }
✅ [PetrolData] Fuel volume received: { totalFuelVolume, timestamp }
❌ [PetrolData] Error fetching fuel volume: error
```

---

## Testing Scenarios

### Test Date Ranges:
1. **Single day** - `2026-02-06` to `2026-02-06`
2. **Week** - `2026-01-30` to `2026-02-06`
3. **Month** - `2026-01-06` to `2026-02-06`
4. **3 months** - `2025-11-06` to `2026-02-06`
5. **Year** - `2025-02-06` to `2026-02-06`

### Test Cases:
1. Open page → Check all metrics load
2. Change date range → Check all metrics update
3. Click KPI card → Check breakdown modal opens and loads
4. Navigate to other pages → Check data persists when returning
5. Resize window → Check responsive behavior
6. Theme toggle → Check light/dark mode works
7. Sidebar toggle → Check sidebar animation and overlay

---

## References & Links

### Related Pages:
- Dashboard (Index) - `/` 
- Site Comparison - `/comparison`
- Metrics Comparison - `/metrics-comparison`

### Related Components:
- [DateRangePicker.jsx] - Date range selection
- [MetricCard.jsx] - Base KPI card component
- [CardDetailModal.jsx] - Detail breakdown modal

### API Documentation:
- [API_DOCUMENTATION.md] - Backend API details
- [services/api.js] - Frontend API client

### Database:
- PostgreSQL database with transactions, fuel_margin_data, etc.
- Backend processes queries and returns aggregated data

---

**Document Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Version:** 1.0
