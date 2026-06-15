import { useState, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { TrendingUp } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { revenueMixFromNetSalesBreakdown } from "@/lib/petrolDashboardMetrics";
import {
  COFFEE_VALET_REVENUE_LABEL,
  LEGACY_VALET_REVENUE_LABEL,
} from "@/constants/revenueLabels";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

/** Tooltip anchor at bottom-center of plot + yAlign:top opens the box downward into layout padding (avoids hole labels). */
Tooltip.positioners.salesMixBelowPlot = function salesMixBelowPlot(items) {
  if (!items.length) return false;
  const chart = items[0].element.$context.chart;
  const { chartArea } = chart;
  return {
    x: (chartArea.left + chartArea.right) / 2,
    y: chartArea.bottom,
  };
};

/** Space left under the arc so the canvas tooltip can render without covering the hole labels.
 *  Reduced on mobile (48px) since the tooltip is smaller and screen space is tight. */
const CHART_TOOLTIP_RESERVE_DESKTOP = 68;
const CHART_TOOLTIP_RESERVE_MOBILE = 44;

/** Hex colors — Chart.js canvas does not resolve `hsl(var(--…))`; avoids “black ring” from invalid fill. */
const VALET_SLICE_COLOR = "#8b5cf6";
const colorMap = {
  "Fuel Sales": "#4f6df5",
  "Shop Sales": "#f59e0b",
  [COFFEE_VALET_REVENUE_LABEL]: VALET_SLICE_COLOR,
  [LEGACY_VALET_REVENUE_LABEL]: VALET_SLICE_COLOR,
};

export const ComparisonPieCharts = ({
  site1Id,
  site2Id,
  site1Name,
  site2Name,
  startDate,
  endDate,
  loading,
  comparisonSite1Data,
  comparisonSite2Data,
}) => {
  const [site1Data, setSite1Data] = useState([]);
  const [site2Data, setSite2Data] = useState([]);
  const [site1FullData, setSite1FullData] = useState([]);
  const [site2FullData, setSite2FullData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tooltipReservePx = isMobile ? CHART_TOOLTIP_RESERVE_MOBILE : CHART_TOOLTIP_RESERVE_DESKTOP;

  useEffect(() => {
    if (!site1Id || !site2Id || !startDate || !endDate) {
      setSite1Data([]);
      setSite2Data([]);
      setSite1FullData([]);
      setSite2FullData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [raw1, raw2] = await Promise.all([
          dashboardAPI.getPetrolNetSalesBreakdown(startDate, endDate, [site1Id]),
          dashboardAPI.getPetrolNetSalesBreakdown(startDate, endDate, [site2Id]),
        ]);
        const data1 = revenueMixFromNetSalesBreakdown(raw1);
        const data2 = revenueMixFromNetSalesBreakdown(raw2);

        // Transform data for charts - show all segments with minimum visual representation
        const transformData = (data) => {
          const num = (v) => Number(v) || 0;
          const total = (Array.isArray(data) ? data : []).reduce((sum, item) => sum + num(item?.value ?? item?.amount ?? 0), 0);
          
          // Process all data - give 0% values a minimum visual representation
          const allData = (Array.isArray(data) ? data : []).map((item) => {
            const value = num(item?.value ?? item?.amount ?? 0);
            const percentage = total > 0 ? (value / total) * 100 : 0;
            // For 0% or very small values, assign a minimum visual value (0.5% of total)
            const displayValue = value > 0.01 ? value : total * 0.005;
            
            return {
              name: item.name,
              value,
              displayValue,
              color: colorMap[item.name] || "#64748b",
              percentage,
              isZero: value <= 0.01,
            };
          });
          
          return {
            chartData: allData, // All segments for rendering
            allData: allData,   // Same for legend
            total
          };
        };

        const transformed1 = transformData(data1);
        const transformed2 = transformData(data2);
        
        // Use chartData which now includes all segments with displayValue
        setSite1Data(transformed1.chartData);
        setSite2Data(transformed2.chartData);
        
        // Store full data for legend (same as chartData now)
        setSite1FullData(transformed1.allData);
        setSite2FullData(transformed2.allData);
      } catch (error) {
        console.error('Error fetching sales distribution:', error);
        setSite1Data([]);
        setSite2Data([]);
        setSite1FullData([]);
        setSite2FullData([]);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [site1Id, site2Id, startDate, endDate]);

  // Format total / segment £ for display
  const formatTotal = (value) => {
    const v = Math.abs(Number(value) || 0);
    if (v >= 1000000) {
      return `£${(v / 1000000).toFixed(2)}M`;
    }
    if (v >= 1000) {
      return `£${(v / 1000).toFixed(2)}k`;
    }
    return `£${v.toFixed(2)}`;
  };

  const formatSegmentExact = (value) => {
    const v = Math.abs(Number(value) || 0);
    const [i, d] = v.toFixed(2).split(".");
    return `£${i.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${d}`;
  };

  const num = (v) => Math.abs(Number(v) || 0);
  const distTotal1 = site1FullData.length > 0
    ? site1FullData.reduce((sum, item) => sum + num(item.value), 0)
    : site1Data.reduce((sum, item) => sum + num(item.value), 0);
  const distTotal2 = site2FullData.length > 0
    ? site2FullData.reduce((sum, item) => sum + num(item.value), 0)
    : site2Data.reduce((sum, item) => sum + num(item.value), 0);
  const netSales1 = num(comparisonSite1Data?.netSales);
  const netSales2 = num(comparisonSite2Data?.netSales);
  const baseTotal1 = netSales1 > 0 ? netSales1 : distTotal1;
  const baseTotal2 = netSales2 > 0 ? netSales2 : distTotal2;

  /** Legend: always show £ + %; % = share of fuel + shop + Coffee & Valet (matches pie slices). */
  const SalesMixLegend = ({ items, mixTotal }) => (
    <div className="w-full mt-2 space-y-2 sm:space-y-3">
      {(items || []).map((item) => {
        const amt = num(item.value);
        const pct = mixTotal > 0 ? (amt / mixTotal) * 100 : 0;
        return (
          <div
            key={item.name}
            className="rounded-lg border border-border/50 bg-muted/15 px-2.5 sm:px-3 py-2 sm:py-2.5 text-left"
          >
            <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
              <span
                className="h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs sm:text-sm font-semibold" style={{ color: item.color }}>
                {item.name}
              </span>
            </div>
            <p className="pl-3.5 sm:pl-4 text-xs sm:text-sm leading-snug break-words">
              <span className="font-semibold tabular-nums text-foreground">
                {formatSegmentExact(item.value)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {pct.toFixed(3)}%
              </span>
            </p>
          </div>
        );
      })}
      {mixTotal > 0 && (
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Amounts: Fuel / Shop / Coffee &amp; Valet · % = share of this mix (sums to 100%)
        </p>
      )}
    </div>
  );

  // Real £ values per segment (Chart.js had zero-sized arcs while animationProgress stayed 0).
  const createChartData = (data, fullData) => {
    return {
      labels: data.map((item) => item.name),
      datasets: [
        {
          label: "Sales",
          data: data.map((item) =>
            item.value > 0.01 ? item.value : Math.max(item.displayValue, 1e-6)
          ),
          backgroundColor: data.map((item) =>
            item.isZero ? `${item.color}99` : item.color
          ),
          borderColor: data.map(() => "rgba(255, 255, 255, 0.92)"),
          borderWidth: 1,
          spacing: 2,
          hoverBorderColor: "#ffffff",
          hoverBorderWidth: 2,
          originalData: fullData,
        },
      ],
    };
  };

  // Chart options factory to access the correct data
  const createChartOptions = (fullData, total) => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    layout: {
      padding: {
        left: 6,
        right: 6,
        top: 4,
        bottom: tooltipReservePx,
      },
    },
    plugins: {
      legend: {
        display: false, // We'll use custom legend
      },
      tooltip: {
        enabled: true,
        position: "salesMixBelowPlot",
        xAlign: "center",
        yAlign: "top",
        caretPadding: 10,
        caretSize: 7,
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        borderColor: "rgba(148, 163, 184, 0.5)",
        borderWidth: 1,
        padding: 14,
        titleColor: "#0f172a",
        bodyColor: "#334155",
        titleFont: { size: 14, weight: "600" },
        bodyFont: { size: 13 },
        displayColors: true,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const index = context.dataIndex;
            const originalItem = fullData[index];
            const actualValue = originalItem?.value || 0;
            const percentage = originalItem?.percentage !== undefined 
              ? originalItem.percentage.toFixed(3) 
              : (total > 0 ? ((actualValue / total) * 100).toFixed(3) : '0.000');
            return [
              `Sales: £${actualValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              `${percentage}% of total`
            ];
          }
        }
      },
    },
    animation: {
      animateRotate: true,
      animateScale: false,
      duration: 600,
    },
  });

  const chart1Data = createChartData(site1Data, site1FullData.length > 0 ? site1FullData : site1Data);
  const chart2Data = createChartData(site2Data, site2FullData.length > 0 ? site2FullData : site2Data);
  const chart1Options = createChartOptions(site1FullData.length > 0 ? site1FullData : site1Data, baseTotal1);
  const chart2Options = createChartOptions(site2FullData.length > 0 ? site2FullData : site2Data, baseTotal2);

  // Early return after all hooks
  if (loading || loadingData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="chart-card min-h-[320px] animate-pulse">
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading chart data...</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Site 1 Pie Chart */}
      <div className="chart-card animate-slide-up overflow-visible pb-4 sm:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-foreground truncate">{site1Name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Sales Distribution</p>
            </div>
          </div>
          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md bg-primary/5 border border-primary/20 shrink-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground mr-1">Total:</span>
            <span className="text-xs sm:text-sm font-bold text-primary">{formatTotal(baseTotal1)}</span>
          </div>
        </div>

        {site1Data.length === 0 ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-stretch gap-2">
            <div className="relative mx-auto w-[min(240px,100%)] max-w-full h-[min(240px,calc(100vw-48px))] shrink-0 sm:h-[min(268px,calc(100vw-48px))] sm:w-[min(240px,100%)]">
              <Doughnut data={chart1Data} options={chart1Options} />
              <div
                className="absolute inset-x-0 top-0 flex flex-col items-center justify-center pointer-events-none z-10 px-2 text-center"
                style={{ bottom: tooltipReservePx }}
              >
                <span className="text-[10px] sm:text-xs font-semibold text-foreground/90">Total Sales</span>
                <span className="text-base sm:text-xl font-bold text-foreground leading-tight">
                  {formatTotal(baseTotal1)}
                </span>
              </div>
            </div>
            <SalesMixLegend
              items={site1FullData.length > 0 ? site1FullData : site1Data}
              mixTotal={distTotal1}
            />
          </div>
        )}
      </div>

      {/* Site 2 Pie Chart */}
      <div className="chart-card animate-slide-up overflow-visible pb-4 sm:pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-bold text-foreground truncate">{site2Name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Sales Distribution</p>
            </div>
          </div>
          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md bg-primary/5 border border-primary/20 shrink-0">
            <span className="text-[10px] sm:text-xs text-muted-foreground mr-1">Total:</span>
            <span className="text-xs sm:text-sm font-bold text-primary">{formatTotal(baseTotal2)}</span>
          </div>
        </div>

        {site2Data.length === 0 ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-stretch gap-2">
            <div className="relative mx-auto w-[min(240px,100%)] max-w-full h-[min(240px,calc(100vw-48px))] shrink-0 sm:h-[min(268px,calc(100vw-48px))] sm:w-[min(240px,100%)]">
              <Doughnut data={chart2Data} options={chart2Options} />
              <div
                className="absolute inset-x-0 top-0 flex flex-col items-center justify-center pointer-events-none z-10 px-2 text-center"
                style={{ bottom: tooltipReservePx }}
              >
                <span className="text-[10px] sm:text-xs font-semibold text-foreground/90">Total Sales</span>
                <span className="text-base sm:text-xl font-bold text-foreground leading-tight">
                  {formatTotal(baseTotal2)}
                </span>
              </div>
            </div>
            <SalesMixLegend
              items={site2FullData.length > 0 ? site2FullData : site2Data}
              mixTotal={distTotal2}
            />
          </div>
        )}
      </div>
    </div>
  );
};
