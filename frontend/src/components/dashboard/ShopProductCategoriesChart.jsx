import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { ShoppingBag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  { name: "Tobacco", color: "#8b5cf6" },
  { name: "Vape", color: "#ec4899" },
  { name: "Alcohol", color: "#f97316" },
  { name: "Food & Drinks", color: "#eab308" },
  { name: "Coffee", color: "#a16207" },
];

export const ShopProductCategoriesChart = ({ startDate, endDate }) => {
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
        // Shop categories not in Sage (HSRL); no API — show empty until API available
        setChartData([]);
      } catch (err) {
        console.error('❌ [ShopProductCategoriesChart] Error:', err);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Create chart data for Chart.js
  const createChartData = () => {
    return {
      labels: chartData.map(item => item.name),
      datasets: [
        {
          label: 'Sales',
          data: chartData.map(item => item.value),
          backgroundColor: chartData.map(item => item.color),
          borderColor: 'hsl(var(--card))',
          borderWidth: 5,
          borderRadius: 6,
          spacing: 6,
          cutout: '60%',
        },
      ],
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
            const value = context.parsed;
            const item = chartData[context.dataIndex];
            return [
              `Sales: £${(value / 1000).toFixed(1)}K`,
              `${item.percentage}% of sales`
            ];
          }
        }
      },
    },
    animation: {
      animateRotate: true,
      animateScale: false,
    },
  };

  const doughnutChartData = createChartData();

  return (
    <Card ref={chartRef}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-purple-500" />
          Shop Product Categories
        </CardTitle>
        <CardDescription>
          Top 5 categories by sales volume. Data from API when available (Sage/HSRL).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        ) : chartData.length > 0 ? (
          <div className="space-y-4">
            {/* Chart Container */}
            <div className="w-full relative flex items-center justify-center" style={{ height: '280px' }}>
              <div className="w-full h-full" style={{ maxWidth: '280px', position: 'relative' }}>
                <Doughnut 
                  ref={chartRef}
                  data={doughnutChartData} 
                  options={chartOptions}
                />
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Total Sales
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    £{(total / 1000).toFixed(1)}K
                  </span>
                </div>
              </div>
            </div>

            {/* Data table */}
            <div className="space-y-2 pt-4 border-t">
              {chartData.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      £{(item.value / 1000).toFixed(1)}K
                    </span>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-2 mt-2 font-bold">
                <span className="text-sm">Total</span>
                <span className="text-sm">£{(total / 1000).toFixed(1)}K</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
