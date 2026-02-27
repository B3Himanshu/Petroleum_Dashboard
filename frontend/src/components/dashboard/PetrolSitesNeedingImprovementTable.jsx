import { useState, useEffect, memo } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardAPI } from "@/services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PetrolSitesNeedingImprovementTableComponent = ({ startDate, endDate, hideTitle, siteIds }) => {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) {
      setTableData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📊 [PetrolSitesNeedingImprovementTable] Fetching data:', { startDate, endDate, siteIds });
        
        const response = await dashboardAPI.getPetrolSiteRankings(startDate, endDate, siteIds);
        
        console.log('📊 [PetrolSitesNeedingImprovementTable] Received data:', response);
        
        const bottom = Array.isArray(response?.data?.bottom) ? response.data.bottom : Array.isArray(response?.bottom) ? response.bottom : [];
        setTableData(bottom);
      } catch (error) {
        console.error('❌ [PetrolSitesNeedingImprovementTable] Error fetching data:', error);
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, siteIds]);

  // Format currency (values from API are always positive)
  const formatCurrency = (amount) => {
    if (!amount) return "£0";
    const v = Math.abs(Number(amount));
    if (v >= 1000000) return `£${(v / 1000000).toFixed(2)}M`;
    if (v >= 1000) return `£${(v / 1000).toFixed(1)}k`;
    return `£${v.toFixed(0)}`;
  };

  // Get rank badge (simple number for bottom sites)
  const getRankBadge = (rank) => {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive font-bold text-sm border border-destructive/20">
        {rank}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="chart-card animate-slide-up">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading data...</div>
        </div>
      </div>
    );
  }

  if (!tableData || tableData.length === 0) {
    return (
      <div className="chart-card animate-slide-up">
        {!hideTitle && (
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Sites Needing Improvement
          </h3>
        )}
        <div className="flex flex-col items-center justify-center h-64 gap-2 text-center px-4">
          <div className="text-muted-foreground">No rankings for this date range.</div>
          <div className="text-sm text-muted-foreground/80">Try a different range or ensure transactions exist for sites 6–45.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card animate-slide-up">
      {!hideTitle && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="text-lg font-semibold text-foreground">
              Sites Needing Improvement
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1" title="The 5 sites with the lowest profit.">
            Bottom 5 by profit (lowest performers).
          </p>
        </div>
      )}
      <div className="w-full min-w-0 overflow-visible">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-center">Rank</TableHead>
              <TableHead className="min-w-[180px]">Site Name</TableHead>
              <TableHead className="text-right min-w-[130px]">Net Sales</TableHead>
              <TableHead className="text-right min-w-[125px]" title="Revenue − Cost (always shown as positive).">Profit</TableHead>
              <TableHead className="text-right min-w-[110px]" title="Fuel profit as % of fuel sales.">Fuel margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, index) => (
              <TableRow
                key={index}
                className={cn(
                  "hover:bg-destructive/5 transition-colors",
                  index % 2 === 0 ? 'bg-destructive/5' : ''
                )}
              >
                <TableCell className="text-center">
                  {getRankBadge(index + 1)}
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  {row.name}
                </TableCell>
                <TableCell className="text-right font-semibold text-destructive/80">
                  {formatCurrency(row.net_sales || 0)}
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">
                  {formatCurrency(row.fuel_profit ?? 0)}
                </TableCell>
                <TableCell className="text-right font-semibold text-foreground">
                  {row.ppl != null ? `${Math.max(0, row.ppl).toFixed(1)}%` : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const PetrolSitesNeedingImprovementTable = memo(PetrolSitesNeedingImprovementTableComponent);
