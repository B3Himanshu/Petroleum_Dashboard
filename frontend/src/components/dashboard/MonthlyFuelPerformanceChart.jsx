import { useState, useEffect, memo, useRef } from "react";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { dashboardAPI } from "@/services/api";

const MonthlyFuelPerformanceChartComponent = ({ startDate, endDate, siteIds }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartRef = useRef(null);

  // Fetch monthly trends data
  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 [MonthlyFuelPerformanceChart] Fetching data:', { startDate, endDate, siteIds });

        const res = await dashboardAPI.getPetrolMonthlyTrends(startDate, endDate, siteIds);
        const trends = res?.data ?? res ?? [];

        const merged = trends.map((row) => ({
          ...row,
          avgPPL: row.avgPPL != null ? Number(row.avgPPL) : undefined,
          pplAfterOH: row.pplAfterOH != null ? Number(row.pplAfterOH) : undefined,
        }));

        // Ensure chronological order (Jan–Dec by year then month) for the selected range
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
        console.error('❌ [MonthlyFuelPerformanceChart] Error fetching data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, siteIds]);

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    if (!chartRef.current || hasAnimated || !chartData || chartData.length === 0) return;

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
  }, [chartData, hasAnimated]);

  // Reset animation when data changes
  useEffect(() => {
    setHasAnimated(false);
    setAnimationProgress(0);
  }, [chartData]);

  // Apply animation to data; use positive magnitudes so Sales, Volume, Profit always display as positive
  const animatedData = chartData.map(item => ({
    ...item,
    sales: Math.abs(item.sales || 0) * animationProgress,
    volume: Math.abs(item.volume || 0) * animationProgress,
    profit: Math.abs(item.profit || 0) * animationProgress,
  }));

  // Find if any row uses fuel sales as volume fallback (volume not in Sage)
  const volumeIsFuelSales = chartData.some(item => item.volumeIsFuelSales);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const row = chartData.find(d => d.month_name === label);
      const volumeAsSales = row?.volumeIsFuelSales;
      const hasPPLInPayload = payload.some(e => e.dataKey === 'avgPPL' || e.dataKey === 'pplAfterOH');
      const avgPPL = row?.avgPPL != null ? Number(row.avgPPL) : null;
      const pplAfterOH = row?.pplAfterOH != null ? Number(row.pplAfterOH) : null;
      return (
        <div 
          className="rounded-lg p-3 shadow-xl min-w-[180px]"
          style={{
            backgroundColor: "hsl(222, 47%, 11%)",
            border: "1px solid hsl(217, 33%, 17%)",
            color: "#ffffff",
            zIndex: 99999,
          }}
        >
          <p className="font-semibold text-sm mb-2" style={{ color: "#ffffff" }}>
            {label}
          </p>
          {payload.map((entry, index) => {
            let formattedValue = "";
            const value = Math.abs(entry.value || 0);
            const isVolumeBar = entry.dataKey === 'volume';

            if (isVolumeBar && volumeAsSales) {
              // Volume bar shows fuel sales (£) when volume not in Sage
              if (value >= 1000000) {
                formattedValue = `£${(value / 1000000).toFixed(2)}M`;
              } else if (value >= 1000) {
                formattedValue = `£${(value / 1000).toFixed(2)}K`;
              } else {
                formattedValue = `£${value.toFixed(2)}`;
              }
            } else if (isVolumeBar) {
              if (value >= 1000000) {
                formattedValue = `${(value / 1000000).toFixed(2)} ML`;
              } else if (value >= 1000) {
                formattedValue = `${(value / 1000).toFixed(2)} KL`;
              } else {
                formattedValue = `${value.toFixed(2)} L`;
              }
            } else if (entry.dataKey === 'avgPPL' || entry.dataKey === 'pplAfterOH') {
              formattedValue = `${Number(value).toFixed(2)}p`;
            } else {
              if (value >= 1000000) {
                formattedValue = `£${(value / 1000000).toFixed(2)}M`;
              } else if (value >= 1000) {
                formattedValue = `£${(value / 1000).toFixed(2)}K`;
              } else {
                formattedValue = `£${value.toFixed(2)}`;
              }
            }

            const displayName = isVolumeBar && volumeAsSales ? 'Fuel sales (£)' : entry.name;
            return (
              <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                {displayName}: {formattedValue}
              </p>
            );
          })}
          {!hasPPLInPayload && (avgPPL != null || pplAfterOH != null) && (
            <>
              {avgPPL != null && (
                <p className="text-sm font-medium mt-1.5" style={{ color: "#e5e7eb" }}>
                  Avg PPL: {Number(avgPPL).toFixed(2)}p
                </p>
              )}
              {pplAfterOH != null && (
                <p className="text-sm font-medium" style={{ color: "#d1d5db" }}>
                  PPL vending out OH: {Number(pplAfterOH).toFixed(2)}p
                </p>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="chart-card min-h-[450px] sm:min-h-[420px] h-auto sm:h-[420px] animate-slide-up">
        <div className="flex items-center justify-center min-h-[350px] sm:h-full">
          <div className="text-muted-foreground text-sm sm:text-base">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-card min-h-[450px] sm:min-h-[420px] h-auto sm:h-[420px] animate-slide-up">
        <div className="flex items-center justify-center min-h-[350px] sm:h-full">
          <div className="text-muted-foreground text-sm sm:text-base">No data available</div>
        </div>
      </div>
    );
  }

  // Find max value for Y-axis formatting (values are already positive from animatedData)
  const maxValue = Math.max(
    ...animatedData.flatMap(d => [d.sales || 0, d.volume || 0, d.profit || 0]),
    0
  );
  const hasPPL = animatedData.some(d => d.avgPPL != null || d.pplAfterOH != null);
  const maxPPL = hasPPL
    ? Math.max(...animatedData.flatMap(d => [d.avgPPL ?? 0, d.pplAfterOH ?? 0]), 0)
    : 0;

  return (
    <div className="chart-card min-h-[450px] sm:min-h-[420px] h-auto sm:h-[420px] animate-slide-up overflow-hidden flex flex-col" ref={chartRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-3 sm:gap-0 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-foreground truncate">Monthly Fuel Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Sales, Volume, and Profit trends</p>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 min-h-[280px] overflow-x-auto overflow-y-hidden -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[600px] sm:min-w-full h-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <BarChart 
              data={animatedData} 
              margin={{ top: 16, right: hasPPL ? 56 : 12, left: 8, bottom: 48 }}
              barCategoryGap="12%"
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
                opacity={0.3}
              />
              <XAxis 
                dataKey="month_name" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }}
                angle={-45}
                textAnchor="end"
                height={56}
                interval={0}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 500 }}
                width={42}
                domain={[0, 'auto']}
                tickFormatter={(value) => {
                  if (maxValue >= 1000000) {
                    if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
                    return `£${value}`;
                  } else if (maxValue >= 1000) {
                    if (value >= 1000) return `£${(value / 1000).toFixed(1)}k`;
                    return `£${value}`;
                  } else {
                    return `£${value.toFixed(0)}`;
                  }
                }}
              />
              {hasPPL && maxPPL > 0 && (
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 500 }}
                  width={40}
                  domain={[0, Math.ceil(maxPPL * 1.1)]}
                  tickFormatter={(v) => `${v}p`}
                />
              )}
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: "14px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "1rem 1.5rem",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                iconType="circle"
                iconSize={10}
                formatter={(value) => (
                  <span className="text-xs sm:text-sm font-medium capitalize text-foreground">{value}</span>
                )}
              />
              <Bar 
                yAxisId="left"
                dataKey="sales" 
                fill="#3b82f6" 
                radius={[0, 0, 0, 0]}
                name="Sales"
                isAnimationActive={true}
                animationDuration={800}
              />
              <Bar 
                yAxisId="left"
                dataKey="volume" 
                fill="#14b8a6" 
                radius={[0, 0, 0, 0]}
                name={volumeIsFuelSales ? "Volume (fuel sales £)" : "Volume"}
                isAnimationActive={true}
                animationDuration={800}
              />
              <Bar 
                yAxisId="left"
                dataKey="profit" 
                fill="#f97316" 
                radius={[6, 6, 0, 0]}
                name="Profit"
                isAnimationActive={true}
                animationDuration={800}
              />
              {hasPPL && (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="avgPPL" 
                    name="Avg PPL" 
                    stroke="#1f2937" 
                    strokeWidth={2}
                    dot={{ fill: "#1f2937", r: 3 }}
                    connectNulls
                    yAxisId="right"
                    isAnimationActive={true}
                    animationDuration={600}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pplAfterOH" 
                    name="PPL vending out OH" 
                    stroke="#6b7280" 
                    strokeWidth={2}
                    dot={{ fill: "#6b7280", r: 3 }}
                    connectNulls
                    yAxisId="right"
                    isAnimationActive={true}
                    animationDuration={600}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const MonthlyFuelPerformanceChart = memo(MonthlyFuelPerformanceChartComponent);
