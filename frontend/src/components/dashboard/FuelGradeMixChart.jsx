import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { TrendingUp } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

ChartJS.register(ArcElement, Tooltip, Legend);

/** Distinct, light-background-friendly colors; 4th is a lighter blue so small slices stay visible vs dark tooltip swatch */
const CHART_COLORS = ["#f59e0b", "#10b981", "#8b5cf6", "#38bdf8", "#06b6d4", "#f97316"];
function getColorForGrade(name, index) {
  const colorMap = {
    'Unleaded': CHART_COLORS[0],
    'Diesel': CHART_COLORS[1],
    'Super Unleaded': CHART_COLORS[2],
    'Super Diesel': CHART_COLORS[3],
    'Adblue': CHART_COLORS[4],
    'AdBlue': CHART_COLORS[4],
    'Charges': '#ef4444',
    'Shop': '#ec4899',
    'Coffee & Valet': '#6366f1',
    'Petrol Unleaded': CHART_COLORS[0],
    'Diesel Unleaded': CHART_COLORS[1],
    'Petrol Super Unleaded': CHART_COLORS[2],
    'Diesel Super Unleaded': CHART_COLORS[3],
    'Petrol': CHART_COLORS[0],
    'Ultimate Petrol': CHART_COLORS[2],
    'Ultimate Diesel': CHART_COLORS[3],
  };
  const key = (name || '').trim();
  return colorMap[key] || CHART_COLORS[index % CHART_COLORS.length];
}

