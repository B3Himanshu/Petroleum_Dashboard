import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Filter } from "lucide-react";
import { useIsSmUp } from "@/hooks/use-mobile";
import { dashTickPrimary, dashTickSecondary, dashAxisLabel, dashLegendItemClass, dashCartesianGridProps } from "@/lib/dashboardChartTypography";

// No hardcoded data — chart shows API data when available
const data = [];

export const PPIChart = () => {
  const smUp = useIsSmUp();
  const tickX = dashTickPrimary(smUp);
  const tickY = dashTickSecondary(smUp);
  const refLabel = dashAxisLabel(smUp);
  const avgPPI = data.length > 0
    ? data.reduce((sum, d) => sum + (d.actualPPI || 0), 0) / data.length
    : null;

  return (
    <div className="chart-card h-[320px] sm:h-[360px] lg:h-[380px] animate-slide-up" style={{ animationDelay: "400ms" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h3 className="dash-chart-heading">Avg PPI vs Actual PPI (Line chart)</h3>
          <p className="dash-chart-subtitle">Data from API when available.</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-3 py-2 sm:py-1.5 text-sm sm:text-base text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors touch-manipulation min-h-[36px] sm:min-h-0">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      <div className="h-[calc(100%-100px)] sm:h-[85%]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid {...dashCartesianGridProps} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: tickX }}
                className="sm:text-xs lg:text-sm"
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: tickY }}
                className="sm:text-xs lg:text-sm"
                width={44}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "14px",
                  padding: "10px 12px",
                  maxWidth: "200px",
                }}
                wrapperStyle={{ zIndex: 1000 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "8px", fontSize: "14px" }}
                className="text-sm sm:text-base"
                iconSize={12}
                formatter={(value) => (
                  <span className={`${dashLegendItemClass()} text-muted-foreground`}>
                    {value === "actualPPI" ? "Actual PPI" : "Avg PPI"}
                  </span>
                )}
              />
              {avgPPI != null && (
                <ReferenceLine
                  y={avgPPI}
                  stroke="hsl(var(--chart-purple))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ value: "Avg PPI", fill: "hsl(var(--muted-foreground))", fontSize: refLabel }}
                />
              )}
              <Line
                type="monotone"
                dataKey="actualPPI"
                stroke="hsl(var(--chart-blue))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--chart-blue))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm sm:text-base">
            No data available
          </div>
        )}
      </div>
    </div>
  );
};
