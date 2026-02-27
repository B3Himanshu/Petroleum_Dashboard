import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SiteComparison } from "@/components/comparison/SiteComparison";
import { sitesAPI, dashboardAPI } from "@/services/api";
import { GitCompare } from "lucide-react";

const Comparison = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [totalSalesAllSites, setTotalSalesAllSites] = useState(null);

  // Handle responsive sidebar on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Fetch total sales across all sites (all months, all years)
  useEffect(() => {
    const fetchTotalSales = async () => {
      try {
        // Get all sales data (no month/year filter) - shows grand total
        console.log('📊 [Comparison] Fetching total sales across all sites (all data):');
        
        const totalSalesData = await dashboardAPI.getTotalSales(null, null);
        setTotalSalesAllSites(totalSalesData?.totalSales || 0);
        
        console.log('✅ [Comparison] Total sales across all sites received:', {
          totalSales: totalSalesData?.totalSales,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ [Comparison] Error fetching total sales:', error);
        setTotalSalesAllSites(0);
      }
    };

    fetchTotalSales();
  }, []); // Only fetch once on mount

  return (
    <div className="min-h-screen bg-background relative">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div>
        <main 
          style={{ willChange: 'margin-left' }}
          className={`transition-[margin-left] duration-500 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} ml-0`}
        >
          <Header 
            sidebarOpen={sidebarOpen} 
            onToggleSidebar={toggleSidebar} 
            totalSales={totalSalesAllSites}
          />
          
          <div className="p-4 lg:p-6">
            {/* Page Title */}
            <div className="mb-4 lg:mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GitCompare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">Site Comparison</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Compare performance metrics between two sites</p>
              </div>
            </div>

            {/* Comparison Component */}
            <SiteComparison />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Comparison;

