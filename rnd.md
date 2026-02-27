# Business Performance Dashboard - Complete RND Documentation

## Document Information
- **Project Name:** Business Performance Dashboard (Updated Version)
- **Document Type:** Research & Development Specification
- **Version:** 2.0
- **Date Created:** February 06, 2026
- **Last Updated:** February 06, 2026
- **Author:** Development Team

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Dashboard Overview](#dashboard-overview)
3. [Page-by-Page Breakdown](#page-by-page-breakdown)
4. [Component Specifications](#component-specifications)
5. [Formula & Calculation Guide](#formula--calculation-guide)
6. [Data Flow & API Architecture](#data-flow--api-architecture)
7. [UI/UX Design Specifications](#uiux-design-specifications)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Database Schema](#database-schema)
10. [Testing Strategy](#testing-strategy)

---

## Executive Summary

### Project Overview
The Business Performance Dashboard is a comprehensive analytics platform for petroleum station operations, now expanded to include detailed breakdowns for:
- **Fuel Operations** (Bunkered & Non-Bunkered)
- **Shop Operations** (Product Sales & Categories)
- **Valeting Services** (Service Categories & Performance)
- **Return on Investment** (ROI & Cash Flow)
- **Overhead Management** (Cost Breakdown & Trends)

### Key Changes from Previous Version
1. **Expanded Metrics:** From 13 to 20+ KPIs
2. **New Sections:** Shop, Valeting, ROI, Enhanced Overheads
3. **Interactive Charts:** Toggle between Sales/Profit views
4. **Category Breakdowns:** Detailed product/service analysis
5. **Performance Rankings:** Top performers and improvement areas
6. **Formula Transparency:** Built-in formula sheet

### Technology Stack
- **Frontend:** React.js with TypeScript
- **State Management:** React Hooks + Context API
- **Charts:** Recharts library
- **Styling:** Tailwind CSS + shadcn/ui components
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **API:** RESTful architecture

---

## Dashboard Overview

### Page Structure (5 Main Sections)

```
Business Performance Dashboard
│
├── Page 1: Quick Insights & Fuel
│   ├── Quick Insights (8 KPI Cards)
│   └── Fuel Section (Metrics + Charts)
│
├── Page 2: PPL Analysis & Shop
│   ├── PPL vs Actual PPL Chart
│   └── Shop Section (Metrics + Charts)
│
├── Page 3: Valeting & ROI
│   ├── Valeting Section (Metrics + Charts)
│   └── Return on Investment (Cash + Rankings)
│
├── Page 4: Site Performance & Overheads
│   ├── Sites Needing Improvement Table
│   └── Overhead Breakdown (Charts + Trends)
│
└── Page 5: Formula Sheet
    └── Calculation References
```

### Global Features
- **Filters Button:** Top-right corner on every section
- **Date Range Selector:** Global date filter
- **Theme Toggle:** Light/Dark mode
- **Responsive Design:** Mobile, Tablet, Desktop optimized
- **Real-time Updates:** Auto-refresh capabilities

---

## Page-by-Page Breakdown

---

## PAGE 1: QUICK INSIGHTS & FUEL

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Business Performance Dashboard           [Filters]     │
├─────────────────────────────────────────────────────────┤
│  Quick Insights                                         │
├──────────────┬──────────────┬──────────────┬───────────┤
│ Total Site   │ Total Fuel   │ Shop Sales   │ Avg.      │
│ Revenue      │ Volume       │              │ Basket    │
│ Fuel+Shop+   │ Avg PPL      │              │ Size      │
│ Valet        │ (p/Litre)    │              │           │
├──────────────┼──────────────┼──────────────┼───────────┤
│ Total Net    │ PPL after    │ Shop Margin  │ Labour    │
│ Profit       │ vending out  │              │ Cost %    │
│ Fuel+Shop+   │ OVERHEADS    │              │           │
│ Valet        │              │              │           │
└──────────────┴──────────────┴──────────────┴───────────┘

┌─────────────────────────────────────────────────────────┐
│  Fuel                                                   │
├──────────────────────────┬──────────────────────────────┤
│ Non-Bunkered Fuel Volume │ Non-Bunkered Sales          │
│ Bunkered Fuel Volume     │ Bunkered Sales              │
├──────────────────────────┴──────────────────────────────┤
│  Monthly Performance Trends (Bar Graph)     [Filter]   │
│  ┌────────────────────────────────────────────────┐    │
│  │  [Bar Chart with Line Overlay]                 │    │
│  │  Volume bars + Sales line + Profit line        │    │
│  └────────────────────────────────────────────────┘    │
├──────────────────────────┬──────────────────────────────┤
│  Fuel Sales Pie Chart    │  Description Note:           │
│  [Filter]                │  Volume and Profit toggle    │
│  ┌─────────────────┐     │  feature. Shows breakdown    │
│  │  [Donut Chart]  │     │  of fuel categories.         │
│  │                 │     │                              │
│  └─────────────────┘     │                              │
└──────────────────────────┴──────────────────────────────┘
```

---

### SECTION 1.1: Quick Insights (8 KPI Cards)

#### **Card 1: Total Site Revenue**

**Component Name:** `TotalSiteRevenueCard`

**Display:**
```
Total Site Revenue
Fuel Sales
Shop Sales
Valet Sales
─────────────
£XXX,XXX
```

**Formula:**
```
Total Site Revenue = Fuel Sales + Shop Sales + Valet Sales

Where:
  Fuel Sales = SUM(sales_amount) 
               WHERE category IN ('bunkered_sales', 'non_bunkered_sales')
               AND transaction_date BETWEEN startDate AND endDate
  
  Shop Sales = SUM(sales_amount) 
               WHERE category = 'shop_sales'
               AND transaction_date BETWEEN startDate AND endDate
  
  Valet Sales = SUM(sales_amount) 
                WHERE category = 'valet_sales'
                AND transaction_date BETWEEN startDate AND endDate
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/total-site-revenue`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 1250000.00,
    "breakdown": {
      "fuelSales": 800000.00,
      "shopSales": 350000.00,
      "valetSales": 100000.00
    },
    "startDate": "2026-01-07",
    "endDate": "2026-02-06"
  }
}
```

**UI Specifications:**
- **Card Size:** 1/4 width on desktop, 1/2 on tablet, full on mobile
- **Background:** Light gray (#F5F5F5) in light mode, Dark gray (#1F2937) in dark mode
- **Font Size:** 
  - Label: 14px
  - Sub-items: 12px
  - Value: 28px bold
- **Icon:** TrendingUp icon (lucide-react)
- **Clickable:** Yes - Opens breakdown modal
- **Loading State:** Skeleton loader with shimmer effect
- **Error State:** Red border + error message

**Breakdown Modal:**
Shows detailed revenue sources with percentages and trend indicators.

---

#### **Card 2: Total Fuel Volume**

**Component Name:** `TotalFuelVolumeCard`

**Display:**
```
Total Fuel Volume
Average PPL
(Pence Per Litre)
─────────────
X.XX ML
XXX.XX p
```

**Formulas:**
```
Total Fuel Volume = Bunkered Volume + Non-Bunkered Volume

Where:
  Bunkered Volume = SUM(transaction_amount) 
                    WHERE category = 'bunkered'
                    AND transaction_date BETWEEN startDate AND endDate
  
  Non-Bunkered Volume = SUM(transaction_amount) 
                        WHERE category = 'non_bunkered'
                        AND transaction_date BETWEEN startDate AND endDate

Average PPL = SUM(ppl_value × quantity) / SUM(quantity)

Where:
  ppl_value = Price per liter from fuel_margin_data table
  quantity = Sale volume for each transaction
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/total-fuel-volume`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "totalVolume": 1250000.50,
    "bunkeredVolume": 750000.25,
    "nonBunkeredVolume": 500000.25,
    "averagePPL": 145.67,
    "unit": "liters"
  }
}
```

**UI Specifications:**
- **Value Formatting:** 
  - >= 1,000,000 L → X.XX ML
  - >= 1,000 L → X.XX K L
  - < 1,000 L → X.XX L
- **PPL Display:** XXX.XX p (always 2 decimal places)
- **Clickable:** Yes - Shows volume breakdown by fuel type

---

#### **Card 3: Shop Sales**

**Component Name:** `ShopSalesCard`

**Display:**
```
Shop Sales
─────────────
£XXX,XXX
```

**Formula:**
```
Shop Sales = SUM(sales_amount) 
             WHERE category = 'shop_sales'
             AND transaction_date BETWEEN startDate AND endDate
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/shop-sales`
- **Parameters:** `startDate`, `endDate`

**UI Specifications:**
- **Card Size:** 1/4 width
- **Icon:** ShoppingBag icon
- **Clickable:** Yes - Opens shop sales breakdown by category

---

#### **Card 4: Avg. Basket Size**

**Component Name:** `AvgBasketSizeCard`

**Display:**
```
Avg. Basket Size
─────────────
£XX.XX
```

**Formula:**
```
Avg. Basket Size = Total Shop Sales / Total Number of Transactions

Where:
  Total Shop Sales = SUM(sales_amount) 
                     WHERE category = 'shop_sales'
                     AND transaction_date BETWEEN startDate AND endDate
  
  Total Transactions = COUNT(DISTINCT transaction_id)
                       WHERE category = 'shop_sales'
                       AND transaction_date BETWEEN startDate AND endDate

Alternative Source (if available):
  Avg. Basket Size = Data from EvoBos POS system
                     Average transaction value
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/avg-basket-size`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "avgBasketSize": 25.67,
    "totalTransactions": 13500,
    "totalSales": 346545.00,
    "startDate": "2026-01-07",
    "endDate": "2026-02-06"
  }
}
```

**UI Specifications:**
- **Value Formatting:** £XX.XX (always 2 decimals)
- **Trend Indicator:** Up/down arrow with % change vs previous period
- **Clickable:** No (display only)

**Notes:**
- This metric comes from EvoBos (POS system) if integrated
- Represents average transaction value in shop
- Useful for understanding customer spending patterns

---

#### **Card 5: Total Net Profit**

**Component Name:** `TotalNetProfitCard`

**Display:**
```
Total Net Profit
Fuel Profit
Shop Profit
Valet Profit
─────────────
£XXX,XXX
```

**Formula:**
```
Total Net Profit = Fuel Profit + Shop Profit + Valet Profit

Where:
  Fuel Profit = (Fuel Sales - Fuel Purchases) + Fuel Other Income
              = (Bunkered Sales - Bunkered Purchases) + 
                (Non-Bunkered Sales - Non-Bunkered Purchases)
  
  Shop Profit = Shop Sales - Shop Purchases - Shop Operating Costs
  
  Valet Profit = Valet Sales - Valet Operating Costs

Detailed Calculations:
  Bunkered Profit = SUM(sales_amount) - SUM(purchase_amount)
                    WHERE category = 'bunkered'
  
  Non-Bunkered Profit = SUM(sales_amount) - SUM(purchase_amount)
                        WHERE category = 'non_bunkered'
  
  Shop Profit = SUM(sales_amount) - SUM(purchase_amount) - SUM(operating_costs)
                WHERE category = 'shop'
  
  Valet Profit = SUM(sales_amount) - SUM(operating_costs)
                 WHERE category = 'valet'
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/total-net-profit`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "totalProfit": 156780.00,
    "breakdown": {
      "fuelProfit": 98500.00,
      "shopProfit": 45280.00,
      "valetProfit": 13000.00
    },
    "profitMargin": 12.54,
    "startDate": "2026-01-07",
    "endDate": "2026-02-06"
  }
}
```

**UI Specifications:**
- **Profit Color:** Green if positive, Red if negative
- **Breakdown Visible:** Yes - shows 3 sub-categories
- **Clickable:** Yes - Opens detailed profit analysis modal

---

#### **Card 6: PPL after vending out the OVERHEADS**

**Component Name:** `PPLAfterOverheadsCard`

**Display:**
```
PPL after vending out
the OVERHEADS
─────────────
XXX.XX p
```

**Formula:**
```
PPL after Overheads = (Total Fuel Profit - Total Overheads) / Total Fuel Volume

Where:
  Total Fuel Profit = Fuel Sales - Fuel Purchases
  
  Total Overheads = SUM(transaction_amount)
                    WHERE nominal_code IN (7000-7999)
                    AND transaction_date BETWEEN startDate AND endDate
  
  Total Fuel Volume = Bunkered Volume + Non-Bunkered Volume

Detailed Formula:
  PPL after OH = ((Fuel Sales - Fuel Purchases) - Overheads) / Volume × 100

Example:
  Sales = £1,000,000
  Purchases = £800,000
  Overheads = £50,000
  Volume = 1,000,000 L
  
  PPL after OH = ((1,000,000 - 800,000) - 50,000) / 1,000,000 × 100
               = (200,000 - 50,000) / 1,000,000 × 100
               = 150,000 / 1,000,000 × 100
               = 15.00 p
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/ppl-after-overheads`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "pplAfterOverheads": 15.67,
    "fuelProfit": 200000.00,
    "totalOverheads": 50000.00,
    "fuelVolume": 1000000.50,
    "calculation": {
      "netProfit": 150000.00,
      "pplValue": 15.67
    }
  }
}
```

**UI Specifications:**
- **Value Formatting:** XXX.XX p (2 decimals)
- **Comparison:** Show vs Average PPL (from Card 2)
- **Color Coding:** 
  - Green if higher than target
  - Yellow if near target
  - Red if below target
- **Clickable:** Yes - Opens overhead breakdown modal

**Business Context:**
This metric shows the actual profit per liter after accounting for all operational overhead costs. It's the "true" PPL that indicates real profitability.

---

#### **Card 7: Shop Margin**

**Component Name:** `ShopMarginCard`

**Display:**
```
Shop Margin
─────────────
XX.X%
```

**Formula:**
```
Shop Margin % = (Shop Profit / Shop Sales) × 100

Where:
  Shop Profit = Shop Sales - Shop Purchases - Shop Operating Costs
  
  Shop Sales = SUM(sales_amount)
               WHERE category = 'shop_sales'
               AND transaction_date BETWEEN startDate AND endDate
  
  Shop Purchases = SUM(purchase_amount)
                   WHERE category = 'shop_purchases'
                   AND transaction_date BETWEEN startDate AND endDate
  
  Shop Operating Costs = Allocated portion of labour, utilities, etc.

Example:
  Shop Sales = £350,000
  Shop Purchases = £245,000
  Shop Operating Costs = £35,000
  
  Shop Profit = 350,000 - 245,000 - 35,000 = £70,000
  Shop Margin = (70,000 / 350,000) × 100 = 20.0%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/shop-margin`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "shopMargin": 20.0,
    "shopSales": 350000.00,
    "shopPurchases": 245000.00,
    "shopOperatingCosts": 35000.00,
    "shopProfit": 70000.00,
    "industryBenchmark": 22.5
  }
}
```

**UI Specifications:**
- **Value Formatting:** XX.X% (1 decimal)
- **Benchmark Comparison:** Show industry average (if available)
- **Trend:** Up/down vs previous period
- **Color Coding:**
  - Green: >= 20%
  - Yellow: 15-20%
  - Red: < 15%
- **Clickable:** Yes - Opens shop margin analysis

---

#### **Card 8: Labour Cost as % of shop/fuel sales**

**Component Name:** `LabourCostPercentageCard`

**Display:**
```
Labour Cost as per
shop/ fuel sales %
─────────────
X.X%
```

**Formula:**
```
Labour Cost % = (Total Labour Cost / (Shop Sales + Fuel Sales)) × 100

Where:
  Total Labour Cost = SUM(transaction_amount)
                      WHERE nominal_code IN (8100, 8110, 8120, 8130)
                      AND transaction_date BETWEEN startDate AND endDate
  
  Shop Sales = SUM(sales_amount)
               WHERE category = 'shop_sales'
               AND transaction_date BETWEEN startDate AND endDate
  
  Fuel Sales = SUM(sales_amount)
               WHERE category IN ('bunkered_sales', 'non_bunkered_sales')
               AND transaction_date BETWEEN startDate AND endDate

Example:
  Labour Cost = £45,000
  Shop Sales = £350,000
  Fuel Sales = £800,000
  
  Labour Cost % = (45,000 / (350,000 + 800,000)) × 100
                = (45,000 / 1,150,000) × 100
                = 3.9%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/labour-cost-percentage`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "labourCostPercentage": 3.9,
    "totalLabourCost": 45000.00,
    "shopSales": 350000.00,
    "fuelSales": 800000.00,
    "totalSales": 1150000.00,
    "breakdown": {
      "wages": 35000.00,
      "ni": 5500.00,
      "pension": 2500.00,
      "other": 2000.00
    }
  }
}
```

**UI Specifications:**
- **Value Formatting:** X.X% (1 decimal)
- **Industry Benchmark:** 3-5% is typical
- **Trend:** Show monthly trend
- **Color Coding:**
  - Green: <= 4%
  - Yellow: 4-5%
  - Red: > 5%
- **Clickable:** Yes - Opens labour cost breakdown

**Business Context:**
This metric helps understand labor efficiency. Lower percentage means better productivity, but too low might indicate understaffing.

---

### SECTION 1.2: Fuel Section

---

#### **Metric 1: Non-Bunkered Fuel Volume**

**Component Name:** `NonBunkeredFuelVolumeMetric`

**Display:**
```
Non- Bunkered Fuel volume
Bunkered Fuel Volume
─────────────
X.XX ML
X.XX ML
```

**Formula:**
```
Non-Bunkered Volume = SUM(transaction_amount)
                      WHERE category = 'non_bunkered'
                      AND transaction_date BETWEEN startDate AND endDate

Bunkered Volume = SUM(transaction_amount)
                  WHERE category = 'bunkered'
                  AND transaction_date BETWEEN startDate AND endDate
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/fuel-volume-breakdown`
- **Parameters:** `startDate`, `endDate`

**UI Specifications:**
- **Layout:** Stacked display, both values visible
- **Size:** 1/2 width card
- **Clickable:** Yes - Opens detailed fuel type breakdown

---

#### **Metric 2: Non-Bunkered sales / Bunkered sales**

**Component Name:** `FuelSalesBreakdownMetric`

**Display:**
```
Non- Bunkered sales
Bunkered sales
─────────────
£XXX,XXX
£XXX,XXX
```

**Formula:**
```
Non-Bunkered Sales = SUM(sales_amount)
                     WHERE category = 'non_bunkered_sales'
                     AND transaction_date BETWEEN startDate AND endDate

Bunkered Sales = SUM(sales_amount)
                 WHERE category = 'bunkered_sales'
                 AND transaction_date BETWEEN startDate AND endDate
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/fuel-sales-breakdown`
- **Parameters:** `startDate`, `endDate`

**UI Specifications:**
- **Layout:** Stacked display
- **Size:** 1/2 width card
- **Trend:** Show % change from previous period

---

#### **Chart 1: Monthly Performance Trends (Bar Graph)**

**Component Name:** `FuelMonthlyPerformanceChart`

**Display:**
```
Monthly Performance Trends (Bar Graph)          [Filter]
┌───────────────────────────────────────────────────────┐
│                                                       │
│   [Grouped Bar Chart with Line Overlays]             │
│                                                       │
│   Legend:                                             │
│   ■ Volume (bars)                                     │
│   ─ Sales (line)                                      │
│   ─ Profit (line)                                     │
│                                                       │
│   X-axis: Months (Jan, Feb, Mar...)                  │
│   Y-axis (left): Volume (ML)                          │
│   Y-axis (right): Sales/Profit (£)                    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Chart Type:** Combination Chart (Bar + Line)

**Data Structure:**
```javascript
[
  {
    month: "Jan",
    volume: 125000,      // Liters
    sales: 182500,       // £
    profit: 18250        // £
  },
  {
    month: "Feb",
    volume: 130000,
    sales: 189700,
    profit: 18970
  },
  // ... more months
]
```

**Formulas:**
```
For each month in date range:

Monthly Volume = SUM(transaction_amount)
                 WHERE MONTH(transaction_date) = {month}
                 AND YEAR(transaction_date) = {year}
                 AND category IN ('bunkered', 'non_bunkered')

Monthly Sales = SUM(sales_amount)
                WHERE MONTH(transaction_date) = {month}
                AND YEAR(transaction_date) = {year}
                AND category IN ('bunkered_sales', 'non_bunkered_sales')

Monthly Profit = Monthly Sales - Monthly Purchases
               = SUM(sales_amount) - SUM(purchase_amount)
                 WHERE MONTH(transaction_date) = {month}
                 AND YEAR(transaction_date) = {year}
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/fuel-monthly-performance`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "monthlyData": [
      {
        "month": "2026-01",
        "monthName": "Jan",
        "volume": 125000.00,
        "sales": 182500.00,
        "profit": 18250.00,
        "margin": 10.0
      }
    ],
    "totals": {
      "volume": 1500000.00,
      "sales": 2190000.00,
      "profit": 219000.00
    }
  }
}
```

**UI Specifications:**
- **Chart Library:** Recharts
- **Chart Size:** Full width, 400px height
- **Bar Colors:** 
  - Volume: Blue (#3B82F6)
- **Line Colors:**
  - Sales: Green (#10B981)
  - Profit: Orange (#F59E0B)
- **Interaction:** 
  - Hover: Show tooltip with all values
  - Click bar: Drill down to daily data for that month
- **Filter Button:** Opens filter modal for:
  - Fuel type selection (All/Bunkered/Non-Bunkered)
  - Metric selection (Volume/Sales/Profit)

**Recharts Implementation:**
```jsx

  
    
    
    
    
    
    
    
    
    
  

```

---

#### **Chart 2: Fuel Sales Donut Chart**

**Component Name:** `FuelSalesDonutChart`

**Display:**
```
Fuel Sales for (XY)          [Filter]          Description
Sale Filter                                    (donut or pie chart)
Total Amount                                   Volume and profit should
                                              be displayed for each
┌─────────────────────┐                       category. A toggle
│                     │                       feature must be available
│   [Donut Chart]     │                       that allows users to
│                     │                       toggle section below the
│   Categories:       │                       chart. The chart should
│   ■ Diesel          │                       update to show either
│   ■ Unleaded        │                       Volume or Profit.
│   ■ Super           │
│   ■ Premium         │
│                     │
└─────────────────────┘

[Toggle: Volume | Profit]
```

**Chart Type:** Donut Chart with Toggle

**Data Structure:**
```javascript
// When showing VOLUME
[
  {
    name: "Diesel",
    value: 500000,        // Liters
    color: "#3B82F6",
    percentage: 40,
    sales: 730000         // £ (for tooltip)
  },
  {
    name: "Unleaded",
    value: 450000,
    color: "#10B981",
    percentage: 36
  },
  {
    name: "Super Unleaded",
    value: 200000,
    color: "#F59E0B",
    percentage: 16
  },
  {
    name: "Premium",
    value: 100000,
    color: "#EF4444",
    percentage: 8
  }
]

// When showing PROFIT
[
  {
    name: "Diesel",
    value: 36500,         // £ Profit
    color: "#3B82F6",
    percentage: 35
  },
  // ... same categories
]
```

**Formulas:**
```
For Volume View:
  Category Volume = SUM(transaction_amount)
                    WHERE fuel_type = {category}
                    AND transaction_date BETWEEN startDate AND endDate
  
  Percentage = (Category Volume / Total Volume) × 100

For Profit View:
  Category Profit = SUM(sales_amount) - SUM(purchase_amount)
                    WHERE fuel_type = {category}
                    AND transaction_date BETWEEN startDate AND endDate
  
  Percentage = (Category Profit / Total Profit) × 100

Fuel Categories:
  - Diesel
  - Unleaded
  - Super Unleaded
  - Premium
  - Others (if any)
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/fuel-sales-breakdown-chart`
- **Parameters:** `startDate`, `endDate`, `view` (volume|profit)
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "view": "volume",
    "categories": [
      {
        "name": "Diesel",
        "volume": 500000.00,
        "sales": 730000.00,
        "profit": 36500.00,
        "percentage": 40.0,
        "color": "#3B82F6"
      }
    ],
    "totals": {
      "volume": 1250000.00,
      "sales": 1825000.00,
      "profit": 104000.00
    }
  }
}
```

**UI Specifications:**
- **Chart Size:** 400px × 400px
- **Donut Thickness:** 60px
- **Center Display:** Total value (changes with toggle)
- **Toggle Component:**
  ```jsx
  <ToggleGroup type="single" defaultValue="volume">
    <ToggleGroupItem value="volume">Volume</ToggleGroupItem>
    <ToggleGroupItem value="profit">Profit</ToggleGroupItem>
  </ToggleGroup>
  ```
- **Interaction:**
  - Hover: Highlight segment + show tooltip
  - Click segment: Show detailed breakdown modal
- **Legend:** Below chart with color coding
- **Filter Button:** Opens fuel category filter

**State Management:**
```javascript
const [chartView, setChartView] = useState('volume');
const [chartData, setChartData] = useState([]);

// Toggle handler
const handleToggle = (value) => {
  setChartView(value);
  fetchChartData(startDate, endDate, value);
};
```

**Recharts Implementation:**
```jsx

  
    <Pie
      data={chartData}
      dataKey="value"
      nameKey="name"
      cx="50%"
      cy="50%"
      innerRadius={120}
      outerRadius={180}
      paddingAngle={2}
      label={({ percentage }) => `${percentage}%`}
    >
      {chartData.map((entry, index) => (
        
      ))}
    
    <Tooltip 
      formatter={(value, name) => {
        const format = chartView === 'volume' 
          ? `${(value / 1000000).toFixed(2)} ML`
          : `£${value.toLocaleString()}`;
        return [format, name];
      }}
    />
  


{/* Center display */}

  
    
      {chartView === 'volume' ? 'Total Volume' : 'Total Profit'}
    
    
      {chartView === 'volume' 
        ? `${(totals.volume / 1000000).toFixed(2)} ML`
        : `£${totals.profit.toLocaleString()}`
      }
    
  

```

**Description Note (Right Side):**
```
Description (donut or pie chart):
Volume and profit should be displayed for each category.
A toggle feature must be available that allows users to
toggle section below the chart. The chart should update
to show either Volume or Profit.

Based on the selected toggle, the pie chart should
dynamically update to reflect the corresponding values.
```

---

## PAGE 2: PPL ANALYSIS & SHOP

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  PPL vs Actual PPL vending out OH:          [Filter]   │
│                                                         │
│  ┌────────────────────────────────────────────────┐    │
│  │  [Line Chart - Dual Lines]                     │    │
│  │  ─ PPL (blue line)                             │    │
│  │  ─ Actual PPL (red line)                       │    │
│  │                                                 │    │
│  │  X-axis: Months                                │    │
│  │  Y-axis: PPL (pence)                           │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Shop                                                   │
├──────────────────────────┬──────────────────────────────┤
│ Shop Sales               │ Shop Profit                  │
│ £XXX,XXX                │ £XXX,XXX                    │
├──────────────────────────┴──────────────────────────────┤
│                               [Filter]                  │
│  ┌────────────────────────────────────────────────┐    │
│  │  [Bar Chart with Shop Margin Line]             │    │
│  │  Bars: Monthly shop sales                      │    │
│  │  Line: Shop margin %                           │    │
│  └────────────────────────────────────────────────┘    │
├──────────────────────────┬──────────────────────────────┤
│  Shop Categories Chart   │  Description:                │
│  [Filter]                │  Top 5 product categories    │
│  ┌─────────────────┐     │  Sales & Profit toggle       │
│  │  [Pie Chart]    │     │                              │
│  │  ■ Tobacco      │     │                              │
│  │  ■ Vape         │     │                              │
│  │  ■ Alcohol      │     │                              │
│  │  ■ Food         │     │                              │
│  │  ■ Coffee       │     │                              │
│  │  ■ Soft Drinks  │     │                              │
│  └─────────────────┘     │                              │
│  [Toggle: Sales|Profit]  │                              │
└──────────────────────────┴──────────────────────────────┘
```

---

### SECTION 2.1: PPL vs Actual PPL Chart

---

#### **Chart: PPL vs Actual PPL vending out OH**

**Component Name:** `PPLComparisonLineChart`

**Display:**
```
PPL vs Actual PPL vending out OH:               [Filter]
┌───────────────────────────────────────────────────────┐
│                                                       │
│   150p ┐                                             │
│        │         ╱─────╲                             │
│   145p ┤      ╱─╯       ╲╱╲    ─ PPL               │
│        │   ╱─╯              ╲╱                       │
│   140p ┤  ╱                    ╲                     │
│        │ ╱         ╱─╲                               │
│   135p ┤          ╱   ╲    ─ Actual PPL             │
│        │        ╱─     ╲╱╲                           │
│   130p ┤      ╱─           ╲                         │
│        └──────────────────────────────────           │
│         Jan  Feb  Mar  Apr  May  Jun                │
│                                                       │
└───────────────────────────────────────────────────────┘

Legend:
─ PPL (Blue)
─ Actual PPL after vending out OH (Red)
```

**Chart Type:** Dual-line comparison chart

**Data Structure:**
```javascript
[
  {
    month: "Jan",
    ppl: 145.67,              // Average PPL
    actualPPL: 138.45,        // PPL after overheads
    difference: 7.22,
    overheadCost: 7.22        // Actual overhead per liter
  },
  {
    month: "Feb",
    ppl: 147.89,
    actualPPL: 139.12,
    difference: 8.77,
    overheadCost: 8.77
  },
  // ... more months
]
```

**Formulas:**
```
For each month:

Average PPL = SUM(ppl_value × quantity) / SUM(quantity)
            WHERE transaction_date MONTH = {month}

Actual PPL = Average PPL - (Total Overheads / Total Volume)

Where:
  Total Overheads = SUM(transaction_amount)
                    WHERE nominal_code IN (7000-7999)
                    AND MONTH(transaction_date) = {month}
  
  Total Volume = SUM(transaction_amount)
                 WHERE category IN ('bunkered', 'non_bunkered')
                 AND MONTH(transaction_date) = {month}

Detailed Formula:
  Overhead PPL = Total Overheads / Total Volume × 100 (to get pence)
  Actual PPL = Average PPL - Overhead PPL

Example for January:
  Average PPL = 145.67p
  Total Overheads = £72,200
  Total Volume = 1,000,000 L
  
  Overhead PPL = 72,200 / 1,000,000 × 100 = 7.22p
  Actual PPL = 145.67 - 7.22 = 138.45p
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/ppl-comparison-monthly`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "monthlyComparison": [
      {
        "month": "2026-01",
        "monthName": "Jan",
        "averagePPL": 145.67,
        "actualPPL": 138.45,
        "overheadPPL": 7.22,
        "totalOverheads": 72200.00,
        "totalVolume": 1000000.00
      }
    ],
    "averages": {
      "avgPPL": 146.23,
      "avgActualPPL": 138.91,
      "avgOverheadPPL": 7.32
    }
  }
}
```

**UI Specifications:**
- **Chart Size:** Full width, 350px height
- **Line Styles:**
  - PPL: Solid blue line (#3B82F6), 3px width
  - Actual PPL: Solid red line (#EF4444), 3px width
- **Data Points:** Circles on each data point
- **Grid:** Horizontal dashed lines
- **Tooltip:** Shows both values + difference
- **Y-axis Range:** Auto-scale with 10p padding
- **X-axis:** Month names
- **Legend:** Top-right corner
- **Filter Button:** Opens filter for:
  - Date range selection
  - Fuel type filter (All/Bunkered/Non-Bunkered)
  - View options (Daily/Weekly/Monthly)

**Recharts Implementation:**
```jsx

  
    
    
    <YAxis 
      label={{ value: 'PPL (pence)', angle: -90, position: 'insideLeft' }}
      domain={['dataMin - 10', 'dataMax + 10']}
    />
    <Tooltip 
      formatter={(value) => `${value.toFixed(2)}p`}
      content={}
    />
    
    
    
  

```

**Custom Tooltip:**
```jsx
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const ppl = payload[0].value;
    const actualPPL = payload[1].value;
    const difference = ppl - actualPPL;
    
    return (
      
        {label}
        PPL: {ppl.toFixed(2)}p
        Actual PPL: {actualPPL.toFixed(2)}p
        
          Overhead Impact: {difference.toFixed(2)}p
        
      
    );
  }
  return null;
};
```

**Business Insights:**
- **Gap Analysis:** The difference between the two lines shows overhead impact
- **Trend Watching:** Widening gap = increasing overhead burden
- **Target:** Keep actual PPL as close to average PPL as possible
- **Action:** If gap increases, review overhead costs

---

### SECTION 2.2: Shop Section

---

#### **Metric 1: Shop Sales**

**Component Name:** `ShopSalesMetric`

**Display:**
```
Shop Sales
─────────────
£XXX,XXX
```

**Formula:**
```
Shop Sales = SUM(sales_amount)
             WHERE category = 'shop_sales'
             AND transaction_date BETWEEN startDate AND endDate
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/shop-sales`
- **Parameters:** `startDate`, `endDate`

**UI Specifications:**
- **Size:** 1/2 width card
- **Icon:** ShoppingBag
- **Trend:** Show % change vs previous period
- **Clickable:** Yes - Opens daily sales breakdown

---

#### **Metric 2: Shop Profit**

**Component Name:** `ShopProfitMetric`

**Display:**
```
Shop Profit
─────────────
£XXX,XXX
```

**Formula:**
```
Shop Profit = Shop Sales - Shop Purchases - Shop Operating Costs

