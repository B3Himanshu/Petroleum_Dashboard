import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dashboardAPI } from "@/services/api";

// Month number to name mapping
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DateWiseChart = ({ selectedMonths = [], siteId, years = [] }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonthFilter, setCurrentMonthFilter] = useState(null);
  
  // Use first month if only one selected, or allow filtering if multiple
  // Default to October (month 10) as that's when data starts in 2025
  const monthsToUse = selectedMonths.length > 0 ? selectedMonths : [10]; // Default to October
  const yearsToUse = years.length > 0 ? years : [2025]; // Default to 2025
  
  const showMonthFilter = selectedMonths.length > 1;
  // Default to first month that likely has data (October or November)
  const defaultMonthValue = showMonthFilter 
    ? (selectedMonths.includes(10) ? 10 : selectedMonths[0]) 
    : monthsToUse[0];
  
  // Initialize currentMonthFilter
  useEffect(() => {
    if (showMonthFilter && !currentMonthFilter) {
      setCurrentMonthFilter(defaultMonthValue);
    }
  }, [showMonthFilter, defaultMonthValue, currentMonthFilter]);
  
  useEffect(() => {
    if (!siteId || monthsToUse.length === 0 || yearsToUse.length === 0) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // If multiple months selected and filter is set, use filtered month
        const monthToFetch = showMonthFilter && currentMonthFilter 
          ? [currentMonthFilter] 
          : monthsToUse;
        
        console.log('📅 [DateWiseChart] Fetching data:', {
          siteId,
          monthToFetch,
          yearsToUse,
          showMonthFilter,
          currentMonthFilter
        });
        
        const data = await dashboardAPI.getDateWiseData(siteId, monthToFetch, yearsToUse);
        
        console.log('📅 [DateWiseChart] Received data:', {
          dataLength: data.length,
          sampleData: data.slice(0, 3)
        });
        
        setChartData(data || []);
      } catch (error) {
        console.error('Error fetching date-wise data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId, monthsToUse, yearsToUse, currentMonthFilter, showMonthFilter]);
  
  // Filter data to show only up to current date if viewing current month
  const filteredData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    
    // If viewing current month/year, filter out future dates
    const viewingCurrentMonth = yearsToUse.includes(currentYear) && 
                                 (currentMonthFilter ? currentMonthFilter === currentMonth : monthsToUse.includes(currentMonth));
    
    if (viewingCurrentMonth) {
      return chartData.filter((item) => item.day <= currentDay);
    }
    
    return chartData;
  }, [chartData, currentMonthFilter, monthsToUse, yearsToUse]);

  // Always show month filter when multiple months are selected, even if there's no data
  const shouldShowMonthFilter = selectedMonths.length > 1 || selectedMonths.length === 0;
  
  return (
    <div className="chart-card h-[320px] sm:h-[360px] lg:h-[380px] animate-slide-up" style={{ animationDelay: "450ms" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Date-Wise Data (Line chart)</h3>
        {shouldShowMonthFilter && (
          <Select 
            value={currentMonthFilter ? currentMonthFilter.toString() : defaultMonthValue.toString()} 
            onValueChange={(value) => {
              const newMonth = parseInt(value, 10);
              setCurrentMonthFilter(newMonth);
              console.log('📅 [DateWiseChart] Month filter changed to:', newMonth);
            }}
          >
            <SelectTrigger className="w-full sm:w-40 bg-background border-border h-9 sm:h-10 text-sm">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {selectedMonths.length > 0 ? (
                selectedMonths.map((month) => {
                  const monthNum = typeof month === 'number' ? month : parseInt(month, 10);
                  const monthName = monthNum >= 1 && monthNum <= 12 ? MONTH_NAMES[monthNum - 1] : month;
                  return (
                    <SelectItem key={month} value={monthNum.toString()}>
                      {monthName}
                    </SelectItem>
                  );
                })
              ) : (
                // If no months selected, show all 12 months
                MONTH_NAMES.map((monthName, index) => (
                  <SelectItem key={index + 1} value={(index + 1).toString()}>
                    {monthName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[calc(100%-80px)] sm:h-[85%]">
          <div className="text-muted-foreground text-sm sm:text-base">Loading date-wise data...</div>
        </div>
      ) : !chartData || chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100%-80px)] sm:h-[85%]">
          <div className="text-muted-foreground mb-2 text-sm sm:text-base text-center px-2">No data available for the selected period.</div>
          {shouldShowMonthFilter && (
            <div className="text-xs text-muted-foreground text-center px-2">Try selecting a different month from the dropdown above.</div>
          )}
        </div>
      ) : (
        <div className="h-[calc(100%-80px)] sm:h-[85%]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-blue))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-blue))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                className="sm:text-xs lg:text-sm"
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                className="sm:text-xs lg:text-sm"
                width={50}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toString();
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                  padding: "8px",
                  maxWidth: "200px",
                }}
                formatter={(value) => [`£${value.toLocaleString()}`, "Sales"]}
                labelFormatter={(label) => `Day ${label}`}
                wrapperStyle={{ zIndex: 1000 }}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="hsl(var(--chart-blue))" 
                strokeWidth={2}
                fill="url(#salesGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
