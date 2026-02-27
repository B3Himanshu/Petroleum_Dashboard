import { useState, useEffect, memo, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { BarChart3, TrendingUp, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardAPI } from "@/services/api";

// Unified Custom Tooltip component for both bar and line charts
// This will be created inside the component to access filteredData and selectedMetrics
const createCustomTooltip = (chartData, selectedMetrics) => {
  return ({ active, payload, label }) => {
    // Debug logging
    if (active) {
      console.log('🔍 [CustomTooltip] Tooltip active:', { 
        active, 
        label, 
        payloadLength: payload?.length,
        payload: payload?.map(p => ({ 
          dataKey: p.dataKey, 
          value: p.value,
          payload: p.payload 
        }))
      });
    }

    // Show tooltip if active and we have either payload data OR a label to look up
    // Label can come from parameter or from payload
    if (active && label) {
    // Get colors from CSS variables to match the chart colors exactly
    const getColorFromCSSVar = (varName) => {
      if (typeof window !== 'undefined') {
        const root = document.documentElement;
        const value = getComputedStyle(root).getPropertyValue(varName).trim();
        if (value) {
          return `hsl(${value})`;
        }
      }
      // Fallback colors if CSS vars not available
      const fallbacks = {
        '--chart-blue': 'hsl(217, 91%, 60%)',
        '--chart-green': 'hsl(142, 71%, 45%)',
        '--chart-yellow': 'hsl(43, 96%, 56%)'
      };
      return fallbacks[varName] || '#8884d8';
    };

    const categoryColors = {
      fuel: getColorFromCSSVar('--chart-blue'),
      shop: getColorFromCSSVar('--chart-green'),
      valet: getColorFromCSSVar('--chart-yellow')
    };

    const categoryLabels = {
      fuel: "fuel",
      shop: "shop",
      valet: "valet"
    };

    // Get the data point - for stacked bars, all entries share the same payload object
    // For line charts, each entry has its own payload
    let dataPoint = {};
    let monthLabel = label; // Start with the label parameter
    
    // First, try to get data from payload if available
    if (payload && payload.length > 0) {
      // Try to get payload from first entry (works for both bar and line)
      dataPoint = payload[0]?.payload || {};
      
      // Extract month label from payload if label parameter is missing
      if (!monthLabel && dataPoint && dataPoint.month) {
        monthLabel = dataPoint.month;
      }
      
      // If payload doesn't have the data, try to get it from the entry itself
      if (!dataPoint || Object.keys(dataPoint).length === 0) {
        // For bar charts, sometimes the data is directly in the payload entry
        dataPoint = {
          month: monthLabel || label,
          fuel: payload.find(p => p.dataKey === 'fuel')?.value || 0,
          shop: payload.find(p => p.dataKey === 'shop')?.value || 0,
          valet: payload.find(p => p.dataKey === 'valet')?.value || 0,
        };
      }
    }
    
    // Fallback: look up from chartData using the label (month)
    // This is especially important when payload is empty (common with bar charts)
    if (!dataPoint || Object.keys(dataPoint).length === 0 || !dataPoint.month) {
      // Try to find by monthLabel first, then by label
      const lookupLabel = monthLabel || label;
      if (lookupLabel) {
        const foundData = chartData.find(d => d.month === lookupLabel);
        if (foundData) {
          dataPoint = foundData;
          if (dataPoint.month) {
            monthLabel = dataPoint.month;
          }
          console.log('🔍 [CustomTooltip] Looked up from chartData:', { lookupLabel, dataPoint, chartDataLength: chartData.length });
        }
      }
    }
    
    // Ensure we have a month label - use from dataPoint if available
    if (!monthLabel && dataPoint && dataPoint.month) {
      monthLabel = dataPoint.month;
    }
    
    // Map metric names to data keys and colors
    const metricKeyMap = {
      'Sales': 'sales',
      'Profit': 'profit',
      'Sale Volume': 'saleVolume',
      'PPL': 'ppl'
    };
    
    const metricColors = {
      'Sales': '#3b82f6', // Blue
      'Profit': '#10b981', // Green
      'Sale Volume': '#f59e0b', // Orange
      'PPL': '#8b5cf6' // Purple
    };
    
    // Ensure we have at least one metric
    const activeMetrics = selectedMetrics && selectedMetrics.length > 0 ? selectedMetrics : ['Sales'];
    
    // Ensure we have a valid month label to display
    const displayLabel = monthLabel || label || 'Unknown';
    
    // Get all selected metrics' values
    const metricValues = activeMetrics.map(metric => {
      const categoryKey = metricKeyMap[metric] || 'sales';
      let value = 0;
      
      // Try to get from dataPoint first
      if (dataPoint && dataPoint[categoryKey] !== undefined) {
        value = parseFloat(dataPoint[categoryKey] || 0);
      } 
      // Try to get from payload
      else if (payload && payload.length > 0) {
        const entry = payload.find(p => p.dataKey === categoryKey);
        if (entry && entry.value !== undefined && entry.value !== null) {
          value = parseFloat(entry.value || 0);
        }
      }
      
      return { metric, value, key: categoryKey };
    });
    
    const tooltipContent = (
      <div 
        className="rounded-lg p-3 shadow-xl min-w-[180px]"
        style={{
          backgroundColor: "hsl(222, 47%, 11%)",
          border: "1px solid hsl(217, 33%, 17%)",
          color: "#ffffff",
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
          position: 'relative',
          opacity: 1,
          visibility: 'visible',
          display: 'block',
        }}
      >
        <p 
          className="font-semibold text-sm mb-2"
          style={{ color: "#ffffff" }}
        >
          {displayLabel}
        </p>
        <div className="space-y-1">
          {metricValues.map(({ metric, value }) => (
            <div key={metric} className="flex items-center">
              <span 
                className="text-sm font-medium"
                style={{ color: metricColors[metric] || "#8884d8" }}
              >
                {metric}: 
              </span>
              <span 
                className="text-sm ml-1"
                style={{ color: "#ffffff" }}
              >
                {metric === 'Sale Volume' 
                  ? `${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`
                  : metric === 'PPL'
                  ? `${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} p`
                  : `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    );
    
    return tooltipContent;
    }
    return null;
  };
};

const MonthlyPerformanceChartComponent = ({ siteId, year, years, month, months }) => {
  // JSX version: no TypeScript generic on useState
  const [viewType, setViewType] = useState("bar");
  const [selectedMetrics, setSelectedMetrics] = useState(["Sales", "Profit", "Sale Volume", "PPL"]); // Array of selected metrics - all 4 selected by default
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metricsDropdownOpen, setMetricsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Available metrics
  const availableMetrics = [
    { value: "Sales", label: "Sales", color: "#3b82f6" },
    { value: "Profit", label: "Profit", color: "#10b981" },
    { value: "Sale Volume", label: "Sale Volume", color: "#f59e0b" },
    { value: "PPL", label: "PPL", color: "#8b5cf6" }
  ];
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMetricsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const toggleMetric = (metric) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metric)) {
        const newSelection = prev.filter(m => m !== metric);
        // Ensure at least one metric is selected
        return newSelection.length > 0 ? newSelection : ['Sales'];
      } else {
        return [...prev, metric];
      }
    });
  };

  // Use years array if provided, otherwise use single year
  const yearsToFetch = years && years.length > 0 ? years : (year ? [year] : []);
  // Use months array if provided, otherwise use single month
  const monthsToFilter = (months && months.length > 0) ? months : (month ? [month] : []);

  // Fetch monthly performance data
  useEffect(() => {
    if (!siteId || yearsToFetch.length === 0) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Pass all years to API - backend will aggregate data across all years
        const response = await dashboardAPI.getMonthlyPerformance(siteId, yearsToFetch);
        
        if (response && response.labels && response.datasets) {
          console.log('📊 [MonthlyPerformanceChart] Received API response:', {
            labelsCount: response.labels.length,
            labels: response.labels,
            datasets: response.datasets.map(d => ({ name: d.name, dataLength: d.data.length, sampleData: d.data.slice(0, 3) }))
          });
          
          // Transform API response to chart format
          // API returns: {labels: ['Jan', ...], datasets: [{name: 'Sales', data: [...]}, {name: 'Profit', data: [...]}, {name: 'Sale Volume', data: [...]}, {name: 'PPL', data: [...]}, ...]}
          // We need: [{month: 'Jan', sales: ..., profit: ..., saleVolume: ..., ppl: ...}, ...]
          const salesDataset = response.datasets.find(d => d.name === 'Sales');
          const profitDataset = response.datasets.find(d => d.name === 'Profit');
          const saleVolumeDataset = response.datasets.find(d => d.name === 'Sale Volume');
          const pplDataset = response.datasets.find(d => d.name === 'PPL');
          const shopSalesDataset = response.datasets.find(d => d.name === 'Shop Sales');
          const valetSalesDataset = response.datasets.find(d => d.name === 'Valet Sales');
          
          // Ensure we always have exactly 12 months in order
          const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const transformed = monthOrder.map((monthLabel) => {
            const index = response.labels.indexOf(monthLabel);
            return {
              month: monthLabel,
              sales: index >= 0 ? (salesDataset?.data[index] || 0) : 0,
              profit: index >= 0 ? (profitDataset?.data[index] || 0) : 0,
              saleVolume: index >= 0 ? (saleVolumeDataset?.data[index] || 0) : 0,
              ppl: index >= 0 ? (pplDataset?.data[index] || 0) : 0,
              // Keep fuel for backward compatibility (maps to sales)
              fuel: index >= 0 ? (salesDataset?.data[index] || 0) : 0,
              shop: index >= 0 ? (shopSalesDataset?.data[index] || 0) : 0,
              valet: index >= 0 ? (valetSalesDataset?.data[index] || 0) : 0,
            };
          });
          
          // Filter by selected months if provided
          let finalData = transformed;
          if (monthsToFilter && monthsToFilter.length > 0) {
            // Map month numbers (1-12) to month names (Jan-Dec)
            const monthNumberToName = {
              1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
              7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
            };
            const selectedMonthNames = monthsToFilter.map(m => monthNumberToName[m]).filter(Boolean);
            
            if (selectedMonthNames.length > 0) {
              finalData = transformed.filter(item => selectedMonthNames.includes(item.month));
            }
          }
          
          console.log('📊 [MonthlyPerformanceChart] Transformed chart data:', {
            totalMonths: finalData.length,
            selectedMonths: monthsToFilter,
            monthsWithFuelData: finalData.filter(d => d.fuel > 0).length,
            monthsWithShopData: finalData.filter(d => d.shop > 0).length,
            monthsWithValetData: finalData.filter(d => d.valet > 0).length,
            sampleData: finalData.slice(0, 3),
            allData: finalData.map(d => ({
              month: d.month,
              fuel: d.fuel,
              shop: d.shop,
              valet: d.valet
            }))
          });
          
          setChartData(finalData);
        } else {
          console.warn('📊 [MonthlyPerformanceChart] Invalid API response:', response);
          setChartData([]);
        }
      } catch (error) {
        console.error('Error fetching monthly performance:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId, yearsToFetch, monthsToFilter]);

  // Ensure we always have all 12 months in the correct order (or only selected months if filtered)
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // If months are filtered, create a subset of monthOrder with only selected months
  let monthsToDisplay = monthOrder;
  if (monthsToFilter && monthsToFilter.length > 0) {
    const monthNumberToName = {
      1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
      7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
    };
    const selectedMonthNames = monthsToFilter.map(m => monthNumberToName[m]).filter(Boolean);
    monthsToDisplay = monthOrder.filter(m => selectedMonthNames.includes(m));
  }
  
  // Map metric names to data keys
  const metricKeyMap = {
    'Sales': 'sales',
    'Profit': 'profit',
    'Sale Volume': 'saleVolume',
    'PPL': 'ppl'
  };
  
  // Ensure at least one metric is selected
  const activeMetrics = selectedMetrics.length > 0 ? selectedMetrics : ['Sales'];
  
  // Filter data to include all selected metrics
  let filteredData = chartData.map(item => {
    const dataPoint = {
      month: item.month,
      // Keep all metrics for tooltip and chart
      sales: item.sales || 0,
      profit: item.profit || 0,
      saleVolume: item.saleVolume || 0,
      ppl: item.ppl || 0,
    };
    
    // Add mapped keys for each metric
    activeMetrics.forEach(metric => {
      const key = metricKeyMap[metric];
      if (key) {
        dataPoint[key] = item[key] || 0;
      }
    });
    
    return dataPoint;
  });    
  
  // Ensure only selected months (or all months if not filtered) are present in the correct order
  const completeData = monthsToDisplay.map(monthLabel => {
    const existingData = filteredData.find(d => d.month === monthLabel);
    if (existingData) {
      return existingData;
    }
    // If month is missing, add it with zero values
    const emptyData = {
      month: monthLabel,
      sales: 0,
      profit: 0,
      saleVolume: 0,
      ppl: 0,
    };
    
    // Add mapped keys for each metric
    activeMetrics.forEach(metric => {
      const key = metricKeyMap[metric];
      if (key) {
        emptyData[key] = 0;
      }
    });
    
    return emptyData;
  });
  
  filteredData = completeData;
  
  // Create tooltip component with memoization
  const tooltipComponent = useMemo(() => createCustomTooltip(filteredData, activeMetrics), [filteredData, activeMetrics]);
  
  // Log filtered data to debug
  console.log('📊 [MonthlyPerformanceChart] Filtered data for chart:', {
    totalMonths: filteredData.length,
    allMonths: filteredData.map(d => d.month),
    monthsWithData: filteredData.filter(d => activeMetrics.some(m => {
      const key = metricKeyMap[m];
      return key && d[key] > 0;
    })).length,
    sampleData: filteredData.slice(0, 3),
    lastMonths: filteredData.slice(9, 12)
  });

  if (loading) {
    return (
      <div className="chart-card min-h-[450px] sm:min-h-[420px] h-auto sm:h-[420px] animate-slide-up" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-center min-h-[350px] sm:h-full">
          <div className="text-muted-foreground text-sm sm:text-base">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-card min-h-[450px] sm:min-h-[420px] h-auto sm:h-[420px] animate-slide-up" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-center min-h-[350px] sm:h-full">
          <div className="text-muted-foreground text-sm sm:text-base">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card min-h-[450px] sm:min-h-[420px] h-auto sm:h-[420px] animate-slide-up overflow-hidden" style={{ animationDelay: "200ms" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 lg:mb-6 gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">Monthly Performance Trends</h3>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Track your sales performance over time</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom Multi-Select Metric Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMetricsDropdownOpen(!metricsDropdownOpen)}
              className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg border border-border bg-background text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-w-[120px] sm:min-w-[150px] flex items-center justify-between gap-1 sm:gap-2"
            >
              <span>
                {selectedMetrics.length === 1 
                  ? selectedMetrics[0] 
                  : `${selectedMetrics.length} Metrics`}
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform",
                metricsDropdownOpen && "rotate-180"
              )} />
            </button>
            
            {metricsDropdownOpen && (
              <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-[180px] sm:w-[200px] bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Select Metrics
                  </span>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {availableMetrics.map((metric) => {
                    const isSelected = selectedMetrics.includes(metric.value);
                    return (
                      <button
                        key={metric.value}
                        onClick={() => toggleMetric(metric.value)}
                        className={cn(
                          "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-muted/50 transition-colors",
                          isSelected && "bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                          isSelected 
                            ? "border-primary bg-primary" 
                            : "border-border bg-background"
                        )}>
                          {isSelected && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: metric.color }}
                          />
                          <span className={cn(
                            "font-medium",
                            isSelected && "text-foreground",
                            !isSelected && "text-muted-foreground"
                          )}>
                            {metric.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Chart Type Selector */}
          <div className="flex rounded-lg border border-border overflow-hidden bg-muted/30 p-0.5 sm:p-1">
            <button
              onClick={() => setViewType("bar")}
              className={cn(
                "px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all rounded-md flex items-center gap-1 sm:gap-2",
                viewType === "bar"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Bar</span>
            </button>
            <button
              onClick={() => setViewType("line")}
              className={cn(
                "px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all rounded-md flex items-center gap-1 sm:gap-2",
                viewType === "line"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Line</span>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full h-[320px] sm:h-[calc(100%-120px)] lg:h-[85%] overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="min-w-[600px] sm:min-w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            {viewType === "bar" ? (
              <BarChart 
                data={filteredData} 
                margin={{ top: 10, right: 5, left: -5, bottom: 40 }}
                barCategoryGap="10%"
              >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
                opacity={0.3}
              />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 500 }}
                className="sm:text-xs lg:text-sm"
                type="category"
                allowDuplicatedCategory={false}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={50}
                tickFormatter={(value) => value}
                minTickGap={0}
              />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8, fontWeight: 500 }}
              className="sm:text-xs lg:text-sm"
              width={30}
              domain={[0, 'auto']}
              tickFormatter={(value) => {
                // Use first selected metric for formatting (or default to Sales)
                const primaryMetric = activeMetrics[0] || 'Sales';
                if (primaryMetric === 'Sale Volume') {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M L`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K L`;
                  return `${value} L`;
                } else if (primaryMetric === 'PPL') {
                  return `${value.toFixed(2)} p`;
                } else {
                  // Sales or Profit
                  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
                  return `£${value}`;
                }
              }}
            />
            <Tooltip 
              content={tooltipComponent}
              cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
              shared={true}
              isAnimationActive={false}
              labelFormatter={(value) => value || ''}
              wrapperStyle={{
                zIndex: 99999,
                visibility: 'visible',
                opacity: 1,
              }}
              contentStyle={{
                backgroundColor: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: '11px',
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "10px", fontSize: "10px" }}
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <span className="text-xs sm:text-sm font-medium capitalize text-foreground">{value}</span>
              )}
            />
            {activeMetrics.map((metric, index) => {
              const metricKey = metricKeyMap[metric] || 'sales';
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
              const color = colors[index % colors.length];
              
              return (
                <Bar 
                  key={metric}
                  dataKey={metricKey}
                  fill={color}
                  radius={index === activeMetrics.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={800}
                  name={metric}
                />
              );
            })}
          </BarChart>
        ) : (
          <LineChart 
            data={filteredData}
            margin={{ top: 10, right: 5, left: -5, bottom: 40 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              vertical={false}
              opacity={0.3}
            />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 500 }}
              className="sm:text-xs lg:text-sm"
              type="category"
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
              tickFormatter={(value) => value}
              minTickGap={0}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8, fontWeight: 500 }}
              className="sm:text-xs lg:text-sm"
              width={30}
              tickFormatter={(value) => {
                // Use first selected metric for formatting (or default to Sales)
                const primaryMetric = activeMetrics[0] || 'Sales';
                if (primaryMetric === 'Sale Volume') {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M L`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K L`;
                  return `${value} L`;
                } else if (primaryMetric === 'PPL') {
                  return `${value.toFixed(2)} p`;
                } else {
                  // Sales or Profit
                  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
                  return `£${value}`;
                }
              }}
            />
            <Tooltip 
              content={tooltipComponent}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "10px", fontSize: "10px" }}
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <span className="text-xs sm:text-sm font-medium capitalize text-foreground">{value}</span>
              )}
            />
            {activeMetrics.map((metric, index) => {
              const metricKey = metricKeyMap[metric] || 'sales';
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
              const color = colors[index % colors.length];
              
              return (
                <Line 
                  key={metric}
                  type="monotone" 
                  dataKey={metricKey}
                  stroke={color}
                  strokeWidth={3} 
                  dot={{ r: 5, fill: color, strokeWidth: 2, stroke: "hsl(var(--card))" }} 
                  activeDot={{ r: 7, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={true}
                  animationDuration={800}
                  name={metric}
                />
              );
            })}
          </LineChart>
        )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const MonthlyPerformanceChart = memo(MonthlyPerformanceChartComponent);
