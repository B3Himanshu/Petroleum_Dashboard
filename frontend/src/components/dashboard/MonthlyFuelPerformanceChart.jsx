import { useState, useEffect, memo, useRef } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { dashboardAPI } from "@/services/api";
import { useIsSmUp } from "@/hooks/use-mobile";
import {
  dashTickPrimary,
  dashTickSecondary,
  dashAxisLabel,
  dashTooltipTitlePx,
  dashTooltipBodyPx,
  dashLegendFontPx,
  dashLegendIconSize,
  dashLegendItemClass,
  dashCartesianGridProps,
  formatMonthAxisTick,
  dashXAxisIntervalDenseMonths,
  dashXAxisTickSizePrimary,
} from "@/lib/dashboardChartTypography";

const COLORS = {
  fuelRevenue: "hsl(var(--chart-blue))",
  saleVolume: "#14b8a6",
  marginPct: "#f97316",
};

const MonthlyFuelPerformanceChartComponent = ({
  startDate,
  endDate,
  siteIds,
  showInMillions = true,
}) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTooltipLabel, setActiveTooltipLabel] = useState(null);
  const rotateRootRef = useRef(null);
  const smUp = useIsSmUp();

  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await dashboardAPI.getPetrolMonthlyTrends(startDate, endDate, siteIds);
        const trends = res?.data ?? res ?? [];

        const merged = trends.map((row) => ({
          ...row,
          avgPPL: row.avgPPL != null ? Number(row.avgPPL) : undefined,
          pplAfterOH: row.pplAfterOH != null ? Number(row.pplAfterOH) : undefined,
          volumeML: row.volumeML != null ? Number(row.volumeML) : (Number(row.volume || 0) / 1e6 || 0),
        }));

        merged.sort((a, b) => {
          const y1 = a.year != null ? Number(a.year) : 0;
          const y2 = b.year != null ? Number(b.year) : 0;
          if (y1 !== y2) return y1 - y2;
          const m1 = a.month != null ? Number(a.month) : 0;
          const m2 = b.month != null ? Number(b.month) : 0;
          return m1 - m2;
        });

        setChartData(merged);
      } catch (error) {
        console.error("❌ [MonthlyFuelPerformanceChart] Error fetching data:", error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, siteIds]);

  /** Always fuel-only: fuel revenue, fuel volume (ML), fuel margin % (no shop / valet split). */
  const displayData = chartData.map((item) => {
    const fuelSalesAbs = Math.abs(Number(item.fuelSales ?? 0));
    const fuelProfitAbs = Math.abs(Number(item.fuelProfit ?? item.fuel_profit ?? 0));
    const volLitres = Number(item.volume ?? item.sale_volume ?? 0);
    let volMl = Number(item.volumeML);
    if (!Number.isFinite(volMl) || volMl <= 0) {
      volMl = volLitres > 0 ? volLitres / 1e6 : 0;
    }

    const revenueRaw = fuelSalesAbs;
    const marginPct = fuelSalesAbs > 0 ? (fuelProfitAbs / fuelSalesAbs) * 100 : 0;

    return {
      ...item,
      revenueM: revenueRaw / 1e6,
      volumeML: volMl,
      marginPct,
    };
  });

  const formatM = (v) => {
    const a = Math.abs(v);
    if (a >= 1e6) return `£${(a / 1e6).toFixed(2)}M`;
    if (a >= 1000) return `£${(a / 1000).toFixed(2)}K`;
    return `£${a.toFixed(2)}`;
  };
  const formatExact = (v) => {
    const a = Math.abs(v);
    const fixed = a.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `£${withCommas}.${decPart}`;
  };
  const fmt = showInMillions ? formatM : formatExact;

  const volumeUnitLabel = showInMillions ? "ML" : "KL";

  const formatVolumeDisplay = (litres) => {
    const L = Number(litres) || 0;
    if (!showInMillions) {
      const kl = L / 1000;
      return `${kl.toFixed(2)} KL`;
    }
    const ml = L / 1e6;
    if (ml >= 1 || ml === 0) return `${ml.toFixed(2)} ML`;
    if (L >= 1000) return `${(L / 1000).toFixed(2)} KL`;
    return `${L.toFixed(0)} L`;
  };

  const getTooltipContent = (label) => {
    if (!label) return null;
    const r = chartData.find((d) => d.month_name === label)
      || chartData.find((d) => String(d.month_name).includes(String(label)))
      || {};
    const vol = r.volume ?? r.sale_volume ?? 0;
    const fs = Math.abs(Number(r.fuelSales ?? 0));
    const fp = Math.abs(Number(r.fuelProfit ?? r.fuel_profit ?? 0));
    const revenueLabel = "Fuel Revenue";
    const revenueFmt = fmt(fs);
    const marginPct = fs > 0 ? (fp / fs) * 100 : 0;
    return { label, revenueLabel, revenueFmt, vol, marginPct };
  };

  const TooltipBody = ({ label }) => {
    const d = getTooltipContent(label);
    if (!d) return null;
    const rows = [
      { color: COLORS.fuelRevenue, label: d.revenueLabel, value: d.revenueFmt },
      { color: COLORS.saleVolume, label: "Fuel Sale Volume", value: formatVolumeDisplay(d.vol) },
      { color: COLORS.marginPct, label: "Fuel Margin %", value: `${d.marginPct.toFixed(2)}%` },
    ];
    return (
      <>
        <p
          style={{
            color: "#fff",
            fontWeight: 700,
            fontSize: dashTooltipTitlePx(smUp),
            marginBottom: 8,
            letterSpacing: "0.02em",
          }}
        >
          {d.label}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((row) => (
            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: row.color, flexShrink: 0 }} />
              <span style={{ fontSize: dashTooltipBodyPx(smUp), color: "rgba(255,255,255,0.75)", flexShrink: 0 }}>{row.label}:</span>
              <span style={{ fontSize: dashTooltipBodyPx(smUp), color: row.color, fontWeight: 600, marginLeft: "auto", paddingLeft: 6 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  const CustomTooltip = ({ active, label }) => {
    if (!active || !label) return null;
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
        <TooltipBody label={label} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="chart-card rounded-xl border border-border p-3 min-h-[280px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm sm:text-base">Loading…</p>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-card rounded-xl border border-border p-3 min-h-[280px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm sm:text-base text-center px-2">No data available</p>
      </div>
    );
  }

  const maxRevM = Math.max(...displayData.map((d) => d.revenueM || 0), 0.0001);
  const maxVolM = Math.max(...displayData.map((d) => d.volumeML || 0), 0.0001);
  /** When £M and ML differ by orders of magnitude, split right axes so both bar series read like Shop/Valet. */
  const splitValueAxes =
    maxVolM > 0 && maxRevM > 0 && (maxRevM / maxVolM > 6 || maxVolM / maxRevM > 6);
  const combinedMaxM = Math.max(maxRevM, maxVolM, 0.0001);
  const maxMarginPct = Math.max(...displayData.map((d) => d.marginPct || 0), 10);

  const MARGIN_AXIS_CAP = 15;
  const marginAxisMax = MARGIN_AXIS_CAP;
  const marginTicks = [];
  for (let i = 0; i <= marginAxisMax; i += 5) {
    marginTicks.push(i);
  }

  const rightAxisUnitSuffix = showInMillions ? "M" : "k";

  /** Same tick style as ShopValetMonthlyComboCharts `formatValueAxisTick`. */
  const formatSalesVolumeAxisTick = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    if (n === 0) return "0";
    if (Math.abs(n) >= 1) return `${n.toFixed(1)}${rightAxisUnitSuffix}`;
    if (Math.abs(n) >= 0.001) {
      return showInMillions ? `${n.toFixed(2)}M` : `${Math.round(n * 1000)}k`;
    }
    return showInMillions ? `${n.toFixed(3)}M` : `${(n * 1000).toFixed(1)}k`;
  };

  const valueAxisLabel = showInMillions ? "£M" : "£k";

  const barRevenueName = "Fuel Revenue";

  const fewMonths = displayData.length > 0 && displayData.length <= 3;
  const chartBarSize = smUp ? 28 : 16;
  const chartBarGap = smUp ? 8 : 4;
  const chartBarCategoryGap = smUp ? (fewMonths ? "30%" : "14%") : fewMonths ? "36%" : "16%";
  const xAxisInterval = dashXAxisIntervalDenseMonths(smUp, displayData.length);
  const chartMargin = smUp
    ? { top: 6, right: splitValueAxes ? 36 : 32, left: 48, bottom: 36 }
    : {
        top: 4,
        left: 14,
        right: splitValueAxes ? 22 : 18,
        bottom: 52,
      };
  const marginAxisTickWidth = smUp ? 78 : 46;
  const valueAxisW = smUp ? 76 : 52;
  const tickX = dashXAxisTickSizePrimary(smUp);
  const tickY = dashTickSecondary(smUp);
  const xAngle = smUp ? 0 : -45;
  const xTextAnchor = smUp ? "middle" : "end";
  const xHeight = smUp ? 32 : 52;
  const xMinTickGap = smUp ? 4 : 0;
  const xTickFont = smUp ? tickX : 10;

  const outerCardClass = smUp
    ? "chart-card rounded-xl border border-border p-3 flex flex-col min-h-[340px]"
    : "chart-card rounded-xl border border-border p-2 flex flex-col min-h-[380px] relative";

  return (
    <div className={outerCardClass}>
      {/* Mobile tooltip — sits at top-right of the card, over the header area, never over the bars */}
      {!smUp && activeTooltipLabel && (
        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 99999,
            backgroundColor: "hsl(222, 47%, 11%)",
            border: "1px solid hsl(217, 33%, 20%)",
            borderRadius: 10,
            padding: "8px 12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            minWidth: 160,
            whiteSpace: "nowrap",
          }}
        >
          <TooltipBody label={activeTooltipLabel} />
        </div>
      )}
      <div className="mb-2">
        <h3 className="dash-chart-heading">Fuel</h3>
        <p className="dash-chart-subtitle leading-snug">
          Monthly fuel revenue, sale volume ({volumeUnitLabel}) &amp; margin %. Left: margin % · Right: {valueAxisLabel}
        </p>
      </div>
      <div ref={rotateRootRef} className="flex flex-col flex-1 min-h-0 w-full">
        <div
          data-rotate-fill
          className="w-full overflow-x-hidden flex-1 flex flex-col min-h-0"
        >
          <div
            data-rotate-plot
            className="min-w-0 w-full h-[min(22rem,58dvh)] min-h-[300px] max-h-[380px] sm:h-[300px] sm:min-h-0 sm:max-h-none shrink-0"
          >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={displayData}
              margin={chartMargin}
              barSize={chartBarSize}
              barGap={chartBarGap}
              barCategoryGap={chartBarCategoryGap}
              onMouseMove={(data) => { if (!smUp && data?.activeLabel) setActiveTooltipLabel(data.activeLabel); }}
              onMouseLeave={() => { if (!smUp) setActiveTooltipLabel(null); }}
            >
              <CartesianGrid {...dashCartesianGridProps} />
              <XAxis
                dataKey="month_name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--foreground))", fontSize: xTickFont, fontWeight: 500 }}
                angle={xAngle}
                textAnchor={xTextAnchor}
                height={xHeight}
                interval={xAxisInterval}
                minTickGap={xMinTickGap}
                tickFormatter={formatMonthAxisTick}
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--foreground))", fontSize: smUp ? tickY : 11, fontWeight: 600 }}
                width={marginAxisTickWidth}
                domain={[0, marginAxisMax]}
                ticks={marginTicks}
                allowDecimals={false}
                tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                label={smUp ? {
                  value: "Margin %",
                  angle: -90,
                  position: "left",
                  offset: 6,
                  dx: -6,
                  style: { fill: "hsl(var(--foreground))", fontSize: dashAxisLabel(smUp), fontWeight: 600 },
                } : {
                  value: "Margin %",
                  angle: -90,
                  position: "left",
                  offset: 2,
                  dx: -4,
                  style: { fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 600 },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--foreground))", fontSize: smUp ? tickY : 11, fontWeight: 500 }}
                width={valueAxisW}
                domain={[0, Math.max((splitValueAxes ? maxRevM : combinedMaxM) * 1.12, 0.0001)]}
                tickFormatter={formatSalesVolumeAxisTick}
                label={smUp ? {
                  value: valueAxisLabel,
                  angle: 90,
                  position: "right",
                  offset: 8,
                  dx: 6,
                  style: { fill: "hsl(var(--foreground))", fontSize: dashAxisLabel(smUp), fontWeight: 600 },
                } : {
                  value: valueAxisLabel,
                  angle: 90,
                  position: "right",
                  offset: 4,
                  dx: 6,
                  style: { fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 600 },
                }}
              />
              {splitValueAxes ? (
                <YAxis
                  yAxisId="vol"
                  orientation="right"
                  hide
                  domain={[0, Math.max(maxVolM * 1.12, 0.0001)]}
                />
              ) : null}
              {smUp && (
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  shared
                />
              )}
              {!smUp && <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} content={() => null} />}
              <Legend
                wrapperStyle={{
                  paddingTop: smUp ? "8px" : "6px",
                  fontSize: smUp ? `${dashLegendFontPx(smUp)}px` : "11px",
                  color: "hsl(var(--foreground))",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: smUp ? "0.35rem 0.65rem" : "0.2rem 0.4rem",
                  justifyContent: "center",
                }}
                iconType="circle"
                iconSize={smUp ? dashLegendIconSize(smUp) : 9}
                formatter={(value) => (
                  <span style={{ fontSize: smUp ? undefined : "11px", color: "hsl(var(--foreground))", fontWeight: 500 }}>{value}</span>
                )}
              />
              <Bar
                yAxisId="right"
                dataKey="revenueM"
                fill={COLORS.fuelRevenue}
                name={barRevenueName}
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={550}
              />
              <Bar
                yAxisId={splitValueAxes ? "vol" : "right"}
                dataKey="volumeML"
                fill={COLORS.saleVolume}
                name={`Fuel Sale Volume (${volumeUnitLabel})`}
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={550}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="marginPct"
                stroke={COLORS.marginPct}
                strokeWidth={smUp ? 2 : 2}
                dot={{
                  r: smUp ? 3 : 3,
                  fill: COLORS.marginPct,
                  strokeWidth: 1,
                  stroke: "hsl(var(--card))",
                }}
                activeDot={{ r: smUp ? 5 : 4, stroke: "hsl(var(--card))", strokeWidth: 1 }}
                name="Fuel Margin %"
                isAnimationActive
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MonthlyFuelPerformanceChart = memo(MonthlyFuelPerformanceChartComponent);
