import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { COFFEE_VALET_REVENUE_LABEL } from "@/constants/revenueLabels";

export const ComparisonMetrics = ({ site1Data, site2Data, site1Name, site2Name, loading }) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const metricsRef = useRef(null);

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    if (!metricsRef.current || hasAnimated || !site1Data || !site2Data) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            // Start animation
            let startTime = null;
            const duration = 1500; // 1.5 seconds

            const animate = (timestamp) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / duration, 1);
              
              // Easing function for smooth animation (ease-out)
              const easedProgress = 1 - Math.pow(1 - progress, 3);
              setAnimationProgress(easedProgress);

              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                setAnimationProgress(1);
              }
            };

            requestAnimationFrame(animate);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2, // Trigger when 20% of the component is visible
        rootMargin: '0px',
      }
    );

    observer.observe(metricsRef.current);

    return () => {
      if (metricsRef.current) {
        observer.unobserve(metricsRef.current);
      }
    };
  }, [site1Data, site2Data, hasAnimated]);

  // Reset animation when data changes
  useEffect(() => {
    setHasAnimated(false);
    setAnimationProgress(0);
  }, [site1Data, site2Data]);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "£0";
    if (amount >= 1000000) return `£${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `£${(amount / 1000).toFixed(1)}k`;
    return `£${amount.toFixed(0)}`;
  };

  // Format volume
  const formatVolume = (liters) => {
    if (!liters) return "0 L";
    if (liters >= 1000000) return `${(liters / 1000000).toFixed(1)}M L`;
    if (liters >= 1000) return `${(liters / 1000).toFixed(0)}K L`;
    return `${liters.toFixed(0)} L`;
  };

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="chart-card animate-pulse">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading comparison data...</div>
        </div>
      </div>
    );
  }

  if (!site1Data || !site2Data) {
    return (
      <div className="chart-card">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">No data available for comparison</p>
          </div>
        </div>
      </div>
    );
  }

  // Use absolute values so all metrics display as positive (no negative numbers)
  const toPos = (v) => Math.abs(parseFloat(v) || 0);
  const profit1 = toPos(site1Data.profit);
  const profit2 = toPos(site2Data.profit);
  const netSales1 = toPos(site1Data.netSales);
  const netSales2 = toPos(site2Data.netSales);
  const vol1 = toPos(site1Data.totalFuelVolume);
  const vol2 = toPos(site2Data.totalFuelVolume);
  const hasVol1 = vol1 > 0;
  const hasVol2 = vol2 > 0;
  const hasAnyFuelVolume = hasVol1 || hasVol2;
  const volumeDiffAbs = Math.abs(vol1 - vol2);
  const margin1 = toPos(site1Data.grossMarginPct);
  const margin2 = toPos(site2Data.grossMarginPct);
  const isMarginMode = !hasVol1 && !hasVol2;
  // Prefer PPL after O/H when available, else Gross PPL (avgPPL)
  const actualPPL1 = toPos(site1Data.pplAfterOverheads ?? site1Data.avgPPL);
  const actualPPL2 = toPos(site2Data.pplAfterOverheads ?? site2Data.avgPPL);
  const labourPct1 = toPos(site1Data.labourCostPercent);
  const labourPct2 = toPos(site2Data.labourCostPercent);

  // Comparison metrics to display
  const metrics = [
    {
      label: "Net Sales",
      site1Value: netSales1,
      site2Value: netSales2,
      formatter: formatCurrency,
    },
    {
      label: "Gross Profit",
      labelTitle: `Fuel + shop + ${COFFEE_VALET_REVENUE_LABEL} (combined)`,
      site1Value: profit1,
      site2Value: profit2,
      formatter: formatCurrency,
    },
    {
      label: "Total Fuel Volume",
      site1Value: vol1,
      site2Value: vol2,
      formatter: formatVolume,
    },
    {
      label: isMarginMode ? "Fuel Margin" : "PPL after O/H",
      site1Value: hasVol1 ? actualPPL1 : margin1,
      site2Value: hasVol2 ? actualPPL2 : margin2,
      formatter: (val, valueSiteName) => {
        const hasVolume = valueSiteName === site1Name ? hasVol1 : hasVol2;
        return hasVolume
          ? `${val?.toFixed(2) || '0.00'} p`
          : `${(val ?? 0).toFixed(2)}%`;
      },
    },
    {
      label: "Labour Cost as % of fuel sales",
      labelMobile: "Labour Cost %",
      site1Value: labourPct1,
      site2Value: labourPct2,
      formatter: (val) => `${(val ?? 0).toFixed(1)}%`,
    },
  ];

  return (
    <div ref={metricsRef} className="chart-card animate-slide-up">
      <div className="mb-3 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Performance Comparison</h3>
        <p className="text-xs text-muted-foreground">Side-by-side comparison of key metrics</p>
      </div>

      {/* Column header row — visible on all screens */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 px-2 sm:px-4 mb-1">
        <div />
        <div className="text-center">
          <p className="text-[10px] sm:text-xs font-semibold text-primary truncate">{site1Name}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] sm:text-xs font-semibold text-emerald-500 truncate">{site2Name}</p>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-4">
        {metrics.map((metric, index) => {
          // Animate values
          const animatedSite1Value = (metric.site1Value || 0) * animationProgress;
          const animatedSite2Value = (metric.site2Value || 0) * animationProgress;

          return (
            <div
              key={index}
              className="grid grid-cols-3 gap-2 sm:gap-4 p-2.5 sm:p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors items-center"
            >
              {/* Metric Label */}
              <div className="flex items-center">
                <span
                  className="text-[11px] sm:text-sm font-medium text-foreground leading-tight"
                  title={metric.labelTitle || metric.label}
                >
                  <span className="sm:hidden">{metric.labelMobile || metric.label}</span>
                  <span className="hidden sm:inline">{metric.label}</span>
                </span>
              </div>

              {/* Site 1 Value */}
              <div className="text-center">
                <p className="text-xs sm:text-lg font-semibold text-foreground">
                  {hasAnimated && animationProgress < 1
                    ? metric.formatter(animatedSite1Value, site1Name)
                    : metric.formatter(metric.site1Value, site1Name)}
                </p>
              </div>

              {/* Site 2 Value */}
              <div className="text-center">
                <p className="text-xs sm:text-lg font-semibold text-foreground">
                  {hasAnimated && animationProgress < 1
                    ? metric.formatter(animatedSite2Value, site2Name)
                    : metric.formatter(metric.site2Value, site2Name)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Card */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3">Comparison Summary</h4>
        <div
          className={cn(
            "grid gap-3 sm:gap-4 text-sm",
            hasAnyFuelVolume ? "grid-cols-3" : "grid-cols-2"
          )}
        >
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Sales Diff.</p>
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              {hasAnimated && animationProgress < 1
                ? formatCurrency(Math.abs((netSales1 - netSales2) * animationProgress))
                : formatCurrency(Math.abs(netSales1 - netSales2))}
            </p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Profit Diff.</p>
            <p className="text-xs sm:text-sm font-semibold text-foreground">
              {hasAnimated && animationProgress < 1
                ? formatCurrency(Math.abs((profit1 - profit2) * animationProgress))
                : formatCurrency(Math.abs(profit1 - profit2))}
            </p>
          </div>
          {hasAnyFuelVolume && (
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Volume Diff.</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {hasAnimated && animationProgress < 1
                  ? formatVolume(volumeDiffAbs * animationProgress)
                  : formatVolume(volumeDiffAbs)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

