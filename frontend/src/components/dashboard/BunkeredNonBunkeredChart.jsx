import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Package } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  { name: "Bunkered", color: "#ef4444" },
  { name: "Non-Bunkered", color: "#22c55e" },
];

export const BunkeredNonBunkeredChart = ({ startDate, endDate, onBreakdown }) => {
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
        console.log('📦 [BunkeredNonBunkeredChart] Fetching bunkered/non-bunkered data:', { startDate, endDate });
        
        const data = await dashboardAPI.getPetrolFuelVolumeBreakdown(startDate, endDate);
        
        console.log('📦 [BunkeredNonBunkeredChart] Received data:', data);
        
        // Transform API data to pie chart format
        const breakdown = data?.breakdown || [];
        
        // Only show data from API; no hardcoded fallback
        if (breakdown.length > 0) {
          const totalVol = data?.totalVolume || 1;
          const chartDataFromAPI = breakdown.map((item) => ({
            name: item.name || item.code,
            value: item.volume || 0,
            percentage: totalVol > 0 ? Math.round((item.volume / totalVol) * 100) : 0,
            color: item.name === "Bunkered" ? "#ef4444" : "#22c55e"
          }));
          setChartData(chartDataFromAPI);
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error('❌ [BunkeredNonBunkeredChart] Error fetching data:', err);
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
          label: 'Volume',
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
              `Volume: ${(value / 1000000).toFixed(2)}M litres`,
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
              <Package className="w-5 h-5 text-red-500" />
              Fuel Supply Type
            </CardTitle>
            <CardDescription>
              Bunkered vs Non-Bunkered fuel distribution
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
                    Total Volume
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {(total / 1000000).toFixed(2)}M L
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
                      {(item.value / 1000000).toFixed(2)}M L
                    </span>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-2 mt-2 font-bold">
                <span className="text-sm">Total</span>
                <span className="text-sm">{(total / 1000000).toFixed(2)}M L</span>
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
