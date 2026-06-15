# CHANGE LOG — HSRL Petroleum Dashboard

Append-only. Newest entries at the bottom.
Format: see `CLAUDE.md` or `.cursor/rules/change-audit-log.mdc`.

---
**Timestamp:** 2026-04-13T00:00:00Z
**Summary:** Add nominal code 4101 (Bunkered Sales) volume to fuel volume calculations.
**Files:**
- backend/utils/sageDashboard.js
- backend/routes/petrolDataSage.js
**Details:**
- Added `FUEL_VOLUME_CODES = ['4000','4001','4002','4003','4004','4101']` in sageDashboard.js — used for volume queries only; `FUEL_SALES_CODES` (4000–4004) unchanged for £ value.
- Added '4101' to `FUEL_VOLUME_FROM_DETAILS_CODES` in petrolDataSage.js.
- Both volume column queries and details-fallback queries now include 4101.
- Value/sales figures are unaffected.
**Undo / Rollback:**
- Revert `FUEL_VOLUME_CODES` to `['4000','4001','4002','4003','4004']` in sageDashboard.js.
- Remove '4101' from `FUEL_VOLUME_FROM_DETAILS_CODES` in petrolDataSage.js.
- Revert all 4 volume query strings to use `FUEL_SALES_CODES` instead.

---
**Timestamp:** 2026-04-13T00:01:00Z
**Summary:** Rename "Bunkered Sales" label to "Bunkering Volume" in fuel volume breakdown card.
**Files:**
- backend/routes/petrolDataSage.js
**Details:**
- Added `'4101': 'Bunkering Volume'` to `FUEL_CATEGORY_NAMES` (line ~48).
- Previously fell back to `NOMINAL_CODE_NAMES['4101']` which returned "Bunkered Sales".
**Undo / Rollback:**
- Remove the `'4101': 'Bunkering Volume'` line from `FUEL_CATEGORY_NAMES`.

---
**Timestamp:** 2026-04-13T00:02:00Z
**Summary:** Simplify Gross Profit Breakdown modal — show Fuel (combined), Shop, Coffee & Valet only.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
**Details:**
- Removed per-category fuel breakdown (Unleaded, Diesel, Super Unleaded, Super Diesel, Adblue, Bunkering & other).
- Modal now shows 3 rows: Fuel (combined `fuelMag`), Shop, Coffee & Valet profit + Total.
- `fuelMag` = `Math.abs(totalNetProfit?.fuelProfit ?? profitBreakdown.totalProfit ?? 0)` — unchanged calculation.
- Removed `fuelLineSpecs` array, `pairProfit`, `otherFuelProfit`, and the indented fuel section block.
**Undo / Rollback:**
- Restore the `fuelLineSpecs` array and the `<div className="pl-2 border-l-2 ...">` section in LatestPetrol.jsx (see git diff).

---
**Timestamp:** 2026-04-13T00:03:00Z
**Summary:** Add 4101 special volume parser — handles dash-terminated values and Rev reversals.
**Files:**
- backend/routes/petrolDataSage.js
- backend/utils/sageDashboard.js
**Details:**
- Added `parse4101VolumeFromDetails(details)` to both files.
- Handles two formats in the `details` column for 4101 rows:
  1. `Ast-Accrual for UK Fuel-Jan'26/551.30` → +551.30 (slash separator, existing logic)
  2. `Ast-Rev.Accrual for UK Fuel-Dec'25-4251.51` → −4251.51 (trailing dash number; "Rev" = reversal = negative)
- Updated 3 loops in petrolDataSage.js: `getTotalFuelVolumeFromDetails`, `getTransitionTotalVolume`, `/fuel-volume-transition-breakdown` route.
- Updated 2 loops in sageDashboard.js: `getMetricsFromSage`, `getMetricsFromSageAllSites`.
- Added `nominal_code` to SELECT in sageDashboard.js details queries (was only fetching `id, details`).
**Undo / Rollback:**
- Remove `parse4101VolumeFromDetails` from both files.
- Revert all 5 loop blocks back to calling `parseDetailsToVolumeSegments` for every row.
- Remove `nominal_code` from the two SELECT statements in sageDashboard.js.

---
**Timestamp:** 2026-04-13T00:04:00Z
**Summary:** Create Cursor rule, CLAUDE.md, CHANGE_LOG.md, and Documentation folder structure.
**Files:**
- .cursor/rules/change-audit-log.mdc
- CLAUDE.md
- CHANGE_LOG.md
- Documentation/ARCHITECTURE.md
- Documentation/NOMINAL_CODES.md
- Documentation/VOLUME_LOGIC.md
- Documentation/API.md
- Documentation/FRONTEND.md
- Documentation/CHANGES_INDEX.md
**Details:**
- Cursor rule: auto-applies to all AI edits in the repo, enforces CHANGE_LOG.md entries.
- CLAUDE.md: Claude Code session context — nominal code groups, volume parsing rules, dev notes.
- Documentation/ folder populated with architecture, nominal codes, volume logic, API, frontend, and changes index docs.
**Undo / Rollback:**
- Delete the above files if unwanted.

