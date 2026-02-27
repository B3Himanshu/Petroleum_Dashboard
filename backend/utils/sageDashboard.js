/**
 * Dashboard helpers using Sage transactions table only.
 * Schema: transactions (nominal_code, dept_number, transaction_date, amount).
 * dept_number = site_code in API.
 */
import { query } from '../config/database.js';

const REVENUE_CODES = ['4000','4001','4002','4003','4008','4011','4400','4901','4904','4907','6101','6102'];
const FUEL_SALES_CODES = ['4000','4001','4002','4003','4008'];
const FUEL_PURCHASE_CODES = ['5000','5001','5003','5004','5007','5012','5014'];
const LABOUR_CODES = ['7000','7006','7007'];
const OVERHEADS_CODES = ['7103','7100','7200','7801','7905'];
const COST_CODES = ['5000','5001','5003','5004','5007','5012','5014','5100','5102','5200','6100','7000','7001','7006','7007','7099','7100','7102','7103','7104','7200','7300','7301','7302','7303','7305','7306','7400','7402','7403','7500','7501','7502','7503','7550','7551','7552','7600','7601','7602','7603','7605','7607','7700','7702','7752','7800','7801','7802','7804','7901','7903','7905','8001','8002','8003','8004','8005','8006','8009','8200','8201','8204','8207','8250','8251','9000','9001','9999','7604'];

const REVENUE_SQL = "nominal_code IN ('" + REVENUE_CODES.join("','") + "')";
const COST_SQL = "nominal_code IN ('" + COST_CODES.join("','") + "')";

// 14 Fuel Profit nominal codes (same as petrolDataSage) — raw sum for Index profit alignment with Latest Petrol
const FUEL_PROFIT_14_CODES = ['4000','4001','4002','4003','4008','4400','5000','5001','5003','5004','5014','5102','5200','6100'];
const FUEL_PROFIT_14_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_PROFIT_14_CODES.join("','") + "')";

/**
 * Parse details column: segments separated by | or ; or newline; each segment is "label/volume" (volume in L after /).
 * Same logic as petrolDataSage parseDetailsToVolumeSegments for PRL format.
 */
function parseDetailsToVolumeSegments(details) {
  const out = [];
  if (details == null || details === '') return out;
  const s = String(details).trim();
  if (!s || !s.includes('/')) return out;
  const segments = s.split(/\s*[\|;\n\r]+\s*/);
  for (const seg of segments) {
    const trimmed = seg.trim();
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash !== -1) {
      const label = trimmed.slice(0, lastSlash).trim();
      const afterSlash = trimmed.slice(lastSlash + 1).trim();
      const num = parseFloat(afterSlash.replace(/,/g, ''));
      if (typeof num === 'number' && !Number.isNaN(num)) {
        out.push({ label: label || 'Unknown', volume: num });
      }
    }
  }
  return out;
}

/**
 * Build date filter for transactions: transaction_date in given months/years.
 * Returns { sqlFragment, params } for use in WHERE, e.g.:
 *   transaction_date >= $N::date AND transaction_date <= $N+1::date
 * or use EXTRACT(MONTH...) IN (...) AND EXTRACT(YEAR...) IN (...)
 */
function buildMonthYearFilter(monthsArray, yearsArray, paramStart = 2) {
  if (!monthsArray.length || !yearsArray.length) return { sql: '1=0', params: [] };
  const monthPl = monthsArray.map((_, i) => `$${paramStart + i}`).join(',');
  const yearPl = yearsArray.map((_, i) => `$${paramStart + monthsArray.length + i}`).join(',');
  const params = [...monthsArray, ...yearsArray];
  const sql = `EXTRACT(MONTH FROM transaction_date)::int IN (${monthPl}) AND EXTRACT(YEAR FROM transaction_date)::int IN (${yearPl})`;
  return { sql, params };
}

/**
 * Raw sum of 14 Fuel Profit nominal codes (same as getFuelProfit14Sums in petrolDataSage).
 * Used for Index profit so it matches Latest Petrol.
 */
