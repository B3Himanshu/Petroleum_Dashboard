import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SitePhotoGallery } from "./SitePhotoGallery";
import { ComparisonMetrics } from "./ComparisonMetrics";
import { ComparisonBarChart } from "./ComparisonBarChart";
import { ComparisonPieCharts } from "./ComparisonPieCharts";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { sitesAPI, dashboardAPI } from "@/services/api";
import { Filter, X } from "lucide-react";

// Same default as Business Performance Dashboard / Metrics Comparison: May–Dec 2025
const getDefaultDates = () => ({ startDate: "2025-05-01", endDate: "2025-12-31" });

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Derive months and years arrays from startDate/endDate for ComparisonPieCharts (getSalesDistribution)
function getMonthsAndYearsFromRange(startDate, endDate) {
  if (!startDate || !endDate) return { months: [], years: [] };
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return { months: [], years: [] };
  const months = [];
  const yearsSet = new Set();
  const curr = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (curr <= last) {
    months.push(curr.getMonth() + 1);
    yearsSet.add(curr.getFullYear());
    curr.setMonth(curr.getMonth() + 1);
  }
  return { months, years: Array.from(yearsSet).sort((a, b) => a - b) };
}

// Human-readable period label: single month "November 2025", or range "May – December 2025"
function getDateRangeLabel(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  if (startMonth === endMonth && startYear === endYear) {
    return `${MONTH_NAMES[startMonth]} ${startYear}`;
  }
  return `${MONTH_NAMES[startMonth]} – ${MONTH_NAMES[endMonth]} ${endYear}`;
}

