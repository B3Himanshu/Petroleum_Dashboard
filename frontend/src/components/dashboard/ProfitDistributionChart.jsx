import { useState, useEffect, useMemo, useRef } from "react";
import Plot from "react-plotly.js";
import { TrendingUp } from "lucide-react";
import { dashboardAPI } from "@/services/api";

export const ProfitDistributionChart = ({ startDate, endDate }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const chartRef = useRef(null);

  // Fetch profit by site data
  useEffect(() => {
    if (!startDate || !endDate) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('💰 [ProfitDistributionChart] Fetching data:', { startDate, endDate });
        
        const data = await dashboardAPI.getPetrolProfitBySite(startDate, endDate);
        
        console.log('💰 [ProfitDistributionChart] Received data:', data);
        
        // Filter out sites with zero or very small profit
        const filteredData = (data || []).filter(item => item.profit > 0.01);
        
        setChartData(filteredData);
      } catch (error) {
        console.error('❌ [ProfitDistributionChart] Error fetching data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Intersection Observer for scroll-triggered animation
  useEffect(() => {
    if (!chartRef.current || hasAnimated || !chartData || chartData.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            let startTime = null;
            const duration = 1500;

            const animate = (timestamp) => {
              if (!startTime) startTime = timestamp;
              const progress = Math.min((timestamp - startTime) / duration, 1);
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
        threshold: 0.2,
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

  // Calculate total profit
  const totalProfit = chartData.reduce((sum, item) => sum + item.profit, 0);
  const animatedTotal = totalProfit * animationProgress;

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

  // Generate color palette
  const generateColorPalette = (count) => {
    const baseColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
      '#14b8a6', '#ef4444', '#6366f1', '#84cc16', '#f97316'
    ];
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  };

  // Prepare Plotly donut chart data
  const plotlyData = useMemo(() => {
    if (!chartData || chartData.length === 0) return null;

    const labels = chartData.map(item => item.site_name);
    // Animate values from 0 to actual values based on animationProgress
    const values = chartData.map(item => item.profit * animationProgress);
    const colors = generateColorPalette(labels.length);

    return {
      data: [{
        labels: labels,
        values: values,
        type: 'pie',
        hole: 0.6, // Larger hole for donut chart
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
          size: 11,
          color: '#ffffff',
          family: 'Arial, sans-serif',
        },
        insidetextorientation: 'radial',
        hovertemplate: '<span style="color: white;"><b>%{label}</b><br>' +
          'Profit: £%{value:,.2f}<br>' +
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
            text: 'Total Profit',
            x: 0.5,
            y: 0.55,
            xref: 'paper',
            yref: 'paper',
            showarrow: false,
            font: {
              size: 11,
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
              size: 18,
              color: 'hsl(var(--foreground))',
              family: 'Arial, sans-serif',
            },
          },
        ],
        showlegend: true,
        legend: {
          orientation: 'v',
          yanchor: 'middle',
          y: 0.5,
          xanchor: 'left',
          x: 1.02,
          font: {
            color: 'hsl(var(--foreground))',
            size: 10,
            family: 'Arial, sans-serif',
          },
          itemclick: false,
          itemdoubleclick: false,
          traceorder: 'normal',
          itemwidth: 25,
          bgcolor: 'transparent',
          bordercolor: 'hsl(var(--border))',
          borderwidth: 1,
        },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: {
          color: 'hsl(var(--foreground))',
          family: 'Arial, sans-serif',
        },
        margin: { l: 10, r: 150, t: 10, b: 10 },
        hoverlabel: {
          bgcolor: 'rgba(0, 0, 0, 0.85)',
          bordercolor: 'rgba(255, 255, 255, 0.3)',
          font: {
            color: '#ffffff',
            size: 13,
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
  }, [chartData, totalProfit, animationProgress, animatedTotal]);

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

  if (loading) {
    return (
      <div className="chart-card min-h-[400px] sm:min-h-[380px] lg:min-h-[450px] h-auto sm:h-[380px] lg:h-[450px] animate-slide-up">
        <div className="flex items-center justify-center min-h-[300px] sm:h-full">
          <div className="text-muted-foreground text-sm sm:text-base">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-card min-h-[400px] sm:min-h-[380px] lg:min-h-[450px] h-auto sm:h-[380px] lg:h-[450px] animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">Profit Distribution by Site</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Top 10 sites by profit contribution</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[280px] sm:h-[280px] lg:h-[320px]">
          <div className="text-muted-foreground text-sm sm:text-base">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card min-h-[400px] sm:min-h-[380px] lg:min-h-[450px] h-auto sm:h-[380px] lg:h-[450px] animate-slide-up" ref={chartRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">Profit Distribution by Site</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top 10 sites by profit contribution</p>
          </div>
        </div>
        <div className="text-xs sm:text-sm font-semibold text-foreground bg-card/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-border/50 whitespace-nowrap">
          Total: {formatCurrency(totalProfit)}
        </div>
      </div>
      
      <div className="h-[280px] sm:h-[280px] lg:h-[320px] relative flex items-center justify-center bg-transparent">
        {plotlyData ? (
          <div className="w-full h-full bg-transparent">
            <Plot
              data={plotlyData.data}
              layout={plotlyData.layout}
              config={plotlyData.config}
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
              useResizeHandler={true}
              onInitialized={(figure, graphDiv) => {
                if (graphDiv) {
                  const pieTextElements = graphDiv.querySelectorAll('.pie text');
                  pieTextElements.forEach((textEl) => {
                    textEl.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.9), -2px -2px 4px rgba(0, 0, 0, 0.9), 2px -2px 4px rgba(0, 0, 0, 0.9), -2px 2px 4px rgba(0, 0, 0, 0.9)';
                    textEl.style.fontWeight = 'bold';
                    textEl.style.fontSize = '13px';
                  });
                  const plotlyContainer = graphDiv.querySelector('.js-plotly-plot');
                  if (plotlyContainer) {
                    plotlyContainer.style.backgroundColor = 'transparent';
                  }
                  const plotDiv = graphDiv.querySelector('.plotly');
                  if (plotDiv) {
                    plotDiv.style.backgroundColor = 'transparent';
                  }
                }
              }}
              onUpdate={(figure, graphDiv) => {
                if (graphDiv) {
                  const pieTextElements = graphDiv.querySelectorAll('.pie text');
                  pieTextElements.forEach((textEl) => {
                    textEl.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.9), -2px -2px 4px rgba(0, 0, 0, 0.9), 2px -2px 4px rgba(0, 0, 0, 0.9), -2px 2px 4px rgba(0, 0, 0, 0.9)';
                    textEl.style.fontWeight = 'bold';
                    textEl.style.fontSize = '13px';
                  });
                  const plotlyContainer = graphDiv.querySelector('.js-plotly-plot');
                  if (plotlyContainer) {
                    plotlyContainer.style.backgroundColor = 'transparent';
                  }
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
    </div>
  );
};
