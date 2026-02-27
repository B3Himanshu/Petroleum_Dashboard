import { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { BarChart3 } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const MonthlyPerformanceTrendsChart = ({ startDate, endDate }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📊 [MonthlyPerformanceTrendsChart] Fetching monthly trends:', { startDate, endDate });
        
        const response = await dashboardAPI.getPetrolMonthlyTrends(startDate, endDate);
        
        console.log('📊 [MonthlyPerformanceTrendsChart] Received data:', response);
        
        // Transform API response to chart format
        const labels = response.map(item => item.month_name);
        const sales = response.map(item => item.sales);
        const volume = response.map(item => item.volume);
        const profit = response.map(item => item.profit);
        
        setChartData({
          labels,
          sales,
          volume,
          profit
        });
      } catch (err) {
        console.error('❌ [MonthlyPerformanceTrendsChart] Error fetching data:', err);
        setError(err.message);
        setChartData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Create chart data for Chart.js
  const createChartData = () => {
    if (!chartData) return null;

    return {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Sales',
          data: chartData.sales,
          backgroundColor: '#ef4444',
          borderRadius: 4,
        },
        {
          label: 'Volume',
          data: chartData.volume,
          backgroundColor: '#06b6d4',
          borderRadius: 4,
        },
        {
          label: 'Profit',
          data: chartData.profit,
          backgroundColor: '#f59e0b',
          borderRadius: 4,
        }
      ],
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: 'hsl(var(--foreground))',
          font: {
            size: 12,
            weight: 500
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
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
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${(value / 1000).toFixed(1)}K`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          font: {
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          font: {
            size: 11
          },
          callback: function(value) {
            return (value / 1000).toFixed(0) + 'K';
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  const barChartData = createChartData();

  return (
    <Card ref={chartRef} className="col-span-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          Monthly Performance Trends
        </CardTitle>
        <CardDescription>
          Sales, Volume, and Profit comparison over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        ) : error ? (
          <div className="h-96 flex items-center justify-center text-destructive text-sm">
            <p>{error}</p>
          </div>
        ) : barChartData ? (
          <div style={{ height: '400px' }}>
            <Bar 
              ref={chartRef}
              data={barChartData} 
              options={chartOptions}
            />
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