async function getFuelProfit14SumForDashboard(tbl, siteCodeOrNull, monthsArray, yearsArray) {
  const paramStart = siteCodeOrNull != null ? 2 : 1;
  const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, paramStart);
  const allParams = siteCodeOrNull != null ? [siteCodeOrNull, ...dateParams] : dateParams;
  const deptClause = siteCodeOrNull != null ? `(dept_number::text = $1::text OR dept_number = $1) AND ` : '';
  const res = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE ${deptClause}${FUEL_PROFIT_14_SQL} AND ${dateFilter}`,
    allParams
  );
  return parseFloat(res.rows[0]?.t || 0);
}

/**
 * Dashboard metrics from transactions (Sage). siteCode = dept_number.
 * @param {number|string} siteCode - dept_number
 * @param {number[]} monthsArray - months (1-12)
 * @param {number[]} yearsArray - years
 * @param {string} [transactionsTable] - optional table name e.g. "transactions" or "\"sage_data\".transactions"
 */
export async function getMetricsFromSage(siteCode, monthsArray, yearsArray, transactionsTable = 'transactions') {
  const tbl = transactionsTable || 'transactions';
  const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 2);
  const allParams = [siteCode, ...dateParams];

  const revRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND ${REVENUE_SQL} AND ${dateFilter}`,
    allParams
  );
  const costRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND ${COST_SQL} AND ${dateFilter}`,
    allParams
  );
  const fuelSalesRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );
  const fuelPurchasesRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_PURCHASE_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );
  const labourRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${LABOUR_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );
  const overheadsRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${OVERHEADS_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );

  const totalRevenue = parseFloat(revRes.rows[0]?.t || 0);
  const totalCost = parseFloat(costRes.rows[0]?.t || 0);
  const fuelSales = parseFloat(fuelSalesRes.rows[0]?.t || 0);
  const fuelPurchases = parseFloat(fuelPurchasesRes.rows[0]?.t || 0);
  const labourCost = parseFloat(labourRes.rows[0]?.t || 0);
  const overheads = parseFloat(overheadsRes.rows[0]?.t || 0);
  const fuelProfit = fuelSales - fuelPurchases;
  const netProfit = totalRevenue - totalCost;
  const avgPPL = fuelSales > 0 ? (fuelProfit / fuelSales) * 100 : 0;
  const labourCostPercent = fuelSales > 0 ? (labourCost / fuelSales) * 100 : 0;

  // Fuel volume: 1) try volume column, 2) else derive from transaction details (PRL: "Total Fuel Volume" in transaction codes details)
  let totalFuelVolume = 0;
  try {
    const volRes = await query(
      `SELECT COALESCE(SUM(volume), 0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
      allParams
    );
    totalFuelVolume = parseFloat(volRes.rows[0]?.t || 0);
  } catch (_) {
    // volume column may not exist
  }
  if (totalFuelVolume === 0) {
    try {
      const detailsRes = await query(
        `SELECT id, details FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
        allParams
      );
      for (const row of detailsRes.rows || []) {
        const segments = parseDetailsToVolumeSegments(row.details);
        for (const { volume } of segments) totalFuelVolume += volume;
      }
    } catch (_) {
      // details query or parse failed
    }
  }

  // Profit: raw sum of 14 Fuel Profit nominal codes (align with Latest Petrol)
  let profit14 = 0;
  try {
    profit14 = await getFuelProfit14SumForDashboard(tbl, siteCode, monthsArray, yearsArray);
  } catch (_) {
    profit14 = Math.abs(netProfit);
  }

  return {
    totalFuelVolume,
    fuelSales,
    netSales: totalRevenue,
    profit: profit14,
    avgPPL,
    actualPPL: avgPPL,
    labourCostPercent: parseFloat(labourCostPercent.toFixed(2)),
    basketSize: 0,
    customerCount: 0,
    bunkeredVolume: 0,
    nonBunkeredVolume: 0,
    bunkeredSales: 0,
    nonBunkeredSales: 0,
    bunkeredPurchases: 0,
    nonBunkeredPurchases: 0,
    shopSales: 0,
    shopPurchases: 0,
    valetSales: 0,
    valetPurchases: 0,
    overheads,
    labourCost,
    fuelProfit,
    shopProfit: 0,
    valetProfit: 0,
  };
}

/**
 * Dashboard metrics from transactions (Sage) aggregated over all sites (no dept_number filter).
 * Same formulas as getMetricsFromSage; used when siteId=all.
 */
export async function getMetricsFromSageAllSites(monthsArray, yearsArray, transactionsTable = 'transactions') {
  const tbl = transactionsTable || 'transactions';
  const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 1);

  const revRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE ${REVENUE_SQL} AND ${dateFilter}`,
    dateParams
  );
  const costRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE ${COST_SQL} AND ${dateFilter}`,
    dateParams
  );
  const fuelSalesRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
    dateParams
  );
  const fuelPurchasesRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE nominal_code IN ('${FUEL_PURCHASE_CODES.join("','")}') AND ${dateFilter}`,
    dateParams
  );
  const labourRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE nominal_code IN ('${LABOUR_CODES.join("','")}') AND ${dateFilter}`,
    dateParams
  );
  const overheadsRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM ${tbl} WHERE nominal_code IN ('${OVERHEADS_CODES.join("','")}') AND ${dateFilter}`,
    dateParams
  );

  const totalRevenue = parseFloat(revRes.rows[0]?.t || 0);
  const totalCost = parseFloat(costRes.rows[0]?.t || 0);
  const fuelSales = parseFloat(fuelSalesRes.rows[0]?.t || 0);
  const fuelPurchases = parseFloat(fuelPurchasesRes.rows[0]?.t || 0);
  const labourCost = parseFloat(labourRes.rows[0]?.t || 0);
  const overheads = parseFloat(overheadsRes.rows[0]?.t || 0);
  const fuelProfit = fuelSales - fuelPurchases;
  const netProfit = totalRevenue - totalCost;
  const avgPPL = fuelSales > 0 ? (fuelProfit / fuelSales) * 100 : 0;
  const labourCostPercent = fuelSales > 0 ? (labourCost / fuelSales) * 100 : 0;

  let totalFuelVolume = 0;
  try {
    const volRes = await query(
      `SELECT COALESCE(SUM(volume), 0) as t FROM ${tbl} WHERE nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
      dateParams
    );
    totalFuelVolume = parseFloat(volRes.rows[0]?.t || 0);
  } catch (_) {
    // volume column may not exist
  }
  if (totalFuelVolume === 0) {
    try {
      const detailsRes = await query(
        `SELECT id, details FROM ${tbl} WHERE nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
        dateParams
      );
      for (const row of detailsRes.rows || []) {
        const segments = parseDetailsToVolumeSegments(row.details);
        for (const { volume } of segments) totalFuelVolume += volume;
      }
    } catch (_) {
      // details query or parse failed
    }
  }

  // Profit: raw sum of 14 Fuel Profit nominal codes (align with Latest Petrol)
  let profit14All = 0;
  try {
    profit14All = await getFuelProfit14SumForDashboard(tbl, null, monthsArray, yearsArray);
  } catch (_) {
    profit14All = Math.abs(netProfit);
  }

  return {
    totalFuelVolume,
    fuelSales,
    netSales: totalRevenue,
    profit: profit14All,
    avgPPL,
    actualPPL: avgPPL,
    labourCostPercent: parseFloat(labourCostPercent.toFixed(2)),
    basketSize: 0,
    customerCount: 0,
    bunkeredVolume: 0,
    nonBunkeredVolume: 0,
    bunkeredSales: 0,
    nonBunkeredSales: 0,
    bunkeredPurchases: 0,
    nonBunkeredPurchases: 0,
    shopSales: 0,
    shopPurchases: 0,
    valetSales: 0,
    valetPurchases: 0,
    overheads,
    labourCost,
    fuelProfit,
    shopProfit: 0,
    valetProfit: 0,
  };
}

