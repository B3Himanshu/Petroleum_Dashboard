import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Jan", sales: 180000 },
  { month: "Feb", sales: 220000 },
  { month: "Mar", sales: 280000 },
  { month: "Apr", sales: 428543 },
  { month: "May", sales: 350000 },
  { month: "Jun", sales: 380000 },
];

export const SalesSummaryChart = () => {
  return (
    <div className="chart-card h-[320px] animate-slide-up" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Sales Summary</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Sort by: <span className="text-foreground font-medium">01 Jan - 30 Jun</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            tickFormatter={(value) => `${value / 1000}k`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px hsl(0 0% 0% / 0.1)'
            }}
            // JSX version: remove TypeScript type annotation on value
            formatter={(value) => [`₹${value.toLocaleString()}`, 'Sales']}
          />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            fill="url(#salesGradient)"
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4, stroke: 'hsl(var(--card))' }}
            activeDot={{ 
              fill: 'hsl(var(--primary))', 
              strokeWidth: 3, 
              r: 8, 
              stroke: 'hsl(var(--card))',
              className: 'shadow-glow'
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
