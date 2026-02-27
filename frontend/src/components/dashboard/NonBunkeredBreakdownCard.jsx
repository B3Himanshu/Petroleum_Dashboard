import { Fuel } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Non-Bunkered Breakdown Card Component
 * Displays Volume, Sales, and Profit for non-bunkered sites
 */
export const NonBunkeredBreakdownCard = ({ volume, sales, profit, loading, error }) => {
  const formatVolume = (liters) => {
    if (!liters && liters !== 0) return "0 L";
    if (liters >= 1000000) return `${(liters / 1000000).toFixed(2)} M L`;
    if (liters >= 1000) return `${(liters / 1000).toFixed(0)} K L`;
    return `${liters.toFixed(2)} L`;
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "£0";
    const absValue = Math.abs(amount);
    if (absValue >= 1000000) return `£${(amount / 1000000).toFixed(2)} M`;
    if (absValue >= 1000) return `£${(amount / 1000).toFixed(1)} K`;
    return `£${amount.toFixed(2)}`;
  };

  return (
    <div className="relative bg-card rounded-xl sm:rounded-2xl border border-border shadow-sm overflow-hidden group">
      {/* Green/Teal gradient header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2">
        <Fuel className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        <h3 className="text-sm sm:text-base font-bold text-white">Non-Bunkered</h3>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4 lg:p-5">
        {loading ? (
          <div className="space-y-2">
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-6 bg-muted animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Volume</span>
              <span className="text-sm sm:text-base font-bold text-foreground">{formatVolume(volume || 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Sales</span>
              <span className="text-sm sm:text-base font-bold text-foreground">{formatCurrency(sales || 0)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Profit</span>
              <span className="text-sm sm:text-base font-bold text-foreground">{formatCurrency(profit || 0)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
