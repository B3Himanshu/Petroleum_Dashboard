/**
 * Same parsing as LatestPetrol (Business Performance Dashboard) for comparison pages.
 */

import { COFFEE_VALET_REVENUE_LABEL } from "@/constants/revenueLabels";

export function getDashboardDefaultDateRange() {
  return { startDate: "2026-01-01", endDate: "2026-01-31" };
}

/** Metrics Comparison + Site Comparison pages: default calendar range (January 2026). */
export function getComparisonPagesDefaultDateRange() {
  return { startDate: "2026-01-01", endDate: "2026-01-31" };
}

/** Net-sales API payload (already unwrapped from response.data in dashboardAPI). */
export function totalSiteRevenueFromNetSales(data) {
  const d = data && typeof data === "object" ? data : {};
  return Math.abs(
    Number(d.totalRevenue ?? d.totalNetSales ?? d.fuelSales ?? 0) || 0
  );
}

export function fuelNetProfitFromProfit(data) {
  const d = data && typeof data === "object" ? data : {};
  return Number(d.totalProfit ?? 0) || 0;
}

/** Litres: primary fuel-volume API, else transition breakdown (4000-code details). */
export function totalFuelVolumeLitres(volumeApiData, transitionApiData) {
  const v1 = Number(volumeApiData?.totalFuelVolume ?? 0) || 0;
  if (v1 > 0) return v1;
  const v2 = Number(transitionApiData?.totalVolume ?? 0) || 0;
  return v2;
}

const FUEL_CODES = ["4000", "4001", "4002", "4003", "4004", "4100", "4101", "4102"];
const SHOP_CODES = ["4032", "4034", "4036", "4037", "4039"];
const VALET_CODES = ["4028", "4029", "4030", "4031", "4017"];

/** Build { name, value }[] for pie: Fuel / Shop / Coffee & Valet (magnitudes). */
export function revenueMixFromNetSalesBreakdown(breakdownRes) {
  const bd =
    breakdownRes?.data?.breakdown ??
    breakdownRes?.breakdown ??
    (Array.isArray(breakdownRes) ? breakdownRes : []);
  const rows = Array.isArray(bd) ? bd : [];
  const num = (x) => Math.abs(Number(x?.value ?? x?.netSales ?? 0) || 0);
  let fuel = 0;
  let shop = 0;
  let valet = 0;
  for (const item of rows) {
    const code = String(item.code ?? "").trim();
    const v = num(item);
    if (FUEL_CODES.includes(code)) fuel += v;
    else if (SHOP_CODES.includes(code)) shop += v;
    else if (VALET_CODES.includes(code)) valet += v;
  }
  return [
    { name: "Fuel Sales", value: fuel },
    { name: "Shop Sales", value: shop },
    { name: COFFEE_VALET_REVENUE_LABEL, value: valet },
  ];
}
