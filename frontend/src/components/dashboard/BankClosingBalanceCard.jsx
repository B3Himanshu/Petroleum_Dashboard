import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bank Closing Balance Card Component
 * Full width card showing total bank balance
 */
export const BankClosingBalanceCard = ({ totalBalance, loading, error, onClick }) => {
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
        "relative bg-gradient-to-r from-green-500 to-green-600 rounded-xl sm:rounded-2xl border border-green-600/30 shadow-sm overflow-hidden group transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.01]"
      )}
    >
      <div className="p-4 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white">Bank Closing Balance</h3>
              <p className="text-xs sm:text-sm text-green-100 mt-0.5">As of selected end date</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-10 bg-white/20 animate-pulse rounded" />
        ) : error ? (
          <div className="text-sm text-white/90">{error}</div>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
              {formatCurrency(totalBalance || 0)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
