import { useState, useEffect } from "react";
import { MapPin, TrendingUp, TrendingDown } from "lucide-react";
import { getSiteGeo, buildGoogleMapsEmbedUrl } from "@/constants/siteGeo";

/** `visibleMetrics` — keys to show: sales, profit, saleVolume, ppl. Omit or empty = show all (backward compatible). */
export const SiteCard = ({ site, metrics, index, trend: trendProp, visibleMetrics }) => {
  const show = (key) =>
    !visibleMetrics || visibleMetrics.length === 0 ? true : visibleMetrics.includes(key);

  const siteId = site.siteId || site.id || 0;
  const geo = getSiteGeo(siteId);
  const mapEmbedUrl = buildGoogleMapsEmbedUrl(geo);
  const localPhoto = siteId > 0 ? `/sites/site-${siteId}.jpg` : null;
  const [photoError, setPhotoError] = useState(false);

  // Reset error state if siteId changes (defensive: key-based rendering should handle this,
  // but state can get stuck if the same instance is reused with a different siteId).
  useEffect(() => {
    setPhotoError(false);
  }, [siteId]);

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
  const siteNumber = siteId > 0 ? `Site #${siteId}` : '';

  return (
    <div className="chart-card animate-slide-up overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Site photo (local) → map embed fallback */}
      <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-muted">
        {localPhoto && !photoError ? (
          <img
            src={localPhoto}
            alt={siteName}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setPhotoError(true)}
          />
        ) : mapEmbedUrl ? (
          <iframe
            src={mapEmbedUrl}
            title={`Map of ${siteName}`}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <MapPin className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
        )}
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
            <h3 className="text-base font-semibold text-foreground truncate">{siteName}</h3>
            {siteNumber && (
              <p className="text-sm text-muted-foreground">{siteNumber}</p>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sales */}
          {show('sales') && metrics?.netSales !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Sales</p>
              <p className="text-base sm:text-lg font-bold" style={{ color: 'hsl(var(--chart-blue))' }}>
                {formatCurrency(metrics.netSales)}
              </p>
            </div>
          )}

          {/* Gross Profit (fuel + shop + Coffee & Valet) */}
          {show('profit') && metrics?.profit !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Gross Profit</p>
              <p className="text-base sm:text-lg font-bold" style={{ color: '#10b981' }}>
                {formatCurrency(Math.abs(Number(metrics.profit) || 0))}
              </p>
            </div>
          )}

          {/* Volume */}
          {show('saleVolume') && metrics?.totalFuelVolume !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Volume</p>
              <p className="text-base sm:text-lg font-bold" style={{ color: '#f59e0b' }}>
                {formatVolume(metrics.totalFuelVolume)}
              </p>
            </div>
          )}

          {/* PPL when volume &gt; 0; Margin % when no litre volume (same gross profit ÷ sales basis as dashboard) */}
          {show('ppl') &&
            (metrics?.totalFuelVolume !== undefined ||
            metrics?.pplAfterOverheads !== undefined ||
            metrics?.avgPPL !== undefined ||
            metrics?.grossMarginPct !== undefined) && (
            <div>
              {Number(metrics?.totalFuelVolume) > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground mb-1">
                    {metrics?.pplAfterOverheads !== undefined ? "PPL after O/H" : "Gross PPL"}
                  </p>
                  <p className="text-base sm:text-lg font-bold" style={{ color: '#8b5cf6' }}>
                    {Math.abs(Number(metrics?.pplAfterOverheads ?? metrics?.avgPPL) || 0).toFixed(2)} p
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-1">Margin %</p>
                  <p className="text-base sm:text-lg font-bold" style={{ color: '#8b5cf6' }}>
                    {(Number(metrics?.grossMarginPct) || 0).toFixed(2)}%
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