Where:
  Shop Sales = SUM(sales_amount)
               WHERE category = 'shop_sales'
  
  Shop Purchases = SUM(purchase_amount)
                   WHERE category = 'shop_purchases'
  
  Shop Operating Costs = Allocated portion of:
                         - Labour costs (shop staff)
                         - Utilities (shop portion)
                         - Waste/shrinkage
                         - Other direct costs
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/shop-profit`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "shopProfit": 70000.00,
    "shopSales": 350000.00,
    "shopPurchases": 245000.00,
    "shopOperatingCosts": 35000.00,
    "profitMargin": 20.0,
    "breakdown": {
      "labour": 18000.00,
      "utilities": 8000.00,
      "waste": 5000.00,
      "other": 4000.00
    }
  }
}
```

**UI Specifications:**
- **Size:** 1/2 width card
- **Color:** Green if positive, Red if negative
- **Margin Display:** Show profit margin % below
- **Clickable:** Yes - Opens profit breakdown modal

---

#### **Chart 1: Shop Performance Bar Chart**

**Component Name:** `ShopPerformanceBarChart`

**Display:**
```
                                                [Filter]
┌───────────────────────────────────────────────────────┐
│   £400k ┐                                             │
│         │                                             │
│   £350k ┤      ■        ■                 ■          │
│         │      ■        ■                 ■          │
│   £300k ┤      ■        ■        ■        ■          │
│         │      ■        ■        ■        ■          │
│   £250k ┤      ■        ■        ■        ■      ■   │
│         │      ■        ■        ■        ■      ■   │
│   £200k ┤  ■   ■    ■   ■    ■   ■    ■   ■      ■   │
│         │  ■   ■    ■   ■    ■   ■    ■   ■      ■   │
│   £150k ┤  ■   ■    ■   ■    ■   ■    ■   ■      ■   │
│         └──────────────────────────────────────────   │
│          Jan  Feb  Mar  Apr  May  Jun                │
│                                                       │
│   25% ┐  ─────────────╲╱─────╱╲───── Shop Margin   │
│       │                                               │
│   20% ┤                                               │
│       │                                               │
│   15% ┤                                               │
│       └──────────────────────────────────────────    │
└───────────────────────────────────────────────────────┘

Legend:
■ Shop Sales (Blue bars)
─ Shop Margin % (Orange line)
```

