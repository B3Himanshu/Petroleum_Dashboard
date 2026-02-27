import { useState, useEffect } from "react";
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
import { TrendingUp } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth } from "date-fns";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const BunkeredNonBunkeredProfitComparison = ({ startDate, endDate, siteIds }) => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) {
      setMonthlyData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Calculate months in range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const months = [];
        
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        
        while (current <= endMonth) {
          months.push({
            year: current.getFullYear(),
            month: current.getMonth(),
            date: new Date(current)
          });
          current.setMonth(current.getMonth() + 1);
        }
        
        console.log('📈 [ProfitComparison] Fetching data for months:', months);
        
        // Single month - don't show comparison
        if (months.length === 1) {
          setMonthlyData([]);
          return;
        }
        
        // Fetch data for each month
        const monthlyResults = await Promise.all(
          months.map(async (m) => {
            const monthStart = format(startOfMonth(m.date), 'yyyy-MM-dd');
            const monthEnd = format(endOfMonth(m.date), 'yyyy-MM-dd');
            
            const data = await dashboardAPI.getPetrolProfitBreakdown(monthStart, monthEnd, siteIds);
            
            const breakdown = data?.breakdown || [];
            const bunkered = breakdown.find(b => b.name === "Bunkered")?.profit || 0;
            const nonBunkered = breakdown.find(b => b.name === "Non-Bunkered")?.profit || 0;
            
            return {
              label: format(m.date, 'MMM yyyy'),
              bunkered: bunkered / 1000000, // Convert to millions
              nonBunkered: nonBunkered / 1000000,
              total: (bunkered + nonBunkered) / 1000000
            };
          })
        );
        
        console.log('📈 [ProfitComparison] Monthly results:', monthlyResults);
        setMonthlyData(monthlyResults);
      } catch (err) {
        console.error('❌ [ProfitComparison] Error fetching data:', err);
        setError(err.message);
        setMonthlyData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, siteIds]);

  // Create chart data for Chart.js
  const createChartData = () => {
    return {
      labels: monthlyData.map(m => m.label),
      datasets: [
        {
          label: 'Bunkered',
          data: monthlyData.map(m => m.bunkered),
          backgroundColor: '#ef4444',
          borderColor: '#ef4444',
          borderWidth: 0,
          borderRadius: 6,
        },
        {
          label: 'Non-Bunkered',
          data: monthlyData.map(m => m.nonBunkered),
          backgroundColor: '#22c55e',
          borderColor: '#22c55e',
          borderWidth: 0,
          borderRadius: 6,
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
        display: true,
        position: 'top',
        labels: {
          color: '#94a3b8',
          font: {
            size: 14,
            weight: 500,
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'hsl(222, 47%, 11%)',
        borderColor: 'hsl(217, 33%, 17%)',
        borderWidth: 1,
        padding: 12,
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: £${value.toFixed(2)}M`;
          }
        }
      },
    },
    scales: {
      x: {
        stacked: false,
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 13,
          },
        },
        border: {
          color: '#334155',
        },
      },
      y: {
        stacked: false,
        beginAtZero: true,
        grid: {
          color: '#1e293b',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 13,
          },
          callback: function(value) {
            return '£' + value.toFixed(1) + 'M';
          },
        },
        border: {
          display: false,
        },
      },
    },
  };

  // If loading or only 1 month, don't show this component
  if (loading || monthlyData.length <= 1) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Please select multiple months to view comparison</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-destructive text-sm">
        <p>{error}</p>
      </div>
    );
  }

  if (monthlyData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {monthlyData.length > 0 && (
          <div className="space-y-2">
            {/* Chart Container */}
            <div className="w-full h-[300px]">
              <Bar data={createChartData()} options={chartOptions} />
            </div>

            {/* Data table */}
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-3 text-sm font-semibold text-muted-foreground pb-2 border-b">
                <div className="truncate">Month</div>
                <div className="text-right truncate">Bunkered</div>
                <div className="text-right truncate">Non-Bunk</div>
                <div className="text-right truncate">Total</div>
              </div>
              {monthlyData.map((item, index) => (
                <div key={index} className="grid grid-cols-4 gap-3 text-sm py-1">
                  <div className="font-medium truncate">{item.label}</div>
                  <div className="text-right truncate">£{item.bunkered.toFixed(2)}M</div>
                  <div className="text-right truncate">£{item.nonBunkered.toFixed(2)}M</div>
                  <div className="text-right font-semibold truncate">£{item.total.toFixed(2)}M</div>
                </div>
              ))}
              <div className="grid grid-cols-4 gap-3 text-sm font-bold border-t pt-2">
                <div className="truncate">Total</div>
                <div className="text-right truncate">£{monthlyData.reduce((sum, m) => sum + m.bunkered, 0).toFixed(2)}M</div>
                <div className="text-right truncate">£{monthlyData.reduce((sum, m) => sum + m.nonBunkered, 0).toFixed(2)}M</div>
                <div className="text-right truncate">£{monthlyData.reduce((sum, m) => sum + m.total, 0).toFixed(2)}M</div>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};
