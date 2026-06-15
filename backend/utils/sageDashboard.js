/**
 * Dashboard helpers using HSRL_sage_audit_journal table.
 * Wireframe: wireframe.csv (project root) is the only spec. Do not use PRL Logic Bar csv.
 * Schema: HSRL_sage_audit_journal (nominal_code, dept_number, sage_date, amount, details, ...).
 * dept_number = site_code in API.
 */
import { query } from '../config/database.js';

const REVENUE_CODES = [
  '4000','4001','4002','4003','4004','4005','4006','4007',
  '4008','4009','4010','4011','4012','4013','4015','4016','4017','4018',
  '4020','4021','4022','4023','4024','4025','4026','4028','4029','4030','4031',
  '4032','4033','4034','4035','4036','4037','4038','4039',
  '4100','4101','4102',
  '4400','4401','4402','4403','4404','4405','4406','4407','4408','4409','4410','4411','4412','4413','4414','4415','4416','4417','4418',
  '4450','4451','4452','4453','4454',
];
const FUEL_SALES_CODES = ['4000','4001','4002','4003','4004'];
const FUEL_VOLUME_CODES = ['4000','4001','4002','4003','4004','4101']; // 4101 = Bunkered Sales: volume only, not value
const FUEL_PURCHASE_CODES = ['5000','5001','5002','5003','5004'];
const LABOUR_CODES = ['7000','7001','7002','7003','7005'];
const OVERHEADS_CODES = ['7150','7151','7200','7800','7906'];
const COST_CODES = [
  '5000','5001','5002','5003','5004','5005','5006','5007','5008','5009','5010','5011','5012','5013','5014','5015','5016','5017','5018','5019',
  '5020','5021','5022','5023','5024','5025','5026','5028','5029','5030','5031','5032','5033','5034','5035','5036','5037','5039','5041','5042','5043','5044','5050',
  '7000','7001','7002','7003','7005','7006','7007','7008','7010',
  '7100','7101','7148','7149','7150','7151','7152','7200','7201','7250','7251','7252',
  '7300','7301','7351','7352','7353','7354','7400','7401','7402','7403','7404',
  '7500','7501','7550','7551','7552','7553','7554','7555','7556',
  '7600','7601','7602','7603','7604','7605','7606','7607','7608','7611','7612',
  '7700','7701','7702','7704','7705','7750','7751','7752','7753',
  '7905','7906',
  '8000','8001','8002','8050','8051','8052','8053','8054','8055',
  '8100','8101','8150','8151','8152','8153','8154','8155','8156','8157','8158',
  '8200','8201','8202','8203','8204','8206','8207','8300',
  '9000','9001','9998','9999',
];

const REVENUE_SQL = "nominal_code IN ('" + REVENUE_CODES.join("','") + "')";
const COST_SQL = "nominal_code IN ('" + COST_CODES.join("','") + "')";

// Fuel Profit nominal codes (same as petrolDataSage) — includes 5041 Fuel Commission and 5046–5049 Stock Movement grades
const FUEL_PROFIT_14_CODES = ['4000','4001','4002','4003','4004','4005','5000','5001','5002','5003','5004','5005','5041','5046','5047','5048','5049','5050'];
const FUEL_PROFIT_14_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_PROFIT_14_CODES.join("','") + "')";

/**
 * 4101 (Bunkered Sales/Accrual) volume parser.
 * Handles: "Ast-Accrual for UK Fuel-Jan'26/551.30" → +551.30
 *          "Ast-Rev.Accrual for UK Fuel-Dec'25-4251.51" → -4251.51 (Rev = reversal)
 */
