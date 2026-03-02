import { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Percentage difference: "how much is val1 vs val2" as (val1 - val2) / val2 * 100.
  // For the badge next to Site 2 we pass (site2, site1) so we get "Site 2 vs Site 1".
  const calculateDifference = (val1, val2) => {
    if (val1 == null && val2 == null) return { percentage: 0, isPositive: null };
    if (val1 == null || val1 === 0) return { percentage: val2 ? 100 : 0, isPositive: !!val2 };
    if (val2 == null || val2 === 0) return { percentage: val1 ? 100 : 0, isPositive: val1 > 0 };
    const diff = ((val1 - val2) / val2) * 100;
    return { percentage: Math.abs(diff), isPositive: diff > 0 };
  };

  // Use absolute values so all metrics display as positive (no negative numbers)
  const toPos = (v) => Math.abs(parseFloat(v) || 0);
  const profit1 = toPos(site1Data.profit);
  const profit2 = toPos(site2Data.profit);
  const netSales1 = toPos(site1Data.netSales);
  const netSales2 = toPos(site2Data.netSales);
  const vol1 = toPos(site1Data.totalFuelVolume);
  const vol2 = toPos(site2Data.totalFuelVolume);
  const avgPPL1 = toPos(site1Data.avgPPL);
  const avgPPL2 = toPos(site2Data.avgPPL);
  const actualPPL1 = toPos(site1Data.pplAfterOverheads ?? site1Data.avgPPL);
  const actualPPL2 = toPos(site2Data.pplAfterOverheads ?? site2Data.avgPPL);

  // Comparison metrics to display
  const metrics = [
    {
      label: "Net Sales",
      site1Value: netSales1,
      site2Value: netSales2,
      formatter: formatCurrency,
    },
    {
      label: "Profit",
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
      label: "Avg PPL",
      site1Value: avgPPL1,
      site2Value: avgPPL2,
      formatter: (val) => `${val?.toFixed(2) || '0.00'} p`,
    },
    {
      label: "Actual PPL (vending out OH)",
      site1Value: actualPPL1,
      site2Value: actualPPL2,
      formatter: (val) => `${val?.toFixed(2) || '0.00'} p`,
    },
  ];

  return (
    <div ref={metricsRef} className="chart-card animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Performance Comparison</h3>
        <p className="text-xs text-muted-foreground">Side-by-side comparison of key metrics</p>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => {
          // Badge next to Site 2: show "Site 2 vs Site 1" so green = Site 2 higher, red = Site 2 lower
          const diff = calculateDifference(metric.site2Value, metric.site1Value);
          
          // Animate values
          const animatedSite1Value = (metric.site1Value || 0) * animationProgress;
          const animatedSite2Value = (metric.site2Value || 0) * animationProgress;
          const animatedDiff = calculateDifference(animatedSite2Value, animatedSite1Value);
          
          return (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
            >
              {/* Metric Label */}
              <div className="flex items-center">
                <span className="text-sm font-medium text-foreground">{metric.label}</span>
              </div>

              {/* Site 1 Value */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{site1Name}</p>
                <p className="text-lg font-semibold text-foreground">
                  {hasAnimated && animationProgress < 1 
                    ? metric.formatter(animatedSite1Value)
                    : metric.formatter(metric.site1Value)}
                </p>
              </div>

              {/* Site 2 Value with Comparison */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{site2Name}</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-lg font-semibold text-foreground">
                    {hasAnimated && animationProgress < 1 
                      ? metric.formatter(animatedSite2Value)
                      : metric.formatter(metric.site2Value)}
                  </p>
                  {animatedDiff.percentage > 0 && (
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                      animatedDiff.isPositive
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    )}>
                      {animatedDiff.isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{animatedDiff.percentage.toFixed(1)}%</span>
                    </div>
                  )}
                  {animatedDiff.percentage === 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                      <Minus className="w-3 h-3" />
                      <span>Same</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Card */}
      <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="text-sm font-semibold text-foreground mb-3">Comparison Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Total Sales Difference</p>
            <p className="font-semibold text-foreground">
              {hasAnimated && animationProgress < 1
                ? formatCurrency(Math.abs((netSales1 - netSales2) * animationProgress))
                : formatCurrency(Math.abs(netSales1 - netSales2))}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Profit Difference</p>
            <p className="font-semibold text-foreground">
              {hasAnimated && animationProgress < 1
                ? formatCurrency(Math.abs((profit1 - profit2) * animationProgress))
                : formatCurrency(Math.abs(profit1 - profit2))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