**Chart Type:** Combination Chart (Bars + Line)

**Data Structure:**
```javascript
[
  {
    month: "Jan",
    sales: 325000,
    profit: 65000,
    margin: 20.0,        // (profit / sales) × 100
    purchases: 227500,
    operatingCosts: 32500
  },
  {
    month: "Feb",
    sales: 340000,
    profit: 68000,
    margin: 20.0
  },
  // ... more months
]
```

**Formulas:**
```
For each month:

Monthly Shop Sales = SUM(sales_amount)
                     WHERE category = 'shop_sales'
                     AND MONTH(transaction_date) = {month}

Monthly Shop Profit = Monthly Sales - Monthly Purchases - Monthly Operating Costs

Monthly Shop Margin = (Monthly Profit / Monthly Sales) × 100

Example for January:
  Sales = £325,000
  Purchases = £227,500
  Operating Costs = £32,500
  
  Profit = 325,000 - 227,500 - 32,500 = £65,000
  Margin = (65,000 / 325,000) × 100 = 20.0%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/shop-monthly-performance`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "monthlyData": [
      {
        "month": "2026-01",
        "monthName": "Jan",
        "sales": 325000.00,
        "profit": 65000.00,
        "margin": 20.0,
        "purchases": 227500.00,
        "operatingCosts": 32500.00
      }
    ],
    "totals": {
      "sales": 3900000.00,
      "profit": 780000.00,
      "avgMargin": 20.0
    }
  }
}
```

**UI Specifications:**
- **Chart Size:** Full width, 400px height
- **Bar Color:** Blue (#3B82F6)
- **Line Color:** Orange (#F59E0B)
- **Dual Y-axes:**
  - Left: Sales (£)
  - Right: Margin (%)
- **Tooltip:** Shows sales, profit, and margin
- **Interaction:** Click bar to drill down to daily data
- **Filter Options:**
  - Date range
  - View by: Day/Week/Month
  - Show: Sales/Profit/Both

**Recharts Implementation:**
```jsx

  
    
    
    <YAxis 
      yAxisId="left" 
      label={{ value: 'Sales (£)', angle: -90, position: 'insideLeft' }}
      tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`}
    />
    
    } />
    
    
    
  

```

**Custom Tooltip:**
```jsx
const CustomShopTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const sales = payload[0].value;
    const margin = payload[1].value;
    const profit = sales * (margin / 100);
    
    return (
      
        {label}
        Sales: £{sales.toLocaleString()}
        Profit: £{profit.toLocaleString()}
        Margin: {margin.toFixed(1)}%
      
    );
  }
  return null;
};
```

---

#### **Chart 2: Shop Categories Pie Chart (Top 5)**

**Component Name:** `ShopCategoriesPieChart`

**Display:**
```
                                    [Filter]

This section represents Sales & Profit in the
Top 5 product categories (for ex: Tobacco,
┌─────────────────────┐   Vape, Alcohol, Food, Coffee, and Soft
│         14%         │   Drinks)—based on performance. The data
│      ╱───────╲      │   is visualized using a pie chart, where
│    ╱           ╲    │   each slice indicates the proportionate
│   │    40%      │   │   contribution of each category.
│   │             │   │   
│   │      36%    │   │   All remaining categories are clubbed under
│    ╲           ╱    │   an "Others" segment to maintain clarity
│      ╲───────╱      │   and focus on key contributors.
│         10%         │
└─────────────────────┘   A toggle option must be provided to switch
                          between viewing Sales and Profit. Based on
[Toggle: Sales | Profit]  the selected toggle, the pie chart should
                          dynamically update to reflect the
                          corresponding values.

Legend:
■ Tobacco (40%)
■ Vape (36%)
■ Alcohol (14%)
■ Food (10%)
■ Coffee & Soft Drinks (Others)
```

**Chart Type:** Pie Chart with Toggle

**Data Structure:**
```javascript
// When showing SALES
[
  {
    category: "Tobacco",
    sales: 140000,
    profit: 28000,
    percentage: 40.0,
    color: "#3B82F6",
    rank: 1
  },
  {
    category: "Vape",
    sales: 126000,
    profit: 37800,
    percentage: 36.0,
    color: "#10B981",
    rank: 2
  },
  {
    category: "Alcohol",
    sales: 49000,
    profit: 9800,
    percentage: 14.0,
    color: "#F59E0B",
    rank: 3
  },
  {
    category: "Food",
    sales: 35000,
    profit: 10500,
    percentage: 10.0,
    color: "#EF4444",
    rank: 4
  },
  {
    category: "Coffee",
    sales: 28000,
    profit: 8400,
    percentage: 8.0,
    color: "#8B5CF6",
    rank: 5
  },
  {
    category: "Others",
    sales: 72000,
    profit: 14400,
    percentage: 20.0,
    color: "#6B7280",
    rank: 6
  }
]

// When showing PROFIT (top 5 by profit, not sales)
[
  {
    category: "Vape",
    profit: 37800,
    percentage: 38.0,
    rank: 1
  },
  // ... reordered by profit
]
```