---
**Timestamp:** 2026-04-13T10:00:00Z
**Summary:** Mobile fix — remove horizontal scroll from all chart components.
**Files:**
- frontend/src/components/dashboard/MonthlyFuelPerformanceChart.jsx
- frontend/src/components/dashboard/VolumeVsPPLChart.jsx
- frontend/src/components/dashboard/ShopValetMonthlyComboCharts.jsx
- frontend/src/components/dashboard/MonthlyPerformanceChart.jsx
**Details:**
- Removed `overflow-x-auto`, `overscroll-x-contain`, `touch-pan-x` from mobile chart containers.
- Removed `mobileScrollPlotPx` fixed-width expansion that made charts wider than the viewport.
- Removed `min-w-[600px]` from MonthlyPerformanceChart inner wrapper.
- All chart containers now use `overflow-x-hidden` and `w-full` on mobile.
- Desktop view unchanged.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/MonthlyFuelPerformanceChart.jsx frontend/src/components/dashboard/VolumeVsPPLChart.jsx frontend/src/components/dashboard/ShopValetMonthlyComboCharts.jsx frontend/src/components/dashboard/MonthlyPerformanceChart.jsx`

---
**Timestamp:** 2026-04-13T10:30:00Z
**Summary:** Mobile fix — compact Y-axes, smaller bars and fonts on Fuel, Volume vs PPL, Shop, Coffee & Valet charts.
**Files:**
- frontend/src/components/dashboard/MonthlyFuelPerformanceChart.jsx
- frontend/src/components/dashboard/VolumeVsPPLChart.jsx
- frontend/src/components/dashboard/ShopValetMonthlyComboCharts.jsx
**Details:**
- Left Y-axis width: 64px → 40px on mobile (was eating chart horizontal space).
- Right Y-axis width: 68px → 38px on mobile.
- Chart margins tightened to `{ top:4, right:4, left:0, bottom:46 }` on mobile.
- Bar size: 20px → 11px on mobile so 12 months of bars fit without crowding.
- X-axis font: 12px → 9px on mobile; angle -45°; height 46px.
- Axis labels repositioned to `insideLeft`/`insideRight` at 9px on mobile (subtitle already explains axes).
- Legend font: 13px → 10px on mobile with tighter gaps.
- Plot height increased: 240px → 280px on mobile for more breathing room.
- Desktop view unchanged.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/MonthlyFuelPerformanceChart.jsx frontend/src/components/dashboard/VolumeVsPPLChart.jsx frontend/src/components/dashboard/ShopValetMonthlyComboCharts.jsx`

---
**Timestamp:** 2026-04-13T11:00:00Z
**Summary:** Mobile fix — compact layout for Gross PPL and PPL after O/H chart.
**Files:**
- frontend/src/components/dashboard/PPLComparisonChart.jsx
**Details:**
- Added `formatMonthAxisTick` import to shorten "Jan 2025" → "Jan 25" on X-axis.
- X-axis font: 12px → 9px on mobile; angle -45°; height 46px; `minTickGap: 0`.
- Y-axis width: 52px → 40px on mobile.
- Chart margins tightened to `{ top:8, right:4, left:0, bottom:46 }` on mobile.
- Legend font: 13px → 10px on mobile with tighter gap.
- Removed unused `denseMobilePpl` variable.
- Desktop view unchanged.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/PPLComparisonChart.jsx`

---
**Timestamp:** 2026-04-13T11:30:00Z
**Summary:** Mobile fix — compact layout for Site ROI Trend Over Time chart.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
**Details:**
- Added `formatMonthAxisTick` import to shorten "Jan 2025" → "Jan 25" on X-axis.
- Left Y-axis width (EBITDA): 66px → 44px on mobile.
- Right Y-axis width (ROI %): 68px → 40px on mobile.
- Chart margins tightened to `{ top:4, right:4, left:0, bottom:46 }` on mobile.
- Chart height: 460px → 320px on mobile (was excessively tall).
- X-axis: 9px font, -45° angle, 46px height, `tickFormatter={formatMonthAxisTick}`.
- Y-axis labels repositioned to `insideLeft`/`insideRight` at 9px on mobile.
- Desktop view unchanged.
**Undo / Rollback:**
- `git restore frontend/src/pages/LatestPetrol.jsx`

---
**Timestamp:** 2026-04-13T12:00:00Z
**Summary:** Mobile fix + desktop legend overflow fix for Monthly Overhead Cost Trends chart.
**Files:**
- frontend/src/components/dashboard/OverheadTrendsChart.jsx
**Details:**
- Added `formatMonthAxisTick` import to shorten "Jan 2025" → "Jan 25" on mobile X-axis.
- Mobile: chart height 460px → 320px; bottom margin 68-76px → 46px.
- Mobile: X-axis font 12px → 9px; angle -55° → -45°; height 72-78px → 46px.
- Mobile: Y-axis width 52px → 44px; tick font 12px → 10px.
- Mobile: "Cost (£)" side-label column 20px → 14px wide, font 9px.
- Mobile: Legend height 48px → 36px; font 13px → 10px; tighter gaps.
- Desktop fix: `desktopLegendHeight` calculated dynamically as `ceil(activeCategories.length / 5) * 30` so wrapped legend rows no longer overflow into the chart area. Chart top margin and container height grow with the legend. Previously fixed at 40px regardless of how many filter items were selected.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/OverheadTrendsChart.jsx`

---
**Timestamp:** 2026-04-13T12:30:00Z
**Summary:** Desktop fix — move Overhead Trends legend outside Recharts to prevent chart overlap when all categories are selected.
**Files:**
- frontend/src/components/dashboard/OverheadTrendsChart.jsx
**Details:**
- Removed `<Legend>` from inside `<AreaChart>` on desktop. When 20+ categories were selected the Recharts legend grew to 200px+ and pushed the chart area down, overlapping Y-axis tick labels.
- Added a custom `<div>` legend rendered above the chart container on desktop — flex-wrap with colour dots + labels, always outside the SVG so it can never overlap.
- Mobile keeps the `<Legend>` inside Recharts at the bottom (compact 10px, 36px height).
- Chart top margin and container height restored to fixed values (no longer need to grow dynamically).
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/OverheadTrendsChart.jsx`

---
**Timestamp:** 2026-04-13T13:30:00Z
**Summary:** Fix Overhead Trends tooltip — scrollable rows, clean label truncation, compact sizing.
**Files:**
- frontend/src/components/dashboard/OverheadTrendsChart.jsx
**Details:**
- Added `shortLabel()` helper: truncates at 17 chars with ellipsis (e.g. "Travelling and En…") instead of cutting at word 2 ("Travelling and:").
- Tooltip rows section: `maxHeight: 260px` + `overflowY: auto` so 20+ categories scroll inside the tooltip rather than overflowing the page.
- Reduced row gap (6→4px), dot size (8→7px), body font (13/15→12/11px) for compactness.
- Desktop `CustomTooltip`: removed `whiteSpace: nowrap` from outer wrapper (rows control their own), set `minWidth:200, maxWidth:260`.
- Mobile absolute tooltip: `maxHeight: 70%` + `overflowY: auto` + `maxWidth: 210px`.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/OverheadTrendsChart.jsx`

