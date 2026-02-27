# Petrol Data Page Refactor - Deep Dive TODO List

## 📋 **Document Overview**
**Project:** Transform current Petrol Data page into 5-section Business Performance Dashboard  
**Based On:** rnd.md (Research & Development Documentation v2.0)  
**Created:** February 06, 2026  
**Status:** Analysis Complete - Ready for Implementation Planning

---

## 🎯 **Executive Summary of Changes**

### **Current State:**
- Single page with 13 KPI cards
- Date range filter (last 30 days default)
- Basic charts (Monthly Performance, Date-wise, PPL Comparison, Profit Distribution)
- Simple breakdown modals
- 2 tables (Top/Bottom performers)

### **Target State:**
- **5-PAGE/SECTION STRUCTURE:**
  1. Quick Insights & Fuel (8 KPIs + 2 Charts with toggles)
  2. PPL Analysis & Shop (1 Chart + 2 Metrics + 2 Charts with toggles)
  3. Valeting & ROI (2 Metrics + 2 Charts + 1 Table + 1 ROI Chart)
  4. Site Performance & Overheads (1 Table + 2 Overhead Charts)
  5. Formula Sheet (6 Formulas Documentation)

### **Major Additions:**
- **8 NEW Quick Insight KPIs** (replacing current 6)
- **Shop Section** (complete new section)
- **Valeting Section** (complete new section)
- **ROI Section** (complete new section)
- **Enhanced Overheads** (from simple modal to full detailed section)
- **Formula Sheet** (entirely new page)
- **Toggle functionality** (Sales/Profit views on 4 charts)
- **Advanced filtering** (per-section filters)

---

## 📊 **PHASE 1: RESTRUCTURE PAGE ARCHITECTURE**

### ✅ **TODO 1.1: Create Multi-Section/Page Layout**
**Priority:** 🔴 CRITICAL  
**Effort:** 4-6 hours

**Tasks:**
- [ ] Decide on implementation approach:
  - [ ] **Option A:** Single scrollable page with 5 sections
  - [ ] **Option B:** 5 separate routes (/petrol-data, /petrol-data/shop, etc.)
  - [ ] **Option C:** Tabbed interface with 5 tabs
  - [ ] **RECOMMENDED:** Option C (Tabs) for better UX and performance

- [ ] Create tab navigation component:
  ```jsx
  <Tabs defaultValue="fuel">
    <TabsList>
      <TabsTrigger value="fuel">Quick Insights & Fuel</TabsTrigger>
      <TabsTrigger value="shop">PPL & Shop</TabsTrigger>
      <TabsTrigger value="valeting">Valeting & ROI</TabsTrigger>
      <TabsTrigger value="overheads">Performance & Overheads</TabsTrigger>
      <TabsTrigger value="formulas">Formula Sheet</TabsTrigger>
    </TabsList>
    
    <TabsContent value="fuel">...</TabsContent>
    <TabsContent value="shop">...</TabsContent>
    <TabsContent value="valeting">...</TabsContent>
    <TabsContent value="overheads">...</TabsContent>
    <TabsContent value="formulas">...</TabsContent>
  </Tabs>
  ```

- [ ] Implement lazy loading for tab content
- [ ] Add progress indicators/breadcrumbs
- [ ] Ensure smooth transitions between sections
- [ ] Maintain scroll position when switching tabs

**Dependencies:** None  
**Blocks:** All other phases

---

## 🎨 **PHASE 2: PAGE 1 - QUICK INSIGHTS & FUEL**

### ✅ **TODO 2.1: Replace Current 6 KPIs with 8 NEW Quick Insight KPIs**
**Priority:** 🔴 CRITICAL  
**Effort:** 12-16 hours

**Current KPIs to REMOVE:**
1. ~~Total Fuel Volume~~ → Moving to Fuel section
2. ~~Net Sales~~ → Replaced by Total Site Revenue
3. ~~Total Profit~~ → Becomes Total Net Profit (expanded)
4. ~~Avg PPL~~ → Moving to Fuel Volume card (sub-metric)
5. ~~Actual PPL~~ → Becomes "PPL after vending out OH"
6. ~~Labour Cost~~ → Becomes "Labour Cost % of shop/fuel sales"

**NEW KPIs to ADD:**

#### **Card 1: Total Site Revenue**
- [ ] Create `TotalSiteRevenueCard.jsx` component
- [ ] Implement formula: `Fuel Sales + Shop Sales + Valet Sales`
- [ ] Show breakdown of all 3 sources
- [ ] Add TrendingUp icon
- [ ] Make clickable → opens breakdown modal with percentages
- [ ] **API Endpoint:** `GET /api/dashboard/total-site-revenue`
- [ ] **Response Fields:** totalRevenue, fuelSales, shopSales, valetSales
- [ ] Display format: £XXX,XXX

#### **Card 2: Total Fuel Volume (with Avg PPL)**
- [ ] Create `TotalFuelVolumeCard.jsx` (redesign existing)
- [ ] Add **second metric** below: Average PPL
- [ ] Display format:
  ```
  Total Fuel Volume
  Average PPL
  (Pence Per Litre)
  ─────────────
  X.XX ML
  XXX.XX p
  ```
- [ ] Formula for PPL: `SUM(ppl_value × quantity) / SUM(quantity)`
- [ ] **API Endpoint:** `GET /api/dashboard/total-fuel-volume`
- [ ] **Response Fields:** totalVolume, bunkeredVolume, nonBunkeredVolume, averagePPL

#### **Card 3: Shop Sales**
- [ ] Create `ShopSalesCard.jsx` component
- [ ] Implement formula: `SUM(sales_amount) WHERE category = 'shop_sales'`
- [ ] Add ShoppingBag icon
- [ ] Make clickable → opens category breakdown
- [ ] **API Endpoint:** `GET /api/dashboard/shop-sales`
- [ ] **Response Fields:** totalShopSales, transactionCount
- [ ] Display format: £XXX,XXX

#### **Card 4: Avg. Basket Size**
- [ ] Create `AvgBasketSizeCard.jsx` component
- [ ] Implement formula: `Total Shop Sales / Total Transactions`
- [ ] **Data Source:** EvoBos POS system (if available)
- [ ] Alternative: Calculate from transaction counts
- [ ] **API Endpoint:** `GET /api/dashboard/avg-basket-size`
- [ ] **Response Fields:** avgBasketSize, totalTransactions, totalSales
- [ ] Display format: £XX.XX
- [ ] Add trend indicator (up/down vs previous period)
- [ ] NOT clickable (display only)

#### **Card 5: Total Net Profit (Expanded)**
- [ ] Redesign existing `TotalNetProfitCard.jsx`
- [ ] Add breakdown display:
  ```
  Total Net Profit
  Fuel Profit
  Shop Profit
  Valet Profit
  ─────────────
  £XXX,XXX
  ```
- [ ] Formula: `Fuel Profit + Shop Profit + Valet Profit`
- [ ] Color: Green if positive, Red if negative
- [ ] Make clickable → opens detailed profit analysis
- [ ] **API Endpoint:** `GET /api/dashboard/total-net-profit`
- [ ] **Response Fields:** totalProfit, fuelProfit, shopProfit, valetProfit, profitMargin

#### **Card 6: PPL after vending out the OVERHEADS**
- [ ] Rename `ActualPPLCard.jsx` to `PPLAfterOverheadsCard.jsx`
- [ ] Update formula display:
  ```
  PPL after vending out
  the OVERHEADS
  ─────────────
  XXX.XX p
  ```
- [ ] Formula: `(Total Fuel Profit - Total Overheads) / Total Fuel Volume × 100`
- [ ] Alternative: `Average PPL - (Overheads / Volume × 100)`
- [ ] Add comparison with Average PPL
- [ ] Color coding:
  - Green: Above target
  - Yellow: Near target
  - Red: Below target
