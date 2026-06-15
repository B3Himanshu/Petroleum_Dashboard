import { useState, useEffect, useRef, useCallback } from "react";
import { 
  Fuel, 
  IndianRupee, 
  TrendingUp, 
  BarChart, 
  Percent, 
  ShoppingCart, 
  ShoppingBag, 
  Users 
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FilterSection } from "@/components/dashboard/FilterSection";
import { QuickInsights } from "@/components/dashboard/QuickInsights";
import { MonthlyPerformanceChart } from "@/components/dashboard/MonthlyPerformanceChart";
import { OverallSalesPieChart } from "@/components/dashboard/OverallSalesPieChart";
import { BunkeredSalesChart } from "@/components/dashboard/BunkeredSalesChart";
import { PPIChart } from "@/components/dashboard/PPIChart";
import { DateWiseChart } from "@/components/dashboard/DateWiseChart";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { InitialLandingState } from "@/components/dashboard/InitialLandingState";
import { CardDetailModal, DetailItem } from "@/components/dashboard/CardDetailModal";
import { TopPerformingSitesTable } from "@/components/dashboard/TopPerformingSitesTable";
import { MarketingInitiativesTable } from "@/components/dashboard/MarketingInitiativesTable";
import { SalesDistributionChart } from "@/components/dashboard/SalesDistributionChart";
import { CityMap } from "@/components/dashboard/CityMap";
import { dashboardAPI } from "@/services/api";
import {
  COFFEE_VALET_REVENUE_LABEL,
  COFFEE_VALET_PROFIT_LABEL,
  matchesCoffeeValetRevenueName,
} from "@/constants/revenueLabels";

