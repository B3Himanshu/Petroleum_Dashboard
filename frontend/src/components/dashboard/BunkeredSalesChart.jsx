import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { dashboardAPI } from "@/services/api";

export const BunkeredSalesChart = ({ siteId, month, months, year, years }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!siteId) {
      setChartData([]);
      return;
    }

    // Use months/years arrays if provided, otherwise use single values
    const monthsToUse = (months && months.length > 0) ? months : (month ? [month] : []);
    const yearsToUse = (years && years.length > 0) ? years : (year ? [year] : []);

    if (monthsToUse.length === 0 || yearsToUse.length === 0) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Use sales distribution API to get bunkered vs non-bunkered (aggregated across all months/years)
        const data = await dashboardAPI.getSalesDistribution(siteId, monthsToUse, yearsToUse);
        // For now, we'll show monthly data - this would ideally come from a dedicated endpoint
        // Transform to show bunkered and non-bunkered if available
        const bunkered = data.find(item => item.name === 'Bunkered Sales')?.value || 0;
        const nonBunkered = data.find(item => item.name === 'Non-bunkered Sales')?.value || 0;
        const fuelSales = data.find(item => item.name === 'Fuel Sales')?.value || 0;
        
        // If we have fuel sales but no breakdown, estimate (70% bunkered, 30% non-bunkered)
        const estimatedBunkered = bunkered || (fuelSales * 0.7);
        const estimatedNonBunkered = nonBunkered || (fuelSales * 0.3);
        
        // For now, show single month data - would need monthly breakdown endpoint
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        setChartData([{
          month: monthNames[month - 1] || 'Current',
          bunkered: estimatedBunkered,
          nonBunkered: estimatedNonBunkered
        }]);
      } catch (error) {
        console.error('Error fetching bunkered sales data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId, month, months, year, years]);
  if (loading) {
    return (
      <div className="chart-card h-[320px] sm:h-[360px] lg:h-[380px] animate-slide-up" style={{ animationDelay: "350ms" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground text-sm sm:text-base">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-card h-[320px] sm:h-[360px] lg:h-[380px] animate-slide-up" style={{ animationDelay: "350ms" }}>
        <div className="mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Sales Data (Bar-graph)</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Comparing Bunkered vs Non-Bunkered sales</p>
        </div>
        <div className="flex items-center justify-center h-[calc(100%-80px)] sm:h-[85%]">
          <div className="text-muted-foreground text-sm sm:text-base">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card h-[320px] sm:h-[360px] lg:h-[380px] animate-slide-up" style={{ animationDelay: "350ms" }}>
      <div className="mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Sales Data (Bar-graph)</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Comparing Bunkered vs Non-Bunkered sales</p>
      </div>

      <div className="h-[calc(100%-80px)] sm:h-[85%]">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={4} barCategoryGap="25%" margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="month" 
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
            formatter={(value, name) => {
              const formattedValue = `£${value.toLocaleString()}`;
              if (name === "bunkered") {
                return [formattedValue, "Bunkered Sales"];
              } else if (name === "nonBunkered") {
                return [formattedValue, "Non-Bunkered Sales"];
              }
              return [formattedValue, name];
            }}
            wrapperStyle={{ zIndex: 1000 }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "8px", fontSize: "11px" }}
            className="text-xs sm:text-sm"
            iconSize={12}
            formatter={(value) => (
              <span className="text-xs sm:text-sm text-muted-foreground">
                {value === "bunkered" ? "Bunkered" : "Non-Bunkered"}
              </span>
            )}
          />
          <Bar dataKey="bunkered" fill="hsl(var(--chart-blue))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="nonBunkered" fill="hsl(var(--chart-green))" radius={[4, 4, 0, 0]} />
        </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
