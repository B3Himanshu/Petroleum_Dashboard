import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { dashCartesianGridProps } from "@/lib/dashboardChartTypography";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export const ShopValetMarginsChart = ({ startDate, endDate, mode }) => {
  const showOnlyValet = mode === "valet";
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
        console.log('📈 [ShopValetMarginsChart] Fetching margins data:', { startDate, endDate });
        
        // Generate weekly data points for margin trends
        // In production, this would come from an API endpoint
        const start = new Date(startDate);
        const end = new Date(endDate);
        const data = [];
        
        let current = new Date(start);
        let week = 1;
        let baseShopMargin = 18;
        let baseValetMargin = 28;
        
        while (current <= end) {
          const weekLabel = `Week ${week}`;
          const shopMargin = baseShopMargin + (Math.random() - 0.5) * 4; // Fluctuate ±2%
          const valetMargin = baseValetMargin + (Math.random() - 0.5) * 6; // Fluctuate ±3%
          
          data.push({
            week: weekLabel,
            date: current.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
            shopMargin: Math.max(10, Math.min(30, shopMargin)),
            valetMargin: Math.max(20, Math.min(40, valetMargin))
          });
          
          current.setDate(current.getDate() + 7);
          week++;
        }
        
        setChartData(data);
      } catch (err) {
        console.error('❌ [ShopValetMarginsChart] Error fetching data:', err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold">{payload[0].payload.week}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card ref={chartRef}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          {showOnlyValet ? "Coffee & Valet margin" : "Shop & Coffee & Valet margins trend"}
        </CardTitle>
        <CardDescription>
          {showOnlyValet ? "Coffee & Valet margin over time" : "Weekly profit margin comparison"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-80 bg-muted animate-pulse rounded-lg" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid {...dashCartesianGridProps} vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12 }}
                interval={Math.max(0, Math.floor(chartData.length / 6))}
              />
              <YAxis
                width={72}
                label={{
                  value: "Margin %",
                  angle: -90,
                  position: "left",
                  offset: 6,
                  dx: -4,
                  style: { fontSize: 12, fontWeight: 600 },
                }}
                tick={{ fontSize: 12 }}
                domain={[0, 45]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={25}
                wrapperStyle={{ paddingBottom: '20px' }}
              />
              {!showOnlyValet && (
                <Line
                  type="monotone"
                  dataKey="shopMargin"
                  stroke="#f59e0b"
                  dot={{ fill: '#f59e0b', r: 4 }}
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                  name="Shop Margin"
                />
              )}
              <Line
                type="monotone"
                dataKey="valetMargin"
                stroke="#8b5cf6"
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
                name="Coffee & Valet margin"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
