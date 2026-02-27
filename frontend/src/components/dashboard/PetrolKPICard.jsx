import { Fuel } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PetrolKPICard Component
 * Displays Total Fuel Volume KPI with loading state
 */
export const PetrolKPICard = ({ totalFuelVolume, loading, error, onClick }) => {
  // Format volume value
  const formatVolume = (liters) => {
    if (!liters && liters !== 0) return "0 L";
    if (liters >= 1000000) return `${(liters / 1000000).toFixed(2)} M L`;
    if (liters >= 1000) return `${(liters / 1000).toFixed(0)} K L`;
    return `${liters.toFixed(2)} L`;
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-border shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up overflow-hidden group",
        onClick && "cursor-pointer hover:border-primary/50"
      )}
    >
      {/* Header with Icon and Title */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 bg-metric-blue/10 text-metric-blue">
            <Fuel className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide leading-tight">
              Total Fuel Volume
            </p>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="mb-2 sm:mb-3">
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded w-32" />
            <div className="h-4 bg-muted animate-pulse rounded w-24" />
          </div>
        ) : error ? (
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-bold text-destructive tracking-tight leading-tight">
              Error
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5">
              {error}
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">
              {formatVolume(totalFuelVolume || 0)}
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5">
              Nominal codes: 4000, 4001, 4002, 4003, 4008
            </p>
          </>
        )}
      </div>

      {/* Decorative gradient overlay */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{ backgroundColor: '#3b82f6' }}
      />
    </div>
  );
};
