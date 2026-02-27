import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export const Header = ({ sidebarOpen, onToggleSidebar, totalSales, showRevenueInMillions = false, onToggleRevenueInMillions }) => {

  // Format total sales value
  const formatTotalSales = (amount) => {
    if (!amount) return { number: "0", unit: "" };
    if (amount >= 1000000) {
      return { number: (amount / 1000000).toFixed(2), unit: "M" };
    }
    if (amount >= 1000) {
      return { number: (amount / 1000).toFixed(2), unit: "K" };
    }
    return { number: amount.toFixed(2), unit: "" };
  };

  const salesFormatted = formatTotalSales(Math.abs(totalSales || 0));

  return (
    <header className="h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 lg:px-6">
      {/* Spacer for layout */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4">
        {/* Total Sales - Blue Button Style - Show on mobile too */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 lg:py-2.5 rounded-lg font-semibold shadow-sm bg-primary text-primary-foreground">
          <span className="text-xs sm:text-sm font-semibold hidden sm:inline">Total Sales:</span>
          <span className="text-xs sm:text-sm font-semibold sm:hidden">Sales:</span>
          <div className="flex items-baseline gap-0.5 sm:gap-1">
            <span className="text-xs sm:text-sm font-medium opacity-90">£</span>
            <span className="text-sm sm:text-base font-bold">{salesFormatted.number}</span>
            {salesFormatted.unit && <span className="text-xs sm:text-sm font-semibold opacity-90">{salesFormatted.unit}</span>}
          </div>
        </div>

        {/* Toggle: Revenue card in millions vs exact breakdown */}
        {typeof onToggleRevenueInMillions === "function" && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-border bg-background">
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">Show M</span>
            <Switch checked={showRevenueInMillions} onCheckedChange={onToggleRevenueInMillions} />
          </div>
        )}

        <button className="relative p-1.5 sm:p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-destructive rounded-full" />
        </button>

        <div className="flex items-center gap-2 sm:gap-3 pl-1.5 sm:pl-2 lg:pl-4 border-l border-border">
          <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-primary to-chart-blue flex items-center justify-center">
            <span className="text-xs sm:text-xs lg:text-sm font-bold text-primary-foreground">
              PRL
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;


