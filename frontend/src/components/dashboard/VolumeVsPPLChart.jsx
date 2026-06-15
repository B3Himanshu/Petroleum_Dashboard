import { useEffect, useMemo, useState, memo, useRef } from "react";
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
  dashTickSecondary,
  dashAxisLabel,
  dashLegendFontPx,
  dashLegendIconSize,
  dashCartesianGridProps,
  formatMonthAxisTick,
  dashXAxisIntervalDenseMonths,
  dashXAxisTickSizePrimary,
} from "@/lib/dashboardChartTypography";

const COLORS = {
  volume: "#14b8a6",
  ppl: "#f97316",
};

const VolumeVsPPLChartComponent = ({
  startDate,
  endDate,
  siteIds,
  hasVolume = true,
  showInMillions = true,
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const smUp = useIsSmUp();
  const rotateRootRef = useRef(null);

  useEffect(() => {
    if (!startDate || !endDate || !hasVolume) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await dashboardAPI.getPetrolMonthlyTrends(startDate, endDate, siteIds);
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!cancelled) setRows(data);
      } catch (e) {
        console.error("[VolumeVsPPLChart]", e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, siteIds, hasVolume]);

  const chartData = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const y1 = Number(a.year ?? 0);
      const y2 = Number(b.year ?? 0);
      if (y1 !== y2) return y1 - y2;
      return Number(a.month ?? 0) - Number(b.month ?? 0);
    });
    return list.map((r) => ({
      month_name: r.month_name,
      volumeML: Number(r.volumeML ?? 0),
      avgPPL: Number(r.avgPPL ?? 0),
    }));
  }, [rows]);

  const maxVol = Math.max(...chartData.map((x) => x.volumeML || 0), 0.01);
  const maxPpl = Math.max(...chartData.map((x) => x.avgPPL || 0), 0);

  /** Mirror fuel margin axis: cap PPL scale at 20 (pence); extend in steps of 5 if needed. */
  const PPL_AXIS_CAP = 20;
  const pplAxisMax =
    maxPpl > PPL_AXIS_CAP ? Math.ceil(maxPpl / 5) * 5 + 5 : PPL_AXIS_CAP;
  const pplTicks = [];
  for (let i = 0; i <= pplAxisMax; i += 5) {
    pplTicks.push(i);
  }

  const volumeUnitLabel = showInMillions ? "ML" : "KL";
  const volumeAxisUnitLabel = showInMillions ? "M" : "k";

  const formatVolumeAxisTick = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    if (n === 0) return "0";
    if (showInMillions) {
      if (Math.abs(n) >= 1) return `${n.toFixed(1)}M`;
      if (Math.abs(n) >= 0.001) return `${n.toFixed(2)}M`;
      return `${n.toFixed(3)}M`;
    }
    const k = n * 1000;
    if (Math.abs(k) >= 1) return `${Math.round(k)}k`;
    return `${k.toFixed(1)}k`;
  };

  /** Tooltip volume unit follows global M/exact toggle. */
  const formatVolumeTooltip = (volumeML) => {
    const v = Number(volumeML) || 0;
    if (showInMillions) return `${v.toFixed(2)} ML`;
    return `${(v * 1000).toFixed(2)} KL`;
  };

  const CustomTooltip = ({ active, label }) => {
    if (!active || !label) return null;
    const row = chartData.find((x) => x.month_name === label);
    if (!row) return null;
    return (
      <div
        className="rounded-md p-2 shadow-lg min-w-[150px]"
        style={{
          backgroundColor: "hsl(222, 47%, 11%)",
          border: "1px solid hsl(217, 33%, 17%)",
          color: "#fff",
          zIndex: 99999,
        }}
      >
        <p className="font-semibold text-sm mb-1.5 text-white">{label}</p>
        <p className="text-xs mb-0.5 font-medium" style={{ color: COLORS.ppl }}>
          Gross PPL: {row.avgPPL.toFixed(2)} p
        </p>
        <p className="text-xs font-medium" style={{ color: COLORS.volume }}>
          Fuel Volume: {formatVolumeTooltip(row.volumeML)}
        </p>
      </div>
    );
  };

  /** Mobile height nudged vs desktop-only 252 so x-axis + legend match Fuel card rhythm. */
  const plotH = smUp ? 252 : 300;

  if (!hasVolume) {
    return (
      <div className="h-[300px] sm:h-[252px] flex items-center justify-center text-muted-foreground text-xs text-center px-4">
        No litre volume for this period.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[300px] sm:h-[252px] flex items-center justify-center text-muted-foreground text-xs">
        Loading chart data...
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="h-[300px] sm:h-[252px] flex items-center justify-center text-muted-foreground text-xs">
        No data available
      </div>
    );
  }

  const fewMonths = chartData.length > 0 && chartData.length <= 3;
  const xAxisInterval = dashXAxisIntervalDenseMonths(smUp, chartData.length);
  const chartBarSize = smUp ? 30 : 14;
  const chartBarGap = smUp ? 5 : 3;
  const chartBarCategoryGap = smUp ? (fewMonths ? "24%" : "10%") : fewMonths ? "36%" : "16%";
  const chartMargin = smUp
    ? { top: 6, right: 42, left: 20, bottom: 26 }
    : { top: 4, left: 14, right: 22, bottom: 52 };
  const yLeftW = smUp ? 58 : 46;
  const yRightW = smUp ? 56 : 52;
  const tickX = smUp ? Math.max(10, dashXAxisTickSizePrimary(smUp) - 2) : 10;
  const tickY = smUp ? Math.max(10, dashTickSecondary(smUp) - 2) : 11;

  return (
    <div className="w-full flex flex-col" ref={rotateRootRef}>
      <div
        data-rotate-fill
        className="w-full overflow-x-hidden"
      >
        <div
          data-rotate-plot
          className="w-full min-w-0"
          style={{ width: "100%", height: plotH }}
        >
          <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={chartMargin}
            barSize={chartBarSize}
            barGap={chartBarGap}
            barCategoryGap={chartBarCategoryGap}
          >
            <CartesianGrid {...dashCartesianGridProps} />
            <XAxis
              dataKey="month_name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: tickX, fontWeight: 500 }}
              angle={smUp ? 0 : -45}
              textAnchor={smUp ? "middle" : "end"}
              height={smUp ? 28 : 52}
              interval={xAxisInterval}
              minTickGap={smUp ? 4 : 0}
              tickFormatter={formatMonthAxisTick}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: COLORS.ppl, fontSize: tickY, fontWeight: 600 }}
              width={yLeftW}
              domain={[0, pplAxisMax]}
              ticks={pplTicks}
              allowDecimals={false}
              tickFormatter={(v) => `${Number(v).toFixed(0)}p`}
              label={smUp ? {
                value: "Gross PPL",
                angle: -90,
                position: "left",
                offset: 6,
                dx: -6,
                style: { fill: COLORS.ppl, fontSize: Math.max(10, dashAxisLabel(smUp) - 1), fontWeight: 600 },
              } : {
                value: "Gross PPL",
                angle: -90,
                position: "left",
                offset: 2,
                dx: -4,
                style: { fill: COLORS.ppl, fontSize: 10, fontWeight: 600 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: tickY, fontWeight: 500 }}
              width={yRightW}
              domain={[0, Math.max(maxVol * 1.2, 0.05)]}
              tickFormatter={formatVolumeAxisTick}
              label={smUp ? {
                value: `Vol (${volumeAxisUnitLabel})`,
                angle: 90,
                position: "right",
                offset: 8,
                dx: 6,
                style: { fill: "hsl(var(--muted-foreground))", fontSize: Math.max(10, dashAxisLabel(smUp) - 1), fontWeight: 600 },
              } : {
                value: `Vol (${volumeAxisUnitLabel})`,
                angle: 90,
                position: "right",
                offset: 4,
                dx: 6,
                style: { fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600 },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.05)" }} shared />
            <Legend
              wrapperStyle={{
                paddingTop: smUp ? "4px" : "6px",
                fontSize: smUp ? `${Math.max(11, dashLegendFontPx(smUp) - 2)}px` : "11px",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: smUp ? "0.25rem 0.75rem" : "0.15rem 0.4rem",
              }}
              iconType="circle"
              iconSize={smUp ? Math.max(8, dashLegendIconSize(smUp) - 2) : 8}
              formatter={(value) => (
                <span style={{ fontSize: smUp ? undefined : "11px", color: "hsl(var(--foreground))", fontWeight: 500 }}>{value}</span>
              )}
            />
            <Bar
              yAxisId="right"
              dataKey="volumeML"
              name={`Fuel Volume (${volumeUnitLabel})`}
              fill={COLORS.volume}
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationDuration={700}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgPPL"
              name="Gross PPL"
              stroke={COLORS.ppl}
              strokeWidth={smUp ? 2 : 1.75}
              dot={{
                r: smUp ? 3 : 2.5,
                fill: COLORS.ppl,
                strokeWidth: smUp ? 1.5 : 1,
                stroke: "hsl(var(--card))",
              }}
              activeDot={{ r: smUp ? 4 : 4, stroke: "hsl(var(--card))", strokeWidth: smUp ? 1.5 : 1 }}
              isAnimationActive
              animationDuration={750}
            />
          </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const VolumeVsPPLChart = memo(VolumeVsPPLChartComponent);