**Formulas:**
```
Step 1: Get ALL categories with sales/profit
  Category Sales = SUM(sales_amount)
                   WHERE product_category = {category}
                   AND transaction_date BETWEEN startDate AND endDate
  
  Category Profit = SUM(sales_amount) - SUM(purchase_amount)
                    WHERE product_category = {category}

Step 2: Rank categories
  FOR Sales View:
    RANK categories by total sales DESC
  
  FOR Profit View:
    RANK categories by total profit DESC

Step 3: Select Top 5
  Top 5 = Categories with rank 1-5

Step 4: Group remaining as "Others"
  Others Sales = SUM(sales from ranks 6+)
  Others Profit = SUM(profit from ranks 6+)

Step 5: Calculate percentages
  Category % = (Category Value / Total Value) × 100

Product Categories:
  - Tobacco
  - Vape
  - Alcohol
  - Food
  - Coffee
  - Soft Drinks
  - Confectionery
  - Snacks
  - Household
  - Others

Example Calculation:
  Total Shop Sales = £350,000
  
  Tobacco Sales = £140,000
  Tobacco % = (140,000 / 350,000) × 100 = 40.0%
  
  Top 5 Total = £280,000
  Others = £70,000 (£350,000 - £280,000)
  Others % = (70,000 / 350,000) × 100 = 20.0%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/shop-categories-breakdown`
- **Parameters:** `startDate`, `endDate`, `view` (sales|profit)
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "view": "sales",
    "top5": [
      {
        "category": "Tobacco",
        "sales": 140000.00,
        "profit": 28000.00,
        "margin": 20.0,
        "percentage": 40.0,
        "rank": 1,
        "color": "#3B82F6"
      }
    ],
    "others": {
      "sales": 70000.00,
      "profit": 14000.00,
      "percentage": 20.0,
      "categoryCount": 5
    },
    "totals": {
      "sales": 350000.00,
      "profit": 70000.00,
      "categoryCount": 10
    }
  }
}
```

**UI Specifications:**
- **Chart Size:** 400px × 400px
- **Chart Type:** Pie (not donut)
- **Label Position:** Outside with percentage
- **Toggle Component:**
  ```jsx
  <ToggleGroup type="single" defaultValue="sales">
    <ToggleGroupItem value="sales">Sales</ToggleGroupItem>
    <ToggleGroupItem value="profit">Profit</ToggleGroupItem>
  </ToggleGroup>
  ```
- **Colors:**
  - Tobacco: Blue (#3B82F6)
  - Vape: Green (#10B981)
  - Alcohol: Orange (#F59E0B)
  - Food: Red (#EF4444)
  - Coffee: Purple (#8B5CF6)
  - Others: Gray (#6B7280)
- **Interaction:**
  - Hover: Highlight slice + show detailed tooltip
  - Click: Drill down to that category's performance
- **Filter Button:** Opens category selection filter

**Recharts Implementation:**
```jsx
const [chartView, setChartView] = useState('sales');


  
    <Pie
      data={categoryData}
      dataKey={chartView}
      nameKey="category"
      cx="50%"
      cy="50%"
      outerRadius={150}
      label={({ category, percentage }) => 
        `${category}: ${percentage}%`
      }
      labelLine
    >
      {categoryData.map((entry, index) => (
        
      ))}
    
    } />
    <Legend 
      verticalAlign="bottom" 
      height={36}
      formatter={(value, entry) => {
        const item = categoryData.find(d => d.category === value);
        return `${value} (${item?.percentage}%)`;
      }}
    />
  


{/* Toggle below chart */}

  <ToggleGroup 
    type="single" 
    value={chartView}
    onValueChange={(value) => {
      if (value) setChartView(value);
    }}
  >
    Sales
    Profit
  

```

**Custom Tooltip:**
```jsx
const ShopCategoryTooltip = ({ active, payload, view }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      
        {data.category}
        
          Sales: £{data.sales.toLocaleString()}
        
        
          Profit: £{data.profit.toLocaleString()}
        
        
          Margin: {data.margin.toFixed(1)}%
        
        
          {view === 'sales' ? 'Sales' : 'Profit'} Share: {data.percentage}%
        
      
    );
  }
  return null;
};
```

**Description Text:**
```
This section represents Sales & Profit in the Top 5 product 
categories (for ex: Tobacco, Vape, Alcohol, Food, Coffee, and 
Soft Drinks)—based on performance. The data is visualized using 
a pie chart, where each slice indicates the proportionate 
contribution of each category.

All remaining categories are clubbed under an "Others" segment 
to maintain clarity and focus on key contributors.

A toggle option must be provided to switch between viewing Sales 
and Profit. Based on the selected toggle, the pie chart should 
dynamically update to reflect the corresponding values.
```

---

## PAGE 3: VALETING & ROI

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Valeting                                               │
├──────────────────────────┬──────────────────────────────┤
│ Valet sales              │ Valeting Profit              │
│ £XXX,XXX                │ £XXX,XXX                    │
├──────────────────────────┴──────────────────────────────┤
│  Also need to include Valet Margin line chart in this?  │
│                                            [Filter]      │
│  ┌────────────────────────────────────────────────┐    │
│  │  [Bar Chart with Valet Margin Line]            │    │
│  │  Bars: Monthly valet sales                     │    │
│  │  Line: Valet margin %                          │    │
│  └────────────────────────────────────────────────┘    │
├──────────────────────────┬──────────────────────────────┤
│  Valeting Categories     │  Description:                │
│  [Filter]                │  Valeting categories:        │
│  ┌─────────────────┐     │  Rollover, Jet Wash,         │
│  │  [Pie Chart]    │     │  Vacuum, and Airline.        │
│  │  ■ Rollover     │     │  Toggle: Sales/Profit        │
│  │  ■ Jet Wash     │     │                              │
│  │  ■ Vacuum       │     │                              │
│  │  ■ Airline      │     │                              │
│  └─────────────────┘     │                              │
│  [Toggle: Sales|Profit]  │                              │
└──────────────────────────┴──────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Return On Investment                                   │
├──────────────────────────┬──────────────────────────────┤
│  Cash                    │                              │
│  ┌─────────────────┐     │  Top Performing Sites        │
│  │ [Line Chart]    │     │  [Filter]                    │
│  │ Site ROI Trend  │     │  ┌────────────────────┐      │
│  │ Over Time       │     │  │ SITE  NET   PCT    │      │
│  │                 │     │  │ NAME  SALES SALES  PROFIT │
│  │                 │     │  ├────────────────────┤      │
│  │                 │     │  │ Site1 £XXK  £XXK   XX%│   │
│  │                 │     │  │ Site2 £XXK  £XXK   XX%│   │
│  └─────────────────┘     │  │ Site3 £XXK  £XXK   XX%│   │
│                          │  └────────────────────┘      │
└──────────────────────────┴──────────────────────────────┘
```

---

### SECTION 3.1: Valeting Section

---

#### **Metric 1: Valet Sales**

**Component Name:** `ValetSalesMetric`

**Display:**
```
Valet sales
─────────────
£XXX,XXX
```

**Formula:**
```
Valet Sales = SUM(sales_amount)
              WHERE category = 'valet_sales'
              AND transaction_date BETWEEN startDate AND endDate

By Category:
  Rollover Sales = SUM(sales_amount) 
                   WHERE service_type = 'rollover'
  
  Jet Wash Sales = SUM(sales_amount) 
                   WHERE service_type = 'jet_wash'
  
  Vacuum Sales = SUM(sales_amount) 
                 WHERE service_type = 'vacuum'
  
  Airline Sales = SUM(sales_amount) 
                  WHERE service_type = 'airline'
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/valet-sales`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "totalSales": 100000.00,
    "breakdown": {
      "rollover": 45000.00,
      "jetWash": 30000.00,
      "vacuum": 15000.00,
      "airline": 10000.00
    },
    "transactionCount": 2500,
    "avgTransactionValue": 40.00
  }
}
```

**UI Specifications:**
- **Size:** 1/2 width card
- **Icon:** Car/Wash icon
- **Trend:** Show % change vs previous period
- **Clickable:** Yes - Opens category breakdown

---

#### **Metric 2: Valeting Profit**

**Component Name:** `ValetingProfitMetric`

**Display:**
```
Valeting Profit
─────────────
£XXX,XXX
```

**Formula:**
```
Valeting Profit = Valet Sales - Valet Operating Costs

Where:
  Valet Sales = Total valet service revenue
  
  Valet Operating Costs = Labour + Water + Electricity + 
                         Chemicals + Equipment Maintenance + 
                         Other Direct Costs

By Category:
  Category Profit = Category Sales - Allocated Operating Costs

Operating Cost Allocation:
  - Fixed Costs: Divided equally among all categories
  - Variable Costs: Allocated based on usage/volume
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/valeting-profit`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "totalProfit": 13000.00,
    "totalSales": 100000.00,
    "totalCosts": 87000.00,
    "profitMargin": 13.0,
    "costBreakdown": {
      "labour": 50000.00,
      "water": 15000.00,
      "electricity": 12000.00,
      "chemicals": 5000.00,
      "maintenance": 3000.00,
      "other": 2000.00
    },
    "profitByCategory": {
      "rollover": 5850.00,
      "jetWash": 3900.00,
      "vacuum": 1950.00,
      "airline": 1300.00
    }
  }
}
```

**UI Specifications:**
- **Size:** 1/2 width card
- **Color:** Green if positive
- **Margin Display:** Show profit margin % below
- **Clickable:** Yes - Opens cost breakdown modal

---

#### **Chart 1: Valet Performance Bar Chart with Margin**

**Component Name:** `ValetPerformanceBarChart`

**Display:**
```
Also need to include Valet Margin line chart in this?
                                                [Filter]
┌───────────────────────────────────────────────────────┐
│   £12k ┐                                              │
│        │                                              │
│   £10k ┤      ■        ■                 ■           │
│        │      ■        ■                 ■           │
│    £8k ┤      ■        ■        ■        ■           │
│        │      ■        ■        ■        ■           │
│    £6k ┤  ■   ■    ■   ■    ■   ■    ■   ■      ■    │
│        │  ■   ■    ■   ■    ■   ■    ■   ■      ■    │
│    £4k ┤  ■   ■    ■   ■    ■   ■    ■   ■      ■    │
│        └──────────────────────────────────────────    │
│         Jan  Feb  Mar  Apr  May  Jun                 │
│                                                       │
│   15% ┐  ─────╱╲─────╱╲─────╱╲───── Valet Margin   │
│       │                                               │
│   10% ┤                                               │
│       └──────────────────────────────────────────    │
└───────────────────────────────────────────────────────┘

Legend:
■ Valet Sales (Purple bars)
─ Valet Margin % (Teal line)
```

**Chart Type:** Combination Chart (Bar + Line)

**Data Structure:**
```javascript
[
  {
    month: "Jan",
    sales: 8500,
    profit: 1105,
    margin: 13.0,        // (profit / sales) × 100
    operatingCosts: 7395,
    transactions: 213
  },
  {
    month: "Feb",
    sales: 9200,
    profit: 1196,
    margin: 13.0
  },
  // ... more months
]
```

**Formulas:**
```
For each month:

Monthly Valet Sales = SUM(sales_amount)
                      WHERE category = 'valet_sales'
                      AND MONTH(transaction_date) = {month}

Monthly Valet Profit = Monthly Sales - Monthly Operating Costs

Monthly Valet Margin = (Monthly Profit / Monthly Sales) × 100

Example for January:
  Sales = £8,500
  Operating Costs = £7,395
  
  Profit = 8,500 - 7,395 = £1,105
  Margin = (1,105 / 8,500) × 100 = 13.0%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/valet-monthly-performance`
- **Parameters:** `startDate`, `endDate`

**UI Specifications:**
- **Chart Size:** Full width, 400px height
- **Bar Color:** Purple (#8B5CF6)
- **Line Color:** Teal (#14B8A6)
- **Dual Y-axes:**
  - Left: Sales (£)
  - Right: Margin (%)
- **Similar to Shop chart implementation**

**Recharts Implementation:**
```jsx

  
    
    
    
    
    
    
    
    
  

```

---

#### **Chart 2: Valeting Categories Pie Chart**

**Component Name:** `ValetingCategoriesPieChart`

**Display:**
```
                                    [Filter]

Valeting Categories:
┌─────────────────────┐   This section covers the valeting categories
│         10%         │   Rollover, Jet Wash, Vacuum, and Airline. The
│      ╱───────╲      │   data for each category is visualized using a
│    ╱           ╲    │   pie chart, where each slice indicates its
│   │    45%      │   │   proportionate contribution to Profit for
│   │             │   │   each category.
│   │      30%    │   │   
│    ╲           ╱    │   A toggle option must be provided to switch
│      ╲───────╱      │   between viewing Sales and Profit. Based on
│         15%         │   the selected toggle, the pie chart should
└─────────────────────┘   dynamically update to reflect the
                          corresponding values.
[Toggle: Sales | Profit]

Legend:
■ Rollover (45%)
■ Jet Wash (30%)
■ Vacuum (15%)
■ Airline (10%)
```

**Chart Type:** Pie Chart with Toggle

**Data Structure:**
```javascript
// When showing SALES
[
  {
    category: "Rollover",
    sales: 45000,
    profit: 5850,
    percentage: 45.0,
    color: "#8B5CF6",
    margin: 13.0
  },
  {
    category: "Jet Wash",
    sales: 30000,
    profit: 3900,
    percentage: 30.0,
    color: "#14B8A6"
  },
  {
    category: "Vacuum",
    sales: 15000,
    profit: 1950,
    percentage: 15.0,
    color: "#F59E0B"
  },
  {
    category: "Airline",
    sales: 10000,
    profit: 1300,
    percentage: 10.0,
    color: "#3B82F6"
  }
]

// When showing PROFIT (percentages recalculated)
[
  {
    category: "Rollover",
    profit: 5850,
    percentage: 45.0,
    // (5850 / 13000) × 100 = 45.0%
  },
  // ... same categories with profit percentages
]
```

**Formulas:**
```
For Sales View:
  Category Sales = SUM(sales_amount)
                   WHERE service_type = {category}
                   AND transaction_date BETWEEN startDate AND endDate
  
  Percentage = (Category Sales / Total Valet Sales) × 100

For Profit View:
  Category Profit = Category Sales - Allocated Operating Costs
  
  Percentage = (Category Profit / Total Valet Profit) × 100

Valeting Categories (Fixed 4):
  1. Rollover - Automated car wash with brushes
  2. Jet Wash - High-pressure water cleaning
  3. Vacuum - Interior vacuuming service
  4. Airline - Tire inflation service

Example Calculation:
  Total Valet Sales = £100,000
  
  Rollover Sales = £45,000
  Rollover % = (45,000 / 100,000) × 100 = 45.0%
  
  Total Valet Profit = £13,000
  Rollover Profit = £5,850
  Rollover Profit % = (5,850 / 13,000) × 100 = 45.0%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/valet-categories-breakdown`
- **Parameters:** `startDate`, `endDate`, `view` (sales|profit)
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "view": "sales",
    "categories": [
      {
        "category": "Rollover",
        "sales": 45000.00,
        "profit": 5850.00,
        "margin": 13.0,
        "percentage": 45.0,
        "transactions": 900,
        "avgTicket": 50.00,
        "color": "#8B5CF6"
      }
    ],
    "totals": {
      "sales": 100000.00,
      "profit": 13000.00,
      "margin": 13.0,
      "transactions": 2500
    }
  }
}
```

**UI Specifications:**
- **Chart Size:** 400px × 400px
- **Chart Type:** Pie chart
- **Colors:**
  - Rollover: Purple (#8B5CF6)
  - Jet Wash: Teal (#14B8A6)
  - Vacuum: Orange (#F59E0B)
  - Airline: Blue (#3B82F6)
- **Toggle:** Same as Shop categories
- **Interaction:** Same hover/click behavior
- **Filter:** Category selection

**Recharts Implementation:**
```jsx
const [chartView, setChartView] = useState('sales');


  
    <Pie
      data={categoryData}
      dataKey={chartView}
      nameKey="category"
      cx="50%"
      cy="50%"
      outerRadius={150}
      label={({ category, percentage }) => 
        `${category}: ${percentage}%`
      }
    >
      {categoryData.map((entry, index) => (
        
      ))}
    
    } />
    
  



  
    Sales
    Profit
  

