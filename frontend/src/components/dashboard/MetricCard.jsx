import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer } from "recharts";
import { memo, useMemo, useState, useEffect, useRef } from "react";

const iconBgColors = {
  blue: "bg-metric-blue/10 text-metric-blue",
  green: "bg-metric-green/10 text-metric-green",
  yellow: "bg-metric-yellow/10 text-metric-yellow",
  orange: "bg-metric-orange/10 text-metric-orange",
  purple: "bg-metric-purple/10 text-metric-purple",
  pink: "bg-metric-pink/10 text-metric-pink",
};

const chartColors = {
  blue: "#3b82f6",
  green: "#10b981",
  yellow: "#f59e0b",
  orange: "#f97316",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

// Helper function to parse numeric value from formatted string
const parseNumericValue = (formattedValue, originalValue) => {
  // If originalValue is provided and is a number, use it
  if (originalValue !== undefined && originalValue !== null && typeof originalValue === 'number') {
    return originalValue;
  }
  
  // Try to parse from formatted string
  if (typeof formattedValue === 'string') {
    // Remove currency symbols, commas, and extract number
    const cleaned = formattedValue.replace(/[£$,\s]/g, '');
    // Handle suffixes like M, k, ML, L, p, %
    const match = cleaned.match(/^([\d.]+)([MkLp%]*)$/);
    if (match) {
      let num = parseFloat(match[1]);
      const suffix = match[2].toLowerCase();
      if (suffix.includes('m')) num *= 1000000;
      else if (suffix.includes('k')) num *= 1000;
      return num;
    }
    return parseFloat(cleaned) || 0;
  }
  
  return 0;
};

// Helper function to format value based on type
const formatAnimatedValue = (value, formattedValue, title) => {
  if (typeof formattedValue === 'string') {
    // Detect format type from original string and title
    const lowerTitle = (title || '').toLowerCase();
    
    // Volume format (ML, L)
    if (formattedValue.includes('ML') || formattedValue.includes('L') || lowerTitle.includes('volume')) {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}ML`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k L`;
      return `${value.toFixed(0)} L`;
    }
    
    // Currency format (£)
    if (formattedValue.includes('£') || lowerTitle.includes('sales') || lowerTitle.includes('profit') || 
        lowerTitle.includes('basket') || lowerTitle.includes('actual ppl')) {
      if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
      return `£${value.toFixed(2)}`;
    }
    
    // Percentage format (%)
    if (formattedValue.includes('%') || lowerTitle.includes('percent') || lowerTitle.includes('%')) {
      return `${value.toFixed(1)}%`;
    }
    
    // Pence format (p)
    if (formattedValue.includes(' p') || lowerTitle.includes('ppl')) {
      return `${value.toFixed(2)} p`;
    }
    
    // Number format (customer count, etc.)
    return value.toLocaleString();
  }
  return formattedValue;
};

// Pure JSX version (no TypeScript types)
const MetricCardComponent = ({ 
  title, 
  value, 
  subtitle, 
  change, 
  changeType = "neutral",
  icon: Icon,
  iconBg,
  sparkline,
  delay = 0,
  chartType = "none",
  chartData = [],
  onClick,
  rawValue // New prop for raw numeric value
}) => {
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef(null);

  // Parse the numeric value
  const numericValue = useMemo(() => {
    return parseNumericValue(value, rawValue);
  }, [value, rawValue]);

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    if (!cardRef.current || hasAnimated || numericValue === 0) return;

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
        threshold: 0.3, // Trigger when 30% of the card is visible
        rootMargin: '0px',
      }
    );

    observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [numericValue, hasAnimated]);

  // Reset animation when value changes
  useEffect(() => {
    setHasAnimated(false);
    setAnimationProgress(0);
  }, [numericValue]);

  // Calculate animated value
  const animatedValue = numericValue * animationProgress;
  const displayValue = hasAnimated && animationProgress < 1 
    ? formatAnimatedValue(animatedValue, value, title)
    : value;
  // Transform chartData for recharts - memoized to prevent recalculation
  const formattedChartData = useMemo(() => {
    return chartData.map((value, index) => ({
      name: index,
      value: value
    }));
  }, [chartData]);

  return (
    <div 
      ref={cardRef}
      className={cn(
        "relative bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-5 border border-border shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up overflow-hidden group",
        onClick && "cursor-pointer"
      )}
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      {/* Header with Icon and Title */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={cn(
            "w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-lg sm:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
            iconBgColors[iconBg]
          )}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wide leading-tight">{title}</p>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="mb-2 sm:mb-3">
        <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight leading-tight">{displayValue}</h3>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5">{subtitle}</p>
        )}
        {change && (
          <p className={cn(
            "text-xs font-semibold mt-2 inline-flex items-center gap-1",
            changeType === "positive" && "text-metric-green",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground"
          )}>
            {changeType === "positive" && "↗"}
            {changeType === "negative" && "↘"}
            {change}
          </p>
        )}
      </div>

      {/* Enhanced Mini Charts */}
      {chartType !== "none" && chartData.length > 0 && (
        <div className="h-16 sm:h-20 mt-3 sm:mt-4 -mb-2 -mx-1 sm:-mx-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart data={formattedChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id={`gradient-${iconBg}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors[iconBg]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColors[iconBg]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartColors[iconBg]} 
                  strokeWidth={2.5}
                  dot={false}
                  fill={`url(#gradient-${iconBg})`}
                />
              </LineChart>
            ) : (
              <BarChart data={formattedChartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <Bar 
                  dataKey="value" 
                  fill={chartColors[iconBg]}
                  radius={[6, 6, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Legacy Sparkline - Enhanced */}
      {sparkline && !chartData.length && (
        <div className="h-12 flex items-end gap-1.5 mt-4">
          {sparkline.map((value, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-md transition-all hover:opacity-80"
              style={{ 
                height: `${(value / Math.max(...sparkline)) * 100}%`,
                backgroundColor: chartColors[iconBg],
                opacity: 0.7
              }}
            />
          ))}
        </div>
      )}

      {/* Decorative gradient overlay */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{ backgroundColor: chartColors[iconBg] }}
      />
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const MetricCard = memo(MetricCardComponent);