/** Fixed-height overlay so hover never shifts layout; visibility toggled without collapsing height. */
function TooltipBanner({ info }) {
  const hasContent = Boolean(info?.title);
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1 z-10 w-[min(100%,260px)] -translate-x-1/2"
      style={{ minHeight: 72 }}
    >
      <div
        className="rounded-lg border px-3 py-2 shadow-lg transition-opacity duration-150 ease-out"
        style={{
          opacity: hasContent ? 1 : 0,
          visibility: hasContent ? "visible" : "hidden",
          backgroundColor: "hsl(222, 47%, 11%)",
          borderColor: "hsl(217, 33%, 17%)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white/95 ring-offset-0"
            style={{
              backgroundColor: info?.color || "transparent",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.35)",
            }}
          />
          <span className="truncate text-[13px] font-bold text-white">{info?.title || "\u00a0"}</span>
        </div>
        {(info?.lines || []).map((line, i) => (
          <div key={i} className="pl-[18px] text-[11px] text-white/65">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

const GradeMixColumn = memo(function GradeMixColumn({
  heading,
  footnote,
  displayData,
  total,
  centerLabel,
  formatValue,
  valueLabel,
  emptyState,
}) {
  const [tooltipInfo, setTooltipInfo] = useState(null);
  const lastExternalRef = useRef({ index: -1, open: false });

  const chartData = useMemo(
    () => {
      // Enforce minimum visual slice size so tiny categories (e.g. 0.3%) remain visible.
      // Legend below still shows real values/percentages.
      const rawTotal = displayData.reduce((s, item) => s + Math.abs(item.value), 0);
      const minSlice = rawTotal > 0 ? rawTotal * 0.015 : 0; // each slice ≥ 1.5% of pie visually
      return {
        labels: displayData.map((item) => item.name),
        datasets: [
          {
            label: heading,
            data: displayData.map((item) => Math.max(Math.abs(item.value), minSlice)),
            backgroundColor: displayData.map((item) => item.color),
            /** Thin separation: wide borders + spacing made tiny % slices look like invisible lines */
            borderColor: "hsl(var(--card))",
            borderWidth: 2,
            borderRadius: 4,
            spacing: 1,
            cutout: "60%",
          },
        ],
      };
    },
    [displayData, heading]
  );

  const externalTooltipHandler = useCallback(
    (context) => {
      const { tooltip } = context;
      if (tooltip.opacity === 0) {
        if (lastExternalRef.current.open) {
          lastExternalRef.current = { index: -1, open: false };
          setTooltipInfo(null);
        }
        return;
      }
      const idx = tooltip.dataPoints?.[0]?.dataIndex ?? -1;
      const item = displayData[idx];
      if (!item) return;
      if (lastExternalRef.current.open && lastExternalRef.current.index === idx) {
        return;
      }
      lastExternalRef.current = { index: idx, open: true };
      const title = tooltip.title?.[0] || item.name;
      const color = tooltip.labelColors?.[0]?.backgroundColor || item.color || "#ccc";
      const displayValue = item.signedValue ?? item.value;
      const pctValue = Number(item.percentage ?? 0);
      const signedPctText = displayValue < 0 ? `−${pctValue}%` : `${pctValue}%`;
      const pctLine =
        heading === "Profit"
          ? `${signedPctText} of total gross profit`
          : `${pctValue}% of total fuel volume`;
      const valueText = displayValue < 0 ? `−${formatValue(Math.abs(displayValue))}` : formatValue(displayValue);
      const lines = [`${valueLabel}: ${valueText}`, pctLine];
      setTooltipInfo({ title, lines, color });
    },
    [displayData, formatValue, valueLabel, heading]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: true },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false,
          external: externalTooltipHandler,
        },
      },
      animation: {
        animateRotate: true,
        animateScale: false,
        duration: 400,
      },
      elements: {
        arc: {
          hoverBorderWidth: 2,
          hoverOffset: 4,
        },
      },
    }),
    [externalTooltipHandler]
  );

  if (emptyState) {
    return (
      <div className="flex flex-col min-h-[200px]">
        <h3 className="text-sm font-semibold text-foreground mb-1">{heading}</h3>
        {footnote ? <p className="text-[10px] text-muted-foreground mb-2">{footnote}</p> : null}
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 rounded-lg border border-dashed border-border py-8 px-2">
          {emptyState}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 min-w-0">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
        {footnote ? <p className="text-[10px] text-muted-foreground mt-0.5">{footnote}</p> : null}
      </div>
      <div className="w-full flex items-center justify-center">
        <div className="relative mx-auto h-[min(220px,55vw)] w-full max-w-[280px]">
          <TooltipBanner info={tooltipInfo} />
          <div className="absolute inset-0">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="px-2 text-center text-[10px] font-semibold text-muted-foreground sm:text-xs">
              {centerLabel}
            </span>
            <span className="text-base font-bold text-foreground sm:text-lg">{formatValue(total)}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] gap-x-2 pb-1 mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border/80">
          <span>Name</span>
          <span className="text-right">Value</span>
          <span className="text-right">%</span>
        </div>
        {displayData.map((item) => {
          const signedValue = Number(item.signedValue ?? item.value ?? 0);
          const isNegative = signedValue < 0;
          return (
          <div key={item.name} className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] gap-x-2 items-center text-xs sm:text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className={`tabular-nums font-medium text-right shrink-0 ${isNegative ? 'text-destructive' : ''}`}>
              {isNegative ? `−${formatValue(Math.abs(signedValue))}` : formatValue(signedValue)}
            </span>
            <span className={`tabular-nums font-semibold text-right ${isNegative ? 'text-destructive' : 'text-foreground'}`}>
              {isNegative ? `−${item.percentage}%` : `${item.percentage}%`}
            </span>
          </div>
          );
        })}
        <div className="flex justify-between items-center border-t pt-2 mt-2 font-bold text-xs sm:text-sm">
          <span>Total</span>
          <span className="tabular-nums">{formatValue(total)}</span>
        </div>
      </div>
    </div>
  );
});