```

---

### SECTION 3.2: Return On Investment (ROI)

---

#### **Chart 1: Cash / Site ROI Trend Over Time**

**Component Name:** `ROICashTrendChart`

**Display:**
```
Cash
┌───────────────────────────────────────────────────────┐
│   £5.0M ┐                                   ╱─────    │
│         │                            ╱─────╯          │
│   £4.5M ┤                     ╱─────╯                 │
│         │              ╱─────╯                        │
│   £4.0M ┤       ╱─────╯                               │
│         │ ╱─────╯                                     │
│   £3.5M ┤╯                                            │
│         │                                             │
│   £3.0M ┤                                             │
│         └──────────────────────────────────           │
│          Jan  Feb  Mar  Apr  May  Jun                │
│                                                       │
│         Site ROI Trend Over Time                     │
└───────────────────────────────────────────────────────┘
```

**Chart Type:** Line Chart (Cash Flow / Cumulative ROI)

**Data Structure:**
```javascript
[
  {
    month: "Jan",
    date: "2026-01-31",
    cashBalance: 3500000,
    revenue: 1250000,
    profit: 156780,
    roi: 4.48,              // (profit / investment) × 100
    cumulativeProfit: 156780
  },
  {
    month: "Feb",
    date: "2026-02-28",
    cashBalance: 3656780,
    revenue: 1280000,
    profit: 160250,
    roi: 9.17,              // Cumulative
    cumulativeProfit: 317030
  },
  // ... more months
]
```

**Formulas:**
```
For each month:

Monthly Cash Balance = Opening Balance + Revenue - Expenses

Where:
  Opening Balance = Previous month's closing balance
  Revenue = Total sales (Fuel + Shop + Valet)
  Expenses = Purchases + Operating Costs + Overheads

Monthly ROI = (Monthly Profit / Total Investment) × 100

Cumulative ROI = (Cumulative Profit / Total Investment) × 100

Where:
  Total Investment = Initial capital + Ongoing investments
  Cumulative Profit = SUM(Monthly Profits from start date)

Example:
  Initial Investment = £3,500,000
  January Profit = £156,780
  
  January ROI = (156,780 / 3,500,000) × 100 = 4.48%
  
  February Profit = £160,250
  Cumulative Profit = 156,780 + 160,250 = £317,030
  Cumulative ROI = (317,030 / 3,500,000) × 100 = 9.06%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/roi-cash-trend`
- **Parameters:** `startDate`, `endDate`
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "monthlyTrend": [
      {
        "month": "2026-01",
        "monthName": "Jan",
        "cashBalance": 3500000.00,
        "revenue": 1250000.00,
        "profit": 156780.00,
        "expenses": 1093220.00,
        "roi": 4.48,
        "cumulativeProfit": 156780.00,
        "cumulativeROI": 4.48
      }
    ],
    "totals": {
      "initialInvestment": 3500000.00,
      "currentCashBalance": 3970000.00,
      "totalRevenue": 15000000.00,
      "totalProfit": 1880000.00,
      "overallROI": 53.71
    }
  }
}
```

**UI Specifications:**
- **Chart Size:** 2/3 width on desktop, full on mobile, 350px height
- **Line Color:** Green (#10B981) for positive growth
- **Grid:** Horizontal dashed lines
- **Y-axis:** Cash balance (£)
- **X-axis:** Months
- **Tooltip:** Shows all financial metrics
- **Trend Line:** Smooth curve (monotone)

**Recharts Implementation:**
```jsx

  
    
    
    <YAxis 
      label={{ value: 'Cash Balance', angle: -90, position: 'insideLeft' }}
      tickFormatter={(value) => `£${(value / 1000000).toFixed(1)}M`}
    />
    } />
    
  

```

**Custom Tooltip:**
```jsx
const ROICashTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      
        {label}
        
          Cash: £{(data.cashBalance / 1000000).toFixed(2)}M
        
        
          Revenue: £{(data.revenue / 1000000).toFixed(2)}M
        
        
          Profit: £{data.profit.toLocaleString()}
        
        
          ROI: {data.cumulativeROI.toFixed(2)}%
        
      
    );
  }
  return null;
};
```

**Business Context:**
- Shows cash flow health over time
- Cumulative ROI indicates overall investment performance
- Upward trend = healthy business growth
- Target ROI: 40-60% annually for petrol stations

---

#### **Table: Top Performing Sites**

**Component Name:** `TopPerformingSitesTable`

**Display:**
```
Top Performing Sites                              [Filter]
┌────────────────────────────────────────────────────────┐
│ SITE   SITE     NET        PCT     MARGIN  │  Best     │
│ CODE   NAME     SALES      SALES   %       │  Performer│
├────────────────────────────────────────────────────────┤
│  1  Kensington  £2.5M     £315K     83%    │  ─────── │
│  2  Ambedkar    £2.3M     £253K     67%    │  ───────  │
│  3  Kings Ave   £2.7M     £270K     63%    │  ──────   │
│  4  Magna       £1.9M     £228K     57%    │  ─────    │
│  5  Gaines      £2.2M     £209K     50%    │  ────     │
│  6  Epping      £2.1M     £189K     43%    │  ───      │
│  7  Brierley    £1.8M     £162K     37%    │  ──       │
└────────────────────────────────────────────────────────┘
```

**Table Structure:**

**Columns:**
1. **Site Code** - Unique site identifier (numeric or alphanumeric)
2. **Site Name** - Location/branch name
3. **Net Sales** - Total revenue from all sources
4. **Profit (PCT SALES)** - Total profit amount
5. **Margin %** - Profit margin percentage
6. **Best Performer** - Visual bar indicator (optional)

**Data Structure:**
```javascript
[
  {
    rank: 1,
    siteCode: "001",
    siteName: "Kensington",
    netSales: 2500000,
    profit: 315000,
    margin: 12.6,        // (profit / netSales) × 100
    fuelSales: 1800000,
    shopSales: 600000,
    valetSales: 100000,
    percentageOfTotal: 15.5
  },
  {
    rank: 2,
    siteCode: "002",
    siteName: "Ambedkar",
    netSales: 2300000,
    profit: 253000,
    margin: 11.0
  },
  // ... more sites
]
```

**Formulas:**
```
For each site:

Net Sales = Fuel Sales + Shop Sales + Valet Sales
          = SUM(sales_amount)
            WHERE site_code = {site}
            AND transaction_date BETWEEN startDate AND endDate

Profit = Total Sales - Total Purchases - Operating Costs
       = SUM(sales_amount) - SUM(purchase_amount) - SUM(operating_costs)
         WHERE site_code = {site}

Margin % = (Profit / Net Sales) × 100

Ranking Logic:
  RANK sites by Profit DESC (highest profit first)
  
  Display Top 10 or Top N sites

Percentage of Total:
  Site % = (Site Profit / Total Company Profit) × 100

Example:
  Kensington Site:
    Fuel Sales = £1,800,000
    Shop Sales = £600,000
    Valet Sales = £100,000
    Net Sales = £2,500,000
    
    Total Costs = £2,185,000
    Profit = 2,500,000 - 2,185,000 = £315,000
    Margin = (315,000 / 2,500,000) × 100 = 12.6%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/top-performing-sites`
- **Parameters:** `startDate`, `endDate`, `limit` (default: 10)
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "rank": 1,
        "siteCode": "001",
        "siteName": "Kensington",
        "netSales": 2500000.00,
        "profit": 315000.00,
        "margin": 12.6,
        "breakdown": {
          "fuelSales": 1800000.00,
          "shopSales": 600000.00,
          "valetSales": 100000.00
        },
        "percentageOfTotal": 15.5
      }
    ],
    "totals": {
      "totalSites": 15,
      "totalSales": 16125000.00,
      "totalProfit": 2030000.00,
      "avgMargin": 12.6
    }
  }
}
```

**UI Specifications:**
- **Table Size:** 1/3 width on desktop, full on mobile
- **Rows:** Show top 10 sites (scrollable if more)
- **Sorting:** 
  - Default: By profit (descending)
  - Clickable headers for custom sorting
- **Row Hover:** Highlight row on hover
- **Click Row:** Opens detailed site performance page
- **Filter Button:** Opens filter modal for:
  - Number of sites to display (5/10/20/All)
  - Sort by: Profit/Sales/Margin
  - Site type filter (



    # Business Performance Dashboard - RND Documentation (Part 2)

## Continuation from Part 1

---

## PAGE 4: SITE PERFORMANCE & OVERHEADS (Continued)

### SECTION 4.1: Sites Needing Improvement Table

---

#### **Table: Sites Needing Improvement**

**Component Name:** `SitesNeedingImprovementTable`

**Display:**
```
Sites Needing Improvement
┌────────────────────────────────────────────────────────┐
│ SITE   SITE     NET      PROFIT  MARGIN   VARIANCE    │
│ CODE   NAME     SALES            %        vs Target   │
├────────────────────────────────────────────────────────┤
│ 10   Site 6    £701.6K  £99.4K   7.7%    -£150K      │
│  9   Site 7    £293.2K  £52.3K   10.3%   -£140K      │
│  8   Site 8    £1.10M   £96.4K   3.5%    -£120K      │
│  7   Site 9    £230.2K  £20.0K   8.7%    -£110K      │
│  6   Site 10   £186.4K  £704.3K  13.1%   -£100K      │
└────────────────────────────────────────────────────────┘

Note: The charts display site rankings based on margin,
highlighting top-performing sites and those needing
improvement.

The above chart is for depiction purposes only and does
not represent actual values or the true ranking order.
The logic described must be followed to derive the final
output results.
```

**Table Structure:**

**Columns:**
1. **Rank** - Position (worst performers ranked higher)
2. **Site Code** - Site identifier
3. **Site Name** - Location name
4. **Net Sales** - Total revenue
5. **Profit** - Total profit
6. **Margin %** - Profit margin
7. **Variance vs Target** - Gap from expected performance

**Data Structure:**
```javascript
[
  {
    rank: 1,              // Worst performer = rank 1
    siteCode: "010",
    siteName: "Site 6",
    netSales: 701600,
    profit: 99400,
    margin: 14.17,        // Actual margin
    targetProfit: 249400, // Expected profit based on avg/target
    variance: -150000,    // Negative = underperforming
    variancePercent: -60.0,
    issue: "Low margin"
  },
  // ... more sites ranked by worst performance
]
```

**Formulas:**
```
For each site:

Net Sales = SUM(sales_amount)
            WHERE site_code = {site}
            AND transaction_date BETWEEN startDate AND endDate

Profit = Sales - Purchases - Operating Costs

Margin % = (Profit / Net Sales) × 100

Target Profit Calculation Methods:

Method 1 - Average-Based Target:
  Target Profit = (Company Avg Margin % × Site Net Sales)
  
  Company Avg Margin = Total Company Profit / Total Company Sales × 100
  
  Example:
    Company Avg Margin = 12.6%
    Site Net Sales = £701,600
    Target Profit = (12.6 / 100) × 701,600 = £88,402
    Actual Profit = £99,400
    Variance = 99,400 - 88,402 = +£10,998 (GOOD)

Method 2 - Benchmark-Based Target:
  Target Profit = Predefined target per site or site category
  
  Example:
    Large Site Target Margin = 15%
    Site Net Sales = £701,600
    Target Profit = (15 / 100) × 701,600 = £105,240
    Actual Profit = £99,400
    Variance = 99,400 - 105,240 = -£5,840 (NEEDS IMPROVEMENT)

Method 3 - Historical-Based Target:
  Target = Average of previous 6 months performance
  
  If current performance < historical average = needs improvement

Variance = Actual Profit - Target Profit

Variance % = (Variance / Target Profit) × 100

Ranking Logic:
  RANK sites by Variance ASC (most negative/worst first)
  
  Sites with negative variance = underperforming
  Sites with positive variance = overperforming
  
  Display Bottom 10 sites (worst performers)