---
**Timestamp:** 2026-04-13T14:00:00Z
**Summary:** Fix Overhead Trends mobile tooltip — full-width single-column below chart, full label names visible.
**Files:**
- frontend/src/components/dashboard/OverheadTrendsChart.jsx
**Details:**
- Removed mobile absolute-positioned tooltip from inside chart div (labels were too narrow and unreadable in 2-col grid).
- Mobile tooltip now renders full-width below the chart and above the summary cards — single column with complete category names and values.
- Refactored TooltipBody into TooltipRows component that accepts twoCol prop: desktop uses 2-col grid with 14-char truncation; mobile uses single column with full labels.
- Desktop tooltip unchanged (2-col grid when > 6 categories).
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/OverheadTrendsChart.jsx`

---
**Timestamp:** 2026-04-13T15:00:00Z
**Summary:** Mobile fix — Bar Chart Comparison in Metrics Comparison page (Plotly), increase bottom margin and fix tick angle for site name labels.
**Files:**
- frontend/src/pages/MetricsComparison.jsx
**Details:**
- Bottom margin: `b: isMobile ? 10 : 100` → `b: isMobile ? 90 : 100` — 10px was far too small for rotated site name labels.
- Tick angle: `tickangle: isMobile ? -90 : -45` → `isMobile ? -55 : -45` — less steep so labels are more readable.
- Tick font size: `isMobile ? 8 : 10` → `isMobile ? 9 : 10` — slightly larger for legibility.
- Hover label font: `isMobile ? 13 : 14` → `isMobile ? 12 : 14` — compact to avoid overflow.
- Left margin: `l: isMobile ? 42 : 60` → `isMobile ? 44 : 60` — slight increase for Y-axis values.
- Desktop layout unchanged.
**Undo / Rollback:**
- Revert `b`, `tickangle`, `tickfont.size`, `hoverlabel.font.size`, and `l` in the Plotly layout object inside `MetricsComparison.jsx`.

---
**Timestamp:** 2026-04-13T16:00:00Z
**Summary:** Mobile fix — Site Comparison page: bar chart overflow, mini charts stacking, long metric label, photo gallery title.
**Files:**
- frontend/src/components/comparison/ComparisonBarChart.jsx
- frontend/src/components/comparison/ComparisonMetrics.jsx
- frontend/src/components/comparison/SitePhotoGallery.jsx
**Details:**
- `ComparisonBarChart`: `chartHeight` 280→320px mobile; replaced `innerHeight='80%'` with `chartInnerPx=220px` (pixel value) — percentage of a fixed-height card caused ResponsiveContainer to overflow the card on mobile.
- `ComparisonBarChart`: PPL & Labour mini charts: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — side-by-side on mobile (~175px each) was too narrow; now stacks full-width. `miniChartHeight` 220→200px.
- `ComparisonBarChart`: Mini chart Y-axis width `32→36px`, margins `left:-8→0, bottom:16→24` mobile.
- `ComparisonMetrics`: Added `labelMobile: "Labour Cost %"` to "Labour Cost as % of fuel sales" metric. Rendered via `sm:hidden` / `hidden sm:inline` spans — long label overflowed the 1/3 column on mobile.
- `SitePhotoGallery`: Header `mb-4→mb-3 sm:mb-4`, title `text-lg→text-base sm:text-lg`.
- Desktop unchanged.
**Undo / Rollback:**
- `git restore frontend/src/components/comparison/ComparisonBarChart.jsx frontend/src/components/comparison/ComparisonMetrics.jsx frontend/src/components/comparison/SitePhotoGallery.jsx`

---
**Timestamp:** 2026-04-13T16:30:00Z
**Summary:** Site Comparison — replace stock photos with real site images; fix pie chart mobile responsiveness.
**Files:**
- frontend/src/components/comparison/SitePhotoGallery.jsx
- frontend/src/components/comparison/ComparisonPieCharts.jsx
**Details:**
- `SitePhotoGallery`: Replaced `buildSlides()` stock rotation (`/station-X.jpg`) with the real site photo `/sites/site-${siteId}.jpg` — same source used by `SiteCard` and Metrics Comparison page. Since each site has one photo the carousel controls and thumbnails are hidden (slides.length === 1). Updated description text.
- `ComparisonPieCharts`: Added `isMobile` state + resize listener. Split `CHART_TOOLTIP_RESERVE_PX` into `CHART_TOOLTIP_RESERVE_DESKTOP=68` / `CHART_TOOLTIP_RESERVE_MOBILE=44`. `tooltipReservePx` derived from `isMobile` — used in both Chart.js `layout.padding.bottom` and the center-label `style.bottom`, freeing 24px of dead space under the arc on mobile. Chart container width/height increased to `min(240px, 100vw-48px)` on mobile (was 220px). `SalesMixLegend` rows: `space-y-3→space-y-2`, `px-3 py-2.5→px-2.5 py-2`, font `text-sm→text-xs sm:text-sm` on mobile.
- Desktop unchanged.
**Undo / Rollback:**
- `git restore frontend/src/components/comparison/SitePhotoGallery.jsx frontend/src/components/comparison/ComparisonPieCharts.jsx`

---
**Timestamp:** 2026-04-13T17:00:00Z
**Summary:** Mobile fix — Header company name legibility (9px stacked → 11px single line).
**Files:**
- frontend/src/components/dashboard/Header.jsx
**Details:**
- Removed 3-line stacked `sm:hidden` span at `text-[9px]` and a separate `hidden sm:block` span.
- Replaced with a single `<span>` that scales: `text-[11px]` mobile → `text-xs` sm → `text-sm` md → `text-base` lg, with `truncate` to prevent overflow.
- "HIGHWAY STOPS RETAIL LIMITED" now renders as one readable line on mobile instead of three tiny unreadable stacked lines.
- Desktop unchanged.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/Header.jsx`

