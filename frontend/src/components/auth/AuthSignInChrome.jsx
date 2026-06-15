import { cn } from "@/lib/utils";

function BarChartBrandIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-10 w-10 text-white", className)}
      aria-hidden
    >
      <rect x="4" y="14" width="4.5" height="6" rx="1" fill="currentColor" />
      <rect x="9.75" y="10" width="4.5" height="10" rx="1" fill="currentColor" />
      <rect x="15.5" y="5" width="4.5" height="15" rx="1" fill="currentColor" />
    </svg>
  );
}

const PILL_LABELS = ["FUEL", "SHOP", "VALET", "ROI"];

/** Shared hero for /login and /admin/login — HSRL + tagline + dashboard title + pills (light theme) */
export function AuthBrandHeader({ className }) {
  return (
    <header className={cn("flex w-full max-w-lg flex-col items-center text-center", className)}>
      <div
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-lg shadow-blue-600/25"
        aria-hidden
      >
        <BarChartBrandIcon />
      </div>
      <h1 className="mt-5 text-[clamp(1.85rem,6vw+0.4rem,3.25rem)] font-extrabold leading-none tracking-tight text-foreground">
        HSRL
      </h1>
      <p className="mt-2.5 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        Petroleum Business Fuel Solutions
      </p>
      <div
        className="mt-4 h-px w-9 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"
        aria-hidden
      />
      <p className="mt-4 text-[1.05rem] font-semibold leading-snug text-foreground">
        Business Performance Dashboard
      </p>
      <ul className="mt-4 flex max-w-full flex-wrap justify-center gap-2 px-1">
        {PILL_LABELS.map((label) => (
          <li key={label}>
            <span className="inline-flex rounded-full border border-primary/55 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-foreground">
              {label}
            </span>
          </li>
        ))}
      </ul>
    </header>
  );
}

/** Light backdrop + centered column; matches app theme when dark mode is off */
export function AuthSignInShell({ children }) {
  return (
    <div className="relative flex min-h-screen min-w-0 flex-col items-center justify-center overflow-x-hidden bg-background px-4 py-10 sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_88%_56%_at_50%_8%,rgb(59_130_246/0.1),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 sm:gap-10">
        <AuthBrandHeader />
        <div className="w-full min-w-0">{children}</div>
      </div>
    </div>
  );
}