export const FuelGradeMixChart = ({ startDate, endDate, siteIds, shopProfit = 0, valetProfit = 0, showInMillions = true }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [volumeData, setVolumeData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [totalVolumeL, setTotalVolumeL] = useState(0);
  const [totalSalesValue, setTotalSalesValue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(null);
  const [profitBreakdownRows, setProfitBreakdownRows] = useState([]);

  useEffect(() => {
    if (!startDate || !endDate) {
      setVolumeData([]);
      setSalesData([]);
      setTotalVolumeL(0);
      setTotalSalesValue(0);
      setTotalProfit(null);
      setProfitBreakdownRows([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [transitionRes, gradeRes, profitRes, profitBreakdownRes] = await Promise.all([
          dashboardAPI.getPetrolFuelVolumeTransitionBreakdown(startDate, endDate, siteIds),
          dashboardAPI.getPetrolFuelGradeBreakdown(startDate, endDate, siteIds),
          dashboardAPI.getPetrolProfit(startDate, endDate, siteIds),
          dashboardAPI.getPetrolProfitBreakdown(startDate, endDate, siteIds),
        ]);

        const transitionData = transitionRes?.data ?? transitionRes ?? {};
        const gradeData = gradeRes?.data ?? gradeRes ?? {};
        const byNominalCode = transitionData.byNominalCode || [];
        const totalVolL = Number(transitionData.totalVolume) || 0;
        setTotalVolumeL(totalVolL);

        const gradeBreakdown = gradeData.breakdown || [];
        const totalSales = Math.abs(Number(gradeData.totalVolume) || 0);
        setTotalSalesValue(totalSales);

        const rawProfit = Number(profitRes?.totalProfit ?? profitRes?.data?.totalProfit ?? 0) || 0;
        setTotalProfit(-rawProfit);

        // Store per-code amounts for category-wise profit calculation
        const pbData = profitBreakdownRes?.data ?? profitBreakdownRes ?? {};
        setProfitBreakdownRows(pbData.otherIncomeBreakdown || []);

        const volData = byNominalCode.length > 0
          ? byNominalCode.map((item, idx) => {
              const volL = Math.abs(Number(item.volume) || 0);
              const pct = totalVolL > 0 ? parseFloat(((volL / totalVolL) * 100).toFixed(1)) : 0;
              return {
                name: item.name || item.code,
                value: volL,
                percentage: pct,
                color: getColorForGrade(item.name || item.code, idx),
              };
            })
          : [];
        setVolumeData(volData);

        const salesDataArr = gradeBreakdown.map((item, idx) => {
          const sales = Math.abs(parseFloat(item.volume) || 0);
          const pct = totalSales > 0 ? parseFloat(((sales / totalSales) * 100).toFixed(1)) : 0;
          return {
            name: item.name,
            value: sales,
            percentage: pct,
            color: getColorForGrade(item.name, idx),
          };
        });
        setSalesData(salesDataArr);
      } catch (err) {
        console.error('❌ [FuelGradeMixChart] Error fetching data:', err);
        setError(err.message);
        setVolumeData([]);
        setSalesData([]);
        setTotalVolumeL(0);
        setTotalSalesValue(0);
        setTotalProfit(null);
        setProfitBreakdownRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, siteIds]);

  const fallbackProfitTotal = totalProfit ?? 0;
  const hasVolume = volumeData.length > 0 && totalVolumeL > 0;

  const volumeDisplayData = useMemo(
    () => (hasVolume ? volumeData : []),
    [hasVolume, volumeData]
  );

  // Category-wise fuel profit: Sales − (Purchases + Stock Movements)
  const profitDisplayData = useMemo(() => {
    const amt = (code) => {
      const row = profitBreakdownRows.find((x) => String(x.code) === String(code));
      return Number(row?.amount ?? 0);
    };
    const categories = [
      { label: 'Unleaded', codes: { rev: ['4000'], cost: ['5000', '5046'] } },
      { label: 'Diesel', codes: { rev: ['4001', '4101'], cost: ['5001', '5047', '4100', '4102', '5005', '5041'] } },
      { label: 'Super Unleaded', codes: { rev: ['4002'], cost: ['5002', '5048'] } },
      { label: 'Super Diesel', codes: { rev: ['4003'], cost: ['5003', '5049'] } },
      { label: 'Adblue', codes: { rev: ['4004'], cost: ['5004', '5050'] } },
    ];
    // If breakdown data not available, fall back to proportional allocation
    if (profitBreakdownRows.length === 0) {
      if (!(totalSalesValue > 0 && salesData.length > 0)) return [];
      return salesData.map((item) => {
        const val = (item.value / totalSalesValue) * fallbackProfitTotal;
        const pct = totalSalesValue > 0 ? parseFloat(((item.value / totalSalesValue) * 100).toFixed(1)) : 0;
        return { ...item, value: val, percentage: pct };
      });
    }
    // Compute raw profit per category
    // DB convention: revenue = negative, cost = positive. Sum gives negative = profit.
    const allCats = categories.map((cat, idx) => {
      const rawProfit = [...cat.codes.rev, ...cat.codes.cost].reduce((s, c) => s + amt(c), 0);
      // profit = abs(rawProfit) when rawProfit < 0 (profitable); negative profit when rawProfit > 0 (net cost like Charges)
      const profit = -rawProfit; // flip: positive = profit, negative = cost
      return { name: cat.label, profit, color: getColorForGrade(cat.label, idx) };
    });
    // Slices: absolute value for pie geometry. % calculated against NET total
    // (positives - charges + shop + valet), so positive% + negative charges% = 100%.
    const slices = allCats
      .filter((c) => Math.abs(c.profit) > 0.01)
      .map((c) => ({ name: c.name, value: Math.abs(c.profit), signedValue: c.profit, percentage: 0, color: c.color }));
    if (shopProfit > 0.01) slices.push({ name: 'Shop', value: shopProfit, signedValue: shopProfit, percentage: 0, color: getColorForGrade('Shop', 6) });
    if (valetProfit > 0.01) slices.push({ name: 'Coffee & Valet', value: valetProfit, signedValue: valetProfit, percentage: 0, color: getColorForGrade('Coffee & Valet', 7) });
    // Net total = positives − Charges + shop + valet (matches Gross Profit Breakdown total)
    const netTotal = allCats.reduce((s, c) => s + c.profit, 0) + shopProfit + valetProfit;
    return slices.map((item) => ({
      ...item,
      percentage: netTotal > 0 ? parseFloat(((item.value / netTotal) * 100).toFixed(1)) : 0,
    }));
  }, [profitBreakdownRows, salesData, totalSalesValue, fallbackProfitTotal, shopProfit, valetProfit]);

  // Total gross profit = net fuel profit + shop + valet — matches Gross Profit Breakdown total
  const profitTotal = useMemo(() => {
    if (profitBreakdownRows.length > 0) {
      const amt = (code) => {
        const row = profitBreakdownRows.find((x) => String(x.code) === String(code));
        return Number(row?.amount ?? 0);
      };
      const allCodes = ['4000','4001','4101','4002','4003','4004','4100','4102','5000','5001','5002','5003','5004','5005','5041','5046','5047','5048','5049','5050'];
      const netFuel = Math.abs(allCodes.reduce((s, c) => s + amt(c), 0));
      return netFuel + shopProfit + valetProfit;
    }
    return fallbackProfitTotal + shopProfit + valetProfit;
  }, [profitBreakdownRows, profitDisplayData, fallbackProfitTotal, shopProfit, valetProfit]);

  const formatVolume = useCallback((L) => {
    const n = Math.abs(Number(L) ?? 0);
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)} ML`;
    if (n >= 1000) return `${(n / 1000).toFixed(2)} KL`;
    return `${n.toFixed(2)} L`;
  }, []);
  const formatCurrency = useCallback((v) => {
    const n = Math.abs(Number(v) ?? 0);
    if (showInMillions) {
      if (n >= 1e6) return `£${(n / 1e6).toFixed(2)}M`;
      if (n >= 1000) return `£${(n / 1000).toFixed(2)}K`;
      return `£${n.toFixed(2)}`;
    }
    // Exact mode: full value with commas and 2 decimals
    const parts = n.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `£${parts.join('.')}`;
  }, [showInMillions]);

  const hasProfitChart = profitDisplayData.length > 0;
  const hasAnyChart = volumeDisplayData.length > 0 || hasProfitChart;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Fuel Grade Mix (%)
        </CardTitle>
        <CardDescription>
          Volume and profit by fuel grade shown side by side. Profit is allocated by sales-value share (not separate Sage lines per grade).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-destructive text-sm">
            <p>{error}</p>
          </div>
        ) : hasAnyChart ? (
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-0">
            <div className="min-w-0 md:pr-6 lg:pr-8">
              <GradeMixColumn
                heading="Volume"
                footnote="% of total fuel volume."
                displayData={volumeDisplayData}
                total={totalVolumeL}
                centerLabel="Total (volume)"
                formatValue={formatVolume}
                valueLabel="Volume"
                emptyState={
                  !hasVolume ? (
                    <>
                      <p className="text-sm font-medium">N/A</p>
                      <p className="text-xs text-center">Volume data not available for this period</p>
                    </>
                  ) : null
                }
              />
            </div>
            <div className="min-w-0 border-t border-border pt-8 mt-8 md:mt-0 md:border-t-0 md:pt-0 md:border-l md:border-border md:pl-6 lg:pl-8">
              <GradeMixColumn
                heading="Profit"
                footnote="Exact profit per category: Sales − (Purchases + Stock Movements). Includes Shop & Coffee & Valet. % = share of total gross profit."
                displayData={profitDisplayData}
                total={profitTotal}
                centerLabel="Gross Profit"
                formatValue={formatCurrency}
                valueLabel="Profit"
                emptyState={!hasProfitChart ? <p className="text-sm">No profit breakdown</p> : null}
              />
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