- [ ] Make clickable → opens overhead breakdown
- [ ] **API Endpoint:** `GET /api/dashboard/ppl-after-overheads`
- [ ] **Response Fields:** pplAfterOverheads, avgPPL, totalOverheads, fuelVolume, calculation

#### **Card 7: Shop Margin**
- [ ] Create `ShopMarginCard.jsx` component
- [ ] Formula: `(Shop Profit / Shop Sales) × 100`
- [ ] Display format: XX.X%
- [ ] Add benchmark comparison (industry average if available)
- [ ] Show trend (up/down vs previous period)
- [ ] Color coding:
  - Green: >= 20%
  - Yellow: 15-20%
  - Red: < 15%
- [ ] Make clickable → opens shop margin analysis
- [ ] **API Endpoint:** `GET /api/dashboard/shop-margin`
- [ ] **Response Fields:** shopMargin, shopSales, shopProfit, shopPurchases, shopOperatingCosts, industryBenchmark

#### **Card 8: Labour Cost as % of shop/fuel sales**
- [ ] Create `LabourCostPercentageCard.jsx` component
- [ ] Formula: `(Total Labour Cost / (Shop Sales + Fuel Sales)) × 100`
- [ ] Display format:
  ```
  Labour Cost as per
  shop/ fuel sales %
  ─────────────
  X.X%
  ```
- [ ] Add monthly trend line
- [ ] Color coding:
  - Green: <= 4%
  - Yellow: 4-5%
  - Red: > 5%
- [ ] Make clickable → opens labour cost breakdown by category
- [ ] **API Endpoint:** `GET /api/dashboard/labour-cost-percentage`
- [ ] **Response Fields:** labourCostPercentage, totalLabourCost, shopSales, fuelSales, breakdown (wages, NI, pension, other)

**Layout Changes:**
- [ ] Change from 3-4 column grid to **2 rows of 4 cards** (8 cards total)
- [ ] Ensure responsive: 1 card on mobile, 2 on tablet, 4 on desktop
- [ ] Add section divider line below Quick Insights

**Styling Updates:**
- [ ] Consistent card heights
- [ ] Unified color scheme
- [ ] Hover effects
- [ ] Loading skeletons for each card
- [ ] Error states with retry button

---

### ✅ **TODO 2.2: Update FUEL Section**
**Priority:** 🔴 HIGH  
**Effort:** 8-10 hours

#### **Subheading & Metrics**
- [ ] Add "Fuel" subheading with icon
- [ ] Create 2 metric cards (side by side):

**Metric 1: Non-Bunkered & Bunkered Fuel Volume**
- [ ] Component: `FuelVolumeBreakdownMetric.jsx`
- [ ] Display:
  ```
  Non-Bunkered Fuel volume
  Bunkered Fuel Volume
  ─────────────
  X.XX ML
  X.XX ML
  ```
- [ ] **API Endpoint:** `GET /api/dashboard/fuel-volume-breakdown`
- [ ] Stacked display (both values visible)
- [ ] 1/2 width card
- [ ] Clickable → Opens detailed fuel type breakdown

**Metric 2: Non-Bunkered & Bunkered Sales**
- [ ] Component: `FuelSalesBreakdownMetric.jsx`
- [ ] Display:
  ```
  Non-Bunkered sales
  Bunkered sales
  ─────────────
  £XXX,XXX
  £XXX,XXX
  ```
- [ ] **API Endpoint:** `GET /api/dashboard/fuel-sales-breakdown`
- [ ] Stacked display
- [ ] 1/2 width card  
- [ ] Show % change from previous period

#### **Chart 1: Monthly Performance Trends (EXISTING - ENHANCE)**
- [ ] Keep existing `FuelMonthlyPerformanceChart.jsx`
- [ ] Add Filter button in top-right corner
- [ ] Filter options:
  - [ ] Fuel type filter (All/Bunkered/Non-Bunkered)
  - [ ] Metric selection (Volume/Sales/Profit/All)
  - [ ] Date range override
- [ ] Ensure chart shows:
  - [ ] Volume (Blue bars)
  - [ ] Sales (Green line)
  - [ ] Profit (Orange line)
- [ ] Dual Y-axes (Volume on left, Sales/Profit on right)
- [ ] Click bar → drill down to daily data for that month

#### **Chart 2: Fuel Sales Donut Chart with Toggle (NEW)**
- [ ] Create `FuelSalesDonutChart.jsx` component
- [ ] **CRITICAL: Implement Toggle functionality**
  ```jsx
  <ToggleGroup type="single" defaultValue="volume">
    <ToggleGroupItem value="volume">Volume</ToggleGroupItem>
    <ToggleGroupItem value="profit">Profit</ToggleGroupItem>
  </ToggleGroup>
  ```
- [ ] **Chart Type:** Donut chart (NOT pie)
- [ ] **Size:** 400px × 400px
- [ ] **Donut thickness:** 60px
- [ ] **Center display:** Total value (changes with toggle)

**Categories to show:**
- [ ] Diesel
- [ ] Unleaded
- [ ] Super Unleaded
- [ ] Premium
- [ ] Others (if any)

**Toggle State Management:**
- [ ] Volume view: Show liters for each category
- [ ] Profit view: Show profit (£) for each category
- [ ] Percentages recalculate based on selected view
- [ ] Chart dynamically updates on toggle
- [ ] Tooltip shows both metrics regardless of view

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/fuel-sales-breakdown-chart?view={volume|profit}`
- [ ] **Response Format:**
  ```json
  {
    "view": "volume",
    "categories": [
      {
        "name": "Diesel",
        "volume": 500000,
        "sales": 730000,
        "profit": 36500,
        "percentage": 40.0,
        "color": "#3B82F6"
      }
    ],
    "totals": {
      "volume": 1250000,
      "sales": 1825000,
      "profit": 104000
    }
  }
  ```

**UI Features:**
- [ ] Filter button (top-right)
- [ ] Legend below chart with color coding
- [ ] Hover: Highlight segment + show tooltip
- [ ] Click segment: Show detailed breakdown modal
- [ ] Description text on right side (as per RND)

**Layout:**
- [ ] Left side: Donut chart (2/3 width)
- [ ] Right side: Description note (1/3 width)
- [ ] Toggle below chart (centered)

---

## 🛍️ **PHASE 3: PAGE 2 - PPL ANALYSIS & SHOP**

### ✅ **TODO 3.1: Create PPL vs Actual PPL Comparison Chart**
**Priority:** 🔴 HIGH  
**Effort:** 4-6 hours

- [ ] Component: `PPLComparisonLineChart.jsx`
- [ ] **Chart Type:** Dual-line comparison
- [ ] **Lines:**
  - [ ] PPL (Blue solid line, 3px, #3B82F6)
  - [ ] Actual PPL after OH (Red solid line, 3px, #EF4444)
- [ ] **Size:** Full width, 350px height
- [ ] **Data points:** Circles on each data point

**Formula Implementation:**
```javascript
For each month:
  Average PPL = SUM(ppl_value × quantity) / SUM(quantity)
  
  Actual PPL = Average PPL - (Total Overheads / Total Volume × 100)
  
  Overhead PPL = Total Overheads / Total Volume × 100
  
  Difference = Average PPL - Actual PPL
```

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/ppl-comparison-monthly`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**UI Features:**
- [ ] Filter button (top-right)
- [ ] Filter options:
  - [ ] Date range
  - [ ] Fuel type (All/Bunkered/Non-Bunkered)
  - [ ] View (Daily/Weekly/Monthly)