/**
 * Sales distribution (Fuel / Shop / Valet) from transactions. Sage: fuel 4000-4008, shop 4400/4901/4904/4907, valet 6101/6102.
 */
export async function getSalesDistributionFromSage(siteCode, monthsArray, yearsArray) {
  const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 2);
  const allParams = [siteCode, ...dateParams];

  const fuelRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM transactions WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );
  const shopRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM transactions WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('4400','4901','4904','4907') AND ${dateFilter}`,
    allParams
  );
  const valetRes = await query(
    `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM transactions WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('6101','6102') AND ${dateFilter}`,
    allParams
  );

  return [
    { name: 'Fuel Sales', value: parseFloat(fuelRes.rows[0]?.t || 0) },
    { name: 'Shop Sales', value: parseFloat(shopRes.rows[0]?.t || 0) },
    { name: 'Valet Sales', value: parseFloat(valetRes.rows[0]?.t || 0) },
  ];
}

/**
 * Date-wise (daily) sales for a site in given months/years. Group by transaction_date::date.
 */
export async function getDateWiseFromSage(siteCode, monthsArray, yearsArray) {
  const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 2);
  const allParams = [siteCode, ...dateParams];

  const r = await query(
    `SELECT transaction_date::date as dt, COALESCE(SUM(ABS(amount)),0) as sales
     FROM transactions
     WHERE (dept_number::text = $1::text OR dept_number = $1) AND ${REVENUE_SQL} AND ${dateFilter}
     GROUP BY transaction_date::date ORDER BY dt`,
    allParams
  );

  return r.rows.map(row => ({
    day: new Date(row.dt).getDate(),
    sales: parseFloat(row.sales || 0),
    fuelSales: parseFloat(row.sales || 0),
    shopSales: 0,
    valetSales: 0,
    transactionCount: 0,
  }));
}

/**
 * Monthly performance for a site for given year(s). One row per month (1-12).
 */
export async function getMonthlyPerformanceFromSage(siteCode, yearsArray) {
  const yearPl = yearsArray.map((_, i) => `$${i + 2}`).join(',');
  const allParams = [siteCode, ...yearsArray];

  const r = await query(
    `SELECT
       EXTRACT(MONTH FROM transaction_date)::int as month,
       COALESCE(SUM(CASE WHEN ${REVENUE_SQL} THEN ABS(amount) ELSE 0 END),0) as net_sales,
       COALESCE(SUM(CASE WHEN nominal_code IN ('${FUEL_SALES_CODES.join("','")}') THEN ABS(amount) ELSE 0 END),0) as fuel_sales,
       COALESCE(SUM(CASE WHEN nominal_code IN ('${FUEL_PURCHASE_CODES.join("','")}') THEN ABS(amount) ELSE 0 END),0) as fuel_purchases
     FROM transactions
     WHERE (dept_number::text = $1::text OR dept_number = $1) AND EXTRACT(YEAR FROM transaction_date)::int IN (${yearPl})
     GROUP BY EXTRACT(MONTH FROM transaction_date)
     ORDER BY month`,
    allParams
  );

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const salesData = new Array(12).fill(0);
  const profitData = new Array(12).fill(0);
  const saleVolumeData = new Array(12).fill(0);
  const pplData = new Array(12).fill(0);
  const shopSalesData = new Array(12).fill(0);
  const valetSalesData = new Array(12).fill(0);

  r.rows.forEach(row => {
    const i = row.month - 1;
    if (i >= 0 && i < 12) {
      const fs = parseFloat(row.fuel_sales || 0);
      const fp = parseFloat(row.fuel_purchases || 0);
      salesData[i] = parseFloat(row.net_sales || 0);
      profitData[i] = fs - fp;
      saleVolumeData[i] = 0;
      pplData[i] = fs > 0 ? ((fs - fp) / fs) * 100 : 0;
    }
  });

  return {
    labels: monthNames,
    datasets: [
      { name: 'Sales', data: salesData },
      { name: 'Profit', data: profitData },
      { name: 'Sale Volume', data: saleVolumeData },
      { name: 'PPL', data: pplData },
      { name: 'Shop Sales', data: shopSalesData },
      { name: 'Valet Sales', data: valetSalesData },
    ],
  };
}

/**
 * Total sales across all sites (optionally filtered by months/years).
 */
export async function getTotalSalesFromSage(monthsArray, yearsArray) {
  let totalRevenue = 0;
  if (!monthsArray || monthsArray.length === 0 || !yearsArray || yearsArray.length === 0) {
    const r = await query(
      `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM transactions WHERE ${REVENUE_SQL}`
    );
    totalRevenue = parseFloat(r.rows[0]?.t || 0);
  } else {
    const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 1);
    const r = await query(
      `SELECT COALESCE(SUM(ABS(amount)),0) as t FROM transactions WHERE ${REVENUE_SQL} AND ${dateFilter}`,
      dateParams
    );
    totalRevenue = parseFloat(r.rows[0]?.t || 0);
  }

  return {
    totalSales: totalRevenue,
    fuelSales: totalRevenue,
    shopSales: 0,
    valetSales: 0,
  };
}
