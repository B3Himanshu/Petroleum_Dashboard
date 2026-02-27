import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardAPI } from "@/services/api";

export const OverheadTrendsChart = ({ startDate, endDate, siteIds }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await dashboardAPI.getPetrolOverheadTrends(startDate, endDate, siteIds);
        const data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setChartData(data);
      } catch (err) {
        console.error('❌ [OverheadTrendsChart] Error:', err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, siteIds]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold">{data.month}</p>
          <p className="text-sm text-blue-600">Wages (7000, 7006, 7007): £{((data.labour || 0) / 1000).toFixed(0)}K</p>
          <p className="text-sm text-cyan-600">Electricity (7200): £{((data.utilities || 0) / 1000).toFixed(0)}K</p>
          <p className="text-sm text-orange-600">Maintenance (7300–7399): £{((data.maintenance || 0) / 1000).toFixed(0)}K</p>
          <p className="text-sm text-violet-600">Rent (7100): £{((data.rent || 0) / 1000).toFixed(0)}K</p>
          <p className="text-sm text-purple-600">General Rates (7103): £{((data.generalRates || 0) / 1000).toFixed(0)}K</p>
          <p className="text-sm text-fuchsia-600">Credit Charges (7905): £{((data.creditCharges || 0) / 1000).toFixed(0)}K</p>
          <p className="text-sm font-bold border-t pt-1 mt-1">Total: £{((data.total || 0) / 1000).toFixed(0)}K</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card ref={chartRef}>
      <CardContent>
        {loading ? (
          <div className="h-80 bg-muted animate-pulse rounded-lg" />
        ) : chartData.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorLabour" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorUtilities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMaintenance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGeneralRates" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCreditCharges" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c026d3" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#c026d3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  label={{ value: 'Cost (£)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={25}
                  wrapperStyle={{ paddingBottom: '10px' }}
                />
                <Area
                  type="monotone"
                  dataKey="labour"
                  stackId="1"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorLabour)"
                  name="Wages (7000, 7006, 7007)"
                />
                <Area
                  type="monotone"
                  dataKey="utilities"
                  stackId="1"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#colorUtilities)"
                  name="Electricity (7200)"
                />
                <Area
                  type="monotone"
                  dataKey="maintenance"
                  stackId="1"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorMaintenance)"
                  name="Maintenance (7300–7399)"
                />
                <Area
                  type="monotone"
                  dataKey="rent"
                  stackId="1"
                  stroke="#7c3aed"
                  fillOpacity={1}
                  fill="url(#colorRent)"
                  name="Rent (7100)"
                />
                <Area
                  type="monotone"
                  dataKey="generalRates"
                  stackId="1"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorGeneralRates)"
                  name="General Rates (7103)"
                />
                <Area
                  type="monotone"
                  dataKey="creditCharges"
                  stackId="1"
                  stroke="#c026d3"
                  fillOpacity={1}
                  fill="url(#colorCreditCharges)"
                  name="Credit Charges (7905)"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Avg Wages (7000, 7006, 7007)</p>
                <p className="text-lg font-bold text-blue-600">
                  £{(chartData.reduce((sum, item) => sum + (item.labour || 0), 0) / chartData.length / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Avg Electricity (7200)</p>
                <p className="text-lg font-bold text-cyan-600">
                  £{(chartData.reduce((sum, item) => sum + (item.utilities || 0), 0) / chartData.length / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Avg Maintenance (7300–7399)</p>
                <p className="text-lg font-bold text-orange-600">
                  £{(chartData.reduce((sum, item) => sum + (item.maintenance || 0), 0) / chartData.length / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Avg Rent (7100)</p>
                <p className="text-lg font-bold text-violet-600">
                  £{(chartData.reduce((sum, item) => sum + (item.rent || 0), 0) / chartData.length / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Avg General Rates (7103)</p>
                <p className="text-lg font-bold text-purple-600">
                  £{(chartData.reduce((sum, item) => sum + (item.generalRates || 0), 0) / chartData.length / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-950/20 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Avg Credit Charges (7905)</p>
                <p className="text-lg font-bold text-fuchsia-600">
                  £{(chartData.reduce((sum, item) => sum + (item.creditCharges || 0), 0) / chartData.length / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
