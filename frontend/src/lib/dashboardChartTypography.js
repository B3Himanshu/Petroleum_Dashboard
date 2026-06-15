/**
 * Dashboard chart typography — parity with cards & matrices (MetricCard subtitles,
 * `.dash-insight-breakdown`, `.dash-chart-heading` / `.dash-chart-subtitle`).
 *
 * Mapping (Recharts uses SVG fontSize in px):
 * - Card subtitle tier ≈ `text-sm` / `text-sm sm:text-base` → tick labels **12–13px mobile, 14–16px sm+**
 * - Tooltip title ≈ `text-base sm:text-lg` → **14 / 16px**
 * - Tooltip body ≈ `text-sm sm:text-base` → **13 / 15px**
 *
 * Pass `smUp` from `useIsSmUp()` (min-width: 640px).
 */

/** Primary axis tick (X-axis months, primary Y). */
export function dashTickPrimary(smUp) {
  return smUp ? 15 : 13;
}

/**
 * Recharts X-axis `interval` for month ticks: always show **every** month (`0`).
 * (Product preference: full month labels; use chart scroll / margins where plots are wide.)
 * @returns {number} always `0` (all ticks).
 */
export function dashXAxisIntervalDenseMonths(_smUp, _dataLength) {
  return 0;
}

/** X-axis month labels only — slightly smaller than {@link dashTickPrimary} on mobile to reduce clash. */
export function dashXAxisTickSizePrimary(smUp) {
  return smUp ? 15 : 12;
}

/** Secondary Y-axis tick (right axis, muted). */
export function dashTickSecondary(smUp) {
  return smUp ? 14 : 12;
}

/** Rotated Y-axis title (Margin %, £M, Gross PPL, …). */
export function dashAxisLabel(smUp) {
  return smUp ? 14 : 12;
}

/** Tooltip title line (month / category). */
export function dashTooltipTitlePx(smUp) {
  return smUp ? 16 : 14;
}

/** Tooltip metric rows. */
export function dashTooltipBodyPx(smUp) {
  return smUp ? 15 : 13;
}

/** Legend wrapper `fontSize` (px) + icon diameter. */
export function dashLegendFontPx(smUp) {
  return smUp ? 15 : 13;
}

export function dashLegendIconSize(smUp) {
  return smUp ? 11 : 10;
}

export function dashLegendItemClass() {
  return "text-sm sm:text-base font-medium capitalize text-foreground";
}

/**
 * Recharts X-axis: compact **Mon YY** — e.g. `Jan 2025` → `Jan 25`, `Jan 2026` → `Jan 26`
 * so cross-year ranges (e.g. Jan 2025–Jan 2026) stay clear. Data `month_name` unchanged for tooltips.
 */
export function formatMonthAxisTick(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const y4 = s.match(/^(.+?)\s+(20|19)(\d{2})$/);
  if (y4) {
    const mon = y4[1].trim();
    const yy = y4[3];
    return `${mon} ${yy}`;
  }
  const y2 = s.match(/^(.+?)\s+'(\d{2})$/);
  if (y2) return `${y2[1].trim()} ${y2[2]}`;
  return s;
}

/**
 * Recharts `<CartesianGrid />` — readable on white cards (elderly-friendly contrast).
 * Uses muted foreground (not near-white `--border`) so dashed lines stay visible in light mode.
 * Override with `{ ...dashCartesianGridProps, vertical: false }` when vertical lines add noise.
 */
export const dashCartesianGridProps = {
  strokeDasharray: "3 3",
  stroke: "hsl(var(--muted-foreground))",
  strokeOpacity: 0.48,
  horizontal: true,
  vertical: true,
};
