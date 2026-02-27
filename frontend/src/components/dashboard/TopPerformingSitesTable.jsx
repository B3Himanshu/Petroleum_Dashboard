import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { sitesAPI, dashboardAPI } from "@/services/api";

export const TopPerformingSitesTable = ({ siteId, month, months, year, years }) => {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!siteId) {
      setTableData([]);
      return;
    }

    // Use months/years arrays if provided, otherwise use single values
    const monthsToUse = (months && months.length > 0) ? months : (month ? [month] : []);
    const yearsToUse = (years && years.length > 0) ? years : (year ? [year] : []);

    if (monthsToUse.length === 0 || yearsToUse.length === 0) {
      setTableData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch aggregated metrics for the selected site across all months/years
        const metrics = await dashboardAPI.getMetrics(siteId, monthsToUse, yearsToUse);
        const site = await sitesAPI.getById(siteId);
        
        // For now, show only the selected site
        // In the future, this could be expanded to show top sites across all sites
        setTableData([{
          site: site?.name || `Site ${siteId}`,
          sales: metrics.netSales || 0,
          avgPPL: metrics.avgPPL || 0
        }]);
      } catch (error) {
        console.error('Error fetching top performing sites:', error);
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [siteId, month, months, year, years]);

  const maxSales = tableData.length > 0 ? Math.max(...tableData.map((d) => d.sales)) : 0;

  if (loading) {
    return (
      <div className="chart-card animate-slide-up" style={{ animationDelay: "500ms" }}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading data...</div>
        </div>
      </div>
    );
  }

  if (!tableData || tableData.length === 0) {
    return (
      <div className="chart-card animate-slide-up" style={{ animationDelay: "500ms" }}>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Top Performing Sites
        </h3>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card animate-slide-up" style={{ animationDelay: "500ms" }}>
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Top Performing Sites
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-foreground">Site</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">Sales</th>
              <th className="text-right py-3 px-4 font-semibold text-foreground">Avg. PPL</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">Progress</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr
                key={index}
                className="border-b border-border/60 hover:bg-muted/40 transition-colors"
              >
                <td className="py-3 px-4 text-foreground font-medium">{row.site}</td>
                <td className="py-3 px-4 text-right text-foreground">
                  £{row.sales.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right text-foreground">{row.avgPPL.toFixed(2)}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(row.sales / maxSales) * 100}
                      className="h-2 flex-1"
                    />
                    <span className="text-xs text-muted-foreground min-w-[3rem] text-right">
                      {Math.round((row.sales / maxSales) * 100)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