export const SiteComparison = () => {
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);

  const loadSavedComparisonFilters = () => {
    try {
      const saved = sessionStorage.getItem("comparisonFilters");
      if (saved) {
        const filters = JSON.parse(saved);
        const defaultDates = getDefaultDates();
        return {
          site1: filters.site1 ?? null,
          site2: filters.site2 ?? null,
          startDate: filters.startDate || defaultDates.startDate,
          endDate: filters.endDate || defaultDates.endDate,
        };
      }
    } catch (error) {
      console.error("Error loading saved comparison filters:", error);
    }
    const defaultDates = getDefaultDates();
    return {
      site1: null,
      site2: null,
      startDate: defaultDates.startDate,
      endDate: defaultDates.endDate,
    };
  };

  const savedComparisonFilters = loadSavedComparisonFilters();

  const [pendingSite1, setPendingSite1] = useState(savedComparisonFilters.site1);
  const [pendingSite2, setPendingSite2] = useState(savedComparisonFilters.site2);
  const [startDate, setStartDate] = useState(savedComparisonFilters.startDate);
  const [endDate, setEndDate] = useState(savedComparisonFilters.endDate);

  const [appliedSite1, setAppliedSite1] = useState(savedComparisonFilters.site1);
  const [appliedSite2, setAppliedSite2] = useState(savedComparisonFilters.site2);
  
  // Initialize applied filters on mount (optional - can start with no filters)
  // This allows users to set filters before applying
  
  const [site1Data, setSite1Data] = useState(null);
  const [site2Data, setSite2Data] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Fetch sites
  useEffect(() => {
    const fetchSites = async () => {
      try {
        setLoadingSites(true);
        const sitesData = await sitesAPI.getAll();
        setSites(sitesData);
      } catch (error) {
        console.error('Error fetching sites:', error);
        setSites([]);
      } finally {
        setLoadingSites(false);
      }
    };
    fetchSites();
  }, []);

  const handleDateRangeChange = (newStartDate, newEndDate) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    try {
      const saved = sessionStorage.getItem("comparisonFilters");
      const filters = saved ? JSON.parse(saved) : {};
      sessionStorage.setItem(
        "comparisonFilters",
        JSON.stringify({
          ...filters,
          startDate: newStartDate,
          endDate: newEndDate,
          site1: appliedSite1,
          site2: appliedSite2,
        })
      );
    } catch (e) {
      console.error("Error saving date range:", e);
    }
  };

  // Fetch comparison data with petrol-data APIs (same as Metrics Comparison)
  useEffect(() => {
    if (!appliedSite1 || !appliedSite2 || appliedSite1 === appliedSite2 || !startDate || !endDate) {
      setSite1Data(null);
      setSite2Data(null);
      return;
    }

    const fetchComparisonData = async () => {
      try {
        setLoadingComparison(true);
        const fetchForSite = async (siteId) => {
          const siteIds = [siteId];
          const [netSalesRes, profitRes, pplRes, volRes, actualPplRes] = await Promise.all([
            dashboardAPI.getPetrolNetSales(startDate, endDate, siteIds),
            dashboardAPI.getPetrolProfit(startDate, endDate, siteIds),
            dashboardAPI.getPetrolAvgPPL(startDate, endDate, siteIds),
            dashboardAPI.getPetrolFuelVolumeTransitionBreakdown(startDate, endDate, siteIds),
            dashboardAPI.getPetrolActualPPL(startDate, endDate, siteIds),
          ]);
          // Store as positive magnitudes so Site Comparison always shows positive values
          const netSales = Math.abs(Number(netSalesRes?.totalNetSales ?? 0));
          const profit = Math.abs(Number(profitRes?.totalProfit ?? 0));
          const avgPPL = Math.abs(Number(pplRes?.avgPPL ?? 0));
          const totalFuelVolume = Math.abs(Number(volRes?.totalVolume ?? 0));
          const pplAfterOverheads = actualPplRes?.pplAfterOverheads != null
            ? Math.abs(Number(actualPplRes.pplAfterOverheads))
            : undefined;
          return {
            netSales,
            profit,
            totalFuelVolume,
            avgPPL,
            ...(pplAfterOverheads != null && { pplAfterOverheads }),
          };
        };

        const [data1, data2] = await Promise.all([
          fetchForSite(appliedSite1),
          fetchForSite(appliedSite2),
        ]);
        setSite1Data(data1);
        setSite2Data(data2);
      } catch (error) {
        console.error("Error fetching comparison data:", error);
        setSite1Data(null);
        setSite2Data(null);
      } finally {
        setLoadingComparison(false);
      }
    };

    fetchComparisonData();
  }, [appliedSite1, appliedSite2, startDate, endDate]);

  const { months: derivedMonths, years: derivedYears } = useMemo(
    () => getMonthsAndYearsFromRange(startDate, endDate),
    [startDate, endDate]
  );

  const handleApply = () => {
    setAppliedSite1(pendingSite1);
    setAppliedSite2(pendingSite2);
    try {
      sessionStorage.setItem(
        "comparisonFilters",
        JSON.stringify({
          site1: pendingSite1,
          site2: pendingSite2,
          startDate,
          endDate,
        })
      );
    } catch (error) {
      console.error("Error saving comparison filters:", error);
    }
  };

  const handleClear = () => {
    const defaultDates = getDefaultDates();
    setPendingSite1(null);
    setPendingSite2(null);
    setStartDate(defaultDates.startDate);
    setEndDate(defaultDates.endDate);
    setAppliedSite1(null);
    setAppliedSite2(null);
    setSite1Data(null);
    setSite2Data(null);
    try {
      sessionStorage.removeItem("comparisonFilters");
    } catch (error) {
      console.error("Error clearing comparison filters:", error);
    }
  };

  const hasPendingChanges =
    pendingSite1 !== appliedSite1 || pendingSite2 !== appliedSite2;

  const canCompare = appliedSite1 && appliedSite2 && appliedSite1 !== appliedSite2;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filter Section */}
      <div className="chart-card animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-sm sm:text-base font-semibold text-foreground">
              Comparison Filters
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(pendingSite1 || pendingSite2 || appliedSite1 || appliedSite2) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                <span className="hidden xs:inline">Clear</span>
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleApply}
              disabled={!pendingSite1 || !pendingSite2 || pendingSite1 === pendingSite2 || !hasPendingChanges}
              className="text-xs sm:text-sm"
            >
              Apply Filters
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Date range (same as Business Performance Dashboard / Metrics Comparison) */}
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

          {/* Site 1 Selection */}
          <div>
            <label className="text-xs font-medium text-primary mb-2 block">
              Site 1
            </label>
            <Select
              value={pendingSite1?.toString() || ""}
              onValueChange={(value) => setPendingSite1(value === "all" ? null : parseInt(value, 10))}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select first site" />
              </SelectTrigger>
              <SelectContent>
                {loadingSites ? (
                  <SelectItem value="loading" disabled>Loading sites...</SelectItem>
                ) : (
                  sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Site 2 Selection */}
          <div>
            <label className="text-xs font-medium text-primary mb-2 block">
              Site 2
            </label>
            <Select
              value={pendingSite2?.toString() || ""}
              onValueChange={(value) => setPendingSite2(value === "all" ? null : parseInt(value, 10))}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select second site" />
              </SelectTrigger>
              <SelectContent>
                {loadingSites ? (
                  <SelectItem value="loading" disabled>Loading sites...</SelectItem>
                ) : (
                  sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {pendingSite1 === pendingSite2 && pendingSite1 && (
          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400">
              Please select two different sites for comparison.
            </p>
          </div>
        )}
      </div>

      {/* Selected period (month-wise): single month or range */}
      {canCompare && startDate && endDate && (
        <p className="text-xs sm:text-sm text-muted-foreground">
          Showing data for: <span className="font-medium text-foreground">{getDateRangeLabel(startDate, endDate)}</span>
        </p>
      )}

      {/* Site Photo Galleries */}
      {canCompare && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <SitePhotoGallery 
            siteId={appliedSite1} 
            siteName={sites.find(s => s.id === appliedSite1)?.name || "Site 1"}
          />
          <SitePhotoGallery 
            siteId={appliedSite2} 
            siteName={sites.find(s => s.id === appliedSite2)?.name || "Site 2"}
          />
        </div>
      )}

      {/* Comparison Charts */}
      {canCompare && (
        <>
          {/* Bar Chart Comparison */}
          <ComparisonBarChart
            site1Data={site1Data}
            site2Data={site2Data}
            site1Name={sites.find(s => s.id === appliedSite1)?.name || "Site 1"}
            site2Name={sites.find(s => s.id === appliedSite2)?.name || "Site 2"}
            loading={loadingComparison}
          />

          {/* Pie Charts Comparison - Fuel mix by grade (no shop/valet) */}
          <ComparisonPieCharts
            site1Id={appliedSite1}
            site2Id={appliedSite2}
            site1Name={sites.find(s => s.id === appliedSite1)?.name || "Site 1"}
            site2Name={sites.find(s => s.id === appliedSite2)?.name || "Site 2"}
            startDate={startDate}
            endDate={endDate}
            loading={loadingComparison}
            comparisonSite1Data={site1Data}
            comparisonSite2Data={site2Data}
          />
        </>
      )}

      {/* Comparison Metrics */}
      {canCompare && (
        <ComparisonMetrics 
          site1Data={site1Data}
          site2Data={site2Data}
          site1Name={sites.find(s => s.id === appliedSite1)?.name || "Site 1"}
          site2Name={sites.find(s => s.id === appliedSite2)?.name || "Site 2"}
          loading={loadingComparison}
        />
      )}

      {/* Empty State */}
      {!canCompare && (
        <div className="chart-card h-64 sm:h-96 flex items-center justify-center">
          <div className="text-center space-y-3 sm:space-y-4 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Filter className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                Select Two Sites to Compare
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Choose two different sites from the filters above to view their comparison
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