---
**Timestamp:** 2026-04-13T17:45:00Z
**Summary:** Hide "Download App" button on desktop (lg+) in Sidebar.
**Files:**
- frontend/src/components/dashboard/Sidebar.jsx
**Details:**
- Added `lg:hidden` to the Android App download button container. The `isAndroid` user-agent check alone was insufficient — Chrome DevTools Android emulation and localhost testing on Android both trigger it on desktop screens. Now hidden at lg+ (≥1024px, where the sidebar is docked).
**Undo / Rollback:**
- Remove `lg:hidden` from the download button wrapper div in Sidebar.jsx.

---
**Timestamp:** 2026-04-13T17:30:00Z
**Summary:** Mobile header — company name takes full Row 1 width; menu button moved to Row 2 on mobile.
**Files:**
- frontend/src/components/dashboard/Header.jsx
**Details:**
- On mobile: menu button hidden from Row 1 (`hidden sm:flex`). Company name div gets the entire first row — full width, `text-base font-extrabold tracking-widest`.
- A second menu button instance added to Row 2 (`sm:hidden`) so ≡ is still accessible on mobile, sitting left of Sales/toggles/HSRL.
- On sm+: original layout fully restored — single horizontal bar with [≡][name] left and [sales][toggles][HSRL] right. Desktop unchanged.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/Header.jsx`

---
**Timestamp:** 2026-04-13T18:30:00Z
**Summary:** Mobile header Row 2 — stack menu + HSRL above full-width sales/toggles; desktop unchanged.
**Files:**
- frontend/src/components/dashboard/Header.jsx
**Details:**
- Below `sm`, Row 2 is `flex-col`: first row `justify-between` (hamburger + HSRL only), second row full-width `flex-wrap` for Sales badge and switches with slightly larger vertical gap (`gap-y-2`).
- HSRL badge duplicated for mobile-only row (`sm:hidden`) vs desktop (`hidden sm:flex` + existing `border-l`); all `md:` / `lg:` classes on badges and outer header left unchanged.
- Preserved `sm:flex-row sm:items-center sm:justify-end sm:gap-2 lg:gap-4` so sm+ layout matches prior behavior.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/Header.jsx`

---
**Timestamp:** 2026-04-13T19:15:00Z
**Summary:** Tighter mobile header vertical spacing — less padding and gaps; desktop (sm+) unchanged.
**Files:**
- frontend/src/components/dashboard/Header.jsx
**Details:**
- Outer header: `gap-2`→`gap-1`, `py-2`→`py-1.5` below `sm`; title row wrapper `py-1`→`py-0` on mobile.
- Row 2: `min-h-11`→`min-h-0`, column `gap-2`→`gap-1` on mobile; controls row `gap-y-2`→`gap-y-1` with `sm:gap-y-0` + `sm:flex-nowrap`.
- Sales pill: `py-1.5`→`py-1` on mobile (`sm:py-2 lg:py-2.5` unchanged). Toggle shells: `py-0.5 sm:py-1`, `gap-1.5 sm:gap-2`.
- Mobile-only menu: `p-1`, icon `w-4 h-4`. Mobile-only HSRL chip uses compact `h-6` / `text-[11px]` (desktop HSRL block unchanged).
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/Header.jsx`

---
**Timestamp:** 2026-04-13T19:45:00Z
**Summary:** Hamburger + company name on same line; two clean rows on mobile; desktop unchanged.
**Files:**
- frontend/src/components/dashboard/Header.jsx
**Details:**
- Removed duplicate mobile-only hamburger block (`sm:hidden`) — single hamburger button now visible at all sizes (`p-1 sm:p-1.5`, icon `w-4 h-4 sm:w-5 sm:h-5`).
- Row 1 mobile: `[≡] HIGHWAY STOPS RETAIL LIMITED` on one line. Company text `text-sm font-bold tracking-wide` on mobile, unchanged at `sm:text-xs md:text-sm lg:text-base`.
- Row 2 mobile: `[Sales] [toggle] [HSRL]` — flat single row with `flex-wrap`, HSRL badge always visible with `border-l` separator (`h-6 text-[10px]` mobile, `sm:h-8 lg:h-10` desktop).
- Removed the stacked `flex-col gap-1` wrapper from Row 2 — now a flat `flex items-center` at all sizes.
- All `sm:` / `md:` / `lg:` classes on the outer header, sales pill, toggles, and HSRL badge preserved.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/Header.jsx`

---
**Timestamp:** 2026-04-13T00:00:00Z
**Summary:** Mobile: fix clipped EBITDA / ROI % axis titles on Site ROI Trend chart.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
**Details:** Widened mobile Y-axis bands (GBP 44->56, PCT 40->48), added 8px horizontal chart margin, and repositioned insideLeft/insideRight rotated labels (dx adjusted, textAnchor middle, fontSize 10, bold) so 'EBITDA (£)' and 'ROI %' are fully legible next to tick numbers on mobile. Desktop (sm+) branches untouched.
**Undo / Rollback:** git restore frontend/src/pages/LatestPetrol.jsx


---
**Timestamp:** 2026-04-13T00:10:00Z
**Summary:** Mobile: Site ROI Trend tooltip no longer overlaps chart lines.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
**Details:** Moved the mobile-only ROI trend tooltip out of the 320px chart plot container and up into the CardContent header area (top: -48, right: 8), added `relative` to CardContent for positioning context, gated the node with `sm:hidden` so desktop is untouched, and slimmed layout (horizontal EBITDA/ROI rows, 9px font, dropped Investment/Net profit lines) so it sits compactly over the 'Total EBITDA' pill without covering data points. Desktop tooltip (RoiTrendChartTooltip) unchanged.
**Undo / Rollback:** git restore frontend/src/pages/LatestPetrol.jsx

