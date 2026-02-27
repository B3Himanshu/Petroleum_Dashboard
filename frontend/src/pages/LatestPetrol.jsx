import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { 
  Fuel, 
  CalendarDays, 
  TrendingUp, 
  TrendingDown,
  Euro, 
  ShoppingBag, 
  ShoppingCart, 
  Percent, 
  Users,
  Sparkles,
  BarChart3,
  PieChart,
  Droplets
} from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CardDetailModal, DetailItem } from "@/components/dashboard/CardDetailModal";
import { MonthlyFuelPerformanceChart } from "@/components/dashboard/MonthlyFuelPerformanceChart";
import { PPLComparisonChart } from "@/components/dashboard/PPLComparisonChart";
import { PetrolTopPerformingSitesTable } from "@/components/dashboard/PetrolTopPerformingSitesTable";
import { PetrolSitesNeedingImprovementTable } from "@/components/dashboard/PetrolSitesNeedingImprovementTable";

import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FuelGradeMixChart } from "@/components/dashboard/FuelGradeMixChart";
import { ShopProductCategoriesChart } from "@/components/dashboard/ShopProductCategoriesChart";
import { BunkeredNonBunkeredComparison } from "@/components/dashboard/BunkeredNonBunkeredComparison";
import { BunkeredNonBunkeredSalesComparison } from "@/components/dashboard/BunkeredNonBunkeredSalesComparison";
import { BunkeredNonBunkeredProfitComparison } from "@/components/dashboard/BunkeredNonBunkeredProfitComparison";
import { ShopValetMarginsChart } from "@/components/dashboard/ShopValetMarginsChart";
import { OverheadTrendsChart } from "@/components/dashboard/OverheadTrendsChart";
import { ALL_29_SITES } from "@/constants/sites";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Building2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Site code (dept number) → display name (align with backend DEPT_TO_SITE_NAME) — filter shows site name, value is dept number
const SITE_CODE_TO_NAME = {
  6: 'Manor Service Station', 7: 'Hen And Chicken SS', 9: 'Salterton Road SS', 10: 'Lanner Moor Garage',
  11: 'Luton Road SS', 14: 'Kings Lane SS', 17: 'Delph SS', 18: 'Saxon Autopoint SS', 19: 'Jubits Lane SS',
  20: 'Worsley Brow', 23: 'Auto Pitstop', 24: 'Crown SS', 25: 'Marsland SS', 29: 'Gemini SS', 30: 'Park View',
  31: 'Filleybrook SS', 33: 'Swan Connect', 34: 'Portland', 35: 'Lower Lane', 36: 'Vale SS', 37: 'Kensington SS',
  38: 'County Oak SS', 39: 'Kings Of Sedgley', 40: 'Gnosall SS', 41: 'Minsterley SS', 42: 'Nelson SS',
  43: 'Yeovil SS', 44: 'Canklow SS', 45: 'Stanton Self Service',
};

// Site filter: multi-select by site name (dept number = id). Select All, Clear, Confirm. Default all 29 selected.
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

  // When none selected we don't send siteIds = backend returns all sites; show "All sites"
  const displayText = selectedIds.length === 0 || selectedIds.length === sites.length
    ? "All sites"
    : selectedIds.length === 1
      ? (sites.find((s) => s.id === selectedIds[0])?.name ?? "1 site")
      : `${selectedIds.length} sites`;
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

