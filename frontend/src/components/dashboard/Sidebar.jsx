import {
  LayoutDashboard,
  GitCompare,
  BarChart3,
  Building2,
  Sparkles,
  LogOut,
  UserCircle2,
  ShieldCheck,
  Settings,
  Users,
  Download,
} from "lucide-react";

const isAndroid = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_TOKEN_KEY } from "@/services/api";

const ADMIN_PROFILE_KEY = 'hsrl_admin_profile';

function useSessionInfo() {
  const { user } = useAuth();

  // User session takes priority
  if (user?.email) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const displayName = fullName || user.email.split("@")[0];
    return { name: user.email, greeting: `Welcome, ${displayName}`, isAdmin: false };
  }

  // Only show admin if no user session
  const adminRaw = typeof localStorage !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  if (adminRaw) {
    try {
      const payload = JSON.parse(atob(adminRaw.split(".")[1]));
      if (payload.role === "admin" && Date.now() < payload.exp * 1000) {
        const cached = localStorage.getItem(ADMIN_PROFILE_KEY);
        let displayName = payload.username || "Admin";
        if (cached) {
          const profile = JSON.parse(cached);
          const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
          if (fullName) displayName = fullName;
        }
        return { name: payload.username, greeting: `Welcome, ${displayName}`, isAdmin: true };
      }
    } catch {}
  }

  return null;
}

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
  const navigate = useNavigate();
  const { logout } = useAuth();
  const currentPath = location.pathname;
  const session = useSessionInfo();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Sidebar open/close: header hamburger only (avoids duplicate desktop toggle) */}

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
          height: "100dvh",
          width: "16rem",
          zIndex: 1000
        }}
        className={cn(
          "bg-sidebar-bg/90 backdrop-blur-xl flex flex-col border-r border-white/30 dark:border-white/10",
          "transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "overflow-hidden",
          isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
      >
        {/* Logo only — open/close via header menu control */}
        <div className="flex-shrink-0 px-4 py-3 flex items-center justify-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" aria-hidden>
            <Building2 className="w-6 h-6 text-sidebar-foreground" />
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-4 py-1 space-y-1 overflow-hidden">
          <p className="px-4 py-2 text-sm font-semibold text-sidebar-muted uppercase tracking-wider">
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

          {session?.isAdmin && (
            <NavItem
              icon={<Users className="w-5 h-5" />}
              label="Manage Users"
              path="/admin"
              active={currentPath === "/admin"}
            />
          )}

          {/* Location Dashboard - hidden (not removed); set to true to show */}
          {false && (
            <NavItem
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Location Dashboard"
              path="/location-dashboard"
              active={currentPath === "/location-dashboard"}
            />
          )}
        </nav>

        {isAndroid && (
          <div className="flex-shrink-0 px-3 pb-2 lg:hidden">
            <a
              href="/app-release.apk"
              download="HSRL-App.apk"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-green-500/15 border border-green-500/25 hover:bg-green-500/25 transition-colors w-full"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-500/20 text-green-400">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-green-400/70 leading-none mb-1">Android App</p>
                <p className="text-sm font-semibold text-green-300">Download App</p>
              </div>
            </a>
          </div>
        )}

        {session && (
          <div className="flex-shrink-0 px-3 pt-3 pb-3 border-t border-border/60">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-background/70 border border-border/70 hover:bg-muted/60 transition-colors">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-2",
                session.isAdmin
                  ? "bg-amber-500/20 text-amber-400 ring-amber-500/30"
                  : "bg-blue-500/20 text-blue-400 ring-blue-500/30"
              )}>
                {session.isAdmin ? <ShieldCheck className="w-4 h-4" /> : <UserCircle2 className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-sidebar-muted leading-none mb-1">
                  {session.isAdmin ? "Administrator" : "Signed in as"}
                </p>
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{session.name}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(session.isAdmin ? "/admin/settings" : "/settings")}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0 text-sidebar-muted hover:text-sidebar-foreground"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 px-4 pb-3">
          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-nav-item w-full text-sidebar-muted hover:text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5" />
            <span className="flex-1 text-left">Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
};