function parse4101VolumeFromDetails(details) {
  if (!details) return 0;
  const s = String(details).trim();
  if (!s) return 0;

  let value = 0;

  // Try '/' separator first (unchanged existing logic)
  const slashIdx = s.lastIndexOf('/');
  if (slashIdx !== -1) {
    const num = parseFloat(s.slice(slashIdx + 1).trim().replace(/,/g, ''));
    if (!isNaN(num)) value = num;
  }

  // Fallback: trailing number after last '-' e.g. "...Dec'25-4251.51"
  if (value === 0) {
    const m = s.match(/-(\d[\d,]*\.?\d*)$/);
    if (m) {
      const num = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(num)) value = num;
    }
  }

  if (value === 0) return 0;

  // Rev entries are reversals — return as negative
  const isReversal = /rev/i.test(s);
  return isReversal ? -value : value;
}

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
 * Build date filter for transactions: sage_date in given months/years.
 * Returns { sqlFragment, params } for use in WHERE, e.g.:
 *   sage_date >= $N::date AND sage_date <= $N+1::date
 * or use EXTRACT(MONTH...) IN (...) AND EXTRACT(YEAR...) IN (...)
 */
function buildMonthYearFilter(monthsArray, yearsArray, paramStart = 2) {
  if (!monthsArray.length || !yearsArray.length) return { sql: '1=0', params: [] };
  const monthPl = monthsArray.map((_, i) => `$${paramStart + i}`).join(',');
  const yearPl = yearsArray.map((_, i) => `$${paramStart + monthsArray.length + i}`).join(',');
  const params = [...monthsArray, ...yearsArray];
  const sql = `EXTRACT(MONTH FROM sage_date)::int IN (${monthPl}) AND EXTRACT(YEAR FROM sage_date)::int IN (${yearPl})`;
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
export async function getMetricsFromSage(siteCode, monthsArray, yearsArray, transactionsTable = 'HSRL_sage_audit_journal') {
  const tbl = transactionsTable || 'HSRL_sage_audit_journal';
  const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 2);
  const allParams = [siteCode, ...dateParams];

  const revRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND ${REVENUE_SQL} AND ${dateFilter}`,
    allParams
  );
  const costRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND ${COST_SQL} AND ${dateFilter}`,
    allParams
  );
  const fuelSalesRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );
  const fuelPurchasesRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_PURCHASE_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );
  const labourRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${LABOUR_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );
  const overheadsRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${OVERHEADS_CODES.join("','")}') AND ${dateFilter}`,
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
  // 4101 (Bunkered Sales) is included in volume only — not in value/sales.
  let totalFuelVolume = 0;
  try {
    const volRes = await query(
      `SELECT COALESCE(SUM(volume), 0) as t FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_VOLUME_CODES.join("','")}') AND ${dateFilter}`,
      allParams
    );
    totalFuelVolume = parseFloat(volRes.rows[0]?.t || 0);
  } catch (_) {
    // volume column may not exist
  }
  if (totalFuelVolume === 0) {
    try {
      const detailsRes = await query(
        `SELECT id, nominal_code, details FROM ${tbl} WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_VOLUME_CODES.join("','")}') AND ${dateFilter}`,
        allParams
      );
      for (const row of detailsRes.rows || []) {
        const nc = String(row.nominal_code ?? '').trim();
        if (nc === '4101') {
          totalFuelVolume += parse4101VolumeFromDetails(row.details);
        } else {
          const segments = parseDetailsToVolumeSegments(row.details);
          for (const { volume } of segments) totalFuelVolume += volume;
        }
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
    profit14 = netProfit;
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
export async function getMetricsFromSageAllSites(monthsArray, yearsArray, transactionsTable = 'HSRL_sage_audit_journal') {
  const tbl = transactionsTable || 'HSRL_sage_audit_journal';
  const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 1);

  const revRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE ${REVENUE_SQL} AND ${dateFilter}`,
    dateParams
  );
  const costRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE ${COST_SQL} AND ${dateFilter}`,
    dateParams
  );
  const fuelSalesRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
    dateParams
  );
  const fuelPurchasesRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE nominal_code IN ('${FUEL_PURCHASE_CODES.join("','")}') AND ${dateFilter}`,
    dateParams
  );
  const labourRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE nominal_code IN ('${LABOUR_CODES.join("','")}') AND ${dateFilter}`,
    dateParams
  );
  const overheadsRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM ${tbl} WHERE nominal_code IN ('${OVERHEADS_CODES.join("','")}') AND ${dateFilter}`,
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

  // 4101 (Bunkered Sales) included in volume only — not in value/sales.
  let totalFuelVolume = 0;
  try {
    const volRes = await query(
      `SELECT COALESCE(SUM(volume), 0) as t FROM ${tbl} WHERE nominal_code IN ('${FUEL_VOLUME_CODES.join("','")}') AND ${dateFilter}`,
      dateParams
    );
    totalFuelVolume = parseFloat(volRes.rows[0]?.t || 0);
  } catch (_) {
    // volume column may not exist
  }
  if (totalFuelVolume === 0) {
    try {
      const detailsRes = await query(
        `SELECT id, nominal_code, details FROM ${tbl} WHERE nominal_code IN ('${FUEL_VOLUME_CODES.join("','")}') AND ${dateFilter}`,
        dateParams
      );
      for (const row of detailsRes.rows || []) {
        const nc = String(row.nominal_code ?? '').trim();
        if (nc === '4101') {
          totalFuelVolume += parse4101VolumeFromDetails(row.details);
        } else {
          const segments = parseDetailsToVolumeSegments(row.details);
          for (const { volume } of segments) totalFuelVolume += volume;
        }
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
    profit14All = netProfit;
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
    `SELECT COALESCE(SUM(amount),0) as t FROM HSRL_sage_audit_journal WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('${FUEL_SALES_CODES.join("','")}') AND ${dateFilter}`,
    allParams
  );
  const shopRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM HSRL_sage_audit_journal WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('4008','4009','4010','4011','4012','4013','4015','4016','4017','4018','4020','4021','4022','4023','4024','4025','4026') AND ${dateFilter}`,
    allParams
  );
  const valetRes = await query(
    `SELECT COALESCE(SUM(amount),0) as t FROM HSRL_sage_audit_journal WHERE (dept_number::text = $1::text OR dept_number = $1) AND nominal_code IN ('4028','4029','4030','4031') AND ${dateFilter}`,
    allParams
  );

  return [
    { name: 'Fuel Sales', value: parseFloat(fuelRes.rows[0]?.t || 0) },
    { name: 'Shop Sales', value: parseFloat(shopRes.rows[0]?.t || 0) },
    { name: 'Coffee & Valet', value: parseFloat(valetRes.rows[0]?.t || 0) },
  ];
}

