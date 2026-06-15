import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SiteComparison } from "@/components/comparison/SiteComparison";
import { GitCompare } from "lucide-react";

const Comparison = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

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

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col bg-transparent">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main
          style={{ willChange: 'margin-left' }}
          className={`flex flex-1 flex-col min-h-0 min-w-0 transition-[margin-left] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'} ml-0`}
        >
          <div className="mx-2 mt-2 mb-3 flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:mx-3 sm:mt-3 sm:mb-4 sm:gap-3 lg:mx-5 lg:mt-4 lg:mb-6 lg:gap-3">
          <div className="main-stage-header-card">
            <Header
              sidebarOpen={sidebarOpen}
              onToggleSidebar={toggleSidebar}
              showTotalSales={false}
            />
          </div>
          
          <div className="main-stage-card flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="box-border min-h-0 min-w-0 w-full max-w-full flex-1 px-0 py-4 sm:px-4 sm:py-5 lg:px-8 lg:py-8">
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
          </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Comparison;

