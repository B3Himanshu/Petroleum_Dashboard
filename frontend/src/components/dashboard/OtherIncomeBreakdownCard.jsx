import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Other Income Breakdown Card Component
 * Displays total other income, clickable for breakdown
 */
export const OtherIncomeBreakdownCard = ({ total, loading, error, onClick }) => {
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "£0";
    const absValue = Math.abs(amount);
    if (absValue >= 1000000) return `£${(amount / 1000000).toFixed(2)} M`;
    if (absValue >= 1000) return `£${(amount / 1000).toFixed(1)} K`;
    return `£${amount.toFixed(2)}`;
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative bg-card rounded-xl sm:rounded-2xl border border-border shadow-sm overflow-hidden group transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/50"
      )}
    >
      {/* Purple gradient header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2">
        <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        <h3 className="text-sm sm:text-base font-bold text-white">Other Income</h3>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4 lg:p-5">
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Total</span>
              <span className="text-base sm:text-lg font-bold text-foreground">{formatCurrency(total || 0)}</span>
            </div>
            {onClick && (
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center">Click for breakdown</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
