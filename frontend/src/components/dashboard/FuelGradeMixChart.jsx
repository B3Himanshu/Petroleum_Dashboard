import { useState, useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { TrendingUp } from "lucide-react";
import { dashboardAPI } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = [
  { name: "Petrol", color: "#f59e0b" },
  { name: "Diesel", color: "#10b981" },
  { name: "Super Petrol", color: "#8b5cf6" },
  { name: "Super Diesel", color: "#3b82f6" },
  { name: "AdBlue", color: "#06b6d4" },
];

export const FuelGradeMixChart = ({ startDate, endDate, siteIds }) => {
  const [chartData, setChartData] = useState([]);
  const [totalProfit, setTotalProfit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("volume"); // "volume" | "profit"
  const chartRef = useRef(null);

  const [volumeData, setVolumeData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [totalVolumeL, setTotalVolumeL] = useState(0);
  const [totalSalesValue, setTotalSalesValue] = useState(0);

  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      setVolumeData([]);
      setSalesData([]);
      setTotalVolumeL(0);
      setTotalSalesValue(0);
      setTotalProfit(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [transitionRes, gradeRes, profitRes] = await Promise.all([
          dashboardAPI.getPetrolFuelVolumeTransitionBreakdown(startDate, endDate, siteIds),
          dashboardAPI.getPetrolFuelGradeBreakdown(startDate, endDate, siteIds),
          dashboardAPI.getPetrolProfit(startDate, endDate, siteIds),
        ]);

        const transitionData = transitionRes?.data ?? transitionRes ?? {};
        const gradeData = gradeRes?.data ?? gradeRes ?? {};
        const byNominalCode = transitionData.byNominalCode || [];
        const totalVolL = Number(transitionData.totalVolume) || 0;
        setTotalVolumeL(totalVolL);

        const gradeBreakdown = gradeData.breakdown || [];
        const totalSales = Math.abs(Number(gradeData.totalVolume) || 0);
        setTotalSalesValue(totalSales);

        const rawProfit = Number(profitRes?.totalProfit ?? profitRes?.data?.totalProfit ?? 0) || 0;
        setTotalProfit(-rawProfit);

        const colorMap = {
          'Petrol': '#f59e0b',
          'Diesel': '#10b981',
          'Ultimate Petrol': '#8b5cf6',
          'Super Petrol': '#8b5cf6',
          'Ultimate Diesel': '#3b82f6',
          'Super Diesel': '#3b82f6',
          'Adblue': '#06b6d4',
          'AdBlue': '#06b6d4',
        };

        const volData = byNominalCode.length > 0
          ? byNominalCode.map((item) => {
              const volL = Math.abs(Number(item.volume) || 0);
              const pct = totalVolL > 0 ? parseFloat(((volL / totalVolL) * 100).toFixed(1)) : 0;
              return {
                name: item.name || item.code,
                value: volL,
                percentage: pct,
                color: colorMap[item.name] || '#6b7280',
              };
            })
          : [];
        setVolumeData(volData);

        const salesDataArr = gradeBreakdown.map((item) => {
          const sales = Math.abs(parseFloat(item.volume) || 0);
          const pct = totalSales > 0 ? parseFloat(((sales / totalSales) * 100).toFixed(1)) : 0;
          return {
            name: item.name,
            value: sales,
            percentage: pct,
            color: colorMap[item.name] || '#6b7280',
          };
        });
        setSalesData(salesDataArr);
        setChartData(byNominalCode.length > 0 ? volData : salesDataArr);
      } catch (err) {
        console.error('❌ [FuelGradeMixChart] Error fetching data:', err);
        setError(err.message);
        setChartData([]);
        setVolumeData([]);
        setSalesData([]);
        setTotalVolumeL(0);
        setTotalSalesValue(0);
        setTotalProfit(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, siteIds]);

  const profitTotal = totalProfit ?? 0;
  const isVolumeMode = viewMode === "volume";
  const hasVolume = volumeData.length > 0 && totalVolumeL > 0;
  const displayData = isVolumeMode && hasVolume
    ? volumeData
    : isVolumeMode
      ? salesData
      : totalSalesValue > 0 && salesData.length > 0
        ? salesData.map((item) => ({
            ...item,
            value: (item.value / totalSalesValue) * profitTotal,
          }))
        : [];
  const total = isVolumeMode
    ? (hasVolume ? totalVolumeL : totalSalesValue)
    : profitTotal;

  const createChartData = () => ({
    labels: displayData.map(item => item.name),
    datasets: [
      {
        label: isVolumeMode ? (hasVolume ? "Volume" : "Sales value") : "Profit",
        data: displayData.map(item => item.value),
        backgroundColor: displayData.map(item => item.color),
        borderColor: 'hsl(var(--card))',
        borderWidth: 5,
        borderRadius: 6,
        spacing: 6,
        cutout: '60%',
      },
    ],
  });

  const formatVolume = (L) => {
    const n = Math.abs(Number(L) ?? 0);
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)} ML`;
    if (n >= 1000) return `${(n / 1000).toFixed(2)} KL`;
    return `${n.toFixed(2)} L`;
  };
  const formatCurrency = (v) => {
    const n = Math.abs(Number(v) ?? 0);
    if (n >= 1e6) return `£${(n / 1e6).toFixed(2)}M`;
    if (n >= 1000) return `£${(n / 1000).toFixed(2)}K`;
    return `£${n.toFixed(2)}`;
  };
  const valueLabel = isVolumeMode && hasVolume ? "Volume" : isVolumeMode ? "Sales value (£)" : "Profit (£)";
  const centerLabel = isVolumeMode && hasVolume ? "Total (volume)" : isVolumeMode ? "Total (sales value)" : "Total (profit)";
  const formatValue = (v) => (isVolumeMode && hasVolume ? formatVolume(v) : formatCurrency(v));

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
            const item = displayData[context.dataIndex];
            return [
              `${valueLabel}: ${formatValue(value)}`,
              `${item?.percentage ?? 0}% of total`
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
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Fuel Grade Mix (%)
        </CardTitle>
        <CardDescription>
          Volume and profit by category. Toggle to switch between Volume (sales value) and Profit.
        </CardDescription>
        {/* Toggle: Volume | Profit (wireframe) */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => setViewMode("volume")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "volume" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Volume
          </button>
          <button
            type="button"
            onClick={() => setViewMode("profit")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "profit" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            Profit
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-destructive text-sm">
            <p>{error}</p>
          </div>
        ) : displayData.length > 0 ? (
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
                    {centerLabel}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {formatValue(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Data table */}
            <div className="space-y-2 pt-4 border-t">
              {displayData.map((item) => (
                <div key={item.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{formatValue(item.value)}</span>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-2 mt-2 font-bold">
                <span className="text-sm">Total</span>
                <span className="text-sm">{formatValue(total)}</span>
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