Issue Identification:
  - Low margin: Margin < 10%
  - High costs: Operating costs > industry average
  - Low volume: Sales significantly below average
  - Mixed: Multiple issues

Example Calculations:

Site 6:
  Net Sales = £701,600
  Profit = £99,400
  Actual Margin = 14.17%
  
  Company Avg Margin = 12.6%
  Target Profit = 701,600 × 0.126 = £88,402
  Variance = 99,400 - 88,402 = +£10,998
  
  This site is actually GOOD (variance positive)
  
Site 8:
  Net Sales = £1,100,000
  Profit = £96,400
  Actual Margin = 8.76%
  
  Company Avg Margin = 12.6%
  Target Profit = 1,100,000 × 0.126 = £138,600
  Variance = 96,400 - 138,600 = -£42,200
  
  This site NEEDS IMPROVEMENT (low margin + negative variance)
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/sites-needing-improvement`
- **Parameters:** `startDate`, `endDate`, `limit` (default: 10)
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "sites": [
      {
        "rank": 1,
        "siteCode": "008",
        "siteName": "Site 8",
        "netSales": 1100000.00,
        "profit": 96400.00,
        "margin": 8.76,
        "targetMargin": 12.6,
        "targetProfit": 138600.00,
        "variance": -42200.00,
        "variancePercent": -30.5,
        "issues": ["Low margin", "High costs"],
        "recommendations": [
          "Review pricing strategy",
          "Reduce operating costs",
          "Increase high-margin product sales"
        ]
      }
    ],
    "companyAverage": {
      "avgMargin": 12.6,
      "avgSales": 1075000.00,
      "avgProfit": 135450.00
    },
    "totals": {
      "sitesAnalyzed": 15,
      "sitesUnderperforming": 6,
      "totalLostProfit": 385000.00
    }
  }
}
```

**UI Specifications:**
- **Table Size:** Full width
- **Rows:** Show bottom 10 sites (worst performers)
- **Color Coding:**
  - Variance column:
    - Red background: Variance < -£50K (critical)
    - Orange background: Variance -£50K to -£20K (warning)
    - Yellow background: Variance -£20K to £0 (caution)
  - Margin column:
    - Red text: < 8%
    - Yellow text: 8-10%
    - Normal: > 10%
- **Sorting:** By variance (ascending = worst first)
- **Row Click:** Opens site improvement action plan
- **Filter Button:** Opens filter for:
  - Number of sites (5/10/All)
  - Issue type (Low margin/High costs/Low volume)
  - Site category

**Table Implementation:**
```jsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[80px]">Rank</TableHead>
      <TableHead>Site Code</TableHead>
      <TableHead>Site Name</TableHead>
      <TableHead className="text-right">Net Sales</TableHead>
      <TableHead className="text-right">Profit</TableHead>
      <TableHead className="text-right">Margin %</TableHead>
      <TableHead className="text-right">Variance</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {sites.map((site) => (
      <TableRow 
        key={site.siteCode}
        className="cursor-pointer hover:bg-gray-50"
        onClick={() => openSiteDetails(site)}
      >
        <TableCell className="font-medium">{site.rank}</TableCell>
        <TableCell>{site.siteCode}</TableCell>
        <TableCell>{site.siteName}</TableCell>
        <TableCell className="text-right">
          £{(site.netSales / 1000).toFixed(1)}K
        </TableCell>
        <TableCell className="text-right">
          £{(site.profit / 1000).toFixed(1)}K
        </TableCell>
        <TableCell 
          className={`text-right ${
            site.margin < 8 ? 'text-red-600 font-semibold' :
            site.margin < 10 ? 'text-yellow-600' :
            'text-gray-900'
          }`}
        >
          {site.margin.toFixed(1)}%
        </TableCell>
        <TableCell 
          className={`text-right font-semibold ${
            site.variance < -50000 ? 'bg-red-100 text-red-700' :
            site.variance < -20000 ? 'bg-orange-100 text-orange-700' :
            site.variance < 0 ? 'bg-yellow-100 text-yellow-700' :
            'text-gray-900'
          }`}
        >
          {site.variance < 0 ? '-' : '+'}
          £{(Math.abs(site.variance) / 1000).toFixed(0)}K
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Note Text Below Table:**
```
Note: The charts display site rankings based on margin, highlighting
top-performing sites and those needing improvement.

The above chart is for depiction purposes only and does not represent
actual values or the true ranking order. The logic described must be
followed to derive the final output results.
```

**Business Actions:**
For sites in this table, the dashboard should suggest:
1. **Root Cause Analysis:** Why is margin low?
2. **Cost Review:** Identify high-cost areas
3. **Pricing Strategy:** Adjust pricing if needed
4. **Operational Efficiency:** Reduce waste, improve processes
5. **Staff Training:** Improve sales techniques
6. **Marketing:** Increase customer footfall

---

### SECTION 4.2: Overhead Breakdown

---

#### **Chart 1: Overhead Cost Breakdown (Horizontal Bar Chart)**

**Component Name:** `OverheadCostBreakdownChart`

**Display:**
```
Overhead Cost Breakdown                           [Filter]
┌───────────────────────────────────────────────────────┐
│                                                       │
│  Wages (£2,069)      ████████████████████████ £8,069 │
│                                                       │
│  Item 1 (£500)       ████████████ £7,565             │
│                                                       │
│  Card Charges        ██████████ £4,343               │
│                                                       │
│  Electricity / Auto  █████████ £4,243                │
│                                                       │
│  Repair & Maintenance ██████ £3,934                  │
│                                                       │
│  Rates               ████ £1,964                     │
│                                                       │
│  0     2,000  4,000  6,000  8,000  10,000           │
│                  Cost (£)                             │
│                                                       │
│        Friday, January 06, 2026                      │
└───────────────────────────────────────────────────────┘
```

**Chart Type:** Horizontal Bar Chart

**Data Structure:**
```javascript
[
  {
    category: "Wages",
    nominalCode: "8100-8130",
    amount: 8069,
    percentage: 35.2,
    color: "#3B82F6",
    subcategories: [
      { name: "Salaries", amount: 6000 },
      { name: "NI Contributions", amount: 1200 },
      { name: "Pension", amount: 869 }
    ]
  },
  {
    category: "Item 1 (Unclear - needs clarification)",
    nominalCode: "7xxx",
    amount: 7565,
    percentage: 33.0
  },
  {
    category: "Card Charges",
    nominalCode: "7200",
    amount: 4343,
    percentage: 18.9
  },
  {
    category: "Electricity / Auto",
    nominalCode: "7300-7310",
    amount: 4243,
    percentage: 18.5
  },
  {
    category: "Repair & Maintenance",
    nominalCode: "7400",
    amount: 3934,
    percentage: 17.1
  },
  {
    category: "Rates",
    nominalCode: "7500",
    amount: 1964,
    percentage: 8.6
  }
  // Total: £30,118 (for selected date/period)
]
```

**Formulas:**
```
For each overhead category:

Category Amount = SUM(transaction_amount)
                  WHERE nominal_code IN {category_codes}
                  AND transaction_date = endDate (or BETWEEN startDate AND endDate)

Percentage of Total = (Category Amount / Total Overheads) × 100

Total Overheads = SUM(all overhead categories)

Overhead Categories & Nominal Codes:
  1. Wages (8100-8130)
     - 8100: Salaries
     - 8110: National Insurance
     - 8120: Pension Contributions
     - 8130: Other Labour Costs
  
  2. Card Charges (7200)
     - Credit/Debit card processing fees
  
  3. Electricity / Auto (7300-7310)
     - 7300: Electricity
     - 7310: Gas/Heating
  
  4. Repair & Maintenance (7400)
     - Equipment repairs
     - Building maintenance
     - Vehicle servicing
  
  5. Rates (7500)
     - Business rates
     - Property taxes
  
  6. Insurance (7600)
  
  7. Professional Fees (7700)
     - Accounting
     - Legal
     - Consultancy
  
  8. Rent (7800)
  
  9. Bank Charges (7210)
  
  10. Telephone / Internet (7320)
  
  11. Waste Disposal (7330)
  
  12. Others (7900-7999)

Ranking:
  ORDER BY amount DESC (highest cost first)
  Display top 6-10 categories
  Group small categories as "Others"

Example Calculation:
  Wages = £8,069
  Total Overheads = £22,918
  Percentage = (8,069 / 22,918) × 100 = 35.2%
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/overhead-breakdown`
- **Parameters:** `endDate` (for snapshot) OR `startDate`, `endDate` (for period)
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "date": "2026-01-06",
    "categories": [
      {
        "category": "Wages",
        "nominalCodes": ["8100", "8110", "8120", "8130"],
        "amount": 8069.00,
        "percentage": 35.2,
        "subcategories": [
          {
            "code": "8100",
            "name": "Salaries",
            "amount": 6000.00
          },
          {
            "code": "8110",
            "name": "NI Contributions",
            "amount": 1200.00
          },
          {
            "code": "8120",
            "name": "Pension",
            "amount": 869.00
          }
        ]
      }
    ],
    "totals": {
      "totalOverheads": 22918.00,
      "categoriesCount": 6,
      "topCategoryPercentage": 35.2
    }
  }
}
```

**UI Specifications:**
- **Chart Size:** 1/2 width on desktop, full on mobile, 400px height
- **Bar Colors:** Gradient from dark blue to light blue (by amount)
  - Highest: #1E40AF
  - Lowest: #93C5FD
- **Bar Labels:**
  - Left: Category name + (£amount in parentheses)
  - Right: £amount value
- **Y-axis:** Category names
- **X-axis:** Amount in £
- **Date Display:** Below chart (snapshot date or date range)
- **Tooltip:** Shows percentage + subcategory breakdown
- **Click Bar:** Opens detailed breakdown modal

**Recharts Implementation:**
```jsx
<ResponsiveContainer width="100%" height={400}>
  <BarChart 
    data={overheadData} 
    layout="vertical"
    margin={{ left: 150, right: 50 }}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis 
      type="number"
      label={{ value: 'Cost (£)', position: 'insideBottom', offset: -5 }}
      tickFormatter={(value) => `£${(value / 1000).toFixed(1)}K`}
    />
    <YAxis 
      type="category" 
      dataKey="category"
      width={140}
      tick={{ fontSize: 12 }}
    />
    <Tooltip content={<OverheadTooltip />} />
    <Bar 
      dataKey="amount" 
      fill="#3B82F6"
      radius={[0, 4, 4, 0]}
      label={{ 
        position: 'right', 
        formatter: (value) => `£${value.toLocaleString()}` 
      }}
    >
      {overheadData.map((entry, index) => (
        <Cell 
          key={`cell-${index}`} 
          fill={getColorGradient(index, overheadData.length)} 
        />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>

<p className="text-center text-sm text-gray-500 mt-2">
  {isSnapshot ? 
    `Snapshot: ${formatDate(endDate)}` :
    `Period: ${formatDate(startDate)} - ${formatDate(endDate)}`
  }
</p>
```

**Color Gradient Function:**
```javascript
const getColorGradient = (index, total) => {
  const colors = [
    '#1E40AF', // Darkest blue
    '#2563EB',
    '#3B82F6',
    '#60A5FA',
    '#93C5FD', // Lightest blue
  ];
  
  const colorIndex = Math.floor((index / total) * (colors.length - 1));
  return colors[colorIndex];
};
```

**Custom Tooltip:**
```jsx
const OverheadTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <div className="bg-white p-4 border rounded shadow-lg max-w-xs">
        <p className="font-semibold text-lg">{data.category}</p>
        <p className="text-blue-600 text-2xl font-bold">
          £{data.amount.toLocaleString()}
        </p>
        <p className="text-gray-600">
          {data.percentage.toFixed(1)}% of total overheads
        </p>
        
        {data.subcategories && data.subcategories.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm font-semibold mb-2">Breakdown:</p>
            {data.subcategories.map((sub, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600">{sub.name}:</span>
                <span className="font-medium">£{sub.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          Codes: {data.nominalCodes.join(', ')}
        </p>
      </div>
    );
  }
  return null;
};
```

**Filter Options:**
- **Date Selection:** Single date or date range
- **Category Filter:** Select specific overhead categories
- **Threshold:** Show only categories above £X amount
- **Sort:** By amount or alphabetically

---

#### **Chart 2: 12-Month Overhead Cost Trends**

**Component Name:** `OverheadCostTrendsChart`

**Display:**
```
12-Month Overhead Cost Trends                     [Filter]
┌───────────────────────────────────────────────────────┐
│  £9000 ┐                                              │
│        │                                              │
│  £8000 ┤    ╱─╲                    ─ Overhead Category│
│        │   ╱   ╲  ╱─╲  ╱─╲        ─ Wages            │
│  £7000 ┤  ╱     ╲╱   ╲╱   ╲╱╲    ─ Item 1           │
│        │ ╱                    ╲   ─ Card Charges     │
│  £6000 ┤╱                      ╲╱ ─ Electricity      │
│        │                          ─ Rent              │
│  £5000 ┤  ──────────────────────  ─ Banks            │
│        │                                              │
│  £4000 ┤  ────────────────────                       │
│        │                                              │
│  £3000 ┤  ──────────────────────                     │
│        │                                              │
│  £2000 ┤  ──────────────────────                     │
│        │                                              │
│  £1000 ┤  ──────────────────────                     │
│        └──────────────────────────────────           │
│         Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec│
│                       Month                           │
└───────────────────────────────────────────────────────┘
```

**Chart Type:** Multi-line Chart (6 lines for top 6 categories)

**Data Structure:**
```javascript
[
  {
    month: "Jan",
    date: "2026-01",
    wages: 8069,
    item1: 7565,
    cardCharges: 4343,
    electricity: 4243,
    repair: 3934,
    rates: 1964,
    totalOverheads: 30118
  },
  {
    month: "Feb",
    date: "2026-02",
    wages: 8250,
    item1: 7200,
    cardCharges: 4500,
    electricity: 3800,
    repair: 4100,
    rates: 1964,
    totalOverheads: 29814
  },
  // ... 12 months of data
]
```

