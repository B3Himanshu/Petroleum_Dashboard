import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { dashCartesianGridProps } from "@/lib/dashboardChartTypography";

// JSX version (no TypeScript types)
export const LineChart = ({ data, color = "hsl(var(--chart-blue))" }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReLineChart data={data}>
        <CartesianGrid {...dashCartesianGridProps} vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
      </ReLineChart>
    </ResponsiveContainer>
  );
};