- [ ] Custom tooltip showing both values + difference
- [ ] Legend (top-right corner)
- [ ] Grid: Horizontal dashed lines
- [ ] Y-axis auto-scale with 10p padding

**Business Insight Note:**
- [ ] Add description below chart:
  ```
  Gap Analysis: The difference between the two lines shows overhead impact.
  Widening gap = increasing overhead burden.
  Target: Keep actual PPL as close to average PPL as possible.
  ```

---

### ✅ **TODO 3.2: Create SHOP Section (Complete New Section)**
**Priority:** 🔴 HIGH  
**Effort:** 16-20 hours

#### **Subheading**
- [ ] Add "Shop" section heading with ShoppingBag icon

#### **Metrics (2 Cards)**

**Metric 1: Shop Sales**
- [ ] Component: `ShopSalesMetric.jsx`
- [ ] Display: £XXX,XXX
- [ ] 1/2 width card
- [ ] Trend indicator (% change vs previous period)
- [ ] Clickable → daily sales breakdown
- [ ] **API Endpoint:** `GET /api/dashboard/shop-sales`

**Metric 2: Shop Profit**
- [ ] Component: `ShopProfitMetric.jsx`
- [ ] Display: £XXX,XXX
- [ ] Formula: `Shop Sales - Shop Purchases - Shop Operating Costs`
- [ ] Show profit margin % below main value
- [ ] Color: Green if positive, Red if negative
- [ ] 1/2 width card
- [ ] Clickable → profit breakdown modal (costs breakdown)
- [ ] **API Endpoint:** `GET /api/dashboard/shop-profit`
- [ ] **Response Format:**
  ```json
  {
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
  ```

#### **Chart 1: Shop Performance Bar Chart with Margin Line**
- [ ] Component: `ShopPerformanceBarChart.jsx`
- [ ] **Chart Type:** Combination (Bars + Line)
- [ ] **Size:** Full width, 400px height