**Formulas:**
```
For each month and each category:

Monthly Category Cost = SUM(transaction_amount)
                        WHERE nominal_code IN {category_codes}
                        AND MONTH(transaction_date) = {month}
                        AND YEAR(transaction_date) = {year}

Monthly Total Overheads = SUM(all categories for that month)

Trend Analysis:
  Month-over-Month Change = ((Current Month - Previous Month) / Previous Month) × 100
  
  Average Monthly Cost = SUM(Monthly Costs) / 12
  
  Variance from Average = Monthly Cost - Average Monthly Cost

Categories to Display:
  - Top 6 categories by total annual cost
  - Each category gets its own line
  - Color-coded for easy distinction

Example:
  January Wages = £8,069
  February Wages = £8,250
  
  MoM Change = ((8,250 - 8,069) / 8,069) × 100 = 2.24% increase
```

**Data Source:**
- **API Endpoint:** `GET /api/dashboard/overhead-cost-trends`
- **Parameters:** `startDate`, `endDate` (typically 12 months)
- **Response Format:**
```json
{
  "success": true,
  "data": {
    "monthlyTrends": [
      {
        "month": "2026-01",
        "monthName": "Jan",
        "categories": {
          "wages": 8069.00,
          "item1": 7565.00,
          "cardCharges": 4343.00,
          "electricity": 4243.00,
          "repair": 3934.00,
          "rates": 1964.00
        },
        "totalOverheads": 30118.00
      }
    ],
    "categoryAverages": {
      "wages": 8150.00,
      "item1": 7300.00,
      "cardCharges": 4400.00,
      "electricity": 4100.00,
      "repair": 3950.00,
      "rates": 1964.00
    },
    "yearlyTotals": {
      "wages": 97800.00,
      "totalOverheads": 360000.00
    }
  }
}
```

