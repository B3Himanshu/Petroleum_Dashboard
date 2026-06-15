import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_TOKEN_KEY } from "@/services/api";

const ADMIN_PROFILE_KEY = 'hsrl_admin_profile';
function useWelcomeName() {
  const { user } = useAuth();
  if (user?.email) {
    const full = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return full || user.email.split("@")[0];
  }
  const adminRaw = typeof localStorage !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  if (adminRaw) {
    try {
      const p = JSON.parse(atob(adminRaw.split(".")[1]));
      if (p.role === "admin" && Date.now() < p.exp * 1000) {
        const cached = localStorage.getItem(ADMIN_PROFILE_KEY);
        if (cached) {
          const pr = JSON.parse(cached);
          const full = [pr.firstName, pr.lastName].filter(Boolean).join(" ");
          if (full) return full;
        }
        return p.username || "Admin";
      }
    } catch {}
  }
  return null;
}
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { 
  Fuel, 
  CalendarDays, 
  TrendingUp, 
  TrendingDown,
  PoundSterling, 
  ShoppingBag, 
  Users,
  Sparkles,
  Car,
  BarChart3,
  PieChart,
  Droplets
} from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CardDetailModal, DetailItem, ThreeColumnBreakdownRow } from "@/components/dashboard/CardDetailModal";
import { MonthlyFuelPerformanceChart } from "@/components/dashboard/MonthlyFuelPerformanceChart";
import { VolumeVsPPLChart } from "@/components/dashboard/VolumeVsPPLChart";
import { ShopMonthlyComboChart, ValetMonthlyComboChart } from "@/components/dashboard/ShopValetMonthlyComboCharts";
import { PPLComparisonChart } from "@/components/dashboard/PPLComparisonChart";
import { PetrolTopPerformingSitesTable } from "@/components/dashboard/PetrolTopPerformingSitesTable";
import { PetrolSitesNeedingImprovementTable } from "@/components/dashboard/PetrolSitesNeedingImprovementTable";

import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  ReferenceLine,
} from "recharts";
import { FuelGradeMixChart } from "@/components/dashboard/FuelGradeMixChart";
import { ShopProductCategoriesChart } from "@/components/dashboard/ShopProductCategoriesChart";
import { ValetingCategoriesChart } from "@/components/dashboard/ValetingCategoriesChart";
import { BunkeredNonBunkeredComparison } from "@/components/dashboard/BunkeredNonBunkeredComparison";
import { BunkeredNonBunkeredSalesComparison } from "@/components/dashboard/BunkeredNonBunkeredSalesComparison";
import { BunkeredNonBunkeredProfitComparison } from "@/components/dashboard/BunkeredNonBunkeredProfitComparison";
import { ShopValetMarginsChart } from "@/components/dashboard/ShopValetMarginsChart";
import { OverheadTrendsChart } from "@/components/dashboard/OverheadTrendsChart";
import { MAIN_DASHBOARD_SITES } from "@/constants/sites";
import {
  COFFEE_VALET_REVENUE_LABEL,
  COFFEE_VALET_PROFIT_LABEL,
} from "@/constants/revenueLabels";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Building2, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useIsSmUp } from "@/hooks/use-mobile";
import { dashCartesianGridProps, dashXAxisIntervalDenseMonths, formatMonthAxisTick } from "@/lib/dashboardChartTypography";

// HSRL Department number (0-19) -> display name
const SITE_CODE_TO_NAME = {
  0: 'HEAD OFFICE', 1: 'ANSON SS', 2: 'BELGRAVE SS', 3: 'GREENFORD PARK SS',
  4: 'BADDESLEY SS', 5: 'SWANLEY SS', 6: 'ASTWICK SS', 7: 'VINEYARD SS',
  8: 'WEXHAM SS', 9: 'LYE SS', 10: 'GIRTON SS', 11: 'PATCHAM SS',
  12: 'SUBWAY', 13: 'PARK ROYAL SS', 14: 'Gravesend SS', 15: 'Amersham SS',
  16: 'Oakham SS', 17: 'Spalding SS', 18: 'ERITH SS', 19: 'Erith Subway',
};

/** Match reference: green EBITA line, blue ROI % line. */
const ROI_TREND_COL_EBITA = '#22c55e';
const ROI_TREND_COL_ROI = 'hsl(var(--chart-blue))';

/** Excluded from PPL-after-OH total (backend EBITA bucket). Overhead Cost Breakdown card still shows all nominals. */
const PPL_TOTAL_EXCLUDED_NOMINAL_CODES = new Set([
  '8200', '8201', '8202', '8203', '8204', '8206', '8207', '7750',
]);

/** Backend returns { months, bySite } or legacy array of month rows. */
function normalizeRoiMonthlyTrendPayload(trend) {
  if (Array.isArray(trend)) return { months: trend, bySite: {} };
  if (trend && typeof trend === 'object') {
    if (Array.isArray(trend.months)) {
      const bySite =
        trend.bySite && typeof trend.bySite === 'object' && !Array.isArray(trend.bySite) ? trend.bySite : {};
      return { months: trend.months, bySite };
    }
    if (
      trend.data &&
      typeof trend.data === 'object' &&
      !Array.isArray(trend.data) &&
      Array.isArray(trend.data.months)
    ) {
      return {
        months: trend.data.months,
        bySite:
          trend.data.bySite && typeof trend.data.bySite === 'object' && !Array.isArray(trend.data.bySite)
            ? trend.data.bySite
            : {},
      };
    }
    if (Array.isArray(trend.data) && trend.data.length && typeof trend.data[0] === 'object' && 'sortKey' in trend.data[0]) {
      return { months: trend.data, bySite: {} };
    }
  }
  return { months: [], bySite: {} };
}

const ROI_TREND_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Chart rows: aggregate EBITA + ROI only on the graph; investment / net profit in tooltip. */
function buildRoiTrendChartRowsAndLines(months) {
  const rows = months.map((m) => {
    const mi = Number(m.month);
    const y = Number(m.year);
    const mon = ROI_TREND_MONTH_LABELS[mi - 1] ?? String(mi);
    return {
      label: m.label,
      labelFull: `${mon} ${y}`,
      sortKey: m.sortKey,
      year: y,
      month: mi,
      ebita: m.ebita,
      investment: m.investment ?? 0,
      netProfit: m.totalNetProfit ?? m.netProfit ?? 0,
      roiTotal: m.roi,
    };
  });
  return { rows };
}

/** 1 / 2 / 2.5 / 5 × 10^n style step for readable axis ticks. */
function roiTrendNiceStep(roughStep) {
  if (!Number.isFinite(roughStep) || roughStep <= 0) return 1;
  const exp = Math.floor(Math.log10(roughStep));
  const f = roughStep / 10 ** exp;
  let m = 10;
  if (f <= 1) m = 1;
  else if (f <= 2) m = 2;
  else if (f <= 5) m = 5;
  return m * 10 ** exp;
}

function roiTrendBuildNiceTicks(dataMin, dataMax, targetTickCount = 6) {
  let minV = dataMin;
  let maxV = dataMax;
  if (!Number.isFinite(minV) || !Number.isFinite(maxV)) {
    return { domain: [0, 1], ticks: [0, 0.5, 1] };
  }
  if (minV > maxV) [minV, maxV] = [maxV, minV];
  const span = Math.max(maxV - minV, Number.EPSILON);
  const rough = span / Math.max(targetTickCount - 1, 1);
  const step = roiTrendNiceStep(rough);
  let tickMin = Math.floor((minV - 1e-9) / step) * step;
  let tickMax = Math.ceil((maxV + 1e-9) / step) * step;
  if (tickMax <= tickMin) tickMax = tickMin + step;
  const ticks = [];
  for (let t = tickMin; t <= tickMax + step * 1e-6; t += step) {
    ticks.push(Math.round(t * 1e9) / 1e9);
    if (ticks.length > 40) break;
  }
  return { domain: [tickMin, tickMax], ticks };
}

/** Left axis: round £ steps (e.g. £600k, £700k …) not odd values like £892.9k. */
function buildNiceGbpAxisFromRows(rows) {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const v = row.ebita;
    if (typeof v === 'number' && Number.isFinite(v)) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { domain: [0, 1_000_000], ticks: [0, 250_000, 500_000, 750_000, 1_000_000] };
  }
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.2, 50_000, 1);
    min -= pad;
    max += pad;
  } else {
    const p = (max - min) * 0.1;
    min -= p;
    max += p;
  }
  if (min >= 0 && min <= (max - min) * 0.08) min = 0;
  return roiTrendBuildNiceTicks(min, max, 6);
}

/**
 * Right axis: round % steps. Small ROI (&lt;5%): 0.5, 0.6, … Larger values: 0, 10, 20 … up to 100+ as needed.
 */
function buildNicePctAxisFromRows(rows, lineKeys) {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    for (const key of lineKeys) {
      const v = row[key];
      if (typeof v === 'number' && Number.isFinite(v)) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] };
  }
  if (min === max) {
    const d = Math.max(Math.abs(min) * 0.25, 0.15, 0.05);
    min -= d;
    max += d;
  } else {
    const p = (max - min) * 0.12;
    min -= p;
    max += p;
  }
  // Larger % values: axis from 0 with coarse steps (0, 10, 20 … 50, 100 style)
  if (min >= 0 && max >= 5) {
    min = 0;
    max *= 1.08;
  }
  return roiTrendBuildNiceTicks(min, max, 6);
}

function formatRoiTrendPctAxis(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const a = Math.abs(n);
  if (a >= 10) return `${Math.round(n)}%`;
  if (a >= 1) return `${Number(n.toFixed(1))}%`;
  return `${Number(n.toFixed(2))}%`;
}

/** Compact: £853.6k / £56.94M. Exact: full £ with grouping and 2 dp (toggle off). */
function formatRoiTrendGbp(value, compact) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  if (compact) {
    const a = Math.abs(n);
    if (a >= 1e6) return `£${(n / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `£${(n / 1e3).toFixed(1)}k`;
    return `£${n.toFixed(0)}`;
  }
  const s = n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `£${s}`;
}

function formatRoiTrendPct(value, compact) {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value ?? ''}`;
  if (compact) return `${n.toFixed(2)}%`;
  return `${n.toLocaleString('en-GB', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}%`;
}

function RoiTrendChartTooltip({ active, payload, label, compact }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const title = row.labelFull || label;
  return (
    <div
      className="rounded-lg p-2.5 shadow-xl min-w-[170px]"
      style={{
        backgroundColor: "hsl(222, 47%, 11%)",
        border: "1px solid hsl(217, 33%, 17%)",
        color: "#ffffff",
        zIndex: 99999,
      }}
    >
      <p className="font-semibold text-xs mb-1.5 text-white">{title}</p>
      <p className="text-[11px] mb-0.5 m-0 text-slate-200">
        EBITDA: {formatRoiTrendGbp(row.ebita, compact)}
      </p>
      <p className="text-[11px] mb-0.5 m-0 text-slate-200">
        ROI: {formatRoiTrendPct(row.roiTotal, compact)}
      </p>
      <p className="text-[11px] m-0 mt-2 pt-1.5 border-t border-white/10 text-slate-300">
        Investment: {formatRoiTrendGbp(row.investment, compact)}
      </p>
      <p className="text-[11px] m-0 text-slate-300">Net profit: {formatRoiTrendGbp(row.netProfit, compact)}</p>
    </div>
  );
}

