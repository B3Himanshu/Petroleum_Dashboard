import { useState } from "react";
import { MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Generate SVG placeholder as data URI
const generatePlaceholder = (text, width = 400, height = 250) => {
  const fontSize = width < 200 ? 14 : 20;
  const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a1a1a"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapedText}</text>
</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Get site image from local public folder
// Use index to ensure variety - no 3 consecutive images are the same
// Distributes images evenly: 1,2,3,4,5,6,1,2,3,4,5,6...
const getSiteImage = (index) => {
  const imageNumber = (index % 6) + 1; // Cycle through 1-6 based on display position
  return `/station-${imageNumber}.jpg`;
};

export const SiteCard = ({ site, metrics, index, trend: trendProp }) => {
  const [imageError, setImageError] = useState(false);
  const siteImage = getSiteImage(index); // Use index instead of siteId for better distribution

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "£0";
    if (amount >= 1000000) return `£${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `£${(amount / 1000).toFixed(0)}K`;
    return `£${amount.toFixed(0)}`;
  };

  // Format volume (up to 2 decimal places)
  const formatVolume = (liters) => {
    if (!liters) return "0";
    if (liters >= 1000000) return `${(liters / 1000000).toFixed(2)}M`;
    if (liters >= 1000) return `${(liters / 1000).toFixed(2)}K`;
    return `${Number(liters).toFixed(2)}`;
  };

  // Trend: use prop from parent (data-driven) or neutral if not provided
  const trend = typeof trendProp === 'string' && (trendProp === 'up' || trendProp === 'down') ? trendProp : null;
  const siteName = site.siteName || site.name || 'Unknown Site';
  const siteId = site.siteId || site.id || 0;
  const siteNumber = siteId > 0 ? `Site #${siteId}` : '';

  return (
    <div className="chart-card animate-slide-up overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Site Image */}
      <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-muted">
        <img
          src={imageError ? generatePlaceholder(siteName, 400, 250) : siteImage}
          alt={siteName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        {/* Trend Indicator (data-driven from parent; hidden if no trend) */}
        {trend != null && (
          <div className="absolute top-2 right-2">
            {trend === 'up' ? (
              <div className="w-8 h-8 rounded-full bg-green-500/90 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-500/90 flex items-center justify-center shadow-lg">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Site Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{siteName}</h3>
            {siteNumber && (
              <p className="text-xs text-muted-foreground">{siteNumber}</p>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sales */}
          {metrics?.netSales !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sales</p>
              <p className="text-sm font-bold" style={{ color: '#3b82f6' }}>
                {formatCurrency(metrics.netSales)}
              </p>
            </div>
          )}

          {/* Profit (show as positive magnitude) */}
          {metrics?.profit !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Profit</p>
              <p className="text-sm font-bold" style={{ color: '#10b981' }}>
                {formatCurrency(Math.abs(Number(metrics.profit) || 0))}
              </p>
            </div>
          )}

          {/* Volume */}
          {metrics?.totalFuelVolume !== undefined && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Volume</p>
              <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                {formatVolume(metrics.totalFuelVolume)}
              </p>
            </div>
          )}

          {/* PPL: show PPL after overheads when provided (Metrics Comparison), else Avg PPL — display as positive magnitude */}
          {(metrics?.pplAfterOverheads !== undefined || metrics?.avgPPL !== undefined) && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {metrics?.pplAfterOverheads !== undefined ? "PPL (after OH)" : "PPL"}
              </p>
              <p className="text-sm font-bold" style={{ color: '#8b5cf6' }}>
                {Math.abs(Number(metrics?.pplAfterOverheads ?? metrics?.avgPPL) || 0).toFixed(2)} p
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