---
**Timestamp:** 2026-04-13T00:20:00Z
**Summary:** Mobile: ROI Trend EBITDA/ROI% axis titles no longer overlap tick numbers.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
**Details:** Widened mobile GBP axis 56->62 and PCT axis 48->52, reduced mobile tick font 10->9, and shifted the rotated 'EBITDA'/'ROI %' labels to the outer edge of each axis band (dx -48 left / +38 right) so they sit in their own column clear of '£1.10M' / '0.9%' tick values. Desktop branches unchanged.
**Undo / Rollback:** git restore frontend/src/pages/LatestPetrol.jsx

---
**Timestamp:** 2026-04-13T00:30:00Z
**Summary:** Mobile: Overhead Trends 'Cost (£)' axis label legibility.
**Files:**
- frontend/src/components/dashboard/OverheadTrendsChart.jsx
**Details:** Widened mobile-only rotated label column 14 -> 18px with 2px right padding, bumped font 9 -> 10px, switched color from muted-foreground to foreground for stronger contrast. Desktop (smUp) branch and chart size unchanged.
**Undo / Rollback:** git restore frontend/src/components/dashboard/OverheadTrendsChart.jsx

---
**Timestamp:** 2026-04-13T00:45:00Z
**Summary:** Fuel Profit & Gross Profit: include 5041 + 5046-5049 on cost side.
**Files:**
- backend/routes/petrolDataSage.js
- backend/utils/sageDashboard.js
**Details:** Added nominal codes 5041 (Fuel Commission), 5046 (Stock Movement-Unleaded), 5047 (Stock Movement-Diesel), 5048 (Stock Movement-Super Unleaded), 5049 (Stock Movement-Super Diesel) to FUEL_PROFIT_NOMINAL_CODES / FUEL_PROFIT_COST_CODES (Latest Petrol Fuel Profit set, now 18 codes) AND to NET_PROFIT_COST_CODES (Gross Profit card). Mirrored to FUEL_PROFIT_14_CODES in sageDashboard.js so all-sites dashboard matches. Updated FUEL_PROFIT_NC_NAMES (5050 renamed to 'Stock Movement-Adblue' and 5046-5049 added). CODES_DB_POSITIVE_AS_NEGATIVE extended for consistency. Fuel Profit (Latest Petrol), Gross Profit Breakdown 'Fuel' row, Avg PPL, Actual PPL and EBITDA downstream values will all shift by the signed net of these five codes over the selected date range.
**Undo / Rollback:** git restore backend/routes/petrolDataSage.js backend/utils/sageDashboard.js

---
**Timestamp:** 2026-04-13T14:30:00Z
**Summary:** Env-driven subpath deployment — BASE_PATH / VITE_BASE_PATH support for dashboard.credentia.biz/hsrl (and future /prl).
**Files:**
- frontend/vite.config.mjs
- frontend/src/App.jsx
- frontend/src/services/api.js
- frontend/.env.example
- backend/.env.example
- backend/.env
**Details:**
- Frontend now reads `VITE_BASE_PATH` (frontend/.env) with fallback to `BASE_PATH` (backend/.env). Default "/" = root deployment.
- `vite.config.mjs`: added `base: viteBase` (with trailing slash) + defines `import.meta.env.VITE_BASE_PATH` for client code.
- `App.jsx`: `<BrowserRouter basename={ROUTER_BASENAME}>` uses the same env var (without trailing slash, `undefined` when root).
- `api.js`: `API_BASE_URL` now falls back to the base path when `VITE_API_URL` is unset — so `api.fetch('/api/foo')` resolves to `/hsrl/api/foo` at subpath deploys.
- Set `BASE_PATH=/hsrl` and `FRONTEND_URL=https://dashboard.credentia.biz/hsrl` in backend/.env for live deployment.
- For the PRL dashboard, the same codebase can be configured with `BASE_PATH=/prl` and redeployed — no code changes needed.
**Undo / Rollback:**
- Remove `BASE_PATH` from backend/.env, revert `FRONTEND_URL` to previous value.
- `git restore frontend/vite.config.mjs frontend/src/App.jsx frontend/src/services/api.js frontend/.env.example backend/.env.example`

---
**Timestamp:** 2026-04-15T10:00:00Z
**Summary:** Total Site Revenue Breakdown — show 4100 & 4102 as negative (BP commissions are costs, not revenue).
**Files:**
- frontend/src/components/dashboard/CardDetailModal.jsx
- frontend/src/pages/LatestPetrol.jsx
**Details:**
- `ThreeColumnBreakdownRow` now accepts a `negative` prop. When true, value and percentage are prefixed with `−` and rendered in `text-destructive` (red).
- In LatestPetrol.jsx Total Site Revenue Breakdown modal, codes 4100 (Bunkering Charges/BP Commission) and 4102 (Bunkered Commission) are flagged as cost codes — they are stored positive in DB but reduce net fuel sales. Now displayed with a negative sign (e.g. −£225,578.81 / −2.1%).
- This fixes the discrepancy where Fuel Sales total (£10.64M, net) didn't match the sum of its sub-products (£11.09M, abs) — sub-rows now correctly show 4100/4102 as deductions, so Fuel Sales = Σ(positive codes) − 4100 − 4102.
- Sub-percentages now correctly reconcile with the parent Fuel Sales 96.8%.
**Undo / Rollback:**
- `git restore frontend/src/components/dashboard/CardDetailModal.jsx frontend/src/pages/LatestPetrol.jsx`

---
**Timestamp:** 2026-04-15T11:00:00Z
**Summary:** Total Site Revenue Breakdown — exact percentage reconciliation using Largest Remainder method.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
**Details:**
- Parent values (Fuel Sales, Shop Sales, Coffee & Valet) now derived from sum of children with correct signs (4100/4102 subtracted as costs).
- Total Revenue derived from sum of parents — internally consistent, no API/breakdown drift.
- Largest Remainder (Hamilton) method applied across all leaf items: raw % computed in tenths-of-percent, floored, then leftover tenths distributed to items with highest fractional remainder. Guarantees Σ all leaf %s = 100.0% exactly.
- Parent % = sum of its children %s — Fuel parent % = sum of fuel children %s, etc.
- Removed redundant `pctOfRev` calls; all percentages now sourced from the reconciled `pctMap`.
**Undo / Rollback:**
- `git restore frontend/src/pages/LatestPetrol.jsx`

