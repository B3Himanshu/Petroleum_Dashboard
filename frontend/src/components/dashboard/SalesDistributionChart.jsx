import { useState, useEffect, useMemo, useRef } from "react";
import Plot from "react-plotly.js";
import { TrendingUp } from "lucide-react";
import { dashboardAPI } from "@/services/api";

const colorMap = {
  "Fuel Sales": "#3b82f6",
  "Bunkered Sales": "#3b82f6",
  "Non-bunkered Sales": "#10b981",
  "Shop Sales": "#f59e0b",
  "Valet Sales": "#8b5cf6",
};

const colors = ["#3b82f6", "#10b981", "#f59e0b", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f43f5e", "#a855f7"];

export const SalesDistributionChart = ({ siteId, month, months, year, years }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const chartRef = useRef(null);

  // Detect screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (!siteId || siteId === 'all') {
      setChartData([]);
      return;
    }

    // Use months/years arrays if provided, otherwise use single values
    const monthsToUse = (months && Array.isArray(months) && months.length > 0) 
      ? months 
      : (month ? [month] : []);
    
    const yearsToUse = (years && Array.isArray(years) && years.length > 0) 
      ? years 
      : (year ? [year] : []);

    if (monthsToUse.length === 0 || yearsToUse.length === 0) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 [SalesDistributionChart] Fetching data:', {
          siteId,
          months: monthsToUse,
          years: yearsToUse,
        });
        
        // Get aggregated sales distribution across all selected months/years
        const data = await dashboardAPI.getSalesDistribution(siteId, monthsToUse, yearsToUse);
        
        console.log('📊 [SalesDistributionChart] Received data:', data);
        
        // Filter out Valet Sales and any items with zero or very small values
        // Show Fuel Sales and Shop Sales only
        const filteredData = data.filter(item => 
          item.name !== "Valet Sales" &&
          item.value > 0.01 // Only include items with meaningful values
        );
        
        // Transform API data to chart format with colors
        const transformed = filteredData.map((item) => ({
          name: item.name,
          value: item.value,
          color: colorMap[item.name] || colors[filteredData.indexOf(item) % colors.length]
        }));
        setChartData(transformed);
      } catch (error) {
        console.error('❌ [SalesDistributionChart] Error fetching sales data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId, month, months, year, years]);

  // Calculate total for center label (safe even if chartData is empty)
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  // Animated total for center display
  const animatedTotal = total * animationProgress;

  // Format total for display
  const formatTotal = (value) => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `£${(value / 1000).toFixed(0)}k`;
    }
    return `£${value.toFixed(0)}`;
  };

  // Format currency for display
  const formatCurrency = (value) => {
    return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    if (!chartRef.current || hasAnimated || !chartData || chartData.length === 0) return;

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
        threshold: 0.2, // Trigger when 20% of the chart is visible
        rootMargin: '0px',
      }
    );

    observer.observe(chartRef.current);

    return () => {
      if (chartRef.current) {
        observer.unobserve(chartRef.current);
      }
    };
  }, [chartData, hasAnimated]);

  // Reset animation when data changes
  useEffect(() => {
    setHasAnimated(false);
    setAnimationProgress(0);
  }, [chartData]);

  // Apply text shadow styling to Plotly pie chart text
  useEffect(() => {
    if (!chartData || chartData.length === 0) return;

    const applyTextStyling = () => {
      const pieTextElements = document.querySelectorAll('.js-plotly-plot .pie text');
      pieTextElements.forEach((textEl) => {
        textEl.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.9), -2px -2px 4px rgba(0, 0, 0, 0.9), 2px -2px 4px rgba(0, 0, 0, 0.9), -2px 2px 4px rgba(0, 0, 0, 0.9)';
        textEl.style.fontWeight = 'bold';
      });
    };

    applyTextStyling();
    const timeoutId = setTimeout(applyTextStyling, 100);
    const observer = new MutationObserver(applyTextStyling);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [chartData, loading, animationProgress]);

  // Prepare Plotly pie chart data (must be before early returns)
  const plotlyData = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    const labels = chartData.map(item => item.name);
    // Animate values from 0 to actual values based on animationProgress
    const values = chartData.map(item => item.value * animationProgress);
    const colors = chartData.map(item => item.color);

    return {
      data: [{
        labels: labels,
        values: values,
        type: 'pie',
        hole: isMobile ? 0.55 : 0.5, // Slightly larger hole on mobile for better center text visibility
        marker: {
          colors: colors,
          line: {
            color: 'hsl(var(--background))',
            width: 2,
          },
        },
        textinfo: 'percent',
        textposition: 'inside',
        textfont: {
          size: isMobile ? 11 : 13,
          color: '#ffffff',
          family: 'Arial, sans-serif',
        },
        insidetextorientation: 'radial',
        hovertemplate: '<span style="color: white;"><b>%{label}</b><br>' +
          'Sales: £%{value:,.2f}<br>' +
          'Percentage: %{percent}<br>' +
          '</span><extra></extra>',
        rotation: 90,
        sort: false,
      }],
      layout: {
        title: {
          text: '',
        },
        annotations: [
          {
            text: 'Sales:',
            x: 0.5,
            y: 0.55,
            xref: 'paper',
            yref: 'paper',
            showarrow: false,
            font: {
              size: isMobile ? 11 : 13,
              color: 'hsl(var(--muted-foreground))',
              family: 'Arial, sans-serif',
            },
          },
          {
            text: formatTotal(animatedTotal),
            x: 0.5,
            y: 0.45,
            xref: 'paper',
            yref: 'paper',
            showarrow: false,
            font: {
              size: isMobile ? 18 : 24,
              color: 'hsl(var(--foreground))',
              family: 'Arial, sans-serif',
            },
          },
        ],
        showlegend: false, // We'll use the table instead
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {
          color: 'hsl(var(--foreground))',
          family: 'Arial, sans-serif',
        },
        margin: { 
          l: isMobile ? 10 : 20, 
          r: isMobile ? 10 : 20, 
          t: isMobile ? 10 : 20, 
          b: isMobile ? 10 : 20 
        },
        hoverlabel: {
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          bordercolor: 'rgba(255, 255, 255, 0.3)',
          font: {
            color: '#ffffff',
            size: isMobile ? 11 : 13,
            family: 'Arial, sans-serif',
          },
          namelength: -1,
        },
        autosize: true,
      },
      config: {
        displayModeBar: true,
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
      },
    };
  }, [chartData, total, animationProgress, isMobile]);
  // Early returns after all hooks
  if (loading) {
    return (
      <div className="chart-card min-h-[600px] sm:min-h-[380px] lg:min-h-[450px] h-auto sm:h-[380px] lg:h-[450px] animate-slide-up" style={{ animationDelay: "600ms" }}>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <div className="text-muted-foreground text-sm sm:text-base">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-card min-h-[600px] sm:min-h-[380px] lg:min-h-[450px] h-auto sm:h-[380px] lg:h-[450px] animate-slide-up" style={{ animationDelay: "600ms" }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">Sales Distribution</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Sales breakdown by category</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px] sm:h-[320px]">
          <div className="text-muted-foreground text-sm sm:text-base">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card min-h-[600px] sm:min-h-[380px] lg:min-h-[450px] h-auto sm:h-[380px] lg:h-[450px] animate-slide-up" style={{ animationDelay: "600ms" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">Sales Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Sales breakdown by category</p>
          </div>
        </div>
        <div className="text-xs sm:text-sm font-semibold text-foreground bg-card/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-border/50 whitespace-nowrap">
          Total: {formatCurrency(total)}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Donut Chart */}
        <div className="h-[250px] sm:h-[300px] lg:h-[320px] relative flex items-center justify-center bg-transparent" ref={chartRef}>
          {plotlyData ? (
            <div className="w-full h-full bg-transparent">
              <Plot
                data={plotlyData.data}
                layout={plotlyData.layout}
                config={plotlyData.config}
                style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                useResizeHandler={true}
                onInitialized={(figure, graphDiv) => {
                  // Add text shadow to pie chart text for better visibility
                  // Also ensure Plotly background is transparent
                  if (graphDiv) {
                    const currentIsMobile = window.innerWidth < 640;
                    const pieTextElements = graphDiv.querySelectorAll('.pie text');
                    pieTextElements.forEach((textEl) => {
                      textEl.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.9), -2px -2px 4px rgba(0, 0, 0, 0.9), 2px -2px 4px rgba(0, 0, 0, 0.9), -2px 2px 4px rgba(0, 0, 0, 0.9)';
                      textEl.style.fontWeight = 'bold';
                      textEl.style.fontSize = currentIsMobile ? '11px' : '13px';
                    });
                    // Ensure Plotly container background is transparent
                    const plotlyContainer = graphDiv.querySelector('.js-plotly-plot');
                    if (plotlyContainer) {
                      plotlyContainer.style.backgroundColor = 'transparent';
                    }
                    // Ensure plot background is transparent
                    const plotDiv = graphDiv.querySelector('.plotly');
                    if (plotDiv) {
                      plotDiv.style.backgroundColor = 'transparent';
                    }
                  }
                }}
                onUpdate={(figure, graphDiv) => {
                  // Reapply text shadow on updates
                  // Also ensure Plotly background is transparent
                  if (graphDiv) {
                    const currentIsMobile = window.innerWidth < 640;
                    const pieTextElements = graphDiv.querySelectorAll('.pie text');
                    pieTextElements.forEach((textEl) => {
                      textEl.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.9), -2px -2px 4px rgba(0, 0, 0, 0.9), 2px -2px 4px rgba(0, 0, 0, 0.9), -2px 2px 4px rgba(0, 0, 0, 0.9)';
                      textEl.style.fontWeight = 'bold';
                      textEl.style.fontSize = currentIsMobile ? '11px' : '13px';
                    });
                    // Ensure Plotly container background is transparent
                    const plotlyContainer = graphDiv.querySelector('.js-plotly-plot');
                    if (plotlyContainer) {
                      plotlyContainer.style.backgroundColor = 'transparent';
                    }
                    // Ensure plot background is transparent
                    const plotDiv = graphDiv.querySelector('.plotly');
                    if (plotDiv) {
                      plotDiv.style.backgroundColor = 'transparent';
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="text-muted-foreground">No data available</div>
          )}
        </div>

        {/* Legend Table */}
        <div className="overflow-y-auto h-[250px] sm:h-[300px] lg:h-[320px] bg-transparent rounded-lg">
          <table className="w-full text-xs sm:text-sm bg-transparent">
            <thead className="sticky top-0 bg-card z-10 border-b border-border">
              <tr className="border-b border-border">
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground">Category</th>
                <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground">Sales</th>
              </tr>
            </thead>
            <tbody className="bg-transparent">
              {chartData.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-border/60 hover:bg-muted/40 transition-colors bg-transparent"
                >
                  <td className="py-2 sm:py-3 px-2 sm:px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-foreground font-medium truncate">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-foreground font-medium whitespace-nowrap">
                    {formatCurrency(item.value)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border font-semibold bg-muted/20">
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground">Total</td>
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-foreground">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

