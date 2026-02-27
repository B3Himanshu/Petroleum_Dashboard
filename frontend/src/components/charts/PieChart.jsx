import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// JSX version (no TypeScript types)
export const PieChart = ({ data, innerRadius = 50, outerRadius = 70 }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RePieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </RePieChart>
    </ResponsiveContainer>
  );
};


