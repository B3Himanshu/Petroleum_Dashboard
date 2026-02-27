import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { DollarSign } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  { name: "Bunkered", color: "#ef4444" },
  { name: "Non-Bunkered", color: "#22c55e" },
];

export const BunkeredNonBunkeredSalesChart = ({ startDate, endDate, onBreakdown }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('💰 [BunkeredNonBunkeredSalesChart] Fetching sales data:', { startDate, endDate });
        
        const [bunkeredData, nonBunkeredData] = await Promise.all([
          dashboardAPI.getPetrolBunkeredBreakdown(startDate, endDate),
          dashboardAPI.getPetrolNonBunkeredBreakdown(startDate, endDate)
        ]);
        
        const bunkeredSales = bunkeredData?.sales || 0;
        const nonBunkeredSales = nonBunkeredData?.sales || 0;
        const totalSales = bunkeredSales + nonBunkeredSales;
        
        const bunkeredPercentage = totalSales > 0 ? Math.round((bunkeredSales / totalSales) * 100) : 0;
        const nonBunkeredPercentage = totalSales > 0 ? Math.round((nonBunkeredSales / totalSales) * 100) : 0;
        
        const salesData = [
          {
            name: "Bunkered",
            value: bunkeredSales,
            percentage: bunkeredPercentage,
            color: "#ef4444"
          },
          {
            name: "Non-Bunkered",
            value: nonBunkeredSales,
            percentage: nonBunkeredPercentage,
            color: "#22c55e"
          }
        ];
        
        setChartData(salesData);
      } catch (err) {
        console.error('❌ [BunkeredNonBunkeredSalesChart] Error fetching data:', err);
        setError(err.message);
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
              `Sales: £${(value / 1000000).toFixed(2)}M`,
              `${item.percentage}% of total`
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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Bunkered vs Non-Bunkered Sales
            </CardTitle>
            <CardDescription>
              Sales distribution by fuel supply type
            </CardDescription>
          </div>
          {onBreakdown && (
            <button
              onClick={onBreakdown}
              className="text-xs text-blue-500 hover:text-blue-400 font-medium transition-colors flex items-center gap-1"
            >
              View Breakdown
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-destructive text-sm">
            <p>{error}</p>
          </div>
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
                    £{(total / 1000000).toFixed(2)}M
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
                      £{(item.value / 1000000).toFixed(2)}M
                    </span>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-2 mt-2 font-bold">
                <span className="text-sm">Total</span>
                <span className="text-sm">£{(total / 1000000).toFixed(2)}M</span>
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
