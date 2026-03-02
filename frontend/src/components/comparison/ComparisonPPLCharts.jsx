import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { dashboardAPI } from "@/services/api";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";

const transformPPLData = (data) => {
  if (!data || !Array.isArray(data)) return [];
  const transformed = data.map((item) => {
    const year = item.year;
    const month = item.month;
    const dateStr =
      year != null && month != null
        ? `${year}-${String(month).padStart(2, "0")}-01`
        : null;
    const avgPPL = item.avgPPL ?? item.avg_ppl ?? 0;
    const actualPPL = item.actualPPL ?? item.actual_ppl ?? 0;
    const pplAfterOH = avgPPL - actualPPL;
    return {
      date: dateStr,
      dateLabel: dateStr ? format(new Date(year, month - 1, 1), "MMM yyyy") : "",
      year,
      month,
      avg_ppl: avgPPL,
      actual_ppl: actualPPL,
      ppl_after_overheads: pplAfterOH,
    };
  }).filter((item) => item.date != null);
  transformed.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  return transformed;
};

const PPLChartCard = ({ title, siteName, chartData, loading }) => {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg p-3 shadow-xl min-w-[160px]"
          style={{
            backgroundColor: "hsl(222, 47%, 11%)",
            border: "1px solid hsl(217, 33%, 17%)",
            color: "#ffffff",
            zIndex: 99999,
          }}
        >
          <p className="font-semibold text-sm mb-2" style={{ color: "#ffffff" }}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {Number(entry.value).toFixed(2)} p
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="chart-card h-[380px] animate-pulse flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-card h-[380px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No PPL data for {siteName}</p>
      </div>
    );
  }

  return (
    <div className="chart-card h-[380px] animate-slide-up">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{siteName}</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-medium">Filter: date range above</span>
      </div>
      <div className="w-full overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
        <div className="min-w-[320px] sm:min-w-full">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 8, bottom: 16 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
                opacity={0.5}
              />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9, fontWeight: 500 }}
                angle={-35}
                textAnchor="end"
                height={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }}
                width={40}
                tickFormatter={(value) => `${Number(value).toFixed(2)}p`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: "6px" }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs font-medium text-foreground" style={{ marginLeft: 4 }}>
                    {value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="avg_ppl"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#3b82f6" }}
                activeDot={{ r: 6, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={600}
                name="Avg PPL"
              />
              <Line
                type="monotone"
                dataKey="ppl_after_overheads"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#10b981" }}
                activeDot={{ r: 6, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={true}
                animationDuration={600}
                name="PPL After Vending Out Overheads"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const ComparisonPPLCharts = ({
  site1Id,
  site2Id,
  site1Name,
  site2Name,
  startDate,
  endDate,
  loading: parentLoading,
}) => {
  const [site1Data, setSite1Data] = useState([]);
  const [site2Data, setSite2Data] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!site1Id || !site2Id || !startDate || !endDate) {
      setSite1Data([]);
      setSite2Data([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [raw1, raw2] = await Promise.all([
          dashboardAPI.getPetrolPPLComparison(startDate, endDate, [site1Id]),
          dashboardAPI.getPetrolPPLComparison(startDate, endDate, [site2Id]),
        ]);
        setSite1Data(transformPPLData(raw1));
        setSite2Data(transformPPLData(raw2));
      } catch (error) {
        console.error("Error fetching PPL comparison:", error);
        setSite1Data([]);
        setSite2Data([]);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [site1Id, site2Id, startDate, endDate]);

  const loading = parentLoading || loadingData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PPLChartCard
        title="PPL vs Actual PPL vending out OH"
        siteName={site1Name}
        chartData={site1Data}
        loading={loading}
      />
      <PPLChartCard
        title="PPL vs Actual PPL vending out OH"
        siteName={site2Name}
        chartData={site2Data}
        loading={loading}
      />
    </div>
  );
};
