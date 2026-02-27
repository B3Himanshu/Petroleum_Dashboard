import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

export const ComparisonBarChart = ({ site1Data, site2Data, site1Name, site2Name, loading }) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartRef = useRef(null);
  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    if (!chartRef.current || hasAnimated || !site1Data || !site2Data) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            // Start animation
            let startTime = null;
            const duration = 1500; // 1.5 seconds

            const animate = (timestamp) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / duration, 1);
              
              // Easing function for smooth animation (ease-out)
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
        threshold: 0.2, // Trigger when 20% of the component is visible
        rootMargin: '0px',
      }
    );

    observer.observe(chartRef.current);

    return () => {
      if (chartRef.current) {
        observer.unobserve(chartRef.current);
      }
    };
  }, [site1Data, site2Data, hasAnimated]);

  // Reset animation when data changes
  useEffect(() => {
    setHasAnimated(false);
    setAnimationProgress(0);
  }, [site1Data, site2Data]);

  if (loading || !site1Data || !site2Data) {
    return (
      <div className="chart-card h-[420px] animate-slide-up">
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading chart data...</div>
        </div>
      </div>
    );
  }

  // Use positive values for chart (display as magnitude, never negative)
  const abs = (v) => Math.abs(Number(v) || 0);
  const n1 = abs(site1Data.netSales) * animationProgress;
  const n2 = abs(site2Data.netSales) * animationProgress;
  const p1 = abs(site1Data.profit) * animationProgress;
  const p2 = abs(site2Data.profit) * animationProgress;
  const v1 = abs(site1Data.totalFuelVolume) * animationProgress;
  const v2 = abs(site2Data.totalFuelVolume) * animationProgress;
  const c1 = abs(site1Data.customerCount) * animationProgress;
  const c2 = abs(site2Data.customerCount) * animationProgress;
  const b1 = abs(site1Data.basketSize) * animationProgress;
  const b2 = abs(site2Data.basketSize) * animationProgress;
  // Use Actual PPL (after overheads) when available, else Avg PPL
  const a1 = abs(site1Data.pplAfterOverheads ?? site1Data.avgPPL) * animationProgress;
  const a2 = abs(site2Data.pplAfterOverheads ?? site2Data.avgPPL) * animationProgress;

  // Prepare chart data - Separate by scale (with animation)
  const largeScaleData = [
    { name: "Net Sales", [site1Name]: n1, [site2Name]: n2, type: "currency" },
    { name: "Profit", [site1Name]: p1, [site2Name]: p2, type: "currency" },
    { name: "Fuel Volume", [site1Name]: v1, [site2Name]: v2, type: "volume" },
  ];

  const smallScaleData = [
    { name: "Customers", [site1Name]: c1, [site2Name]: c2, type: "count" },
    { name: "Basket Size", [site1Name]: b1, [site2Name]: b2, type: "currency" },
    { name: "Actual PPL", [site1Name]: a1, [site2Name]: a2, type: "ppl" },
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
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
            {payload[0].payload.name}
          </p>
          {payload.map((entry, index) => {
            const metricType = entry.payload.type || "currency";
            let formattedValue = "";
            
            if (metricType === "ppl") {
              formattedValue = `${entry.value.toFixed(2)} p`;
            } else if (metricType === "volume") {
              if (entry.value >= 1000000) {
                formattedValue = `${(entry.value / 1000000).toFixed(1)}M L`;
              } else if (entry.value >= 1000) {
                formattedValue = `${(entry.value / 1000).toFixed(0)}K L`;
              } else {
                formattedValue = `${entry.value.toFixed(0)} L`;
              }
            } else if (metricType === "count") {
              formattedValue = entry.value.toLocaleString();
            } else {
              // currency
              if (entry.value >= 1000000) {
                formattedValue = `£${(entry.value / 1000000).toFixed(2)}M`;
              } else if (entry.value >= 1000) {
                formattedValue = `£${(entry.value / 1000).toFixed(1)}k`;
              } else {
                formattedValue = `£${entry.value.toFixed(2)}`;
              }
            }
            
            return (
              <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
                {entry.name}: {formattedValue}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Render chart component
  const renderChart = (data, title, subtitle) => {
    const maxValue = Math.max(
      ...data.flatMap(d => [d[site1Name] || 0, d[site2Name] || 0])
    );

    return (
      <div className="chart-card h-[420px] animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="85%">
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false}
              opacity={0.3}
            />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
              domain={[0, 'dataMax']}
              allowDataOverflow={false}
              tickFormatter={(value) => {
                if (maxValue >= 1000000) {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toFixed(0);
                } else if (maxValue >= 1000) {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                  return value.toFixed(0);
                } else {
                  return value.toFixed(1);
                }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: "15px" }}
              iconType="circle"
              formatter={(value) => (
                <span className="text-sm font-medium text-foreground">{value}</span>
              )}
            />
            <Bar 
              dataKey={site1Name} 
              fill="#3b82f6" 
              radius={[6, 6, 0, 0]}
              name={site1Name}
              minPointSize={2}
            />
            <Bar 
              dataKey={site2Name} 
              fill="#10b981" 
              radius={[6, 6, 0, 0]}
              name={site2Name}
              minPointSize={2}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div ref={chartRef} className="space-y-6">
      {/* Large Scale Metrics Chart */}
      {renderChart(
        largeScaleData,
        "Financial & Volume Metrics",
        "Sales, Profit, and Fuel Volume comparison"
      )}

      {/* Small Scale Metrics Chart */}
      {renderChart(
        smallScaleData,
        "Operational Metrics",
        "Customers, Basket Size, and Actual PPL comparison"
      )}
    </div>
  );
};