// Card 1: Total Site Revenue (Fuel + Shop + Valet) — display all amounts as positive
const TotalSiteRevenueCard = ({ data, loading, error, onClick, onBreakdown, fuelByNominalBreakdown = [], otherIncomeBreakdown = [], showInMillions = true }) => {
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
  const displayFormat = showInMillions ? formatCurrency : formatCurrencyExact2;

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
              title={showInMillions ? formatCurrency(data?.total ?? 0) : formatCurrencyExact2(data?.total ?? 0)}
            >
              {displayFormat(data?.total ?? 0)}
            </p>
            <div className="mt-2 text-xs text-muted-foreground space-y-1 min-w-0 break-all">
              {showInMillions ? (
                <p>Fuel: {formatCurrency(data?.fuelSales ?? 0)}</p>
              ) : (
                <p>Fuel: {formatCurrencyExact2(data?.fuelSales ?? 0)}</p>
              )}
              <p className="text-muted-foreground" title="Other income (4901, 4904, 4907, 6101)">Other income: {displayFormat((otherIncomeBreakdown || []).reduce((s, item) => s + Math.abs(Number(item.value ?? item.netSales ?? item.amount ?? 0)), 0))}</p>
              <p className="text-muted-foreground" title="Not available on Sage">Shop: N/A</p>
              <p className="text-muted-foreground" title="Not available on Sage">Valet: N/A</p>
            </div>
            {onBreakdown && (
              <button
                type="button"
                className="mt-2 text-xs text-emerald-500 hover:text-emerald-600"
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
const TotalFuelVolumeCard = ({ data, loading, error, onClick, onBreakdown, fuelVolumeTransitionBreakdown = null, showInMillions = true }) => {
  const formatVolumeExact2 = (liters) => {
    const L = Math.abs(typeof liters === 'number' ? liters : parseFloat(liters) || 0);
    const fixed = L.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${withCommas}.${decPart} L`;
  };
  const formatVolumeShort = (liters) => {
    const L = Math.abs(typeof liters === 'number' ? liters : parseFloat(liters) || 0);
    if (!L && liters !== 0) return "0 L";
    if (L >= 1000000) return `${(L / 1000000).toFixed(2)} ML`;
    if (L >= 1000) return `${(L / 1000).toFixed(2)} KL`;
    return `${L.toFixed(2)} L`;
  };
  const formatVolume = showInMillions ? formatVolumeShort : formatVolumeExact2;
  const formatCurrency = (amount) => {
    const a = Math.abs(typeof amount === 'number' ? amount : parseFloat(amount) || 0);
    if (!a && amount !== 0 && amount != null) return "£0";
    if (a >= 1000000) return `£${(a / 1000000).toFixed(2)}M`;
    if (a >= 1000) return `£${(a / 1000).toFixed(0)}K`;
    return `£${a.toFixed(2)}`;
  };
  const hasVolumeFromDetails = (fuelVolumeTransitionBreakdown?.breakdown?.length > 0) && (Math.abs(fuelVolumeTransitionBreakdown?.totalVolume ?? 0) > 0);
  const totalVolumeL = fuelVolumeTransitionBreakdown?.totalVolume ?? 0;
  const hasVolume = (data?.totalVolume || 0) > 0 || hasVolumeFromDetails;
  const fuelSalesValue = data?.fuelSalesValue ?? 0;

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
            {hasVolumeFromDetails ? (
              <p className="text-2xl font-bold text-foreground">{formatVolume(totalVolumeL)}</p>
            ) : hasVolume ? (
              <p className="text-2xl font-bold text-foreground">{formatVolume(data.totalVolume)}</p>
            ) : (
              <p className="text-2xl font-bold text-foreground">{formatCurrency(fuelSalesValue)}</p>
            )}
            {hasVolumeFromDetails ? (
              <p className="text-sm font-medium text-muted-foreground mt-3">Average PPL (Pence Per Litre)</p>
            ) : !hasVolume && (
              <p className="text-sm font-medium text-muted-foreground mt-3">Fuel sales (volume not in Sage)</p>
            )}
            <p className="text-lg font-semibold text-blue-600 mt-1">
              {Math.abs(data?.averagePPL || 0).toFixed(2)}p
            </p>
            {onBreakdown && (
              <button
                type="button"
                className="mt-2 text-xs text-emerald-500 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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

// Card 3: Shop Sales — PRL CSV: "Shop Sales: Not available on Sage"
const ShopSalesCard = ({ data, loading, error, onClick }) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Shop Sales
          </CardTitle>
          <ShoppingBag className="w-4 h-4 text-purple-500" />
        </div>
        <p className="text-sm font-medium text-muted-foreground mt-1.5">
          Shop not managed by the client (PRL)
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-2xl font-bold text-muted-foreground">N/A</p>
        )}
      </CardContent>
    </Card>
  );
};

// Card 4: Avg Basket Size — PRL CSV: "Not available on Sage"
const AvgBasketSizeCard = ({ data, loading, error }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Basket Size
          </CardTitle>
          <ShoppingCart className="w-4 h-4 text-orange-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-2xl font-bold text-muted-foreground">N/A</p>
        )}
      </CardContent>
    </Card>
  );
};

// Card 5: Fuel Profit — display only: if negative show as positive; if positive show as-is (raw data/Excel unchanged). Toggle: Show M = K/M, off = actual data.
const TotalNetProfitCard = ({ data, loading, error, onClick, onBreakdown, showInMillions = true }) => {
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "£0";
    const a = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    const abs = a < 0 ? -a : a;
    if (abs >= 1000000) return `£${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `£${(abs / 1000).toFixed(0)}K`;
    return `£${abs.toFixed(2)}`;
  };
  const formatCurrencyExact2 = (amount) => {
    const n = Math.abs(Number(amount ?? 0));
    return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const displayFormat = showInMillions ? formatCurrency : formatCurrencyExact2;

  const rawTotal = data?.total ?? 0;
  const displayTotal = rawTotal < 0 ? Math.abs(rawTotal) : rawTotal;
  const rawFuel = data?.fuelProfit ?? 0;
  const displayFuel = rawFuel < 0 ? Math.abs(rawFuel) : rawFuel;

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
          <Euro className="w-4 h-4 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-green-600">
              {displayFormat(displayTotal)}
            </p>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p className="text-muted-foreground">Fuel: {displayFormat(displayFuel)}</p>
              <p className="text-muted-foreground" title="Not available on Sage">Shop: N/A</p>
              <p className="text-muted-foreground" title="Not available on Sage">Valet: N/A</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Margin: {(data?.profitMargin || 0).toFixed(1)}%
            </p>
            {onBreakdown && (
              <button
                type="button"
                className="mt-2 text-xs text-emerald-500 hover:text-emerald-600"
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

// Card 6: PPL After Overheads (show Overheads £ when no volume so card has data)
const PPLAfterOverheadsCard = ({ data, loading, error, onClick, onBreakdown }) => {
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "£0";
    if (amount >= 1000000) return `£${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `£${(amount / 1000).toFixed(0)}K`;
    return `£${amount.toFixed(2)}`;
  };
  const totalOverheads = data?.totalOverheads ?? 0;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            PPL after vending out the OVERHEADS
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
            <p className="text-2xl font-bold text-blue-600">
              {Math.abs(data?.value ?? 0).toFixed(2)}p
            </p>
            {(totalOverheads > 0 && (data?.value ?? 0) === 0) && (
              <div className="mt-2 text-xs text-muted-foreground">
                <p className="text-amber-600 dark:text-amber-500">No fuel sales or revenue in period — PPL = 0</p>
              </div>
            )}
            {onBreakdown && (
              <button
                type="button"
                className="mt-2 text-xs text-emerald-500 hover:text-emerald-600"
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

// Card 7: Shop Margin — PRL CSV: "Not available on Sage"
const ShopMarginCard = ({ data, loading, error, onClick }) => {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Shop Margin
          </CardTitle>
          <Percent className="w-4 h-4 text-indigo-500" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-muted-foreground">N/A</p>
            <p className="mt-2 text-xs text-muted-foreground">Shop not managed by the client (PRL)</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 8: Labour Cost as % of shop or fuel sales
const LabourCostPercentageCard = ({ data, loading, error, onClick, onBreakdown }) => {
  const getColorClass = (percentage) => {
    if (percentage <= 4) return 'text-green-600';
    if (percentage <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const labourCost = Math.abs(data?.labourCost ?? 0);
  const hasNoLabour = labourCost < 1; // treat £0 as no labour (not calculated / N/A)
  const totalSales = Math.abs(data?.totalSales ?? 0);
  const salesFormatted = totalSales >= 1000
    ? `£${(totalSales / 1000).toFixed(0)}K`
    : totalSales > 0
      ? `£${totalSales.toFixed(0)}`
      : '£0';

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Labour Cost as per shop or fuel sales %
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
            <p className={`text-2xl font-bold ${hasNoLabour ? 'text-muted-foreground' : getColorClass(data?.value || 0)}`}>
              {hasNoLabour ? 'N/A' : `${(data?.value || 0).toFixed(1)}%`}
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Labour: {hasNoLabour ? 'N/A' : `£${(labourCost / 1000).toFixed(0)}K`}</p>
              <p>Sales: {salesFormatted}</p>
            </div>
            {onBreakdown && (
              <button
                type="button"
                className="mt-2 text-xs text-emerald-500 hover:text-emerald-600"
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
            <div className="mt-2 text-xs text-muted-foreground">
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
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-emerald-600">
              {Math.abs(data?.roi ?? 0).toFixed(1)}%
            </p>
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Profit: £{(Math.abs(data?.netProfit || 0) / 1000).toFixed(0)}K</p>
              <p>Investment: £{(Math.abs(data?.investment || 0) / 1000).toFixed(0)}K</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Card 11: EBITA — simple sum of 69 N/Cs; display as positive at the end
const EBITACard = ({ data, loading, error }) => {
  const abs = Math.abs(Number(data?.ebita ?? 0));
  const display = abs >= 1000000
    ? `£${(abs / 1000000).toFixed(2)}M`
    : abs >= 1000
      ? `£${(abs / 1000).toFixed(1)}K`
      : `£${abs.toFixed(2)}`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            EBITA
          </CardTitle>
          <TrendingUp className="w-4 h-4 text-blue-500" />
        </div>
        <CardDescription className="text-xs">Earnings Before Interest, Tax &amp; Amortisation</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <p className="text-2xl font-bold text-emerald-600">
              {display}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Sum of 69 N/Cs</p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ========== MAIN PAGE COMPONENT ==========

const LatestPetrol = () => {
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  
  const [totalSalesAllSites, setTotalSalesAllSites] = useState(null);
  
  // Active tab state
  const [activeTab, setActiveTab] = useState("all-sections");
  
  // Date range state - default May–Dec 2025; Jan–Apr 2025 are unselectable (minDate in picker)
  const getDefaultDates = () => {
    return {
      startDate: '2025-05-01',
      endDate: '2025-12-31'
    };
  };
  
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.startDate);
  const [endDate, setEndDate] = useState(defaultDates.endDate);

  // Site filter: dept numbers (same as site id). Default all 29 selected.
  const allSiteIds = ALL_29_SITES.map((s) => s.id);
  const [selectedSiteIds, setSelectedSiteIds] = useState(() => [...allSiteIds]);

  // Toggle: show Total Site Revenue (and related) in millions (M) or exact figures
  const [showRevenueInMillions, setShowRevenueInMillions] = useState(true);

  // ========== QUICK INSIGHT KPI STATES ==========
  // Card 1: Total Site Revenue
  const [totalSiteRevenue, setTotalSiteRevenue] = useState(null);
  const [loadingTotalSiteRevenue, setLoadingTotalSiteRevenue] = useState(false);
  const [totalSiteRevenueError, setTotalSiteRevenueError] = useState(null);

  // Card 2: Total Fuel Volume with Avg PPL
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

  // Card 7: Shop Margin
  const [shopMargin, setShopMargin] = useState(null);
  const [loadingShopMargin, setLoadingShopMargin] = useState(false);
  const [shopMarginError, setShopMarginError] = useState(null);

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
  const [roiTrendData, setRoiTrendData] = useState([]);
  const [loadingROITrend, setLoadingROITrend] = useState(false);

  // Card 11: EBITA (Earnings Before Interest, Tax and Amortisation)
  const [ebita, setEBITA] = useState(null);
  const [loadingEBITA, setLoadingEBITA] = useState(false);
  const [ebitaError, setEBITAError] = useState(null);

  // Additional data states for tabs
  const [shopData, setShopData] = useState(null);
  const [loadingShopData, setLoadingShopData] = useState(false);
  const [valetData, setValetData] = useState(null);
  const [loadingValetData, setLoadingValetData] = useState(false);
  const [overheadsData, setOverheadsData] = useState(null);
  const [loadingOverheadsData, setLoadingOverheadsData] = useState(false);

  // Breakdown modal state
  const [breakdownModal, setBreakdownModal] = useState({ open: false, type: null });
  const [siteRevenueBreakdown, setSiteRevenueBreakdown] = useState(null);
  const [fuelByNominalBreakdown, setFuelByNominalBreakdown] = useState([]); // 4000, 4001, 4002, 4003, 4008 for Total Site Revenue card
  const [otherIncomeBreakdown, setOtherIncomeBreakdown] = useState([]);   // 4901, 4904, 4907, 6101 (ATM, Rent, Sundry, Daily Facility Fees)
  const [fuelVolumeBreakdown, setFuelVolumeBreakdown] = useState(null);
  const [fuelVolumeTransitionBreakdown, setFuelVolumeTransitionBreakdown] = useState(null); // volume (L) from details column, e.g. Sax-Keyfuel-Nov'25-.../5712.23
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
      // PRL CSV: Shop Sales, Valet Sales, Avg Basket Size, Shop Margin = Not available on Sage — do not derive from revenue N/Cs
      const shopSalesValue = 0;
      const valetSalesValue = 0;
      const shopTransactionCount = 0;
      const valetTransactionCount = 0;
      let fuelSalesForVolume = 0;

      // Card 1: Total Site Revenue - PRL Revenue N/Cs (Fuel 4000s + 4011,4400,4901,4904,4907,6101,6102)
      try {
        setLoadingTotalSiteRevenue(true);
        setTotalSiteRevenueError(null);
        const rawNetSales = await dashboardAPI.getPetrolNetSales(startDate, endDate, selectedSiteIds);
        const fuelData = rawNetSales?.data != null ? rawNetSales.data : rawNetSales;
        const fuelSales = fuelData?.fuelSales ?? fuelData?.totalNetSales ?? 0;
        const totalRevenue = fuelData?.totalRevenue ?? fuelData?.totalNetSales ?? fuelSales;
        setTotalSiteRevenue({
          total: totalRevenue,
          fuelSales,
          shopSales: 0,
          valetSales: 0
        });
        setSiteRevenueBreakdown({
          total: totalRevenue,
          fuelSales,
          shopSales: 0,
          valetSales: 0
        });
        setTotalSalesAllSites(totalRevenue);
        fuelSalesForVolume = fuelSales;
        // Fuel by nominal (4000–4008) for Total Site Revenue card exact breakdown
        try {
          const breakdownRes = await dashboardAPI.getPetrolNetSalesBreakdown(startDate, endDate, selectedSiteIds);
          const bd = breakdownRes?.data != null ? breakdownRes.data : breakdownRes;
          const allBreakdown = bd?.breakdown || [];
          const FUEL_CODES = ['4000', '4001', '4002', '4003', '4008'];
          const OTHER_INCOME_CODES = ['4901', '4904', '4907', '6101']; // ATM Machine, Rent, Sundry, Daily Facility Fees
          const fuelOnly = allBreakdown.filter((item) => FUEL_CODES.includes(String(item.code)));
          const otherIncome = allBreakdown.filter((item) => OTHER_INCOME_CODES.includes(String(item.code)));
          setFuelByNominalBreakdown(fuelOnly);
          setOtherIncomeBreakdown(otherIncome);
        } catch (_) {
          setFuelByNominalBreakdown([]);
          setOtherIncomeBreakdown([]);
        }
      } catch (error) {
        setTotalSiteRevenueError(error.message);
      } finally {
        setLoadingTotalSiteRevenue(false);
      }

      // Card 2: Total Fuel Volume with Avg PPL (when volume is 0, show fuel sales value so card has data)
      try {
        setLoadingTotalFuelVolume(true);
        setTotalFuelVolumeError(null);
        const volumeData = await dashboardAPI.getPetrolFuelVolume(startDate, endDate, selectedSiteIds);
        const pplData = await dashboardAPI.getPetrolAvgPPL(startDate, endDate, selectedSiteIds);
        const rawFuelBreakdown = await dashboardAPI.getPetrolFuelVolumeBreakdown(startDate, endDate, selectedSiteIds);
        const fuelBreakdownData = rawFuelBreakdown?.data != null ? rawFuelBreakdown.data : rawFuelBreakdown;
        setTotalFuelVolume({
          totalVolume: volumeData?.totalFuelVolume || 0,
          bunkeredVolume: volumeData?.bunkeredVolume || 0,
          nonBunkeredVolume: volumeData?.nonBunkeredVolume || 0,
          averagePPL: pplData?.avgPPL || 0,
          fuelSalesValue: fuelSalesForVolume
        });
        const breakdownList = fuelBreakdownData?.breakdown || [];
        const totalFuelSales = fuelBreakdownData?.totalVolume ?? breakdownList.reduce((s, x) => s + (x.volume || 0), 0);
        setFuelVolumeBreakdown({
          breakdown: breakdownList,
          totalVolume: totalFuelSales
        });
        try {
          const transitionData = await dashboardAPI.getPetrolFuelVolumeTransitionBreakdown(startDate, endDate, selectedSiteIds);
          setFuelVolumeTransitionBreakdown(transitionData || { breakdown: [], totalVolume: 0 });
        } catch (_) {
          setFuelVolumeTransitionBreakdown({ breakdown: [], totalVolume: 0 });
        }
      } catch (error) {
        setTotalFuelVolumeError(error.message);
      } finally {
        setLoadingTotalFuelVolume(false);
      }

      // Card 3: Shop Sales — PRL CSV: Not available on Sage
      try {
        setLoadingShopSales(true);
        setShopSalesError(null);
        setShopSales({ total: 0, transactionCount: 0, trend: 0 });
      } catch (error) {
        setShopSalesError(error.message);
      } finally {
        setLoadingShopSales(false);
      }

      // Card 4: Avg Basket Size — PRL CSV: Not available on Sage
      try {
        setLoadingAvgBasketSize(true);
        setAvgBasketSizeError(null);
        setAvgBasketSize({ value: 0, trend: 0, transactionCount: 0 });
      } catch (error) {
        setAvgBasketSizeError(error.message);
      } finally {
        setLoadingAvgBasketSize(false);
      }

      let totalPurchasesValue = 0;
      try {
        const purchasesData = await dashboardAPI.getPetrolTotalPurchases(startDate, endDate, selectedSiteIds);
        totalPurchasesValue = purchasesData?.totalPurchases || 0;
      } catch (error) {
        console.error('Error fetching purchases:', error);
      }

      // PRL: Shop Profit and Valet Profit = Not available on Sage
      const shopProfit = 0;
      const valetProfit = 0;

      // Card 5: Total Net Profit = Total Site Revenue - Total Cost (PRL). Never show profit > revenue.
      try {
        setLoadingTotalNetProfit(true);
        setTotalNetProfitError(null);
        const profitData = await dashboardAPI.getPetrolProfit(startDate, endDate, selectedSiteIds);
        const marginData = await dashboardAPI.getPetrolProfitMargin(startDate, endDate, selectedSiteIds);
        const profitBreakdownData = await dashboardAPI.getPetrolProfitBreakdown(startDate, endDate, selectedSiteIds);
        // Use total from breakdown (step-by-step sum of line items, no ABS); fallback to /profit total
        const totalFromBreakdown = profitBreakdownData?.totalProfit;
        const rawProfit = totalFromBreakdown ?? profitData?.totalProfit ?? 0;
        const netProfit = typeof rawProfit === 'number' ? rawProfit : parseFloat(rawProfit) || 0;
        setTotalNetProfit({
          total: netProfit,
          fuelProfit: netProfit,
          shopProfit: 0,
          valetProfit: 0,
          profitMargin: marginData?.profitMargin || 0
        });
        setProfitBreakdown(profitBreakdownData || null);
      } catch (error) {
        setTotalNetProfitError(error.message);
      } finally {
        setLoadingTotalNetProfit(false);
      }

      // Card 6: PPL after overhead = Fuel Profit (after deducting OH) / (Volume or Sales) × 100 (from API). OH N/C in backend.
      // Overhead per unit (pence) = (Overheads ÷ Volume or Sales) × 100 (API actualPPL). OH Deduction = Avg PPL − overhead per unit.
      try {
        setLoadingPplAfterOverheads(true);
        setPplAfterOverheadsError(null);
        const pplData = await dashboardAPI.getPetrolAvgPPL(startDate, endDate, selectedSiteIds);
        const actualPplData = await dashboardAPI.getPetrolActualPPL(startDate, endDate, selectedSiteIds);
        const avgPPL = pplData?.avgPPL || 0;
        const overheadPerUnitPence = actualPplData?.actualPPL || 0; // (Overheads ÷ Volume or Sales) × 100
        const totalOverheads = actualPplData?.totalOverheads ?? 0;
        const pplAfterOH = actualPplData?.pplAfterOverheads ?? (avgPPL - overheadPerUnitPence); // API: (Fuel Profit − OH) / (Vol or Sales) × 100
        const ohDeduction = avgPPL - overheadPerUnitPence; // Avg PPL − (Overheads ÷ Volume or Sales × 100)
        const fuelVolume = actualPplData?.fuelVolume ?? 0;
        const denominator = fuelVolume > 0 ? fuelVolume : (actualPplData?.fuelSales > 0 ? actualPplData.fuelSales : actualPplData?.totalRevenue ?? 0);
        setPplAfterOverheads({
          value: pplAfterOH,
          avgPPL: avgPPL,
          overheadDeduction: ohDeduction,
          overheadPerUnitPence,
          difference: pplAfterOH,
          totalOverheads,
          fuelVolume,
          denominator
        });
      } catch (error) {
        setPplAfterOverheadsError(error.message);
      } finally {
        setLoadingPplAfterOverheads(false);
      }

      // Card 7: Shop Margin — PRL CSV: Not available on Sage
      try {
        setLoadingShopMargin(true);
        setShopMarginError(null);
        setShopMargin({ value: 0, benchmark: 20.0, trend: 0, otherRevenue: 0 });
      } catch (error) {
        setShopMarginError(error.message);
      } finally {
        setLoadingShopMargin(false);
      }

      // Card 8: Labour Cost Percentage = (Labour Cost / Total Sales) × 100
      try {
        setLoadingLabourCostPercentage(true);
        setLabourCostPercentageError(null);
        const labourData = await dashboardAPI.getPetrolLabourCost(startDate, endDate, selectedSiteIds);
        const labourBreakdownData = await dashboardAPI.getPetrolLabourCostBreakdown(startDate, endDate, selectedSiteIds);
        const labourCost = Math.abs(labourData?.totalLabourCost || 0);
        const rawLab = await dashboardAPI.getPetrolNetSales(startDate, endDate, selectedSiteIds);
        const fuelDataLab = rawLab?.data != null ? rawLab.data : rawLab;
        const fuelSalesForLabour = Math.abs(fuelDataLab?.fuelSales ?? fuelDataLab?.totalNetSales ?? 0);
        setLabourCostPercentage({
          value: fuelSalesForLabour > 0 ? (labourCost / fuelSalesForLabour) * 100 : 0,
          labourCost,
          totalSales: fuelSalesForLabour,
          breakdown: {
            wages: labourData?.grossWages || 0,
            ni: labourData?.employersNI || 0,
            pension: labourData?.staffPensions || 0,
            other: 0
          }
        });
        setLabourCostBreakdown(labourBreakdownData || null);
      } catch (error) {
        setLabourCostPercentageError(error.message);
      } finally {
        setLoadingLabourCostPercentage(false);
      }

      // Card 9: Customer Count — use transaction count from revenue breakdown so card shows data (EvoBos when available)
      try {
        setLoadingCustomerCount(true);
        setCustomerCountError(null);
        const totalTransactions = shopTransactionCount + valetTransactionCount;
        setCustomerCount({
          count: totalTransactions,
          shopTransactions: shopTransactionCount,
          valetTransactions: valetTransactionCount
        });
      } catch (error) {
        setCustomerCountError(error.message);
      } finally {
        setLoadingCustomerCount(false);
      }

      // Card 10: ROI = (Net Profit / Investment) × 100. Cost-Revenue Ratio from profit for Note section.
      try {
        setLoadingROI(true);
        setROIError(null);
        const [roiData, profitData] = await Promise.all([
          dashboardAPI.getPetrolROI(startDate, endDate, selectedSiteIds),
          dashboardAPI.getPetrolProfit(startDate, endDate, selectedSiteIds),
        ]);
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
      } catch (error) {
        setROIError(error.message);
      } finally {
        setLoadingROI(false);
      }

      // ROI monthly trend for Site ROI Trend Over Time chart
      try {
        setLoadingROITrend(true);
        const trend = await dashboardAPI.getPetrolROIMonthlyTrend(startDate, endDate, selectedSiteIds);
        setRoiTrendData(Array.isArray(trend) ? trend : []);
      } catch {
        setRoiTrendData([]);
      } finally {
        setLoadingROITrend(false);
      }

      // Card 11: EBITA = SUM of 69 N/Cs (raw amounts, negative signs preserved)
      try {
        setLoadingEBITA(true);
        setEBITAError(null);
        const ebitaData = await dashboardAPI.getPetrolEBITA(startDate, endDate, selectedSiteIds);
        setEBITA({ ebita: ebitaData?.ebita ?? 0 });
      } catch (error) {
        setEBITAError(error.message);
      } finally {
        setLoadingEBITA(false);
      }

      // Fetch shop data for Tab 2
      try {
        setLoadingShopData(true);
        setShopData({
          sales: shopSalesValue,
          profit: shopProfit,
          margin: shopSalesValue > 0 ? (shopProfit / shopSalesValue) * 100 : 0,
          transactionCount: shopTransactionCount
        });
      } finally {
        setLoadingShopData(false);
      }

      // Fetch valet data for Tab 3
      try {
        setLoadingValetData(true);
        const valetMargin = valetSalesValue > 0 ? (valetProfit / valetSalesValue) * 100 : 0;
        const valetOperatingCosts = valetSalesValue - valetProfit;
        setValetData({
          sales: valetSalesValue,
          profit: valetProfit,
          margin: valetMargin,
          operatingCosts: valetOperatingCosts,
          transactionCount: valetTransactionCount
        });
      } finally {
        setLoadingValetData(false);
      }

      // Fetch overheads data for Tab 4 - PRL Overheads: 7103,7100,7200,7801,7905; include Wages (labour cost)
      try {
        setLoadingOverheadsData(true);
        const [overheadsBreakdown, labourRes] = await Promise.all([
          dashboardAPI.getPetrolActualPPLBreakdown(startDate, endDate, selectedSiteIds),
          dashboardAPI.getPetrolLabourCost(startDate, endDate, selectedSiteIds)
        ]);
        const breakdown = overheadsBreakdown?.breakdown || [];
        const get = (name) => breakdown.find(item => item.category === name || item.category?.includes(name))?.amount || 0;
        const rentRates = get('Rent');
        const utilities = get('Electricity');
        const maintenance = get('Repair');
        const generalRates = get('Rates');
        const creditCharges = get('Credit');
        const other = generalRates + creditCharges;
        const wages = Math.abs(labourRes?.totalLabourCost ?? 0);
        const overheadsTotal = overheadsBreakdown?.totalOverheads || 0;
        setOverheadsData({
          labour: wages,
          utilities,
          maintenance,
          rentRates,
          insurance: 0,
          other: Math.max(0, other),
          total: overheadsTotal + wages,
          breakdown: breakdown
        });
      } catch (error) {
        console.error('Error fetching overheads:', error);
        setOverheadsData({ labour: 0, utilities: 0, maintenance: 0, other: 0, total: 0, breakdown: [] });
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
  /** PPL after Overheads breakdown: same as other breakdowns — Show M = K/M, off = full figure. */
  const overheadBreakdownFormat = (amount) => {
    const a = Math.abs(Number(amount ?? 0));
    if (showRevenueInMillions) {
      if (a >= 1000000) return `£${(a / 1000000).toFixed(2)}M`;
      if (a >= 1000) return `£${(a / 1000).toFixed(0)}K`;
      return `£${a.toFixed(2)}`;
    }
    const fixed = a.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `£${withCommas}.${decPart}`;
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
    <div className="min-h-screen bg-background relative">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div>
        <main 
          style={{ willChange: 'margin-left' }}
          className={`transition-[margin-left] duration-500 ease-\[cubic-bezier(0.4,0,0.2,1)\] ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} ml-0`}
        >
          <Header 
            sidebarOpen={sidebarOpen} 
            onToggleSidebar={toggleSidebar} 
            totalSales={totalSalesAllSites}
            showRevenueInMillions={showRevenueInMillions}
            onToggleRevenueInMillions={() => setShowRevenueInMillions((v) => !v)}
          />
          
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Page Title */}
            <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-foreground truncate sm:text-xl lg:text-2xl">
                  Business Performance Dashboard
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">
                  Quick Insights, Fuel, Shop, Valeting & ROI
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
                    minDate="2025-05-01"
                  />
                </div>
                {/* Part 2: Sites filter */}
                <div className="chart-card p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    Sites
                  </p>
                  <SiteFilterMultiSelect
                    sites={ALL_29_SITES}
                    selectedIds={selectedSiteIds}
                    onChange={setSelectedSiteIds}
                  />
                </div>
              </div>
            </div>

            {/* Tabbed Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-6 h-auto">
                <TabsTrigger value="all-sections" className="text-xs sm:text-sm py-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Dashboard
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: All Sections - Single Page View */}
              <TabsContent value="all-sections" className="space-y-6">
                {/* Quick Insights Section - 8 KPI Cards */}
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground px-3 sm:px-4">
                      Quick Insights
                    </h2>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* 8 KPI Cards Grid - 2 rows of 4 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                    />
                    <ShopSalesCard
                      data={shopSales}
                      loading={loadingShopSales}
                      error={shopSalesError}
                      onClick={() => console.log('Shop Sales clicked')}
                    />
                    <AvgBasketSizeCard
                      data={avgBasketSize}
                      loading={loadingAvgBasketSize}
                      error={avgBasketSizeError}
                    />
                    <TotalNetProfitCard
                      data={totalNetProfit}
                      loading={loadingTotalNetProfit}
                      error={totalNetProfitError}
                      onClick={() => console.log('Total Net Profit clicked')}
                      onBreakdown={() => openBreakdown('net-profit')}
                      showInMillions={showRevenueInMillions}
                    />
                    <PPLAfterOverheadsCard
                      data={pplAfterOverheads}
                      loading={loadingPplAfterOverheads}
                      error={pplAfterOverheadsError}
                      onClick={() => console.log('PPL After Overheads clicked')}
                      onBreakdown={() => openBreakdown('ppl-after-overheads')}
                    />
                    <ShopMarginCard
                      data={shopMargin}
                      loading={loadingShopMargin}
                      error={shopMarginError}
                      onClick={() => console.log('Shop Margin clicked')}
                    />
                    <LabourCostPercentageCard
                      data={labourCostPercentage}
                      loading={loadingLabourCostPercentage}
                      error={labourCostPercentageError}
                      onClick={() => console.log('Labour Cost % clicked')}
                      onBreakdown={() => openBreakdown('labour-cost')}
                    />
                  </div>
                </div>

                {/* Fuel Section (wireframe: Fuel → 4 metrics → Monthly Performance Trends → Fuel Grade Mix → PPL vs Actual PPL) */}
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground px-3 sm:px-4 flex items-center gap-2">
                      <Fuel className="w-4 h-4" />
                      Fuel
                    </h2>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Monthly Performance Trends (Bar Graph) – wireframe title + Filter */}
                  <Card className="mb-4">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Monthly Performance Trends (Bar Graph)</CardTitle>
                        <span className="text-xs text-muted-foreground font-medium">Filter: date range above</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <MonthlyFuelPerformanceChart
                        startDate={startDate}
                        endDate={endDate}
                        siteIds={selectedSiteIds}
                      />
                    </CardContent>
                  </Card>

                  {/* Fuel Grade Mix (%) */}
                  <div className="mb-4">
                    <FuelGradeMixChart
                      startDate={startDate}
                      endDate={endDate}
                      siteIds={selectedSiteIds}
                    />
                  </div>

                  {/* PPL vs Actual PPL vending out OH – wireframe title + Filter */}
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                          </div>
                          <CardTitle className="text-lg">PPL vs Actual PPL vending out OH</CardTitle>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">Filter: date range above</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <PPLComparisonChart
                        startDate={startDate}
                        endDate={endDate}
                        siteIds={selectedSiteIds}
                      />
                    </CardContent>
                  </Card>
                </div>

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

                <div className="grid grid-cols-1 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1.5 min-w-0">
                            <CardTitle className="text-lg">Site ROI Trend Over Time</CardTitle>
                            <CardDescription>EBITA and ROI on month-wise basis. Net Profit from selected period; Investment from start (2002) to end of period.</CardDescription>
                          </div>
                          {roiTrendData.length > 0 && (() => {
                            const totalEbita = roiTrendData.reduce((s, d) => s + (Number(d.ebita) ?? 0), 0);
                            const absEbita = Math.abs(totalEbita);
                            const ebitaDisplay = showRevenueInMillions
                              ? (absEbita >= 1e6 ? `£${(absEbita / 1e6).toFixed(2)} M` : absEbita >= 1e3 ? `£${(absEbita / 1e3).toFixed(1)} K` : `£${absEbita.toFixed(2)}`)
                              : formatCurrencyExact2(absEbita);
                            return (
                              <div className="flex flex-nowrap items-center gap-2 sm:gap-3 shrink-0">
                                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold shadow-sm bg-primary text-primary-foreground whitespace-nowrap">
                                  <span className="text-xs sm:text-sm font-semibold">Total EBITA:</span>
                                  <span className="text-sm sm:text-base font-bold tabular-nums">{ebitaDisplay}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingROITrend ? (
                        <div className="h-[280px] bg-muted/30 animate-pulse rounded" />
                      ) : roiTrendData.length > 0 ? (
                        (() => {
                          const ROI_CLAMP = 100;
                          const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          // Build full May–Dec (or start–end) month list so chart shows every month; missing months get 0 for net profit/EBITA
                          const byKey = new Map();
                          roiTrendData.forEach((d) => byKey.set(`${d.year}-${d.month}`, d));
                          const start = new Date(startDate);
                          const end = new Date(endDate);
                          let y = start.getFullYear();
                          let m = Math.max(5, start.getMonth() + 1);
                          const endY = end.getFullYear();
                          const endM = end.getMonth() + 1;
                          const fullTrendData = [];
                          while (y < endY || (y === endY && m <= endM)) {
                            const key = `${y}-${m}`;
                            const d = byKey.get(key);
                            const investment = roiTrendData[0]?.investment ?? 0;
                            fullTrendData.push(d ?? { year: y, month: m, month_name: monthNames[m] || String(m), netProfit: 0, ebita: 0, roi: 0, investment });
                            m += 1;
                            if (m > 12) { m = 1; y += 1; }
                          }
                          const chartData = fullTrendData.map((d) => {
                            const rawRoi = Number(d.roi) ?? 0;
                            const clampedRoi = Number.isFinite(rawRoi) ? Math.max(-ROI_CLAMP, Math.min(ROI_CLAMP, rawRoi)) : 0;
                            const ebitaRaw = Number(d.ebita) ?? 0;
                            const ebitaMillions = Math.abs(ebitaRaw) / 1e6;
                            const roiDisplay = Math.abs(clampedRoi);
                            const netProfitRaw = Number(d.netProfit) ?? 0;
                            const netProfitMillions = Math.abs(netProfitRaw) / 1e6;
                            return {
                              name: `${d.month_name} ${d.year}`,
                              roi: roiDisplay,
                              roiRaw: rawRoi,
                              ebita: ebitaRaw,
                              ebitaMillions,
                              netProfit: netProfitRaw,
                              netProfitMillions,
                              investment: d.investment,
                            };
                          });
                          const allRoi = chartData.map((d) => d.roi).filter((v) => Number.isFinite(v));
                          const allEbitaM = chartData.map((d) => d.ebitaMillions).filter((v) => Number.isFinite(v));
                          const allNetProfitM = chartData.map((d) => d.netProfitMillions).filter((v) => Number.isFinite(v));
                          const maxRoi = allRoi.length ? Math.max(...allRoi) : 10;
                          const roiPadding = Math.max(0.2, maxRoi * 0.1 || 0.2);
                          const roiDomain = [0, maxRoi + roiPadding];
                          const maxEbitaM = allEbitaM.length ? Math.max(...allEbitaM) : 0.1;
                          const maxNetProfitM = allNetProfitM.length ? Math.max(...allNetProfitM) : 0.1;
                          const maxLeftM = Math.max(maxEbitaM, maxNetProfitM);
                          const leftPadding = Math.max(0.01, maxLeftM * 0.1 || 0.01);
                          const ebitaDomain = [0, maxLeftM + leftPadding];
                          const formatEbita = (v) => {
                            const abs = Math.abs(Number(v ?? 0));
                            if (showRevenueInMillions) {
                              if (abs >= 1e6) return `£${(abs / 1e6).toFixed(2)}M`;
                              if (abs >= 1e3) return `£${(abs / 1e3).toFixed(1)}K`;
                              return `£${abs.toFixed(2)}`;
                            }
                            return formatCurrencyExact2(abs);
                          };
                          const RoiEbitaTooltip = ({ active, payload, label }) => {
                            if (!active || !payload?.length || !label) return null;
                            const row = payload[0]?.payload ?? {};
                            return (
                              <div
                                className="rounded-lg border bg-card px-3 py-2 shadow-lg text-sm"
                                style={{ borderColor: 'hsl(var(--border))' }}
                              >
                                <p className="font-semibold text-foreground mb-1.5">{label}</p>
                                <p className="text-emerald-600 font-medium">EBITA: {formatEbita(row.ebita)}</p>
                                <p className="text-blue-500 font-medium">ROI: {Math.abs(Number(row.roi ?? 0)).toFixed(2)}%</p>
                                {row.investment != null && (
                                  <p className="text-muted-foreground text-xs mt-1">Investment: {formatEbita(row.investment)}</p>
                                )}
                              </div>
                            );
                          };
                          return (
                            <div className="h-[280px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={chartData}
                                  margin={{ top: 8, right: 48, left: 48, bottom: 8 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -4 }} />
                                  <YAxis
                                    yAxisId="left"
                                    type="number"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => showRevenueInMillions ? `£${Number(v).toFixed(1)}M` : (v >= 1 ? `£${Number(v).toFixed(2)}M` : `£${(Number(v) * 1000).toFixed(0)}K`)}
                                    label={{ value: showRevenueInMillions ? 'EBITA / Net Profit (£M)' : 'EBITA / Net Profit (£)', angle: -90, position: 'insideLeft' }}
                                    domain={ebitaDomain}
                                    allowDataOverflow
                                  />
                                  <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    type="number"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
                                    label={{ value: 'ROI (%)', angle: 90, position: 'insideRight' }}
                                    domain={roiDomain}
                                    allowDataOverflow
                                  />
                                  <Tooltip
                                    content={<RoiEbitaTooltip />}
                                    contentStyle={{
                                      background: 'hsl(var(--card))',
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '6px',
                                      padding: '8px 12px',
                                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    }}
                                    cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                                  />
                                  <Legend wrapperStyle={{ paddingTop: '4px' }} />
                                  <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="ebitaMillions"
                                    name="EBITA"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: '#10b981', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                                    connectNulls={false}
                                    isAnimationActive={true}
                                  />
                                  <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="roi"
                                    name="ROI %"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: '#3b82f6', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                                    connectNulls={false}
                                    isAnimationActive={true}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex flex-col items-center justify-center min-h-[200px] text-center text-muted-foreground">
                          <p className="text-sm">No EBITA or ROI data for this date range.</p>
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

                {/* Overheads (wireframe: Overhead Cost Breakdown + Monthly Overhead Cost Trends; CSV N/C: 7103, 7100, 7200, 7801, 7905) */}
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
                        <span className="text-xs text-muted-foreground font-medium">Filter: date range above</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {loadingOverheadsData ? (
                        <div className="h-64 bg-muted/30 animate-pulse rounded" />
                      ) : (
                        <div className="space-y-3">
                          {((overheadsData?.labour ?? 0) > 0 ? [{ category: 'Wages', amount: overheadsData.labour, code: 'wages' }] : []).concat(overheadsData?.breakdown || []).map((item, i) => (
                            <div key={item.code || i} className="flex items-center gap-3">
                              <span className="text-sm w-40 shrink-0">{item.category || item.name || "—"}</span>
                              <div className="flex-1 h-6 bg-primary/20 rounded overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded"
                                  style={{ width: `${overheadsData?.total ? Math.min(100, (Math.abs(item.amount || 0) / overheadsData.total) * 100) : 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-20 text-right">£{(Math.abs(item.amount || 0) / 1000).toFixed(1)}K</span>
                            </div>
                          ))}
                          {(!overheadsData?.breakdown || overheadsData.breakdown.length === 0) && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                              <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">Wages</p>
                                <p className="text-xl font-bold">£{((overheadsData?.labour || 0) / 1000).toFixed(0)}K</p>
                              </div>
                              <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">Rates</p>
                                <p className="text-xl font-bold">£{((overheadsData?.utilities || 0) / 1000).toFixed(0)}K</p>
                              </div>
                              <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">Electricity</p>
                                <p className="text-xl font-bold">£{((overheadsData?.maintenance || 0) / 1000).toFixed(0)}K</p>
                              </div>
                              <div className="p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">Other</p>
                                <p className="text-xl font-bold">£{((overheadsData?.other || 0) / 1000).toFixed(0)}K</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Monthly Overhead Cost Trends</CardTitle>
                        <span className="text-xs text-muted-foreground font-medium">Filter: date range above</span>
                      </div>
                      <CardDescription>
                        Cost (£). Overhead costs by category over time
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <OverheadTrendsChart startDate={startDate} endDate={endDate} siteIds={selectedSiteIds} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "site-revenue"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="Total Site Revenue Breakdown"
              >
                {siteRevenueBreakdown ? (
                  <>
                    <DetailItem
                      label="Fuel Sales"
                      value={formatCurrency(siteRevenueBreakdown.fuelSales || 0)}
                    />
                    {fuelByNominalBreakdown?.length > 0 && (
                      <div className="pl-3 border-l-2 border-muted space-y-1 my-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Fuel by product (value £)</p>
                        {fuelByNominalBreakdown.map((item) => (
                          <DetailItem
                            key={item.code}
                            label={`${item.code} ${item.name || ""}`}
                            value={formatCurrencyExact2(item.value ?? item.volume ?? item.netSales ?? 0)}
                          />
                        ))}
                      </div>
                    )}
                    {otherIncomeBreakdown?.length > 0 && (
                      <div className="pl-3 border-l-2 border-muted space-y-1 my-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Other income (value £)</p>
                        {otherIncomeBreakdown.map((item) => (
                          <DetailItem
                            key={item.code}
                            label={`${item.code} ${item.name || ""}`}
                            value={formatCurrencyExact2(item.value ?? item.netSales ?? item.amount ?? 0)}
                          />
                        ))}
                      </div>
                    )}
                    <DetailItem
                      label="Shop Sales"
                      value="N/A"
                      subValue="Not managed by the client (PRL)"
                    />
                    <DetailItem
                      label="Valet Sales"
                      value="N/A"
                      subValue="Not managed by the client (PRL)"
                    />
                    <DetailItem
                      label="TOTAL REVENUE"
                      value={formatCurrency(siteRevenueBreakdown.total || 0)}
                      isTotal
                    />
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No breakdown data</p>
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
                  {/* Volume by categories */}
                  {fuelVolumeTransitionBreakdown?.byNominalCode?.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mt-4 mb-1.5">Volume by categories</p>
                      {fuelVolumeTransitionBreakdown.byNominalCode.map((item) => (
                        <DetailItem
                          key={item.code}
                          code={item.code}
                          label={`${String(item.code ?? '')} ${item.name || item.code || ''}`.trim()}
                          value={formatVolume(Math.abs(item.volume ?? 0))}
                        />
                      ))}
                    </>
                  )}
                  {/* Volume by site (L) — net volume (positive and negative segments summed as-is) */}
                  {fuelVolumeTransitionBreakdown?.breakdown?.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mt-4 mb-1.5">Volume by site (L)</p>
                      {fuelVolumeTransitionBreakdown.breakdown.map((item, idx) => {
                        const vol = Number(item.volume ?? 0);
                        const valueStr = vol < 0 ? `-${formatVolume(-vol)}` : formatVolume(vol);
                        return (
                          <DetailItem
                            key={`site-${item.site ?? item.label}-${idx}`}
                            label={item.site ?? item.label}
                            value={valueStr}
                          />
                        );
                      })}
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
                title="Total Net Profit Breakdown"
                maxWidth="max-w-md"
              >
                {profitBreakdown ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">
                      Step-by-step: positives + negatives (no ABS). Total = sum of line items.
                    </p>
                    {(profitBreakdown.otherIncomeBreakdown || []).map((item) => (
                      <DetailItem
                        key={`nc-${item.code}`}
                        code={item.code}
                        label={`${item.code} – ${item.name || item.code}`}
                        value={profitBreakdownFormat(-(item.amount ?? 0))}
                      />
                    ))}
                    <DetailItem
                      label="Total Net Profit"
                      value={profitBreakdownFormat(-(profitBreakdown.totalProfit ?? 0))}
                      isTotal
                    />
                  </>
                ) : (
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
                  <>
                    {labourCostBreakdown.breakdown.map((item) => (
                      <DetailItem
                        key={item.code}
                        label={item.name || item.code}
                        value={formatCurrency(item.amount || 0)}
                        subValue={`${(item.transactionCount || 0).toLocaleString()} transactions`}
                        code={item.code}
                      />
                    ))}
                    <DetailItem
                      label="Total Labour Cost"
                      value={formatCurrency(labourCostBreakdown.totalLabourCost || 0)}
                      isTotal
                    />
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No breakdown data</p>
                )}
              </CardDetailModal>

              {/* PPL after Overheads — Breakdown: overhead categories + PPL summary */}
              <CardDetailModal
                open={breakdownModal.open && breakdownModal.type === "ppl-after-overheads"}
                onOpenChange={(open) => {
                  if (!open) closeBreakdown();
                }}
                title="PPL after Overheads — Breakdown"
              >
                {(overheadsData?.breakdown?.length || pplAfterOverheads) ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">Overhead cost by category. Real profit = Total Net Profit − Total Overheads; PPL after overheads = (real profit ÷ volume) × 100.</p>
                    {(overheadsData?.breakdown || []).map((item) => (
                      <DetailItem
                        key={item.code || item.category}
                        label={item.category || item.name || item.code || "—"}
                        value={overheadBreakdownFormat(Math.abs(Number(item.amount ?? 0)))}
                        subValue={`${(item.transactionCount || 0).toLocaleString()} transactions`}
                        code={item.code}
                      />
                    ))}
                    <DetailItem
                      label="Total Overheads (expense)"
                      value={overheadBreakdownFormat(Math.abs(Number(pplAfterOverheads?.totalOverheads ?? overheadsData?.total ?? 0)))}
                      isTotal
                    />
                    {(() => {
                      const totalOH = Math.abs(Number(pplAfterOverheads?.totalOverheads ?? overheadsData?.total ?? 0));
                      const denom = Number(pplAfterOverheads?.denominator ?? 0) || 1;
                      const pplAfter = Number(pplAfterOverheads?.value ?? 0);
                      const realProfitPounds = (pplAfter / 100) * denom;
                      const totalNetProfitPounds = realProfitPounds + totalOH;
                      return (
                        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Actual profit after deduction</p>
                          <p className="text-base font-bold text-foreground break-words">
                            {overheadBreakdownFormat(totalNetProfitPounds)} − {overheadBreakdownFormat(totalOH)} = {overheadBreakdownFormat(realProfitPounds)}
                          </p>
                        </div>
                      );
                    })()}
                    <div className="border-t border-border pt-3 mt-3 space-y-1">
                      <DetailItem label="Avg PPL" value={`${Math.abs(pplAfterOverheads?.avgPPL ?? 0).toFixed(2)}p`} />
                      <DetailItem label="OH Deduction" value={`${Math.abs(pplAfterOverheads?.overheadPerUnitPence ?? 0).toFixed(2)}p`} />
                      <DetailItem label="PPL after overheads" value={`${Math.abs(pplAfterOverheads?.value ?? 0).toFixed(2)}p`} isTotal />
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
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LatestPetrol;
