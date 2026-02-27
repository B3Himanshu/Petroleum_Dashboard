import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Fuel, Droplet, Zap, Gauge, TrendingUp } from "lucide-react";

// JSX version - Card detail modal with blurred background
export const CardDetailModal = ({ open, onOpenChange, title, children, maxWidth = "max-w-sm" }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        maxWidth,
        "h-[90vh] max-h-[90vh] bg-card border border-border shadow-xl rounded-lg p-0 flex flex-col"
      )}>
        <div className="bg-card border-b border-border px-4 py-3 flex-shrink-0">
          <DialogTitle className={cn(
            "text-lg font-bold text-foreground line-clamp-1",
            !title && "sr-only"
          )}>
            {title || "Breakdown Details"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detailed breakdown of {title || "data"}
          </DialogDescription>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
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
    '5014': { 
      icon: TrendingUp, 
      color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
      bgColor: 'bg-cyan-500/5'
    }
  };
  return configs[code] || { icon: Fuel, color: 'bg-muted text-foreground border-border', bgColor: 'bg-muted/50' };
};

// Enhanced detail item component with card boxes
export const DetailItem = ({ label, value, subValue, code, isTotal = false }) => {
  const config = !isTotal && code ? getFuelTypeConfig(code) : { 
    icon: Fuel, 
    color: 'bg-primary/10 text-primary border-primary/30',
    bgColor: 'bg-primary/5'
  };
  const Icon = config.icon;

  if (isTotal) {
    return (
      <div className={cn(
        "p-2 rounded-lg border-2 mb-1",
        config.color,
        config.bgColor,
        "shadow-sm"
      )}>
        <div className="flex items-center gap-1 mb-1">
          <div className={cn("w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0", config.color)}>
            <Icon className="w-2.5 h-2.5" />
          </div>
          <p className="text-[8px] font-semibold text-foreground uppercase tracking-wide truncate">{label}</p>
        </div>
        <p className="text-base font-bold text-foreground break-words">{value}</p>
        {subValue && (
          <p className="text-[8px] text-muted-foreground leading-tight break-words">{subValue}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "p-1.5 rounded-lg border mb-1.5 group",
      config.color,
      config.bgColor
    )}>
      <div className="flex items-start gap-1.5">
        <div className={cn(
          "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0",
          config.color
        )}>
          <Icon className="w-2.5 h-2.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[8px] font-semibold text-foreground mb-0.5 truncate leading-tight">{label}</p>
          <p className="text-xs font-bold text-foreground leading-tight break-words">{value}</p>
          {subValue && (
            <p className="text-[7px] text-muted-foreground leading-tight break-words">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
};