const Index = () => {

  // Initialize sidebar state based on screen size
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return true;
  });

  // Load saved filters from sessionStorage on mount
  const loadSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('dashboardFilters');
      if (saved) {
        const filters = JSON.parse(saved);
        return {
          site: filters.site || null,
          months: filters.months || [11],
          years: filters.years || [2025],
          month: filters.month || 11,
          year: filters.year || 2025,
          applied: filters.applied || false
        };
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
    return {
      site: null,
      months: [11],
      years: [2025],
      month: 11,
      year: 2025,
      applied: false
    };
  };

  const savedFilters = loadSavedFilters();
  
  // Filter and landing state - initialize from saved filters
  const [filtersApplied, setFiltersApplied] = useState(savedFilters.applied);
  const [selectedMonth, setSelectedMonth] = useState(savedFilters.month);
  const [selectedYear, setSelectedYear] = useState(savedFilters.year);
  const [selectedMonths, setSelectedMonths] = useState(savedFilters.months);
  const [selectedYears, setSelectedYears] = useState(savedFilters.years);
  const [selectedSite, setSelectedSite] = useState(savedFilters.site);
  const pendingSiteIdRef = useRef(null);

  // Dashboard data state
  const [metrics, setMetrics] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [salesDistribution, setSalesDistribution] = useState(null);
  const [totalSalesAllSites, setTotalSalesAllSites] = useState(null);

  // Modal states for card clicks
  const [fuelVolumeModalOpen, setFuelVolumeModalOpen] = useState(false);
  const [netSalesModalOpen, setNetSalesModalOpen] = useState(false);
  const [profitModalOpen, setProfitModalOpen] = useState(false);

  // Handle responsive sidebar on resize
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
  
  const handleApplyFilters = useCallback((filters) => {
    // filters can be either { siteId, months, years } or { siteId, month, year } or just siteId (for backward compatibility)
    const siteId = typeof filters === 'object' ? filters.siteId : filters;
    const months = typeof filters === 'object' ? (filters.months || (filters.month ? [filters.month] : null)) : null;
    const years = typeof filters === 'object' ? (filters.years || (filters.year ? [filters.year] : null)) : null;
    
    if (!siteId) return;
    
    // Store the siteId and set it - useEffect will handle setting filtersApplied (works for single site or 'all')
    pendingSiteIdRef.current = siteId;
    setSelectedSite(siteId);
    
    // Set months and years if provided (use first month/year for single selection compatibility)
    const finalMonths = months && months.length > 0 ? months : selectedMonths;
    const finalYears = years && years.length > 0 ? years : selectedYears;
    
    if (finalMonths && finalMonths.length > 0) {
      setSelectedMonth(finalMonths[0]); // For backward compatibility, use first month
      // Store all months for multi-select support
      setSelectedMonths(finalMonths);
    }
    if (finalYears && finalYears.length > 0) {
      setSelectedYear(finalYears[0]); // For backward compatibility, use first year
      // Store all years for multi-select support
      setSelectedYears(finalYears);
    }
    
    // Save filters to sessionStorage
    try {
      sessionStorage.setItem('dashboardFilters', JSON.stringify({
        site: siteId,
        months: finalMonths,
        years: finalYears,
        month: finalMonths[0],
        year: finalYears[0],
        applied: true
      }));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, [selectedMonths, selectedYears]);
  
  // Effect to set filtersApplied after selectedSite is confirmed
  useEffect(() => {
    if (pendingSiteIdRef.current && selectedSite === pendingSiteIdRef.current) {
      setFiltersApplied(true);
      pendingSiteIdRef.current = null;
    }
  }, [selectedSite]);

  // Restore saved filters on mount if they exist
  useEffect(() => {
    if (savedFilters.applied && savedFilters.site) {
      // Auto-apply saved filters
      setSelectedSite(savedFilters.site);
      setSelectedMonths(savedFilters.months);
      setSelectedYears(savedFilters.years);
      setSelectedMonth(savedFilters.month);
      setSelectedYear(savedFilters.year);
      setFiltersApplied(true);
    }
  }, []); // Only run on mount

  // Fetch dashboard metrics when site is selected (single site or All Sites)
  useEffect(() => {
    if (!selectedSite || !filtersApplied) {
      setMetrics(null);
      setStatusData(null);
      setSalesDistribution(null);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoadingMetrics(true);
        
        const isAllSites = selectedSite === 'all';
        const siteIdParam = isAllSites ? 'all' : (typeof selectedSite === 'string' ? parseInt(selectedSite, 10) : selectedSite);
        
        // Use selected months and years arrays, fallback to single values for backward compatibility
        const monthsToFetch = selectedMonths && selectedMonths.length > 0 ? selectedMonths : [selectedMonth || new Date().getMonth() + 1];
        const yearsToFetch = selectedYears && selectedYears.length > 0 ? selectedYears : [selectedYear || new Date().getFullYear()];
        
        console.log('🔄 [Index] Fetching dashboard data:', {
          siteId: selectedSite,
          siteIdParam,
          isAllSites,
          monthsToFetch,
          yearsToFetch,
          monthsCount: monthsToFetch.length,
          yearsCount: yearsToFetch.length,
          timestamp: new Date().toISOString()
        });
        
        // All Sites: only metrics API supports siteId=all; status/sales distribution stay null
        if (isAllSites) {
          const metricsData = await dashboardAPI.getMetrics('all', monthsToFetch, yearsToFetch);
          setMetrics(metricsData);
          setStatusData(null);
          setSalesDistribution(null);
        } else {
          // Fetch metrics, status, and sales distribution in parallel for single site
          console.log('🔄 [Index] Starting parallel API calls...');
          const [metricsData, statusDataResult, salesData] = await Promise.all([
            dashboardAPI.getMetrics(siteIdParam, monthsToFetch, yearsToFetch),
            dashboardAPI.getStatus(siteIdParam),
            dashboardAPI.getSalesDistribution(siteIdParam, monthsToFetch, yearsToFetch),
          ]);

        console.log('✅ [Index] Dashboard data received:', {
          metricsData: {
            totalFuelVolume: metricsData?.totalFuelVolume,
            netSales: metricsData?.netSales,
            profit: metricsData?.profit,
            avgPPL: metricsData?.avgPPL,
            customerCount: metricsData?.customerCount
          },
          statusData: statusDataResult,
          salesData: salesData,
          timestamp: new Date().toISOString()
        });
        
        setMetrics(metricsData);
        setStatusData(statusDataResult);
        setSalesDistribution(salesData);
        }
      } catch (error) {
        console.error('❌ [Index] Error fetching dashboard data:', {
          error: error.message,
          stack: error.stack,
          selectedSite,
          selectedMonths,
          selectedYears,
          selectedMonth,
          selectedYear,
          filtersApplied,
          timestamp: new Date().toISOString()
        });
        setMetrics(null);
        setStatusData(null);
        setSalesDistribution(null);
      } finally {
        setLoadingMetrics(false);
      }
    };

    fetchDashboardData();
  }, [selectedSite, selectedMonths, selectedYears, selectedMonth, selectedYear, filtersApplied]);

  // Fetch total sales across all sites (independent of selected site)
  // When nothing is selected, show ALL sales across all months and years
  useEffect(() => {
    const fetchTotalSales = async () => {
      try {
        // When no filters are applied, get ALL sales data (all months, all years)
        // This shows the grand total across all sites and all time periods
        const getAllData = !filtersApplied;
        
        console.log('📊 [Index] Fetching total sales across all sites:', {
          getAllData,
          filtersApplied,
          timestamp: new Date().toISOString()
        });
        
        // Pass null/undefined to get all data, or pass months/years if filters are applied
        const totalSalesData = getAllData 
          ? await dashboardAPI.getTotalSales(null, null)  // Get all months and years
          : await dashboardAPI.getTotalSales(
              selectedMonths && selectedMonths.length > 0 ? selectedMonths : [selectedMonth || new Date().getMonth() + 1],
              selectedYears && selectedYears.length > 0 ? selectedYears : [selectedYear || new Date().getFullYear()]
            );
        
        setTotalSalesAllSites(totalSalesData?.totalSales || 0);
        
        console.log('✅ [Index] Total sales across all sites received:', {
          totalSales: totalSalesData?.totalSales,
          getAllData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ [Index] Error fetching total sales:', error);
        setTotalSalesAllSites(0);
      }
    };

    fetchTotalSales();
  }, [filtersApplied, selectedMonths, selectedYears, selectedMonth, selectedYear]);

  // Format number helpers
  const formatVolume = (liters) => {
    if (!liters) return "0 L";
    if (liters >= 1000000) return `${(liters / 1000000).toFixed(1)} M L`;
    if (liters >= 1000) return `${(liters / 1000).toFixed(0)} K L`;
    return `${liters.toFixed(0)} L`;
  };

  const formatCurrency = (amount) => {
    if (!amount) return "£0";
    if (amount >= 1000000) return `£${(amount / 1000000).toFixed(1)} M`;
    if (amount >= 1000) return `£${(amount / 1000).toFixed(1)} k`;
    return `£${amount.toFixed(0)}`;
  };

  const formatNumber = (num) => {
    if (!num) return "0";
    return num.toLocaleString();
  };

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col bg-transparent">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Dashboard */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main 
          style={{ willChange: 'margin-left' }}
          className={`flex flex-1 flex-col min-h-0 min-w-0 w-full max-w-full transition-[margin-left] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} ml-0`}
        >
        <div className="mx-2 mt-2 mb-3 flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:mx-3 sm:mt-3 sm:mb-4 sm:gap-3 lg:mx-5 lg:mt-4 lg:mb-6 lg:gap-3">
        <div className="main-stage-header-card">
        <Header 
          sidebarOpen={sidebarOpen} 
          onToggleSidebar={toggleSidebar} 
          totalSales={totalSalesAllSites}
        />
        </div>
        
        <div className="main-stage-card flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="box-border min-h-0 min-w-0 w-full max-w-full flex-1 px-0 py-3 sm:px-4 sm:py-4 lg:px-8 lg:py-8">
          {/* Page Title */}
          <div className="mb-3 sm:mb-4 lg:mb-6">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Fuel Dashboard Report</h1>
          </div>

          {/* Filter Section */}
          <FilterSection 
            onApplyFilters={handleApplyFilters}
            selectedSite={selectedSite}
            onSiteChange={setSelectedSite}
            filtersApplied={filtersApplied}
          />

          {/* Initial Landing State - Show when filters not applied */}
          {!filtersApplied && (
            <InitialLandingState 
              onApplyFilters={handleApplyFilters}
              dashboardVisible={true}
            />
          )}

          {/* Main Dashboard - Show when filters applied */}
          {filtersApplied && selectedSite && (
            <>
          {/* Site Map - Show map for selected site */}
          <CityMap selectedSite={selectedSite} />

          {/* Primary Metrics Grid - Row 1 */}
          {loadingMetrics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-3 sm:mb-4 lg:mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="chart-card animate-pulse h-28 sm:h-32" />
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-3 sm:mb-4 lg:mb-6">
              <MetricCard
                title="Total Fuel Volume"
                value={metrics.totalFuelVolume
                  ? formatVolume(metrics.totalFuelVolume)
                  : (metrics.fuelSales != null ? formatCurrency(metrics.fuelSales) : formatVolume(0))}
                rawValue={metrics.totalFuelVolume ?? metrics.fuelSales ?? 0}
                subtitle={metrics.totalFuelVolume
                  ? "Litres Sold"
                  : (metrics.fuelSales != null ? "Volume not in Sage – showing fuel sales" : "Litres Sold")}
                icon={Fuel}
                iconBg="blue"
                delay={0}
                chartType="bar"
                chartData={[]} // Chart data would come from daily/monthly breakdown
                onClick={() => setFuelVolumeModalOpen(true)}
              />
              <MetricCard
                title="Net Sales (Pounds)"
                value={formatCurrency(metrics.netSales)}
                rawValue={metrics.netSales}
                subtitle="Revenue generated"
                icon={IndianRupee}
                iconBg="green"
                delay={50}
                chartType="line"
                chartData={[]} // Chart data would come from daily/monthly breakdown
                onClick={() => setNetSalesModalOpen(true)}
              />
              <MetricCard
                title="Profit (pounds)"
                value={formatCurrency(metrics.profit)}
                rawValue={metrics.profit}
                subtitle="Total Earnings"
                icon={TrendingUp}
                iconBg="purple"
                delay={100}
                chartType="line"
                chartData={[]} // Chart data would come from daily/monthly breakdown
                onClick={() => setProfitModalOpen(true)}
              />
              <MetricCard
                title="Gross PPL"
                value={`${metrics.avgPPL?.toFixed(2) || '0.00'} p`}
                rawValue={metrics.avgPPL}
                subtitle="Per litre before O/H"
                icon={BarChart}
                iconBg="orange"
                delay={150}
                chartType="bar"
                chartData={[]} // Chart data would come from daily/monthly breakdown
              />
            </div>
          ) : null}

          {/* Secondary Metrics Grid - Row 2 */}
          {metrics ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-3 sm:mb-4 lg:mb-6">
              <MetricCard
                title="PPL after O/H"
                value={`${metrics.actualPPL != null ? Number(metrics.actualPPL).toFixed(2) : '0.00'} p`}
                rawValue={metrics.actualPPL}
                subtitle="Per litre after overheads"
                icon={Percent}
                iconBg="yellow"
                delay={200}
                chartType="bar"
                chartData={[]}
              />
              <MetricCard
                title="Labour cost as % of fuel sales"
                value={`${metrics.labourCostPercent?.toFixed(1) ?? '0'}%`}
                rawValue={metrics.labourCostPercent}
                subtitle="Labour cost ÷ fuel sales"
                icon={ShoppingCart}
                iconBg="pink"
                delay={250}
                chartType="line"
                chartData={[]}
              />
              <MetricCard
                title="Basket Size"
                value={formatCurrency(metrics.basketSize)}
                rawValue={metrics.basketSize}
                subtitle="Not in Sage – shop not managed"
                icon={ShoppingBag}
                iconBg="yellow"
                delay={300}
                chartType="bar"
                chartData={[]}
              />
              <MetricCard
                title="Customer Count"
                value={formatNumber(metrics.customerCount)}
                rawValue={metrics.customerCount}
                subtitle="Not in Sage"
                icon={Users}
                iconBg="purple"
                delay={350}
                chartType="line"
                chartData={[]}
              />
            </div>
          ) : null}

          {/* Status Cards Row */}
          {statusData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-3 sm:mb-4 lg:mb-6">
              <StatusCard 
                title="Bank Closing Balance" 
                value={formatCurrency(statusData.bankClosingBalance)} 
                delay={400}
              />
              <StatusCard 
                title="Debtors (Total)" 
                value={formatCurrency(statusData.debtorsTotal)} 
                delay={425}
              />
              <StatusCard 
                title="Fuel Creditors" 
                value={formatCurrency(statusData.fuelCreditors)} 
                delay={450}
              />
              <StatusCard 
                title="Fuel Condition" 
                value={statusData.fuelCondition || "Normal"} 
                status="normal"
                delay={475}
              />
              <StatusCard 
                title="Discounts (Total /)" 
                value={formatCurrency(statusData.discountsTotal)} 
                delay={500}
              />
            </div>
          ) : null}

          {/* Quick Insights */}
          <QuickInsights />

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
            <div className="lg:col-span-2">
              <MonthlyPerformanceChart 
                siteId={selectedSite} 
                month={selectedMonth}
                months={selectedMonths.length > 0 ? selectedMonths : [selectedMonth]} 
                year={selectedYear}
                years={selectedYears.length > 0 ? selectedYears : [selectedYear]} 
              />
            </div>
            <OverallSalesPieChart 
              siteId={selectedSite} 
              month={selectedMonth}
              months={selectedMonths.length > 0 ? selectedMonths : [selectedMonth]} 
              year={selectedYear}
              years={selectedYears.length > 0 ? selectedYears : [selectedYear]} 
            />
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
            <BunkeredSalesChart 
              siteId={selectedSite} 
              month={selectedMonth}
              months={selectedMonths.length > 0 ? selectedMonths : [selectedMonth]} 
              year={selectedYear}
              years={selectedYears.length > 0 ? selectedYears : [selectedYear]} 
            />
            <PPIChart 
              siteId={selectedSite} 
              month={selectedMonth}
              months={selectedMonths.length > 0 ? selectedMonths : [selectedMonth]} 
              year={selectedYear}
              years={selectedYears.length > 0 ? selectedYears : [selectedYear]} 
            />
          </div>

          {/* Date-wise Chart */}
          <DateWiseChart 
            siteId={selectedSite}
            selectedMonths={selectedMonths.length > 0 ? selectedMonths : (selectedMonth ? [selectedMonth] : [])}
            years={selectedYears.length > 0 ? selectedYears : [selectedYear]}
          />

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
            <TopPerformingSitesTable 
              siteId={selectedSite} 
              month={selectedMonth}
              months={selectedMonths.length > 0 ? selectedMonths : [selectedMonth]} 
              year={selectedYear}
              years={selectedYears.length > 0 ? selectedYears : [selectedYear]} 
            />
            <MarketingInitiativesTable 
              siteId={selectedSite} 
              month={selectedMonth}
              months={selectedMonths.length > 0 ? selectedMonths : [selectedMonth]} 
              year={selectedYear}
              years={selectedYears.length > 0 ? selectedYears : [selectedYear]} 
            />
          </div>

          {/* Sales Distribution Chart */}
          <SalesDistributionChart 
            siteId={selectedSite} 
            month={selectedMonth}
            months={selectedMonths.length > 0 ? selectedMonths : [selectedMonth]} 
            year={selectedYear}
            years={selectedYears.length > 0 ? selectedYears : [selectedYear]} 
          />
            </>
          )}

          {/* Card Detail Modals */}
          <CardDetailModal
            open={fuelVolumeModalOpen}
            onOpenChange={setFuelVolumeModalOpen}
            title="Total Fuel Volume Breakdown"
          >
            {metrics ? (
              <>
                <DetailItem 
                  label="Total Fuel Volume" 
                  value={metrics.totalFuelVolume
                    ? formatVolume(metrics.totalFuelVolume)
                    : (metrics.fuelSales != null ? formatCurrency(metrics.fuelSales) : formatVolume(0))} 
                  subValue={metrics.totalFuelVolume
                    ? "All fuel sold"
                    : (metrics.fuelSales != null ? "Volume not in Sage – showing fuel sales" : "All fuel sold")}
                />
                <DetailItem 
                  label="Bunkered Volume" 
                  value={formatVolume(metrics.bunkeredVolume || 0)} 
                  subValue="From storage tanks"
                />
                <DetailItem 
                  label="Non-Bunkered Volume" 
                  value={formatVolume(metrics.nonBunkeredVolume || 0)} 
                  subValue="Direct delivery"
                />
              </>
            ) : (
              <DetailItem label="Loading..." value="Please wait" />
            )}
          </CardDetailModal>

          <CardDetailModal
            open={netSalesModalOpen}
            onOpenChange={setNetSalesModalOpen}
            title="Net Sales Breakdown"
          >
            {metrics ? (
              <>
                <DetailItem 
                  label="Total Fuel Sales" 
                  value={formatCurrency(
                    (Array.isArray(salesDistribution) && salesDistribution.find(d => d.name === 'Fuel Sales')?.value != null)
                      ? salesDistribution.find(d => d.name === 'Fuel Sales').value
                      : (metrics.fuelSales != null ? metrics.fuelSales : (metrics.bunkeredSales || 0) + (metrics.nonBunkeredSales || 0))
                  )} 
                  subValue={metrics.fuelSales != null ? 'Fuel sales (nominal 4000–4008)' : `Bunkered: ${formatCurrency(metrics.bunkeredSales || 0)} + Non-Bunkered: ${formatCurrency(metrics.nonBunkeredSales || 0)}`}
                />
                <DetailItem 
                  label="Shop Sales" 
                  value={formatCurrency(
                    (Array.isArray(salesDistribution) && salesDistribution.find(d => d.name === 'Shop Sales')?.value != null)
                      ? salesDistribution.find(d => d.name === 'Shop Sales').value
                      : (metrics.shopSales || 0)
                  )} 
                />
                <DetailItem 
                  label={COFFEE_VALET_REVENUE_LABEL}
                  value={formatCurrency(
                    (Array.isArray(salesDistribution) && salesDistribution.find(d => matchesCoffeeValetRevenueName(d.name))?.value != null)
                      ? salesDistribution.find(d => matchesCoffeeValetRevenueName(d.name)).value
                      : (metrics.valetSales || 0)
                  )} 
                />
                <DetailItem 
                  label="Net Sales (Total)" 
                  value={formatCurrency(metrics.netSales || 0)} 
                  subValue="Sum of all sales"
                />
              </>
            ) : (
              <DetailItem label="Loading..." value="Please wait" />
            )}
          </CardDetailModal>

          <CardDetailModal
            open={profitModalOpen}
            onOpenChange={setProfitModalOpen}
            title="Profit Breakdown"
          >
            {metrics ? (
              <>
                <DetailItem 
                  label="Total Profit" 
                  value={formatCurrency(metrics.profit || 0)} 
                  subValue="Sum of all profits"
                />
                <DetailItem 
                  label="Fuel Profit" 
                  value={formatCurrency(metrics.fuelProfit || 0)} 
                  subValue={`Sales: ${formatCurrency((metrics.bunkeredSales || 0) + (metrics.nonBunkeredSales || 0))} - Purchases: ${formatCurrency((metrics.bunkeredPurchases || 0) + (metrics.nonBunkeredPurchases || 0))}`}
                />
                <DetailItem 
                  label="Shop Profit" 
                  value={formatCurrency(metrics.shopProfit || 0)} 
                  subValue={`Sales: ${formatCurrency(metrics.shopSales || 0)} - Purchases: ${formatCurrency(metrics.shopPurchases || 0)}`}
                />
                <DetailItem 
                  label={COFFEE_VALET_PROFIT_LABEL}
                  value={formatCurrency(metrics.valetProfit || 0)} 
                  subValue={`Sales: ${formatCurrency(metrics.valetSales || 0)} - Purchases: ${formatCurrency(metrics.valetPurchases || 0)}`}
                />
                <DetailItem 
                  label="Overheads" 
                  value={formatCurrency(metrics.overheads || 0)} 
                  subValue="Operating costs"
                />
                <DetailItem 
                  label="Labour Cost" 
                  value={formatCurrency(metrics.labourCost || 0)} 
                  subValue={`${metrics.labourCostPercent?.toFixed(1) || 0}% of shop sales`}
                />
              </>
            ) : (
              <DetailItem label="Loading..." value="Please wait" />
            )}
          </CardDetailModal>
        </div>
        </div>
        </div>
      </main>
      </div>
    </div>
  );
};

export default Index;