---
**Timestamp:** 2026-04-15T11:30:00Z
**Summary:** Total Site Revenue Breakdown — sub-products % is now relative to parent (sums to 100% within each section). Also fixed −0.0% display.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
- frontend/src/components/dashboard/CardDetailModal.jsx
**Details:**
- Sub-product percentages now calculated against their immediate parent (Fuel children / Fuel Sales total, Shop children / Shop Sales total, Coffee & Valet children / Coffee & Valet total). Each section sums to 100%.
- Top-level (Fuel/Shop/Valet) remain as % of Total Revenue — also sum to 100%.
- Largest Remainder method applied separately per group (4 groups: fuel children, shop children, valet children, top-level) for exact 100% reconciliation at 1 decimal precision.
- `ThreeColumnBreakdownRow`: when a value rounds to 0.0% the negative sign is suppressed (e.g. `−£4,389.88` with `0.0%` instead of `−0.0%`).
- Updated modal description text to reflect the new logic.
**Undo / Rollback:**
- `git restore frontend/src/pages/LatestPetrol.jsx frontend/src/components/dashboard/CardDetailModal.jsx`

---
**Timestamp:** 2026-04-15T12:00:00Z
**Summary:** Total Site Revenue Breakdown — revert to single denominator (Total Revenue). Children sum to parent %.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
**Details:**
- All leaf percentages now computed against Total Revenue (single denominator).
- Largest Remainder method applied across all leaves at once → leaf %s sum exactly to 100.0%.
- Parent % = sum of its children %s — guaranteed reconciliation:
  - Fuel children %s sum exactly to Fuel Sales parent % (e.g. 96.9%).
  - Shop children %s sum exactly to Shop Sales parent % (e.g. 1.4%).
  - Coffee & Valet children %s sum exactly to Coffee & Valet parent % (e.g. 1.7%).
  - Fuel + Shop + Coffee & Valet = exactly 100.0% (Total Revenue).
- Reverted previous per-section 100% behaviour which contradicted the user's intent.
**Undo / Rollback:**
- `git restore frontend/src/pages/LatestPetrol.jsx`

---
**Timestamp:** 2026-04-15T12:30:00Z
**Summary:** Total Site Revenue Breakdown — small non-zero %s now show real value (e.g. −0.1%) instead of 0.0%.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
- frontend/src/components/dashboard/CardDetailModal.jsx
**Details:**
- pctMap now stores both `adjusted` (Largest Remainder rounded for sum reconciliation) and `raw` (full precision) percentages per leaf.
- `getLeafPct()` returns adjusted unless it rounds to 0 and raw is non-zero — in that case returns the raw % so the user sees the real magnitude.
- `ThreeColumnBreakdownRow` percentage display uses adaptive precision: 1 decimal for ≥0.05%, 2 decimals for ≥0.005%, 3 for ≥0.0005%, 4 for smaller.
- Result: 4102 Bunkered Commission (−£4,389.88) now shows `−0.1%` instead of `0.0%`.
- Parent reconciliation still works: parent % = sum of children's adjusted %s.
**Undo / Rollback:**
- `git restore frontend/src/pages/LatestPetrol.jsx frontend/src/components/dashboard/CardDetailModal.jsx`

---
**Timestamp:** 2026-04-15T13:00:00Z
**Summary:** Total Site Revenue Breakdown — exact percentages with 3+ decimal precision (no rounding artifacts).
**Files:**
- frontend/src/pages/LatestPetrol.jsx
- frontend/src/components/dashboard/CardDetailModal.jsx
**Details:**
- Removed Largest Remainder method — all percentages now computed as raw value / Total Revenue * 100.
- Parent % = mathematical sum of children raw %s — guarantees exact reconciliation at full precision.
- Display uses adaptive precision: 3 decimals minimum, expanding to 4/5/6 for very small values.
- 4102 Bunkered Commission (−£4,389.88) now shows real value (e.g. −0.077%) instead of −0.1% approximation.
- Sum of all leaves = exactly 100.000% (within floating-point tolerance).
- Zero values still show as 0.000% (no negative sign).
**Undo / Rollback:**
- `git restore frontend/src/pages/LatestPetrol.jsx frontend/src/components/dashboard/CardDetailModal.jsx`

---
**Timestamp:** 2026-05-18T12:30:00Z
**Summary:** Add nominal code 5016 (Grocery) to SHOP_COST_CODES so it is counted in Shop Profit / Gross Profit.
**Files:**
- backend/routes/petrolDataSage.js
- README.md
**Details:**
- `SHOP_COST_CODES` updated from `['5032','5033','5034','5035','5036','5037','5039','5042']` to `['5016','5032','5033','5034','5035','5036','5037','5039','5042']` in backend/routes/petrolDataSage.js:902.
- Single source of truth — `SHOP_COST_SQL` (derived from this constant) drives every shop-cost query, so `/shop-profit`, the Gross Profit card (`getGrossProfit`), `getShopProfitMetrics`, EBITA, monthly-trends, and every other endpoint that subtracts shop cost are all updated by this one edit.
- README.md table for `/shop-profit` updated to reflect the new cost list. While editing the doc row, also corrected pre-existing drift: sales side now correctly lists `4039` (EV Revenue) instead of `5035`, and cost side now correctly includes `5035` (Paypoint/Keycharge Commissions) which was missing from the doc but always present in the code.
- Impact (March 2026): Shop cost for Swanley +£350.26, Lye +£1,804.50 → corresponding reduction in Shop Profit and Gross Profit at those two sites only (those are the only sites with 5016 rows in March 2026).
**Undo / Rollback:**
- `git restore backend/routes/petrolDataSage.js README.md`
- Or remove `'5016'` from `SHOP_COST_CODES` array and revert README row.

