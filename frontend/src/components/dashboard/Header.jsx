import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ADMIN_TOKEN_KEY } from "@/services/api";

const ADMIN_PROFILE_KEY = 'hsrl_admin_profile';

function useWelcomeInfo() {
  const { user } = useAuth();

  // User session
  if (user?.email) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return { name: fullName || user.email.split("@")[0], isAdmin: false };
  }

  // Admin session — read cached profile first, fallback to JWT
  const adminRaw = typeof localStorage !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  if (adminRaw) {
    try {
      const payload = JSON.parse(atob(adminRaw.split(".")[1]));
      if (payload.role === "admin" && Date.now() < payload.exp * 1000) {
        const cached = localStorage.getItem(ADMIN_PROFILE_KEY);
        let name = payload.username || "Admin";
        if (cached) {
          const profile = JSON.parse(cached);
          const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
          if (fullName) name = fullName;
        }
        return { name, isAdmin: true };
      }
    } catch {}
  }
  return null;
}

import { Menu } from "lucide-react";

export const Header = ({
  sidebarOpen,
  onToggleSidebar,
  totalSales,
  showTotalSales = true,
  showRevenueInMillions = false,
  onToggleRevenueInMillions,
}) => {

  // Format total sales value
  const formatTotalSales = (amount) => {
    if (!amount) return { number: "0", unit: "" };
    if (amount >= 1000000) {
      return { number: (amount / 1000000).toFixed(2), unit: "M" };
    }
    if (amount >= 1000) {
      return { number: (amount / 1000).toFixed(2), unit: "K" };
    }
    return { number: amount.toFixed(2), unit: "" };
  };

  const salesFormatted = formatTotalSales(Math.abs(totalSales || 0));
  const welcomeInfo = useWelcomeInfo();
  const { theme, toggleTheme, darkModeToggleEnabled, uiConfigHydrated } = useTheme();
  const isDarkTheme = theme === "dark";
  const showThemeToggle = uiConfigHydrated && darkModeToggleEnabled;

  return (
    <header className="flex w-full min-w-0 overflow-x-hidden shrink-0 flex-col gap-1 bg-transparent px-3 py-1.5 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-4 sm:py-0 lg:px-6">
      {/* Row 1 — [≡ menu] + company name on same line at all sizes */}
      <div className="flex w-full min-w-0 items-center gap-2 sm:min-h-0 sm:w-auto sm:flex-1 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex flex-shrink-0 p-1 sm:p-1.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border/60"
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={sidebarOpen}
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
        </button>
        <div className="min-w-0 flex-1 sm:flex-none">
          <span className="font-bold uppercase tracking-wide text-foreground block truncate text-sm sm:text-xs md:text-sm lg:text-base sm:max-w-[min(100%,28rem)]">
            HIGHWAY STOPS RETAIL LIMITED
          </span>
        </div>
      </div>

      {/* Row 2 — mobile: sales + toggle + HSRL. sm+: right-aligned cluster. */}
      <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:justify-end sm:gap-2 lg:gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 sm:flex-none sm:gap-2 sm:flex-nowrap sm:gap-y-0">
          {showTotalSales && (
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1 sm:py-2 lg:py-2.5 rounded-lg font-semibold shadow-sm bg-primary text-primary-foreground">
              <span className="text-xs sm:text-sm font-semibold hidden sm:inline">Total Sales:</span>
              <span className="text-xs font-semibold sm:hidden">Sales:</span>
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-xs sm:text-sm font-medium opacity-90">£</span>
                <span className="text-sm sm:text-lg font-bold">{salesFormatted.number}</span>
                {salesFormatted.unit && <span className="text-xs sm:text-sm font-semibold opacity-90">{salesFormatted.unit}</span>}
              </div>
            </div>
          )}

          {typeof onToggleRevenueInMillions === "function" && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-border bg-background">
              <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Show M</span>
              <Switch checked={showRevenueInMillions} onCheckedChange={onToggleRevenueInMillions} />
            </div>
          )}

          {showThemeToggle && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border border-border bg-background">
              <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Dark UI</span>
              <Switch checked={isDarkTheme} onCheckedChange={toggleTheme} />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center border-l border-border pl-1.5 sm:pl-2 lg:pl-4">
          <div className="h-6 sm:h-8 lg:h-10 px-1.5 sm:px-2.5 lg:px-3 rounded-lg sm:rounded-full bg-gradient-to-br from-primary to-chart-blue flex items-center justify-center">
            <span className="text-[10px] sm:text-sm lg:text-base font-bold text-primary-foreground tracking-wide">
              HSRL
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;