**UI Specifications:**
- **Chart Size:** 1/2 width on desktop, full on mobile, 400px height
- **Line Colors:**
  - Wages: Blue (#3B82F6)
  - Item 1: Green (#10B981)
  - Card Charges: Orange (#F59E0B)
  - Electricity: Red (#EF4444)
  - Repair: Purple (#8B5CF6)
  - Rates: Teal (#14B8A6)
- **Line Width:** 2-3px
- **Data Points:** Small circles on each point
- **Legend:** Right side or below chart
- **Grid:** Horizontal dashed lines
- **Y-axis:** Cost (£)
- **X-axis:** Months
- **Tooltip:** Shows all category values for that month
- **Zoom:** Optional - allow zoom/pan for detailed view

**Recharts Implementation:**
```jsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={monthlyTrends}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis 
      dataKey="monthName"
      label={{ value: 'Month', position: 'insideBottom', offset: -5 }}
    />
    <YAxis 
      label={{ value: 'Cost (£)', angle: -90, position: 'insideLeft' }}
      tickFormatter={(value) => `£${(value / 1000).toFixed(1)}K`}
    />
    <Tooltip content={<OverheadTrendsTooltip />} />
    <Legend 
      verticalAlign="top"
      height={36}
      wrapperStyle={{ fontSize: '12px' }}
    />
    
    {/* Line for each category */}
    <Line 
      type="monotone" 
      dataKey="wages" 
      stroke="#3B82F6" 
      strokeWidth={2}
      dot={{ r: 4 }}
      name="Wages"
    />
    <Line 
      type="monotone" 
      dataKey="item1" 
      stroke="#10B981" 
      strokeWidth={2}
      dot={{ r: 4 }}
      name="Item 1"
    />
    <Line 
      type="monotone" 
      dataKey="cardCharges" 
      stroke="#F59E0B" 
      strokeWidth={2}
      dot={{ r: 4 }}
      name="Card Charges"
    />
    <Line 
      type="monotone" 
      dataKey="electricity" 
      stroke="#EF4444" 
      strokeWidth={2}
      dot={{ r: 4 }}
      name="Electricity"
    />
    <Line 
      type="monotone" 
      dataKey="repair" 
      stroke="#8B5CF6" 
      strokeWidth={2}
      dot={{ r: 4 }}
      name="Repair & Maintenance"
    />
    <Line 
      type="monotone" 
      dataKey="rates" 
      stroke="#14B8A6" 
      strokeWidth={2}
      dot={{ r: 4 }}
      name="Rates"
    />
  </LineChart>
</ResponsiveContainer>
```

**Custom Tooltip:**
```jsx
const OverheadTrendsTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, item) => sum + item.value, 0);
    
    return (
      <div className="bg-white p-4 border rounded shadow-lg max-w-sm">
        <p className="font-semibold text-lg mb-2">{label}</p>
        
        {payload
          .sort((a, b) => b.value - a.value)
          .map((item, index) => (
            <div key={index} className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.name}:</span>
              </div>
              <span className="font-medium ml-4">
                £{item.value.toLocaleString()}
              </span>
            </div>
          ))
        }
        
        <div className="border-t mt-2 pt-2 flex justify-between font-semibold">
          <span>Total Overheads:</span>
          <span>£{total.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};
```

**Filter Options:**
- **Date Range:** Select specific 12-month period
- **Categories:** Select which categories to display
- **View Mode:**
  - Actual amounts
  - Percentage of total
  - Variance from average
- **Trend Lines:** Show/hide trend lines
- **Comparison:** Compare with previous year

**Business Insights:**
- **Seasonal Patterns:** Identify recurring cost patterns
- **Spike Detection:** Flag unusual increases
- **Cost Control:** Track effectiveness of cost-cutting measures
- **Budgeting:** Use trends for future budget planning
- **Alerts:** Notify when category exceeds threshold

---

## PAGE 5: FORMULA SHEET

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Formula Sheet:                                         │
│                                                         │
│  1. Avg. Basket Size: Total Shop Sales/ Transactions   │
│                                                         │
│  2. Average PPL: Fuel profit/ fuel volume *100         │
│                                                         │
│  3. PPL after vending out the overheads:               │
│     Over Heads/ Volume *100                            │
│                                                         │
│  4. Customer Count: From EvoBos                        │
│                                                         │
│  5. Labour Cost %:                                      │
│     Labour cost/ Shop or fuel sales                    │
│     (value will be shown in %)                         │
│                                                         │
│  6. ROI Formula:                                        │
│     (Net Profit/ Total Investment or                   │
│      total operating cost) * 100                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Component Name:** `FormulaSheet`

**Purpose:** 
- Reference guide for calculation methodologies
- Transparency in metric calculations
- Help users understand dashboard numbers
- Training resource for new users

**Display Format:**
```
Formula Sheet
═══════════════════════════════════════════════════════

1. Avg. Basket Size
   Formula: Total Shop Sales / Transactions
   
   Example:
   Total Shop Sales = £350,000
   Transactions = 13,500
   Avg. Basket Size = £350,000 / 13,500 = £25.93
   
   Unit: Currency (£)
   Source: Shop transaction data

───────────────────────────────────────────────────────

2. Average PPL (Pence Per Liter)
   Formula: Fuel profit / fuel volume × 100
   
   Example:
   Fuel Profit = £104,000
   Fuel Volume = 1,250,000 L
   Average PPL = (£104,000 / 1,250,000) × 100 = 8.32p
   
   Unit: Pence (p) per liter
   Source: Fuel margin data
   
   Alternative (Weighted):
   Average PPL = SUM(ppl_value × quantity) / SUM(quantity)

───────────────────────────────────────────────────────

3. PPL after vending out the OVERHEADS
   Formula: (Overheads / Volume) × 100
   
   Full Formula:
   Actual PPL = Average PPL - (Overheads PPL)
   
   Where:
   Overheads PPL = (Total Overheads / Fuel Volume) × 100
   
   Example:
   Average PPL = 145.67p
   Total Overheads = £72,200
   Fuel Volume = 1,000,000 L
   
   Overheads PPL = (£72,200 / 1,000,000) × 100 = 7.22p
   Actual PPL = 145.67 - 7.22 = 138.45p
   
   Unit: Pence (p) per liter
   Source: Overhead data + Fuel volume data

───────────────────────────────────────────────────────

4. Customer Count
   Formula: From EvoBos
   
   Source: Point of Sale (POS) system - EvoBos
   
   Count Method:
   - Unique transactions per day/week/month
   - Tracked via POS transaction IDs
   
   Note: This metric is directly imported from the
   EvoBos system and represents actual customer
   transactions recorded at the till.
   
   Unit: Count (number)

───────────────────────────────────────────────────────

5. Labour Cost % (as percentage of shop or fuel sales)
   Formula: Labour cost / (Shop or fuel sales) × 100
   
   Variations:
   
   Labour Cost % of Shop Sales:
   = (Labour Cost / Shop Sales) × 100
   
   Labour Cost % of Fuel Sales:
   = (Labour Cost / Fuel Sales) × 100
   
   Labour Cost % of Total Sales:
   = (Labour Cost / (Shop Sales + Fuel Sales)) × 100
   
   Example:
   Labour Cost = £45,000
   Shop Sales = £350,000
   Fuel Sales = £800,000
   Total Sales = £1,150,000
   
   % of Shop = (45,000 / 350,000) × 100 = 12.9%
   % of Fuel = (45,000 / 800,000) × 100 = 5.6%
   % of Total = (45,000 / 1,150,000) × 100 = 3.9%
   
   Unit: Percentage (%)
   Display: Value will be shown in %

───────────────────────────────────────────────────────

6. ROI Formula (Return on Investment)
   Formula: (Net Profit / Total Investment or 
             total operating cost) × 100
   
   Variations:
   
   ROI based on Investment:
   = (Net Profit / Total Investment) × 100
   
   ROI based on Operating Cost:
   = (Net Profit / Total Operating Cost) × 100
   
   Examples:
   
   Investment-based ROI:
   Net Profit = £156,780
   Total Investment = £3,500,000
   ROI = (156,780 / 3,500,000) × 100 = 4.48%
   
   Operating Cost-based ROI:
   Net Profit = £156,780
   Total Operating Cost = £1,093,220
   ROI = (156,780 / 1,093,220) × 100 = 14.34%
   
   Annual ROI (Cumulative):
   Cumulative Profit = £1,880,000
   Total Investment = £3,500,000
   Annual ROI = (1,880,000 / 3,500,000) × 100 = 53.71%
   
   Unit: Percentage (%)
   Source: Financial statements + Investment records

═══════════════════════════════════════════════════════
```

**Implementation:**

```jsx
const FormulaSheet = () => {
  const formulas = [
    {
      id: 1,
      title: "Avg. Basket Size",
      formula: "Total Shop Sales / Transactions",
      description: "Calculates the average transaction value in the shop",
      example: {
        inputs: {
          "Total Shop Sales": "£350,000",
          "Transactions": "13,500"
        },
        calculation: "£350,000 / 13,500",
        result: "£25.93"
      },
      unit: "Currency (£)",
      source: "Shop transaction data"
    },
    {
      id: 2,
      title: "Average PPL",
      formula: "Fuel profit / fuel volume × 100",
      alternativeFormula: "SUM(ppl_value × quantity) / SUM(quantity)",
      description: "Average profit margin per liter of fuel sold",
      example: {
        inputs: {
          "Fuel Profit": "£104,000",
          "Fuel Volume": "1,250,000 L"
        },
        calculation: "(£104,000 / 1,250,000) × 100",
        result: "8.32p"
      },
      unit: "Pence (p) per liter",
      source: "Fuel margin data"
    },
    {
      id: 3,
      title: "PPL after vending out the OVERHEADS",
      formula: "(Overheads / Volume) × 100",
      fullFormula: "Average PPL - (Overheads PPL)",
      description: "True profit per liter after deducting operational overhead costs",
      example: {
        inputs: {
          "Average PPL": "145.67p",
          "Total Overheads": "£72,200",
          "Fuel Volume": "1,000,000 L"
        },
        calculation: "Overheads PPL = (£72,200 / 1,000,000) × 100 = 7.22p\nActual PPL = 145.67 - 7.22",
        result: "138.45p"
      },
      unit: "Pence (p) per liter",
      source: "Overhead data + Fuel volume data"
    },
    {
      id: 4,
      title: "Customer Count",
      formula: "From EvoBos",
      description: "Total number of unique customer transactions recorded in POS system",
      note: "This metric is directly imported from the EvoBos system and represents actual customer transactions recorded at the till.",
      unit: "Count (number)",
      source: "Point of Sale (POS) system - EvoBos"
    },
    {
      id: 5,
      title: "Labour Cost %",
      formula: "Labour cost / (Shop or fuel sales) × 100",
      variations: [
        "Labour Cost % of Shop Sales = (Labour Cost / Shop Sales) × 100",
        "Labour Cost % of Fuel Sales = (Labour Cost / Fuel Sales) × 100",
        "Labour Cost % of Total Sales = (Labour Cost / Total Sales) × 100"
      ],
      description: "Labour costs as a percentage of sales revenue",
      example: {
        inputs: {
          "Labour Cost": "£45,000",
          "Shop Sales": "£350,000",
          "Fuel Sales": "£800,000",
          "Total Sales": "£1,150,000"
        },
        calculations: [
          "% of Shop = (45,000 / 350,000) × 100 = 12.9%",
          "% of Fuel = (45,000 / 800,000) × 100 = 5.6%",
          "% of Total = (45,000 / 1,150,000) × 100 = 3.9%"
        ],
        result: "3.9% (of total sales)"
      },
      unit: "Percentage (%)",
      display: "Value will be shown in %"
    },
    {
      id: 6,
      title: "ROI Formula",
      formula: "(Net Profit / Total Investment or total operating cost) × 100",
      variations: [
        "Investment-based: (Net Profit / Total Investment) × 100",
        "Cost-based: (Net Profit / Total Operating Cost) × 100"
      ],
      description: "Return on Investment - measures profitability relative to investment or costs",
      examples: [
        {
          type: "Investment-based ROI",
          inputs: {
            "Net Profit": "£156,780",
            "Total Investment": "£3,500,000"
          },
          calculation: "(156,780 / 3,500,000) × 100",
          result: "4.48%"
        },
        {
          type: "Operating Cost-based ROI",
          inputs: {
            "Net Profit": "£156,780",
            "Total Operating Cost": "£1,093,220"
          },
          calculation: "(156,780 / 1,093,220) × 100",
          result: "14.34%"
        },
        {
          type: "Annual ROI (Cumulative)",
          inputs: {
            "Cumulative Profit": "£1,880,000",
            "Total Investment": "£3,500,000"
          },
          calculation: "(1,880,000 / 3,500,000) × 100",
          result: "53.71%"
        }
      ],
      unit: "Percentage (%)",
      source: "Financial statements + Investment records"
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Formula Sheet</h1>
      
      {formulas.map((formula, index) => (
        <div key={formula.id} className="mb-8 pb-8 border-b border-gray-200 last:border-b-0">
          <h2 className="text-xl font-semibold mb-2">
            {formula.id}. {formula.title}
          </h2>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-3">
            <p className="font-mono text-lg">{formula.formula}</p>
            {formula.alternativeFormula && (
              <p className="font-mono text-sm text-gray-600 mt-1">
                Alternative: {formula.alternativeFormula}
              </p>
            )}
            {formula.fullFormula && (
              <p className="font-mono text-sm text-gray-600 mt-1">
                Full: {formula.fullFormula}
              </p>
            )}
          </div>
          
          {formula.description && (
            <p className="text-gray-700 mb-3">{formula.description}</p>
          )}
          
          {formula.variations && (
            <div className="mb-3">
              <p className="font-semibold mb-1">Variations:</p>
              <ul className="list-disc list-inside space-y-1">
                {formula.variations.map((variation, idx) => (
                  <li key={idx} className="font-mono text-sm">{variation}</li>
                ))}
              </ul>
            </div>
          )}
          
          {formula.example && (
            <div className="bg-gray-50 p-4 rounded-lg mb-3">
              <p className="font-semibold mb-2">Example:</p>
              <div className="space-y-2">
                {Object.entries(formula.example.inputs).map(([key, value]) => (
                  <p key={key} className="text-sm">
                    <span className="text-gray-600">{key}:</span>{' '}
                    <span className="font-medium">{value}</span>
                  </p>
                ))}
                <p className="text-sm mt-3">
                  <span className="text-gray-600">Calculation:</span>{' '}
                  <span className="font-mono">{formula.example.calculation}</span>
                </p>
                <p className="text-sm font-semibold text-blue-600">
                  Result: {formula.example.result}
                </p>
              </div>
            </div>
          )}
          
          {formula.examples && (
            <div className="space-y-3 mb-3">
              {formula.examples.map((ex, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">{ex.type}:</p>
                  <div className="space-y-1">
                    {Object.entries(ex.inputs).map(([key, value]) => (
                      <p key={key} className="text-sm">
                        <span className="text-gray-600">{key}:</span>{' '}
                        <span className="font-medium">{value}</span>
                      </p>
                    ))}
                    <p className="text-sm mt-2">
                      <span className="font-mono">{ex.calculation}</span>
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      = {ex.result}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {formula.note && (
            <div className="bg-yellow-50 p-3 rounded-lg mb-3 border-l-4 border-yellow-400">
              <p className="text-sm text-gray-700">{formula.note}</p>
            </div>
          )}
          
          <div className="flex justify-between text-sm text-gray-600 mt-3">
            <span><strong>Unit:</strong> {formula.unit}</span>
            <span><strong>Source:</strong> {formula.source}</span>
          </div>
          
          {formula.display && (
            <p className="text-sm text-gray-600 mt-1">
              <strong>Display:</strong> {formula.display}
            </p>
          )}
        </div>
      ))}
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> All formulas are applied consistently across the dashboard. 
          For specific implementation details or custom calculations, please refer to the 
          API documentation or contact the development team.
        </p>
      </div>
    </div>
  );
};

export default FormulaSheet;
```

---

## GLOBAL COMPONENTS & FEATURES

### 1. Date Range Filter

**Component Name:** `DateRangePicker`

**Features:**
- Custom date range selection
- Preset options (Last 7 days, Last 30 days, This month, Last month, Custom)
- Calendar UI for date selection
- Validation (start date <= end date)
- Apply button to trigger data refresh

**State Management:**
```javascript
const [startDate, setStartDate] = useState(getDefaultStartDate());
const [endDate, setEndDate] = useState(new Date());
const [datePreset, setDatePreset] = useState('last30days');
```

**Presets:**
```javascript
const datePresets = {
  last7days: {
    label: "Last 7 Days",
    startDate: () => subDays(new Date(), 7),
    endDate: () => new Date()
  },
  last30days: {
    label: "Last 30 Days",
    startDate: () => subDays(new Date(), 30),
    endDate: () => new Date()
  },
  thisMonth: {
    label: "This Month",
    startDate: () => startOfMonth(new Date()),
    endDate: () => new Date()
  },
  lastMonth: {
    label: "Last Month",
    startDate: () => startOfMonth(subMonths(new Date(), 1)),
    endDate: () => endOfMonth(subMonths(new Date(), 1))
  },
  custom: {
    label: "Custom Range",
    // User selects dates manually
  }
};
```

---

### 2. Filter Modal

**Component Name:** `FilterModal`

**Purpose:** Advanced filtering options for charts and tables

**Features:**
- Date range override
- Category/metric selection
- Site selection (multi-select)
- Threshold values
- Sort options
- Export data checkbox

**Example Structure:**
```jsx
<Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Filter Options</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      {/* Date Range */}
      <div>
        <Label>Date Range</Label>
        <DateRangePicker />
      </div>
      
      {/* Category Selection */}
      <div>
        <Label>Categories</Label>
        <MultiSelect 
          options={categories}
          selected={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>
      
      {/* Site Selection */}
      <div>
        <Label>Sites</Label>
        <MultiSelect 
          options={sites}
          selected={selectedSites}
          onChange={setSelectedSites}
        />
      </div>
      
      {/* Threshold */}
      <div>
        <Label>Show only values above</Label>
        <Input 
          type="number" 
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={resetFilters}>Reset</Button>
      <Button onClick={applyFilters}>Apply</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 3. Loading States

**Skeleton Loaders:**
```jsx
const MetricCardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-4 w-[150px]" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-[100px]" />
      <Skeleton className="h-3 w-[80px] mt-2" />
    </CardContent>
  </Card>
);

const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-[200px]" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-[400px] w-full" />
    </CardContent>
  </Card>
);

const TableSkeleton = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);
```

---

### 4. Error States

**Error Display Component:**
```jsx
const ErrorDisplay = ({ error, retry }) => (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {error.message || "Failed to load data"}
    </AlertDescription>
    {retry && (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={retry}
        className="mt-2"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    )}
  </Alert>
);
```

---

### 5. Export Functionality

**Export Options:**
- CSV export for tables
- PNG export for charts
- PDF export for full reports
- Excel export with multiple sheets

**Implementation:**
```javascript
const exportData = async (format, data, filename) => {
  switch (format) {
    case 'csv':
      downloadCSV(data, filename);
      break;
    case 'excel':
      downloadExcel(data, filename);
      break;
    case 'pdf':
      await generatePDF(data, filename);
      break;
    case 'png':
      await exportChartAsPNG(filename);
      break;
  }
};
```

---

## DATABASE SCHEMA

### Tables Required:

1. **transactions**
   - transaction_id (PK)
   - site_code (FK)
   - transaction_date
   - category (fuel/shop/valet)
   - sales_amount
   - purchase_amount
   - quantity
   - nominal_code

2. **fuel_margin_data**
   - id (PK)
   - transaction_id (FK)
   - fuel_type (diesel/unleaded/super/premium)
   - ppl_value
   - volume
   - sales_amount
   - purchase_amount

3. **shop_sales_data**
   - id (PK)
   - transaction_id (FK)
   - product_category
   - sales_amount
   - purchase_amount
   - quantity

4. **valet_services**
   - id (PK)
   - transaction_id (FK)
   - service_type (rollover/jet_wash/vacuum/airline)
   - sales_amount
   - operating_cost

5. **overhead_costs**
   - id (PK)
   - transaction_date
   - nominal_code
   - category
   - amount
   - description

6. **sites**
   - site_code (PK)
   - site_name
   - location
   - type
   - active_status

7. **bank_accounts**
   - account_id (PK)
   - account_name
   - balance
   - as_of_date

---

## API ENDPOINTS SUMMARY

### Fuel Endpoints:
- `GET /api/dashboard/total-fuel-volume`
- `GET /api/dashboard/fuel-volume-breakdown`
- `GET /api/dashboard/fuel-sales-breakdown`
- `GET /api/dashboard/fuel-monthly-performance`
- `GET /api/dashboard/fuel-sales-breakdown-chart`
- `GET /api/dashboard/ppl-comparison-monthly`

### Shop Endpoints:
- `GET /api/dashboard/shop-sales`
- `GET /api/dashboard/shop-profit`
- `GET /api/dashboard/shop-monthly-performance`
- `GET /api/dashboard/shop-categories-breakdown`

### Valet Endpoints:
- `GET /api/dashboard/valet-sales`
- `GET /api/dashboard/valeting-profit`
- `GET /api/dashboard/valet-monthly-performance`
- `GET /api/dashboard/valet-categories-breakdown`

### Quick Insights Endpoints:
- `GET /api/dashboard/total-site-revenue`
- `GET /api/dashboard/avg-basket-size`
- `GET /api/dashboard/total-net-profit`
- `GET /api/dashboard/ppl-after-overheads`
- `GET /api/dashboard/shop-margin`
- `GET /api/dashboard/labour-cost-percentage`

### ROI Endpoints:
- `GET /api/dashboard/roi-cash-trend`

### Site Performance Endpoints:
- `GET /api/dashboard/top-performing-sites`
- `GET /api/dashboard/sites-needing-improvement`

### Overhead Endpoints:
- `GET /api/dashboard/overhead-breakdown`
- `GET /api/dashboard/overhead-cost-trends`

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Foundation (Week 1-2)
- [ ] Set up project structure
- [ ] Configure Tailwind CSS + shadcn/ui
- [ ] Create base layout components
- [ ] Implement routing
- [ ] Set up state management
- [ ] Create API service layer

### Phase 2: Quick Insights (Week 3)
- [ ] Build 8 KPI cards
- [ ] Implement date range filter
- [ ] Connect to API endpoints
- [ ] Add loading states
- [ ] Add error handling

### Phase 3: Fuel Section (Week 4)
- [ ] Build fuel metrics
- [ ] Create monthly performance chart
- [ ] Create fuel sales donut chart
- [ ] Implement toggle functionality
- [ ] Add filters

### Phase 4: PPL & Shop (Week 5)
- [ ] Build PPL comparison chart
- [ ] Build shop metrics
- [ ] Create shop performance chart
- [ ] Create shop categories pie chart
- [ ] Implement toggle

### Phase 5: Valeting & ROI (Week 6)
- [ ] Build valet metrics
- [ ] Create valet performance chart
- [ ] Create valet categories pie chart
- [ ] Build ROI cash trend chart
- [ ] Create top performing sites table

### Phase 6: Site Performance & Overheads (Week 7)
- [ ] Create sites needing improvement table
- [ ] Build overhead breakdown chart
- [ ] Build overhead cost trends chart
- [ ] Implement ranking logic

### Phase 7: Formula Sheet & Polish (Week 8)
- [ ] Create formula sheet page
- [ ] Add export functionality
- [ ] Implement advanced filters
- [ ] Add theme toggle
- [ ] Optimize performance
- [ ] Responsive design polish

### Phase 8: Testing & Deployment (Week 9-10)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Deployment

---

## TESTING STRATEGY

### Unit Tests:
- Test individual components
- Test calculation functions
- Test data formatting functions
- Test filter logic

### Integration Tests:
- Test API integration
- Test state management
- Test component interactions
- Test routing

### E2E Tests:
- Test complete user journeys
- Test date range filtering
- Test chart interactions
- Test export functionality

---

## PERFORMANCE OPTIMIZATION

### Strategies:
1. **Code Splitting:** Lazy load pages
2. **Memoization:** React.memo for expensive components
3. **Virtual Scrolling:** For large tables
4. **Data Caching:** Cache API responses
5. **Debouncing:** For search/filter inputs
6. **Pagination:** For large datasets
7. **Image Optimization:** Compress and lazy load images
8. **Bundle Optimization:** Tree shaking, minification

---

## ACCESSIBILITY

### Requirements:
- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus indicators
- ARIA labels
- Semantic HTML

---

## BROWSER SUPPORT

### Supported Browsers:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

---

## DEPLOYMENT

### Environments:
- **Development:** Local development server
- **Staging:** Pre-production testing
- **Production:** Live application

### CI/CD Pipeline:
1. Code commit
2. Automated tests
3. Build
4. Deploy to staging
5. QA approval
6. Deploy to production

---

## MAINTENANCE & SUPPORT

### Monitoring:
- Error tracking (Sentry)
- Performance monitoring
- User analytics
- API health checks

### Updates:
- Monthly security patches
- Quarterly feature updates
- Annual major version upgrades

---

## CONCLUSION

This comprehensive RND documentation provides complete specifications for implementing the Business Performance Dashboard. Follow the implementation checklist and refer to specific sections for detailed component requirements.

For questions or clarifications, contact the development team.

**Document Version:** 2.0
**Last Updated:** February 06, 2026
**Status:** Ready for Implementation