---
**Timestamp:** 2026-05-18T12:45:00Z
**Summary:** Fix Gross Profit KPI — shop/valet losses now correctly subtract from GP (drop outer Math.abs in getGrossProfit).
**Files:**
- backend/routes/petrolDataSage.js
**Details:**
- In `getGrossProfit` (backend/routes/petrolDataSage.js:325, 328), removed the outer `Math.abs(...)` wrappers on `shopProfit` and `valetProfit`. They were computed as `Math.abs(sales - cost)`, which converted any shop/valet loss into a positive contribution to GP — over-counting by 2 × the loss amount.
- Now: `shopProfit = shopSales − shopCost` and `valetProfit = valetSales − valetCost`. Both are signed; a loss subtracts from GP.
- Surfaced after 5016 (Grocery) was added to SHOP_COST_CODES — Swanley's shop went from +£195.27 to −£154.99, and Lye's from −£833.05 to −£2,637.55. Before this fix, those losses inflated GP instead of reducing it.
- Verified impact (March 2026):
  - Swanley GP: £49,589.72 → £49,279.74 (correct)
  - Lye GP: £76,482.17 → £71,207.07 (correct)
- `fuelProfit` line was NOT touched — it stays `Math.abs(fuelRev - fuelCostVal)`. Fuel revenue/cost magnitudes always order revenue > cost in practice, so behaviour is unchanged.
- Other shop-profit endpoints (`/shop-profit`, `getShopProfitMetrics`, monthly-trends shop, etc.) already used signed subtraction — this fix only changes the GP aggregator that the dashboard's Gross Profit KPI card consumes.
**Undo / Rollback:**
- `git restore backend/routes/petrolDataSage.js`
- Or revert lines 325 & 328 to: `const shopProfit = Math.abs(shopSales - shopCost);` and `const valetProfit = Math.abs(valetSales - valetCost);`

---
**Timestamp:** 2026-05-18T13:00:00Z
**Summary:** Fix Gross Profit KPI card + breakdown modal — shop/valet losses now correctly subtract from GP on the dashboard UI.
**Files:**
- frontend/src/pages/LatestPetrol.jsx
**Details:**
- After the backend fix (`getGrossProfit` dropped Math.abs on shop/valet, see 2026-05-18T12:45:00Z entry), the dashboard's "Gross Profit" KPI card still showed the inflated value because the frontend re-applied `Math.abs` to each component before summing.
- Three connected spots changed, all in `LatestPetrol.jsx`:
  1. Line ~1491-1502 (the `setTotalNetProfit` state setter): `shopMag = Math.abs(shopProfit)` and `valetMag = Math.abs(valetProfit)` → `shopSigned = Number(shopProfit)` and `valetSigned = Number(valetProfit)` (kept fuelMag as Math.abs since fuel is always positive).
  2. Line ~649-652 (GP KPI card component): dropped `Math.abs` on `data?.shopProfit` and `data?.valetProfit` before summing.
  3. Lines ~3217-3220 and ~3260-3261 (Gross Profit Breakdown modal): switched `shopMag`/`valetMag` to `shopSigned`/`valetSigned`, and passed signed values into `<BreakdownRow>` which already renders negatives in red via the existing `isNeg` styling.
- Verified UI impact: Swanley GP card now reads £49,279.74 (was £49,589.72), matching the EBITDA card's "Gross Profit:" sub-line which was already showing the correct value.
- Per the mobile-responsiveness constraint in CLAUDE.md: this change touches data/calculation logic, not Tailwind classes — no layout was modified. Desktop and mobile renders are unaffected structurally.
**Undo / Rollback:**
- `git restore frontend/src/pages/LatestPetrol.jsx`
- Or wrap shop/valet values back in `Math.abs(...)` at the three spots noted above.

---
**Timestamp:** 2026-05-18T13:30:00Z
**Summary:** Sweep all pages/tabs — every remaining Math.abs-on-loss aggregation now uses signed math; loss display drops the negative sign in the GP breakdown modal.
**Files:**
- backend/routes/petrolDataSage.js
- frontend/src/components/comparison/SiteComparison.jsx
- frontend/src/components/dashboard/ShopValetMonthlyComboCharts.jsx
- frontend/src/pages/LatestPetrol.jsx
**Details:**
- **Backend `getNetProfitForSite`** (petrolDataSage.js:1169-1170): `shopProfit = Math.abs(...)`, `valetProfit = Math.abs(...)` → signed. Powers the Comparison page's per-site rankings and Total Net Profit per-site rollup. Also dropped `Math.abs(profit)` in the gross-margin calc on line 1176 so a loss correctly drives margin negative.
- **Backend `/monthly-trends`** (petrolDataSage.js:2290, 2293): `shopProfit = Math.abs(shopSales - shopCost)`, same for valet → signed. The monthly trend chart and the Shop/Valet combo chart now reflect actual loss months.
- **Frontend `SiteComparison.jsx`** (215-217, 221): Math.abs on `shopProfit`, `valetProfit`, and the `Math.abs(profit)` in margin calc → signed. This is the Comparison page's two-site side-by-side data path.
- **Frontend `LatestPetrol.jsx`** (1979-1980): props passed to `FuelGradeMixChart` no longer Math.abs the shop/valet inputs — the pie chart's `> 0.01` slice filter still hides losses from showing as slices, but the chart's internal total is now correct.
- **Frontend `ShopValetMonthlyComboCharts.jsx`** (67-70): monthly shop/valet profit now signed → loss months render as negative bars and negative margin.
- **GP Breakdown modal `BreakdownRow`** (LatestPetrol.jsx:3225-3243): dropped `−` prefix and red styling on row display per user request — rows show magnitude only; total at the bottom still uses signed math (Total Gross Profit reflects subtractions).
- Verified across pages for March 2026 — Swanley GP = £49,279.74, Lye GP = £71,207.07 on Dashboard, Comparison (per-site), and Monthly Trends endpoints. Combined GP = £815,543.16 (was £839,324.36 before this sweep — over-counting of −£23,781.20 removed).
- Display-only Math.abs in the EBITDA detail modal (LatestPetrol.jsx:3399-3401) was intentionally left as magnitude formatting — consistent with the "no negative sign in displays" preference.
**Undo / Rollback:**
- `git restore backend/routes/petrolDataSage.js frontend/src/components/comparison/SiteComparison.jsx frontend/src/components/dashboard/ShopValetMonthlyComboCharts.jsx frontend/src/pages/LatestPetrol.jsx`
- Or wrap each touched site/component back in `Math.abs(...)` per the locations above.

