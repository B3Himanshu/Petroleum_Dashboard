import {
  LayoutDashboard,
  GitCompare,
  BarChart3,
  Fuel,
  Menu,
  X,
  Building2,
  Sparkles,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

// Pure JSX version of NavItem (no TypeScript types)
const NavItem = ({ icon, label, active, path }) => {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(path)}
      className={cn("sidebar-nav-item w-full", active && "active")}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
};

// Pure JSX Sidebar component
export const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      {/* Floating Hamburger Button - Visible when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-4 left-4 z-[1001] p-2 rounded-lg bg-sidebar-bg border border-sidebar-muted/20 hover:bg-sidebar-muted/20 transition-colors shadow-lg"
          title="Show Sidebar"
        >
          <Menu className="w-5 h-5 text-sidebar-foreground" />
        </button>
      )}

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        style={{ 
          willChange: "transform",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "16rem",
          zIndex: 1000
        }}
        className={cn(
          "bg-sidebar-bg flex flex-col border-r border-white/10",
          "transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
      >
        {/* Logo and Hamburger Button - Fixed at top */}
        <div className="flex-shrink-0 p-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Platinum Retail Limited Logo */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-sidebar-foreground" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">
              Platinum Retail Limited
            </span>
          </div>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-sidebar-muted/20 transition-colors"
            title={isOpen ? "Hide Sidebar" : "Show Sidebar"}
          >
            {isOpen ? (
              <X className="w-5 h-5 text-sidebar-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-sidebar-foreground" />
            )}
          </button>
        </div>

        {/* Main Navigation - No scrolling, content fits naturally */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-sidebar-muted uppercase tracking-wider">
            Main Menu
          </p>

          <NavItem
            icon={<Sparkles className="w-5 h-5" />}
            label="Dashboard"
            path="/dashboard"
            active={currentPath === "/dashboard"}
          />

          <NavItem
            icon={<BarChart3 className="w-5 h-5" />}
            label="Metrics Comparison"
            path="/metrics-comparison"
            active={currentPath === "/metrics-comparison"}
          />

          <NavItem
            icon={<GitCompare className="w-5 h-5" />}
            label="Site Comparison"
            path="/comparison"
            active={currentPath === "/comparison"}
          />

          <NavItem
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Location Dashboard"
            path="/location-dashboard"
            active={currentPath === "/location-dashboard"}
          />
        </nav>
      </aside>
    </>
  );
};


