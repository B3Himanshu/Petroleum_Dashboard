import { useState, useEffect, memo, useMemo, useRef } from "react";
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
import { COFFEE_VALET_REVENUE_LABEL } from "@/constants/revenueLabels";
import {
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

const SHOP_COLORS = {
  sales: "hsl(var(--chart-blue))",
  profit: "#14b8a6",
  margin: "#f97316",
};

const VALET_COLORS = {
  sales: "#8b5cf6",
  profit: "#06b6d4",
  margin: "#f97316",
};

/** Upper bound in same units as `x` (e.g. £M) for clean axis tops: 0.093→0.1, 1.68→2. */
function niceCeilPositive(x) {
  if (!Number.isFinite(x) || x <= 0) return 0.0001;
  const exp = Math.floor(Math.log10(x));
  const f = x / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

function buildDisplayRows(rows, segment) {
  const list = Array.isArray(rows) ? [...rows] : [];
  list.sort((a, b) => {
    const y1 = a.year != null ? Number(a.year) : 0;
    const y2 = b.year != null ? Number(b.year) : 0;
    if (y1 !== y2) return y1 - y2;
    const m1 = a.month != null ? Number(a.month) : 0;
    const m2 = b.month != null ? Number(b.month) : 0;
    return m1 - m2;
  });

  return list.map((row) => {
    const sales =
      segment === "shop"
        ? Math.abs(Number(row.shopSales ?? 0))
        : Math.abs(Number(row.valetSales ?? 0));
    // Signed: a monthly loss should appear as a negative bar / negative margin, not flipped positive.
    const profit =
      segment === "shop"
        ? Number(row.shopProfit ?? 0) || 0
        : Number(row.valetProfit ?? 0) || 0;
    const marginPct = sales > 0 ? (profit / sales) * 100 : 0;
    return {
      month_name: row.month_name,
      salesM: sales / 1e6,
      profitM: profit / 1e6,
      marginPct,
      salesRaw: sales,
      profitRaw: profit,
    };
  });
}

function SegmentComboChart({
  title,
  subtitle,
  data,
  loading,
  showInMillions,
  colors,
  salesLabel,
  profitLabel,
  marginLabel,
  marginAxisCap = 20,
  /**
   * Mobile-only: extra chart margin + outside axis labels (Shop & Coffee & Valet combo charts).
   * When `marginAxisCap` is high (e.g. valet 20%), slightly wider bands for long % and £k ticks.
   */
  shopMobileAxisLabels = false,
}) {
  const smUp = useIsSmUp();
  const rotateRootRef = useRef(null);
  const [activeTooltipLabel, setActiveTooltipLabel] = useState(null);
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

  const maxSalesM = Math.max(...data.map((d) => d.salesM || 0), 0);
  const maxProfitM = Math.max(...data.map((d) => d.profitM || 0), 0);
  const maxValueM = Math.max(maxSalesM, maxProfitM, 0.0001);
  /** Same idea as Fuel chart: when sales dwarf profit, give profit its own £M scale so bars stay readable. */
  const splitValueAxes =
    maxProfitM > 0 &&
    maxSalesM > 0 &&
    (maxSalesM / maxProfitM >= 4 || maxProfitM / maxSalesM < 0.12);
  const maxMargin = Math.max(...data.map((d) => d.marginPct || 0), 0);

  /** Cap margin axis per card; extend in steps of 5 if data exceeds. */
  const MARGIN_AXIS_CAP = marginAxisCap;
  const marginAxisMax =
    maxMargin > MARGIN_AXIS_CAP
      ? Math.ceil(maxMargin / 5) * 5 + 5
      : MARGIN_AXIS_CAP;
  const marginTicks = [];
  for (let i = 0; i <= marginAxisMax; i += 5) {
    marginTicks.push(i);
  }

  const salesDomainMax = niceCeilPositive(Math.max(maxSalesM * 1.1, 0.0001));
  const profitDomainMax = niceCeilPositive(Math.max(maxProfitM * 1.1, 0.0001));
  const singleDomainMax = niceCeilPositive(Math.max(maxValueM * 1.1, 0.0001));
  /** Data keys are in £M; label ticks in £k when the visible scale is sub‑£1M, else £M (matches tooltip K/M). */
  const axisInK = splitValueAxes ? salesDomainMax < 1 : singleDomainMax < 1;

  const formatValueAxisTick = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    if (n === 0) return "£0";
    if (axisInK) {
      const thousands = n * 1000;
      if (Math.abs(thousands) >= 100) return `£${Math.round(thousands)}k`;
      return `£${thousands.toFixed(1)}k`;
    }
    if (Math.abs(n) >= 1) return `£${n.toFixed(1)}M`;
    return `£${n.toFixed(2)}M`;
  };

  const TooltipBody = ({ label }) => {
    const r = data.find((d) => d.month_name === label) || {};
    const rows = [
      { color: colors.sales,  label: salesLabel,  value: fmt(r.salesRaw ?? 0) },
      { color: colors.profit, label: profitLabel, value: fmt(r.profitRaw ?? 0) },
      { color: colors.margin, label: marginLabel, value: `${(r.marginPct ?? 0).toFixed(2)}%` },
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
          {label}
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

  const TooltipContent = ({ active, label }) => {
    if (!active || !label) return null;
    return (
      <div
        style={{
          backgroundColor: "hsl(222, 47%, 11%)",
          border: "1px solid hsl(217, 33%, 20%)",
          borderRadius: 10,
          padding: "8px 12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          minWidth: 160,
          whiteSpace: "nowrap",
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

  if (!data.length) {
    return (
      <div className="chart-card rounded-xl border border-border p-3 min-h-[280px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm sm:text-base text-center px-2">No data for this period</p>
      </div>
    );
  }

  const fewMonths = data.length > 0 && data.length <= 3;
  const manyMonths = data.length > 6;
  const xAxisInterval = dashXAxisIntervalDenseMonths(smUp, data.length);
  const chartBarSize = smUp ? 28 : 11;
  const chartBarGap = smUp ? 8 : 3;
  const chartBarCategoryGap = smUp ? (fewMonths ? "30%" : "14%") : fewMonths ? "36%" : "16%";
  const mobileAxisGutters = shopMobileAxisLabels && !smUp;
  /** Valet-style card: larger margin % cap and £k ticks need more horizontal room on phones. */
  const mobileValetScale = mobileAxisGutters && marginAxisCap >= 15;
  const chartMargin = smUp
    ? { top: 6, right: 36, left: 48, bottom: manyMonths ? 56 : 36 }
    : mobileAxisGutters
      ? {
          top: 4,
          left: 14,
          right: mobileValetScale ? 22 : 18,
          bottom: mobileValetScale ? 52 : 46,
        }
      : { top: 4, right: 4, left: 0, bottom: 46 };
  const marginAxisTickWidth = smUp ? 78 : mobileAxisGutters ? (mobileValetScale ? 52 : 46) : 40;
  const valueAxisW = smUp ? 72 : mobileAxisGutters ? (mobileValetScale ? 56 : 50) : 38;
  const valueAxisLabel = splitValueAxes
    ? axisInK ? "Sales (£k)" : "Sales (£M)"
    : axisInK ? "£k" : "£M";
  const tickX = dashXAxisTickSizePrimary(smUp);
  const tickY = dashTickSecondary(smUp);
  const xAngle = manyMonths ? (smUp ? -38 : -45) : smUp ? 0 : -45;
  const xTextAnchor = manyMonths && smUp ? "end" : smUp ? "middle" : "end";
  const xHeight = smUp
    ? (manyMonths ? 56 : 32)
    : mobileAxisGutters && manyMonths
      ? 52
      : 46;

  return (
    <div
      className={
        smUp
          ? "chart-card rounded-xl border border-border p-3 flex flex-col min-h-[340px]"
          : "chart-card rounded-xl border border-border p-2 flex flex-col min-h-[300px] relative"
      }
    >
      {/* Mobile-only tooltip — top-right of card, over header, never over bars */}
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
        <h3 className="dash-chart-heading">{title}</h3>
        {subtitle ? (
          <p className="dash-chart-subtitle leading-snug">
            {subtitle}{" "}
            <span className="text-foreground/90">
              Left: margin % · Right:{" "}
              {splitValueAxes
                ? `sales (${axisInK ? "£k" : "£M"}). Profit bars use a separate scale; hover for exact £.`
                : axisInK
                  ? "£k"
                  : "£M"}
            </span>
          </p>
        ) : null}
      </div>
      <div ref={rotateRootRef} className="flex flex-col flex-1 min-h-0 w-full">
        <div
          data-rotate-fill
          className="w-full overflow-x-hidden flex-1 flex flex-col min-h-0"
        >
          <div
            data-rotate-plot
            className={smUp ? "min-w-0 h-[260px] w-full shrink-0" : "min-w-0 w-full h-[280px] shrink-0"}
          >
            <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={chartMargin}
              barSize={chartBarSize}
              barGap={chartBarGap}
              barCategoryGap={chartBarCategoryGap}
              onMouseMove={(d) => { if (!smUp && d?.activeLabel) setActiveTooltipLabel(d.activeLabel); }}
              onMouseLeave={() => { if (!smUp) setActiveTooltipLabel(null); }}
            >
              <CartesianGrid {...dashCartesianGridProps} />
              <XAxis
                dataKey="month_name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--foreground))", fontSize: smUp ? tickX : 9, fontWeight: 500 }}
                angle={xAngle}
                textAnchor={xTextAnchor}
                height={xHeight}
                interval={xAxisInterval}
                minTickGap={smUp ? (manyMonths ? 10 : 4) : 0}
                tickMargin={smUp ? (manyMonths ? 10 : 6) : 4}
                tickFormatter={formatMonthAxisTick}
              />
              {/* Left = margin % */}
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--foreground))", fontSize: smUp ? tickY : 10, fontWeight: 600 }}
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
                } : shopMobileAxisLabels ? {
                  value: "Margin %",
                  angle: -90,
                  position: "left",
                  offset: 2,
                  dx: -4,
                  style: { fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 600 },
                } : {
                  value: "Margin %",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  dx: -2,
                  dy: 32,
                  style: { fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 600 },
                }}
              />
              {/* Right: £M / £k */}
              {splitValueAxes ? (
                <>
                  <YAxis
                    yAxisId="salesAxis"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--foreground))", fontSize: smUp ? tickY : 10, fontWeight: 500 }}
                    width={valueAxisW}
                    domain={[0, salesDomainMax]}
                    tickFormatter={formatValueAxisTick}
                    label={smUp ? {
                      value: valueAxisLabel,
                      angle: 90,
                      position: "right",
                      offset: 8,
                      dx: 6,
                      style: { fill: "hsl(var(--foreground))", fontSize: dashAxisLabel(smUp), fontWeight: 600 },
                    } : shopMobileAxisLabels ? {
                      value: axisInK ? "£k" : "£M",
                      angle: 90,
                      position: "right",
                      offset: 4,
                      dx: 6,
                      style: { fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 600 },
                    } : {
                      value: axisInK ? "£k" : "£M",
                      angle: 90,
                      position: "insideRight",
                      offset: 0,
                      dx: 2,
                      dy: -16,
                      style: { fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 600 },
                    }}
                  />
                  <YAxis
                    yAxisId="profitAxis"
                    orientation="right"
                    hide
                    domain={[0, profitDomainMax]}
                  />
                </>
              ) : (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--foreground))", fontSize: smUp ? tickY : 10, fontWeight: 500 }}
                  width={valueAxisW}
                  domain={[0, singleDomainMax]}
                  tickFormatter={formatValueAxisTick}
                  label={smUp ? {
                    value: valueAxisLabel,
                    angle: 90,
                    position: "right",
                    offset: 8,
                    dx: 6,
                    style: { fill: "hsl(var(--foreground))", fontSize: dashAxisLabel(smUp), fontWeight: 600 },
                  } : shopMobileAxisLabels ? {
                    value: axisInK ? "£k" : "£M",
                    angle: 90,
                    position: "right",
                    offset: 4,
                    dx: 6,
                    style: { fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 600 },
                  } : {
                    value: axisInK ? "£k" : "£M",
                    angle: 90,
                    position: "insideRight",
                    offset: 0,
                    dx: 2,
                    dy: -16,
                    style: { fill: "hsl(var(--foreground))", fontSize: 9, fontWeight: 600 },
                  }}
                />
              )}
              {smUp && <Tooltip content={<TooltipContent />} cursor={{ fill: "rgba(0,0,0,0.05)" }} shared />}
              {!smUp && <Tooltip cursor={{ fill: "rgba(0,0,0,0.05)" }} content={() => null} />}
              <Legend
                wrapperStyle={{
                  paddingTop: smUp ? "10px" : "4px",
                  paddingLeft: "4px",
                  paddingRight: "4px",
                  width: "100%",
                  maxWidth: "100%",
                  fontSize: smUp ? `${dashLegendFontPx(smUp)}px` : "10px",
                  color: "hsl(var(--foreground))",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: smUp ? "0.35rem 0.75rem" : "0.2rem 0.4rem",
                  justifyContent: "center",
                  rowGap: smUp ? "8px" : "4px",
                }}
                iconType="circle"
                iconSize={smUp ? dashLegendIconSize(smUp) : 8}
                formatter={(value) => (
                  <span style={{ fontSize: smUp ? undefined : "10px", whiteSpace: "nowrap", color: "hsl(var(--foreground))", fontWeight: 500 }}>{value}</span>
                )}
              />
              <Bar
                yAxisId={splitValueAxes ? "salesAxis" : "right"}
                dataKey="salesM"
                fill={colors.sales}
                name={salesLabel}
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={550}
              />
              <Bar
                yAxisId={splitValueAxes ? "profitAxis" : "right"}
                dataKey="profitM"
                fill={colors.profit}
                name={profitLabel}
                radius={[3, 3, 0, 0]}
                isAnimationActive
                animationDuration={550}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="marginPct"
                stroke={colors.margin}
                strokeWidth={smUp ? 2 : 1.75}
                dot={{
                  r: smUp ? 3 : 2.5,
                  fill: colors.margin,
                  strokeWidth: 1,
                  stroke: "hsl(var(--card))",
                }}
                activeDot={{ r: smUp ? 5 : 4, stroke: "hsl(var(--card))", strokeWidth: 1 }}
                name={marginLabel}
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
}

