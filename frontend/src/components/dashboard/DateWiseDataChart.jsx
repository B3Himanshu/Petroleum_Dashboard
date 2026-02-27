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
import { TrendingUp } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { format, parseISO, getDaysInMonth, isWithinInterval } from "date-fns";

const DateWiseDataChartComponent = ({ startDate, endDate }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartRef = useRef(null);

  // Fetch daily data
  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📅 [DateWiseDataChart] Fetching data:', { startDate, endDate });
        
        const data = await dashboardAPI.getPetrolDailyData(startDate, endDate);
        
        console.log('📅 [DateWiseDataChart] Received data:', data);
        
        // Create a map of existing data by date
        const dataMap = new Map();
        (data || []).forEach(item => {
          dataMap.set(item.date, {
            date: item.date,
            dateLabel: format(parseISO(item.date), 'dd/MM'),
            fuel_volume: item.fuel_volume || 0,
            fuel_sales: item.fuel_sales || 0,
            avg_ppl: item.avg_ppl || 0,
          });
        });
        
        // Generate all dates in the selected month range
        const startDateObj = parseISO(startDate);
        const endDateObj = parseISO(endDate);
        
        const allDates = [];
        const currentDate = new Date(startDateObj);
        
        while (currentDate <= endDateObj) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          
          // If date exists in data, use it; otherwise create empty entry
          if (dataMap.has(dateStr)) {
            allDates.push(dataMap.get(dateStr));
          } else {
            allDates.push({
              date: dateStr,
              dateLabel: format(currentDate, 'dd/MM'),
              fuel_volume: 0,
              fuel_sales: 0,
              avg_ppl: 0,
            });
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        setChartData(allDates);
      } catch (error) {
        console.error('❌ [DateWiseDataChart] Error fetching data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

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

  // Apply animation to data
  const animatedData = chartData.map(item => ({
    ...item,
    fuel_volume: item.fuel_volume * animationProgress,
    fuel_sales: item.fuel_sales * animationProgress,
    avg_ppl: item.avg_ppl * animationProgress,
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
          {payload.map((entry, index) => {
            let formattedValue = "";
            const value = entry.value || 0;
            
            if (entry.dataKey === 'fuel_volume') {
              if (value >= 1000000) {
                formattedValue = `${(value / 1000000).toFixed(1)}M L`;
              } else if (value >= 1000) {
                formattedValue = `${(value / 1000).toFixed(0)}K L`;
              } else {
                formattedValue = `${value.toFixed(0)} L`;
              }
            } else if (entry.dataKey === 'avg_ppl') {
              formattedValue = `${value.toFixed(2)} p`;
            } else {
              // fuel_sales (currency)
              if (value >= 1000000) {
                formattedValue = `£${(value / 1000000).toFixed(2)}M`;
              } else if (value >= 1000) {
                formattedValue = `£${(value / 1000).toFixed(1)}k`;
              } else {
                formattedValue = `£${value.toFixed(2)}`;
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

  // Find max values for Y-axis formatting
  const maxVolume = Math.max(...animatedData.map(d => d.fuel_volume || 0));
  const maxSales = Math.max(...animatedData.map(d => d.fuel_sales || 0));
  const maxPPL = Math.max(...animatedData.map(d => d.avg_ppl || 0));

  // Custom X-axis tick to show every 5th date
  const CustomXAxisTick = (props) => {
    const { x, y, payload, index } = props;
    // Show every 5th date or all if less than 15 dates
    const showLabel = chartData.length <= 15 || index % 5 === 0;
    
    if (!showLabel) return null;
    
    return (
      <text 
        x={x} 
        y={y} 
        textAnchor="end" 
        fill="hsl(var(--muted-foreground))" 
        fontSize={10} 
        fontWeight={500}
        transform={`rotate(-35 ${x} ${y})`}
      >
        {payload.value}
      </text>
    );
  };

  return (
    <div className="chart-card min-h-[450px] sm:min-h-[420px] h-auto sm:h-[420px] animate-slide-up overflow-hidden" ref={chartRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 lg:mb-6 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">Date-wise Data</h3>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Daily trends for volume, sales, and PPL</p>
          </div>
        </div>
      </div>

      <div className="w-full h-[320px] sm:h-[calc(100%-120px)] lg:h-[85%] -mx-4 sm:mx-0 px-4 sm:px-0">
        <ResponsiveContainer width="100%" height={280} margin={{ top: 0, bottom: 0 }}>
          <LineChart 
            data={animatedData}
            margin={{ top: 15, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false}
              opacity={0.2}
            />
            <XAxis 
              dataKey="dateLabel" 
              axisLine={false} 
              tickLine={false}
              tick={<CustomXAxisTick />}
              interval={0}
              height={70}
            />
            <YAxis 
              yAxisId="left"
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
              width={45}
              tickFormatter={(value) => {
                if (maxVolume >= 1000000 || maxSales >= 1000000) {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return `${value}`;
                } else if (maxVolume >= 1000 || maxSales >= 1000) {
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return `${value}`;
                } else {
                  return `${value.toFixed(0)}`;
                }
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
              width={45}
              tickFormatter={(value) => `${value.toFixed(1)}p`}
            />
            <Tooltip 
              content={<CustomTooltip />}
              contentStyle={{ pointerEvents: 'none' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "15px" }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs sm:text-sm font-medium text-foreground">{value}</span>
              )}
              height={40}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="fuel_volume"
              stroke="#3b82f6"
              strokeWidth={2.5} 
              dot={false}
              activeDot={{ r: 5, fill: "#3b82f6", stroke: "#ffffff", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={800}
              name="Fuel Volume"
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="fuel_sales"
              stroke="#ec4899"
              strokeWidth={2.5} 
              dot={false}
              activeDot={{ r: 5, fill: "#ec4899", stroke: "#ffffff", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={800}
              name="Fuel Sales"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="avg_ppl"
              stroke="#a78bfa"
              strokeWidth={2.5} 
              dot={false}
              activeDot={{ r: 5, fill: "#a78bfa", stroke: "#ffffff", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={800}
              name="Average PPL"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const DateWiseDataChart = memo(DateWiseDataChartComponent);
