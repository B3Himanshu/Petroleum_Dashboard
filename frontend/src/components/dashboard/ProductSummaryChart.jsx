import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Jan", gas: 280, oil: 180, diesel: 120 },
  { month: "Feb", gas: 320, oil: 200, diesel: 140 },
  { month: "Mar", gas: 380, oil: 280, diesel: 180 },
  { month: "Apr", gas: 340, oil: 240, diesel: 160 },
  { month: "May", gas: 360, oil: 260, diesel: 170 },
  { month: "Jun", gas: 400, oil: 300, diesel: 200 },
  { month: "Jul", gas: 380, oil: 280, diesel: 190 },
];

export const ProductSummaryChart = () => {
  return (
    <div className="chart-card h-[380px] animate-slide-up" style={{ animationDelay: "300ms" }}>
      <h3 className="text-lg font-semibold text-foreground mb-6">Product Summary</h3>
      
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend 
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '20px' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="gas" fill="hsl(var(--chart-blue))" radius={[4, 4, 0, 0]} name="Gas" />
          <Bar dataKey="oil" fill="hsl(var(--chart-green))" radius={[4, 4, 0, 0]} name="Oil" />
          <Bar dataKey="diesel" fill="hsl(var(--chart-yellow))" radius={[4, 4, 0, 0]} name="Diesel" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