function ShopValetMonthlyComboChartsComponent({ startDate, endDate, siteIds, showInMillions = true }) {
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) {
      setRawRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await dashboardAPI.getPetrolMonthlyTrends(startDate, endDate, siteIds);
        const trends = res?.data ?? res ?? [];
        if (!cancelled) setRawRows(Array.isArray(trends) ? trends : []);
      } catch (e) {
        console.error("[ShopValetMonthlyComboCharts]", e);
        if (!cancelled) setRawRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, siteIds]);

  const shopData = useMemo(() => buildDisplayRows(rawRows, "shop"), [rawRows]);
  const valetData = useMemo(() => buildDisplayRows(rawRows, "valet"), [rawRows]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
      <div className="min-w-0">
        <SegmentComboChart
          title="Shop"
          subtitle="Monthly shop sales, profit &amp; margin %."
          data={shopData}
          loading={loading}
          showInMillions={showInMillions}
          colors={SHOP_COLORS}
          salesLabel="Sales"
          profitLabel="Profit"
          marginLabel="Margin %"
          marginAxisCap={5}
          shopMobileAxisLabels
        />
      </div>
      <div className="min-w-0">
        <SegmentComboChart
          title="Coffee & Valet"
          subtitle={`Monthly ${COFFEE_VALET_REVENUE_LABEL.toLowerCase()} sales, profit & margin %.`}
          data={valetData}
          loading={loading}
          showInMillions={showInMillions}
          colors={VALET_COLORS}
          salesLabel="Sales"
          profitLabel="Profit"
          marginLabel="Margin %"
          marginAxisCap={20}
          shopMobileAxisLabels
        />
      </div>
    </div>
  );
}