**Chart Elements:**
- [ ] Bars: Monthly shop sales (Blue #3B82F6)
- [ ] Line: Shop margin % (Orange #F59E0B)
- [ ] Dual Y-axes:
  - Left: Sales (£)
  - Right: Margin (%)

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/shop-monthly-performance`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**Formula:**
```javascript
For each month:
  Monthly Shop Sales = SUM(sales_amount) 
                       WHERE category = 'shop_sales' 
                       AND MONTH = {month}
  
  Monthly Shop Profit = Monthly Sales - Monthly Purchases - Monthly Operating Costs
  
  Monthly Shop Margin = (Monthly Profit / Monthly Sales) × 100
```

**UI Features:**
- [ ] Filter button (top-right)
- [ ] Filter options:
  - Date range
  - View by: Day/Week/Month
  - Show: Sales/Profit/Both
- [ ] Custom tooltip (sales, profit, margin)
- [ ] Click bar → drill down to daily data
- [ ] Recharts implementation with ResponsiveContainer

#### **Chart 2: Shop Categories Pie Chart (Top 5 + Toggle)**
- [ ] Component: `ShopCategoriesPieChart.jsx`
- [ ] **Chart Type:** PIE chart (NOT donut)
- [ ] **Size:** 400px × 400px
- [ ] **CRITICAL: Implement Toggle**
  ```jsx
  <ToggleGroup type="single" defaultValue="sales">
    <ToggleGroupItem value="sales">Sales</ToggleGroupItem>
    <ToggleGroupItem value="profit">Profit</ToggleGroupItem>
  </ToggleGroup>
  ```

**Categories (Top 5 by performance):**
- [ ] Tobacco (typically #1)
- [ ] Vape (typically #2)
- [ ] Alcohol
- [ ] Food
- [ ] Coffee
- [ ] Soft Drinks
- [ ] Others (all remaining categories grouped)

**Ranking Logic:**
- [ ] FOR Sales View: Rank by total sales DESC
- [ ] FOR Profit View: Rank by total profit DESC
- [ ] Select Top 5 categories
- [ ] Group remaining as "Others"
- [ ] Calculate percentages: `(Category Value / Total Value) × 100`

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/shop-categories-breakdown?view={sales|profit}`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**Colors:**
- [ ] Tobacco: Blue (#3B82F6)
- [ ] Vape: Green (#10B981)
- [ ] Alcohol: Orange (#F59E0B)
- [ ] Food: Red (#EF4444)
- [ ] Coffee: Purple (#8B5CF6)
- [ ] Others: Gray (#6B7280)

**UI Features:**
- [ ] Filter button (top-right)
- [ ] Label position: Outside with percentage
- [ ] Toggle below chart (centered)
- [ ] Legend: Bottom, with percentages
- [ ] Hover: Highlight slice + detailed tooltip
- [ ] Click: Drill down to category performance
- [ ] Description text panel on right side

**Layout:**
- [ ] Left: Pie chart (2/3 width)
- [ ] Right: Description note (1/3width)
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

**Custom Tooltip:**
```jsx
<Tooltip>
  {data.category}
  Sales: £{data.sales.toLocaleString()}
  Profit: £{data.profit.toLocaleString()}
  Margin: {data.margin.toFixed(1)}%
  {view === 'sales' ? 'Sales' : 'Profit'} Share: {data.percentage}%
</Tooltip>
```

---

## 🚗 **PHASE 4: PAGE 3 - VALETING & ROI**

### ✅ **TODO 4.1: Create VALETING Section (Complete New Section)**
**Priority:** 🟡 MEDIUM  
**Effort:** 14-18 hours

#### **Subheading**
- [ ] Add "Valeting" section heading with Car/Wash icon

#### **Metrics (2 Cards)**

**Metric 1: Valet Sales**
- [ ] Component: `ValetSalesMetric.jsx`
- [ ] Formula: `SUM(sales_amount) WHERE category = 'valet_sales'`
- [ ] Display: £XXX,XXX
- [ ] 1/2 width card
- [ ] Show trend (% change)
- [ ] Clickable → opens category breakdown
- [ ] **API Endpoint:** `GET /api/dashboard/valet-sales`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**Metric 2: Valeting Profit**
- [ ] Component: `ValetingProfitMetric.jsx`
- [ ] Formula: `Valet Sales - Valet Operating Costs`
- [ ] Operating Costs include:
  - Labour
  - Water
  - Electricity
  - Chemicals
  - Equipment Maintenance
  - Other Direct Costs
- [ ] Display: £XXX,XXX
- [ ] Show profit margin % below
- [ ] 1/2 width card
- [ ] Color: Green if positive
- [ ] Clickable → opens cost breakdown modal
- [ ] **API Endpoint:** `GET /api/dashboard/valeting-profit`
- [ ] **Response Format:**
  ```json
  {
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
  ```

#### **Chart 1: Valet Performance Bar Chart with Margin**
- [ ] Component: `ValetPerformanceBarChart.jsx`
- [ ] **Chart Type:** Combination (Bars + Line)
- [ ] **Size:** Full width, 400px height
- [ ] **Note in RND:** "Also need to include Valet Margin line chart in this?"
- [ ] **DECISION:** YES - Include margin line

**Chart Elements:**
- [ ] Bars: Monthly valet sales (Purple #8B5CF6)
- [ ] Line: Valet margin % (Teal #14B8A6)
- [ ] Dual Y-axes:
  - Left: Sales (£)
  - Right: Margin (%)

**Formula:**
```javascript
For each month:
  Monthly Valet Sales = SUM(sales_amount) 
                        WHERE category = 'valet_sales' 
                        AND MONTH = {month}
  
  Monthly Valet Profit = Monthly Sales - Monthly Operating Costs
  
  Monthly Valet Margin = (Monthly Profit / Monthly Sales) × 100
```

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/valet-monthly-performance`
- [ ] Similar response structure as shop monthly performance

**UI Features:**
- [ ] Filter button (top-right)
- [ ] Similar filtering as Shop chart
- [ ] Custom tooltip
- [ ] Click bar → daily breakdown

#### **Chart 2: Valeting Categories Pie Chart (4 Categories + Toggle)**
- [ ] Component: `ValetingCategoriesPieChart.jsx`
- [ ] **Chart Type:** PIE chart
- [ ] **Size:** 400px × 400px
- [ ] **CRITICAL: Implement Toggle (Sales/Profit)**

**Categories (Fixed 4):**
- [ ] Rollover (automated car wash with brushes)
- [ ] Jet Wash (high-pressure water cleaning)
- [ ] Vacuum (interior vacuuming service)
- [ ] Airline (tire inflation service)

**Formula:**
```javascript
For Sales View:
  Category Sales = SUM(sales_amount) 
                   WHERE service_type = {category}
  
  Percentage = (Category Sales / Total Valet Sales) × 100

For Profit View:
  Category Profit = Category Sales - Allocated Operating Costs
  
  Percentage = (Category Profit / Total Valet Profit) × 100
```

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/valet-categories-breakdown?view={sales|profit}`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**Colors:**
- [ ] Rollover: Purple (#8B5CF6)
- [ ] Jet Wash: Teal (#14B8A6)
- [ ] Vacuum: Orange (#F59E0B)
- [ ] Airline: Blue (#3B82F6)

**UI Features:**
- [ ] Filter button
- [ ] Toggle below chart
- [ ] Legend with percentages
- [ ] Hover/click interactions
- [ ] Description text panel on right

**Layout:**
- [ ] Left: Pie chart (2/3 width)
- [ ] Right: Description note (1/3 width)
  ```
  Valeting Categories:
  This section covers the valeting categories Rollover, Jet Wash, 
  Vacuum, and Airline. The data for each category is visualized 
  using a pie chart, where each slice indicates its proportionate 
  contribution to Profit for each category.
  
  A toggle option must be provided to switch between viewing Sales 
  and Profit. Based on the selected toggle, the pie chart should 
  dynamically update to reflect the corresponding values.
  ```

---

### ✅ **TODO 4.2: Create ROI Section (Return on Investment)**
**Priority:** 🟡 MEDIUM  
**Effort:** 10-12 hours

#### **Subheading**
- [ ] Add "Return On Investment" section heading

#### **Layout: 2-Column**
- [ ] Left: Cash/ROI Trend Chart (2/3 width)
- [ ] Right: Top Performing Sites Table (1/3 width)

#### **Chart: Cash / Sites ROI Trend Over Time**
- [ ] Component: `ROICashTrendChart.jsx`
- [ ] **Chart Type:** Line chart (Cash flow / Cumulative ROI)
- [ ] **Size:** 2/3 width, 350px height
- [ ] **Line Color:** Green (#10B981) for positive growth
- [ ] **Curve:** Smooth (monotone)

**Formula:**
```javascript
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
```

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/roi-cash-trend`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**UI Features:**
- [ ] Y-axis: Cash balance (£) - formatted as £X.XM
- [ ] X-axis: Months
- [ ] Grid: Horizontal dashed lines
- [ ] Custom tooltip showing:
  - Cash: £X.XXM
  - Revenue: £X.XXM
  - Profit: £XXX,XXX
  - ROI: X.XX%
- [ ] No filter button (uses global date range)

**Business Context Note:**
```
Shows cash flow health over time.
Cumulative ROI indicates overall investment performance.
Upward trend = healthy business growth.
Target ROI: 40-60% annually for petrol stations.
```

#### **Table: Top Performing Sites**
- [ ] Component: `TopPerformingSitesTable.jsx`
- [ ] **Size:** 1/3 width on desktop, full on mobile
- [ ] **Rows:** Top 10 sites (scrollable if needed)

**Columns:**
1. Rank
2. Site Code
3. Site Name
4. Net Sales
5. Profit (PCT SALES)
6. Margin %
7. Best Performer (optional visual bar)

**Formula:**
```javascript
For each site:
  Net Sales = Fuel Sales + Shop Sales + Valet Sales
  
  Profit = Total Sales - Total Purchases - Operating Costs
  
  Margin % = (Profit / Net Sales) × 100
  
  Ranking: RANK by Profit DESC (highest first)
  
  Percentage of Total = (Site Profit / Total Company Profit) × 100
```

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/top-performing-sites?limit=10`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**UI Features:**
- [ ] Filter button (top-right)
- [ ] Filter options:
  - Number of sites (5/10/20/All)
  - Sort by: Profit/Sales/Margin
  - Site type filter
- [ ] Default sort: By profit (descending)
- [ ] Clickable headers for custom sorting
- [ ] Row hover: Highlight
- [ ] Click row: Opens detailed site performance page
- [ ] Responsive: Stack columns on mobile

**Styling:**
- [ ] Alternating row colors
- [ ] Bold header row
- [ ] Currency formatting
- [ ] Percentage formatting
- [ ] Best performer visual bar (optional)

---

## 📊 **PHASE 5: PAGE 4 - SITE PERFORMANCE & OVERHEADS**

### ✅ **TODO 5.1: Enhance Sites Needing Improvement Table**
**Priority:** 🟡 MEDIUM  
**Effort:** 6-8 hours

#### **Update Existing Table Component**
- [ ] Rename to `SitesNeedingImprovementTable.jsx` (if not already)
- [ ] **NEW COLUMN:** Variance vs Target
- [ ] **Size:** Full width

**New Columns Layout:**
1. Rank (worst = #1)
2. Site Code
3. Site Name
4. Net Sales
5. Profit
6. Margin %
7. **NEW:** Variance vs Target

**Variance Calculation Methods:**

**Method 1: Average-Based Target**
```javascript
Target Profit = (Company Avg Margin × Site Net Sales)

Company Avg Margin = (Total Company Profit / Total Company Sales) × 100

Variance = Actual Profit - Target Profit

Example:
  Company Avg Margin = 12.6%
  Site Net Sales = £701,600
  Target Profit = 0.126 × 701,600 = £88,402
  Actual Profit = £99,400
  Variance = +£10,998 (GOOD, not in this table)
```

**Method 2: Benchmark-Based Target**
```javascript
Target Profit = Predefined target per site category

Large Site Target Margin = 15%
Medium Site Target Margin = 12%
Small Site Target Margin = 10%

Target Profit = (Target Margin / 100) × Site Net Sales
Variance = Actual Profit - Target Profit
```

**Method 3: Historical-Based Target**
```javascript
Target = Average of previous 6 months performance

If current performance < historical average = needs improvement
```

**Ranking Logic:**
- [ ] RANK sites by Variance ASC (most negative/worst first)
- [ ] Sites with negative variance = underperforming
- [ ] Display Bottom 10 sites (worst performers)

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/sites-needing-improvement?limit=10`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**Color Coding:**
- [ ] Variance column:
  - Red background: < -£50K (critical)
  - Orange background: -£50K to -£20K (warning)
  - Yellow background: -£20K to £0 (caution)
- [ ] Margin column:
  - Red text: < 8%
  - Yellow text: 8-10%
  - Normal: > 10%

**UI Features:**
- [ ] Row click → Opens site improvement action plan
- [ ] Issue badges/tags (Low margin, High costs, etc.)
- [ ] Recommendations tooltip on hover
- [ ] Export to Excel button
- [ ] Print-friendly view

**Note Below Table:**
```
Note: The charts display site rankings based on margin, highlighting
top-performing sites and those needing improvement.

The above chart is for depiction purposes only and does not represent
actual values or the true ranking order. The logic described must be
followed to derive the final output results.
```

---

### ✅ **TODO 5.2: Create OVERHEAD Section (Expanded from Modal)**
**Priority:** 🔴 HIGH  
**Effort:** 12-16 hours

#### **Subheading**
- [ ] Add "Overhead Breakdown" section heading

#### **Layout: 2-Column**
- [ ] Left: Overhead Cost Breakdown Chart (1/2 width)
- [ ] Right: 12-Month Overhead Cost Trends Chart (1/2 width)

#### **Chart 1: Overhead Cost Breakdown (Horizontal Bar Chart)**
- [ ] Component: `OverheadCostBreakdownChart.jsx`
- [ ] **Chart Type:** Horizontal bar chart
- [ ] **Size:** 1/2 width, 400px height
- [ ] **Orientation:** Horizontal (bars go left to right)

**Categories & Nominal Codes:**
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

**Formula:**
```javascript
For each overhead category:
  Category Amount = SUM(transaction_amount)
                    WHERE nominal_code IN {category_codes}
                    AND transaction_date = endDate (or BETWEEN startDate AND endDate)
  
  Percentage = (Category Amount / Total Overheads) × 100
  
  Total Overheads = SUM(all overhead categories)
  
  Ranking: ORDER BY amount DESC (highest first)
  Display: Top 6-10 categories
  Group small categories as "Others"
```

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/overhead-breakdown?endDate={date}` OR `?startDate={}&endDate={}`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**UI Specifications:**
- [ ] Bar colors: Gradient from dark blue to light blue (by amount)
  - Highest: #1E40AF
  - Lowest: #93C5FD
- [ ] Bar labels:
  - Left: Category name + (£amount in parentheses)
  - Right: £amount value
- [ ] Y-axis: Category names (left side, 140px width)
- [ ] X-axis: Amount in £
- [ ] Date display below chart: "Snapshot: [date]" or "Period: [start] - [end]"
- [ ] Custom tooltip with:
  - Category name
  - Amount (£)
  - Percentage of total
  - Subcategory breakdown
  - Nominal codes
- [ ] Click bar → Opens detailed breakdown modal

**Filter Options:**
- [ ] Date selection: Single date or date range
- [ ] Category filter: Select specific categories
- [ ] Threshold: Show only above £X
- [ ] Sort: By amount or alphabetically

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
      label={{ value: 'Cost (£)', position: 'insideBottom' }}
      tickFormatter={(value) => `£${(value / 1000).toFixed(1)}K`}
    />
    <YAxis 
      type="category" 
      dataKey="category"
      width={140}
    />
    <Tooltip content={<OverheadTooltip />} />
    <Bar 
      dataKey="amount" 
      radius={[0, 4, 4, 0]}
      label={{ position: 'right', formatter: (v) => `£${v.toLocaleString()}` }}
    >
      {overheadData.map((entry, index) => (
        <Cell key={`cell-${index}`} fill={getColorGradient(index, overheadData.length)} />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

#### **Chart 2: 12-Month Overhead Cost Trends**
- [ ] Component: `OverheadCostTrendsChart.jsx`
- [ ] **Chart Type:** Multi-line chart (6 lines for top 6 categories)
- [ ] **Size:** 1/2 width, 400px height

**Formula:**
```javascript
For each month and each category:
  Monthly Category Cost = SUM(transaction_amount)
                          WHERE nominal_code IN {category_codes}
                          AND MONTH(transaction_date) = {month}
                          AND YEAR(transaction_date) = {year}
  
  Monthly Total Overheads = SUM(all categories for that month)
  
  Trend Analysis:
    MoM Change = ((Current - Previous) / Previous) × 100
    
    Average Monthly Cost = SUM(Monthly Costs) / 12
    
    Variance from Average = Monthly Cost - Average Monthly Cost
```

**Categories to Display:**
- [ ] Top 6 categories by total annual cost
- [ ] Each category gets its own line
- [ ] Color-coded for distinction

**API Integration:**
- [ ] **Endpoint:** `GET /api/dashboard/overhead-cost-trends?startDate={}&endDate={}`
- [ ] **Response Format:**
  ```json
  {
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
  ```

**Line Colors:**
- [ ] Wages: Blue (#3B82F6)
- [ ] Item 1: Green (#10B981)
- [ ] Card Charges: Orange (#F59E0B)
- [ ] Electricity: Red (#EF4444)
- [ ] Repair: Purple (#8B5CF6)
- [ ] Rates: Teal (#14B8A6)

**UI Specifications:**
- [ ] Line width: 2-3px
- [ ] Data points: Small circles (4px radius)
- [ ] Legend: Right side or below, font-size: 12px
- [ ] Grid: Horizontal dashed lines
- [ ] Y-axis: Cost (£), formatted as £X.XK
- [ ] X-axis: Months
- [ ] Custom tooltip showing all category values for that month
- [ ] Optional: Zoom/pan for detailed view

**Filter Options:**
- [ ] Date range: Select 12-month period
- [ ] Categories: Select which to display
- [ ] View mode:
  - Actual amounts
  - Percentage of total
  - Variance from average
- [ ] Trend lines: Show/hide
- [ ] Comparison: Compare with previous year

**Business Insights:**
- [ ] Seasonal patterns identification
- [ ] Spike detection
- [ ] Cost control tracking
- [ ] Budgeting trends
- [ ] Alerts when category exceeds threshold

**Custom Tooltip:**
```jsx
const OverheadTrendsTooltip = ({ active, payload, label }) => {
  if (active && payload) {
    const total = payload.reduce((sum, item) => sum + item.value, 0);
    return (
      <div className="bg-white p-4 border rounded shadow-lg">
        <p className="font-semibold">{label}</p>
        {payload.sort((a, b) => b.value - a.value).map((item, idx) => (
          <div key={idx} className="flex justify-between">
            <span style={{ color: item.color }}>{item.name}:</span>
            <span>£{item.value.toLocaleString()}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 font-semibold">
          <span>Total: £{total.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};
```

---

## 📄 **PHASE 6: PAGE 5 - FORMULA SHEET**

### ✅ **TODO 6.1: Create Formula Sheet Page**
**Priority:** 🟢 LOW  
**Effort:** 6-8 hours

#### **Create New Component**
- [ ] Component: `FormulaSheet.jsx`
- [ ] **Route:** `/petrol-data/formulas` OR as Tab 5
- [ ] **Purpose:** Reference guide for all calculation methodologies

#### **Formulas to Document (6 Total):**

**1. Avg. Basket Size**
```
Formula: Total Shop Sales / Transactions

Example:
  Total Shop Sales = £350,000
  Transactions = 13,500
  Avg. Basket Size = £350,000 / 13,500 = £25.93

Unit: Currency (£)
Source: Shop transaction data
```

**2. Average PPL**
```
Formula: Fuel profit / fuel volume × 100

Alternative (Weighted):
  Average PPL = SUM(ppl_value × quantity) / SUM(quantity)

Example:
  Fuel Profit = £104,000
  Fuel Volume = 1,250,000 L
  Average PPL = (£104,000 / 1,250,000) × 100 = 8.32p

Unit: Pence (p) per liter
Source: Fuel margin data
```

**3. PPL after vending out the OVERHEADS**
```
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
```

**4. Customer Count**
```
Formula: From EvoBos

Source: Point of Sale (POS) system - EvoBos

Count Method:
  - Unique transactions per day/week/month
  - Tracked via POS transaction IDs

Note: This metric is directly imported from the EvoBos system
and represents actual customer transactions recorded at the till.

Unit: Count (number)
```

**5. Labour Cost %**
```
Formula: Labour cost / (Shop or fuel sales) × 100

Variations:
  - % of Shop = (Labour Cost / Shop Sales) × 100
  - % of Fuel = (Labour Cost / Fuel Sales) × 100
  - % of Total = (Labour Cost / (Shop + Fuel Sales)) × 100

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
```

**6. ROI Formula**
```
Formula: (Net Profit / Total Investment or total operating cost) × 100

Variations:
  Investment-based: (Net Profit / Total Investment) × 100
  Cost-based: (Net Profit / Total Operating Cost) × 100

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
```

#### **Implementation Structure:**

```jsx
const FormulaSheet = () => {
  const formulas = [/* array of 6 formula objects */];
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Formula Sheet</h1>
      
      {formulas.map((formula) => (
        <div key={formula.id} className="mb-8 pb-8 border-b last:border-b-0">
          <h2 className="text-xl font-semibold">{formula.id}. {formula.title}</h2>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-3">
            <p className="font-mono text-lg">{formula.formula}</p>
            {formula.alternativeFormula && (
              <p className="font-mono text-sm text-gray-600">
                Alternative: {formula.alternativeFormula}
              </p>
            )}
          </div>
          
          {formula.description && (
            <p className="text-gray-700 mb-3">{formula.description}</p>
          )}
          
          {formula.example && (
            <div className="bg-gray-50 p-4 rounded-lg mb-3">
              <p className="font-semibold mb-2">Example:</p>
              {/* Render example with inputs, calculation, result */}
            </div>
          )}
          
          <div className="flex justify-between text-sm text-gray-600">
            <span><strong>Unit:</strong> {formula.unit}</span>
            <span><strong>Source:</strong> {formula.source}</span>
          </div>
        </div>
      ))}
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm">
          <strong>Note:</strong> All formulas are applied consistently across
          the dashboard. For specific implementation details, refer to API docs.
        </p>
      </div>
    </div>
  );
};
```

**UI Features:**
- [ ] Clean, readable layout
- [ ] Fixed-width font for formulas
- [ ] Highlighted example sections
- [ ] Collapsible formula details (optional)
- [ ] Print-friendly styling
- [ ] Export as PDF button
- [ ] Copy formula button for each
- [ ] Search/filter formulas

---

## 🔧 **PHASE 7: GLOBAL COMPONENTS & FEATURES**

### ✅ **TODO 7.1: Enhance Date Range Filter**
**Priority:** 🟡 MEDIUM  
**Effort:** 2-4 hours

**Current State:** Basic date range picker with last 30 days default

**Enhancements Needed:**
- [ ] Add more presets:
  - [ ] Last 7 days
  - [ ] Last 30 days (existing)
  - [ ] This month
  - [ ] Last month
  - [ ] Last 3 months
  - [ ] Last 6 months
  - [ ] This year
  - [ ] Last year
  - [ ] Custom range (existing)

- [ ] Improve UI:
  - [ ] Better calendar widget design
  - [ ] Quick select buttons
  - [ ] Date range validation
  - [ ] Visual feedback for applied filters

- [ ] Make it globally accessible:
  - [ ] Fixed position (top-right or top bar)
  - [ ] Available on all pages/tabs
  - [ ] Synced across all charts/tables
  - [ ] Persist in URL params or session storage

---

### ✅ **TODO 7.2: Implement Per-Section Filter Modals**
**Priority:** 🟡 MEDIUM  
**Effort:** 8-10 hours

**Requirement:** Each chart has a [Filter] button in top-right corner

**Filter Modal Component:**
- [ ] Create `FilterModal.jsx` component
- [ ] Props: `filterOptions`, `onApply`, `onReset`
- [ ] Reusable across all charts

**Filter Options by Chart Type:**

**Fuel Charts:**
- [ ] Date range override
- [ ] Fuel type (All/Bunkered/Non-Bunkered)
- [ ] Metric selection (Volume/Sales/Profit)
- [ ] View mode (Daily/Weekly/Monthly)

**Shop Charts:**
- [ ] Date range override
- [ ] Category selection
- [ ] Sort by (Sales/Profit/Margin)
- [ ] Show top N categories

**Valet Charts:**
- [ ] Date range override
- [ ] Service type selection
- [ ] Sort options

**Overhead Charts:**
- [ ] Date range or single date
- [ ] Category selection
- [ ] Threshold (show only above £X)
- [ ] Sort (by amount or alphabetically)

**Implementation:**
```jsx
<Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Filter Options</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      {/* Dynamic filter fields based on chart type */}
      {filterOptions.map((option) => renderFilterField(option))}
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={handleReset}>Reset</Button>
      <Button onClick={handleApply}>Apply</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Filter Button:**
- [ ] Position: Top-right corner of each chart card
- [ ] Icon: Filter icon (lucide-react)
- [ ] Badge: Show count of active filters
- [ ] Hover: Show tooltip with active filters

---

### ✅ **TODO 7.3: Implement Toggle Components**
**Priority:** 🔴 HIGH  
**Effort:** 4-6 hours

**Requirement:** 4 charts need toggle functionality (Sales/Profit views)

**Charts with Toggle:**
1. Fuel Sales Donut Chart (Volume/Profit)
2. Shop Categories Pie Chart (Sales/Profit)
3. Valeting Categories Pie Chart (Sales/Profit)
4. (Any others as identified)

**Toggle Component:**
- [ ] Use shadcn/ui `ToggleGroup` component
- [ ] Two options: View A | View B
- [ ] Single selection
- [ ] Smooth transition when switching
- [ ] Persist selection in component state

**Implementation:**
```jsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const [chartView, setChartView] = useState('volume'); // or 'sales'

<ToggleGroup 
  type="single" 
  value={chartView}
  onValueChange={(value) => {
    if (value) {
      setChartView(value);
      fetchChartData(startDate, endDate, value);
    }
  }}
  className="mb-4"
>
  <ToggleGroupItem value="volume">Volume</ToggleGroupItem>
  <ToggleGroupItem value="profit">Profit</ToggleGroupItem>
</ToggleGroup>
```

**Toggle Behavior:**
- [ ] Position: Below chart, centered
- [ ] Chart updates immediately on toggle
- [ ] Loading state while fetching new data
- [ ] Smooth data transition/animation
- [ ] Update API call with new view parameter

---

### ✅ **TODO 7.4: Create Loading & Error States**
**Priority:** 🟡 MEDIUM  
**Effort:** 3-4 hours

**Skeleton Loaders:**
- [ ] Create skeleton for KPI cards
- [ ] Create skeleton for charts (400px height)
- [ ] Create skeleton for tables
- [ ] Use shadcn/ui `Skeleton` component
- [ ] Shimmer effect

**Error Display:**
- [ ] Component: `ErrorDisplay.jsx`
- [ ] Props: `error`, `retry`, `type`
- [ ] Use shadcn/ui `Alert` component
- [ ] Show error icon (AlertCircle)
- [ ] Display error message
- [ ] Retry button (if applicable)
- [ ] Different styles for warning/error/info

```jsx
const ErrorDisplay = ({ error, retry, type = 'error' }) => (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>
      {error?.message || "Failed to load data"}
    </AlertDescription>
    {retry && (
      <Button variant="outline" size="sm" onClick={retry} className="mt-2">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    )}
  </Alert>
);
```

**Empty States:**
- [ ] No data available message
- [ ] Friendly illustrations (optional)
- [ ] Call-to-action buttons
- [ ] Helpful tips/suggestions

---

### ✅ **TODO 7.5: Implement Export Functionality**
**Priority:** 🟢 LOW  
**Effort:** 6-8 hours

**Export Options:**
- [ ] **CSV Export** for tables
  - [ ] Use `papaparse` or similar
  - [ ] Include all columns
  - [ ] Proper formatting
  
- [ ] **PNG Export** for charts
  - [ ] Use `html2canvas` or Recharts export
  - [ ] High resolution
  - [ ] Include title and date
  
- [ ] **Excel Export** for tables with multiple sheets
  - [ ] Use `xlsx` library
  - [ ] Multiple sheets for different data
  - [ ] Formatted cells
  
- [ ] **PDF Export** for full reports
  - [ ] Use `jsPDF` + `html2canvas`
  - [ ] Include charts and tables
  - [ ] Professional formatting
  - [ ] Page breaks

**Export Button:**
- [ ] Position: Top-right of table/chart
- [ ] Dropdown menu with options
- [ ] Loading state while generating
- [ ] Success toast notification
- [ ] Error handling

```jsx
const ExportButton = ({ data, type, filename }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={() => exportCSV(data, filename)}>
        CSV
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportExcel(data, filename)}>
        Excel
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => exportPDF(data, filename)}>
        PDF
      </DropdownMenuItem>
      {type === 'chart' && (
        <DropdownMenuItem onClick={() => exportPNG(filename)}>
          PNG
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);
```

---

## 🔌 **PHASE 8: BACKEND API DEVELOPMENT**

### ✅ **TODO 8.1: Create New API Endpoints**
**Priority:** 🔴 CRITICAL  
**Effort:** 40-50 hours

**New Endpoints Required (20+ endpoints):**

#### **Quick Insights Endpoints (6 new):**
- [ ] `GET /api/dashboard/total-site-revenue`
- [ ] `GET /api/dashboard/avg-basket-size`
- [ ] `GET /api/dashboard/total-net-profit` (enhance existing)
- [ ] `GET /api/dashboard/ppl-after-overheads`
- [ ] `GET /api/dashboard/shop-margin`
- [ ] `GET /api/dashboard/labour-cost-percentage`

#### **Shop Endpoints (4 new):**
- [ ] `GET /api/dashboard/shop-sales`
- [ ] `GET /api/dashboard/shop-profit`
- [ ] `GET /api/dashboard/shop-monthly-performance`
- [ ] `GET /api/dashboard/shop-categories-breakdown?view={sales|profit}`

#### **Valet Endpoints (4 new):**
- [ ] `GET /api/dashboard/valet-sales`
- [ ] `GET /api/dashboard/valeting-profit`
- [ ] `GET /api/dashboard/valet-monthly-performance`
- [ ] `GET /api/dashboard/valet-categories-breakdown?view={sales|profit}`

#### **ROI Endpoints (1 new):**
- [ ] `GET /api/dashboard/roi-cash-trend`

#### **Site Performance Endpoints (1 enhance):**
- [ ] `GET /api/dashboard/sites-needing-improvement` (add variance column)

#### **Overhead Endpoints (2 new):**
- [ ] `GET /api/dashboard/overhead-breakdown`
- [ ] `GET /api/dashboard/overhead-cost-trends`

#### **Fuel Endpoints (2 enhance):**
- [ ] `GET /api/dashboard/ppl-comparison-monthly` (new)
- [ ] `GET /api/dashboard/fuel-sales-breakdown-chart?view={volume|profit}` (enhance)

**For Each Endpoint:**
- [ ] Define request parameters
- [ ] Define response format (match RND specs)
- [ ] Implement SQL queries with proper filtering
- [ ] Add error handling
- [ ] Add input validation
- [ ] Add logging
- [ ] Write API documentation
- [ ] Write unit tests
- [ ] Performance optimization (indexes, caching)

---

### ✅ **TODO 8.2: Database Schema Updates**
**Priority:** 🔴 CRITICAL  
**Effort:** 8-12 hours

**New Tables/Columns Needed:**

**Shop Sales Data:**
- [ ] Verify `shop_sales_data` table exists
- [ ] Columns needed:
  - transaction_id (FK)
  - product_category
  - sales_amount
  - purchase_amount
  - quantity
  - transaction_date

**Valet Services:**
- [ ] Create `valet_services` table (if not exists)
- [ ] Columns:
  - id (PK)
  - transaction_id (FK)
  - service_type (rollover/jet_wash/vacuum/airline)
  - sales_amount
  - operating_cost
  - transaction_date

**Overhead Costs:**
- [ ] Verify `overhead_costs` table exists
- [ ] Enhance nominal_code categorization
- [ ] Ensure all codes (7000-8999) are covered
- [ ] Add category mapping

**Bank Accounts:**
- [ ] Verify `bank_accounts` table
- [ ] Columns:
  - account_id (PK)
  - account_name
  - balance
  - as_of_date

**Indexes:**
- [ ] Add indexes on transaction_date columns
- [ ] Add indexes on category columns
- [ ] Add indexes on site_code columns
- [ ] Add composite indexes for common queries

**Views (Optional):**
- [ ] Create materialized views for common aggregations
- [ ] Monthly summary view
- [ ] Site performance view
- [ ] Category performance view

---

### ✅ **TODO 8.3: Data Migration & Seeding**
**Priority:** 🟡 MEDIUM  
**Effort:** 4-6 hours

- [ ] Migrate historical data to new tables
- [ ] Validate data integrity
- [ ] Create seed data for testing
- [ ] Create sample data for demo

---

## 🎨 **PHASE 9: UI/UX POLISH & RESPONSIVENESS**

### ✅ **TODO 9.1: Responsive Design**
**Priority:** 🟡 MEDIUM  
**Effort:** 8-10 hours

**Breakpoints:**
- [ ] Mobile: < 640px
  - All cards full width
  - Charts stacked vertically
  - Tables scrollable horizontally
  - Simplified navigation

- [ ] Tablet: 640px - 1024px
  - 2-column grids
  - Side-by-side charts where possible
  - Reduced font sizes

- [ ] Desktop: > 1024px
  - Full layouts as designed
  - 3-4 column grids
  - All features visible

**Testing:**
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPad (768px)
- [ ] Test on iPad Pro (1024px)
- [ ] Test on desktop (1920px)
- [ ] Test landscape orientation

---

### ✅ **TODO 9.2: Accessibility (A11y)**
**Priority:** 🟡 MEDIUM  
**Effort:** 4-6 hours

**Requirements:**
- [ ] WCAG 2.1 Level AA compliance
- [ ] Keyboard navigation
  - Tab through all interactive elements
  - Enter/Space to activate
  - Escape to close modals
  
- [ ] Screen reader support
  - ARIA labels on all controls
  - Alt text on images
  - Role attributes
  
- [ ] Color contrast ratios
  - 4.5:1 minimum for text
  - 3:1 for UI components
  
- [ ] Focus indicators
  - Visible focus outline
  - Consistent styling
  
- [ ] Semantic HTML
  - Proper heading hierarchy
  - Landmark regions
  - List markup

---

### ✅ **TODO 9.3: Performance Optimization**
**Priority:** 🟡 MEDIUM  
**Effort:** 6-8 hours

**Strategies:**
- [ ] Code splitting by page/tab
- [ ] Lazy load tab content
- [ ] React.memo for expensive components
- [ ] useMemo for heavy calculations
- [ ] useCallback for event handlers
- [ ] Virtual scrolling for large tables
- [ ] Data pagination
- [ ] API response caching (React Query)
- [ ] Debounce search/filter inputs
- [ ] Image optimization
- [ ] Bundle size optimization

**Metrics to Monitor:**
- [ ] First Contentful Paint (FCP) < 1.8s
- [ ] Time to Interactive (TTI) < 3.8s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] First Input Delay (FID) < 100ms

---

## ✅ **PHASE 10: TESTING**

### ✅ **TODO 10.1: Unit Tests**
**Priority:** 🟡 MEDIUM  
**Effort:** 12-16 hours

**Test Coverage Goals:** 80%+

**Components to Test:**
- [ ] All KPI cards (18 cards)
- [ ] All charts (10 charts)
- [ ] All tables (2 tables)
- [ ] Toggle components
- [ ] Filter modals
- [ ] Date range picker
- [ ] Formula calculations

**Test Framework:**
- [ ] Jest + React Testing Library
- [ ] Mock API responses
- [ ] Mock date functions
- [ ] Snapshot tests for UI
- [ ] Integration tests for user flows

---

### ✅ **TODO 10.2: End-to-End Tests**
**Priority:** 🟢 LOW  
**Effort:** 8-10 hours

**Test Scenarios:**
- [ ] Complete user journey through all 5 pages
- [ ] Date range filtering across all charts
- [ ] Toggle functionality on all charts
- [ ] Filter modal interactions
- [ ] Export functionality
- [ ] Responsive design on different devices
- [ ] Error handling flows

**Tools:**
- [ ] Cypress or Playwright
- [ ] Visual regression testing

---

## 📚 **PHASE 11: DOCUMENTATION**

### ✅ **TODO 11.1: Update Documentation**
**Priority:** 🟡 MEDIUM  
**Effort:** 4-6 hours

- [ ] Update `PETROL_DATA_DOCUMENTATION.md`
- [ ] Add new API endpoints documentation
- [ ] Update component documentation
- [ ] Add architecture diagrams
- [ ] Update user guide
- [ ] Add troubleshooting guide
- [ ] Update changelog

---

## 🚀 **PHASE 12: DEPLOYMENT**

### ✅ **TODO 12.1: Deployment Preparation**
**Priority:** 🔴 CRITICAL  
**Effort:** 4-6 hours

- [ ] Environment variables setup
- [ ] Database migration scripts
- [ ] Build optimization
- [ ] Error tracking setup (Sentry)
- [ ] Analytics setup
- [ ] Performance monitoring
- [ ] CI/CD pipeline configuration
- [ ] Staging deployment
- [ ] QA testing on staging
- [ ] Production deployment plan
- [ ] Rollback plan

---

## 📊 **IMPLEMENTATION TIMELINE ESTIMATE**

### **Total Effort:** 200-280 hours (~5-7 weeks for 1 developer, 2.5-3.5 weeks for 2 developers)

**Phase Breakdown:**
1. **Phase 1:** Restructure (4-6 hours) - Week 1
2. **Phase 2:** Quick Insights & Fuel (20-26 hours) - Week 1-2
3. **Phase 3:** PPL & Shop (20-26 hours) - Week 2-3
4. **Phase 4:** Valeting & ROI (24-30 hours) - Week 3-4
5. **Phase 5:** Overheads (18-24 hours) - Week 4-5
6. **Phase 6:** Formula Sheet (6-8 hours) - Week 5
7. **Phase 7:** Global Features (23-32 hours) - Week 5-6
8. **Phase 8:** Backend API (48-62 hours) - Week 2-6 (parallel)
9. **Phase 9:** UI/UX Polish (18-24 hours) - Week 6-7
10. **Phase 10:** Testing (20-26 hours) - Week 7
11. **Phase 11:** Documentation (4-6 hours) - Week 7
12. **Phase 12:** Deployment (4-6 hours) - Week 7

---

## ⚠️ **CRITICAL DECISIONS NEEDED**

### **Decision 1: Page Structure**
**Options:**
A. Single scrollable page with 5 sections (long scroll)
B. 5 separate routes (/petrol-data, /petrol-data/shop, etc.)
C. Tabbed interface with 5 tabs (RECOMMENDED)

**RECOMMENDED:** Option C (Tabs)
- Better UX
- Lazy loading
- Easier navigation
- Better performance

### **Decision 2: Data Source for "Item 1" (Unknown Overhead)**
**Issue:** RND mentions "Item 1 (£500)" in overhead chart but doesn't clarify what it is.

**Action Required:**
- [ ] Clarify with stakeholders what "Item 1" represents
- [ ] Get nominal code range for this category
- [ ] Update API and database accordingly

### **Decision 3: EvoBos Integration**
**Requirement:** Customer Count and Avg Basket Size come from EvoBos POS system

**Action Required:**
- [ ] Confirm EvoBos API access
- [ ] Get API credentials
- [ ] Document EvoBos API endpoints
- [ ] Implement EvoBos data sync
- [ ] Fallback: Calculate from transaction data if EvoBos not available

### **Decision 4: Historical Data Availability**
**Question:** How many months of historical data is available?

**Impact:** 
- 12-month trends require full year data
- ROI calculations need investment start date
- Comparison features need previous period data

**Action Required:**
- [ ] Verify historical data availability
- [ ] Define data retention policy
- [ ] Plan data migration if needed

---

## 🎯 **SUCCESS CRITERIA**

### **Functional Requirements:**
- [ ] All 5 pages/sections implemented and working
- [ ] All 8 Quick Insight KPIs displaying correct data
- [ ] All 10+ charts rendering with correct data
- [ ] All 4 toggle features working smoothly
- [ ] All filter modals functional
- [ ] Allformulas documented and accessible
- [ ] Date range filter applied globally
- [ ] Export functionality working
- [ ] Responsive on all devices

### **Performance Requirements:**
- [ ] Page load time < 3 seconds
- [ ] Chart rendering < 1 second
- [ ] API response time < 500ms
- [ ] No layout shifts (CLS < 0.1)
- [ ] Smooth animations (60 FPS)

### **Quality Requirements:**
- [ ] 80%+ test coverage
- [ ] Zero critical bugs
- [ ] WCAG 2.1 Level AA compliant
- [ ] Cross-browser compatible
- [ ] Mobile-responsive

### **Business Requirements:**
- [ ] Matches RND specifications 100%
- [ ] Stakeholder approval
- [ ] User acceptance testing passed
- [ ] Training materials prepared

---

## 📝 **NOTES & CONSIDERATIONS**

### **Scope Clarifications Needed:**
1. **"Item 1" overhead category** - What is this?
2. **EvoBos integration** - Is API access available?
3. **Historical data** - How many months available?
4. **Shop product categories** - What are all the categories?
5. **Target margins/benchmarks** - What are the company targets?

### **Technical Debt:**
- Current PetrolData page will need complete refactor (not incremental)
- Consider creating new `PetrolDataV2.jsx` and migrating gradually
- Backup current implementation before starting

### **Risk Mitigation:**
- **Risk:** API endpoints delay frontend development
  - **Mitigation:** Use mock data during development
  
- **Risk:** Complex calculations may slow down charts
  - **Mitigation:** Backend aggregation, caching, pagination
  
- **Risk:** Too many features = slow page load
  - **Mitigation:** Lazy loading, code splitting, performance monitoring

### **Future Enhancements (Post-Launch):**
- Real-time data updates via WebSocket
- Custom dashboard builder (user-defined KPIs)
- AI-powered insights and recommendations
- Mobile app version
- Automated reports via email
- Predictive analytics
- Benchmarking against industry averages

---

## 🎉 **CONCLUSION**

This TODO list provides a comprehensive roadmap for transforming the current Petrol Data page into the full-featured Business Performance Dashboard as specified in the RND document.

**Key Takeaways:**
- **Major Effort:** 200-280 hours of development work
- **5 Pages/Sections:** Completely new structure
- **20+ New Components:** Extensive component library expansion
- **20+ New API Endpoints:** Significant backend development
- **4 Toggle Features:** Interactive chart views
- **Phased Approach:** Can be implemented incrementally

**Next Steps:**
1. Review and approve this TODO list
2. Make critical decisions (page structure, data sources)
3. Set up project timeline and assign resources
4. Start with Phase 1 (page restructure)
5. Implement phases in parallel where possible
6. Regular check-ins and progress reviews

**Document Version:** 1.0  
**Created:** February 06, 2026  
**Status:** Ready for Review & Approval
