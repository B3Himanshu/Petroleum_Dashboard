import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { TrendingUp } from "lucide-react";
import { dashboardAPI } from "@/services/api";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const colorMap = {
  "Fuel Sales": "#3b82f6",
  "Shop Sales": "#f59e0b",
  "Valet Sales": "#8b5cf6",
};

export const ComparisonPieCharts = ({ site1Id, site2Id, site1Name, site2Name, months, years, loading, comparisonSite1Data, comparisonSite2Data }) => {
  const [site1Data, setSite1Data] = useState([]);
  const [site2Data, setSite2Data] = useState([]);
  const [site1FullData, setSite1FullData] = useState([]);
  const [site2FullData, setSite2FullData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartsRef = useRef(null);
  const chart1Ref = useRef(null);
  const chart2Ref = useRef(null);

  useEffect(() => {
    if (!site1Id || !site2Id || months.length === 0 || years.length === 0) {
      setSite1Data([]);
      setSite2Data([]);
      setSite1FullData([]);
      setSite2FullData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);
        let raw1 = await dashboardAPI.getSalesDistribution(site1Id, months, years);
        let raw2 = await dashboardAPI.getSalesDistribution(site2Id, months, years);
        // Handle nested response (e.g. { data: [...] }) or direct array
        const data1 = Array.isArray(raw1) ? raw1 : (raw1?.data && Array.isArray(raw1.data) ? raw1.data : []);
        const data2 = Array.isArray(raw2) ? raw2 : (raw2?.data && Array.isArray(raw2.data) ? raw2.data : []);

        // Transform data for charts - show all segments with minimum visual representation
        const transformData = (data) => {
          const num = (v) => Number(v) || 0;
          const total = (Array.isArray(data) ? data : []).reduce((sum, item) => sum + num(item?.value ?? item?.amount ?? 0), 0);
          
          // Process all data - give 0% values a minimum visual representation
          const allData = (Array.isArray(data) ? data : []).map((item) => {
            const value = num(item?.value ?? item?.amount ?? 0);
            const percentage = total > 0 ? (value / total) * 100 : 0;
            // For 0% or very small values, assign a minimum visual value (0.5% of total)
            const displayValue = value > 0.01 ? value : total * 0.005;
            
            return {
              name: item.name,
              value,
              displayValue,
              color: colorMap[item.name] || "#8884d8",
              percentage,
              isZero: value <= 0.01
            };
          });
          
          return {
            chartData: allData, // All segments for rendering
            allData: allData,   // Same for legend
            total
          };
        };

        const transformed1 = transformData(data1);
        const transformed2 = transformData(data2);
        
        // Use chartData which now includes all segments with displayValue
        setSite1Data(transformed1.chartData);
        setSite2Data(transformed2.chartData);
        
        // Store full data for legend (same as chartData now)
        setSite1FullData(transformed1.allData);
        setSite2FullData(transformed2.allData);
      } catch (error) {
        console.error('Error fetching sales distribution:', error);
        setSite1Data([]);
        setSite2Data([]);
        setSite1FullData([]);
        setSite2FullData([]);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [site1Id, site2Id, months, years]);

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    if (!chartsRef.current || hasAnimated || !site1Data.length || !site2Data.length) return;

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

    observer.observe(chartsRef.current);

    return () => {
      if (chartsRef.current) {
        observer.unobserve(chartsRef.current);
      }
    };
  }, [site1Data, site2Data, hasAnimated]);

  // Reset animation when data changes
  useEffect(() => {
    setHasAnimated(false);
    setAnimationProgress(0);
  }, [site1Data, site2Data]);

  // Format total for display
  const formatTotal = (value) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `£${(value / 1000).toFixed(2)}k`;
    }
    return `£${value.toFixed(2)}`;
  };

  // Total: prefer comparison net sales (so it matches metrics card); else use distribution sum
  const num = (v) => Math.abs(Number(v) || 0);
  const distTotal1 = site1FullData.length > 0
    ? site1FullData.reduce((sum, item) => sum + num(item.value), 0)
    : site1Data.reduce((sum, item) => sum + num(item.value), 0);
  const distTotal2 = site2FullData.length > 0
    ? site2FullData.reduce((sum, item) => sum + num(item.value), 0)
    : site2Data.reduce((sum, item) => sum + num(item.value), 0);
  const netSales1 = num(comparisonSite1Data?.netSales);
  const netSales2 = num(comparisonSite2Data?.netSales);
  const baseTotal1 = netSales1 > 0 ? netSales1 : distTotal1;
  const baseTotal2 = netSales2 > 0 ? netSales2 : distTotal2;
  
  // Animated totals (for donut segments only); header/center labels use baseTotal directly
  const animTotal1 = baseTotal1 * animationProgress;
  const animTotal2 = baseTotal2 * animationProgress;

  // Create chart data for Chart.js with animation
  const createChartData = (data, fullData) => {
    return {
      labels: data.map(item => item.name),
      datasets: [
        {
          label: 'Sales',
          data: data.map(item => {
            // Animate the display value
            const animatedValue = item.displayValue * animationProgress;
            return animatedValue;
          }),
          backgroundColor: data.map(item => item.isZero ? `${item.color}4D` : item.color), // 30% opacity for 0% values
          borderColor: data.map(item => 'hsl(var(--card))'),
          borderWidth: 5,
          borderRadius: 6,
          spacing: 6, // Gap between segments
          cutout: '60%', // Donut hole size
          originalData: fullData, // Store original data for tooltip
        },
      ],
    };
  };

  // Chart options factory to access the correct data
  const createChartOptions = (fullData, total) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll use custom legend
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'hsl(222, 47%, 11%)',
        borderColor: 'hsl(217, 33%, 17%)',
        borderWidth: 1,
        padding: 12,
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const index = context.dataIndex;
            const originalItem = fullData[index];
            const actualValue = originalItem?.value || 0;
            const percentage = originalItem?.percentage !== undefined 
              ? originalItem.percentage.toFixed(3) 
              : (total > 0 ? ((actualValue / total) * 100).toFixed(3) : '0.000');
            return [
              `Sales: £${actualValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              `${percentage}% of total`
            ];
          }
        }
      },
    },
    animation: {
      animateRotate: true,
      animateScale: false,
    },
  });

  const chart1Data = createChartData(site1Data, site1FullData.length > 0 ? site1FullData : site1Data);
  const chart2Data = createChartData(site2Data, site2FullData.length > 0 ? site2FullData : site2Data);
  const chart1Options = createChartOptions(site1FullData.length > 0 ? site1FullData : site1Data, baseTotal1);
  const chart2Options = createChartOptions(site2FullData.length > 0 ? site2FullData : site2Data, baseTotal2);

  // Update charts when animation progresses
  useEffect(() => {
    if (chart1Ref.current && chart2Ref.current && hasAnimated && animationProgress > 0) {
      // Force chart update by updating the data
      if (chart1Ref.current.chartInstance) {
        chart1Ref.current.chartInstance.update();
      }
      if (chart2Ref.current.chartInstance) {
        chart2Ref.current.chartInstance.update();
      }
    }
  }, [animationProgress, hasAnimated]);

  // Early return after all hooks
  if (loading || loadingData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="chart-card h-[450px] animate-pulse">
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading chart data...</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Site 1 Pie Chart */}
      <div className="chart-card h-[450px] animate-slide-up">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{site1Name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Sales Distribution</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-primary/5 border border-primary/20">
            <span className="text-xs text-muted-foreground mr-1">Total:</span>
            <span className="text-sm font-bold text-primary">{formatTotal(baseTotal1)}</span>
          </div>
        </div>

        {site1Data.length === 0 ? (
          <div className="flex items-center justify-center h-[280px]">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="w-full relative flex items-center justify-center" style={{ minHeight: '200px', height: '280px', maxHeight: '280px' }}>
            <div className="w-full h-full" style={{ aspectRatio: '1', maxWidth: '100%', maxHeight: '100%', position: 'relative' }}>
              <Doughnut 
                ref={chart1Ref}
                data={chart1Data} 
                options={chart1Options}
              />
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-semibold text-foreground opacity-85" style={{ letterSpacing: '0.02em' }}>
                  Total Sales
                </span>
                <span className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
                  {formatTotal(baseTotal1)}
                </span>
              </div>
            </div>
            {/* Custom Legend - shows all values including 0% */}
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {(site1FullData.length > 0 ? site1FullData : site1Data).map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    <span style={{ color: item.color, fontWeight: 600 }}>{item.name}</span>
                    <span className="ml-1.5 text-muted-foreground font-normal">
                      ({item.percentage !== undefined ? item.percentage.toFixed(3) : (baseTotal1 > 0 ? ((item.value / baseTotal1) * 100).toFixed(3) : '0.000')}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Site 2 Pie Chart */}
      <div className="chart-card h-[450px] animate-slide-up">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{site2Name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Sales Distribution</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-md bg-primary/5 border border-primary/20">
            <span className="text-xs text-muted-foreground mr-1">Total:</span>
            <span className="text-sm font-bold text-primary">{formatTotal(baseTotal2)}</span>
          </div>
        </div>

        {site2Data.length === 0 ? (
          <div className="flex items-center justify-center h-[280px]">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="w-full relative flex items-center justify-center" style={{ minHeight: '200px', height: '280px', maxHeight: '280px' }}>
            <div className="w-full h-full" style={{ aspectRatio: '1', maxWidth: '100%', maxHeight: '100%', position: 'relative' }}>
              <Doughnut 
                ref={chart2Ref}
                data={chart2Data} 
                options={chart2Options}
              />
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-sm font-semibold text-foreground opacity-85" style={{ letterSpacing: '0.02em' }}>
                  Total Sales
                </span>
                <span className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.02em' }}>
                  {formatTotal(baseTotal2)}
                </span>
              </div>
            </div>
            {/* Custom Legend - shows all values including 0% */}
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {(site2FullData.length > 0 ? site2FullData : site2Data).map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    <span style={{ color: item.color, fontWeight: 600 }}>{item.name}</span>
                    <span className="ml-1.5 text-muted-foreground font-normal">
                      ({item.percentage !== undefined ? item.percentage.toFixed(3) : (baseTotal2 > 0 ? ((item.value / baseTotal2) * 100).toFixed(3) : '0.000')}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