export const ShopValetMonthlyComboCharts = memo(ShopValetMonthlyComboChartsComponent);

function ShopMonthlyComboChartComponent({ startDate, endDate, siteIds, showInMillions = true }) {
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) { setRawRows([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await dashboardAPI.getPetrolMonthlyTrends(startDate, endDate, siteIds);
        const trends = res?.data ?? res ?? [];
        if (!cancelled) setRawRows(Array.isArray(trends) ? trends : []);
      } catch (e) {
        console.error("[ShopMonthlyComboChart]", e);
        if (!cancelled) setRawRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [startDate, endDate, siteIds]);

  const shopData = useMemo(() => buildDisplayRows(rawRows, "shop"), [rawRows]);

  return (
    <div className="mb-4">
      <SegmentComboChart
        title="Shop"
        subtitle="Monthly shop sales, profit &amp; margin %."
        data={shopData}
        loading={loading}
        showInMillions={showInMillions}
        colors={SHOP_COLORS}
        salesLabel="Sales"
        profitLabel="Profit"
        marginLabel="Margin %"
        marginAxisCap={5}
        shopMobileAxisLabels
      />
    </div>
  );
}

export const ShopMonthlyComboChart = memo(ShopMonthlyComboChartComponent);

function ValetMonthlyComboChartComponent({ startDate, endDate, siteIds, showInMillions = true }) {
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) { setRawRows([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await dashboardAPI.getPetrolMonthlyTrends(startDate, endDate, siteIds);
        const trends = res?.data ?? res ?? [];
        if (!cancelled) setRawRows(Array.isArray(trends) ? trends : []);
      } catch (e) {
        console.error("[ValetMonthlyComboChart]", e);
        if (!cancelled) setRawRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [startDate, endDate, siteIds]);

  const valetData = useMemo(() => buildDisplayRows(rawRows, "valet"), [rawRows]);

  return (
    <div className="mb-4">
      <SegmentComboChart
        title="Coffee & Valet"
        subtitle={`Monthly ${COFFEE_VALET_REVENUE_LABEL.toLowerCase()} sales, profit & margin %.`}
        data={valetData}
        loading={loading}
        showInMillions={showInMillions}
        colors={VALET_COLORS}
        salesLabel="Sales"
        profitLabel="Profit"
        marginLabel="Margin %"
        marginAxisCap={20}
        shopMobileAxisLabels
      />
    </div>
  );
}

export const ValetMonthlyComboChart = memo(ValetMonthlyComboChartComponent);
