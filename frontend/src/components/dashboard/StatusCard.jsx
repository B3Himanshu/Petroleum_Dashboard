import { cn } from "@/lib/utils";

const statusColors = {
  normal: "text-metric-green",
  warning: "text-metric-yellow",
  critical: "text-destructive",
};

const statusDots = {
  normal: "bg-metric-green",
  warning: "bg-metric-yellow", 
  critical: "bg-destructive",
};

// Pure JSX version (no TypeScript types)
export const StatusCard = ({ title, value, status, delay = 0 }) => {
  return (
    <div 
      className="metric-card animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-sm text-muted-foreground font-medium mb-2">{title}</p>
      {status ? (
        <div className="flex items-center gap-2">
          <span className={cn("w-2.5 h-2.5 rounded-full", statusDots[status])} />
          <span className={cn("text-lg font-semibold", statusColors[status])}>
            {value}
          </span>
        </div>
      ) : (
        <h3 className="text-2xl font-bold text-foreground">{value}</h3>
      )}
    </div>
  );
};