// Site filter: multi-select by site name (dept number = id). Select All, Clear, Confirm. Default all main-dashboard sites selected.
function SiteFilterMultiSelect({ sites, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Pending selection while popover is open; applied only on Confirm
  const [pendingIds, setPendingIds] = useState([]);

  // When popover opens, sync pending selection from current applied selection
  useEffect(() => {
    if (open) {
      setPendingIds([...selectedIds]);
    } else {
      setSearchQuery("");
    }
  }, [open, selectedIds]);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredSites = searchLower
    ? sites.filter((s) => (s.name || "").toLowerCase().includes(searchLower))
    : sites;

  const allPendingSelected = pendingIds.length === sites.length && sites.length > 0;
  const handleToggle = (id) => {
    setPendingIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };
  const handleSelectAll = () => {
    setPendingIds(allPendingSelected ? [] : sites.map((s) => s.id));
  };
  const handleClear = () => {
    setPendingIds([]);
  };
  const handleConfirm = () => {
    onChange(pendingIds);
    setOpen(false);
  };

  // When none selected we don't send siteIds = backend returns all sites. Trigger label: no site counts.
  const displayText =
    selectedIds.length === 0 || selectedIds.length === sites.length
      ? "Select all"
      : "Select site";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full sm:w-64 justify-between bg-background border-border", selectedIds.length === 0 && "text-muted-foreground")}
        >
          <Building2 className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0" align="start">
        <div className="border-b p-3 flex items-center justify-between gap-3 flex-nowrap">
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-9 min-w-0 px-3 text-xs font-medium" onClick={handleSelectAll}>
              {allPendingSelected ? "Clear all" : "Select all"}
            </Button>
            <Button variant="ghost" size="sm" className="h-9 min-w-0 px-3 text-xs font-medium" onClick={handleClear}>
              Clear
            </Button>
          </div>
          <Button size="sm" className="h-9 shrink-0 px-4 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
              onClick={() => handleToggle(site.id)}
            >
              <Checkbox checked={pendingIds.includes(site.id)} onCheckedChange={() => handleToggle(site.id)} />
              <label className="text-sm font-medium leading-none cursor-pointer flex-1 truncate" title={site.name}>
                {site.name}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ========== QUICK INSIGHT KPI CARD COMPONENTS ==========

/** True when litre volume exists (Sage details API or transition breakdown). Used for PPL vs fuel-margin labelling. */
function getQuickInsightsHasVolume(totalFuelVolume, fuelVolumeTransitionBreakdown) {
  const volumeFromApiRaw =
    typeof totalFuelVolume?.totalVolume === "number"
      ? totalFuelVolume.totalVolume
      : parseFloat(totalFuelVolume?.totalVolume) || 0;
  const volumeFromApi = Number.isNaN(volumeFromApiRaw) ? 0 : volumeFromApiRaw;
  const volumeFromTransitionRaw =
    typeof fuelVolumeTransitionBreakdown?.totalVolume === "number"
      ? fuelVolumeTransitionBreakdown.totalVolume
      : parseFloat(fuelVolumeTransitionBreakdown?.totalVolume) || 0;
  const volumeFromTransition = Number.isNaN(volumeFromTransitionRaw) ? 0 : volumeFromTransitionRaw;
  const totalVolumeL = volumeFromApi !== 0 ? volumeFromApi : volumeFromTransition;
  return totalVolumeL !== 0;
}

/** Fuel margin / margin-after-OH only when selected sites have fuel sales (4000s etc.); else show N/A. */
function getQuickInsightsHasFuelSales(totalSiteRevenue) {
  const v = Math.abs(Number(totalSiteRevenue?.fuelSales ?? 0));
  return v >= 0.01;
}

// Card 1: Total Site Revenue (Fuel 4000-4004 + Shop 4032,4034,4036,4037,4039,5035 + Valet 4028-4031,4017). Display as-is; negative shown negative.
const TotalSiteRevenueCard = ({ data, loading, error, onClick, onBreakdown, fuelByNominalBreakdown = [], otherIncomeBreakdown = [], showInMillions = true }) => {
  const formatCurrency = (amount) => {
    const n = Number(amount ?? 0);
    const a = n < 0 ? -n : n;
    if (!a && amount !== 0 && amount != null) return "£0.00";
    const sign = n < 0 ? '-' : '';
    if (a >= 1000000) return `£${sign}${(a / 1000000).toFixed(2)}M`;
    if (a >= 1000) return `£${sign}${(a / 1000).toFixed(0)}K`;
    return `£${sign}${a.toFixed(2)}`;
  };
  const formatCurrencyExact2 = (amount) => {
    const n = Number(amount ?? 0);
    const a = n < 0 ? -n : n;
    const fixed = a.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const sign = n < 0 ? '-' : '';
    return `£${sign}${withCommas}.${decPart}`;
  };
  const displayFormat = showInMillions ? formatCurrency : formatCurrencyExact2;

  const total = data?.total ?? 0;
  const fuelSales = data?.fuelSales ?? 0;
  const shopSales = data?.shopSales ?? 0;
  const valetSales = data?.valetSales ?? 0;
  const hasShop = typeof shopSales === 'number';
  const hasValet = typeof valetSales === 'number';

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Site Revenue
          </CardTitle>
          <TrendingUp className="w-4 h-4 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p
              className="text-lg sm:text-xl font-bold text-foreground min-w-0 break-all"
              title={displayFormat(Math.abs(total))}
            >
              {displayFormat(Math.abs(total))}
            </p>
            <div className="dash-insight-breakdown">
              <p>Fuel: {displayFormat(Math.abs(fuelSales))}</p>
              <p>Shop: {hasShop ? displayFormat(Math.abs(shopSales)) : "N/A"}</p>
              <p>Coffee &amp; Valet: {hasValet ? displayFormat(Math.abs(valetSales)) : "N/A"}</p>
            </div>
            {onBreakdown && (
              <button
                type="button"
                className="mt-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                onClick={(event) => {
                  event.stopPropagation();
                  onBreakdown();
                }}
              >
                View breakdown -&gt;
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 2: Total Fuel Volume — volume from details (transition) only. Toggle: Show M = millions (ML/KL), off = full figure with commas (same as Total Site Revenue).
const TotalFuelVolumeCard = ({
  data,
  loading,
  error,
  onClick,
  onBreakdown,
  fuelVolumeTransitionBreakdown = null,
  showInMillions = true,
  hasFuelSales = true,
}) => {
  const formatVolumeExact2 = (liters) => {
    const raw = typeof liters === 'number' ? liters : parseFloat(liters) || 0;
    const L = Number.isNaN(raw) ? 0 : raw;
    const a = L < 0 ? -L : L;
    const fixed = a.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const sign = L < 0 ? '-' : '';
    return `${sign}${withCommas}.${decPart} L`;
  };
  const formatVolumeShort = (liters) => {
    const raw = typeof liters === 'number' ? liters : parseFloat(liters) || 0;
    const L = Number.isNaN(raw) ? 0 : raw;
    const a = L < 0 ? -L : L;
    if (!a && liters !== 0) return "0 L";
    if (a >= 1000000) return `${L < 0 ? '-' : ''}${(a / 1000000).toFixed(2)} ML`;
    if (a >= 1000) return `${L < 0 ? '-' : ''}${(a / 1000).toFixed(2)} KL`;
    return `${L.toFixed(2)} L`;
  };
  const formatVolume = showInMillions ? formatVolumeShort : formatVolumeExact2;
  // Volume from API (details column, 4000–4004 — fuel sales) or transition breakdown
  const volumeFromApiRaw = typeof data?.totalVolume === 'number' ? data.totalVolume : (parseFloat(data?.totalVolume) || 0);
  const volumeFromApi = Number.isNaN(volumeFromApiRaw) ? 0 : volumeFromApiRaw;
  const volumeFromTransitionRaw = typeof fuelVolumeTransitionBreakdown?.totalVolume === 'number'
    ? fuelVolumeTransitionBreakdown.totalVolume
    : (parseFloat(fuelVolumeTransitionBreakdown?.totalVolume) || 0);
  const volumeFromTransition = Number.isNaN(volumeFromTransitionRaw) ? 0 : volumeFromTransitionRaw;
  const totalVolumeL = volumeFromApi !== 0 ? volumeFromApi : volumeFromTransition;
  const hasVolume = getQuickInsightsHasVolume(data, fuelVolumeTransitionBreakdown);
  const nominalRows = fuelVolumeTransitionBreakdown?.byNominalCode || [];

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Fuel Volume
          </CardTitle>
          <Fuel className="w-4 h-4 text-blue-500" />
        </div>
       
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            {hasVolume ? (
              <p className="text-2xl font-bold">{formatVolume(totalVolumeL)}</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">N/A</p>
                <p className="mt-1 text-sm font-medium text-foreground/80">No volume data found for this period.</p>
              </>
            )}
            {hasVolume && nominalRows.length > 0 && (
              <div className="dash-insight-breakdown mt-2 space-y-0.5">
                {nominalRows.map((item) => {
                  const v = Math.abs(Number(item.volume) || 0);
                  const label = `${String(item.name || item.code || "").trim() || item.code}`;
                  return (
                    <div
                      key={String(item.code ?? label)}
                      className="flex justify-between gap-2 items-baseline text-xs sm:text-sm"
                    >
                      <span className="text-muted-foreground truncate">{label}</span>
                      <span className="tabular-nums font-medium shrink-0">{formatVolume(v)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {onBreakdown && (
              <button
                type="button"
                className="mt-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBreakdown();
                }}
              >
                View breakdown -&gt;
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 3–4 (Shop / Valet Sales) removed from Quick Insights — see Shop & Valeting sections below.

// Card 5: Gross Profit total only on the card; Fuel / Shop / Valet detail is in the breakdown modal.
const GrossProfitCard = ({ data, loading, error, onClick, onBreakdown, showInMillions = true }) => {
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "£0";
    const a = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    const abs = a < 0 ? -a : a;
    if (abs >= 1000000) return `£${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `£${(abs / 1000).toFixed(0)}K`;
    return `£${abs.toFixed(2)}`;
  };
  const formatCurrencyExact2 = (amount) => {
    const n = Number(amount ?? 0);
    const a = n < 0 ? -n : n;
    return `£${a.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const displayFormat = showInMillions ? formatCurrency : formatCurrencyExact2;

  // Shop/Valet signed so losses subtract from GP (previously Math.abs inflated KPI when shop ran negative).
  const grossProfit =
    Math.abs(Number(data?.fuelProfit ?? 0)) +
    (Number(data?.shopProfit ?? 0) || 0) +
    (Number(data?.valetProfit ?? 0) || 0);

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Gross Profit
          </CardTitle>
          <PoundSterling className="w-4 h-4 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-10 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-3xl font-bold tracking-tight text-green-600 dark:text-emerald-400">
              {displayFormat(grossProfit)}
            </p>
            {onBreakdown && (
              <button
                type="button"
                className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                onClick={(event) => {
                  event.stopPropagation();
                  onBreakdown();
                }}
              >
                View breakdown -&gt;
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 6: Gross PPL + PPL after O/H (combined Quick Insights card)
const PPLAfterOverheadsCard = ({
  data,
  loading,
  error,
  onClick,
  onBreakdown,
  hasVolume = true,
  hasFuelSales = true,
}) => {
  const totalOverheads = data?.totalOverheads ?? 0;
  const avgPPLRaw = data?.avgPPL ?? 0;
  const fuelVol = Number(data?.fuelVolume ?? 0) || 0;
  const fuelSalesForAvg = Math.abs(Number(data?.fuelSalesForAvgPPL ?? 0) || 0);

  const avgPPLDisplay = (() => {
    if (!hasVolume && !hasFuelSales) return { text: "N/A", suffix: "" };
    if ((avgPPLRaw ?? 0) !== 0) {
      return {
        text: Math.abs(avgPPLRaw).toFixed(2),
        suffix: hasVolume ? "p" : "%",
      };
    }
    if (hasVolume && fuelVol > 0 && fuelSalesForAvg !== 0) {
      return {
        text: ((fuelSalesForAvg / fuelVol) * 100).toFixed(2),
        suffix: "p",
      };
    }
    return { text: "N/A", suffix: "" };
  })();

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground leading-snug">
            {hasVolume
              ? "Gross PPL and PPL after O/H"
              : "Gross margin and margin after O/H"}
          </CardTitle>
          <Droplets className="w-4 h-4 text-cyan-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground/85">
              {hasVolume ? "Gross PPL" : "Gross margin"}
            </p>
            <p
              className={`text-lg font-semibold mt-0.5 ${avgPPLDisplay.text === "N/A" ? "text-muted-foreground" : "text-foreground"}`}
            >
              {avgPPLDisplay.text}
              {avgPPLDisplay.suffix}
            </p>
            <p className="text-sm font-semibold text-foreground/85 mt-3">
              {hasVolume ? "PPL after O/H" : "Margin after O/H"}
            </p>
            {!hasVolume && !hasFuelSales ? (
              <p className="text-2xl font-bold text-muted-foreground">N/A</p>
            ) : (
              <p className="text-2xl font-bold text-blue-600">
                {Math.abs(data?.value ?? 0).toFixed(2)}
                {hasVolume ? "p" : "%"}
              </p>
            )}
            {hasFuelSales && (totalOverheads > 0 && (data?.value ?? 0) === 0) && (
              <div className="mt-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                  {hasVolume
                    ? "No fuel sales or revenue in period — PPL = 0"
                    : "No fuel sales or revenue in period — margin = 0"}
                </p>
              </div>
            )}
            {onBreakdown && (
              <button
                type="button"
                className="mt-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                onClick={(event) => {
                  event.stopPropagation();
                  onBreakdown();
                }}
              >
                View breakdown -&gt;
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 7: Total Net Profit — EBITDA − Depreciation − Loan Interest − Corporation Tax (9000)
const TotalNetProfitCard = ({ data, loading, error, onClick, onBreakdown, showInMillions = true }) => {
  const a = Math.abs(Number(data?.totalNetProfit ?? 0));
  const fmtM = () => {
    if (a >= 1e6) return `£${(a / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `£${(a / 1e3).toFixed(0)}K`;
    return `£${a.toFixed(2)}`;
  };
  const fmtExact = () =>
    `£${a.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const display = showInMillions ? fmtM() : fmtExact();
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Net Profit
          </CardTitle>
          <PoundSterling className="w-4 h-4 text-emerald-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-emerald-600">{display}</p>
            {onBreakdown && (
              <button
                type="button"
                className="mt-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onBreakdown();
                }}
              >
                View breakdown -&gt;
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 8: Labour Cost as per shop/fuel sales % = (7000 + 7001 + 7005) / Fuel Sales × 100
const LabourCostPercentageCard = ({ data, loading, error, onClick, onBreakdown, showInMillions = true }) => {
  const getColorClass = (percentage) => {
    if (percentage <= 4) return 'text-green-600';
    if (percentage <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const labourCost = Math.abs(data?.labourCost ?? 0);
  const hasNoLabour = labourCost < 1;
  const totalSales = Math.abs(data?.totalSales ?? 0);
  const pct = !hasNoLabour && totalSales > 0 ? (labourCost / totalSales) * 100 : 0;

  const formatM = (v) => {
    const a = Math.abs(v);
    if (a >= 1000000) return `£${(a / 1000000).toFixed(2)}M`;
    if (a >= 1000) return `£${(a / 1000).toFixed(0)}K`;
    return `£${a.toFixed(2)}`;
  };
  const formatExact = (v) => {
    const a = Math.abs(v);
    const fixed = a.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `£${withCommas}.${decPart}`;
  };
  const fmt = showInMillions ? formatM : formatExact;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Labour Cost as per shop/fuel sales %
          </CardTitle>
          <Users className="w-4 h-4 text-pink-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className={`text-2xl font-bold ${hasNoLabour ? 'text-muted-foreground' : getColorClass(pct)}`}>
              {hasNoLabour ? 'N/A' : `${pct.toFixed(1)}%`}
            </p>
            <div className="dash-insight-breakdown">
              <p>Labour: {hasNoLabour ? 'N/A' : fmt(labourCost)}</p>
              <p>Fuel: {fmt(totalSales)}</p>
            </div>
            {onBreakdown && (
              <button
                type="button"
                className="mt-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                onClick={(event) => {
                  event.stopPropagation();
                  onBreakdown();
                }}
              >
                View breakdown -&gt;
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 9: Customer Count — show transaction count (proxy) so card has data; EvoBos when available
const CustomerCountCard = ({ data, loading, error, onClick }) => {
  const count = data?.count ?? 0;
  const hasCount = count > 0;
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Customer Count
          </CardTitle>
          <Users className="w-4 h-4 text-cyan-500" />
        </div>
        <CardDescription className="text-xs">Transactions (EvoBos when available)</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-foreground">
              {hasCount ? count.toLocaleString() : 'N/A'}
            </p>
            <div className="dash-insight-breakdown">
              {hasCount ? (
                <p>Revenue transactions in period</p>
              ) : (
                <p>From EvoBos (external source)</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 10: ROI (Return on Investment)
const ROICard = ({ data, loading, error, onClick }) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            ROI
          </CardTitle>
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        </div>
        <CardDescription className="text-xs">(Net Profit / Investment) × 100</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-muted-foreground">N/A</p>
        <p className="text-xs text-muted-foreground mt-1">ROI data not available for now</p>
      </CardContent>
    </Card>
  );
};

// Card 11: EBITDA = Gross Profit (Fuel+Shop+Valet) + Misc Income − Overheads (excl. Depreciation & Loan Interest)
const EBITDACard = ({ data, loading, error, onClick, onBreakdown, showInMillions = true }) => {
  const fmt = (v) => {
    const a = Math.abs(Number(v ?? 0));
    if (a >= 1e6) return `£${(a / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `£${(a / 1e3).toFixed(0)}K`;
    return `£${a.toFixed(2)}`;
  };
  const fmtExact = (v) => {
    const a = Math.abs(Number(v ?? 0));
    const [i, d] = a.toFixed(2).split('.');
    return `£${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`;
  };
  const display = showInMillions ? fmt : fmtExact;
  const ebita = Number(data?.ebita ?? 0);
  const isPositive = ebita >= 0;
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            EBITDA
          </CardTitle>
          <BarChart3 className="w-4 h-4 text-blue-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
              {display(ebita)}
            </p>
            <div className="dash-insight-breakdown">
              <p>Gross Profit: {display(data?.grossProfit)}</p>
              <p>Misc Income: {display(data?.miscIncome)}</p>
              <p>Overheads: {display(data?.overheads)}</p>
            </div>
            {onBreakdown && (
              <button
                type="button"
                className="mt-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                onClick={(e) => { e.stopPropagation(); onBreakdown(); }}
              >
                View breakdown -&gt;
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ========== MAIN PAGE COMPONENT ==========

const LatestPetrol = () => {
  const smUp = useIsSmUp();

  // Sidebar state
  const welcomeName = useWelcomeName();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  
  const [totalSalesAllSites, setTotalSalesAllSites] = useState(null);
  
  // Active tab state
  
  // Date range state - default Jan 2026; any month/year can be selected
  const getDefaultDates = () => {
    return {
      startDate: '2026-01-01',
      endDate: '2026-01-31'
    };
  };
  
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);

  // Site filter: dept numbers (same as site id). Closed depts 3, 16, 17 excluded — see MAIN_DASHBOARD_SITES.
  const [selectedSiteIds, setSelectedSiteIds] = useState(() =>
    MAIN_DASHBOARD_SITES.map((s) => s.id)
  );

  // Drop closed depts if they were ever stored in state / session
  useEffect(() => {
    const allowed = new Set(MAIN_DASHBOARD_SITES.map((s) => s.id));
    setSelectedSiteIds((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      if (next.length === 0) return MAIN_DASHBOARD_SITES.map((s) => s.id);
      return next;
    });
  }, []);

  // Toggle: show Total Site Revenue (and related) in millions (M) or exact figures
  const [showRevenueInMillions, setShowRevenueInMillions] = useState(true);

  // ========== QUICK INSIGHT KPI STATES ==========
  // Card 1: Total Site Revenue
  const [totalSiteRevenue, setTotalSiteRevenue] = useState(null);
  const [loadingTotalSiteRevenue, setLoadingTotalSiteRevenue] = useState(false);
  const [totalSiteRevenueError, setTotalSiteRevenueError] = useState(null);

  // Card 2: Total Fuel Volume with Gross PPL
  const [totalFuelVolume, setTotalFuelVolume] = useState(null);
  const [loadingTotalFuelVolume, setLoadingTotalFuelVolume] = useState(false);
  const [totalFuelVolumeError, setTotalFuelVolumeError] = useState(null);

  // Card 3: Shop Sales
  const [shopSales, setShopSales] = useState(null);
  const [loadingShopSales, setLoadingShopSales] = useState(false);
  const [shopSalesError, setShopSalesError] = useState(null);

  // Card 4: Avg Basket Size
  const [avgBasketSize, setAvgBasketSize] = useState(null);
  const [loadingAvgBasketSize, setLoadingAvgBasketSize] = useState(false);
  const [avgBasketSizeError, setAvgBasketSizeError] = useState(null);

  // Card 5: Total Net Profit
  const [totalNetProfit, setTotalNetProfit] = useState(null);
  const [loadingTotalNetProfit, setLoadingTotalNetProfit] = useState(false);
  const [totalNetProfitError, setTotalNetProfitError] = useState(null);

  // Card 6: PPL After Overheads
  const [pplAfterOverheads, setPplAfterOverheads] = useState(null);
  const [loadingPplAfterOverheads, setLoadingPplAfterOverheads] = useState(false);
  const [pplAfterOverheadsError, setPplAfterOverheadsError] = useState(null);

  // Card 8: Labour Cost Percentage
  const [labourCostPercentage, setLabourCostPercentage] = useState(null);
  const [loadingLabourCostPercentage, setLoadingLabourCostPercentage] = useState(false);
  const [labourCostPercentageError, setLabourCostPercentageError] = useState(null);

  // Card 9: Customer Count
  const [customerCount, setCustomerCount] = useState(null);
  const [loadingCustomerCount, setLoadingCustomerCount] = useState(false);
  const [customerCountError, setCustomerCountError] = useState(null);

  // Card 10: ROI (Return on Investment)
  const [roi, setROI] = useState(null);
  const [loadingROI, setLoadingROI] = useState(false);
  const [roiError, setROIError] = useState(null);
  const [roiTrendChart, setRoiTrendChart] = useState({ rows: [] });
  const [loadingROITrend, setLoadingROITrend] = useState(false);

  /** Round tick ranges (not odd auto ticks like £892.9k / 0.66%). */
  const roiTrendGbpAxis = useMemo(
    () => buildNiceGbpAxisFromRows(roiTrendChart?.rows ?? []),
    [roiTrendChart.rows],
  );
  const roiTrendPctAxis = useMemo(
    () => buildNicePctAxisFromRows(roiTrendChart?.rows ?? [], ['roiTotal']),
    [roiTrendChart.rows],
  );

  const roiTrendTotalEbita = useMemo(() => {
    return (roiTrendChart?.rows ?? []).reduce((s, r) => s + (Number(r.ebita) || 0), 0);
  }, [roiTrendChart.rows]);

  const roiTrendShowZeroPctLine =
    roiTrendPctAxis.domain[0] < 0 &&
    roiTrendPctAxis.domain[1] > 0 &&
    Number.isFinite(roiTrendPctAxis.domain[0]) &&
    Number.isFinite(roiTrendPctAxis.domain[1]);

  /** Margins + wide Y bands so rotated axis titles clear tick numerals. */
  const roiTrendChartMargin = useMemo(
    () =>
      smUp
        ? { top: 4, right: 36, left: 32, bottom: 44 }
        : { top: 4, right: 8, left: 8, bottom: 46 },
    [smUp],
  );
  const roiTrendGbpAxisW = smUp ? 92 : 62;
  const roiTrendPctAxisW = smUp ? 76 : 52;
  const roiTrendTickX = smUp ? 9 : 9;
  const roiTrendTickY = smUp ? 10 : 9;
  const roiTrendXInterval = dashXAxisIntervalDenseMonths(smUp, roiTrendChart.rows?.length ?? 0);
  const [activeRoiLabel, setActiveRoiLabel] = useState(null);

  // Card 11: EBITDA (dashboard metric; API field still `ebita`)
  const [ebita, setEBITA] = useState(null);
  const [loadingEBITA, setLoadingEBITA] = useState(false);
  const [ebitaError, setEBITAError] = useState(null);

  // Total Net Profit card: EBITDA − Depreciation − Loan Interest − Corporation Tax (9000)
  const [totalNetProfitCardData, setTotalNetProfitCardData] = useState(null);
  const [loadingTotalNetProfitCard, setLoadingTotalNetProfitCard] = useState(false);
  const [totalNetProfitCardError, setTotalNetProfitCardError] = useState(null);

  // Shop Profit: Sales (4032,4034,4036,4037,4039,5035) − Cost (5032,5033,5034,5036,5037,5039,5042)
  const [shopProfitData, setShopProfitData] = useState(null);
  const [loadingShopProfit, setLoadingShopProfit] = useState(false);

  // Valet Profit: Sales (4028,4029,4030,4031,4017) − Cost (5015,5028,5029,5030,5031,5043,5044)
  const [valetProfitData, setValetProfitData] = useState(null);
  const [loadingValetProfit, setLoadingValetProfit] = useState(false);

  // Additional data states for tabs
  const [shopData, setShopData] = useState(null);
  const [loadingShopData, setLoadingShopData] = useState(false);
  const [valetData, setValetData] = useState(null);
  const [loadingValetData, setLoadingValetData] = useState(false);
  const [overheadsData, setOverheadsData] = useState(null);
  const [loadingOverheadsData, setLoadingOverheadsData] = useState(false);
  const OH_GROUPS = [
    { key: 'wages', label: 'Wages', codes: [] },
    { key: 'rent', label: 'Rent', codes: ['7150'] },
    { key: 'rentals', label: 'Rentals', codes: ['7148','7149'] },
    { key: 'generalRates', label: 'General Rates', codes: ['7151'] },
    { key: 'waterRates', label: 'Water Rates', codes: ['7152'] },
    { key: 'heatLightPower', label: 'Electricity', codes: ['7200','7201'] },
    { key: 'insurance', label: 'Insurance', codes: ['7250','7251','7252'] },
    { key: 'mileage', label: 'Mileage Expenses', codes: ['7300','7301'] },
    { key: 'motor', label: 'Motor Expenses', codes: ['7351','7352','7353','7354'] },
    { key: 'travel', label: 'Travelling and Entertainment', codes: ['7400','7401','7402','7403','7404'] },
    { key: 'royalty', label: 'Royalty', codes: ['7100'] },
    { key: 'franchiseeFees', label: 'Franchisee Fees', codes: ['7101'] },
    { key: 'repairs', label: 'Repairs & Renewals', codes: ['7800'] },
    { key: 'printingStationery', label: 'Printing and Stationery', codes: ['7500','7501'] },
    { key: 'advertisementBusinessPromotion', label: 'Advertisement & Business Promotion', codes: ['7550','7551','7552','7553','7554','7555','7556'] },
    { key: 'repairMaintenance', label: 'Repair & Maintenance', codes: ['7600','7601','7602','7603','7604','7605','7606','7607','7608','7611','7612'] },
    { key: 'bankInterestCharges', label: 'Bank Interest and Charges', codes: ['7700','7701','7702','7704'] },
    { key: 'pollingCharges', label: 'Polling Charges', codes: ['7905'] },
    { key: 'creditCharges', label: 'Credit Card Charges', codes: ['7906'] },
    { key: 'badDebts', label: 'Bad Debts', codes: ['8000','8001'] },
    { key: 'cashUnderOver', label: 'Cash Under/Over', codes: ['8002'] },
    { key: 'legalProfessional', label: 'Legal & Professional', codes: ['8050','8051','8052','8053','8054','8055'] },
    { key: 'telephoneCosts', label: 'Telephone Costs', codes: ['8100','8101'] },
    { key: 'generalExpenses', label: 'General Expenses', codes: ['8150','8151','8152','8153','8154','8155','8156','8157','8158'] },
    { key: 'loanInterest', label: 'Loan Interest', codes: ['7750'] },
    { key: 'overdraftInterest', label: 'Overdraft Interest', codes: ['7705'] },
    { key: 'arrangementFees', label: 'Arrangement Fees', codes: ['7751','7752'] },
    { key: 'guaranteeFees', label: 'Guarantee Fees', codes: ['7753'] },
    { key: 'depreciation', label: 'Depreciation', codes: ['8200','8201','8202','8203','8204','8206','8207'] },
  ];
  const OH_DEFAULT_KEYS = new Set(['wages','rent','rentals','generalRates','creditCharges']);
  const [ohVisibleKeys, setOhVisibleKeys] = useState(new Set(OH_DEFAULT_KEYS));
  const [ohDropdownOpen, setOhDropdownOpen] = useState(false);
  const ohDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ohDropdownRef.current && !ohDropdownRef.current.contains(e.target)) {
        setOhDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Breakdown modal state
  const [breakdownModal, setBreakdownModal] = useState({ open: false, type: null });
  const [siteRevenueBreakdown, setSiteRevenueBreakdown] = useState(null);
  const [fuelByNominalBreakdown, setFuelByNominalBreakdown] = useState([]); // 4000-4004
  const [shopBreakdown, setShopBreakdown] = useState([]); // 4032, 4034, 4036
  const [valetBreakdown, setValetBreakdown] = useState([]); // 4028, 4029, 4030, 4031, 4017
  const [otherIncomeBreakdown, setOtherIncomeBreakdown] = useState([]);   // 4901, 4904, 4907, 6101 (ATM, Rent, Sundry, Daily Facility Fees)
  const [fuelVolumeBreakdown, setFuelVolumeBreakdown] = useState(null);
  const [fuelVolumeTransitionBreakdown, setFuelVolumeTransitionBreakdown] = useState(null); // volume (L) from details column, e.g. Sax-Keyfuel-Nov'25-.../5712.23
  const quickInsightsHasVolume = useMemo(
    () => getQuickInsightsHasVolume(totalFuelVolume, fuelVolumeTransitionBreakdown),
    [totalFuelVolume, fuelVolumeTransitionBreakdown],
  );
  const quickInsightsHasFuelSales = useMemo(
    () => getQuickInsightsHasFuelSales(totalSiteRevenue),
    [totalSiteRevenue],
  );
  const [profitBreakdown, setProfitBreakdown] = useState(null);
  const [labourCostBreakdown, setLabourCostBreakdown] = useState(null);

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // totalSalesAllSites is set from net-sales (totalRevenue) in the KPI fetch below (petrol-data uses transactions; /total-sales uses old fuel_margin_data and would 500)

  // ========== FETCH QUICK INSIGHT KPIs ==========
  useEffect(() => {
    if (!startDate || !endDate) return;

    // Fetch all KPI data
    const fetchAllKPIs = async () => {
      // ── Step 1: Immediately clear ALL stale data so old values never show ──
      setTotalSiteRevenue(null);
      setTotalFuelVolume(null);
      setShopSales(null);
      setAvgBasketSize(null);
      setTotalNetProfit(null);
      setPplAfterOverheads(null);
      setLabourCostPercentage(null);
      setCustomerCount(null);
      setROI(null);
      setRoiTrendChart({ rows: [] });
      setEBITA(null);
      setTotalNetProfitCardData(null);
      setShopProfitData(null);
      setValetProfitData(null);
      setShopData(null);
      setValetData(null);
      setOverheadsData(null);
      setFuelByNominalBreakdown([]);
      setShopBreakdown([]);
      setValetBreakdown([]);
      setOtherIncomeBreakdown([]);
      setFuelVolumeBreakdown(null);
      setFuelVolumeTransitionBreakdown(null);
      setProfitBreakdown(null);
      setLabourCostBreakdown(null);
      setSiteRevenueBreakdown(null);
      // Set all loading true upfront
      setLoadingTotalSiteRevenue(true);
      setLoadingTotalFuelVolume(true);
      setLoadingShopSales(true);
      setLoadingAvgBasketSize(true);
      setLoadingTotalNetProfit(true);
      setLoadingPplAfterOverheads(true);
      setLoadingLabourCostPercentage(true);
      setLoadingCustomerCount(true);
      setLoadingROI(true);
      setLoadingROITrend(true);
      setLoadingEBITA(true);
      setLoadingTotalNetProfitCard(true);
      setLoadingShopProfit(true);
      setLoadingValetProfit(true);
      setLoadingShopData(true);
      setLoadingValetData(true);
      setLoadingOverheadsData(true);

      // ── Step 2: Fire ALL API calls in parallel ──────────────────────────
      const [
        netSalesRes,
        breakdownRes,
        volumeRes,
        avgPplRes,
        fuelBreakdownRes,
        fuelTransitionRes,
        shopProfitRes,
        valetProfitRes,
        profitRes,
        profitMarginRes,
        profitBreakdownRes,
        actualPplRes,
        labourBreakdownRes,
        labourCostRes,
        roiRes,
        roiTrendRes,
        ebitaRes,
        totalNetProfitRes,
        overheadsBreakdownRes,
        wagesRes,
      ] = await Promise.allSettled([
        dashboardAPI.getPetrolNetSales(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolNetSalesBreakdown(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolFuelVolume(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolAvgPPL(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolFuelVolumeBreakdown(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolFuelVolumeTransitionBreakdown(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolShopProfit(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolValetProfit(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolProfit(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolProfitMargin(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolProfitBreakdown(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolActualPPL(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolLabourCostBreakdown(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolLabourCost(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolROI(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolROIMonthlyTrend(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolEBITA(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolTotalNetProfit(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolActualPPLBreakdown(startDate, endDate, selectedSiteIds),
        dashboardAPI.getPetrolWagesForOverheads(startDate, endDate, selectedSiteIds),
      ]);

      // Helper: extract value from allSettled result (null on failure)
      const val = (res) => (res.status === 'fulfilled' ? res.value : null);

      // ── Step 3: Process results with SAME calculations as before ────────

      // Card 1: Total Site Revenue
      let fuelSalesForVolume = 0;
      let shopTotal = 0;
      let valetTotal = 0;
      try {
        const rawNetSales = val(netSalesRes);
        const fuelData = rawNetSales?.data != null ? rawNetSales.data : rawNetSales;
        const fuelSales = fuelData?.fuelSales ?? fuelData?.totalNetSales ?? 0;
        const totalRevenue = fuelData?.totalRevenue ?? fuelData?.totalNetSales ?? fuelSales;
        fuelSalesForVolume = fuelSales;
        setTotalSiteRevenue({ total: totalRevenue, fuelSales, shopSales: 0, valetSales: 0 });
        setSiteRevenueBreakdown({ total: totalRevenue, fuelSales, shopSales: 0, valetSales: 0 });
        setTotalSalesAllSites(totalRevenue);
        // Breakdown: Fuel 4000-4004+4100; Shop 4032,4034,4036,4037,4039; Valet 4028-4031,4017
        const bd = val(breakdownRes);
        const bdData = bd?.data != null ? bd.data : bd;
        const allBreakdown = bdData?.breakdown || [];
        const FUEL_CODES = ['4000', '4001', '4002', '4003', '4004', '4100', '4101', '4102'];
        const SHOP_CODES = ['4032', '4034', '4036', '4037', '4039'];
        const VALET_CODES = ['4028', '4029', '4030', '4031', '4017'];
        const OTHER_INCOME_CODES = ['4400', '4401', '4407', '4410'];
        const fuelOnly = allBreakdown.filter((item) => FUEL_CODES.includes(String(item.code)));
        const shopOnly = allBreakdown.filter((item) => SHOP_CODES.includes(String(item.code)));
        const valetOnly = allBreakdown.filter((item) => VALET_CODES.includes(String(item.code)));
        const otherIncome = allBreakdown.filter((item) => OTHER_INCOME_CODES.includes(String(item.code)));
        shopTotal = shopOnly.reduce((s, x) => s + (Number(x.value ?? x.netSales ?? 0) || 0), 0);
        valetTotal = valetOnly.reduce((s, x) => s + (Number(x.value ?? x.netSales ?? 0) || 0), 0);
        setFuelByNominalBreakdown(fuelOnly);
        setShopBreakdown(shopOnly);
        setValetBreakdown(valetOnly);
        setOtherIncomeBreakdown(otherIncome);
        setTotalSiteRevenue((prev) => ({ ...prev, shopSales: shopTotal, valetSales: valetTotal }));
        setSiteRevenueBreakdown((prev) => ({ ...prev, shopSales: shopTotal, valetSales: valetTotal }));
        setShopSales({ total: shopTotal, transactionCount: 0, trend: 0 });
        setAvgBasketSize({ value: valetTotal, trend: 0, transactionCount: 0 });
        setTotalSiteRevenueError(null);
      } catch (error) {
        setTotalSiteRevenueError(error.message);
      } finally {
        setLoadingTotalSiteRevenue(false);
        setLoadingShopSales(false);
        setLoadingAvgBasketSize(false);
      }

      // Card 2: Total Fuel Volume with Gross PPL
      try {
        const volumeData = val(volumeRes);
        const pplData = val(avgPplRes);
        const rawFuelBreakdown = val(fuelBreakdownRes);
        const fuelBreakdownData = rawFuelBreakdown?.data != null ? rawFuelBreakdown.data : rawFuelBreakdown;
        setTotalFuelVolume({
          totalVolume: volumeData?.totalFuelVolume ?? 0,
          volumeFromDetails: volumeData?.volumeFromDetails === true,
          bunkeredVolume: volumeData?.bunkeredVolume || 0,
          nonBunkeredVolume: volumeData?.nonBunkeredVolume || 0,
          averagePPL: pplData?.avgPPL || 0,
          fuelSalesValue: fuelSalesForVolume,
        });
        const breakdownList = fuelBreakdownData?.breakdown || [];
        const totalFuelSales = fuelBreakdownData?.totalVolume ?? breakdownList.reduce((s, x) => s + (x.volume || 0), 0);
        setFuelVolumeBreakdown({ breakdown: breakdownList, totalVolume: totalFuelSales });
        setFuelVolumeTransitionBreakdown(val(fuelTransitionRes) || { breakdown: [], totalVolume: 0 });
        setTotalFuelVolumeError(null);
      } catch (error) {
        setTotalFuelVolumeError(error.message);
      } finally {
        setLoadingTotalFuelVolume(false);
      }

      // Shop Profit = Sales − Cost
      let shopProfit = 0;
      try {
        const spData = val(shopProfitRes);
        setShopProfitData(spData);
        shopProfit = spData?.shopProfit ?? 0;
      } catch (err) {
        console.error('Error fetching shop profit:', err);
        setShopProfitData(null);
      } finally {
        setLoadingShopProfit(false);
      }

      // Valet Profit = Sales − Cost
      let valetProfit = 0;
      try {
        const vpData = val(valetProfitRes);
        setValetProfitData(vpData);
        valetProfit = vpData?.valetProfit ?? 0;
      } catch (err) {
        console.error('Error fetching valet profit:', err);
        setValetProfitData(null);
      } finally {
        setLoadingValetProfit(false);
      }

      // Card 5: Gross Profit = Fuel Profit + Shop Profit + Valet Profit
      try {
        const profitData = val(profitRes);
        const marginData = val(profitMarginRes);
        const profitBreakdownData = val(profitBreakdownRes);
        const totalFromBreakdown = profitBreakdownData?.totalProfit;
        const rawFuelProfit = totalFromBreakdown ?? profitData?.totalProfit ?? 0;
        const fuelProfitVal = typeof rawFuelProfit === 'number' ? rawFuelProfit : parseFloat(rawFuelProfit) || 0;
        const fuelMag = Math.abs(fuelProfitVal);
        // Signed: a shop/valet loss must subtract from GP. Previously Math.abs flipped losses to gains.
        const shopSigned = Number(shopProfit) || 0;
        const valetSigned = Number(valetProfit) || 0;
        const grossProfit = fuelMag + shopSigned + valetSigned;
        const totalRevenue = profitData?.totalRevenue ?? profitBreakdownData?.totalRevenue ?? 0;
        const revMag = Math.abs(Number(totalRevenue));
        const grossMargin = revMag > 0 ? (grossProfit / revMag) * 100 : marginData?.profitMargin || 0;
        setTotalNetProfit({
          total: grossProfit,
          fuelProfit: fuelMag,
          shopProfit: shopSigned,
          valetProfit: valetSigned,
          totalRevenue,
          totalCost: profitData?.totalCost ?? profitBreakdownData?.totalCost ?? 0,
          profitMargin: grossMargin,
        });
        setProfitBreakdown(profitBreakdownData || null);
        setTotalNetProfitError(null);
      } catch (error) {
        setTotalNetProfitError(error.message);
      } finally {
        setLoadingTotalNetProfit(false);
      }

      // Card 6: PPL after overhead
      try {
        const pplData = val(avgPplRes);
        const actualPplData = val(actualPplRes);
        const avgPPL = pplData?.avgPPL || 0;
        const overheadPerUnitPence = actualPplData?.actualPPL || 0;
        const totalOverheads = actualPplData?.totalOverheads ?? 0;
        const pplAfterOH = actualPplData?.pplAfterOverheads ?? (avgPPL - overheadPerUnitPence);
        const ohDeduction = avgPPL - overheadPerUnitPence;
        const fuelVolume = actualPplData?.fuelVolume ?? 0;
        const denominator = fuelVolume > 0 ? fuelVolume : (actualPplData?.fuelSales > 0 ? actualPplData.fuelSales : actualPplData?.totalRevenue ?? 0);
        setPplAfterOverheads({
          value: pplAfterOH,
          avgPPL,
          overheadDeduction: ohDeduction,
          overheadPerUnitPence,
          difference: pplAfterOH,
          totalOverheads,
          fuelVolume,
          denominator,
          fuelSalesForAvgPPL: actualPplData?.fuelSales ?? 0,
        });
        setPplAfterOverheadsError(null);
      } catch (error) {
        setPplAfterOverheadsError(error.message);
      } finally {
        setLoadingPplAfterOverheads(false);
      }

      // Card 8: Labour Cost % = (7000 + 7001 + 7005) / Fuel Sales × 100
      try {
        const labourBreakdownData = val(labourBreakdownRes);
        const labourCostData = val(labourCostRes);
        const rawLab = val(netSalesRes); // reuse net sales result
        const LABOUR_MARGIN_CODES = ['7000', '7001', '7005'];
        const allItems = labourBreakdownData?.breakdown || [];
        const marginItems = allItems.filter((item) => LABOUR_MARGIN_CODES.includes(String(item.code).trim()));
        let labourCost = marginItems.reduce((s, x) => s + Math.abs(x.amount || 0), 0);
        if (labourCost < 1 && labourCostData?.totalLabourCost != null) {
          labourCost = Math.abs(labourCostData.totalLabourCost || 0);
        }
        const fuelDataLab = rawLab?.data != null ? rawLab.data : rawLab;
        const fuelSalesForLabour = Math.abs(fuelDataLab?.fuelSales ?? fuelDataLab?.totalNetSales ?? 0);
        setLabourCostPercentage({
          value: fuelSalesForLabour > 0 ? (labourCost / fuelSalesForLabour) * 100 : 0,
          labourCost,
          totalSales: fuelSalesForLabour,
          breakdown: marginItems,
        });
        setLabourCostBreakdown(labourBreakdownData || null);
        setLabourCostPercentageError(null);
      } catch (error) {
        setLabourCostPercentageError(error.message);
      } finally {
        setLoadingLabourCostPercentage(false);
      }

      // Card 9: Customer Count
      try {
        setCustomerCount({ count: 0, shopTransactions: 0, valetTransactions: 0 });
        setCustomerCountError(null);
      } catch (error) {
        setCustomerCountError(error.message);
      } finally {
        setLoadingCustomerCount(false);
      }

      // Card 10: ROI = (Net Profit / Investment) × 100
      try {
        const roiData = val(roiRes);
        const profitData = val(profitRes);
        const totalRevenue = profitData?.totalRevenue ?? 0;
        const totalCost = profitData?.totalCost ?? 0;
        const costRevenueRatio = totalRevenue > 0 ? totalCost / totalRevenue : 0;
        setROI({
          roi: roiData?.roi ?? 0,
          netProfit: roiData?.netProfit ?? 0,
          investment: roiData?.investment ?? 0,
          totalRevenue,
          totalCost,
          costRevenueRatio,
        });
        setROIError(null);
      } catch (error) {
        setROIError(error.message);
      } finally {
        setLoadingROI(false);
      }

      // ROI monthly trend
      try {
        const trend = val(roiTrendRes);
        const { months } = normalizeRoiMonthlyTrendPayload(trend);
        const built = buildRoiTrendChartRowsAndLines(months);
        setRoiTrendChart(built);
      } catch {
        setRoiTrendChart({ rows: [] });
      } finally {
        setLoadingROITrend(false);
      }

      // Card 11: EBITDA
      try {
        const ebitaData = val(ebitaRes);
        setEBITA(ebitaData ?? { ebita: 0 });
        setEBITAError(null);
      } catch (error) {
        setEBITAError(error.message);
      } finally {
        setLoadingEBITA(false);
      }

      // Total Net Profit card
      try {
        const tnpData = val(totalNetProfitRes);
        setTotalNetProfitCardData(tnpData ?? null);
        setTotalNetProfitCardError(null);
      } catch (error) {
        setTotalNetProfitCardError(error.message);
        setTotalNetProfitCardData(null);
      } finally {
        setLoadingTotalNetProfitCard(false);
      }

      // Shop data for Tab 2
      try {
        const actualShopSales = Math.abs(shopTotal);
        setShopData({
          sales: actualShopSales,
          profit: shopProfit,
          margin: actualShopSales > 0 ? (shopProfit / actualShopSales) * 100 : 0,
          transactionCount: 0,
        });
      } finally {
        setLoadingShopData(false);
      }

      // Valet data for Tab 3
      try {
        const valetSalesValue = 0;
        const valetMargin = valetSalesValue > 0 ? (valetProfit / valetSalesValue) * 100 : 0;
        setValetData({
          sales: valetSalesValue,
          profit: valetProfit,
          margin: valetMargin,
          operatingCosts: valetSalesValue - valetProfit,
          transactionCount: 0,
        });
      } finally {
        setLoadingValetData(false);
      }

      // Overheads data for Tab 4
      try {
        const overheadsBreakdown = val(overheadsBreakdownRes);
        const wagesData = val(wagesRes);
        const breakdown = overheadsBreakdown?.breakdown || [];
        const wages = wagesData?.wages ?? 0;
        const overheadsTotal = overheadsBreakdown?.totalOverheads || 0;
        setOverheadsData({ labour: wages, total: overheadsTotal + wages, breakdown });
      } catch (error) {
        console.error('Error fetching overheads:', error);
        setOverheadsData({ labour: 0, total: 0, breakdown: [] });
      } finally {
        setLoadingOverheadsData(false);
      }
    };

    fetchAllKPIs();
  }, [startDate, endDate, selectedSiteIds]);

  // Handle date range change
  const handleDateRangeChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const openBreakdown = (type) => {
    setBreakdownModal({ open: true, type });
  };

  const closeBreakdown = () => {
    setBreakdownModal({ open: false, type: null });
  };

  const formatCurrency = (amount) => {
    const a = Math.abs(Number(amount) ?? 0);
    if (!a && amount !== 0 && amount != null) return "£0";
    if (a >= 1000000) return `£${(a / 1000000).toFixed(2)}M`;
    if (a >= 1000) return `£${(a / 1000).toFixed(0)}K`;
    return `£${a.toFixed(2)}`;
  };

  const formatCurrencyExact2 = (amount) => {
    const n = Math.abs(Number(amount ?? 0));
    const fixed = n.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `£${withCommas}.${decPart}`;
  };

  /** For Net Profit breakdown: show amount with its sign (negative as negative, positive as positive). */
  const formatCurrencySignedExact2 = (amount) => {
    const n = Number(amount ?? 0);
    const abs = Math.abs(n);
    const fixed = abs.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const s = `${withCommas}.${decPart}`;
    return n < 0 ? `-£${s}` : `£${s}`;
  };

  /** Signed M/K format for breakdown when "Show M" is on. */
  const formatCurrencySignedM = (amount) => {
    const n = Number(amount ?? 0);
    const a = Math.abs(n);
    const prefix = n < 0 ? '-' : '';
    if (a >= 1000000) return `${prefix}£${(a / 1000000).toFixed(2)}M`;
    if (a >= 1000) return `${prefix}£${(a / 1000).toFixed(0)}K`;
    return `${prefix}£${a.toFixed(2)}`;
  };

  const profitBreakdownFormat = showRevenueInMillions ? formatCurrencySignedM : formatCurrencySignedExact2;
  /** PPL after Overheads breakdown: show value with sign (net data); negative shown as negative. */
  const overheadBreakdownFormat = (amount) => {
    const n = Number(amount ?? 0);
    const a = Math.abs(n);
    const prefix = n < 0 ? "−£" : "£";
    if (showRevenueInMillions) {
      if (a >= 1000000) return `${prefix}${(a / 1000000).toFixed(2)}M`;
      if (a >= 1000) return `${prefix}${(a / 1000).toFixed(0)}K`;
      return `${prefix}${a.toFixed(2)}`;
    }
    const fixed = a.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${prefix}${withCommas}.${decPart}`;
  };
  /** Overhead card: respects M/exact toggle */
  const overheadCardFormat = (amount) => {
    const n = Number(amount ?? 0);
    const a = Math.abs(n);
    const prefix = n < 0 ? "−£" : "£";
    if (showRevenueInMillions) {
      if (a >= 1e6) return `${prefix}${(a / 1e6).toFixed(2)}M`;
      if (a >= 1e3) return `${prefix}${(a / 1e3).toFixed(2)}K`;
      return `${prefix}${a.toFixed(2)}`;
    }
    const fixed = a.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${prefix}${withCommas}.${decPart}`;
  };

  const formatVolume = (liters) => {
    if (!liters && liters !== 0) return "0 L";
    const L = Math.abs(Number(liters) ?? 0);
    if (showRevenueInMillions) {
      if (L >= 1000000) return `${(L / 1000000).toFixed(2)} ML`;
      if (L >= 1000) return `${(L / 1000).toFixed(2)} KL`;
      return `${L.toFixed(2)} L`;
    }
    const fixed = L.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${withCommas}.${decPart} L`;
  };

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col bg-transparent">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main 
          style={{ willChange: 'margin-left' }}
          className={`flex flex-1 flex-col min-h-0 min-w-0 transition-[margin-left] duration-500 ease-\[cubic-bezier(0.4,0,0.2,1)\] ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} ml-0`}
        >
          <div className="mx-2 mt-2 mb-3 flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:mx-3 sm:mt-3 sm:mb-4 sm:gap-3 lg:mx-5 lg:mt-4 lg:mb-6 lg:gap-3">
          <div className="main-stage-header-card">
            <Header 
              sidebarOpen={sidebarOpen} 
              onToggleSidebar={toggleSidebar} 
              totalSales={totalSalesAllSites}
              showRevenueInMillions={showRevenueInMillions}
              onToggleRevenueInMillions={() => setShowRevenueInMillions((v) => !v)}
            />
          </div>
          
          <div className="main-stage-card flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 min-w-0 flex-1 p-3 sm:p-4 lg:p-8">
            {/* Welcome message */}
            {welcomeName && (
              <div className="mb-3 sm:mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm sm:text-base text-foreground/90 font-medium">Welcome back,</span>
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground uppercase">{welcomeName}</span>
                </div>
              </div>
            )}

            {/* Page Title */}
            <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground text-balance break-words leading-tight sm:truncate sm:text-xl lg:text-2xl">
                  Business Performance Dashboard
                </h1>
                <p className="text-xs text-foreground/90 mt-0.5 sm:text-sm">
                  Quick Insights, Fuel, Shop, Coffee &amp; Valet &amp; ROI
                </p>
              </div>
            </div>

            {/* Filters — two sections: Calendar and Sites */}
            <div className="mb-4 sm:mb-6 animate-slide-up space-y-4">
              <p className="text-xs font-semibold text-primary sm:text-sm">
                Filters
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Part 1: Calendar filter */}
                <div className="chart-card p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    Date range
                  </p>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onDateChange={handleDateRangeChange}
                  />
                </div>
                {/* Part 2: Sites filter */}
                <div className="chart-card p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    Sites
                  </p>
                  <SiteFilterMultiSelect
                    sites={MAIN_DASHBOARD_SITES}
                    selectedIds={selectedSiteIds}
                    onChange={setSelectedSiteIds}
                  />
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="space-y-6">
                {/* Quick Insights — 6 KPI cards (Shop / Valet sales live under Shop & Valeting) */}
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground px-3 sm:px-4">
                      Quick Insights
                    </h2>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <TotalSiteRevenueCard
                      data={totalSiteRevenue}
                      loading={loadingTotalSiteRevenue}
                      error={totalSiteRevenueError}
                      onClick={() => console.log('Total Site Revenue clicked')}
                      onBreakdown={() => openBreakdown('site-revenue')}
                      fuelByNominalBreakdown={fuelByNominalBreakdown}
                      otherIncomeBreakdown={otherIncomeBreakdown}
                      showInMillions={showRevenueInMillions}
                    />
                    <TotalFuelVolumeCard
                      data={totalFuelVolume}
                      loading={loadingTotalFuelVolume}
                      error={totalFuelVolumeError}
                      onClick={() => console.log('Total Fuel Volume clicked')}
                      onBreakdown={() => openBreakdown('fuel-volume')}
                      fuelVolumeTransitionBreakdown={fuelVolumeTransitionBreakdown}
                      showInMillions={showRevenueInMillions}
                      hasFuelSales={quickInsightsHasFuelSales}
                    />
                    <PPLAfterOverheadsCard
                      data={pplAfterOverheads}
                      loading={loadingPplAfterOverheads}
                      error={pplAfterOverheadsError}
                      onClick={() => console.log('PPL After Overheads clicked')}
                      onBreakdown={() => openBreakdown('ppl-after-overheads')}
                      hasVolume={quickInsightsHasVolume}
                      hasFuelSales={quickInsightsHasFuelSales}
                    />
                    <GrossProfitCard
                      data={totalNetProfit}
                      loading={loadingTotalNetProfit}
                      error={totalNetProfitError}
                      onClick={() => console.log('Total Net Profit clicked')}
                      onBreakdown={() => openBreakdown('net-profit')}
                      showInMillions={showRevenueInMillions}
                    />
                    <TotalNetProfitCard
                      data={totalNetProfitCardData}
                      loading={loadingTotalNetProfitCard}
                      error={totalNetProfitCardError}
                      onClick={() => console.log("Total Net Profit clicked")}
                      onBreakdown={() => openBreakdown("total-net-profit")}
                      showInMillions={showRevenueInMillions}
                    />
                    <LabourCostPercentageCard
                      data={labourCostPercentage}
                      loading={loadingLabourCostPercentage}
                      error={labourCostPercentageError}
                      onClick={() => console.log('Labour Cost % clicked')}
                      onBreakdown={() => openBreakdown('labour-cost')}
                      showInMillions={showRevenueInMillions}
                    />
                    <EBITDACard
                      data={ebita}
                      loading={loadingEBITA}
                      error={ebitaError}
                      onClick={() => console.log('EBITDA clicked')}
                      onBreakdown={() => openBreakdown('ebita')}
                      showInMillions={showRevenueInMillions}
                    />
                  </div>
                </div>

                {/* Fuel Section: charts (Monthly Performance, Grade Mix, PPL comparison) */}
                <div>
                  {/* Fuel performance: same chrome as Shop / Valet monthly combo (title + subtitle inside chart-card) */}
                  <div className="mb-4">
                    <MonthlyFuelPerformanceChart
                      startDate={startDate}
                      endDate={endDate}
                      siteIds={selectedSiteIds}
                      showInMillions={showRevenueInMillions}
                    />
                  </div>

                  {/* Volume vs Gross PPL (new chart after the first fuel performance graph) */}
                  <Card className="mb-4 overflow-hidden">
                    <CardContent className="pt-4 pb-3 px-3 sm:px-4">
                      <div className="mb-2">
                        <h3 className="dash-chart-heading">Volume vs Gross PPL</h3>
                        <p className="dash-chart-subtitle leading-snug">
                          Monthly fuel volume ({showRevenueInMillions ? "ML" : "KL"}) with Gross PPL trend line. Left: Gross PPL · Right: Vol ({showRevenueInMillions ? "ML" : "KL"})
                        </p>
                      </div>
                      <VolumeVsPPLChart
                        startDate={startDate}
                        endDate={endDate}
                        siteIds={selectedSiteIds}
                        hasVolume={quickInsightsHasVolume}
                        showInMillions={showRevenueInMillions}
                      />
                    </CardContent>
                  </Card>

                  {/* Fuel Grade Mix (%) */}
                  <div className="mb-4">
                    <FuelGradeMixChart
                      startDate={startDate}
                      endDate={endDate}
                      siteIds={selectedSiteIds}
                      shopProfit={Number(totalNetProfit?.shopProfit ?? 0) || 0}
                      valetProfit={Number(totalNetProfit?.valetProfit ?? 0) || 0}
                      showInMillions={showRevenueInMillions}
                    />
                  </div>

                  {/* Gross PPL and PPL after O/H – wireframe title + Filter */}
                  <Card>
                    <CardContent className="pt-4">
                      <div className="mb-2">
                        <h3 className="dash-chart-heading">Gross PPL and PPL after O/H</h3>
                        <p className="dash-chart-subtitle leading-snug">
                          Monthly Gross PPL and PPL after overheads trend. Left: pence per litre
                        </p>
                      </div>
                      <PPLComparisonChart
                        startDate={startDate}
                        endDate={endDate}
                        siteIds={selectedSiteIds}
                        hasVolume={quickInsightsHasVolume}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Shop Section (wireframe: Shop, Shop Sales, Shop Profit) */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground px-3 sm:px-4 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Shop
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Shop Metrics: Shop Sales & Breakdown from N/C 4032, 4034, 4036, 4037, 4039 */}
                {(() => {
                  const shopTotal = Math.abs(shopSales?.total || 0);
                  const hasShopData = shopTotal > 0;
                  const shopFmtM = (v) => { const a = Math.abs(v); if (a >= 1e6) return `£${(a / 1e6).toFixed(2)}M`; if (a >= 1e3) return `£${(a / 1e3).toFixed(2)}K`; return `£${a.toFixed(2)}`; };
                  const shopFmtExact = (v) => { const a = Math.abs(v); const [i, d] = a.toFixed(2).split('.'); return `£${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`; };
                  const shopFmt = showRevenueInMillions ? shopFmtM : shopFmtExact;
                  const shopProfitFmtM = (v) => {
                    const n = Number(v) || 0;
                    const neg = n < 0;
                    const a = Math.abs(n);
                    let body;
                    if (a >= 1e6) body = `£${(a / 1e6).toFixed(2)}M`;
                    else if (a >= 1e3) body = `£${(a / 1e3).toFixed(2)}K`;
                    else body = `£${a.toFixed(2)}`;
                    return neg ? `-${body}` : body;
                  };
                  const shopProfitFmtExact = (v) => {
                    const n = Number(v) || 0;
                    const neg = n < 0;
                    const a = Math.abs(n);
                    const [i, d] = a.toFixed(2).split('.');
                    const body = `£${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`;
                    return neg ? `-${body}` : body;
                  };
                  const shopProfitFmt = showRevenueInMillions ? shopProfitFmtM : shopProfitFmtExact;
                  return (
                    <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-purple-500" />
                        Shop Sales
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                            {loadingShopSales ? (
                              <div className="h-8 bg-muted animate-pulse rounded" />
                            ) : hasShopData ? (
                              <>
                                <p className="text-2xl font-bold text-green-500">{shopFmt(shopTotal)}</p>
                                <p className="text-xs text-muted-foreground mt-1" />
                                <button
                                  type="button"
                                  className="mt-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                                  onClick={() => openBreakdown("shop-sales")}
                                >
                                  View breakdown -&gt;
                                </button>
                              </>
                            ) : (
                              <>
                      <p className="text-2xl font-bold text-muted-foreground">N/A</p>
                                <p className="text-sm text-muted-foreground mt-2">No shop data for selected period</p>
                              </>
                            )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PoundSterling className="w-5 h-5 text-green-500" />
                        Shop Profit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                            {loadingShopProfit ? (
                              <div className="h-8 bg-muted animate-pulse rounded" />
                            ) : shopProfitData && (shopProfitData.shopSales > 0 || shopProfitData.shopCost > 0) ? (
                              <>
                                <p className="text-2xl font-bold text-green-500">
                                  {shopProfitFmt(shopProfitData.shopProfit)}
                                </p>
                                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                                  <p>Sales: {shopFmt(shopProfitData.shopSales)}</p>
                                  <p>Cost: {shopFmt(shopProfitData.shopCost)}</p>
                                  <p>Margin: {shopProfitData.margin?.toFixed(1) ?? '0.0'}%</p>
                                </div>
                              </>
                            ) : (
                              <>
                      <p className="text-2xl font-bold text-muted-foreground">N/A</p>
                                <p className="text-sm text-muted-foreground mt-2">No shop profit data for selected period</p>
                              </>
                            )}
                    </CardContent>
                  </Card>
                </div>

                <ShopMonthlyComboChart
                  startDate={startDate}
                  endDate={endDate}
                  siteIds={selectedSiteIds}
                  showInMillions={showRevenueInMillions}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5 text-purple-500" />
                                Shop Sales Breakdown
                        </CardTitle>
                      </div>
                            <CardDescription>Sales by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                            {loadingShopSales ? (
                              <div className="flex items-center justify-center min-h-[200px]">
                                <div className="text-muted-foreground text-sm">Loading...</div>
                              </div>
                            ) : shopBreakdown?.length > 0 ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-border">
                                  <span className="text-sm font-semibold">Total Shop Sales</span>
                                  <span className="text-sm font-bold text-green-500">{shopFmt(shopTotal)}</span>
                                </div>
                                {shopBreakdown.map((item) => {
                                  const val = Math.abs(Number(item.value ?? item.netSales ?? 0));
                                  const pct = shopTotal > 0 ? (val / shopTotal * 100).toFixed(1) : '0.0';
                                  return (
                                    <div
                                      key={item.code}
                                      className="flex items-start justify-between gap-2 py-1.5 sm:items-center sm:gap-3"
                                    >
                                      <div className="flex min-w-0 flex-1 items-start gap-2 sm:min-w-0 sm:items-center">
                                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-purple-500 sm:mt-0" />
                                        <span className="min-w-0 flex-1 break-words text-sm leading-snug text-muted-foreground">
                                          {item.name || ''}
                                        </span>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2 tabular-nums sm:gap-3">
                                        <span className="whitespace-nowrap text-sm font-medium">{shopFmt(val)}</span>
                                        <span className="w-11 shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground sm:w-12">
                                          {pct}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">No shop data for selected period</div>
                            )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <PoundSterling className="w-5 h-5 text-green-500" />
                                Shop Cost Breakdown
                              </CardTitle>
                      </div>
                            <CardDescription>Cost by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                            {loadingShopProfit ? (
                              <div className="flex items-center justify-center min-h-[200px]">
                                <div className="text-muted-foreground text-sm">Loading...</div>
                              </div>
                            ) : shopProfitData?.costBreakdown?.length > 0 ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-border">
                                  <span className="text-sm font-semibold">Total Shop Cost</span>
                                  <span className="text-sm font-bold text-green-500">{shopFmt(shopProfitData.shopCost)}</span>
                                </div>
                                {shopProfitData.costBreakdown.map((item) => {
                                  const val = Math.abs(item.amount || 0);
                                  const pct = shopProfitData.shopCost > 0 ? (val / shopProfitData.shopCost * 100).toFixed(1) : '0.0';
                                  return (
                                    <div
                                      key={item.code}
                                      className="flex items-start justify-between gap-2 py-1.5 sm:items-center sm:gap-3"
                                    >
                                      <div className="flex min-w-0 flex-1 items-start gap-2 sm:min-w-0 sm:items-center">
                                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500 sm:mt-0" />
                                        <span className="min-w-0 flex-1 break-words text-sm leading-snug text-muted-foreground">
                                          {item.name || ''}
                                        </span>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2 tabular-nums sm:gap-3">
                                        <span className="whitespace-nowrap text-sm font-medium">{shopFmt(val)}</span>
                                        <span className="w-11 shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground sm:w-12">
                                          {pct}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div className="flex items-center justify-between py-2 border-t border-border mt-2">
                                  <span className="text-sm font-semibold">Shop Profit</span>
                                  <span className="text-sm font-bold text-green-500">{shopProfitFmt(shopProfitData.shopProfit)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">No shop cost data for selected period</div>
                            )}
                    </CardContent>
                  </Card>
                </div>
                    </>
                  );
                })()}

              {/* Valeting (wireframe: Valeting, Valet sales, Valeting Profit + Valet Margin line) */}
              <div className="mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground px-3 sm:px-4 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Coffee &amp; Valet
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Coffee & Valet metrics from N/C 4028,4029,4030,4031,4017 − 5028,5029,5030,5031 */}
                {(() => {
                  const valetTotal = Math.abs(avgBasketSize?.value || 0);
                  const hasValetData = valetTotal > 0;
                  const vFmtM = (v) => { const a = Math.abs(v); if (a >= 1e6) return `£${(a / 1e6).toFixed(2)}M`; if (a >= 1e3) return `£${(a / 1e3).toFixed(2)}K`; return `£${a.toFixed(2)}`; };
                  const vFmtExact = (v) => { const a = Math.abs(v); const [i, d] = a.toFixed(2).split('.'); return `£${i.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${d}`; };
                  const vFmt = showRevenueInMillions ? vFmtM : vFmtExact;
                  return (
                    <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="w-5 h-5 text-blue-500" />
                              Coffee &amp; Valet
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                            {loadingAvgBasketSize ? (
                              <div className="h-8 bg-muted animate-pulse rounded" />
                            ) : hasValetData ? (
                              <>
                                <p className="text-2xl font-bold text-green-500">{vFmt(valetTotal)}</p>
                                <p className="text-xs text-muted-foreground mt-1" />
                                <button
                                  type="button"
                                  className="mt-2.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                                  onClick={() => openBreakdown("valet-sales")}
                                >
                                  View breakdown -&gt;
                                </button>
                              </>
                            ) : (
                              <>
                      <p className="text-2xl font-bold text-muted-foreground">N/A</p>
                                <p className="text-sm text-muted-foreground mt-2">No Coffee &amp; Valet data for selected period</p>
                              </>
                            )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PoundSterling className="w-5 h-5 text-green-500" />
                        {COFFEE_VALET_PROFIT_LABEL}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                            {loadingValetProfit ? (
                              <div className="h-8 bg-muted animate-pulse rounded" />
                            ) : valetProfitData && (valetProfitData.valetSales > 0 || valetProfitData.valetCost > 0) ? (
                              <>
                                <p className={`text-2xl font-bold ${valetProfitData.valetProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {vFmt(valetProfitData.valetProfit)}
                                </p>
                                <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                                  <p>Sales: {vFmt(valetProfitData.valetSales)}</p>
                                  <p>Cost: {vFmt(valetProfitData.valetCost)}</p>
                                  <p>Margin: {valetProfitData.margin?.toFixed(1) ?? '0.0'}%</p>
                                </div>
                              </>
                            ) : (
                              <>
                      <p className="text-2xl font-bold text-muted-foreground">N/A</p>
                                <p className="text-sm text-muted-foreground mt-2">No Coffee &amp; Valet profit data for selected period</p>
                              </>
                            )}
                    </CardContent>
                  </Card>
                </div>

                <ValetMonthlyComboChart
                  startDate={startDate}
                  endDate={endDate}
                  siteIds={selectedSiteIds}
                  showInMillions={showRevenueInMillions}
                />

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                        <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Car className="w-5 h-5 text-blue-500" />
                                Coffee &amp; Valet Sale breakdown
                              </CardTitle>
                    </div>
                            <CardDescription>Sales by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                            {loadingAvgBasketSize ? (
                              <div className="flex items-center justify-center min-h-[200px]">
                                <div className="text-muted-foreground text-sm">Loading...</div>
                              </div>
                            ) : valetBreakdown?.length > 0 ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-border">
                                  <span className="text-sm font-semibold">Total Coffee &amp; Valet</span>
                                  <span className="text-sm font-bold text-green-500">{vFmt(valetTotal)}</span>
                                </div>
                                {valetBreakdown.map((item) => {
                                  const val = Math.abs(Number(item.value ?? item.netSales ?? 0));
                                  const pct = valetTotal > 0 ? (val / valetTotal * 100).toFixed(1) : '0.0';
                                  return (
                                    <div
                                      key={item.code}
                                      className="flex items-start justify-between gap-2 py-1.5 sm:items-center sm:gap-3"
                                    >
                                      <div className="flex min-w-0 flex-1 items-start gap-2 sm:min-w-0 sm:items-center">
                                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500 sm:mt-0" />
                                        <span className="min-w-0 flex-1 break-words text-sm leading-snug text-muted-foreground">
                                          {item.name || ''}
                                        </span>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2 tabular-nums sm:gap-3">
                                        <span className="whitespace-nowrap text-sm font-medium">{vFmt(val)}</span>
                                        <span className="w-11 shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground sm:w-12">
                                          {pct}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">No Coffee &amp; Valet data for selected period</div>
                            )}
                  </CardContent>
                </Card>
                        <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <PoundSterling className="w-5 h-5 text-green-500" />
                                Coffee &amp; Valet cost breakdown
                              </CardTitle>
                    </div>
                            <CardDescription>Cost by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                            {loadingValetProfit ? (
                              <div className="flex items-center justify-center min-h-[200px]">
                                <div className="text-muted-foreground text-sm">Loading...</div>
                              </div>
                            ) : valetProfitData?.costBreakdown?.length > 0 ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-border">
                                  <span className="text-sm font-semibold">Total Coffee &amp; Valet cost</span>
                                  <span className="text-sm font-bold text-green-500">{vFmt(valetProfitData.valetCost)}</span>
                                </div>
                                {valetProfitData.costBreakdown.map((item) => {
                                  const val = Math.abs(item.amount || 0);
                                  const pct = valetProfitData.valetCost > 0 ? (val / valetProfitData.valetCost * 100).toFixed(1) : '0.0';
                                  return (
                                    <div
                                      key={item.code}
                                      className="flex items-start justify-between gap-2 py-1.5 sm:items-center sm:gap-3"
                                    >
                                      <div className="flex min-w-0 flex-1 items-start gap-2 sm:min-w-0 sm:items-center">
                                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500 sm:mt-0" />
                                        <span className="min-w-0 flex-1 break-words text-sm leading-snug text-muted-foreground">
                                          {item.name || ''}
                                        </span>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2 tabular-nums sm:gap-3">
                                        <span className="whitespace-nowrap text-sm font-medium">{vFmt(val)}</span>
                                        <span className="w-11 shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground sm:w-12">
                                          {pct}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div className="flex items-center justify-between py-2 border-t border-border mt-2">
                                  <span className="text-sm font-semibold">{COFFEE_VALET_PROFIT_LABEL}</span>
                                  <span className="text-sm font-bold text-green-500">{vFmt(valetProfitData.valetProfit)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm">No Coffee &amp; Valet cost data for selected period</div>
                            )}
                  </CardContent>
                </Card>
                      </div>
                    </>
                  );
                })()}

                {/* Return On Investment (wireframe: title "Return On Investment", subtitle "Cash", ROI trend, Top/Bottom sites with badges, disclaimer) */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <div className="px-3 sm:px-4 text-center">
                    <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground">
                      Return On Investment
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Cash</p>
                  </div>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6 min-w-0">
                  <Card className="min-w-0">
                    <CardHeader className="pb-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <h3 className="dash-chart-heading">Site ROI Trend Over Time</h3>
                          <p className="dash-chart-subtitle leading-snug">
                            Monthly EBITDA and ROI % by month. Left: EBITDA (£) · Right: ROI %
                          </p>
                        </div>
                        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                          {!loadingROITrend && roiTrendChart.rows?.length > 0 ? (
                            <div className="inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold border border-border bg-muted/40 text-foreground whitespace-nowrap">
                              Total EBITDA: {formatRoiTrendGbp(roiTrendTotalEbita, true)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 relative">
                      {/* Mobile-only tooltip — floats over the card header area, never over chart lines */}
                      {!smUp && activeRoiLabel && roiTrendChart.rows?.length > 0 && (() => {
                        const row = roiTrendChart.rows.find(r => (r.labelFull || r.label) === activeRoiLabel) || {};
                        const rows = [
                          { color: ROI_TREND_COL_EBITA, label: "EBITDA", value: formatRoiTrendGbp(row.ebita, true) },
                          { color: ROI_TREND_COL_ROI, label: "ROI", value: formatRoiTrendPct(row.roiTotal, true) },
                        ];
                        return (
                          <div
                            className="pointer-events-none sm:hidden"
                            style={{
                              position: "absolute",
                              top: -48,
                              right: 8,
                              zIndex: 99999,
                              backgroundColor: "hsl(222, 47%, 11%)",
                              border: "1px solid hsl(217, 33%, 20%)",
                              borderRadius: 8,
                              padding: "5px 8px",
                              boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
                              maxWidth: "70%",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <p style={{ color: "#fff", fontWeight: 700, fontSize: 9, marginBottom: 3, letterSpacing: "0.02em" }}>
                              {activeRoiLabel}
                            </p>
                            <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
                              {rows.map((r) => (
                                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: r.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.75)" }}>{r.label}:</span>
                                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.95)", fontWeight: 700 }}>{r.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {loadingROITrend ? (
                        <div className="min-h-[280px] h-[300px] sm:h-[320px] bg-muted/30 animate-pulse rounded-md" />
                      ) : !roiTrendChart.rows?.length ? (
                        <div className="flex flex-col items-center justify-center min-h-[280px] text-center text-muted-foreground gap-2">
                          <p className="text-lg font-medium">No data</p>
                          <p className="text-sm">No ROI trend rows for this date range (try a wider range or check transactions).</p>
                        </div>
                      ) : (
                        <div
                          className="w-full relative"
                          style={{ height: smUp ? 320 : 320 }}
                        >
                          <div className="h-full w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart
                                data={roiTrendChart.rows}
                                margin={roiTrendChartMargin}
                                onMouseMove={(d) => { if (!smUp && d?.activeLabel) setActiveRoiLabel(d.activeLabel); }}
                                onMouseLeave={() => { if (!smUp) setActiveRoiLabel(null); }}
                              >
                                <CartesianGrid {...dashCartesianGridProps} vertical={false} />
                                <XAxis
                                  dataKey="labelFull"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{
                                    fill: "hsl(var(--foreground))",
                                    fontSize: smUp ? roiTrendTickX : 9,
                                    fontWeight: 500,
                                  }}
                                  angle={smUp ? -32 : -45}
                                  textAnchor="end"
                                  height={smUp ? 42 : 46}
                                  interval={roiTrendXInterval}
                                  minTickGap={0}
                                  tickFormatter={formatMonthAxisTick}
                                />
                                <YAxis
                                  yAxisId="gbp"
                                  axisLine={false}
                                  tickLine={false}
                                  domain={roiTrendGbpAxis.domain}
                                  ticks={roiTrendGbpAxis.ticks}
                                  tick={{
                                    fill: "hsl(var(--foreground))",
                                    fontSize: roiTrendTickY,
                                    fontWeight: 500,
                                  }}
                                  width={roiTrendGbpAxisW}
                                  tickFormatter={(v) => formatRoiTrendGbp(v, true)}
                                  label={smUp ? {
                                    value: "EBITDA (£)",
                                    angle: -90,
                                    position: "left",
                                    offset: 6,
                                    dx: -6,
                                    style: { fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 },
                                  } : {
                                    value: "EBITDA",
                                    angle: -90,
                                    position: "insideLeft",
                                    offset: 0,
                                    dx: -48,
                                    dy: 28,
                                    style: { fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 700, textAnchor: "middle" },
                                  }}
                                />
                                <YAxis
                                  yAxisId="pct"
                                  orientation="right"
                                  axisLine={false}
                                  tickLine={false}
                                  domain={roiTrendPctAxis.domain}
                                  ticks={roiTrendPctAxis.ticks}
                                  tick={{
                                    fill: "hsl(var(--foreground))",
                                    fontSize: roiTrendTickY,
                                    fontWeight: 600,
                                  }}
                                  width={roiTrendPctAxisW}
                                  tickFormatter={(v) => formatRoiTrendPctAxis(v)}
                                  label={smUp ? {
                                    value: "ROI %",
                                    angle: 90,
                                    position: "right",
                                    offset: 8,
                                    dx: 6,
                                    style: { fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 },
                                  } : {
                                    value: "ROI %",
                                    angle: 90,
                                    position: "insideRight",
                                    offset: 0,
                                    dx: 38,
                                    dy: -18,
                                    style: { fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 700, textAnchor: "middle" },
                                  }}
                                />
                                {roiTrendShowZeroPctLine ? (
                                  <ReferenceLine
                                    yAxisId="pct"
                                    y={0}
                                    stroke="#64748b"
                                    strokeDasharray="5 5"
                                    strokeOpacity={0.75}
                                  />
                                ) : null}
                                {smUp && (
                                  <Tooltip
                                    cursor={{
                                      stroke: "hsl(var(--muted-foreground))",
                                      strokeWidth: 1,
                                      strokeDasharray: "4 4",
                                      opacity: 0.85,
                                    }}
                                    content={(props) => (
                                      <RoiTrendChartTooltip {...props} compact={showRevenueInMillions} />
                                    )}
                                    shared
                                  />
                                )}
                                {!smUp && (
                                  <Tooltip
                                    cursor={{
                                      stroke: "hsl(var(--muted-foreground))",
                                      strokeWidth: 1,
                                      strokeDasharray: "4 4",
                                      opacity: 0.85,
                                    }}
                                    content={() => null}
                                  />
                                )}
                                <Legend
                                  wrapperStyle={{
                                    paddingTop: "4px",
                                    width: "100%",
                                    fontSize: "10px",
                                    color: "hsl(var(--foreground))",
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "0.25rem 0.5rem",
                                    justifyContent: "center",
                                    rowGap: "6px",
                                  }}
                                  iconType="circle"
                                  iconSize={8}
                                  formatter={(value) => (
                                    <span className="text-[10px] font-medium" style={{ color: "hsl(var(--foreground))" }}>
                                      {value}
                                    </span>
                                  )}
                                />
                                <Line
                                  yAxisId="gbp"
                                  type="monotone"
                                  dataKey="ebita"
                                  name="EBITDA"
                                  stroke={ROI_TREND_COL_EBITA}
                                  strokeWidth={smUp ? 2 : 1.75}
                                  dot={{
                                    fill: ROI_TREND_COL_EBITA,
                                    r: smUp ? 3 : 2.5,
                                    stroke: "hsl(var(--card))",
                                    strokeWidth: 1,
                                  }}
                                  activeDot={{
                                    r: smUp ? 5 : 4,
                                    stroke: "hsl(var(--card))",
                                    strokeWidth: 1,
                                    fill: ROI_TREND_COL_EBITA,
                                  }}
                                  connectNulls
                                  isAnimationActive={roiTrendChart.rows.length <= 24}
                                />
                                <Line
                                  yAxisId="pct"
                                  type="monotone"
                                  dataKey="roiTotal"
                                  name="ROI %"
                                  stroke={ROI_TREND_COL_ROI}
                                  strokeWidth={smUp ? 2 : 1.75}
                                  dot={{
                                    fill: ROI_TREND_COL_ROI,
                                    r: smUp ? 3 : 2.5,
                                    stroke: "hsl(var(--card))",
                                    strokeWidth: 1,
                                  }}
                                  activeDot={{
                                    r: smUp ? 5 : 4,
                                    stroke: "hsl(var(--card))",
                                    strokeWidth: 1,
                                    fill: ROI_TREND_COL_ROI,
                                  }}
                                  connectNulls
                                  isAnimationActive={roiTrendChart.rows.length <= 24}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="min-w-0">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Top Performing Sites</CardTitle>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-700 dark:text-green-400">Best Performers</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 overflow-visible">
                      <PetrolTopPerformingSitesTable
                        startDate={startDate}
                        endDate={endDate}
                        siteIds={selectedSiteIds}
                        hideTitle
                      />
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <Card className="min-w-0">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Sites Needing Improvement</CardTitle>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-700 dark:text-orange-400">Needs Attention</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 overflow-visible">
                      <PetrolSitesNeedingImprovementTable
                        startDate={startDate}
                        endDate={endDate}
                        siteIds={selectedSiteIds}
                        hideTitle
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Overheads (wireframe 18: 7151 General Rates, 7150 Rent, 7200 Electricity, 7800 Repairs & Renewals, 7906 Credit Charges; Wages 7000-7003,7005-7008,7010,7006,7007) */}
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground px-3 sm:px-4">
                    Overheads
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-indigo-500" />
                          Overhead Cost Breakdown
                        </CardTitle>
                      </div>
                      <CardDescription>
                        Cost (£). Wages and overheads by category. Open More Overheads to show or hide categories in the list below.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loadingOverheadsData ? (
                        <div className="h-64 bg-muted/30 animate-pulse rounded" />
                      ) : (
                        <div className="space-y-3">
                          {(() => {
                            const breakdownItems = overheadsData?.breakdown || [];
                            const codeAmtMap = {};
                            breakdownItems.forEach(it => { codeAmtMap[String(it.code).trim()] = Number(it.amount ?? 0); });
                            const grouped = OH_GROUPS.map(g => {
                              const amt = g.key === 'wages'
                                ? Number(overheadsData?.labour ?? 0)
                                : g.codes.reduce((s, c) => s + (codeAmtMap[c] || 0), 0);
                              return { key: g.key, label: g.label, amount: amt };
                            });
                            const groupsWithData = grouped.filter(g => Math.abs(g.amount) > 0);
                            if (groupsWithData.length === 0) {
                              return <p className="text-sm text-muted-foreground py-4">No overhead data for the selected date range.</p>;
                            }
                            const DEFAULT_KEY_ORDER = ['wages', 'rent', 'rentals', 'generalRates', 'creditCharges'];
                            const groupsForFilter = [...groupsWithData].sort((a, b) => {
                              const ia = DEFAULT_KEY_ORDER.indexOf(a.key);
                              const ib = DEFAULT_KEY_ORDER.indexOf(b.key);
                              if (ia !== -1 && ib !== -1) return ia - ib;
                              if (ia !== -1) return -1;
                              if (ib !== -1) return 1;
                              const oa = OH_GROUPS.findIndex((g) => g.key === a.key);
                              const ob = OH_GROUPS.findIndex((g) => g.key === b.key);
                              return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
                            });
                            const visibleGroups = groupsWithData.filter(g => ohVisibleKeys.has(g.key));
                            const totalAbs = visibleGroups.reduce((s, g) => s + Math.abs(g.amount), 0);
                            const ohToggle = (key) => {
                              setOhVisibleKeys(prev => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key); else next.add(key);
                                return next;
                              });
                            };
                            return (
                              <>
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <div className="relative" ref={ohDropdownRef}>
                                    <button
                                      type="button"
                                      onClick={() => setOhDropdownOpen((p) => !p)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background text-muted-foreground hover:bg-muted transition-colors"
                                    >
                                      More Overheads
                                      <ChevronDown className={`h-3 w-3 transition-transform ${ohDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {ohDropdownOpen && (
                                      <div className="absolute z-50 mt-1 left-0 min-w-[260px] max-h-[min(70vh,420px)] overflow-y-auto bg-background border border-border rounded-lg shadow-lg py-1">
                                        {groupsForFilter.map((g) => {
                                          const on = ohVisibleKeys.has(g.key);
                                          return (
                                            <button
                                              key={g.key}
                                              type="button"
                                              onClick={() => ohToggle(g.key)}
                                              className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                                            >
                                              <span
                                                className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${on ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}
                                              >
                                                {on && <Check className="h-2 w-2 text-primary-foreground" />}
                                              </span>
                                              <span className="min-w-0 flex-1">{g.label}</span>
                                              <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                                                {overheadCardFormat(g.amount)}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {visibleGroups.map(g => {
                                  const amt = g.amount;
                                  const isNeg = amt < 0;
                                  const pct = totalAbs > 0 ? Math.min(100, (Math.abs(amt) / totalAbs) * 100) : 0;
                                  return (
                                    <div key={g.key} className="flex items-center gap-3">
                                      <span className="text-sm w-40 shrink-0">{g.label}</span>
                                      <div className="flex-1 h-6 bg-primary/20 rounded overflow-hidden">
                                        <div className={`h-full rounded ${isNeg ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-sm font-medium w-24 text-right">{overheadCardFormat(amt)}</span>
                                    </div>
                                  );
                                })}
                                {overheadsData?.total !== undefined && (
                                  <div className="flex items-center gap-3 border-t pt-2 mt-2 font-semibold">
                                    <span className="text-sm w-40 shrink-0">Total</span>
                                    <div className="flex-1" />
                                    <span className="text-sm font-medium w-24 text-right">{overheadCardFormat(overheadsData.total)}</span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="mb-2">
                        <h3 className="dash-chart-heading">Monthly Overhead Cost Trends</h3>
                        <p className="dash-chart-subtitle leading-snug">
                          Overhead costs by category over time. Cost (£)
                        </p>
                      </div>
                      <OverheadTrendsChart startDate={startDate} endDate={endDate} siteIds={selectedSiteIds} showInMillions={showRevenueInMillions} />
                    </CardContent>
                  </Card>
                </div>
              </div>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "site-revenue"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Total Site Revenue Breakdown"
              >
                {siteRevenueBreakdown ? (() => {
                  // Show all fuel codes as-is — no deductions from individual rows
                  const FUEL_HIDE_CODES = new Set(['4100', '4102']);
                  const itemAbs = (item) => Math.abs(Number(item.value ?? item.volume ?? item.netSales ?? item.amount ?? 0));
                  // Display list excludes 4100 and 4102 (bunkering charges — hidden, already reflected in fuel total)
                  const visibleFuelRows = (fuelByNominalBreakdown || []).filter((item) => !FUEL_HIDE_CODES.has(item.code));
                  const dieselAdjustedVal = (item) => itemAbs(item);
                  const fuelSum = visibleFuelRows.reduce((s, item) => s + dieselAdjustedVal(item), 0);
                  const shopSum = (shopBreakdown || []).reduce((s, item) => s + itemAbs(item), 0);
                  const valetSum = (valetBreakdown || []).reduce((s, item) => s + itemAbs(item), 0);
                  // Fuel Sales header = sum of visible rows (raw, no deductions)
                  const fuelSales = fuelSum || Math.abs(Number(siteRevenueBreakdown.fuelSales || 0));
                  const shopSales = (shopBreakdown?.length > 0)
                    ? shopSum
                    : (typeof siteRevenueBreakdown.shopSales === 'number' ? Math.abs(siteRevenueBreakdown.shopSales) : null);
                  const valetSales = (valetBreakdown?.length > 0)
                    ? valetSum
                    : (typeof siteRevenueBreakdown.valetSales === 'number' ? Math.abs(siteRevenueBreakdown.valetSales) : null);
                  // Total = fuel + shop + valet (consistent with children)
                  const totalRev = fuelSales + (shopSales || 0) + (valetSales || 0);

                  // Exact percentages — raw value / Total Revenue * 100, full precision.
                  const rawPct = (val) => totalRev > 0 ? (val / totalRev) * 100 : 0;
                  const pctMap = new Map();
                  visibleFuelRows.forEach((item) => {
                    pctMap.set(`fuel-${item.code}`, rawPct(dieselAdjustedVal(item)));
                  });
                  (shopBreakdown || []).forEach((item) => {
                    pctMap.set(`shop-${item.code}`, rawPct(itemAbs(item)));
                  });
                  (valetBreakdown || []).forEach((item) => {
                    pctMap.set(`valet-${item.code}`, rawPct(itemAbs(item)));
                  });
                  const fuelPct = visibleFuelRows.reduce(
                    (s, item) => s + (pctMap.get(`fuel-${item.code}`) || 0), 0);
                  const shopPct = (shopBreakdown || []).reduce(
                    (s, item) => s + (pctMap.get(`shop-${item.code}`) || 0), 0);
                  const valetPct = (valetBreakdown || []).reduce(
                    (s, item) => s + (pctMap.get(`valet-${item.code}`) || 0), 0);
                  const getLeafPct = (groupPrefix, code) => pctMap.get(`${groupPrefix}-${code}`) ?? 0;
                  return (
                  <>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      Each row: category, value, % of total site revenue.
                    </p>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] gap-x-2 pb-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                      <span>Name</span>
                      <span className="text-right">Value</span>
                      <span className="text-right">%</span>
                    </div>
                    <ThreeColumnBreakdownRow
                      name="Fuel Sales"
                      value={showRevenueInMillions ? formatCurrency(fuelSales) : formatCurrencyExact2(fuelSales)}
                      percent={fuelPct}
                    />
                    {visibleFuelRows.length > 0 && (
                      <div className="pl-3 border-l-2 border-emerald-500/35 my-2 space-y-0">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 pt-1">
                          Fuel by product (value £)
                        </p>
                        {visibleFuelRows.map((item) => {
                          const rawVal = dieselAdjustedVal(item);
                          const childPct = getLeafPct('fuel', item.code);
                          return (
                            <ThreeColumnBreakdownRow
                              key={item.code}
                              name={`${item.code} ${item.name || ""}`.trim()}
                              value={formatCurrencyExact2(rawVal)}
                              percent={childPct}
                            />
                          );
                        })}
                      </div>
                    )}
                    {otherIncomeBreakdown?.length > 0 && (
                      <div className="pl-3 border-l-2 border-muted space-y-0 my-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 pt-1">
                          Other income (value £)
                        </p>
                        {otherIncomeBreakdown.map((item) => (
                          <ThreeColumnBreakdownRow
                            key={item.code}
                            name={`${item.code} ${item.name || ""}`.trim()}
                            value={formatCurrencyExact2(itemAbs(item))}
                            percent={totalRev > 0 ? (itemAbs(item) / totalRev) * 100 : 0}
                          />
                        ))}
                      </div>
                    )}
                    <ThreeColumnBreakdownRow
                      name="Shop Sales"
                      value={shopSales != null ? (showRevenueInMillions ? formatCurrency(shopSales) : formatCurrencyExact2(shopSales)) : "N/A"}
                      percent={shopSales != null ? shopPct : undefined}
                      subLabel={shopSales == null ? "Not managed by the client (HSRL)" : undefined}
                    />
                    {shopBreakdown?.length > 0 && (
                      <div className="pl-3 border-l-2 border-muted space-y-0 my-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 pt-1">
                          Shop by product (value £)
                        </p>
                        {shopBreakdown.map((item) => (
                          <ThreeColumnBreakdownRow
                            key={item.code}
                            name={`${item.code} ${item.name || ""}`.trim()}
                            value={formatCurrencyExact2(itemAbs(item))}
                            percent={getLeafPct('shop', item.code)}
                          />
                        ))}
                      </div>
                    )}
                    <ThreeColumnBreakdownRow
                      name={COFFEE_VALET_REVENUE_LABEL}
                      value={valetSales != null ? (showRevenueInMillions ? formatCurrency(valetSales) : formatCurrencyExact2(valetSales)) : "N/A"}
                      percent={valetSales != null ? valetPct : undefined}
                      subLabel={valetSales == null ? "Not managed by the client (HSRL)" : undefined}
                    />
                    {valetBreakdown?.length > 0 && (
                      <div className="pl-3 border-l-2 border-muted space-y-0 my-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 pt-1">
                          Coffee &amp; Valet by product (value £)
                        </p>
                        {valetBreakdown.map((item) => (
                          <ThreeColumnBreakdownRow
                            key={item.code}
                            name={`${item.code} ${item.name || ""}`.trim()}
                            value={formatCurrencyExact2(itemAbs(item))}
                            percent={getLeafPct('valet', item.code)}
                          />
                        ))}
                      </div>
                    )}
                    <div className="mt-2 border-t-2 border-primary pt-2">
                      <ThreeColumnBreakdownRow
                        name="TOTAL REVENUE"
                        value={showRevenueInMillions ? formatCurrency(totalRev) : formatCurrencyExact2(totalRev)}
                        percent={100}
                        bold
                      />
                    </div>
                  </>
                  );
                })() : (
                  <p className="text-xs text-muted-foreground">No breakdown data</p>
                )}
              </CardDetailModal>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "shop-sales"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Shop Sales Breakdown"
              >
                {shopBreakdown?.length > 0 ? (
                  <>
                    <DetailItem
                      label="Shop Sales Total"
                      value={formatCurrencyExact2(Math.abs(shopSales?.total || 0))}
                      isTotal
                    />
                    <div className="pl-3 border-l-2 border-muted space-y-1 my-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Shop by product (value £)</p>
                      {shopBreakdown.map((item) => (
                        <DetailItem
                          key={item.code}
                          label={`${item.code} ${item.name || ""}`}
                          value={formatCurrencyExact2(Math.abs(Number(item.value ?? item.netSales ?? 0)))}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No shop breakdown data</p>
                )}
              </CardDetailModal>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "shop-section-breakdown"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Shop Sales Breakdown"
              >
                {shopBreakdown?.length > 0 ? (
                  <>
                    <DetailItem
                      label="Total Shop Sales"
                      value={formatCurrencyExact2(Math.abs(shopSales?.total || 0))}
                      isTotal
                    />
                    <div className="pl-3 border-l-2 border-muted space-y-1 my-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">By category</p>
                      {shopBreakdown.map((item) => (
                        <DetailItem
                          key={item.code}
                          label={`${item.code} ${item.name || ""}`}
                          value={formatCurrencyExact2(Math.abs(Number(item.value ?? item.netSales ?? 0)))}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No shop breakdown data for selected period</p>
                )}
              </CardDetailModal>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "valet-sales"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Coffee & Valet — breakdown"
              >
                {valetBreakdown?.length > 0 ? (
                  <>
                    <DetailItem
                      label="Coffee & Valet total"
                      value={formatCurrencyExact2(Math.abs(avgBasketSize?.value || 0))}
                      isTotal
                    />
                    <div className="pl-3 border-l-2 border-muted space-y-1 my-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Coffee &amp; Valet by product (value £)</p>
                      {valetBreakdown.map((item) => (
                        <DetailItem
                          key={item.code}
                          label={`${item.code} ${item.name || ""}`}
                          value={formatCurrencyExact2(Math.abs(Number(item.value ?? item.netSales ?? 0)))}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No Coffee &amp; Valet breakdown data</p>
                )}
              </CardDetailModal>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "fuel-volume"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Total Fuel Volume — Breakdown"
                maxWidth="max-w-md"
              >
                <>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Volume by category and site: name, litres, % of total fuel volume in this breakdown.
                  </p>
                  {/* Volume by categories */}
                  {fuelVolumeTransitionBreakdown?.byNominalCode?.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mt-1 mb-1.5">Volume by categories</p>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] gap-x-2 pb-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                        <span>Name</span>
                        <span className="text-right">Volume</span>
                        <span className="text-right">%</span>
                      </div>
                      {(() => {
                        const denom =
                          Math.abs(Number(fuelVolumeTransitionBreakdown.totalVolume)) ||
                          fuelVolumeTransitionBreakdown.byNominalCode.reduce(
                            (s, x) => s + Math.abs(Number(x.volume ?? 0)),
                            0,
                          );
                        const pctVol = (litres) =>
                          denom > 0 ? (Math.abs(Number(litres ?? 0)) / denom) * 100 : 0;
                        return fuelVolumeTransitionBreakdown.byNominalCode.map((item) => (
                          <ThreeColumnBreakdownRow
                            key={item.code}
                            name={`${String(item.code ?? "")} ${item.name || item.code || ""}`.trim()}
                            value={formatVolume(Math.abs(item.volume ?? 0))}
                            percent={pctVol(item.volume)}
                          />
                        ));
                      })()}
                    </>
                  )}
                  {/* Volume by site (L) — net volume (positive and negative segments summed as-is) */}
                  {fuelVolumeTransitionBreakdown?.breakdown?.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mt-4 mb-1.5">Volume by site (L)</p>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] gap-x-2 pb-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                        <span>Site</span>
                        <span className="text-right">Volume</span>
                        <span className="text-right">%</span>
                      </div>
                      {(() => {
                        const siteRows = fuelVolumeTransitionBreakdown.breakdown.filter((item) => {
                          const siteName = String(item.site ?? item.label ?? "").trim().toUpperCase();
                          const vol = Number(item.volume ?? 0);
                          return siteName === "HEAD OFFICE" || vol !== 0;
                        });
                        const siteSum = siteRows.reduce(
                          (s, x) => s + Math.abs(Number(x.volume ?? 0)),
                          0,
                        );
                        const pctSite = (v) =>
                          siteSum > 0 ? (Math.abs(Number(v ?? 0)) / siteSum) * 100 : 0;
                        return siteRows.map((item, idx) => {
                          const vol = Number(item.volume ?? 0);
                          const valueStr = vol < 0 ? `-${formatVolume(-vol)}` : formatVolume(vol);
                          return (
                            <ThreeColumnBreakdownRow
                              key={`site-${item.site ?? item.label}-${idx}`}
                              name={item.site ?? item.label}
                              value={valueStr}
                              percent={pctSite(vol)}
                            />
                          );
                        });
                      })()}
                    </>
                  )}
                  {!fuelVolumeTransitionBreakdown?.breakdown?.length && !fuelVolumeTransitionBreakdown?.byNominalCode?.length && (
                    <p className="text-xs text-muted-foreground">No breakdown data yet. Select a date range to load data.</p>
                  )}
                </>
              </CardDetailModal>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "net-profit"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Gross Profit Breakdown"
                maxWidth="max-w-md"
              >
                {profitBreakdown ? (() => {
                  const bFmt = showRevenueInMillions ? formatCurrency : formatCurrencyExact2;
                  const rows = profitBreakdown.otherIncomeBreakdown || [];
                  const amt = (code) => {
                    const row = rows.find((x) => String(x.code) === String(code));
                    return Number(row?.amount ?? 0);
                  };
                  // Category-wise fuel profit: Sales − (Purchases + Stock Movements)
                  const fuelCategories = [
                    { label: 'Unleaded', profit: amt('4000') + amt('5000') + amt('5046') },
                    { label: 'Diesel', profit: amt('4001') + amt('4101') + amt('5001') + amt('5047') + amt('4100') + amt('4102') + amt('5005') + amt('5041') },
                    { label: 'Super Unleaded', profit: amt('4002') + amt('5002') + amt('5048') },
                    { label: 'Super Diesel', profit: amt('4003') + amt('5003') + amt('5049') },
                    { label: 'Adblue', profit: amt('4004') + amt('5004') + amt('5050') },
                  ];
                  const fuelMag = Math.abs(fuelCategories.reduce((s, c) => s + c.profit, 0));
                  // Signed shop/valet so a loss reduces the total instead of inflating it.
                  const shopSigned = Number(totalNetProfit?.shopProfit ?? 0) || 0;
                  const valetSigned = Number(totalNetProfit?.valetProfit ?? 0) || 0;
                  const totalGross = fuelMag + shopSigned + valetSigned;
                  const pctOfTotal = (v) => (totalGross > 0 ? (Math.abs(v) / totalGross) * 100 : 0);
                  const BreakdownRow = ({ name, profit, bold = false, indent = false }) => {
                    // Row displays magnitude only — total at the bottom still reflects signed math (losses subtract).
                    return (
                    <div
                      className={cn(
                        'grid grid-cols-[minmax(0,1fr)_auto_3.5rem] gap-x-2 items-center py-2 text-sm border-b border-border/60',
                        bold && 'border-primary/25 bg-primary/5 -mx-1 px-1.5 rounded-md border-b-0',
                      )}
                    >
                      <span className={cn('text-foreground truncate pr-1', bold && 'font-semibold', indent && 'text-muted-foreground')}>{name}</span>
                      <span className={cn('tabular-nums text-right shrink-0', bold ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
                        {bFmt(Math.abs(profit))}
                      </span>
                      <span className={cn('tabular-nums text-right text-muted-foreground shrink-0')}>
                        {`${pctOfTotal(profit).toFixed(1)}%`}
                      </span>
                    </div>
                    );
                  };
                  return (
                    <>
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        Each row: category, gross profit, share of total (fuel + shop + {COFFEE_VALET_PROFIT_LABEL}).
                      </p>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] gap-x-2 pb-1 mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                        <span>Name</span>
                        <span className="text-right">Value</span>
                        <span className="text-right">%</span>
                      </div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-2 pb-1">
                        Fuel
                      </p>
                      <div className="pl-2 border-l-2 border-emerald-500/35 mb-1">
                        {fuelCategories.map(({ label, profit }) => (
                          <BreakdownRow key={`fuel-${label}`} name={label} profit={label === 'Charges' ? -Math.abs(profit) : Math.abs(profit)} indent />
                        ))}
                      </div>
                      <BreakdownRow name="Fuel (combined)" profit={fuelMag} />
                      <BreakdownRow name="Shop" profit={shopSigned} />
                      <BreakdownRow name={COFFEE_VALET_PROFIT_LABEL} profit={valetSigned} />
                      <div className="mt-2 pt-2 border-t-2 border-primary">
                        <BreakdownRow name="Total gross profit" profit={totalGross} bold />
                      </div>
                    </>
                  );
                })() : (
                  <p className="text-xs text-muted-foreground">No breakdown data</p>
                )}
              </CardDetailModal>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "total-net-profit"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Total Net Profit — Breakdown"
                maxWidth="max-w-md"
              >
                {totalNetProfitCardData ? (() => {
                  const tnp = totalNetProfitCardData;
                  const bFmt = showRevenueInMillions ? formatCurrency : formatCurrencyExact2;
                  return (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">
                        Total Net Profit = EBITDA − Depreciation − Loan Interest − Corporation Tax (9000)
                      </p>
                      <DetailItem label="EBITDA" value={bFmt(Math.abs(tnp.ebita ?? 0))} />
                      <div className="pl-3 border-l-2 border-muted space-y-1 my-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Depreciation (8200–8207)</p>
                        {(tnp.depreciationBreakdown || []).map((item) => (
                          <DetailItem
                            key={`dep-${item.code}`}
                            label={`${item.code} ${item.name || ""}`}
                            value={bFmt(Math.abs(item.amount ?? 0))}
                          />
                        ))}
                        <DetailItem
                          label="Total Depreciation"
                          value={bFmt(tnp.depreciation ?? 0)}
                          isTotal
                        />
                      </div>
                      <div className="pl-3 border-l-2 border-muted space-y-1 my-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Loan Interest (7750, 7705, 7752, 7753 — excludes 7751 for Total Net Profit only; EBITA unchanged)</p>
                        {(tnp.loanInterestBreakdown || []).map((item) => (
                          <DetailItem
                            key={`loan-${item.code}`}
                            label={`${item.code} ${item.name || ""}`}
                            value={bFmt(Math.abs(item.amount ?? 0))}
                          />
                        ))}
                        <DetailItem
                          label="Total Loan Interest"
                          value={bFmt(tnp.loanInterestTotal ?? 0)}
                          isTotal
                        />
                      </div>
                      <DetailItem
                        label="Corporation Tax (9000)"
                        value={bFmt(tnp.corporationTax ?? 0)}
                      />
                      <div className="border-t-2 border-primary pt-3 mt-4">
                        <DetailItem
                          label="Total Net Profit"
                          value={bFmt(Math.abs(tnp.totalNetProfit ?? 0))}
                          isTotal
                        />
                      </div>
                    </>
                  );
                })() : (
                  <p className="text-xs text-muted-foreground">No breakdown data</p>
                )}
              </CardDetailModal>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "labour-cost"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Labour Cost Breakdown"
              >
                {labourCostBreakdown?.breakdown?.length ? (
                  (() => {
                    const labFmt = showRevenueInMillions ? formatCurrency : formatCurrencyExact2;
                    return (
                  <>
                        <p className="text-xs text-muted-foreground mb-3">Labour Cost as a percentage of Fuel Sales.</p>
                        {labourCostBreakdown.breakdown
                          .filter((item) => ['7000', '7001', '7005'].includes(String(item.code).trim()))
                          .map((item) => (
                      <DetailItem
                        key={item.code}
                        label={item.name || item.code}
                            value={labFmt(Math.abs(item.amount || 0))}
                        subValue={`${(item.transactionCount || 0).toLocaleString()} transactions`}
                        code={item.code}
                      />
                    ))}
                    <DetailItem
                          label="Total Labour Cost (7000+7001+7005)"
                          value={labFmt(labourCostPercentage?.labourCost || 0)}
                      isTotal
                    />
                        <div className="border-t border-border pt-3 mt-3 space-y-1">
                          <DetailItem label="Fuel Sales" value={labFmt(labourCostPercentage?.totalSales || 0)} />
                          <DetailItem label="Labour Cost %" value={`${(labourCostPercentage?.value || 0).toFixed(2)}%`} isTotal />
                        </div>
                  </>
                    );
                  })()
                ) : (
                  <p className="text-xs text-muted-foreground">No breakdown data</p>
                )}
              </CardDetailModal>

              {/* EBITDA Breakdown */}
              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "ebita"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="EBITDA — Breakdown"
              >
                {ebita ? (() => {
                  const bFmt = showRevenueInMillions ? formatCurrency : formatCurrencyExact2;
                  const ebitaVal = Number(ebita.ebita ?? 0);
                  return (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">
                        EBITDA = Gross Profit (Fuel + Shop + Coffee &amp; Valet) + Misc Income − Overheads (excl. Depreciation &amp; Loan Interest)
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Gross Profit</p>
                      <DetailItem label="Fuel Profit" value={bFmt(Math.abs(Number(ebita.fuelProfit ?? 0)))} />
                      <DetailItem label="Shop Profit" value={bFmt(Math.abs(Number(ebita.shopProfit ?? 0)))} />
                      <DetailItem label={COFFEE_VALET_PROFIT_LABEL} value={bFmt(Math.abs(Number(ebita.valetProfit ?? 0)))} />
                      <DetailItem label="Total Gross Profit" value={bFmt(Math.abs(Number(ebita.grossProfit ?? 0)))} isTotal />
                      <div className="border-t border-border pt-3 mt-3">
                        <DetailItem label="Miscellaneous Income" value={bFmt(Math.abs(Number(ebita.miscIncome ?? 0)))} />
                      </div>
                      <div className="border-t border-border pt-3 mt-3">
                        <DetailItem label="Overheads (excl. Depreciation & Loan Interest)" value={bFmt(Math.abs(Number(ebita.overheads ?? 0)))} />
                      </div>
                      <div className="border-t border-border pt-3 mt-3 space-y-1 text-xs text-muted-foreground">
                        <p>Excluded from Overheads:</p>
                        <DetailItem label="Depreciation" value={bFmt(Math.abs(Number(ebita.depreciation ?? 0)))} />
                        <DetailItem label="Loan Interest" value={bFmt(Math.abs(Number(ebita.loanInterest ?? 0)))} />
                      </div>
                      <div className="border-t-2 border-primary pt-3 mt-4">
                        <DetailItem
                          label="EBITDA"
                          value={bFmt(Math.abs(ebitaVal))}
                          isTotal
                        />
                      </div>
                    </>
                  );
                })() : (
                  <p className="text-xs text-muted-foreground">No EBITDA data</p>
                )}
              </CardDetailModal>

              {/* PPL after Overheads — Breakdown: overhead categories + PPL summary */}
              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "ppl-after-overheads"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title={
                  quickInsightsHasVolume
                    ? "PPL after O/H — Breakdown"
                    : "Fuel margin after Overheads — Breakdown"
                }
              >
                {(overheadsData?.breakdown?.length || pplAfterOverheads) ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      {quickInsightsHasVolume
                        ? "Overhead cost by category (net values). Totals exclude Depreciation (8200–8207) and Loan Interest (7750), same as EBITDA overheads. PPL after O/H: (Fuel Profit − Total Overheads) ÷ volume × 100 — same basis as Gross PPL."
                        : "Overhead cost by category (net values). Totals exclude Depreciation (8200–8207) and Loan Interest (7750), same as EBITDA overheads. When litre volume is unavailable: (Fuel Profit − Total Overheads) ÷ fuel sales × 100 — same basis as the Fuel margin card."}
                    </p>
                    {(overheadsData?.labour !== undefined && overheadsData.labour !== 0) && (
                      <DetailItem label="Wages" value={overheadBreakdownFormat(overheadsData.labour)} code="wages" />
                    )}
                    {(overheadsData?.breakdown || [])
                      .filter((item) => Number(item.amount ?? 0) !== 0)
                      .filter(
                        (item) =>
                          !PPL_TOTAL_EXCLUDED_NOMINAL_CODES.has(String(item.code ?? '').trim())
                      )
                      .map((item) => (
                      <DetailItem
                        key={item.code || item.category}
                        label={item.category || item.name || item.code || "—"}
                        value={overheadBreakdownFormat(Number(item.amount ?? 0))}
                        subValue={`${(item.transactionCount || 0).toLocaleString()} transactions`}
                        code={item.code}
                      />
                    ))}
                    <DetailItem
                      label="Overheads (excl. Depreciation & Loan Interest)"
                      value={overheadBreakdownFormat(Number(pplAfterOverheads?.totalOverheads ?? overheadsData?.total ?? 0))}
                      isTotal
                    />
                    {(() => {
                      const totalOH = Math.abs(Number(pplAfterOverheads?.totalOverheads ?? overheadsData?.total ?? 0));
                      const fuelProfitOnly = Math.abs(Number(totalNetProfit?.fuelProfit ?? 0));
                      const fuelProfitAfterOH = fuelProfitOnly - totalOH;
                      const formatPositive = (amount) => `£${Math.abs(Number(amount ?? 0)).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      return (
                        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Fuel profit after overheads (£)</p>
                          <p className="text-base font-bold text-foreground break-words">
                            {formatPositive(fuelProfitOnly)} − {formatPositive(totalOH)} = {formatPositive(fuelProfitAfterOH)}
                          </p>
                        </div>
                      );
                    })()}
                    <div className="border-t border-border pt-3 mt-3 space-y-1">
                      <DetailItem
                        label={quickInsightsHasVolume ? "Gross PPL" : "Avg fuel margin"}
                        value={
                          !quickInsightsHasVolume && !quickInsightsHasFuelSales
                            ? "NA"
                            : `${(pplAfterOverheads?.avgPPL ?? 0).toFixed(2)}${quickInsightsHasVolume ? "p" : "%"}`
                        }
                      />
                      <DetailItem
                        label={quickInsightsHasVolume ? "OH Deduction" : "OH deduction (margin)"}
                        value={
                          !quickInsightsHasVolume && !quickInsightsHasFuelSales
                            ? "NA"
                            : `${(pplAfterOverheads?.overheadPerUnitPence ?? 0).toFixed(2)}${quickInsightsHasVolume ? "p" : "%"}`
                        }
                      />
                      <DetailItem
                        label={quickInsightsHasVolume ? "PPL after O/H" : "Fuel margin after overheads"}
                        value={
                          !quickInsightsHasVolume && !quickInsightsHasFuelSales
                            ? "NA"
                            : `${(pplAfterOverheads?.value ?? 0).toFixed(2)}${quickInsightsHasVolume ? "p" : "%"}`
                        }
                        isTotal
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No breakdown data</p>
                )}
              </CardDetailModal>

              {/* Bunkered Volume Breakdown Modal */}
              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "bunkered-volume"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Fuel Supply Type - Monthly Comparison"
                maxWidth="max-w-4xl"
              >
                <div className="w-full">
                  <BunkeredNonBunkeredComparison
                    startDate={startDate}
                    endDate={endDate}
                    siteIds={selectedSiteIds}
                  />
                </div>
              </CardDetailModal>

              {/* Bunkered Sales Breakdown Modal */}
              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "bunkered-sales"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Net Sales - Monthly Comparison"
                maxWidth="max-w-6xl"
              >
                <div className="w-full">
                  <BunkeredNonBunkeredSalesComparison
                    startDate={startDate}
                    endDate={endDate}
                    siteIds={selectedSiteIds}
                  />
                </div>
              </CardDetailModal>

              {/* Bunkered Profit Breakdown Modal */}
              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "bunkered-profit"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Profit - Monthly Comparison"
                maxWidth="max-w-6xl"
              >
                <div className="w-full">
                  <BunkeredNonBunkeredProfitComparison
                    startDate={startDate}
                    endDate={endDate}
                    siteIds={selectedSiteIds}
                  />
                </div>
              </CardDetailModal>
            </div>
          </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LatestPetrol;
