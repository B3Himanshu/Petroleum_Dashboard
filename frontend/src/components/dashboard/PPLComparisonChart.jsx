import { useState, useEffect, memo, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { dashboardAPI } from "@/services/api";
import { format } from "date-fns";
import { useIsSmUp } from "@/hooks/use-mobile";
import {
  dashTickSecondary,
  dashTooltipTitlePx,
  dashTooltipBodyPx,
  dashLegendFontPx,
  dashLegendIconSize,
  dashLegendItemClass,
  dashCartesianGridProps,
  dashXAxisIntervalDenseMonths,
  dashXAxisTickSizePrimary,
  formatMonthAxisTick,
} from "@/lib/dashboardChartTypography";

const GROSS_PPL_LEGEND = "Gross PPL";
const PPL_AFTER_OH_LEGEND = "PPL after O/H";

const PPLComparisonChartComponent = ({ startDate, endDate, siteIds, hasVolume = true }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartRef = useRef(null);
  const rotateRootRef = useRef(null);
  const smUp = useIsSmUp();

  // Fetch PPL comparison data
  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      return;
    }
    if (!hasVolume) {
      setChartData([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 [PPLComparisonChart] Fetching data:', { startDate, endDate, siteIds });
        
        const data = await dashboardAPI.getPetrolPPLComparison(startDate, endDate, siteIds);
        
        console.log('📊 [PPLComparisonChart] Received data:', data);
        
        // Transform data for chart - API returns { year, month, avgPPL, actualPPL, overheads } (no date)
        const transformed = (data || []).map(item => {
          const year = item.year;
          const month = item.month;
          const dateStr = year != null && month != null
            ? `${year}-${String(month).padStart(2, '0')}-01`
            : null;
          const avgPPL = item.avgPPL ?? item.avg_ppl ?? 0;
          const actualPPL = item.actualPPL ?? item.actual_ppl ?? 0;
          return {
            date: dateStr,
            dateLabel: dateStr ? format(new Date(year, month - 1, 1), 'MMM yyyy') : '',
            year,
            month,
            avg_ppl: avgPPL,
            actual_ppl: actualPPL,
            ppl_after_overheads: avgPPL - actualPPL,
          };
        }).filter(item => item.date != null);

        // Ensure chronological order (Jan–Dec by year then month)
        transformed.sort((a, b) => {
          const y1 = a.year != null ? Number(a.year) : 0;
          const y2 = b.year != null ? Number(b.year) : 0;
          if (y1 !== y2) return y1 - y2;
          const m1 = a.month != null ? Number(a.month) : 0;
          const m2 = b.month != null ? Number(b.month) : 0;
          return m1 - m2;
        });

        setChartData(transformed);
      } catch (error) {
        console.error('❌ [PPLComparisonChart] Error fetching data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, siteIds, hasVolume]);

  // Intersection Observer for scroll-triggered animation (desktop only — on mobile it rescales the Y-axis while scrolling and feels like the chart is "moving")
  useEffect(() => {
    if (!smUp || !chartRef.current || hasAnimated || !chartData || chartData.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            let startTime = null;
            const duration = 1500;

            const animate = (timestamp) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / duration, 1);
              const easedProgress = 1 - Math.pow(1 - progress, 3);
              setAnimationProgress(easedProgress);

              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                setAnimationProgress(1);
              }
            };

            requestAnimationFrame(animate);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px',
      }
    );

    observer.observe(chartRef.current);

    return () => {
      if (chartRef.current) {
        observer.unobserve(chartRef.current);
      }
    };
  }, [chartData, hasAnimated, smUp]);

  // Reset animation when data changes
  useEffect(() => {
    setHasAnimated(false);
    setAnimationProgress(0);
  }, [chartData]);

  // Apply animation to data (values unchanged — only scaled for entry animation on desktop)
  // ppl_after_overheads = avg_ppl − actual_ppl (Gross PPL minus overhead pence/litre → PPL after O/H)
  const dataAnimProgress = smUp ? animationProgress : 1;
  const animatedData = chartData.map(item => ({
    ...item,
    avg_ppl: (item.avg_ppl ?? 0) * dataAnimProgress,
    actual_ppl: (item.actual_ppl ?? 0) * dataAnimProgress,
    ppl_after_overheads: ((item.avg_ppl ?? 0) - (item.actual_ppl ?? 0)) * dataAnimProgress,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const shortName = (name) => {
        if (!smUp && name === PPL_AFTER_OH_LEGEND) return "After O/H";
        return name;
      };
      return (
        <div
          style={{
            backgroundColor: "hsl(222, 47%, 11%)",
            border: "1px solid hsl(217, 33%, 17%)",
            color: "#ffffff",
            zIndex: 99999,
            borderRadius: 8,
            padding: smUp ? "12px 14px" : "8px 10px",
            maxWidth: smUp ? 220 : 160,
            minWidth: smUp ? 180 : 130,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          <p style={{ fontWeight: 600, fontSize: dashTooltipTitlePx(smUp), marginBottom: smUp ? 8 : 6, color: "#fff" }}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ fontSize: dashTooltipBodyPx(smUp), fontWeight: 500, color: entry.color, marginBottom: 2 }}>
              {shortName(entry.name)}: {entry.value.toFixed(2)} p
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const emptyHeightClass = smUp ? "h-[340px]" : "h-[280px]";

  if (!hasVolume) {
    return (
      <div
        className={`flex flex-col items-center justify-center ${emptyHeightClass} text-center text-muted-foreground gap-2 px-4`}
      >
        <p className="text-lg font-semibold text-foreground">N/A</p>
        <p className="text-xs sm:text-sm max-w-md">
          No litre volume for this period — this chart shows pence-per-litre when volume data is available.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${emptyHeightClass}`}>
        <div className="text-muted-foreground text-sm sm:text-base">Loading chart data...</div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center ${emptyHeightClass}`}>
        <div className="text-muted-foreground text-sm sm:text-base">No data available</div>
      </div>
    );
  }

  const chartHeight = smUp ? 340 : 300;
  const xAxisInterval = dashXAxisIntervalDenseMonths(smUp, chartData.length);
  const chartMargin = smUp
    ? { top: 12, right: 12, left: 16, bottom: 24 }
    : { top: 8, right: 4, left: 0, bottom: 46 };
  const legendWrapperStyle = smUp
    ? {
        paddingTop: "10px",
        paddingBottom: "0px",
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        justifyContent: "center",
        fontSize: `${dashLegendFontPx(smUp)}px`,
      }
    : {
        paddingTop: "4px",
        paddingBottom: "0px",
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 10px",
        justifyContent: "center",
        maxWidth: "100%",
        fontSize: "10px",
      };

  const formatLegend = (value) => {
    const text = !smUp && value === PPL_AFTER_OH_LEGEND ? "After O/H" : value;
    return (
      <span style={{ fontSize: smUp ? undefined : "10px", fontWeight: 500, color: "hsl(var(--foreground))", marginLeft: 2 }}>
        {text}
      </span>
    );
  };

  return (
    <div className="overflow-hidden sm:animate-slide-up" ref={chartRef}>
      <div ref={rotateRootRef} className="w-full flex flex-col flex-1 min-h-0">
        <div
          data-rotate-fill
          className={
            smUp
              ? "w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 flex flex-col flex-1 min-h-0"
              : "w-full overflow-x-hidden mx-0 px-0 flex flex-col flex-1 min-h-0"
          }
        >
          <div
            data-rotate-plot
            className={smUp ? "min-w-[600px] sm:min-w-full w-full shrink-0" : "min-w-0 w-full shrink-0"}
            style={{ height: chartHeight }}
          >
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={animatedData} margin={chartMargin}>
              <CartesianGrid {...dashCartesianGridProps} />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: smUp ? dashXAxisTickSizePrimary(smUp) : 9,
                  fontWeight: 500,
                }}
                angle={smUp ? -35 : -45}
                textAnchor="end"
                height={smUp ? 50 : 46}
                interval={xAxisInterval}
                minTickGap={smUp ? 4 : 0}
                tickFormatter={formatMonthAxisTick}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: smUp ? dashTickSecondary(smUp) : 10,
                  fontWeight: 500,
                }}
                width={smUp ? 56 : 40}
                tickCount={smUp ? 6 : 5}
                tickFormatter={(value) => smUp ? `${value.toFixed(2)}p` : `${value.toFixed(1)}p`}
              />
              <Tooltip content={<CustomTooltip />} allowEscapeViewBox={{ x: false, y: false }} />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={legendWrapperStyle}
                iconType="circle"
                iconSize={dashLegendIconSize(smUp)}
                formatter={formatLegend}
              />
              <Line
                type="monotone"
                dataKey="avg_ppl"
                stroke="hsl(var(--chart-blue))"
                strokeWidth={smUp ? 3 : 2}
                dot={{ r: smUp ? 5 : 3.5, fill: "hsl(var(--chart-blue))" }}
                activeDot={{
                  r: smUp ? 7 : 5,
                  stroke: "hsl(var(--card))",
                  strokeWidth: smUp ? 2 : 1,
                }}
                connectNulls={false}
                isAnimationActive={smUp}
                animationDuration={800}
                name={GROSS_PPL_LEGEND}
              />
              <Line
                type="monotone"
                dataKey="ppl_after_overheads"
                stroke="#10b981"
                strokeWidth={smUp ? 3 : 2}
                dot={{ r: smUp ? 5 : 3.5, fill: "#10b981" }}
                activeDot={{
                  r: smUp ? 7 : 5,
                  stroke: "hsl(var(--card))",
                  strokeWidth: smUp ? 2 : 1,
                }}
                connectNulls={false}
                isAnimationActive={smUp}
                animationDuration={800}
                name={PPL_AFTER_OH_LEGEND}
              />
            </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PPLComparisonChart = memo(PPLComparisonChartComponent);