---
**Timestamp:** 2026-05-18T14:00:00Z
**Summary:** Reduce Postgres connection-pool size from 40 to 10 to avoid exhausting the shared remote DB server when another project (games) runs side-by-side.
**Files:**
- backend/config/database.js
**Details:**
- Both `getConnectionConfig` branches (DATABASE_URL branch at ~line 35 and individual-settings branch at ~line 58) updated:
  - `max: 40` → `max: 10`
  - `idleTimeoutMillis: 60000` → `30000`
  - `connectionTimeoutMillis: 30000` → `10000`
- Motivation: HSRL backend + games project (Prisma) both connect to the same Postgres at 164.52.192.205:5432. HSRL alone was reserving up to 40 connections; with games' default ~10-17 they could approach the server's max_connections limit, causing new HSRL connection attempts to hang for 30s and the dashboard to "stop working" while games runs.
- New behaviour: HSRL holds at most 10 active connections; the dashboard's 20+ parallel API calls queue briefly inside Node's event loop instead of opening more sockets. No user-visible latency change in practice (queue drains in milliseconds).
- No business logic, KPI math, calculation, or query change. Pool-tuning only.
- Recommended companion change on the games project (NOT applied here — different repo): append `&connection_limit=10` to its DATABASE_URL so Prisma matches the cap.
**Undo / Rollback:**
- `git restore backend/config/database.js`
- Or set the three values back to `max: 40`, `idleTimeoutMillis: 60000`, `connectionTimeoutMillis: 30000` in both branches.

---
**Timestamp:** 2026-05-19T09:45:40Z
**Summary:** Added dashboard user tony.head@highwaystops.co.uk (role='user') to hsrl_dashboard_users.
**Files:**
- (DB only — no source file changes; temporary script `_tmp_add_user.mjs` was created in backend/, run once, and deleted.)
**Details:**
- New row inserted: id=27, email='tony.head@highwaystops.co.uk', role='user', email_verified_at=NOW() so the user can sign in immediately without going through email verification.
- Password stored as a bcrypt hash (cost 12) via the same `bcrypt.hash(password, 12)` used by `syncAdminFromEnv` in backend/lib/bootstrapAuth.js — the plaintext was never written to disk.
- Script was idempotent (UPSERT semantics) — re-running it would have updated the password hash without duplicating the row.
**Undo / Rollback:**
- `DELETE FROM hsrl_dashboard_users WHERE email = 'tony.head@highwaystops.co.uk' AND role = 'user';`

---
**Timestamp:** 2026-05-19T09:55:00Z
**Summary:** Added dashboard user shilan@highwaystops.co.uk (role='user') to hsrl_dashboard_users in 164.52.192.205/hsrldb.
**Files:**
- (DB only — temporary script `_tmp_add_user_shilan.mjs` was created in backend/, run once, and deleted.)
**Details:**
- Insert into hsrl_dashboard_users with role='user', email_verified_at=NOW(), bcrypt(password, 12) hash.
- Verified post-insert with bcrypt.compare against the entered password — MATCH.
- Same caveat as the Tony Head row: this writes to the DB the local backend is connected to (164.52.192.205/hsrldb). If the production app at dashboard.credentia.biz/hsrl uses a different DB, this user must be added there separately.
**Undo / Rollback:**
- `DELETE FROM hsrl_dashboard_users WHERE email = 'shilan@highwaystops.co.uk' AND role = 'user';`

---
**Timestamp:** 2026-05-19T12:15:00Z
**Summary:** Add nominal code 4405 (Insurance Claims & Compensations) to MISC_INCOME_CODES so it counts in the EBITA card's "Misc Income" line and any downstream EBITA / Net Profit aggregation.
**Files:**
- backend/routes/petrolDataSage.js
**Details:**
- `MISC_INCOME_CODES` at backend/routes/petrolDataSage.js:1485 updated from 12 codes to 13: added '4405' between '4404' and '4407'.
- Single source of truth — `MISC_INCOME_SQL` (derived from this constant) drives every misc-income query (/ebita, total-net-profit, monthly-trends, ROI, etc.), so one edit propagates to all callers.
- All other shop-side / fuel-side / overheads buckets unchanged.
**Undo / Rollback:**
- `git restore backend/routes/petrolDataSage.js`
- Or remove `'4405'` from MISC_INCOME_CODES.

---
**Timestamp:** 
**Summary:** Added workflow.md — concise end-to-end dashboard calculation reference (KPI cards, charts, pies, tables).
**Files:**
- workflow.md
**Details:** Documented data flow (Mermaid) and the real formula for every dashboard KPI/chart/pie/table across dashboard.js, petrolDataSage.js, sageDashboard.js, sites.js, plus frontend components. Excludes auth/admin. Generated by reading actual code.
**Undo / Rollback:** git restore workflow.md (or delete it)

---
**Timestamp:** 2026-06-15T00:00:00Z
**Summary:** Security hardening before first full push to GitHub — removed a real SMTP credential from .env.example and expanded .gitignore.
**Files:**
- backend/.env.example
- .gitignore
**Details:**
- backend/.env.example contained a REAL Gmail App Password (SMTP_USER/SMTP_PASS/SMTP_FROM) in the working tree; replaced with placeholders before it could be committed. Verified the secret was never in git history (HEAD had no SMTP lines) — no history rewrite needed.
- Hardened root .gitignore: added more spreadsheet/data formats (xlsm, xlsb, ods, tsv, sqlite, db, dump, parquet), secrets/keys/certs (pem, key, p12, pfx, cer, crt, ppk, id_rsa*, .npmrc, .netrc, *credentials*.json, service-account*.json), and Vite build temp artifacts (*.timestamp-*.mjs).
**Undo / Rollback:** git restore backend/.env.example .gitignore
