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

const PPLComparisonChartComponent = ({ startDate, endDate, siteIds }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartRef = useRef(null);

  // Fetch PPL comparison data
  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
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

  // Apply animation to data (values unchanged — only scaled for entry animation)
  // ppl_after_overheads = avg_ppl - actual_ppl (true "PPL after vending out overheads")
  const animatedData = chartData.map(item => ({
    ...item,
    avg_ppl: (item.avg_ppl ?? 0) * animationProgress,
    actual_ppl: (item.actual_ppl ?? 0) * animationProgress,
    ppl_after_overheads: ((item.avg_ppl ?? 0) - (item.actual_ppl ?? 0)) * animationProgress,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
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
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)} p
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[340px]">
        <div className="text-muted-foreground text-sm sm:text-base">Loading chart data...</div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[340px]">
        <div className="text-muted-foreground text-sm sm:text-base">No data available</div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up overflow-hidden" ref={chartRef}>
      <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[600px] sm:min-w-full">
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={animatedData}
              margin={{ top: 10, right: 10, left: 12, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(226, 232, 240, 0.55)"
                vertical={false}
                opacity={0.8}
              />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 500 }}
                angle={-35}
                textAnchor="end"
                height={44}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }}
                width={48}
                tickFormatter={(value) => `${value.toFixed(2)}p`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: "8px", paddingBottom: "0px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center" }}
                iconType="circle"
                iconSize={10}
                formatter={(value) => (
                  <span className="text-xs sm:text-sm font-medium text-foreground" style={{ marginLeft: 4 }}>{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="avg_ppl"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5, fill: "#3b82f6" }}
                activeDot={{ r: 7, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={800}
                name="Avg PPL"
              />
              <Line
                type="monotone"
                dataKey="ppl_after_overheads"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 5, fill: "#10b981" }}
                activeDot={{ r: 7, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={800}
                name="PPL After Vending Out Overheads"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const PPLComparisonChart = memo(PPLComparisonChartComponent);
