import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { dashCartesianGridProps } from "@/lib/dashboardChartTypography";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export const ROITrendChart = ({ startDate, endDate }) => {
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
        // ROI by site — no dedicated API for this chart; show empty until API available
        setChartData([]);
      } catch (err) {
        console.error('❌ [ROITrendChart] Error:', err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold">{data.site}</p>
          <p className="text-sm text-green-600">ROI: {data.roi.toFixed(1)}%</p>
          <p className="text-sm text-blue-600">Net Profit: £{(data.netProfit / 1000).toFixed(0)}K</p>
          <p className="text-sm text-orange-600">Op. Cost: £{(data.operatingCost / 1000).toFixed(0)}K</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card ref={chartRef}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Top Performing Sites - ROI Ranking
        </CardTitle>
        <CardDescription>
          Return on Investment by site. Data from API when available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 bg-muted animate-pulse rounded-lg" />
        ) : chartData.length > 0 ? (
          <div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid {...dashCartesianGridProps} vertical={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="site"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={25}
                  wrapperStyle={{ paddingBottom: '10px' }}
                />
                <Bar
                  dataKey="roi"
                  fill="#10b981"
                  name="ROI %"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Top 3 Sites Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 border-t">
              {chartData.slice(0, 3).map((item, index) => (
                <div
                  key={item.site}
                  className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-950/10 rounded-lg border border-emerald-200 dark:border-emerald-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm text-foreground">{index + 1}. {item.site}</h4>
                    <span className="text-xs font-bold bg-emerald-200 dark:bg-emerald-800 px-2 py-1 rounded text-emerald-900 dark:text-emerald-100">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ROI:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{item.roi.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Profit:</span>
                      <span className="font-medium">£{(item.netProfit / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                </div>
              ))}
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
