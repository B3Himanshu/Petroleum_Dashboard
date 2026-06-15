import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { sitesAPI, dashboardAPI } from "@/services/api";
import { ALL_HSRL_SITES, filterSitesForComparisonPages } from "@/constants/sites";
import { getComparisonPagesDefaultDateRange } from "@/lib/petrolDashboardMetrics";
import { BarChart3, Filter, Table as TableIcon, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { COFFEE_VALET_REVENUE_LABEL } from "@/constants/revenueLabels";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Plot from "react-plotly.js";
import { useTheme } from "@/contexts/ThemeContext";

const METRICS_COMPARISON_STORAGE_KEY = "metricsComparisonFilters_v2";
const ALL_METRICS = ['sales', 'profit', 'saleVolume', 'ppl'];

const MetricsComparison = () => {
  const { theme } = useTheme();
  const isDarkChart = theme === "dark";
  const metricsDataFetchIdRef = useRef(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Metrics options
  const METRICS_OPTIONS = [
    { value: 'sales', label: 'Sales', color: '#4f6df5' },
    { value: 'profit', label: 'Gross Profit', color: '#10b981' },
    { value: 'saleVolume', label: 'Sale Volume', color: '#f59e0b' },
    { value: 'ppl', label: 'PPL after O/H', color: '#8b5cf6' },
  ];

  const getDefaultDates = getComparisonPagesDefaultDateRange;

  const loadSavedDates = () => {
    try {
      const saved = sessionStorage.getItem(METRICS_COMPARISON_STORAGE_KEY);
      if (saved) {
        const filters = JSON.parse(saved);
        const defaultDates = getDefaultDates();
        return {
          startDate: filters.startDate || defaultDates.startDate,
          endDate: filters.endDate || defaultDates.endDate,
        };
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
    return getDefaultDates();
  };

  const savedDates = loadSavedDates();

  // Pending state — what the user is editing in the filter UI
  const [pendingStartDate, setPendingStartDate] = useState(savedDates.startDate);
  const [pendingEndDate, setPendingEndDate] = useState(savedDates.endDate);
  const [pendingMetrics, setPendingMetrics] = useState(ALL_METRICS);

  // Applied state — what actually drives data fetching
  const [startDate, setStartDate] = useState(savedDates.startDate);
  const [endDate, setEndDate] = useState(savedDates.endDate);
  const [appliedMetrics, setAppliedMetrics] = useState(ALL_METRICS);

  // Bar chart independent visibility — only affects which bars are shown in the chart
  const [chartVisibleMetrics, setChartVisibleMetrics] = useState(ALL_METRICS);
  const toggleChartMetric = (value) => {
    setChartVisibleMetrics(prev =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter(m => m !== value) : prev
        : [...prev, value]
    );
  };

  const toggleMetric = (value) => {
    setPendingMetrics(prev =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter(m => m !== value) : prev
        : [...prev, value]
    );
  };

  const handleConfirmFilters = () => {
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
    setAppliedMetrics(pendingMetrics);
    setChartVisibleMetrics(pendingMetrics); // reset chart toggles to match new applied metrics
    try {
      sessionStorage.setItem(METRICS_COMPARISON_STORAGE_KEY, JSON.stringify({
        startDate: pendingStartDate,
        endDate: pendingEndDate,
      }));
    } catch (e) {
      console.error('Error saving filters:', e);
    }
  };

  // Track whether pending differs from applied (to highlight Confirm button)
  const hasUnappliedChanges =
    pendingStartDate !== startDate ||
    pendingEndDate !== endDate ||
    pendingMetrics.join() !== appliedMetrics.join();
  
  // View state - table or charts (load from sessionStorage)
  const loadViewMode = () => {
    try {
      const saved = sessionStorage.getItem('metricsComparisonViewMode');
      return saved || 'charts';
    } catch (error) {
      return 'charts';
    }
  };
  const [viewMode, setViewMode] = useState(loadViewMode());

  /** Table-only sort; `key: null` keeps the same order as charts (first metric, desc). */
  const [tableSort, setTableSort] = useState({ key: null, direction: "desc" });
  
  // Save view mode to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('metricsComparisonViewMode', viewMode);
    } catch (error) {
      console.error('Error saving view mode:', error);
    }
  }, [viewMode]);
  
  // Data states
  const [sites, setSites] = useState([]);
  const [sitesData, setSitesData] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });
  
  const [isTablet, setIsTablet] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640 && window.innerWidth < 1024;
    }
    return false;
  });
  // Update responsive state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Sites: same list as Site Comparison (filterSitesForComparisonPages); main dashboard unchanged
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoadingSites(true);
        let apiSites = [];
        try {
          apiSites = await sitesAPI.getAll();
        } catch {
          apiSites = [];
        }
        const byId = new Map(apiSites.map((s) => [Number(s.id), s]));
        const merged = ALL_HSRL_SITES.map((s) => {
          const a = byId.get(s.id);
          return {
            id: s.id,
            name: a?.name || s.name,
            cityDisplay: a?.cityDisplay || "",
          };
        });
        setSites(filterSitesForComparisonPages(merged));
      } catch (error) {
        console.error("Error building sites list:", error);
        setSites(
          filterSitesForComparisonPages(
            ALL_HSRL_SITES.map((s) => ({
              id: s.id,
              name: s.name,
              cityDisplay: "",
            }))
          )
        );
      } finally {
        setLoadingSites(false);
      }
    };
    fetchSites();
  }, []);

  const handleDateRangeChange = (newStartDate, newEndDate) => {
    setPendingStartDate(newStartDate);
    setPendingEndDate(newEndDate);
  };

  // Fetch metrics data for all sites using petrol-data APIs (same as Business Performance Dashboard).
  // Runs when sites or date range change — not when only `appliedMetrics` changes (same underlying rows).
  useEffect(() => {
    if (sites.length === 0 || !startDate || !endDate) {
      setSitesData([]);
      return;
    }

    const fetchId = ++metricsDataFetchIdRef.current;

    const fetchAllSitesData = async () => {
      try {
        setSitesData([]);
        setLoadingData(true);

        const payload = await dashboardAPI.getMetricsComparisonSites(
          startDate,
          endDate,
          sites.map((s) => s.id)
        );
        if (metricsDataFetchIdRef.current !== fetchId) return;

        const rows = Array.isArray(payload?.rows) ? payload.rows : [];
        const byId = new Map(rows.map((r) => [Number(r.siteId), r]));

        const emptyRow = (site) => ({
          siteId: site.id,
          siteName: site.name,
          city: site.cityDisplay,
          netSales: 0,
          profit: 0,
          fuelProfit: 0,
          shopProfit: 0,
          valetProfit: 0,
          totalFuelVolume: 0,
          grossMarginPct: 0,
          avgPPL: 0,
        });

        setSitesData(
          sites.map((site) => {
            const r = byId.get(site.id);
            if (!r) return emptyRow(site);
            return {
              siteId: site.id,
              siteName: site.name,
              city: site.cityDisplay,
              netSales: r.netSales,
              profit: r.profit,
              fuelProfit: r.fuelProfit,
              shopProfit: r.shopProfit,
              valetProfit: r.valetProfit,
              totalFuelVolume: r.totalFuelVolume,
              grossMarginPct: r.grossMarginPct,
              avgPPL: r.avgPPL,
              ...(r.pplAfterOverheads != null && { pplAfterOverheads: r.pplAfterOverheads }),
            };
          })
        );
      } catch (error) {
        console.error('Error fetching sites data:', error);
        if (metricsDataFetchIdRef.current === fetchId) setSitesData([]);
      } finally {
        if (metricsDataFetchIdRef.current === fetchId) setLoadingData(false);
      }
    };

    fetchAllSitesData();
  }, [sites, startDate, endDate]);


  // Metrics multi-select dropdown (pending state — confirmed by button)
  const MetricsMultiSelect = () => {
    const [open, setOpen] = useState(false);
    const allSelected = pendingMetrics.length === METRICS_OPTIONS.length;
    const displayText = allSelected
      ? "All metrics"
      : pendingMetrics.length === 0
        ? "Select metrics"
        : pendingMetrics.length === 1
          ? METRICS_OPTIONS.find(o => o.value === pendingMetrics[0])?.label || "1 selected"
          : `${pendingMetrics.length} selected`;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between bg-background border-border", !pendingMetrics.length && "text-muted-foreground")}
          >
            <span className="truncate">{displayText}</span>
            <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <div className="border-b p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs justify-start"
              onClick={() => setPendingMetrics(allSelected ? [METRICS_OPTIONS[0].value] : ALL_METRICS)}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
          </div>
          <div className="p-2">
            {METRICS_OPTIONS.map(option => {
              const isSelected = pendingMetrics.includes(option.value);
              return (
                <div
                  key={option.value}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                  onClick={() => toggleMetric(option.value)}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleMetric(option.value)} />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }} />
                    <label className="text-sm font-medium leading-none cursor-pointer">{option.label}</label>
                  </div>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Chart-level filter: all 4 metrics are always clickable; unchecked = hidden on graph only (cards still follow upper filter).
  const ChartMetricFilter = () => {
    const [open, setOpen] = useState(false);
    const chartOrderValues = METRICS_OPTIONS.map((o) => o.value);
    const allChartVisible =
      chartOrderValues.length > 0 &&
      chartOrderValues.every((v) => chartVisibleMetrics.includes(v));
    const labelText =
      allChartVisible
        ? 'All'
        : chartVisibleMetrics.length === 1
          ? METRICS_OPTIONS.find((o) => o.value === chartVisibleMetrics[0])?.label || '1'
          : `${chartVisibleMetrics.length} selected`;

    const handleChartFilterAll = () => {
      setChartVisibleMetrics(
        allChartVisible ? [chartOrderValues[0]] : [...chartOrderValues]
      );
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <Filter className="w-3 h-3" />
            <span>Filter:</span>
            <span className="font-bold">{labelText}</span>
            <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="end">
          <div className="p-1.5 border-b">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors hover:bg-accent"
              onClick={handleChartFilterAll}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                  allChartVisible ? "bg-primary border-primary" : "border-border"
                )}
              >
                {allChartVisible && (
                  <span className="text-primary-foreground text-[10px] font-bold">✓</span>
                )}
              </div>
              <span className="font-medium text-foreground">All</span>
            </button>
          </div>
          <div className="p-1.5 space-y-0.5">
            {METRICS_OPTIONS.map((opt) => {
              const checked = chartVisibleMetrics.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-accent transition-colors"
                  onClick={() => toggleChartMetric(opt.value)}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: opt.color,
                      backgroundColor: checked ? opt.color : "transparent",
                    }}
                  >
                    {checked && <span className="text-white text-[9px] font-bold">✓</span>}
                  </div>
                  <span
                    className={cn(
                      checked ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Format helpers
  const formatCurrency = (amount) => {
    if (!amount) return "£0";
    if (amount >= 1000000) return `£${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `£${(amount / 1000).toFixed(1)}k`;
    return `£${amount.toFixed(0)}`;
  };

  const formatVolume = (liters) => {
    if (!liters) return "0 L";
    if (liters >= 1000000) return `${(liters / 1000000).toFixed(2)}M L`;
    if (liters >= 1000) return `${(liters / 1000).toFixed(2)}K L`;
    return `${Number(liters).toFixed(2)} L`;
  };

  /** PPL is only meaningful when there is fuel volume; otherwise show gross margin % (same as SiteCard). */
  const siteHasFuelVolume = (site) => Number(site?.totalFuelVolume) > 0;
  /** PPL after O/H in pence (pplAfterOverheads ?? avgPPL) — magnitude for UI (matches SiteCard). */
  const pplPenceDisplay = (site) =>
    Math.abs(Number(site?.pplAfterOverheads ?? site?.avgPPL ?? 0) || 0);
  const noFuelVolumeAcrossSites =
    sitesData.length > 0 && sitesData.every((site) => !siteHasFuelVolume(site));
  const getMetricDisplayLabel = (metric) => {
    const defaultLabel = METRICS_OPTIONS.find((o) => o.value === metric)?.label || metric;
    if (metric === 'ppl' && noFuelVolumeAcrossSites) return 'Margin';
    return defaultLabel;
  };

  // Sort sites data based on applied metrics (charts + default table order)
  const getSortedSitesData = useCallback(() => {
    if (appliedMetrics.length === 0) return sitesData;
    
    return [...sitesData].sort((a, b) => {
      const firstMetric = appliedMetrics[0];

      // PPL: sites with volume first (by PPL desc); no-volume sites after (by Margin % desc)
      if (firstMetric === 'ppl') {
        const aVol = siteHasFuelVolume(a);
        const bVol = siteHasFuelVolume(b);
        if (aVol && !bVol) return -1;
        if (!aVol && bVol) return 1;
        if (!aVol && !bVol) {
          return (Number(b.grossMarginPct) || 0) - (Number(a.grossMarginPct) || 0);
        }
        const av = a.pplAfterOverheads ?? a.avgPPL ?? 0;
        const bv = b.pplAfterOverheads ?? b.avgPPL ?? 0;
        return bv - av;
      }

      let aValue = 0;
      let bValue = 0;
      switch (firstMetric) {
        case 'sales':
          aValue = a.netSales || 0;
          bValue = b.netSales || 0;
          break;
        case 'profit':
          aValue = Math.abs(a.profit || 0);
          bValue = Math.abs(b.profit || 0);
          break;
        case 'saleVolume':
          aValue = a.totalFuelVolume || 0;
          bValue = b.totalFuelVolume || 0;
          break;
        default:
          break;
      }
      return bValue - aValue;
    });
  }, [sitesData, appliedMetrics]);

  /** Row order for table view (explicit column sort or chart default). */
  const tableOrderedSites = useMemo(() => {
    const compareColumn = (a, b, key) => {
      switch (key) {
        case "siteName":
          return (a.siteName || "").localeCompare(b.siteName || "", undefined, {
            sensitivity: "base",
          });
        case "sales":
          return (Number(a.netSales) || 0) - (Number(b.netSales) || 0);
        case "profit":
          return Math.abs(Number(a.profit) || 0) - Math.abs(Number(b.profit) || 0);
        case "saleVolume":
          return (Number(a.totalFuelVolume) || 0) - (Number(b.totalFuelVolume) || 0);
        case "ppl": {
          const aVol = siteHasFuelVolume(a);
          const bVol = siteHasFuelVolume(b);
          if (aVol !== bVol) return aVol ? -1 : 1;
          if (aVol) {
            return pplPenceDisplay(a) - pplPenceDisplay(b);
          }
          return (Number(a.grossMarginPct) || 0) - (Number(b.grossMarginPct) || 0);
        }
        default:
          return 0;
      }
    };

    if (!tableSort.key) return getSortedSitesData();
    const list = [...sitesData];
    const sign = tableSort.direction === "asc" ? 1 : -1;
    list.sort((a, b) => sign * compareColumn(a, b, tableSort.key));
    return list;
  }, [sitesData, tableSort, getSortedSitesData]);

  useEffect(() => {
    if (!tableSort.key || tableSort.key === "siteName") return;
    if (!appliedMetrics.includes(tableSort.key)) {
      setTableSort({ key: null, direction: "desc" });
    }
  }, [appliedMetrics, tableSort.key]);

  // Prepare data for Plotly bar chart
  const barChartData = useMemo(() => {
    if (sitesData.length === 0) return null;

    const sortedData = getSortedSitesData();
    const siteNames = sortedData.map(site => site.siteName);
    
    // Helper function to format currency
    const formatCurrencyValue = (amount) => {
      if (!amount) return "£0";
      if (amount >= 1000000) return `£${(amount / 1000000).toFixed(2)}M`;
      if (amount >= 1000) return `£${(amount / 1000).toFixed(1)}k`;
      return `£${amount.toFixed(0)}`;
    };

    // Helper function to format volume (up to 2 decimal places)
    const formatVolumeValue = (liters) => {
      if (!liters) return "0 L";
      if (liters >= 1000000) return `${(liters / 1000000).toFixed(2)}M L`;
      if (liters >= 1000) return `${(liters / 1000).toFixed(2)}K L`;
      return `${Number(liters).toFixed(2)} L`;
    };

    const metricsToPlot = METRICS_OPTIONS.map((o) => o.value).filter((m) =>
      chartVisibleMetrics.includes(m)
    );

    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    /**
     * Per-point hover templates (not `text` + hoverinfo:text): Plotly puts `text` on SVG as plain text,
     * which shows raw HTML. `hovertemplate` per point is rendered as HTML in the hover foreignObject.
     */
    /**
     * Plotly sanitizes hover HTML: `<div>`, `<span>`, and most `style=` are shown as literal text.
     * Use only `<b>` + `<br>` (supported) and rely on `layout.hoverlabel.font` for base styling.
     */
    const siteHoverTemplates = sortedData.map((site) => {
      const formatMetricValue = (m) => {
        if (m === "ppl" && !siteHasFuelVolume(site)) {
          return `${(Number(site.grossMarginPct) || 0).toFixed(2)}%`;
        }
        switch (m) {
          case "sales":
            return formatCurrencyValue(site.netSales || 0);
          case "profit":
            return formatCurrencyValue(Math.abs(site.profit || 0));
          case "saleVolume":
            return formatVolumeValue(site.totalFuelVolume || 0);
          case "ppl": {
            const v = site.pplAfterOverheads ?? site.avgPPL ?? 0;
            return `${(Number(v) || 0).toFixed(2)} p`;
          }
          default:
            return "";
        }
      };

      const rows = metricsToPlot.map((m) => {
        const opt = METRICS_OPTIONS.find((o) => o.value === m);
        const val = formatMetricValue(m);
        return `${esc(opt?.label || m)}: <b>${esc(val)}</b>`;
      });

      return `<b>${esc(site.siteName)}</b><br>${rows.join("<br>")}<extra></extra>`;
    });

    const traces = metricsToPlot.map((metric) => {
      const metricOption = METRICS_OPTIONS.find(opt => opt.value === metric);
      const values = sortedData.map(site => {
        switch (metric) {
          case 'sales':    return site.netSales || 0;
          case 'profit':   return Math.abs(site.profit || 0);
          case 'saleVolume': return site.totalFuelVolume || 0;
          case 'ppl':      return siteHasFuelVolume(site) ? (site.pplAfterOverheads ?? site.avgPPL ?? 0) : null;
          default:         return 0;
        }
      });

      return {
        x: siteNames,
        y: values,
        name: metricOption?.label || metric,
        type: 'bar',
        marker: { color: metricOption?.color || '#8884d8' },
        hovertemplate: siteHoverTemplates,
      };
    });

    return {
      data: traces,
      layout: {
        title: isMobile ? false : {
          text: 'Metrics Comparison Across All Sites',
          font: { size: 18, color: isDarkChart ? '#f1f5f9' : '#0f172a' },
        },
        xaxis: {
          title: isMobile ? '' : 'Sites',
          tickangle: isMobile ? -55 : -45,
          tickfont: { size: isMobile ? 9 : 10, color: isDarkChart ? '#94a3b8' : '#64748b' },
          automargin: true,
        },
        yaxis: {
          title: isMobile ? '' : 'Value',
          tickfont: { size: isMobile ? 9 : 11, color: isDarkChart ? '#94a3b8' : '#64748b' },
          automargin: true,
        },
        barmode: 'group',
        hovermode: 'closest',
        dragmode: false,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: isDarkChart ? '#f1f5f9' : '#0f172a' },
        hoverlabel: {
          bgcolor: isDarkChart ? "rgba(30, 41, 59, 0.78)" : "rgba(255, 255, 255, 0.82)",
          bordercolor: isDarkChart ? "rgba(148, 163, 184, 0.35)" : "rgba(128, 155, 185, 0.45)",
          font: {
            color: isDarkChart ? "#f1f5f9" : "#0f172a",
            size: isMobile ? 12 : 14,
            family: "system-ui, -apple-system, 'Plus Jakarta Sans', sans-serif",
          },
          align: "left",
          namelength: 0,
        },
        showlegend: false,
        margin: {
          l: isMobile ? 44 : 60,
          r: isMobile ? 8 : 20,
          t: isMobile ? 16 : 40,
          b: isMobile ? 90 : 100,
        },
      },
      config: {
        displayModeBar: false,
        responsive: true,
        displaylogo: false,
        scrollZoom: false,
        doubleClick: false,
        staticPlot: false,
      },
    };
  }, [sitesData, chartVisibleMetrics, getSortedSitesData, isMobile, isDarkChart]);

  const renderTableSortArrows = (columnKey, labelShort) => (
    <div
      className="inline-flex flex-col border border-border/60 rounded overflow-hidden shrink-0 bg-background/80"
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label={`Sort ${labelShort}`}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 rounded-none p-0 min-w-0",
          tableSort.key === columnKey && tableSort.direction === "asc" && "bg-primary/15 text-primary"
        )}
        aria-label={`${labelShort}: ascending`}
        onClick={() => setTableSort({ key: columnKey, direction: "asc" })}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-6 w-6 rounded-none p-0 min-w-0 border-t border-border/60",
          tableSort.key === columnKey && tableSort.direction === "desc" && "bg-primary/15 text-primary"
        )}
        aria-label={`${labelShort}: descending`}
        onClick={() => setTableSort({ key: columnKey, direction: "desc" })}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col bg-transparent">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main 
          style={{ willChange: 'margin-left' }}
          className={`flex flex-1 flex-col min-h-0 min-w-0 transition-[margin-left] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} ml-0`}
        >
          <div className="mx-2 mt-2 mb-3 flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:mx-3 sm:mt-3 sm:mb-4 sm:gap-3 lg:mx-5 lg:mt-4 lg:mb-6 lg:gap-3">
          <div className="main-stage-header-card">
            <Header
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
              showTotalSales={false}
            />
          </div>
          
          <div className="main-stage-card flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 min-w-0 flex-1 p-4 sm:p-5 lg:p-8">
            {/* Page Title */}
            <div className="mb-4 lg:mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Metrics Comparison</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Compare all sites by selected metrics</p>
              </div>
            </div>

            {/* Filter Section */}
            <div className="chart-card mb-4 lg:mb-6 animate-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-sm lg:text-base font-semibold text-foreground">Filters</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Date Range</p>
                  <DateRangePicker
                    startDate={pendingStartDate}
                    endDate={pendingEndDate}
                    onDateChange={handleDateRangeChange}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Select Metrics</p>
                  <MetricsMultiSelect />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleConfirmFilters}
                  disabled={pendingMetrics.length === 0}
                  className={cn(
                    "flex items-center gap-2 w-full sm:w-auto transition-all",
                    hasUnappliedChanges && "ring-2 ring-primary/50"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Apply Filters
                </Button>
              </div>
            </div>

            {/* Site cards grid — heading uses total comparison sites (fixed); batch fetch still fills cards progressively */}
            {sitesData.length > 0 && viewMode === 'charts' && (
              <div className="mb-6 lg:mb-8">
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                      {sites.length} site{sites.length === 1 ? "" : "s"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {appliedMetrics.map((m) => getMetricDisplayLabel(m)).join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'charts' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('charts')}
                      className="flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Charts</span>
                      <span className="xs:hidden">Chart</span>
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <TableIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      Table
                    </Button>
                  </div>
                </div>
                
                {loadingData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="chart-card h-80 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                    {getSortedSitesData().map((siteData, index) => (
                        <SiteCard
                          key={siteData.siteId}
                          site={{
                            siteId: siteData.siteId,
                            siteName: siteData.siteName,
                            name: siteData.siteName,
                            id: siteData.siteId,
                            city: siteData.city
                          }}
                          metrics={siteData}
                          index={index}
                          visibleMetrics={appliedMetrics}
                        />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Charts View */}
            {viewMode === 'charts' && (
              <>
                {/* Bar Chart */}
                {barChartData && (
                  <div className="chart-card mb-4 lg:mb-6 animate-slide-up">
                    <div className="mb-3 sm:mb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-0.5 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            <span>Bar Chart Comparison</span>
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Visual comparison of selected metrics across all sites
                          </p>
                        </div>
                        {/* Chart-only filter dropdown — right side */}
                        <ChartMetricFilter />
                      </div>
                    </div>
                    {loadingData ? (
                      <div className="flex items-center justify-center h-96">
                        <div className="text-muted-foreground">Loading chart data...</div>
                      </div>
                    ) : (
                      <div
                        className="metrics-comparison-plot plotly-glass-tooltip w-full"
                        style={{ height: isMobile ? "440px" : isTablet ? "420px" : "500px" }}
                      >
                        <Plot
                          data={barChartData.data}
                          layout={barChartData.layout}
                          config={barChartData.config}
                          style={{ width: "100%", height: "100%" }}
                          useResizeHandler={true}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Table View */}
            {viewMode === 'table' && (
              <>
                {/* Header with view toggle */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                      {sites.length} site{sites.length === 1 ? "" : "s"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {appliedMetrics.map((m) => getMetricDisplayLabel(m)).join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'charts' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('charts')}
                      className="flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Charts</span>
                      <span className="xs:hidden">Chart</span>
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <TableIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      Table
                    </Button>
                  </div>
                </div>

                <div className="chart-card animate-slide-up">

                {loadingData ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading comparison data...</div>
                  </div>
                ) : sitesData.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-muted-foreground">No data available. Please select metrics and filters.</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full sm:overflow-visible overflow-x-auto">
                    <Table className="sm:w-full w-max min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead
                            className="min-w-[130px] sm:min-w-[150px] text-xs sm:text-sm sticky left-0 z-20 sm:static sm:bg-transparent"
                            style={{ backgroundColor: 'hsl(var(--card))' }}
                          >
                            <div className="flex items-center justify-between gap-2 pr-1">
                              <span>Site Name</span>
                              {renderTableSortArrows("siteName", "Site name")}
                            </div>
                          </TableHead>
                          {appliedMetrics.includes('sales') && (
                            <TableHead className="text-right min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ backgroundColor: 'hsl(var(--chart-blue))' }} />
                                  <span>Sales</span>
                                </div>
                                {renderTableSortArrows("sales", "Sales")}
                              </div>
                            </TableHead>
                          )}
                          {appliedMetrics.includes('profit') && (
                            <TableHead className="text-right min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ backgroundColor: '#10b981' }} />
                                  <span title={`Fuel + shop + ${COFFEE_VALET_REVENUE_LABEL} (combined)`}>Gross Profit</span>
                                </div>
                                {renderTableSortArrows("profit", "Gross profit")}
                              </div>
                            </TableHead>
                          )}
                          {appliedMetrics.includes('saleVolume') && (
                            <TableHead className="text-right min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ backgroundColor: '#f59e0b' }} />
                                  <span className="hidden sm:inline">Sale Volume</span>
                                  <span className="sm:hidden">Volume</span>
                                </div>
                                {renderTableSortArrows("saleVolume", "Sale volume")}
                              </div>
                            </TableHead>
                          )}
                          {appliedMetrics.includes('ppl') && (
                            <TableHead className="text-right min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ backgroundColor: '#8b5cf6' }} />
                                  <span>{noFuelVolumeAcrossSites ? "Margin" : "PPL after O/H"}</span>
                                </div>
                                {renderTableSortArrows("ppl", noFuelVolumeAcrossSites ? "Margin" : "PPL after O/H")}
                              </div>
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableOrderedSites.map((site, index) => (
                          <TableRow key={site.siteId} className={index % 2 === 0 ? 'bg-card/30' : ''}>
                            <TableCell
                              className="font-medium text-xs sm:text-sm sticky left-0 z-10 sm:static"
                              style={{ backgroundColor: 'hsl(var(--card))' }}
                            >
                              {site.siteName}
                            </TableCell>
                            {appliedMetrics.includes('sales') && (
                              <TableCell className="text-right font-semibold text-xs sm:text-sm" style={{ color: 'hsl(var(--chart-blue))' }}>
                                {formatCurrency(site.netSales || 0)}
                              </TableCell>
                            )}
                            {appliedMetrics.includes('profit') && (
                              <TableCell className="text-right font-semibold text-xs sm:text-sm" style={{ color: '#10b981' }}>
                                {formatCurrency(Math.abs(site.profit || 0))}
                              </TableCell>
                            )}
                            {appliedMetrics.includes('saleVolume') && (
                              <TableCell className="text-right font-semibold text-xs sm:text-sm" style={{ color: '#f59e0b' }}>
                                {formatVolume(site.totalFuelVolume || 0)}
                              </TableCell>
                            )}
                            {appliedMetrics.includes('ppl') && (
                              <TableCell className="text-right font-semibold text-xs sm:text-sm" style={{ color: '#8b5cf6' }}>
                                {siteHasFuelVolume(site)
                                  ? `${(Number(site.pplAfterOverheads ?? site.avgPPL ?? 0) || 0).toFixed(2)} p`
                                  : `${(Number(site.grossMarginPct) || 0).toFixed(2)}%`}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                </div>
              </>
            )}

          </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MetricsComparison;

