import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";
import { dashCartesianGridProps, dashXAxisIntervalDenseMonths } from "@/lib/dashboardChartTypography";
import { COFFEE_VALET_REVENUE_LABEL } from "@/constants/revenueLabels";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export const ComparisonBarChart = ({ site1Data, site2Data, site1Name, site2Name, loading }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const chartRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!chartRef.current || hasAnimated || !site1Data || !site2Data) return;
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
              setAnimationProgress(1 - Math.pow(1 - progress, 3));
              if (progress < 1) requestAnimationFrame(animate);
              else setAnimationProgress(1);
            };
            requestAnimationFrame(animate);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(chartRef.current);
    return () => { if (chartRef.current) observer.unobserve(chartRef.current); };
  }, [site1Data, site2Data, hasAnimated]);

  useEffect(() => {
    setHasAnimated(false);
    setAnimationProgress(0);
  }, [site1Data, site2Data]);

  if (loading || !site1Data || !site2Data) {
    return (
      <div className="chart-card animate-slide-up" style={{ height: isMobile ? '300px' : '420px' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading chart data...</div>
        </div>
      </div>
    );
  }

  const abs = (v) => Math.abs(Number(v) || 0);
  const n1 = abs(site1Data.netSales) * animationProgress;
  const n2 = abs(site2Data.netSales) * animationProgress;
  const p1 = abs(site1Data.profit) * animationProgress;
  const p2 = abs(site2Data.profit) * animationProgress;
  const v1 = abs(site1Data.totalFuelVolume) * animationProgress;
  const v2 = abs(site2Data.totalFuelVolume) * animationProgress;
  const a1 = abs(site1Data.pplAfterOverheads ?? site1Data.avgPPL) * animationProgress;
  const a2 = abs(site2Data.pplAfterOverheads ?? site2Data.avgPPL) * animationProgress;
  const labourPct1 = abs(site1Data.labourCostPercent) * animationProgress;
  const labourPct2 = abs(site2Data.labourCostPercent) * animationProgress;
  const labourAmt1 = abs(site1Data.labourCost);
  const labourAmt2 = abs(site2Data.labourCost);
  const fuelSales1 = abs(site1Data.labourFuelSales);
  const fuelSales2 = abs(site2Data.labourFuelSales);
  const hasVol1 = abs(site1Data.totalFuelVolume) > 0;
  const hasVol2 = abs(site2Data.totalFuelVolume) > 0;
  const margin1 = abs(site1Data.grossMarginPct);
  const margin2 = abs(site2Data.grossMarginPct);
  const isMarginMode = !hasVol1 && !hasVol2;

  const largeScaleData = [
    { name: "Net Sales", [site1Name]: n1, [site2Name]: n2, type: "currency" },
    { name: "Gross Profit", [site1Name]: p1, [site2Name]: p2, type: "currency" },
    { name: "Fuel Volume", [site1Name]: v1, [site2Name]: v2, type: "volume" },
  ];

  const smallScaleData = [
    {
      name: isMarginMode ? "Fuel Margin" : "PPL after O/H",
      [site1Name]: hasVol1 ? a1 : margin1 * animationProgress,
      [site2Name]: hasVol2 ? a2 : margin2 * animationProgress,
      type: "pplOrMargin",
    },
  ];

  const labourScaleData = [
    {
      name: "Labour Cost %",
      [site1Name]: labourPct1,
      [site2Name]: labourPct2,
      type: "percent",
    },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className={cn(
            "pointer-events-none z-[99999] min-w-[200px] max-w-[min(320px,92vw)] rounded-xl border px-3.5 py-3 text-left shadow-lg backdrop-blur-md",
            isDark
              ? "border-white/15 bg-slate-900/88 text-slate-100"
              : "border-white/40 bg-white/90 text-foreground shadow-black/10"
          )}
        >
          <p className={cn("mb-2 text-sm font-semibold", isDark ? "text-slate-50" : "text-foreground")}>
            {payload[0].payload.name}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry, index) => {
              const metricType = entry.payload.type || "currency";
              let formattedValue = "";
              if (metricType === "pplOrMargin") {
                const hasVolume = entry.dataKey === site1Name ? hasVol1 : hasVol2;
                formattedValue = hasVolume ? `${entry.value.toFixed(2)} p` : `${entry.value.toFixed(2)}%`;
              } else if (metricType === "volume") {
                if (entry.value >= 1000000) formattedValue = `${(entry.value / 1000000).toFixed(1)}M L`;
                else if (entry.value >= 1000) formattedValue = `${(entry.value / 1000).toFixed(0)}K L`;
                else formattedValue = `${entry.value.toFixed(0)} L`;
              } else if (metricType === "percent") {
                const labour = entry.dataKey === site1Name ? labourAmt1 : labourAmt2;
                const fuel = entry.dataKey === site1Name ? fuelSales1 : fuelSales2;
                const fmt = (v) =>
                  v >= 1000000 ? `£${(v / 1000000).toFixed(2)}M` : v >= 1000 ? `£${(v / 1000).toFixed(1)}k` : `£${v.toFixed(2)}`;
                formattedValue = `${entry.value.toFixed(2)}% (${fmt(labour)} / ${fmt(fuel)})`;
              } else {
                if (entry.value >= 1000000) formattedValue = `£${(entry.value / 1000000).toFixed(2)}M`;
                else if (entry.value >= 1000) formattedValue = `£${(entry.value / 1000).toFixed(1)}k`;
                else formattedValue = `£${entry.value.toFixed(2)}`;
              }
              return (
                <p key={index} className="text-[13px] font-semibold leading-snug" style={{ color: entry.color }}>
                  {entry.name}: {formattedValue}
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const yAxisWidth = isMobile ? 40 : 56;
  const xAxisFontSize = isMobile ? 9 : 11;
  const chartHeight = isMobile ? 320 : 420;
  // Pixel height for ResponsiveContainer — avoids % overflow inside a fixed-height card
  const chartInnerPx = isMobile ? 220 : 350;

  const renderChart = (data, title, subtitle) => {
    const maxValue = Math.max(...data.flatMap(d => [d[site1Name] || 0, d[site2Name] || 0]));
    const xInterval = dashXAxisIntervalDenseMonths(!isMobile, data.length);
    return (
      <div className="chart-card animate-slide-up" style={{ height: `${chartHeight}px` }}>
        <div className="flex items-start gap-3 mb-3 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm sm:text-lg font-bold text-foreground leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{subtitle}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={chartInnerPx}>
          <BarChart data={data} margin={{ top: 5, right: isMobile ? 4 : 10, left: isMobile ? 0 : 10, bottom: isMobile ? 16 : 28 }}>
            <CartesianGrid {...dashCartesianGridProps} vertical={false} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: xAxisFontSize, fontWeight: 500 }}
              interval={xInterval}
              minTickGap={isMobile ? 8 : 0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 9 : 11, fontWeight: 500 }}
              tickFormatter={(value) => {
                if (maxValue >= 1000000) {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toFixed(0);
                } else if (maxValue >= 1000) {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value.toFixed(0);
                }
                return value.toFixed(1);
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: isMobile ? '6px' : '15px' }}
              iconType="circle"
              iconSize={isMobile ? 8 : 12}
              formatter={(value) => (
                <span style={{ fontSize: isMobile ? 10 : 13 }} className="font-medium text-foreground">{value}</span>
              )}
            />
            <Bar dataKey={site1Name} fill="#4f6df5" radius={[4, 4, 0, 0]} name={site1Name} minPointSize={2} />
            <Bar dataKey={site2Name} fill="#10b981" radius={[4, 4, 0, 0]} name={site2Name} minPointSize={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const miniChartHeight = isMobile ? 200 : 320;

  return (
    <div ref={chartRef} className="space-y-4 sm:space-y-6">
      {renderChart(
        largeScaleData,
        "Financial & Volume Metrics",
        `Sales, gross profit (fuel + shop + ${COFFEE_VALET_REVENUE_LABEL}), and fuel volume`
      )}

      {/* PPL & Labour Cost */}
      <div className="chart-card animate-slide-up">
        <div className="flex items-start gap-3 mb-3 sm:mb-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm sm:text-lg font-bold text-foreground leading-tight">
              {isMarginMode ? "Margin & Labour Cost" : "PPL after O/H & Labour Cost"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              {isMarginMode
                ? "Fuel margin after vending out the overheads and total labour cost for each site."
                : "PPL after O/H (net per litre) and total labour cost for each site."}
            </p>
          </div>
        </div>

        {/* Shared legend */}
        <div className="flex items-center justify-center gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: 'hsl(var(--chart-blue))' }} />
            <span style={{ fontSize: isMobile ? 11 : 13 }} className="font-medium text-foreground">{site1Name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#10b981' }} />
            <span style={{ fontSize: isMobile ? 11 : 13 }} className="font-medium text-foreground">{site2Name}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* PPL / Margin chart */}
          <div style={{ height: miniChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={smallScaleData} margin={{ top: 5, right: isMobile ? 4 : 10, left: isMobile ? 0 : 10, bottom: isMobile ? 24 : 40 }}>
                <CartesianGrid {...dashCartesianGridProps} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 9 : 11, fontWeight: 500 }} interval={0} />
                <YAxis axisLine={false} tickLine={false} width={isMobile ? 36 : 56}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 9 : 11, fontWeight: 500 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey={site1Name} fill="#4f6df5" radius={[4, 4, 0, 0]} name={site1Name} minPointSize={2} />
                <Bar dataKey={site2Name} fill="#10b981" radius={[4, 4, 0, 0]} name={site2Name} minPointSize={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Labour Cost chart */}
          <div style={{ height: miniChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={labourScaleData} margin={{ top: 5, right: isMobile ? 4 : 10, left: isMobile ? 0 : 10, bottom: isMobile ? 24 : 52 }}>
                <CartesianGrid {...dashCartesianGridProps} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 9 : 11, fontWeight: 500 }} interval={0} />
                <YAxis axisLine={false} tickLine={false} width={isMobile ? 36 : 56}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: isMobile ? 9 : 11, fontWeight: 500 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey={site1Name} fill="#4f6df5" radius={[4, 4, 0, 0]} name={site1Name} minPointSize={2} />
                <Bar dataKey={site2Name} fill="#10b981" radius={[4, 4, 0, 0]} name={site2Name} minPointSize={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