/**
 * Date-wise (daily) sales for a site in given months/years. Group by sage_date::date.
 */
export async function getDateWiseFromSage(siteCode, monthsArray, yearsArray) {
  const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 2);
  const allParams = [siteCode, ...dateParams];

  const r = await query(
    `SELECT sage_date::date as dt, COALESCE(SUM(amount),0) as sales
     FROM HSRL_sage_audit_journal
     WHERE (dept_number::text = $1::text OR dept_number = $1) AND ${REVENUE_SQL} AND ${dateFilter}
     GROUP BY sage_date::date ORDER BY dt`,
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
       EXTRACT(MONTH FROM sage_date)::int as month,
       COALESCE(SUM(CASE WHEN ${REVENUE_SQL} THEN amount ELSE 0 END),0) as net_sales,
       COALESCE(SUM(CASE WHEN nominal_code IN ('${FUEL_SALES_CODES.join("','")}') THEN amount ELSE 0 END),0) as fuel_sales,
       COALESCE(SUM(CASE WHEN nominal_code IN ('${FUEL_PURCHASE_CODES.join("','")}') THEN amount ELSE 0 END),0) as fuel_purchases
     FROM HSRL_sage_audit_journal
     WHERE (dept_number::text = $1::text OR dept_number = $1) AND EXTRACT(YEAR FROM sage_date)::int IN (${yearPl})
     GROUP BY EXTRACT(MONTH FROM sage_date)
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
      { name: 'Coffee & Valet', data: valetSalesData },
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
      `SELECT COALESCE(SUM(amount),0) as t FROM HSRL_sage_audit_journal WHERE ${REVENUE_SQL}`
    );
    totalRevenue = parseFloat(r.rows[0]?.t || 0);
  } else {
    const { sql: dateFilter, params: dateParams } = buildMonthYearFilter(monthsArray, yearsArray, 1);
    const r = await query(
      `SELECT COALESCE(SUM(amount),0) as t FROM HSRL_sage_audit_journal WHERE ${REVENUE_SQL} AND ${dateFilter}`,
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
