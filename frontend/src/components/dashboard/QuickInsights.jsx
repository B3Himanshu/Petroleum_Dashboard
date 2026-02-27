import { cn } from "@/lib/utils";

// Pure JSX version (no TypeScript types)
const InsightBadge = ({ label, active }) => (
  <button
    className={cn(
      "px-4 py-2 rounded-full text-sm font-medium transition-all",
      active
        ? "bg-primary/10 text-primary border border-primary/30"
        : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
    )}
  >
    {label}
  </button>
);

export const QuickInsights = () => {
  return (
    <div className="mb-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Insights</h3>
      <div className="flex flex-wrap gap-3">
        <InsightBadge label="Profit Margin" active />
        <InsightBadge label="Active Sites" />
        <InsightBadge label="Avg. Ticket Size" />
        <InsightBadge label="Total Purchases" />
      </div>
    </div>
  );
};
