import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Fuel, Droplet, Zap, Gauge, TrendingUp, ShoppingBag, Coffee } from "lucide-react";

// JSX version - Card detail modal with blurred background
export const CardDetailModal = ({
  open,
  onOpenChange,
  title,
  children,
  maxWidth = "max-w-sm",
  headerClassName,
  bodyClassName,
  titleClassName,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        maxWidth,
        "h-[90vh] max-h-[90vh] bg-card border border-border shadow-xl rounded-xl p-0 flex flex-col"
      )}>
        <div className={cn("bg-card border-b border-border px-4 py-3 flex-shrink-0", headerClassName)}>
          <DialogTitle className={cn(
            "text-lg font-bold text-foreground line-clamp-1",
            titleClassName,
            !title && "sr-only"
          )}>
            {title || "Breakdown Details"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailed breakdown of {title || "data"}
          </DialogDescription>
        </div>
        <div className={cn("flex-1 overflow-y-auto px-4 py-3", bodyClassName)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
};

// Get icon and color for each fuel type
const getFuelTypeConfig = (code) => {
  const configs = {
    // Sales codes (4000 series)
    '4000': { 
      icon: Fuel, 
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      bgColor: 'bg-blue-500/5'
    },
    '4001': { 
      icon: Droplet, 
      color: 'bg-green-500/10 text-green-500 border-green-500/30',
      bgColor: 'bg-green-500/5'
    },
    '4002': { 
      icon: Zap, 
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      bgColor: 'bg-yellow-500/5'
    },
    '4003': { 
      icon: Gauge, 
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      bgColor: 'bg-purple-500/5'
    },
    '4004': {
      icon: Fuel,
      color: 'bg-slate-500/10 text-slate-600 border-slate-400/35 dark:text-slate-300',
      bgColor: 'bg-slate-500/5'
    },
    '4008': { 
      icon: TrendingUp, 
      color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
      bgColor: 'bg-cyan-500/5'
    },
    // Purchase codes (5000 series)
    '5000': { 
      icon: Fuel, 
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      bgColor: 'bg-blue-500/5'
    },
    '5001': { 
      icon: Droplet, 
      color: 'bg-green-500/10 text-green-500 border-green-500/30',
      bgColor: 'bg-green-500/5'
    },
    '5003': { 
      icon: Zap, 
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      bgColor: 'bg-yellow-500/5'
    },
    '5004': { 
      icon: Gauge, 
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      bgColor: 'bg-purple-500/5'
    },
    '4032': {
      icon: ShoppingBag,
      color: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
      bgColor: 'bg-amber-500/5'
    },
    '4028': {
      icon: Coffee,
      color: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400',
      bgColor: 'bg-rose-500/5'
    },
    '4100': {
      icon: TrendingUp,
      color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
      bgColor: 'bg-cyan-500/5'
    },
    '5014': { 
      icon: TrendingUp, 
      color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
      bgColor: 'bg-cyan-500/5'
    }
  };
  return configs[code] || { icon: Fuel, color: 'bg-muted text-foreground border-border', bgColor: 'bg-muted/50' };
};

/** Name → value → % (aligned columns; matches Gross Profit breakdown grid). */
export const ThreeColumnBreakdownRow = ({
  name,
  value,
  percent,
  bold = false,
  subLabel,
  negative = false,
}) => (
  <div
    className={cn(
      "grid grid-cols-[minmax(0,1fr)_auto_3.5rem] gap-x-2 items-center py-2 text-xs sm:text-sm border-b border-border/60",
      bold && "border-primary/25 bg-primary/5 -mx-1 px-1.5 rounded-md border-b-0",
    )}
  >
    <div className="min-w-0 pr-1">
      <span className={cn("text-foreground block truncate", bold ? "font-semibold" : "")}>{name}</span>
      {subLabel ? (
        <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">{subLabel}</span>
      ) : null}
    </div>
    <span
      className={cn(
        "tabular-nums text-right shrink-0",
        bold ? "font-semibold text-foreground" : "font-medium text-foreground",
        negative && "text-destructive",
      )}
    >
      {negative ? `−${value}` : value}
    </span>
    <span className={cn("tabular-nums text-right shrink-0", negative ? "text-destructive" : "text-muted-foreground")}>
      {percent != null && Number.isFinite(Number(percent))
        ? (() => {
            const n = Number(percent);
            // Bold totals: clean display (e.g. "100%"). Others: exact precision.
            let str;
            if (bold) {
              str = Math.abs(n - Math.round(n)) < 0.0005 ? String(Math.round(n)) : n.toFixed(1);
            } else if (n === 0) str = '0.000';
            else if (Math.abs(n) >= 0.0005) str = n.toFixed(3);
            else if (Math.abs(n) >= 0.00005) str = n.toFixed(4);
            else if (Math.abs(n) >= 0.000005) str = n.toFixed(5);
            else str = n.toFixed(6);
            const showNeg = negative && parseFloat(str) !== 0;
            return showNeg ? `−${str}%` : `${str}%`;
          })()
        : "—"}
    </span>
  </div>
);

// Enhanced detail item component with card boxes
export const DetailItem = ({ label, value, subValue, code, isTotal = false, size = "default", percent }) => {
  const config = !isTotal && code ? getFuelTypeConfig(code) : { 
    icon: Fuel, 
    color: 'bg-primary/10 text-primary border-primary/30',
    bgColor: 'bg-primary/5'
  };
  const Icon = config.icon;
  const spacious = size === "lg";

  if (isTotal) {
    return (
      <div className={cn(
        "rounded-xl border-2 mb-1",
        spacious ? "p-4 shadow-md" : "p-2 shadow-sm",
        config.color,
        config.bgColor,
      )}>
        <div className={cn("flex items-center gap-2", spacious && "mb-2")}>
          <div className={cn(
            "rounded-lg flex items-center justify-center flex-shrink-0",
            spacious ? "w-9 h-9" : "w-5 h-5 rounded-md",
            config.color
          )}>
            <Icon className={spacious ? "w-5 h-5" : "w-2.5 h-2.5"} />
          </div>
          <p className={cn(
            "font-semibold text-foreground uppercase tracking-wide truncate",
            spacious ? "text-xs" : "text-[8px]"
          )}>{label}</p>
        </div>
        <p className={cn(
          "font-bold text-foreground break-words",
          spacious ? "text-2xl sm:text-3xl tracking-tight" : "text-base"
        )}>{value}</p>
        {subValue && (
          <p className={cn(
            "text-muted-foreground leading-tight break-words",
            spacious ? "text-sm mt-1" : "text-[8px]"
          )}>{subValue}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border group transition-shadow hover:shadow-md",
      spacious ? "p-3.5 mb-2.5 shadow-sm" : "p-1.5 mb-1.5",
      config.color,
      config.bgColor
    )}>
      <div className={cn("flex items-start", spacious ? "gap-3" : "gap-1.5")}>
        <div className={cn(
          "rounded-lg flex items-center justify-center flex-shrink-0",
          spacious ? "w-9 h-9" : "w-5 h-5 rounded-md",
          config.color
        )}>
          <Icon className={spacious ? "w-4 h-4" : "w-2.5 h-2.5"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-semibold text-foreground truncate leading-tight",
            spacious ? "text-sm mb-1" : "text-[8px] mb-0.5"
          )}>{label}</p>
        <p className={cn(
          "font-bold text-foreground leading-tight break-words",
          spacious ? "text-lg sm:text-xl" : "text-xs"
        )}>
          {value}
          {typeof percent === "number" && Number.isFinite(percent) && (
            <span className="ml-1.5 font-semibold text-muted-foreground tabular-nums">
              {percent.toFixed(1)}%
            </span>
          )}
        </p>
          {subValue && (
            <p className={cn(
              "text-muted-foreground leading-snug break-words",
              spacious ? "text-xs mt-1" : "text-[7px]"
            )}>{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
};

