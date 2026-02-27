// Data ordered for visual display (clockwise from top)
const displayData = [
  { name: "Accepted", value: 1252, color: "#F59E0B", strokeWidth: 14 },   // Orange - thin
  { name: "Open", value: 4045, color: "#7C3AED", strokeWidth: 18 },       // Purple - medium
  { name: "Pending", value: 3245, color: "#3B82F6", strokeWidth: 22 },    // Blue - wide/thick
];

// Data for legend display
const legendData = [
  { name: "Open", value: 4045, color: "#7C3AED" },       // Purple
  { name: "Pending", value: 3245, color: "#3B82F6" },    // Blue
  { name: "Accepted", value: 1252, color: "#F59E0B" },   // Orange
];

export const OrdersDonutChart = () => {
  const total = displayData.reduce((sum, item) => sum + item.value, 0);
  const radius = 85;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke dash arrays based on percentages (clockwise from top)
  const acceptedDash = (displayData[0].value / total) * circumference;  // Orange
  const openDash = (displayData[1].value / total) * circumference;      // Blue
  const pendingDash = (displayData[2].value / total) * circumference;   // Purple

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up h-full" style={{ animationDelay: "400ms" }}>
      <h3 className="text-base font-semibold text-foreground mb-2">Orders</h3>
      
      <div className="relative flex justify-center items-center py-6">
        <svg width="220" height="220" viewBox="0 0 220 220" className="transform hover:scale-105 transition-transform duration-300">
          {/* Background circle - subtle */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke="#F3F4F6"
            strokeWidth={22}
            fill="none"
          />

          {/* Orange - Accepted segment (small, thin stroke) */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke={displayData[0].color}
            strokeWidth={displayData[0].strokeWidth}
            fill="none"
            strokeDasharray={`${acceptedDash} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="butt"
            transform="rotate(-90 110 110)"
            className="transition-all duration-700"
          />

          {/* Purple - Open segment (large, medium stroke) */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke={displayData[1].color}
            strokeWidth={displayData[1].strokeWidth}
            fill="none"
            strokeDasharray={`${openDash} ${circumference}`}
            strokeDashoffset={-acceptedDash}
            strokeLinecap="butt"
            transform="rotate(-90 110 110)"
            className="transition-all duration-700"
          />

          {/* Blue - Pending segment (medium, thick stroke) */}
          <circle
            cx="110"
            cy="110"
            r={radius}
            stroke={displayData[2].color}
            strokeWidth={displayData[2].strokeWidth}
            fill="none"
            strokeDasharray={`${pendingDash} ${circumference}`}
            strokeDashoffset={-(acceptedDash + openDash)}
            strokeLinecap="butt"
            transform="rotate(-90 110 110)"
            className="transition-all duration-700"
          />
        </svg>

        {/* Center text */}
        <div className="absolute text-center">
          <p className="text-xs text-muted-foreground font-normal mb-1">Total Orders</p>
          <h2 className="text-3xl font-bold text-foreground">{total.toLocaleString()}</h2>
        </div>
      </div>

      {/* Legend - Horizontal inline */}
      <div className="flex justify-center items-center gap-5 mt-5 mb-3">
        {legendData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span 
              className="inline-block w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <p className="text-xs text-muted-foreground">{item.name}</p>
          </div>
        ))}
      </div>

      {/* Values row */}
      <div className="grid grid-cols-3 gap-4 mt-3">
        {legendData.map((item) => (
          <div key={item.name} className="text-center">
            <strong className="text-xl font-bold text-foreground">{item.value.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};
