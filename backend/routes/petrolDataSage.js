/**
 * Petrol Data API — HSRL (HSRL_sage_audit_journal)
 * Wireframe: wireframe.csv (project root) is the only spec. Do not use HSRL_ui/PRL Logic Bar csv.csv.
 * Uses HSRL_sage_audit_journal: nominal_code, dept_number, date column (Date not Posted Date), amount, details, ...
 * dept_number = site/department identifier (0-19).
 * N/Cs: Fuel 4000-4004, Shop 4032/4034/4036/4037/4039 + 5035, Valet 4028-4031/4017, Overheads 7150/7151/7200/7600/7906, Labour 7000/7001/7005 (+7002,7003). Display names from All Nominal code.csv.
 */
import express from 'express';
import { query } from '../config/database.js';
import { NOMINAL_CODE_NAMES } from '../data/nominalCodeNames.js';

const router = express.Router();

const TRANSACTIONS_TABLE = 'HSRL_sage_audit_journal';

// Column for monetary sums. Default 'amount'; set DB_AMOUNT_COLUMN=net if your schema uses "net" for net values.
const AMOUNT_COLUMN = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(process.env.DB_AMOUNT_COLUMN || '')
  ? process.env.DB_AMOUNT_COLUMN
  : 'amount';
// Date column for filters = transaction "Date" only (NOT "Posted Date"). Default 'sage_date'.
const DATE_COLUMN = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(process.env.DB_DATE_COLUMN || '')
  ? process.env.DB_DATE_COLUMN
  : 'sage_date';

// sage_date is stored as text in YYYY-MM-DD format. Cast to date for comparisons.
const DATE_EXPR = `(NULLIF(TRIM(${DATE_COLUMN}), ''))::date`;

// Amount is stored as text. Cast to numeric for SUM.
const AMOUNT_EXPR = `(NULLIF(TRIM(${AMOUNT_COLUMN}), ''))::numeric`;
const SUM_AMOUNT_SQL = `COALESCE(SUM(${AMOUNT_EXPR}), 0)`;
// Labour codes use the same amount column as everything else.

// Fuel sales = 4000-4004 + 4100 (wireframe: "Fuel Sales: 4000,4001,4002,4003,4004" + 4100)
const FUEL_SALES_CODES = ['4000','4001','4002','4003','4004'];
const FUEL_SALES_ADD_CODES = ['4100','4101','4102']; // Bunkering codes – add to fuel sales
const FUEL_SALES_ADD_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_SALES_ADD_CODES.join("','") + "')";

// Total Site Revenue: Fuel (4000-4004 + 4100,4101,4102) + Shop 4032,4034,4036,4037,4039,5035 + Valet 4028,4029,4030,4031,4017
const TOTAL_SITE_REVENUE_CODES = ['4000','4001','4002','4003','4004','4100','4101','4102','4032','4034','4036','4037','4039','5035','4028','4029','4030','4031','4017'];
const TOTAL_SITE_REVENUE_SQL = "TRIM(nominal_code::text) IN ('" + TOTAL_SITE_REVENUE_CODES.join("','") + "')";

const FUEL_CATEGORY_NAMES = {
  '4000': 'Unleaded',
  '4001': 'Diesel',
  '4002': 'Super Unleaded',
  '4003': 'Super Diesel',
  '4004': 'Adblue',
  '4101': 'Bunkering Volume',
  '5000': 'Unleaded',
  '5001': 'Diesel',
  '5002': 'Super Unleaded',
  '5003': 'Super Diesel',
  '5004': 'Adblue',
  '5050': 'Stock Movement',
};
const REVENUE_CODES = [
  '4000','4001','4002','4003','4004','4005','4006','4007',
  '4008','4009','4010','4011','4012','4013','4015','4016','4017','4018',
  '4020','4021','4022','4023','4024','4025','4026','4028','4029','4030','4031',
  '4032','4033','4034','4035','4036','4037','4038','4039',
  '4100','4101','4102',
  '5035',
  '4400','4401','4402','4403','4404','4405','4406','4407','4408','4409','4410','4411','4412','4413','4414','4415','4416','4417','4418',
  '4450','4451','4452','4453','4454',
];
const SITE_REVENUE_CODES = [
  '4000','4001','4002','4003','4004','4005','4006','4007',
  '4008','4009','4010','4011','4012','4013','4015','4016','4017','4018',
  '4020','4021','4022','4023','4024','4025','4026','4028','4029','4030','4031',
  '4032','4033','4034','4035','4036','4037','4038','4039',
  '4100','4101','4102',
  '5035',
  '4400','4401','4402','4403','4404','4405','4406','4407','4408','4409','4410','4411','4412','4413','4414','4415','4416','4417','4418',
  '4450','4451','4452','4453','4454',
];
const FUEL_PURCHASE_CODES = ['5000','5001','5002','5003','5004'];
// Volume from Details column: 4000–4004 + 4101 (Bunkered Sales). From Jan 2026 onward, Sage includes volume in Details: "SITENAME-Fuel Type-Month'YY/volume".
// 4101 is included for volume only — not in value/sales calculations.
const FUEL_VOLUME_FROM_DETAILS_CODES = ['4000','4001','4002','4003','4004','4101'];
const LABOUR_CODES = ['7000','7001','7002','7003','7005'];
// Overheads: Royalty, Franchisee, Rent & Rates, Water, Heat/Light/Power, Insurance, Mileage, Motor, Travel, Printing, Advertisement, Repair & Maintenance, Bank, Polling, Credit Card, Bad Debts, Cash U/O, Legal, Telephone, Repairs & Renewals (7800)
const OVERHEADS_CODES = [
  '7100','7101','7148','7149','7150','7151','7152','7200','7201','7250','7251','7252','7300','7301','7351','7352','7353','7354',
  '7400','7401','7402','7403','7404',
  '7500','7501','7550','7551','7552','7553','7554','7555','7556',
  '7600','7601','7602','7603','7604','7605','7606','7607','7608','7611','7612',
  '7700','7701','7702','7704','7705','7750','7751','7752','7753','7800','7905','7906',
  '8000','8001','8002','8050','8051','8052','8053','8054','8055','8100','8101',
  '8150','8151','8152','8153','8154','8155','8156','8157','8158',
  '8200','8201','8202','8203','8204','8206','8207'
];
const COST_CODES = [
  '5000','5001','5002','5003','5004','5005','5006','5007','5008','5009','5010','5011','5012','5013','5014','5015','5016','5017','5018','5019',
  '5020','5021','5022','5023','5024','5025','5026','5028','5029','5030','5031','5032','5033','5034','5036','5037','5039','5041','5042','5043','5044','5050',
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

// Fuel Profit N/Cs from All Nominal code.csv — sum of all, do NOT remove negative sign
const FUEL_PROFIT_NOMINAL_CODES = ['4000','4001','4002','4003','4004','4005','5000','5001','5002','5003','5004','5005','5041','5046','5047','5048','5049','5050'];
const FUEL_PROFIT_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_PROFIT_NOMINAL_CODES.join("','") + "')";
const FUEL_PROFIT_SALES_CODES = ['4000','4001','4002','4003','4004','4005'];
const FUEL_PROFIT_COST_CODES = ['5000','5001','5002','5003','5004','5005','5041','5046','5047','5048','5049','5050'];

// Fuel Gross Profit = Total Revenue − Total Cost. Revenue: 4000–4004 + 4100,4101,4102; Cost: 5000–5005,5041,5046–5050.
const NET_PROFIT_REVENUE_CODES = ['4000','4001','4002','4003','4004','4100','4101','4102'];
const NET_PROFIT_COST_CODES = ['5000','5001','5002','5003','5004','5005','5041','5046','5047','5048','5049','5050'];
const NET_PROFIT_REVENUE_SQL = "TRIM(nominal_code::text) IN ('" + NET_PROFIT_REVENUE_CODES.join("','") + "')";
const NET_PROFIT_COST_SQL = "TRIM(nominal_code::text) IN ('" + NET_PROFIT_COST_CODES.join("','") + "')";
const FUEL_PROFIT_SALES_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_PROFIT_SALES_CODES.join("','") + "')";
const FUEL_PROFIT_COST_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_PROFIT_COST_CODES.join("','") + "')";
const FUEL_PROFIT_NC_NAMES = {
  '4000':'Unleaded-Sales','4001':'Diesel-Sales','4002':'Super Unleaded-Sales','4003':'Super Diesel-Sales','4004':'Adblue-Sales','4005':'Fuel Commissions',
  '4100':'Bunkering Charges (BP Commission)','4101':'Bunkered Sales','4102':'Bunkered Commission',
  '5000':'Unleaded-Purchases','5001':'Diesel-Purchases','5002':'Super Unleaded-Purchases','5003':'Super Diesel-Purchases','5004':'Adblue-Purchases','5005':'Fuel Promotional','5041':'Fuel Commission',
  '5046':'Stock Movement-Unleaded','5047':'Stock Movement-Diesel','5048':'Stock Movement-Super Unleaded','5049':'Stock Movement-Super Diesel','5050':'Stock Movement-Adblue',
};

const CODES_DB_POSITIVE_AS_NEGATIVE = ['5000','5001','5002','5003','5004','5005','5041','5046','5047','5048','5049','5050'];

// Use TRIM(nominal_code::text) so DB column (text or numeric) matches All Nominal code.csv codes
const REVENUE_SQL = "TRIM(nominal_code::text) IN ('" + REVENUE_CODES.join("','") + "')";
const SITE_REVENUE_SQL = "TRIM(nominal_code::text) IN ('" + SITE_REVENUE_CODES.join("','") + "')";
const COST_SQL = "TRIM(nominal_code::text) IN ('" + COST_CODES.join("','") + "')";
const FUEL_SALES_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_SALES_CODES.join("','") + "')";
const FUEL_PURCHASE_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_PURCHASE_CODES.join("','") + "')";
const OVERHEADS_SQL = "TRIM(nominal_code::text) IN ('" + OVERHEADS_CODES.join("','") + "')";
const OVERHEADS_PLUS_WAGES_CODES = [...new Set([...OVERHEADS_CODES, ...LABOUR_CODES, '7006','7007','7008','7010'])];
const OVERHEADS_PLUS_WAGES_SQL = "TRIM(nominal_code::text) IN ('" + OVERHEADS_PLUS_WAGES_CODES.join("','") + "')";
// Excluded from EBITA / PPL-after-OH overhead bucket (same as EBITDA card "Overheads excl. Depreciation & Loan Interest")
const DEPRECIATION_CODES = ['8200', '8201', '8202', '8203', '8204', '8206', '8207'];
const LOAN_INTEREST_CODES = ['7750'];
const EBITA_OVERHEADS_CODES = OVERHEADS_PLUS_WAGES_CODES.filter(
  (c) => !DEPRECIATION_CODES.includes(c) && !LOAN_INTEREST_CODES.includes(c)
);
const EBITA_OVERHEADS_SQL = "TRIM(nominal_code::text) IN ('" + EBITA_OVERHEADS_CODES.join("','") + "')";
const LABOUR_SQL = "TRIM(nominal_code::text) IN ('" + LABOUR_CODES.join("','") + "')";
const DATE_AS_DATE_SQL = DATE_EXPR;

// EBITA = SUM of all revenue + cost N/Cs (do not remove negative sign)
const EBITA_CODES = [
  '4000','4001','4002','4003','4004','4005','4006','4007','4008','4009','4010','4011','4012','4013','4015','4016','4017','4018',
  '4020','4021','4022','4023','4024','4025','4026','4028','4029','4030','4031','4032','4033','4034','4035','4036','4037','4038','4039',
  '4100','4101','4102',
  '4400','4401','4402','4403','4404','4405','4406','4407','4408','4409','4410','4411','4412','4413','4414','4415','4416','4417','4418',
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
  '9999',
];
const EBITA_SQL = "TRIM(nominal_code::text) IN ('" + EBITA_CODES.join("','") + "')";

// ROI = Total Net Profit (same as /total-net-profit) / Investment × 100
// Investment = 7 asset/cost N/Cs only (excl. depreciation/revaluation lines)
const ROI_INVESTMENT_CODES = ['0010', '0030', '0034', '0040', '0050', '0060', '0070'];
const ROI_INVESTMENT_SQL = "TRIM(nominal_code::text) IN ('" + ROI_INVESTMENT_CODES.join("','") + "')";
// If no investment rows exist yet, use a safe lower bound for date filters
const ROI_INVESTMENT_FALLBACK_START = '1970-01-01';

// HSRL Department number (0-19) -> display name
const DEPT_TO_SITE_NAME = {
  0: 'HEAD OFFICE', 1: 'ANSON SS', 2: 'BELGRAVE SS', 3: 'GREENFORD PARK SS',
  4: 'BADDESLEY SS', 5: 'SWANLEY SS', 6: 'ASTWICK SS', 7: 'VINEYARD SS',
  8: 'WEXHAM SS', 9: 'LYE SS', 10: 'GIRTON SS', 11: 'PATCHAM SS',
  12: 'SUBWAY', 13: 'PARK ROYAL SS', 14: 'Gravesend SS', 15: 'Amersham SS',
  16: 'Oakham SS', 17: 'Spalding SS', 18: 'ERITH SS', 19: 'Erith Subway',
};

const DEPT_TO_POSTCODE = {};

const CANONICAL_SITE_NAMES = Object.values(DEPT_TO_SITE_NAME);
const LABEL_PREFIX_TO_CANONICAL_SITE = {};
for (const name of CANONICAL_SITE_NAMES) {
  LABEL_PREFIX_TO_CANONICAL_SITE[name] = name;
}
const PREFIX_ALIASES = [
  ['Anson', 'ANSON SS'], ['Belgrave', 'BELGRAVE SS'], ['Greenford', 'GREENFORD PARK SS'],
  ['Baddesley', 'BADDESLEY SS'], ['Swanley', 'SWANLEY SS'], ['Astwick', 'ASTWICK SS'],
  ['Vineyard', 'VINEYARD SS'], ['Wexham', 'WEXHAM SS'], ['Lye', 'LYE SS'],
  ['Girton', 'GIRTON SS'], ['Patcham', 'PATCHAM SS'], ['Subway', 'SUBWAY'],
  ['Park Royal', 'PARK ROYAL SS'], ['Gravesend', 'Gravesend SS'], ['Amersham', 'Amersham SS'],
  ['Oakham', 'Oakham SS'], ['Spalding', 'Spalding SS'], ['Erith', 'ERITH SS'],
];
for (const [prefix, canonical] of PREFIX_ALIASES) {
  if (!LABEL_PREFIX_TO_CANONICAL_SITE[prefix]) LABEL_PREFIX_TO_CANONICAL_SITE[prefix] = canonical;
}

const DASH_LIKE = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\-]/;
function getSitePrefixFromLabel(label) {
  if (!label || typeof label !== 'string') return '';
  const s = label.trim();
  const idx = s.search(DASH_LIKE);
  return idx !== -1 ? s.slice(0, idx).trim() : s;
}

function normalizeToCanonicalSite(labelPrefix) {
  if (!labelPrefix || typeof labelPrefix !== 'string') return null;
  let trimmed = labelPrefix.trim();
  trimmed = trimmed.replace(/\s*&\s*/g, ' And ');
  const canonical = LABEL_PREFIX_TO_CANONICAL_SITE[trimmed];
  if (canonical) return canonical;
  const lower = trimmed.toLowerCase();
  for (const [prefix, canonicalName] of PREFIX_ALIASES) {
    if (lower === prefix.toLowerCase()) return canonicalName;
  }
  const found = CANONICAL_SITE_NAMES.find(n => n.toLowerCase() === lower);
  if (found) return found;
  return null;
}

function validateDateRange(req, res) {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    res.status(400).json({ success: false, message: 'startDate and endDate are required (YYYY-MM-DD)' });
    return null;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    res.status(400).json({ success: false, message: 'Invalid date format or range' });
    return null;
  }
  return { startDate, endDate };
}

// Safe range from query (for error fallbacks when validateDateRange already ran).
function getRangeFromReq(req) {
  const { startDate, endDate } = req.query || {};
  return { startDate: startDate || '', endDate: endDate || '' };
}

// Optional site filter: ?siteIds=6,7,9 (dept numbers). Returns [] for "all sites", or array of integers.
function parseSiteIds(req) {
  const raw = req.query.siteIds;
  if (raw == null || raw === '') return [];
  const parts = String(raw).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && Number.isInteger(n));
  return parts;
}

// Given baseParams (e.g. [startDate, endDate]) and optional siteIds, returns { deptClause, params }.
// Cast dept_number to int for comparison so it works whether DB column is text or int.
function buildDeptFilter(baseParams, siteIds) {
  if (!siteIds || siteIds.length === 0) return { deptClause: '', params: baseParams };
  const start = baseParams.length + 1;
  const placeholders = siteIds.map((_, i) => `$${start + i}`).join(',');
  return { deptClause: ` AND (NULLIF(TRIM(dept_number::text), '')::int) IN (${placeholders})`, params: [...baseParams, ...siteIds] };
}

// Single source: 14 Fuel Profit N/Cs (All Nominal code.csv) — use raw DB amounts. Total = sum of line items. 5050 = Stock Movement (no 5200).
const FUEL_PROFIT_14_IN_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_PROFIT_NOMINAL_CODES.join("','") + "')";
const EMPTY_FUEL_PROFIT = {
  breakdown: FUEL_PROFIT_NOMINAL_CODES.map((code) => ({ code, name: FUEL_PROFIT_NC_NAMES[code] || code, amount: 0 })),
  totalRevenue: 0,
  totalCost: 0,
  totalProfit: 0,
  byCode: {},
};

async function getFuelProfit14Sums(startDate, endDate, siteIds = []) {
  try {
    const baseParams = [startDate, endDate];
    const { deptClause, params } = buildDeptFilter(baseParams, siteIds);
    const rows = await query(`
      SELECT TRIM(nominal_code::text) AS nc, COALESCE(SUM(${AMOUNT_EXPR}),0) AS total
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${FUEL_PROFIT_14_IN_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY TRIM(nominal_code::text)
    `, params);
    const rawByCode = {};
    (rows?.rows || []).forEach((row) => {
      const code = String(row.nc ?? '').trim();
      if (!code) return;
      rawByCode[code] = parseFloat(row.total || 0);
    });
    const breakdown = FUEL_PROFIT_NOMINAL_CODES.map((code) => {
      const raw = rawByCode[String(code)] ?? 0;
      return { code, name: FUEL_PROFIT_NC_NAMES[code] || code, amount: raw };
    });
    const totalProfit = breakdown.reduce((s, x) => s + (x.amount || 0), 0);
    const totalRevenue = breakdown.filter((x) => FUEL_PROFIT_SALES_CODES.includes(x.code)).reduce((s, x) => s + (x.amount || 0), 0);
    const totalCost = breakdown.filter((x) => FUEL_PROFIT_COST_CODES.includes(x.code)).reduce((s, x) => s + (x.amount || 0), 0);
    return { byCode: rawByCode, breakdown, totalRevenue, totalCost, totalProfit };
  } catch (e) {
    console.error('[getFuelProfit14Sums]', e?.message || e);
    return { ...EMPTY_FUEL_PROFIT, byCode: {} };
  }
}

// Gross Profit = Fuel Profit (NET_PROFIT codes: Rev 4000-4004,4100-4102 minus Cost 5000-5005,5041,5050) + Shop Profit + Valet Profit
async function getGrossProfit(startDate, endDate, siteIds = []) {
  const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
  const sumSQL = `COALESCE(SUM(${AMOUNT_EXPR}),0)`;
  const dateClause = `${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`;
  const [fuelRevRes, fuelCostRes, shopSalesRes, shopCostRes, valetSalesRes, valetCostRes] = await Promise.all([
    query(`SELECT ${sumSQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_REVENUE_SQL} AND ${dateClause}`, params),
    query(`SELECT ${sumSQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_COST_SQL} AND ${dateClause}`, params),
    query(`SELECT ${sumSQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_SALES_SQL} AND ${dateClause}`, params),
    query(`SELECT ${sumSQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_COST_SQL} AND ${dateClause}`, params),
    query(`SELECT ${sumSQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_SALES_SQL} AND ${dateClause}`, params),
    query(`SELECT ${sumSQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_COST_SQL} AND ${dateClause}`, params),
  ]);
  const fuelRev = Math.abs(parseFloat(fuelRevRes?.rows?.[0]?.total ?? 0));
  const fuelCostVal = Math.abs(parseFloat(fuelCostRes?.rows?.[0]?.total ?? 0));
  const fuelProfit = Math.abs(fuelRev - fuelCostVal);
  const shopSales = Math.abs(parseFloat(shopSalesRes?.rows?.[0]?.total ?? 0));
  const shopCost = Math.abs(parseFloat(shopCostRes?.rows?.[0]?.total ?? 0));
  // Signed: a shop/valet loss must subtract from GP. Previously wrapped in Math.abs which flipped losses to gains and inflated the KPI.
  const shopProfit = shopSales - shopCost;
  const valetSales = Math.abs(parseFloat(valetSalesRes?.rows?.[0]?.total ?? 0));
  const valetCost = Math.abs(parseFloat(valetCostRes?.rows?.[0]?.total ?? 0));
  const valetProfit = valetSales - valetCost;
  const grossProfit = fuelProfit + shopProfit + valetProfit;
  return { grossProfit, fuelProfit, shopProfit, valetProfit };
}

// Net Profit = Total Revenue − Total Cost (wireframe). Revenue: 4000–4004; Cost: 5000–5005. Uses AMOUNT_COLUMN; fallback to net when amount all zeros.
const NET_PROFIT_ALL_CODES = [...NET_PROFIT_REVENUE_CODES, ...NET_PROFIT_COST_CODES];
const NET_PROFIT_ALL_SQL = "TRIM(nominal_code::text) IN ('" + NET_PROFIT_ALL_CODES.join("','") + "')";

async function getNetProfitRevenueCost(startDate, endDate, siteIds = []) {
  try {
    const baseParams = [startDate, endDate];
    const { deptClause, params } = buildDeptFilter(baseParams, siteIds);
    const sumExpr = `COALESCE(SUM((NULLIF(TRIM(${AMOUNT_COLUMN}), ''))::numeric), 0)`;
    let revRes = await query(`SELECT ${sumExpr} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
    let costRes = await query(`SELECT ${sumExpr} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
    let totalRevenue = parseFloat(revRes?.rows?.[0]?.total ?? 0);
    let totalCostRaw = parseFloat(costRes?.rows?.[0]?.total ?? 0);
    if (AMOUNT_COLUMN === 'amount' && totalRevenue === 0 && totalCostRaw === 0) {
      try {
        const netSum = `COALESCE(SUM((NULLIF(TRIM(net), ''))::numeric), 0)`;
        revRes = await query(`SELECT ${netSum} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
        costRes = await query(`SELECT ${netSum} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
        totalRevenue = parseFloat(revRes?.rows?.[0]?.total ?? 0);
        totalCostRaw = parseFloat(costRes?.rows?.[0]?.total ?? 0);
      } catch (_) {}
    }
    // Cost N/Cs are stored negative in DB; add revenue + cost so Net Profit = Revenue + (negative cost) = correct.
    const totalCost = Math.abs(totalCostRaw);
    const netProfit = totalRevenue + totalCostRaw;
    let breakdownRows = await query(`
      SELECT TRIM(nominal_code::text) AS nc, ${sumExpr} AS total
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${NET_PROFIT_ALL_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY TRIM(nominal_code::text)
    `, params);
    if (AMOUNT_COLUMN === 'amount' && (!breakdownRows?.rows?.length || breakdownRows.rows.every((row) => parseFloat(row.total || 0) === 0))) {
      try {
        const netSum = `COALESCE(SUM((NULLIF(TRIM(net), ''))::numeric), 0)`;
        breakdownRows = await query(`
          SELECT TRIM(nominal_code::text) AS nc, ${netSum} AS total
          FROM ${TRANSACTIONS_TABLE}
          WHERE ${NET_PROFIT_ALL_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
          GROUP BY TRIM(nominal_code::text)
        `, params);
      } catch (_) {}
    }
    const rawByCode = {};
    (breakdownRows?.rows || []).forEach((row) => { const code = String(row.nc ?? '').trim(); if (code) rawByCode[code] = parseFloat(row.total || 0); });
    const breakdown = NET_PROFIT_ALL_CODES.map((code) => ({ code, name: FUEL_PROFIT_NC_NAMES[code] || code, amount: rawByCode[code] ?? 0 }));
    return { totalRevenue, totalCost, netProfit, breakdown };
  } catch (e) {
    console.error('[getNetProfitRevenueCost]', e?.message || e);
    return {
      totalRevenue: 0,
      totalCost: 0,
      netProfit: 0,
      breakdown: NET_PROFIT_ALL_CODES.map((code) => ({ code, name: FUEL_PROFIT_NC_NAMES[code] || code, amount: 0 })),
    };
  }
}

// GET /petrol-data/fuel-volume-diagnostic - Dev helper: row counts and sample details for volume codes (no date filter).
router.get('/fuel-volume-diagnostic', async (req, res) => {
  try {
    const ncIntList = FUEL_VOLUME_FROM_DETAILS_CODES.map(c => parseInt(c, 10)).filter((n) => !Number.isNaN(n));
    const ncList = ncIntList.join(',');
    const countRes = await query(`
      SELECT COUNT(*) as cnt FROM ${TRANSACTIONS_TABLE}
      WHERE (NULLIF(TRIM(nominal_code::text), '')::int) IN (${ncList})
        AND details IS NOT NULL AND TRIM(COALESCE(details::text, '')) <> ''
    `);
    const dateRes = await query(`
      SELECT MIN(${DATE_EXPR})::text as min_date, MAX(${DATE_EXPR})::text as max_date FROM ${TRANSACTIONS_TABLE}
      WHERE (NULLIF(TRIM(nominal_code::text), '')::int) IN (${ncList})
        AND details IS NOT NULL AND TRIM(COALESCE(details::text, '')) <> ''
    `);
    const sampleRes = await query(`
      SELECT nominal_code, ${DATE_COLUMN} as sage_date_raw, LEFT(details::text, 300) as details_preview
      FROM ${TRANSACTIONS_TABLE}
      WHERE (NULLIF(TRIM(nominal_code::text), '')::int) IN (${ncList})
        AND details IS NOT NULL AND TRIM(COALESCE(details::text, '')) <> ''
      ORDER BY id DESC LIMIT 5
    `);
    const rowCount = parseInt(countRes?.rows?.[0]?.cnt ?? 0, 10);
    const minDate = dateRes?.rows?.[0]?.min_date ?? null;
    const maxDate = dateRes?.rows?.[0]?.max_date ?? null;
    const samples = (sampleRes?.rows || []).map(r => ({
      nominal_code: r.nominal_code,
      [DATE_COLUMN]: r[DATE_COLUMN],
      details_preview: r.details_preview,
    }));
    res.json({
      success: true,
      data: {
        message: 'Volume codes 5000-5004 (5 codes). Row count = rows with non-empty details.',
        rowCountWithDetails: rowCount,
        dateRangeInDb: rowCount > 0 ? { minDate: minDate, maxDate: maxDate } : null,
        sampleRows: samples,
      },
    });
  } catch (e) {
    console.error('[petrol-data/fuel-volume-diagnostic]', e?.message || e);
    res.status(500).json({ success: false, error: e?.message || String(e), hint: 'Check that column "details" exists on HSRL_sage_audit_journal.' });
  }
});

// GET /petrol-data/fuel-volume - Volume (L) from Details column. Uses 4000–4004 (fuel sales); format SITENAME-Fuel-Month'YY/volume.
router.get('/fuel-volume', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { total, detailsRowCount } = await getTotalFuelVolumeFromDetails(range.startDate, range.endDate, siteIds);
    res.json({
      success: true,
      data: {
        totalFuelVolume: total,
        detailsRowCount,
        startDate: range.startDate,
        endDate: range.endDate,
        volumeFromDetails: true,
      },
    });
  } catch (e) {
    console.error('[petrol-data/fuel-volume]', e?.message || e);
    res.json({ success: true, data: { totalFuelVolume: 0, detailsRowCount: 0, volumeFromDetails: false, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/fuel-grade-breakdown - Fuel sales by nominal. Preserve sign: show negative if DB has negative.
router.get('/fuel-grade-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT nominal_code, COALESCE(SUM(${AMOUNT_EXPR}),0) as total_amt, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${FUEL_SALES_SQL}
        AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    const breakdown = r.rows.map(row => {
      const code = String(row.nominal_code ?? '').trim();
      const volume = parseFloat(row.total_amt||0);
      return { code, name: FUEL_CATEGORY_NAMES[code] || NOMINAL_CODE_NAMES[code] || code, volume, transactionCount: parseInt(row.txn_count||0) };
    });
    const totalVolume = breakdown.reduce((s,x)=>s+(x.volume||0),0);
    res.json({ success: true, data: { breakdown, totalVolume, ...range } });
  } catch (e) {
    console.error('[petrol-data/fuel-grade-breakdown]', e?.message || e);
    res.json({ success: true, data: { breakdown: [], totalVolume: 0, ...getRangeFromReq(req) } });
  }
});

// Parse details column: segments separated by | or ; or newline; each segment is "label/volume" (volume in L after /) or a plain number.
// Example: "Swa-Unleaded-18.12.2020/14991" → 14991; "Amer-Diesel-16.06.2023/6000" → 6000. Also accepts plain "14991" or "6000".
function parseDetailsToVolumeSegments(details) {
  const out = [];
  if (details == null || details === '') return out;
  const s = String(details).trim();
  if (!s) return out;
  const segments = s.split(/\s*[\|;\n\r]+\s*/);
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash !== -1) {
      const afterSlash = trimmed.slice(lastSlash + 1).trim();
      const num = parseFloat(afterSlash.replace(/,/g, ''));
      if (typeof num === 'number' && !Number.isNaN(num)) {
        out.push({ label: trimmed.slice(0, lastSlash).trim() || 'Unknown', volume: num });
      }
    } else {
      // No slash: treat whole segment as volume if it's a number (e.g. "14991" or "6000")
      const num = parseFloat(trimmed.replace(/,/g, ''));
      if (typeof num === 'number' && !Number.isNaN(num)) {
        out.push({ label: 'Unknown', volume: num });
      }
    }
  }
  return out;
}

// 4101 (Bunkered Sales/Accrual) volume parser.
// Handles two detail formats:
//   "Ast-Accrual for UK Fuel-Jan'26/551.30"      → +551.30  (value after /)
//   "Ast-Rev.Accrual for UK Fuel-Dec'25-4251.51" → -4251.51 (value after trailing -, Rev = reversal)
function parse4101VolumeFromDetails(details) {
  if (!details) return 0;
  const s = String(details).trim();
  if (!s) return 0;

  let value = 0;

  // Try '/' separator first
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

  // Rev entries are reversals — subtract (return negative)
  const isReversal = /rev/i.test(s);
  return isReversal ? -value : value;
}

// Monthly volume map from HSRL_volumne_2025 table — for 2025 date ranges.
// Returns Map<'year-month', litres> e.g. { '2025-1' => 136797 }
async function getMonthlyVolumeFromTable(startDate, endDate, siteIds = []) {
  const map = new Map();
  try {
    // Only relevant if range overlaps 2025
    if (endDate < '2025-01-01' || startDate > '2025-12-31') return map;
    const clampedStart = startDate < '2025-01-01' ? '2025-01-01' : startDate;
    const clampedEnd   = endDate   > '2025-12-31' ? '2025-12-31' : endDate;
    let deptFilter = '';
    let params = [clampedStart, clampedEnd];
    if (siteIds && siteIds.length > 0) {
      const placeholders = siteIds.map((_, i) => `$${3 + i}`).join(',');
      deptFilter = ` AND dept_number IN (${placeholders})`;
      params = [...params, ...siteIds];
    }
    const r = await query(`
      SELECT EXTRACT(YEAR FROM sale_date)::int as y,
             EXTRACT(MONTH FROM sale_date)::int as m,
             SUM(volume_litres) as total_vol
      FROM HSRL_volumne_2025
      WHERE sale_date >= $1::date AND sale_date <= $2::date${deptFilter}
      GROUP BY y, m ORDER BY y, m
    `, params);
    for (const row of r.rows || []) {
      map.set(`${row.y}-${row.m}`, parseFloat(row.total_vol || 0));
    }
  } catch (e) {
    console.warn('[getMonthlyVolumeFromTable] failed:', e?.message || e);
  }
  return map;
}

// Total fuel volume (L) — combines HSRL_volumne_2025 table (2025) + Details column (2026+).
// Returns { total, detailsRowCount } for debugging.
async function getTotalFuelVolumeFromDetails(startDate, endDate, siteIds = []) {
  try {
    // 1. Pull 2025 volume from HSRL_volumne_2025 table
    let total = 0;
    const table2025Map = await getMonthlyVolumeFromTable(startDate, endDate, siteIds);
    for (const v of table2025Map.values()) total += v;

    // 2. Pull 2026+ volume from HSRL_sage_audit_journal details column
    const effectiveStart = startDate > '2025-12-31' ? startDate : '2026-01-01';
    let rows = [];
    if (effectiveStart <= endDate) {
      const { deptClause, params } = buildDeptFilter([effectiveStart, endDate], siteIds);
      const ncIntList = FUEL_VOLUME_FROM_DETAILS_CODES.map(c => parseInt(c, 10)).filter((n) => !Number.isNaN(n));
      const ncList = ncIntList.join(',');
      const r = await query(`
        SELECT nominal_code, dept_number, ${DATE_COLUMN}, details FROM ${TRANSACTIONS_TABLE}
        WHERE (NULLIF(TRIM(nominal_code::text), '')::int) IN (${ncList})
          AND ${DATE_AS_DATE_SQL} >= $1::date AND ${DATE_AS_DATE_SQL} <= $2::date
          AND details IS NOT NULL AND TRIM(COALESCE(details::text, '')) <> ''${deptClause}
      `, params);
      rows = r?.rows || [];
      for (const row of rows) {
        const nc = String(row.nominal_code ?? '').trim();
        if (nc === '4101') {
          total += parse4101VolumeFromDetails(row.details);
        } else {
          const segments = parseDetailsToVolumeSegments(row.details);
          for (const { volume } of segments) total += volume;
        }
      }
    }
    // Extra diagnostics so we can see exactly what is happening for a given
    // date range and siteIds when total comes back as 0.
    try {
      const sample = rows.slice(0, 5).map((row) => ({
        nominal_code: String(row.nominal_code).trim(),
        dept_number: row.dept_number,
        [DATE_COLUMN]: row[DATE_COLUMN],
        details: String(row.details).slice(0, 120),
      }));
      console.log('[fuel-volume:getTotalFuelVolumeFromDetails]', {
        startDate,
        endDate,
        siteIds,
        detailsRowCount: rows.length,
        totalVolumeL: total,
        sample,
      });
    } catch (e) {
      console.warn('[fuel-volume:getTotalFuelVolumeFromDetails] logging failed:', e?.message || e);
    }
    return { total, detailsRowCount: rows.length };
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getTotalFuelVolumeFromDetails]', e?.message || e);
    }
    return { total: 0, detailsRowCount: 0 };
  }
}

// GET /petrol-data/fuel-volume-breakdown - By site (fuel site revenue = SUM(amount) per dept); site name and postcode from DEPT_TO_SITE_NAME. No change to this metric.
router.get('/fuel-volume-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT dept_number, COALESCE(SUM(${AMOUNT_EXPR}),0) as total_amt
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('4000','4001','4002','4003','4004')
        AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY dept_number ORDER BY total_amt DESC
    `, params);
    const breakdown = r.rows.map(row => {
      const raw = row.dept_number;
      const code = raw != null ? parseInt(Number(raw), 10) : null;
      const validCode = Number.isInteger(code) && !Number.isNaN(code) ? code : null;
      const siteName = (validCode != null && DEPT_TO_SITE_NAME[validCode]) ? DEPT_TO_SITE_NAME[validCode] : `Dept ${raw}`;
      const postcode = (validCode != null && DEPT_TO_POSTCODE[validCode]) ? DEPT_TO_POSTCODE[validCode] : null;
      return {
        name: siteName,
        code: raw,
        siteCode: validCode,
        postcode,
        volume: parseFloat(row.total_amt || 0),
      };
    });
    res.json({ success: true, data: { breakdown, totalVolume: breakdown.reduce((s,x)=>s+x.volume,0), ...range } });
  } catch (e) {
    console.error('[petrol-data/fuel-volume-breakdown]', e?.message || e);
    res.json({ success: true, data: { breakdown: [], totalVolume: 0, ...getRangeFromReq(req) } });
  }
});

// Infer nominal code (4000-4004) from details label e.g. "Swan-Diesel Sales-Sept'25" → 4001, "Canklow-Unleaded Sales-Nov'25" → 4000.
function inferNominalCodeFromLabel(label) {
  if (!label || typeof label !== 'string') return '4000';
  const L = label.toLowerCase();
  if (L.includes('adblue') || L.includes('ad blue')) return '4004';
  if (L.includes('ultimate diesel')) return '4003';
  if (L.includes('ultimate unleaded') || L.includes('ultimate petrol')) return '4002';
  if (L.includes('diesel')) return '4001';
  if (L.includes('unleaded') || L.includes('petrol')) return '4000';
  return '4000';
}

// GET /petrol-data/fuel-volume-transition-breakdown
// 2025 dates → HSRL_volumne_2025 table (by site + nominal code)
// 2026+ dates → HSRL_sage_audit_journal details column (unchanged)
router.get('/fuel-volume-transition-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);

    const bySite = {};
    const byCode = {};
    for (const code of FUEL_VOLUME_FROM_DETAILS_CODES) byCode[code] = 0;

    // --- 2025: pull from HSRL_volumne_2025 table ---
    if (range.startDate <= '2025-12-31' && range.endDate >= '2025-01-01') {
      const clampedStart = range.startDate < '2025-01-01' ? '2025-01-01' : range.startDate;
      const clampedEnd   = range.endDate   > '2025-12-31' ? '2025-12-31' : range.endDate;
      let deptFilter = '';
      let p = [clampedStart, clampedEnd];
      if (siteIds && siteIds.length > 0) {
        const ph = siteIds.map((_, i) => `$${3 + i}`).join(',');
        deptFilter = ` AND dept_number IN (${ph})`;
        p = [...p, ...siteIds];
      }
      try {
        const r2025 = await query(`
          SELECT dept_number, nominal_code, SUM(volume_litres) as vol
          FROM HSRL_volumne_2025
          WHERE sale_date >= $1::date AND sale_date <= $2::date${deptFilter}
          GROUP BY dept_number, nominal_code
        `, p);
        for (const row of r2025.rows || []) {
          const dept = parseInt(Number(row.dept_number), 10);
          const siteName = DEPT_TO_SITE_NAME[dept] || null;
          const code = String(row.nominal_code || '').trim();
          const vol = parseFloat(row.vol || 0);
          if (siteName) {
            bySite[siteName] = (bySite[siteName] || 0) + vol;
          }
          if (byCode[code] !== undefined) byCode[code] += vol;
        }
      } catch (e2025) {
        console.error('[fuel-volume-transition-breakdown] 2025 table error:', e2025?.message || e2025);
      }
    }

    // --- 2026+: pull from HSRL_sage_audit_journal details column ---
    const effectiveStart2026 = range.startDate > '2025-12-31' ? range.startDate : '2026-01-01';
    if (effectiveStart2026 <= range.endDate) {
      const { deptClause, params } = buildDeptFilter([effectiveStart2026, range.endDate], siteIds);
      const ncList = FUEL_VOLUME_FROM_DETAILS_CODES.map(c => `'${c}'`).join(',');
      try {
        const r = await query(`
          SELECT id, nominal_code, dept_number, details
          FROM ${TRANSACTIONS_TABLE}
          WHERE TRIM(nominal_code::text) IN (${ncList})
            AND ${DATE_AS_DATE_SQL} >= $1::date AND ${DATE_AS_DATE_SQL} <= $2::date
            AND details IS NOT NULL AND TRIM(details::text) <> ''${deptClause}
          ORDER BY id
        `, params);
        for (const row of r.rows || []) {
          const rowCode = String(row.nominal_code || '').trim();
          const dept = row.dept_number != null ? parseInt(Number(row.dept_number), 10) : null;
          const siteName = (dept != null && DEPT_TO_SITE_NAME[dept]) ? DEPT_TO_SITE_NAME[dept] : null;
          if (rowCode === '4101') {
            const volume = parse4101VolumeFromDetails(row.details);
            if (siteName) bySite[siteName] = (bySite[siteName] || 0) + volume;
            if (byCode[rowCode] !== undefined) byCode[rowCode] += volume;
          } else {
            const segments = parseDetailsToVolumeSegments(row.details);
            for (const { volume } of segments) {
              if (siteName) bySite[siteName] = (bySite[siteName] || 0) + volume;
              if (byCode[rowCode] !== undefined) byCode[rowCode] += volume;
              else if (rowCode) byCode['4000'] = (byCode['4000'] || 0) + volume;
            }
          }
        }
      } catch (dbErr) {
        console.error('[petrol-data/fuel-volume-transition-breakdown] 2026 error:', dbErr?.message || dbErr);
      }
    }

    const breakdown = CANONICAL_SITE_NAMES
      .map(site => ({ label: site, site, volume: bySite[site] || 0 }))
      .filter(x => x.volume > 0)
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    const byNominalCode = FUEL_VOLUME_FROM_DETAILS_CODES.map(code => ({
      code,
      name: FUEL_CATEGORY_NAMES[code] || NOMINAL_CODE_NAMES[code] || code,
      volume: byCode[code] || 0
    }));
    const totalVolume = Object.values(byCode).reduce((s, v) => s + v, 0);
    res.json({ success: true, data: { breakdown, byNominalCode, totalVolume, ...range } });
  } catch (e) {
    console.error('[petrol-data/fuel-volume-transition-breakdown]', e?.message || e);
    res.json({ success: true, data: { breakdown: [], byNominalCode: [], totalVolume: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/net-sales - Total Site Revenue (wireframe lines 5-9): Fuel 4000-4004 + Shop 4032/4034/4036 + Valet 4028-4031/4017 only. Uses raw SUM (negative values included).
router.get('/net-sales', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    console.log('[net-sales] request:', { startDate: range.startDate, endDate: range.endDate, siteIds: siteIds?.length ? `${siteIds.length} sites` : 'all', deptClause: deptClause ? 'filtered' : 'none' });
    try {
      const countInRange = await query(`SELECT COUNT(*) as cnt FROM ${TRANSACTIONS_TABLE} WHERE ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
      console.log('[net-sales] rows in date range (any nominal):', countInRange?.rows?.[0]?.cnt ?? '?');
      const countFuel = await query(`SELECT COUNT(*) as cnt FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
      console.log('[net-sales] rows in date range (fuel 4000-4004):', countFuel?.rows?.[0]?.cnt ?? '?');
    } catch (countErr) {
      console.log('[net-sales] count diagnostic error (date cast?):', countErr?.message || countErr);
    }
    let fuelSales = 0;
    let totalRevenue = 0;
    const sumExpr = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;
    const runQueries = async (col) => {
      const expr = sumExpr(col);
      const fuel = await query(`SELECT ${expr} as total FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
      const bunkering = await query(`SELECT ${expr} as total FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_ADD_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
      const rev = await query(`SELECT ${expr} as total FROM ${TRANSACTIONS_TABLE} WHERE ${TOTAL_SITE_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
      const fuelRaw = fuel?.rows?.[0]?.total;
      const bunkRaw = bunkering?.rows?.[0]?.total;
      const revRaw = rev?.rows?.[0]?.total;
      const sumBunkering = parseFloat(bunkRaw ?? 0);
      console.log(`[net-sales] column="${col}" raw DB: fuel total=`, fuelRaw, 'bunkering(4100+4101+4102)=', bunkRaw, 'rev total=', revRaw);
      return { fuel: parseFloat(fuelRaw ?? 0), sumBunkering, rev: parseFloat(revRaw ?? 0) };
    };
    try {
      const result = await runQueries(AMOUNT_COLUMN);
      fuelSales = result.fuel + result.sumBunkering;
      totalRevenue = result.rev;
      console.log('[net-sales] after amount:', { fuelSales, totalRevenue });
      // If primary column sums to 0 and we're using 'amount', try 'net' (common when Sage Net is in net column)
      if (AMOUNT_COLUMN === 'amount' && result.fuel === 0 && result.rev === 0) {
        try {
          const netResult = await runQueries('net');
          console.log('[net-sales] after net fallback:', { fuelSales: netResult.fuel + netResult.sumBunkering, totalRevenue: netResult.rev });
          if (netResult.fuel !== 0 || netResult.rev !== 0) {
            fuelSales = netResult.fuel + netResult.sumBunkering;
            totalRevenue = netResult.rev;
          }
        } catch (netErr) {
          console.log('[net-sales] net fallback error:', netErr?.message || netErr);
        }
      }
    } catch (dbErr) {
      console.error('[net-sales] DB error:', dbErr?.message || dbErr);
      return res.json({ success: true, data: { totalNetSales: 0, totalRevenue: 0, fuelSales: 0, startDate: range.startDate, endDate: range.endDate } });
    }
    console.log('[net-sales] response:', { totalNetSales: totalRevenue, totalRevenue, fuelSales });
    res.json({ success: true, data: { totalNetSales: totalRevenue, totalRevenue, fuelSales, startDate: range.startDate, endDate: range.endDate } });
  } catch (e) {
    console.error('[net-sales]', e?.message || e);
    res.json({ success: true, data: { totalNetSales: 0, totalRevenue: 0, fuelSales: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/net-sales-breakdown - By Total Site Revenue N/Cs: Fuel 4000-4004 + 4100, Shop, Valet.
router.get('/net-sales-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const sumExpr = `COALESCE(SUM((NULLIF(TRIM(${AMOUNT_COLUMN}), ''))::numeric), 0)`;
    let r;
    try {
      r = await query(`
        SELECT nominal_code, ${sumExpr} as total, COUNT(*) as txn_count
        FROM ${TRANSACTIONS_TABLE}
        WHERE ${TOTAL_SITE_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
        GROUP BY nominal_code ORDER BY nominal_code
      `, params);
      if (AMOUNT_COLUMN === 'amount' && (!r.rows?.length || r.rows.every((row) => parseFloat(row.total || 0) === 0))) {
        try {
          const netSumExpr = `COALESCE(SUM((NULLIF(TRIM(net), ''))::numeric), 0)`;
          r = await query(`
            SELECT nominal_code, ${netSumExpr} as total, COUNT(*) as txn_count
            FROM ${TRANSACTIONS_TABLE}
            WHERE ${TOTAL_SITE_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
            GROUP BY nominal_code ORDER BY nominal_code
          `, params);
        } catch (_) {}
      }
    } catch (dbErr) {
      console.error('[net-sales-breakdown] DB error:', dbErr?.message || dbErr);
      return res.json({ success: true, data: { breakdown: [], ...range } });
    }
    console.log('[net-sales-breakdown] rows:', r?.rows?.length ?? 0, 'sample:', (r?.rows || []).slice(0, 3).map(row => ({ code: row.nominal_code, total: row.total })));
    const breakdown = (r?.rows || []).map(row => {
      const code = String(row.nominal_code ?? '').trim();
      const val = parseFloat(row.total || 0);
      return { code, name: NOMINAL_CODE_NAMES[code] || code, netSales: val, value: val, transactionCount: parseInt(row.txn_count || 0, 10) };
    });
    for (const addCode of FUEL_SALES_ADD_CODES) {
      if (!breakdown.some((b) => b.code === addCode)) {
        breakdown.push({ code: addCode, name: NOMINAL_CODE_NAMES[addCode] || addCode, netSales: 0, value: 0, transactionCount: 0 });
      }
    }
    breakdown.sort((a, b) => String(a.code).localeCompare(String(b.code)));
    res.json({ success: true, data: { breakdown, ...range } });
  } catch (e) {
    console.error('[petrol-data/net-sales-breakdown]', e?.message || e);
    res.json({ success: true, data: { breakdown: [], ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/shop-profit - Shop Sales incl. 4039 EV Revenue; Shop Cost incl. 5016 Grocery, 5035 Paypoint/Keycharge Commissions, 5039 EV Costs (5032–5034,5036,5037,5042).
const SHOP_SALES_CODES = ['4032','4034','4036','4037','4039'];
const SHOP_COST_CODES = ['5016','5032','5033','5034','5035','5036','5037','5039','5042'];
const SHOP_SALES_SQL = "TRIM(nominal_code::text) IN ('" + SHOP_SALES_CODES.join("','") + "')";
const SHOP_COST_SQL = "TRIM(nominal_code::text) IN ('" + SHOP_COST_CODES.join("','") + "')";
router.get('/shop-profit', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const [salesRes, costRes, salesBdRes, costBdRes] = await Promise.all([
      query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT TRIM(nominal_code::text) AS nc, ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause} GROUP BY nc ORDER BY nc`, params),
      query(`SELECT TRIM(nominal_code::text) AS nc, ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause} GROUP BY nc ORDER BY nc`, params)
    ]);
    const shopSales = parseFloat(salesRes?.rows?.[0]?.total ?? 0);
    const shopCostRaw = parseFloat(costRes?.rows?.[0]?.total ?? 0);
    const shopCost = Math.abs(shopCostRaw);
    const shopProfit = Math.abs(shopSales) - shopCost;
    const margin = Math.abs(shopSales) > 0 ? (shopProfit / Math.abs(shopSales)) * 100 : 0;
    const salesByCode = {};
    (salesBdRes?.rows || []).forEach(r => { salesByCode[r.nc] = parseFloat(r.total || 0); });
    const salesBreakdown = SHOP_SALES_CODES.map(code => ({ code, name: NOMINAL_CODE_NAMES[code] || code, amount: salesByCode[code] ?? 0 }));
    const costByCode = {};
    (costBdRes?.rows || []).forEach(r => { costByCode[r.nc] = parseFloat(r.total || 0); });
    const costBreakdown = SHOP_COST_CODES.map(code => ({ code, name: NOMINAL_CODE_NAMES[code] || code, amount: costByCode[code] ?? 0 }));
    res.json({ success: true, data: { shopSales: Math.abs(shopSales), shopCost, shopProfit, margin, salesBreakdown, costBreakdown, ...range } });
  } catch (e) {
    console.error('[petrol-data/shop-profit]', e?.message || e);
    res.json({ success: true, data: { shopSales: 0, shopCost: 0, shopProfit: 0, margin: 0, salesBreakdown: [], costBreakdown: [], ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/valet-profit - Valet Profit = Valet Sales (4028,4029,4030,4031,4017) − Valet Cost (5028,5029,5030,5031).
const VALET_SALES_CODES = ['4028','4029','4030','4031','4017'];
const VALET_COST_CODES = ['5015','5028','5029','5030','5031','5043','5044'];
const VALET_SALES_SQL = "TRIM(nominal_code::text) IN ('" + VALET_SALES_CODES.join("','") + "')";
const VALET_COST_SQL = "TRIM(nominal_code::text) IN ('" + VALET_COST_CODES.join("','") + "')";
router.get('/valet-profit', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const [salesRes, costRes, salesBdRes, costBdRes] = await Promise.all([
      query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT TRIM(nominal_code::text) AS nc, ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause} GROUP BY nc ORDER BY nc`, params),
      query(`SELECT TRIM(nominal_code::text) AS nc, ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause} GROUP BY nc ORDER BY nc`, params)
    ]);
    const valetSales = parseFloat(salesRes?.rows?.[0]?.total ?? 0);
    const valetCostRaw = parseFloat(costRes?.rows?.[0]?.total ?? 0);
    const valetCost = Math.abs(valetCostRaw);
    const valetProfit = Math.abs(valetSales) - valetCost;
    const margin = Math.abs(valetSales) > 0 ? (valetProfit / Math.abs(valetSales)) * 100 : 0;
    const salesByCode = {};
    (salesBdRes?.rows || []).forEach(r => { salesByCode[r.nc] = parseFloat(r.total || 0); });
    const salesBreakdown = VALET_SALES_CODES.map(code => ({ code, name: NOMINAL_CODE_NAMES[code] || code, amount: salesByCode[code] ?? 0 }));
    const costByCode = {};
    (costBdRes?.rows || []).forEach(r => { costByCode[r.nc] = parseFloat(r.total || 0); });
    const costBreakdown = VALET_COST_CODES.map(code => ({ code, name: NOMINAL_CODE_NAMES[code] || code, amount: costByCode[code] ?? 0 }));
    res.json({ success: true, data: { valetSales: Math.abs(valetSales), valetCost, valetProfit, margin, salesBreakdown, costBreakdown, ...range } });
  } catch (e) {
    console.error('[petrol-data/valet-profit]', e?.message || e);
    res.json({ success: true, data: { valetSales: 0, valetCost: 0, valetProfit: 0, margin: 0, salesBreakdown: [], costBreakdown: [], ...getRangeFromReq(req) } });
  }
});

// Same totals as GET /net-sales (Metrics Comparison page — single round-trip).
async function getNetSalesTotalsForRange(startDate, endDate, siteIds) {
  const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
  const sumExpr = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;
  const runQueries = async (col) => {
    const expr = sumExpr(col);
    const fuel = await query(`SELECT ${expr} as total FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
    const bunkering = await query(`SELECT ${expr} as total FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_ADD_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
    const rev = await query(`SELECT ${expr} as total FROM ${TRANSACTIONS_TABLE} WHERE ${TOTAL_SITE_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
    return {
      fuel: parseFloat(fuel?.rows?.[0]?.total ?? 0),
      sumBunkering: parseFloat(bunkering?.rows?.[0]?.total ?? 0),
      rev: parseFloat(rev?.rows?.[0]?.total ?? 0),
    };
  };
  try {
    const result = await runQueries(AMOUNT_COLUMN);
    let fuelSales = result.fuel + result.sumBunkering;
    let totalRevenue = result.rev;
    if (AMOUNT_COLUMN === 'amount' && result.fuel === 0 && result.rev === 0) {
      try {
        const netResult = await runQueries('net');
        if (netResult.fuel !== 0 || netResult.rev !== 0) {
          fuelSales = netResult.fuel + netResult.sumBunkering;
          totalRevenue = netResult.rev;
        }
      } catch (_) {}
    }
    return { totalNetSales: totalRevenue, totalRevenue, fuelSales };
  } catch (e) {
    console.error('[getNetSalesTotalsForRange]', e?.message || e);
    return { totalNetSales: 0, totalRevenue: 0, fuelSales: 0 };
  }
}

// Same totalVolume as GET /fuel-volume-transition-breakdown (used when primary fuel-volume is 0).
async function getTransitionTotalVolume(startDate, endDate, siteIds) {
  const byCode = {};
  for (const code of FUEL_VOLUME_FROM_DETAILS_CODES) byCode[code] = 0;

  if (startDate <= '2025-12-31' && endDate >= '2025-01-01') {
    const clampedStart = startDate < '2025-01-01' ? '2025-01-01' : startDate;
    const clampedEnd = endDate > '2025-12-31' ? '2025-12-31' : endDate;
    let deptFilter = '';
    let p = [clampedStart, clampedEnd];
    if (siteIds && siteIds.length > 0) {
      const ph = siteIds.map((_, i) => `$${3 + i}`).join(',');
      deptFilter = ` AND dept_number IN (${ph})`;
      p = [...p, ...siteIds];
    }
    try {
      const r2025 = await query(`
        SELECT dept_number, nominal_code, SUM(volume_litres) as vol
        FROM HSRL_volumne_2025
        WHERE sale_date >= $1::date AND sale_date <= $2::date${deptFilter}
        GROUP BY dept_number, nominal_code
      `, p);
      for (const row of r2025.rows || []) {
        const code = String(row.nominal_code || '').trim();
        const vol = parseFloat(row.vol || 0);
        if (byCode[code] !== undefined) byCode[code] += vol;
      }
    } catch (e2025) {
      console.error('[getTransitionTotalVolume] 2025 table error:', e2025?.message || e2025);
    }
  }

  const effectiveStart2026 = startDate > '2025-12-31' ? startDate : '2026-01-01';
  if (effectiveStart2026 <= endDate) {
    const { deptClause, params } = buildDeptFilter([effectiveStart2026, endDate], siteIds);
    const ncList = FUEL_VOLUME_FROM_DETAILS_CODES.map((c) => `'${c}'`).join(',');
    try {
      const r = await query(`
        SELECT nominal_code, details
        FROM ${TRANSACTIONS_TABLE}
        WHERE TRIM(nominal_code::text) IN (${ncList})
          AND ${DATE_AS_DATE_SQL} >= $1::date AND ${DATE_AS_DATE_SQL} <= $2::date
          AND details IS NOT NULL AND TRIM(details::text) <> ''${deptClause}
      `, params);
      for (const row of r.rows || []) {
        const rowCode = String(row.nominal_code || '').trim();
        let volume;
        if (rowCode === '4101') {
          volume = parse4101VolumeFromDetails(row.details);
          if (byCode[rowCode] !== undefined) byCode[rowCode] += volume;
        } else {
          const segments = parseDetailsToVolumeSegments(row.details);
          for (const { volume: v } of segments) {
            if (byCode[rowCode] !== undefined) byCode[rowCode] += v;
            else if (rowCode) byCode['4000'] = (byCode['4000'] || 0) + v;
          }
        }
      }
    } catch (dbErr) {
      console.error('[getTransitionTotalVolume] journal error:', dbErr?.message || dbErr);
    }
  }

  return Object.values(byCode).reduce((s, v) => s + v, 0);
}

async function getShopProfitMetrics(startDate, endDate, siteIds) {
  const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
  const [salesRes, costRes] = await Promise.all([
    query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
    query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
  ]);
  const shopSales = parseFloat(salesRes?.rows?.[0]?.total ?? 0);
  const shopCostRaw = parseFloat(costRes?.rows?.[0]?.total ?? 0);
  const shopCost = Math.abs(shopCostRaw);
  const shopProfit = Math.abs(shopSales) - shopCost;
  return { shopProfit };
}

async function getValetProfitMetrics(startDate, endDate, siteIds) {
  const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
  const [salesRes, costRes] = await Promise.all([
    query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
    query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
  ]);
  const valetSales = parseFloat(salesRes?.rows?.[0]?.total ?? 0);
  const valetCostRaw = parseFloat(costRes?.rows?.[0]?.total ?? 0);
  const valetCost = Math.abs(valetCostRaw);
  const valetProfit = Math.abs(valetSales) - valetCost;
  return { valetProfit };
}

const EMPTY_METRICS_COMPARISON_ROW = {
  netSales: 0,
  profit: 0,
  fuelProfit: 0,
  shopProfit: 0,
  valetProfit: 0,
  totalFuelVolume: 0,
  grossMarginPct: 0,
  avgPPL: 0,
};

async function computeMetricsComparisonSiteRow(startDate, endDate, siteId) {
  const siteIds = [siteId];
  const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
  const sumExpr = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;

  const [
    netSalesData,
    netProfitData,
    grossData,
    volDetails,
    shopData,
    valetData,
    fuelSalesRes,
    revenueRes,
    overheadsRes,
  ] = await Promise.all([
    getNetSalesTotalsForRange(startDate, endDate, siteIds),
    getNetProfitRevenueCost(startDate, endDate, siteIds),
    getGrossProfit(startDate, endDate, siteIds),
    getTotalFuelVolumeFromDetails(startDate, endDate, siteIds),
    getShopProfitMetrics(startDate, endDate, siteIds),
    getValetProfitMetrics(startDate, endDate, siteIds),
    query(`SELECT ${sumExpr(AMOUNT_COLUMN)} as total FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
    query(`SELECT ${sumExpr(AMOUNT_COLUMN)} as total FROM ${TRANSACTIONS_TABLE} WHERE ${REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
    query(`SELECT ${sumExpr(AMOUNT_COLUMN)} as total FROM ${TRANSACTIONS_TABLE} WHERE ${EBITA_OVERHEADS_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
  ]);

  let totalOverheads = parseFloat(overheadsRes?.rows?.[0]?.total ?? 0);
  if (AMOUNT_COLUMN === 'amount' && totalOverheads === 0) {
    try {
      const o2 = await query(`SELECT ${sumExpr('net')} as total FROM ${TRANSACTIONS_TABLE} WHERE ${EBITA_OVERHEADS_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
      totalOverheads = parseFloat(o2?.rows?.[0]?.total ?? 0);
    } catch (_) {}
  }

  // Primary litres from details + 2025 table (same as GET /fuel-volume). PPL routes use ONLY this — not transition.
  const volumeFromDetails = Number(volDetails?.total ?? 0) || 0;
  // Display litres match frontend totalFuelVolumeLitres(): primary, else transition total (GET /fuel-volume-transition-breakdown totalVolume).
  let totalFuelVolume = volumeFromDetails;
  if (volumeFromDetails <= 0) {
    totalFuelVolume = await getTransitionTotalVolume(startDate, endDate, siteIds);
  }

  const fuelSales = Math.abs(parseFloat(fuelSalesRes?.rows?.[0]?.total || 0));
  const totalRevenueAbs = Math.abs(parseFloat(revenueRes?.rows?.[0]?.total || 0));
  // Match GET /avg-ppl: denominator uses getTotalFuelVolumeFromDetails only, then fuel sales (never transition litres).
  const denominatorAvgPpl =
    volumeFromDetails > 0 ? volumeFromDetails : (fuelSales !== 0 ? fuelSales : 0);
  const avgPPL = denominatorAvgPpl !== 0 ? (grossData.fuelProfit / denominatorAvgPpl) * 100 : 0;

  const overheadsMag = Math.abs(totalOverheads);
  // Match GET /actual-ppl denominator (same volume basis as /avg-ppl, plus total revenue fallback).
  const denominatorActualPpl =
    volumeFromDetails > 0
      ? volumeFromDetails
      : (fuelSales !== 0 ? fuelSales : (totalRevenueAbs !== 0 ? totalRevenueAbs : 0));
  const pplAfterOverheads =
    denominatorActualPpl !== 0 ? ((grossData.fuelProfit - overheadsMag) / denominatorActualPpl) * 100 : 0;

  const fuelNetProfit = Math.abs(Number(netProfitData.netProfit) || 0);
  // Signed: a shop/valet loss must subtract from total. Math.abs would flip losses to gains and inflate.
  const shopProfit = Number(shopData.shopProfit) || 0;
  const valetProfit = Number(valetData.valetProfit) || 0;
  const profit = fuelNetProfit + shopProfit + valetProfit;

  const netSales = Math.abs(
    Number(netSalesData.totalRevenue ?? netSalesData.totalNetSales ?? netSalesData.fuelSales ?? 0) || 0
  );
  const grossMarginPct = netSales > 0 ? (profit / netSales) * 100 : 0;

  return {
    siteId,
    netSales,
    profit,
    fuelProfit: fuelNetProfit,
    shopProfit,
    valetProfit,
    totalFuelVolume,
    grossMarginPct,
    avgPPL,
    pplAfterOverheads,
  };
}

// GET /petrol-data/metrics-comparison-sites — one request for Metrics Comparison (same maths as separate petrol-data routes).
router.get('/metrics-comparison-sites', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    if (!siteIds.length) {
      res.status(400).json({ success: false, message: 'siteIds is required (comma-separated dept numbers)' });
      return;
    }
    const rows = await Promise.all(
      siteIds.map((id) =>
        computeMetricsComparisonSiteRow(range.startDate, range.endDate, id).catch((e) => {
          console.error('[metrics-comparison-sites] site', id, e?.message || e);
          return { siteId: id, ...EMPTY_METRICS_COMPARISON_ROW };
        })
      )
    );
    res.json({ success: true, data: { rows, ...range } });
  } catch (e) {
    console.error('[petrol-data/metrics-comparison-sites]', e?.message || e);
    res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

// GET /petrol-data/profit - Net Profit = Total Revenue − Total Cost (Revenue: 4000–4004; Cost: 5000–5005).
router.get('/profit', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { totalRevenue, totalCost, netProfit } = await getNetProfitRevenueCost(range.startDate, range.endDate, siteIds);
    res.json({ success: true, data: { totalProfit: netProfit, totalRevenue, totalCost, ...range } });
  } catch (e) {
    console.error('[petrol-data/profit]', e?.message || e);
    res.json({ success: true, data: { totalProfit: 0, totalRevenue: 0, totalCost: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/profit-breakdown - Net Profit = Total Revenue − Total Cost. Breakdown by Revenue 4000–4004 and Cost 5000–5005.
router.get('/profit-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { breakdown, totalRevenue, totalCost, netProfit } = await getNetProfitRevenueCost(range.startDate, range.endDate, siteIds);
    const totalPositives = breakdown.filter((x) => (x.amount || 0) > 0).reduce((s, x) => s + x.amount, 0);
    const totalNegatives = breakdown.filter((x) => (x.amount || 0) < 0).reduce((s, x) => s + x.amount, 0);
    res.json({ success: true, data: { fuelSalesBreakdown: [], otherIncomeBreakdown: breakdown, totalProfit: netProfit, totalPositives, totalNegatives, totalRevenue, totalCost, ...range } });
  } catch (e) {
    console.error('[petrol-data/profit-breakdown]', e?.message || e);
    const range = getRangeFromReq(req);
    const emptyBreakdown = NET_PROFIT_ALL_CODES.map((code) => ({ code, name: FUEL_PROFIT_NC_NAMES[code] || code, amount: 0 }));
    res.json({ success: true, data: { fuelSalesBreakdown: [], otherIncomeBreakdown: emptyBreakdown, totalProfit: 0, totalPositives: 0, totalNegatives: 0, totalRevenue: 0, totalCost: 0, ...range } });
  }
});

// GET /petrol-data/avg-ppl - Fuel-profit PPL = Fuel profit / (Volume or Fuel Sales) × 100 (same fuel profit basis as Gross Profit card fuel line).
router.get('/avg-ppl', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { grossProfit, fuelProfit, shopProfit, valetProfit } = await getGrossProfit(range.startDate, range.endDate, siteIds);
    const { deptClause: dc, params: fsParams } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const fuelSalesRes = await query(`SELECT ${SUM_AMOUNT_SQL} AS total FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${dc}`, fsParams);
    const fuelSales = Math.abs(parseFloat(fuelSalesRes?.rows?.[0]?.total ?? 0));
    const { total: fuelVolume } = await getTotalFuelVolumeFromDetails(range.startDate, range.endDate, siteIds);
    const denominator = fuelVolume > 0 ? fuelVolume : (fuelSales !== 0 ? fuelSales : 0);
    const avgPPL = denominator !== 0 ? (fuelProfit / denominator) * 100 : 0;
    res.json({ success: true, data: { avgPPL, grossProfit, fuelProfit, shopProfit, valetProfit, fuelVolume, fuelSales, ...range } });
  } catch (e) {
    console.error('[petrol-data/avg-ppl]', e?.message || e);
    res.json({ success: true, data: { avgPPL: 0, grossProfit: 0, fuelProfit: 0, shopProfit: 0, valetProfit: 0, fuelVolume: 0, fuelSales: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/actual-ppl - PPL after OH = (Fuel Profit − Overheads) / (Volume or Sales) × 100. Overheads = EBITA bucket (excl. Depreciation 8200–8207 & Loan Interest 7750).
router.get('/actual-ppl', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const sumExpr = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;
    let overheadsRes = await query(`SELECT ${sumExpr(AMOUNT_COLUMN)} as total FROM ${TRANSACTIONS_TABLE} WHERE ${EBITA_OVERHEADS_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
    let totalOverheads = parseFloat(overheadsRes.rows[0]?.total||0);
    if (AMOUNT_COLUMN === 'amount' && totalOverheads === 0) {
      try {
        overheadsRes = await query(`SELECT ${sumExpr('net')} as total FROM ${TRANSACTIONS_TABLE} WHERE ${EBITA_OVERHEADS_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
        totalOverheads = parseFloat(overheadsRes.rows[0]?.total||0);
      } catch (_) {}
    }
    const [fuelSalesRes, revenueRes] = await Promise.all([
      query(`SELECT ${sumExpr(AMOUNT_COLUMN)} as total FROM ${TRANSACTIONS_TABLE} WHERE TRIM(nominal_code::text) IN ('4000','4001','4002','4003','4004') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${sumExpr(AMOUNT_COLUMN)} as total FROM ${TRANSACTIONS_TABLE} WHERE ${REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params)
    ]);
    // Match /avg-ppl: use positive sales/revenue as denominator so rates are not sign-flipped when Sage sums are negative.
    const fuelSales = Math.abs(parseFloat(fuelSalesRes?.rows?.[0]?.total || 0));
    const totalRevenue = Math.abs(parseFloat(revenueRes?.rows?.[0]?.total || 0));
    const { total: fuelVolume } = await getTotalFuelVolumeFromDetails(range.startDate, range.endDate, siteIds);
    const denominator = fuelVolume > 0 ? fuelVolume : (fuelSales !== 0 ? fuelSales : (totalRevenue !== 0 ? totalRevenue : 0));
    // Overheads as expense magnitude (same basis as breakdown: fuel profit − |overheads|).
    const overheadsMag = Math.abs(totalOverheads);
    const overheadPerUnitPence = denominator !== 0 ? (overheadsMag / denominator) * 100 : 0;
    const { fuelProfit } = await getGrossProfit(range.startDate, range.endDate, siteIds);
    const pplAfterOverheads = denominator !== 0 ? ((fuelProfit - overheadsMag) / denominator) * 100 : 0;
    res.json({ success: true, data: { actualPPL: overheadPerUnitPence, totalOverheads, pplAfterOverheads, fuelSales, totalRevenue, fuelVolume, ...range } });
  } catch (e) {
    console.error('[petrol-data/actual-ppl]', e?.message || e);
    res.json({ success: true, data: { actualPPL: 0, totalOverheads: 0, pplAfterOverheads: 0, fuelSales: 0, totalRevenue: 0, fuelVolume: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/actual-ppl-breakdown - Full overhead nominal list for dashboard "Overhead Cost Breakdown" (unchanged). /actual-ppl alone uses EBITA overhead bucket for PPL.
router.get('/actual-ppl-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const sumExpr = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;
    const runQuery = async (col) => query(`
      SELECT nominal_code, ${sumExpr(col)} as amount, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('${OVERHEADS_CODES.join("','")}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    let r = await runQuery(AMOUNT_COLUMN);
    if (AMOUNT_COLUMN === 'amount' && (!r.rows?.length || r.rows.every((row) => parseFloat(row.amount || 0) === 0))) {
      try {
        r = await runQuery('net');
      } catch (_) {}
    }
    const wireframeLabels = {
      '7100': 'Royalty', '7101': 'Franchisee Fees',
      '7148': 'Terminal Rental (Phone-card/Lottery)', '7149': 'Car Lease Rental', '7150': 'Rent',
      '7151': 'General Rates', '7152': 'Water',
      '7200': 'Light & Heat', '7201': 'Service Charges',
      '7250': 'Premises Insurance', '7251': 'Directors Insurance', '7252': 'Medical Insurance',
      '7300': 'Mileage Allowance', '7301': 'Mileage Allowance-Directors',
      '7351': 'MOT & Road Tax', '7352': 'Repairs & Servicing', '7353': 'Vehicle Insurance', '7354': 'Miscellaneous Motor Expenses',
      '7400': 'Car,Cab,Flight & Accommodations', '7401': 'Subsistence Allowance', '7402': 'Entertainment', '7403': 'Mileage Allowance', '7404': 'Business Meeting',
      '7500': 'Printing & Stationery', '7501': 'Postage & Carriage',
      '7550': 'Advertising', '7551': 'Fatcham EV Project', '7552': 'Business Promotion', '7553': 'Business Development (GREENFORD)', '7554': 'Business Development', '7555': 'Lye Business Development', '7556': 'Belgrave (Business Development)',
      '7600': 'General Repairs & Maintenance', '7601': 'Cleaning', '7602': 'Pumps & Tills Contracted', '7603': 'Pumps & Tills Other', '7604': 'Fire Protection & Security Costs', '7605': 'Cash Collection Security', '7606': 'Air Condition & Fridges', '7607': 'Refurbishment Expenses', '7608': 'Valet Repairs & Maintenance Other', '7611': 'Canopy Costs', '7612': 'Equipment Hire',
      '7700': 'Bank Interest Paid', '7701': 'Bank Interest Received', '7702': 'Bank Charges Paid', '7704': 'Penalty Interest',
      '7800': 'Repairs & Renewals', '7905': 'Polling Charges', '7906': 'Credit Card Charges',
      '8000': 'Bad Debts', '8001': 'Write Off', '8002': 'Cash Under/Over',
      '8050': 'Legal Fees', '8051': 'Audit Fees', '8052': 'Consultancy Fees', '8053': 'Professional Fees', '8054': 'Bookkeeping Fees', '8055': 'Petroleum Certificate Fee',
      '8100': 'Mobiles', '8101': 'Telephone Charges',
      '8150': 'Computer & Software', '8151': 'Cash Collection Security', '8152': 'Charitable Donations', '8153': 'Miscellaneous Expenses', '8154': 'Customer Claims', '8155': 'Membership & Subscription Fees', '8156': 'Health and Safety', '8157': 'Operator Training Cost', '8158': 'Terminal Charges',
      '7750': 'Loan Interest Paid', '7705': 'Overdraft Interest', '7751': 'Astwick EV Project', '7752': 'Arrangement Fees', '7753': 'Guarantee Fees',
      '8200': 'Depreciation Motor Vehicles', '8201': 'Depreciation Leasehold L&B', '8202': 'Depreciation Freehold Land & Building', '8203': 'Depreciation Plant & Machinery', '8204': 'Depreciation Fixtures & Fittings', '8206': 'Depreciation Other Assets', '8207': 'Depreciation Site Development & Improvement'
    };
    const dbMap = {};
    (r.rows || []).forEach(row => {
      const code = String(row.nominal_code ?? '').trim();
      dbMap[code] = { amount: parseFloat(row.amount||0), txn_count: parseInt(row.txn_count||0) };
    });
    const breakdown = OVERHEADS_CODES.map(code => {
      const category = wireframeLabels[code] || NOMINAL_CODE_NAMES[code] || code;
      const db = dbMap[code] || { amount: 0, txn_count: 0 };
      return { category, code, amount: db.amount, transactionCount: db.txn_count };
    });
    const totalOverheads = breakdown.reduce((s,x)=>s+x.amount,0);
    res.json({ success: true, data: { breakdown, totalOverheads, ...range } });
  } catch (e) {
    console.error('[petrol-data/actual-ppl-breakdown]', e?.message || e);
    res.json({ success: true, data: { breakdown: [], totalOverheads: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/wages-for-overheads - Wages from labour N/C 7000-7003,7005-7008,7010. Uses AMOUNT_COLUMN; fallback to net when zero.
const WAGES_FOR_OVERHEADS_CODES = ['7000','7001','7002','7003','7005','7006','7007','7008','7010'];
const WAGES_FOR_OVERHEADS_SQL = "TRIM(nominal_code::text) IN ('" + WAGES_FOR_OVERHEADS_CODES.join("','") + "')";
router.get('/wages-for-overheads', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const sumExpr = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;
    const runQuery = async (col) => query(`
      SELECT ${sumExpr(col)} as wages
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${WAGES_FOR_OVERHEADS_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
    `, params);
    let r = await runQuery(AMOUNT_COLUMN);
    let wages = parseFloat(r?.rows?.[0]?.wages || 0);
    if (AMOUNT_COLUMN === 'amount' && wages === 0) {
      try {
        r = await runQuery('net');
        wages = parseFloat(r?.rows?.[0]?.wages || 0);
      } catch (_) {}
    }
    res.json({ success: true, data: { wages, ...range } });
  } catch (e) {
    console.error('[petrol-data/wages-for-overheads]', e?.message || e);
    res.json({ success: true, data: { wages: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/labour-cost - Codes 7000 (Gross Wages) + 7001 (Employer NI) + 7005 (Staff Pensions).
router.get('/labour-cost', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7000' THEN ${AMOUNT_EXPR} ELSE 0 END),0) as gross_wages,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7001' THEN ${AMOUNT_EXPR} ELSE 0 END),0) as employers_ni,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7005' THEN ${AMOUNT_EXPR} ELSE 0 END),0) as staff_pensions
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('7000','7001','7005')
        AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
    `, params);
    const row = r?.rows?.[0];
    const grossWages = parseFloat(row?.gross_wages||0);
    const employersNI = parseFloat(row?.employers_ni||0);
    const staffPensions = parseFloat(row?.staff_pensions||0);
    const totalLabourCost = grossWages + employersNI + staffPensions;
    res.json({ success: true, data: { totalLabourCost, grossWages, employersNI, staffPensions, ...range } });
  } catch (e) {
    console.error('[petrol-data/labour-cost]', e?.message || e);
    res.json({ success: true, data: { totalLabourCost: 0, grossWages: 0, employersNI: 0, staffPensions: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/labour-cost-breakdown - Codes 7000 + 7001 + 7005 grouped by nominal_code.
router.get('/labour-cost-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT nominal_code, COALESCE(SUM(${AMOUNT_EXPR}),0) as amount, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('7000','7001','7005')
        AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    const breakdown = r.rows.map(row => {
      const code = String(row.nominal_code ?? '').trim();
      return { code, name: NOMINAL_CODE_NAMES[code] || code, amount: parseFloat(row.amount||0), transactionCount: parseInt(row.txn_count||0) };
    });
    const totalLabourCost = breakdown.reduce((s,x)=>s+(x.amount||0),0);
    res.json({ success: true, data: { breakdown, totalLabourCost, ...range } });
  } catch (e) {
    console.error('[petrol-data/labour-cost-breakdown]', e?.message || e);
    res.json({ success: true, data: { breakdown: [], totalLabourCost: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/active-sites - COUNT DISTINCT dept_number
router.get('/active-sites', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT COUNT(DISTINCT dept_number) as cnt
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
    `, params);
    const activeSites = parseInt(r.rows[0]?.cnt||0);
    res.json({ success: true, data: { activeSites, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/profit-margin - (sum of 14 N/Cs) / revenue from 14 N/Cs × 100. Nothing else.
router.get('/profit-margin', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { totalRevenue, totalCost, totalProfit } = await getFuelProfit14Sums(range.startDate, range.endDate, siteIds);
    const profitMargin = totalRevenue !== 0 ? (totalProfit / totalRevenue) * 100 : 0;
    res.json({ success: true, data: { profitMargin, totalRevenue, netProfit: totalProfit, ...range } });
  } catch (e) {
    console.error('[petrol-data/profit-margin]', e?.message || e);
    res.json({ success: true, data: { profitMargin: 0, totalRevenue: 0, netProfit: 0, ...getRangeFromReq(req) } });
  }
});

// Miscellaneous Income codes (Sage chart of accounts section 010). 4405 = Insurance Claims & Compensations.
const MISC_INCOME_CODES = ['4400','4401','4402','4404','4405','4407','4410','4412','4413','4415','4416','4417','4418'];
const MISC_INCOME_SQL = "TRIM(nominal_code::text) IN ('" + MISC_INCOME_CODES.join("','") + "')";

// Total Net Profit deductions (same as /total-net-profit)
const TOTAL_NET_PROFIT_DEPRECIATION_CODES = ['8200', '8201', '8202', '8203', '8204', '8206', '8207'];
const TOTAL_NET_PROFIT_LOAN_INTEREST_CODES = ['7750', '7705', '7752', '7753']; // 7751 excluded

// GET /petrol-data/ebita - EBITA = Gross Profit (Fuel+Shop+Valet) + Misc Income − Overheads (excl. Depreciation & Loan Interest)
router.get('/ebita', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const S = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;

    const [fuelRevR, fuelCostR, shopSalesR, shopCostR, valetSalesR, valetCostR, miscR, ohR, depR, loanR] = await Promise.all([
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${MISC_INCOME_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${EBITA_OVERHEADS_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE TRIM(nominal_code::text) IN ('${DEPRECIATION_CODES.join("','")}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE TRIM(nominal_code::text) IN ('${LOAN_INTEREST_CODES.join("','")}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
    ]);

    const p = (r) => parseFloat(r.rows[0]?.t ?? 0);
    const fuelRevenue = p(fuelRevR);
    const fuelCost = p(fuelCostR);
    const fuelProfit = Math.abs(fuelRevenue) - Math.abs(fuelCost);
    const shopSales = Math.abs(p(shopSalesR));
    const shopCost = Math.abs(p(shopCostR));
    const shopProfit = shopSales - shopCost;
    const valetSales = Math.abs(p(valetSalesR));
    const valetCost = Math.abs(p(valetCostR));
    const valetProfit = valetSales - valetCost;
    const grossProfit = fuelProfit + shopProfit + valetProfit;
    const miscIncome = Math.abs(p(miscR));
    const overheads = Math.abs(p(ohR));
    const depreciation = Math.abs(p(depR));
    const loanInterest = Math.abs(p(loanR));
    const ebita = grossProfit + miscIncome - overheads;

    res.json({ success: true, data: {
      ebita, grossProfit, fuelProfit, shopProfit, valetProfit,
      miscIncome, overheads, depreciation, loanInterest,
      ...range
    }});
  } catch (e) {
    console.error('[petrol-data/ebita]', e?.message || e);
    res.json({ success: true, data: { ebita: 0, grossProfit: 0, fuelProfit: 0, shopProfit: 0, valetProfit: 0, miscIncome: 0, overheads: 0, depreciation: 0, loanInterest: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/total-net-profit - Total Net Profit = EBITDA − Depreciation − Loan Interest (7750,7705,7752,7753; 7751 excluded) − Corporation Tax (9000). EBITA unchanged.
router.get('/total-net-profit', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const S = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;
    const depCodes = TOTAL_NET_PROFIT_DEPRECIATION_CODES.join("','");
    const loanCodes = TOTAL_NET_PROFIT_LOAN_INTEREST_CODES.join("','");

    const [ebitaData, depBreakdownRes, loanBreakdownRes, corpTaxRes] = await Promise.all([
      (async () => {
        const [fuelRevR, fuelCostR, shopSalesR, shopCostR, valetSalesR, valetCostR, miscR, ohR, depR, loanR] = await Promise.all([
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${MISC_INCOME_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${EBITA_OVERHEADS_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE TRIM(nominal_code::text) IN ('${DEPRECIATION_CODES.join("','")}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
          query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE TRIM(nominal_code::text) IN ('${LOAN_INTEREST_CODES.join("','")}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
        ]);
        const p = (r) => parseFloat(r.rows[0]?.t ?? 0);
        const fuelRevenue = p(fuelRevR);
        const fuelCost = p(fuelCostR);
        const fuelProfit = Math.abs(fuelRevenue) - Math.abs(fuelCost);
        const shopSales = Math.abs(p(shopSalesR));
        const shopCost = Math.abs(p(shopCostR));
        const shopProfit = shopSales - shopCost;
        const valetSales = Math.abs(p(valetSalesR));
        const valetCost = Math.abs(p(valetCostR));
        const valetProfit = valetSales - valetCost;
        const grossProfit = fuelProfit + shopProfit + valetProfit;
        const miscIncome = Math.abs(p(miscR));
        const overheads = Math.abs(p(ohR));
        return grossProfit + miscIncome - overheads;
      })(),
      query(`
        SELECT nominal_code, ${S(AMOUNT_COLUMN)} as amount
        FROM ${TRANSACTIONS_TABLE}
        WHERE TRIM(nominal_code::text) IN ('${depCodes}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
        GROUP BY nominal_code ORDER BY nominal_code
      `, params),
      query(`
        SELECT nominal_code, ${S(AMOUNT_COLUMN)} as amount
        FROM ${TRANSACTIONS_TABLE}
        WHERE TRIM(nominal_code::text) IN ('${loanCodes}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
        GROUP BY nominal_code ORDER BY nominal_code
      `, params),
      query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE TRIM(nominal_code::text) = '9000' AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
    ]);

    const ebita = typeof ebitaData === 'number' ? ebitaData : 0;

    const depBreakdown = (depBreakdownRes?.rows || []).map((r) => ({
      code: String(r.nominal_code || '').trim(),
      name: NOMINAL_CODE_NAMES[String(r.nominal_code || '').trim()] || r.nominal_code,
      amount: parseFloat(r.amount || 0),
    }));
    const depreciation = depBreakdown.reduce((s, x) => s + Math.abs(x.amount), 0);

    const loanBreakdown = (loanBreakdownRes?.rows || []).map((r) => ({
      code: String(r.nominal_code || '').trim(),
      name: NOMINAL_CODE_NAMES[String(r.nominal_code || '').trim()] || r.nominal_code,
      amount: parseFloat(r.amount || 0),
    }));
    const loanInterestTotal = loanBreakdown.reduce((s, x) => s + Math.abs(x.amount), 0);

    const corpTaxRaw = parseFloat(corpTaxRes?.rows?.[0]?.t ?? 0);
    const corporationTax = Math.abs(typeof corpTaxRaw === 'number' && !Number.isNaN(corpTaxRaw) ? corpTaxRaw : 0);

    const totalNetProfit = ebita - depreciation - loanInterestTotal - corporationTax;

    res.json({
      success: true,
      data: {
        totalNetProfit,
        ebita,
        depreciation,
        depreciationBreakdown: depBreakdown,
        loanInterestTotal,
        loanInterestBreakdown: loanBreakdown,
        corporationTax,
        ...range,
      },
    });
  } catch (e) {
    console.error('[petrol-data/total-net-profit]', e?.message || e);
    res.json({
      success: true,
      data: {
        totalNetProfit: 0,
        ebita: 0,
        depreciation: 0,
        depreciationBreakdown: [],
        loanInterestTotal: 0,
        loanInterestBreakdown: [],
        corporationTax: 0,
        ...getRangeFromReq(req),
      },
    });
  }
});

// ----- ROI: Total Net Profit as /total-net-profit; investment = 7 asset N/Cs cum. from earliest DB date (for filter) to period end -----

function normalizePgDateToYmd(d) {
  if (d == null || d === '') return null;
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const s = String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Earliest transaction date among the 7 ROI investment N/Cs (optionally restricted to siteIds; use [] for company-wide). */
async function getEarliestRoiInvestmentDate(siteIds = []) {
  try {
    let sql = `SELECT MIN(${DATE_EXPR})::date AS d FROM ${TRANSACTIONS_TABLE} WHERE ${ROI_INVESTMENT_SQL}`;
    const params = [];
    if (siteIds && siteIds.length > 0) {
      const ph = siteIds.map((_, i) => `$${i + 1}`).join(',');
      sql += ` AND (NULLIF(TRIM(dept_number::text), '')::int) IN (${ph})`;
      params.push(...siteIds);
    }
    const r = await query(sql, params);
    const ymd = normalizePgDateToYmd(r.rows[0]?.d);
    if (ymd) return ymd;
  } catch (e) {
    console.warn('[getEarliestRoiInvestmentDate]', e?.message || e);
  }
  return ROI_INVESTMENT_FALLBACK_START;
}

function ymKeyRoi(y, m) {
  return `${y}-${m}`;
}

function eachMonthInclusiveRoi(startDateStr, endDateStr) {
  const sy = +String(startDateStr).slice(0, 4);
  const sm = +String(startDateStr).slice(5, 7);
  const ey = +String(endDateStr).slice(0, 4);
  const em = +String(endDateStr).slice(5, 7);
  const out = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push({ y, m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function rowsToYmMapRoi(rows) {
  const map = new Map();
  for (const r of rows || []) {
    map.set(ymKeyRoi(r.y, r.m), parseFloat(r.total ?? 0));
  }
  return map;
}

async function ymSumQueryRoi(whereInnerSql, startDate, endDate, siteIds) {
  const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
  const sql = `
    SELECT EXTRACT(YEAR FROM ${DATE_EXPR})::int AS y, EXTRACT(MONTH FROM ${DATE_EXPR})::int AS m,
           COALESCE(SUM(${AMOUNT_EXPR}), 0) AS total
    FROM ${TRANSACTIONS_TABLE}
    WHERE (${whereInnerSql}) AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
    GROUP BY 1, 2
    ORDER BY 1, 2`;
  const r = await query(sql, params);
  return rowsToYmMapRoi(r.rows);
}

async function ymAbsSumByNominalRoi(codes, startDate, endDate, siteIds) {
  const codesIn = codes.map((c) => `'${c}'`).join(',');
  const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
  const r = await query(
    `SELECT EXTRACT(YEAR FROM ${DATE_EXPR})::int AS y, EXTRACT(MONTH FROM ${DATE_EXPR})::int AS m,
            TRIM(nominal_code::text) AS nc, COALESCE(SUM(${AMOUNT_EXPR}), 0) AS total
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) IN (${codesIn}) AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
     GROUP BY 1, 2, 3
     ORDER BY 1, 2, 3`,
    params
  );
  const map = new Map();
  for (const row of r.rows || []) {
    const k = ymKeyRoi(row.y, row.m);
    const add = Math.abs(parseFloat(row.total ?? 0));
    map.set(k, (map.get(k) || 0) + add);
  }
  return map;
}

/** Same formula as GET /total-net-profit for [startDate, endDate]. */
async function computeTotalNetProfitForRange(startDate, endDate, siteIds = []) {
  const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
  const S = (col) => `COALESCE(SUM((NULLIF(TRIM(${col}), ''))::numeric), 0)`;
  const depCodes = TOTAL_NET_PROFIT_DEPRECIATION_CODES.join("','");
  const loanCodes = TOTAL_NET_PROFIT_LOAN_INTEREST_CODES.join("','");

  const [ebitaData, depBreakdownRes, loanBreakdownRes, corpTaxRes] = await Promise.all([
    (async () => {
      const [fuelRevR, fuelCostR, shopSalesR, shopCostR, valetSalesR, valetCostR, miscR, ohR] = await Promise.all([
        query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
        query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
        query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
        query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${SHOP_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
        query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
        query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${VALET_COST_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
        query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${MISC_INCOME_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
        query(`SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE ${EBITA_OVERHEADS_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params),
      ]);
      const p = (r) => parseFloat(r.rows[0]?.t ?? 0);
      const fuelRevenue = p(fuelRevR);
      const fuelCost = p(fuelCostR);
      const fuelProfit = Math.abs(fuelRevenue) - Math.abs(fuelCost);
      const shopSales = Math.abs(p(shopSalesR));
      const shopCost = Math.abs(p(shopCostR));
      const shopProfit = shopSales - shopCost;
      const valetSales = Math.abs(p(valetSalesR));
      const valetCost = Math.abs(p(valetCostR));
      const valetProfit = valetSales - valetCost;
      const grossProfit = fuelProfit + shopProfit + valetProfit;
      const miscIncome = Math.abs(p(miscR));
      const overheads = Math.abs(p(ohR));
      return grossProfit + miscIncome - overheads;
    })(),
    query(
      `SELECT nominal_code, ${S(AMOUNT_COLUMN)} as amount FROM ${TRANSACTIONS_TABLE}
       WHERE TRIM(nominal_code::text) IN ('${depCodes}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
       GROUP BY nominal_code ORDER BY nominal_code`,
      params
    ),
    query(
      `SELECT nominal_code, ${S(AMOUNT_COLUMN)} as amount FROM ${TRANSACTIONS_TABLE}
       WHERE TRIM(nominal_code::text) IN ('${loanCodes}') AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
       GROUP BY nominal_code ORDER BY nominal_code`,
      params
    ),
    query(
      `SELECT ${S(AMOUNT_COLUMN)} as t FROM ${TRANSACTIONS_TABLE} WHERE TRIM(nominal_code::text) = '9000' AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`,
      params
    ),
  ]);

  const ebita = typeof ebitaData === 'number' ? ebitaData : 0;
  const depBreakdown = (depBreakdownRes?.rows || []).map((r) => ({
    code: String(r.nominal_code || '').trim(),
    amount: parseFloat(r.amount || 0),
  }));
  const depreciation = depBreakdown.reduce((s, x) => s + Math.abs(x.amount), 0);
  const loanBreakdown = (loanBreakdownRes?.rows || []).map((r) => ({
    code: String(r.nominal_code || '').trim(),
    amount: parseFloat(r.amount || 0),
  }));
  const loanInterestTotal = loanBreakdown.reduce((s, x) => s + Math.abs(x.amount), 0);
  const corpTaxRaw = parseFloat(corpTaxRes?.rows?.[0]?.t ?? 0);
  const corporationTax = Math.abs(typeof corpTaxRaw === 'number' && !Number.isNaN(corpTaxRaw) ? corpTaxRaw : 0);
  const totalNetProfit = ebita - depreciation - loanInterestTotal - corporationTax;
  return { totalNetProfit, ebita, depreciation, loanInterestTotal, corporationTax };
}

/** Monthly P&L maps for total-net-profit-style monthly rows (same site filter as request). */
async function fetchRoiMonthlyPnlMaps(profitStart, profitEnd, siteIds) {
  const [
    fuelRevM,
    fuelCostM,
    shopSalesM,
    shopCostM,
    valetSalesM,
    valetCostM,
    miscM,
    ohM,
    depM,
    loanM,
    corpM,
  ] = await Promise.all([
    ymSumQueryRoi(NET_PROFIT_REVENUE_SQL, profitStart, profitEnd, siteIds),
    ymSumQueryRoi(NET_PROFIT_COST_SQL, profitStart, profitEnd, siteIds),
    ymSumQueryRoi(SHOP_SALES_SQL, profitStart, profitEnd, siteIds),
    ymSumQueryRoi(SHOP_COST_SQL, profitStart, profitEnd, siteIds),
    ymSumQueryRoi(VALET_SALES_SQL, profitStart, profitEnd, siteIds),
    ymSumQueryRoi(VALET_COST_SQL, profitStart, profitEnd, siteIds),
    ymSumQueryRoi(MISC_INCOME_SQL, profitStart, profitEnd, siteIds),
    ymSumQueryRoi(EBITA_OVERHEADS_SQL, profitStart, profitEnd, siteIds),
    ymAbsSumByNominalRoi(TOTAL_NET_PROFIT_DEPRECIATION_CODES, profitStart, profitEnd, siteIds),
    ymAbsSumByNominalRoi(TOTAL_NET_PROFIT_LOAN_INTEREST_CODES, profitStart, profitEnd, siteIds),
    ymSumQueryRoi(`TRIM(nominal_code::text) = '9000'`, profitStart, profitEnd, siteIds),
  ]);
  return {
    fuelRevM,
    fuelCostM,
    shopSalesM,
    shopCostM,
    valetSalesM,
    valetCostM,
    miscM,
    ohM,
    depM,
    loanM,
    corpM,
  };
}

function buildRoiMonthRowsFromPnlMaps(pnl, cumInvByKey, profitStart, profitEnd) {
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const G = (map, y, mm) => map.get(ymKeyRoi(y, mm)) ?? 0;
  const {
    fuelRevM,
    fuelCostM,
    shopSalesM,
    shopCostM,
    valetSalesM,
    valetCostM,
    miscM,
    ohM,
    depM,
    loanM,
    corpM,
  } = pnl;
  const rows = [];
  for (const { y, m } of eachMonthInclusiveRoi(profitStart, profitEnd)) {
    const fuelProfit = Math.abs(G(fuelRevM, y, m)) - Math.abs(G(fuelCostM, y, m));
    const shopProfit = Math.abs(G(shopSalesM, y, m)) - Math.abs(G(shopCostM, y, m));
    const valetProfit = Math.abs(G(valetSalesM, y, m)) - Math.abs(G(valetCostM, y, m));
    const grossProfit = fuelProfit + shopProfit + valetProfit;
    const ebita = grossProfit + Math.abs(G(miscM, y, m)) - Math.abs(G(ohM, y, m));
    const depreciation = G(depM, y, m);
    const loanInterestTotal = G(loanM, y, m);
    const corporationTax = Math.abs(G(corpM, y, m));
    const totalNetProfit = ebita - depreciation - loanInterestTotal - corporationTax;
    const investment = cumInvByKey.get(ymKeyRoi(y, m)) ?? 0;
    let roi = investment !== 0 ? (totalNetProfit / investment) * 100 : 0;
    roi = Number.isFinite(roi) ? Math.max(-1000, Math.min(1000, roi)) : 0;
    rows.push({
      year: y,
      month: m,
      month_name: monthNames[m] || String(m),
      label: `${monthNames[m] || m} ${String(y).slice(-2)}`,
      sortKey: y * 100 + m,
      netProfit: totalNetProfit,
      totalNetProfit,
      investment,
      roi,
      ebita,
    });
  }
  return rows;
}

/**
 * Investment: 7 N/Cs, all departments, cumulative from first DB transaction through each month-end (not limited by selected start month).
 * P&L: same siteIds as dashboard filter (matches Total Net Profit card).
 * bySite: per-dept monthly rows when siteIds non-empty (same company investment denominator).
 */
async function computeRoiMonthlyTrendPayload(profitStart, profitEnd, siteIds) {
  const [invStart, aggPnl] = await Promise.all([
    getEarliestRoiInvestmentDate([]),
    fetchRoiMonthlyPnlMaps(profitStart, profitEnd, siteIds),
  ]);
  const invFlowM = await ymSumQueryRoi(ROI_INVESTMENT_SQL, invStart, profitEnd, []);

  const cumInvByKey = new Map();
  let runInv = 0;
  for (const { y, m } of eachMonthInclusiveRoi(invStart, profitEnd)) {
    runInv += invFlowM.get(ymKeyRoi(y, m)) ?? 0;
    cumInvByKey.set(ymKeyRoi(y, m), runInv);
  }

  const months = buildRoiMonthRowsFromPnlMaps(aggPnl, cumInvByKey, profitStart, profitEnd);
  const bySite = {};
  const depts = Array.isArray(siteIds) && siteIds.length > 0 ? [...siteIds] : [];
  if (depts.length > 0) {
    const sitePnls = await Promise.all(
      depts.map((dept) => fetchRoiMonthlyPnlMaps(profitStart, profitEnd, [dept]))
    );
    depts.forEach((dept, i) => {
      bySite[String(dept)] = buildRoiMonthRowsFromPnlMaps(sitePnls[i], cumInvByKey, profitStart, profitEnd);
    });
  }

  return { months, bySite };
}

// GET /petrol-data/roi - ROI = Total Net Profit (same as KPI card) / cumulative Investment × 100
router.get('/roi', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const [{ totalNetProfit }, invStart] = await Promise.all([
      computeTotalNetProfitForRange(range.startDate, range.endDate, siteIds),
      getEarliestRoiInvestmentDate([]),
    ]);
    const { deptClause, params } = buildDeptFilter([invStart, range.endDate], []);
    const invRes = await query(
      `SELECT COALESCE(SUM(${AMOUNT_EXPR}),0) AS total FROM ${TRANSACTIONS_TABLE} WHERE ${ROI_INVESTMENT_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`,
      params
    );
    const investment = parseFloat(invRes.rows[0]?.total ?? 0);
    let roi = investment !== 0 ? (totalNetProfit / investment) * 100 : 0;
    roi = Number.isFinite(roi) ? Math.max(-1000, Math.min(1000, roi)) : 0;
    res.json({
      success: true,
      data: {
        netProfit: totalNetProfit,
        investment,
        roi,
        startDate: range.startDate,
        endDate: range.endDate,
      },
    });
  } catch (e) {
    console.error('[petrol-data/roi]', e?.message || e);
    res.json({ success: true, data: { netProfit: 0, investment: 0, roi: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/roi-monthly-trend — full user date range (no May clamp). data: { months, bySite }
router.get('/roi-monthly-trend', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const payload = await computeRoiMonthlyTrendPayload(range.startDate, range.endDate, siteIds);
    res.json({ success: true, data: payload });
  } catch (e) {
    console.error('[petrol-data/roi-monthly-trend]', e?.message || e);
    res.json({ success: true, data: { months: [], bySite: {} } });
  }
});

// GET /petrol-data/avg-sale-per-site - Revenue per site
router.get('/avg-sale-per-site', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const sites = await query(`SELECT COUNT(DISTINCT dept_number) as cnt FROM ${TRANSACTIONS_TABLE} WHERE ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
    const rev = await query(`SELECT COALESCE(SUM(${AMOUNT_EXPR}),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`, params);
    const cnt = parseInt(sites.rows[0]?.cnt||0);
    const total = parseFloat(rev.rows[0]?.t||0);
    const avgSalePerSite = cnt > 0 ? total / cnt : 0;
    res.json({ success: true, data: { avgSalePerSite, totalNetSales: total, totalRevenue: total, activeSites: cnt, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/total-purchases
router.get('/total-purchases', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT COALESCE(SUM(${AMOUNT_EXPR}),0) as total
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('5000','5001','5002','5003','5004')
        AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
    `, params);
    const totalPurchases = parseFloat(r.rows[0]?.total||0);
    res.json({ success: true, data: { totalPurchases, ...range } });
  } catch (e) {
    console.error('[petrol-data/total-purchases]', e?.message || e);
    res.json({ success: true, data: { totalPurchases: 0, ...getRangeFromReq(req) } });
  }
});

// GET /petrol-data/total-purchases-breakdown
router.get('/total-purchases-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT nominal_code, COALESCE(SUM(${AMOUNT_EXPR}),0) as amount, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('5000','5001','5002','5003','5004')
        AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    const breakdown = r.rows.map(row => {
      const code = String(row.nominal_code ?? '').trim();
      return { code, name: NOMINAL_CODE_NAMES[code] || code, amount: parseFloat(row.amount||0), transactionCount: parseInt(row.txn_count||0) };
    });
    const totalPurchases = breakdown.reduce((s,x)=>s+x.amount,0);
    res.json({ success: true, data: { breakdown, totalPurchases, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/bank-balance
router.get('/bank-balance', async (req, res) => {
  try {
    const { endDate } = req.query;
    if (!endDate) return res.status(400).json({ success: false, message: 'endDate required' });
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([endDate], siteIds);
    const r = await query(`
      SELECT COALESCE(SUM(${AMOUNT_EXPR}),0) as total
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('1200','1201','1202','1203','1204','1211','1212','1213','1214','1215','1216','1217','1218','1219','1220','1221','1222','1240','1250','1251') AND ${DATE_EXPR} <= $1::date${deptClause}
    `, params);
    res.json({ success: true, data: { bankBalance: parseFloat(r.rows[0]?.total||0), endDate } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/bank-balance-breakdown
router.get('/bank-balance-breakdown', async (req, res) => {
  try {
    const { endDate } = req.query;
    if (!endDate) return res.status(400).json({ success: false, message: 'endDate required' });
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([endDate], siteIds);
    const r = await query(`
      SELECT nominal_code, COALESCE(SUM(${AMOUNT_EXPR}),0) as amount, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('1200','1201','1202','1203','1204','1211','1212','1213','1214','1215','1216','1217','1218','1219','1220','1221','1222','1240','1250','1251') AND ${DATE_EXPR} <= $1::date${deptClause}
      GROUP BY nominal_code
    `, params);
    const breakdown = r.rows.map(row => ({ code: row.nominal_code, amount: parseFloat(row.amount||0), transactionCount: parseInt(row.txn_count||0) }));
    res.json({ success: true, data: { breakdown, endDate } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/bunkered-breakdown - No bunkered flag; return empty
router.get('/bunkered-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    res.json({ success: true, data: { saleVolume: 0, netSales: 0, fuelProfit: 0, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/non-bunkered-breakdown
router.get('/non-bunkered-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    res.json({ success: true, data: { saleVolume: 0, netSales: 0, fuelProfit: 0, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/other-income-summary - Revenue N/Cs excluding fuel 4000s
router.get('/other-income-summary', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT COALESCE(SUM(${AMOUNT_EXPR}),0) as total FROM ${TRANSACTIONS_TABLE}
      WHERE ${REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
    `, params);
    res.json({ success: true, data: { totalOtherIncome: parseFloat(r.rows[0]?.total||0), totalRevenue: parseFloat(r.rows[0]?.total||0), ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/overhead-trends - Monthly overhead cost breakdown (Labour, Rent, Utilities, Maintenance, etc.)
router.get('/overhead-trends', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const amtExpr = `(NULLIF(TRIM(${AMOUNT_COLUMN}), ''))::numeric`;
    const r = await query(`
      SELECT
        EXTRACT(YEAR FROM ${DATE_EXPR})::int as year,
        EXTRACT(MONTH FROM ${DATE_EXPR})::int as month,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7000','7001','7002','7003','7005','7006','7007','7008','7010') THEN ${amtExpr} ELSE 0 END), 0) as labour,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7150' THEN ${amtExpr} ELSE 0 END), 0) as rent,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7148','7149') THEN ${amtExpr} ELSE 0 END), 0) as rentals,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7151' THEN ${amtExpr} ELSE 0 END), 0) as general_rates,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7152' THEN ${amtExpr} ELSE 0 END), 0) as water_rates,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7200','7201') THEN ${amtExpr} ELSE 0 END), 0) as heat_light_power,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7250','7251','7252') THEN ${amtExpr} ELSE 0 END), 0) as insurance,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7300','7301') THEN ${amtExpr} ELSE 0 END), 0) as mileage,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7351','7352','7353','7354') THEN ${amtExpr} ELSE 0 END), 0) as motor,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7400','7401','7402','7403','7404') THEN ${amtExpr} ELSE 0 END), 0) as travel,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7100' THEN ${amtExpr} ELSE 0 END), 0) as royalty,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7101' THEN ${amtExpr} ELSE 0 END), 0) as franchisee_fees,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7800' THEN ${amtExpr} ELSE 0 END), 0) as repairs,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7500','7501') THEN ${amtExpr} ELSE 0 END), 0) as printing_stationery,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7550','7551','7552','7553','7554','7555','7556') THEN ${amtExpr} ELSE 0 END), 0) as advertisement_business_promotion,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7600','7601','7602','7603','7604','7605','7606','7607','7608','7611','7612') THEN ${amtExpr} ELSE 0 END), 0) as repair_maintenance,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7700','7701','7702','7704') THEN ${amtExpr} ELSE 0 END), 0) as bank_interest_charges,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7905' THEN ${amtExpr} ELSE 0 END), 0) as polling_charges,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7906' THEN ${amtExpr} ELSE 0 END), 0) as credit_charges,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('8000','8001') THEN ${amtExpr} ELSE 0 END), 0) as bad_debts,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '8002' THEN ${amtExpr} ELSE 0 END), 0) as cash_under_over,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('8050','8051','8052','8053','8054','8055') THEN ${amtExpr} ELSE 0 END), 0) as legal_professional,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('8100','8101') THEN ${amtExpr} ELSE 0 END), 0) as telephone_costs,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('8150','8151','8152','8153','8154','8155','8156','8157','8158') THEN ${amtExpr} ELSE 0 END), 0) as general_expenses,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7750' THEN ${amtExpr} ELSE 0 END), 0) as loan_interest,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7705' THEN ${amtExpr} ELSE 0 END), 0) as overdraft_interest,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('7751','7752') THEN ${amtExpr} ELSE 0 END), 0) as arrangement_fees,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) = '7753' THEN ${amtExpr} ELSE 0 END), 0) as guarantee_fees,
        COALESCE(SUM(CASE WHEN TRIM(nominal_code::text) IN ('8200','8201','8202','8203','8204','8206','8207') THEN ${amtExpr} ELSE 0 END), 0) as depreciation,
        COALESCE(SUM(${amtExpr}), 0) as total
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('${OVERHEADS_CODES.concat(WAGES_FOR_OVERHEADS_CODES).filter((v,i,a)=>a.indexOf(v)===i).join("','")}')
        AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY year, month ORDER BY year, month
    `, params);
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const rows = r.rows.map(row => ({
      month: `${monthNames[Number(row.month)] || row.month} ${row.year}`,
      labour: parseFloat(row.labour || 0),
      rent: parseFloat(row.rent || 0),
      rentals: parseFloat(row.rentals || 0),
      generalRates: parseFloat(row.general_rates || 0),
      waterRates: parseFloat(row.water_rates || 0),
      heatLightPower: parseFloat(row.heat_light_power || 0),
      insurance: parseFloat(row.insurance || 0),
      mileage: parseFloat(row.mileage || 0),
      motor: parseFloat(row.motor || 0),
      travel: parseFloat(row.travel || 0),
      royalty: parseFloat(row.royalty || 0),
      franchiseeFees: parseFloat(row.franchisee_fees || 0),
      repairs: parseFloat(row.repairs || 0),
      printingStationery: parseFloat(row.printing_stationery || 0),
      advertisementBusinessPromotion: parseFloat(row.advertisement_business_promotion || 0),
      repairMaintenance: parseFloat(row.repair_maintenance || 0),
      bankInterestCharges: parseFloat(row.bank_interest_charges || 0),
      pollingCharges: parseFloat(row.polling_charges || 0),
      creditCharges: parseFloat(row.credit_charges || 0),
      badDebts: parseFloat(row.bad_debts || 0),
      cashUnderOver: parseFloat(row.cash_under_over || 0),
      legalProfessional: parseFloat(row.legal_professional || 0),
      telephoneCosts: parseFloat(row.telephone_costs || 0),
      generalExpenses: parseFloat(row.general_expenses || 0),
      loanInterest: parseFloat(row.loan_interest || 0),
      overdraftInterest: parseFloat(row.overdraft_interest || 0),
      arrangementFees: parseFloat(row.arrangement_fees || 0),
      guaranteeFees: parseFloat(row.guarantee_fees || 0),
      depreciation: parseFloat(row.depreciation || 0),
      total: parseFloat(row.total || 0),
    }));
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[petrol-data/overhead-trends]', e?.message || e);
    res.json({ success: true, data: [] });
  }
});

// GET /petrol-data/monthly-trends
// - volume = litres parsed from fuel **sales** rows N/C 4000–4004 (details column), not 5000 purchases
// - gross profit = fuel profit (14 N/C) + shop profit + valet profit
// - avgPPL uses fuel profit only; pplAfterOH uses (fuel profit − overheads); overheads = EBITA bucket (excl. Depreciation & 7750)
router.get('/monthly-trends', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const ymGroupSQL = `EXTRACT(YEAR FROM ${DATE_EXPR})::int as y, EXTRACT(MONTH FROM ${DATE_EXPR})::int as m`;
    const dateRangeSQL = `${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`;
    const grpSQL = (whereSQL) => `SELECT ${ymGroupSQL}, ${SUM_AMOUNT_SQL} as t FROM ${TRANSACTIONS_TABLE} WHERE ${whereSQL} AND ${dateRangeSQL} GROUP BY y, m ORDER BY y, m`;
    const volumeDetailsQuery = () => query(
      `SELECT ${ymGroupSQL}, details
       FROM ${TRANSACTIONS_TABLE}
       WHERE ${FUEL_SALES_SQL}
         AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date
         AND details IS NOT NULL AND TRIM(COALESCE(details::text, '')) <> ''${deptClause}`,
      params
    ).catch(() => ({ rows: [] }));
    const [totalRevenueRes, costRes, labourRes, overheadsRes, fuelSalesOnlyRes, fuelRevRes, fuelCostRes, shopSalesRes, shopCostRes, valetSalesRes, valetCostRes, volDetailsRes] = await Promise.all([
      query(grpSQL(TOTAL_SITE_REVENUE_SQL), params),
      query(grpSQL(COST_SQL), params),
      query(grpSQL(LABOUR_SQL), params),
      query(grpSQL(EBITA_OVERHEADS_SQL), params),
      query(grpSQL(FUEL_SALES_SQL), params),
      query(grpSQL(NET_PROFIT_REVENUE_SQL), params),
      query(grpSQL(NET_PROFIT_COST_SQL), params),
      query(grpSQL(SHOP_SALES_SQL), params),
      query(grpSQL(SHOP_COST_SQL), params),
      query(grpSQL(VALET_SALES_SQL), params),
      query(grpSQL(VALET_COST_SQL), params),
      volumeDetailsQuery(),
    ]);
    const toMap = (rows) => new Map((rows || []).map((x) => [`${x.y}-${x.m}`, parseFloat(x.t || 0)]));
    const totalRevenueMap = toMap(totalRevenueRes.rows);
    const costMap = toMap(costRes.rows);
    const labourMap = toMap(labourRes.rows);
    const overheadsMap = toMap(overheadsRes.rows);
    const fuelSalesOnlyMap = toMap(fuelSalesOnlyRes.rows);
    const fuelRevMap = toMap(fuelRevRes.rows);
    const fuelCostMap = toMap(fuelCostRes.rows);
    const shopSalesMap = toMap(shopSalesRes.rows);
    const shopCostMap = toMap(shopCostRes.rows);
    const valetSalesMap = toMap(valetSalesRes.rows);
    const valetCostMap = toMap(valetCostRes.rows);
    // Volume: 2025 from HSRL_volumne_2025 table; 2026+ from details column
    const volumeMap = await getMonthlyVolumeFromTable(range.startDate, range.endDate, siteIds);
    for (const row of volDetailsRes.rows || []) {
      if (row.y >= 2026) {
        const key = `${row.y}-${row.m}`;
        const segments = parseDetailsToVolumeSegments(row.details);
        const add = segments.reduce((s, seg) => s + (seg.volume || 0), 0);
        volumeMap.set(key, (volumeMap.get(key) || 0) + add);
      }
    }
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const allKeys = new Set([
      ...totalRevenueMap.keys(), ...fuelRevMap.keys(), ...fuelCostMap.keys(), ...volumeMap.keys(),
      ...overheadsMap.keys(), ...fuelSalesOnlyMap.keys(), ...costMap.keys(),
      ...shopSalesMap.keys(), ...shopCostMap.keys(), ...valetSalesMap.keys(), ...valetCostMap.keys(),
    ]);
    const sortedKeys = [...allKeys].sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return y1 !== y2 ? y1 - y2 : m1 - m2;
    });
    const rows = sortedKeys.map((key) => {
      const [y, m] = key.split('-').map(Number);
      const sales = totalRevenueMap.get(key) || 0;
      const totalCost = costMap.get(key) || 0;
      const labour = labourMap.get(key) || 0;
      const volume = volumeMap.get(key) || 0;
      const fuelRev = Math.abs(fuelRevMap.get(key) || 0);
      const fuelCostVal = Math.abs(fuelCostMap.get(key) || 0);
      const fuelProfit = fuelRev - fuelCostVal;
      const shopSales = Math.abs(shopSalesMap.get(key) || 0);
      const shopCost = Math.abs(shopCostMap.get(key) || 0);
      // Signed: shop/valet loss must subtract from monthly GP.
      const shopProfit = shopSales - shopCost;
      const valetSales = Math.abs(valetSalesMap.get(key) || 0);
      const valetCost = Math.abs(valetCostMap.get(key) || 0);
      const valetProfit = valetSales - valetCost;
      const grossProfit = Math.abs(fuelProfit) + shopProfit + valetProfit;
      const totalOverheads = overheadsMap.get(key) || 0;
      const fuelSalesOnly = fuelSalesOnlyMap.get(key) || 0;
      const denominator = volume > 0 ? volume : fuelSalesOnly !== 0 ? fuelSalesOnly : 0;
      const avgPPL = denominator !== 0 ? (Math.abs(fuelProfit) / denominator) * 100 : null;
      const pplAfterOverheads = denominator !== 0 ? ((Math.abs(fuelProfit) - totalOverheads) / denominator) * 100 : null;
      const volumeML = volume > 0 ? volume / 1e6 : 0;
      return {
        year: y,
        month: m,
        month_name: `${monthNames[m] || m} ${y}`,
        sales,
        fuelSales: fuelRev,
        shopSales,
        valetSales,
        net_sales: sales,
        volume,
        sale_volume: volume,
        volumeML,
        profit: grossProfit,
        grossProfit,
        fuelProfit,
        shopProfit,
        valetProfit,
        fuel_profit: fuelProfit,
        purchases: totalCost,
        labour,
        avgPPL: avgPPL != null && !Number.isNaN(avgPPL) ? Number(avgPPL.toFixed(4)) : undefined,
        pplAfterOH: pplAfterOverheads != null && !Number.isNaN(pplAfterOverheads) ? Number(pplAfterOverheads.toFixed(4)) : undefined,
      };
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[petrol-data/monthly-trends]', e?.message || e);
    res.json({ success: true, data: [] });
  }
});

// GET /petrol-data/daily-data - Revenue N/Cs
router.get('/daily-data', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT ${DATE_EXPR} as date, COALESCE(SUM(${AMOUNT_EXPR}),0) as sales
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${REVENUE_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY ${DATE_EXPR} ORDER BY date
    `, params);
    const dailyData = r.rows.map(row => ({ date: row.date, sales: parseFloat(row.sales||0), volume: 0 }));
    res.json({ success: true, data: dailyData });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/ppl-comparison - monthly Avg PPL (fuel profit only) and OH Deduction (overheads ÷ volume or fuel sales).
router.get('/ppl-comparison', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const ymGroupSQL = `EXTRACT(YEAR FROM ${DATE_EXPR})::int as y, EXTRACT(MONTH FROM ${DATE_EXPR})::int as m`;
    const dateRangeSQL = `${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}`;
    const grpSQL = (whereSQL) => `SELECT ${ymGroupSQL}, ${SUM_AMOUNT_SQL} as t FROM ${TRANSACTIONS_TABLE} WHERE ${whereSQL} AND ${dateRangeSQL} GROUP BY y, m ORDER BY y, m`;
    const detailsQueryPpl = () => query(`SELECT ${ymGroupSQL}, details FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date AND details IS NOT NULL AND TRIM(details::text) <> ''${deptClause}`, params).catch(() => ({ rows: [] }));
    const [fuelSalesRes, detailsRes, fuelRevRes, fuelCostRes, overheadsRes] = await Promise.all([
      query(grpSQL(FUEL_SALES_SQL), params),
      detailsQueryPpl(),
      query(grpSQL(NET_PROFIT_REVENUE_SQL), params),
      query(grpSQL(NET_PROFIT_COST_SQL), params),
      query(grpSQL(EBITA_OVERHEADS_SQL), params),
    ]);
    const toMap = (rows) => new Map((rows || []).map(x => [`${x.y}-${x.m}`, parseFloat(x.t || 0)]));
    const fuelSalesMap = toMap(fuelSalesRes.rows);
    const fuelRevMap = toMap(fuelRevRes.rows);
    const fuelCostMap = toMap(fuelCostRes.rows);
    const overheadsMap = toMap(overheadsRes.rows);
    // Volume: 2025 from HSRL_volumne_2025 table; 2026+ from details column
    const volumeMap = await getMonthlyVolumeFromTable(range.startDate, range.endDate, siteIds);
    for (const row of detailsRes.rows || []) {
      if (row.y >= 2026) {
        const key = `${row.y}-${row.m}`;
        const segments = parseDetailsToVolumeSegments(row.details);
        const add = segments.reduce((s, seg) => s + (seg.volume || 0), 0);
        volumeMap.set(key, (volumeMap.get(key) || 0) + add);
      }
    }
    const allKeys = new Set([...fuelSalesMap.keys(), ...volumeMap.keys(), ...fuelRevMap.keys(), ...fuelCostMap.keys(), ...overheadsMap.keys()]);
    const sortedKeys = [...allKeys].sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return y1 !== y2 ? y1 - y2 : m1 - m2;
    });
    const rows = sortedKeys.map(key => {
      const [y, m] = key.split('-').map(Number);
      const sales = fuelSalesMap.get(key) || 0;
      const volume = volumeMap.get(key) || 0;
      const fuelRev = Math.abs(fuelRevMap.get(key) || 0);
      const fuelCostVal = Math.abs(fuelCostMap.get(key) || 0);
      const fuelProfit = Math.abs(fuelRev - fuelCostVal);
      const totalOverheads = overheadsMap.get(key) || 0;
      const denominator = volume > 0 ? volume : (sales !== 0 ? sales : 0);
      const avgPPL = denominator !== 0 ? (fuelProfit / denominator) * 100 : 0;
      const actualPPL = denominator !== 0 ? (totalOverheads / denominator) * 100 : 0;
      return { year: y, month: m, avgPPL, actualPPL, overheads: totalOverheads };
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[petrol-data/ppl-comparison]', e?.message || e);
    res.json({ success: true, data: [] });
  }
});

// GET /petrol-data/profit-by-site - PRL: Revenue - Cost per dept
router.get('/profit-by-site', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT 
        dept_number as site_code, 'Dept ' || dept_number as site_name,
        COALESCE(SUM(CASE WHEN ${REVENUE_SQL} THEN ${AMOUNT_EXPR} ELSE 0 END),0) as rev,
        COALESCE(SUM(CASE WHEN ${COST_SQL} THEN ${AMOUNT_EXPR} ELSE 0 END),0) as cost
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
      GROUP BY dept_number
    `, params);
    const sites = r.rows.map(row => {
      const rev = parseFloat(row.rev||0);
      const cost = parseFloat(row.cost||0);
      return { site_code: row.site_code, site_name: row.site_name, fuel_profit: rev - cost, net_sales: rev };
    }).sort((a,b) => b.fuel_profit - a.fuel_profit).slice(0, 10);
    res.json({ success: true, data: sites });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/site-rankings - Profit per site using the same 14 Fuel Profit N/C's as the Net Profit card.
// Top 5 = highest profit; Bottom 5 = lowest profit (least profitable, not just loss-makers).
router.get('/site-rankings', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      WITH dept_parsed AS (
        SELECT 
          (NULLIF(TRIM(dept_number::text), '')::int) AS site_code,
          TRIM(nominal_code::text) AS nc,
          ${AMOUNT_EXPR} AS amt
        FROM ${TRANSACTIONS_TABLE}
        WHERE ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date${deptClause}
          AND TRIM(COALESCE(dept_number::text, '')) ~ '^[0-9]+$'
          AND (NULLIF(TRIM(dept_number::text), '')::int) BETWEEN 0 AND 19
      )
      SELECT
        site_code,
        COALESCE(SUM(amt), 0) AS raw_profit,
        COALESCE(SUM(CASE WHEN nc IN ('4000','4001','4002','4003','4004') THEN amt ELSE 0 END), 0) AS fuel_sales,
        COALESCE(SUM(CASE WHEN nc IN ('5000','5001','5002','5003','5004') THEN amt ELSE 0 END), 0) AS fuel_purchases,
        COALESCE(SUM(CASE WHEN nc IN (${FUEL_PROFIT_SALES_CODES.map(c => `'${c}'`).join(',')}) THEN amt ELSE 0 END), 0) AS net_sales
      FROM dept_parsed
      WHERE nc IN (${FUEL_PROFIT_NOMINAL_CODES.map(c => `'${c}'`).join(',')})
        AND site_code >= 0 AND site_code <= 19
      GROUP BY site_code
    `, params);
    const all = (r.rows || []).map(row => {
      const siteCode = Number(row.site_code);
      const siteName = DEPT_TO_SITE_NAME[siteCode] || ('Dept ' + siteCode);
      const netSales = Math.abs(parseFloat(row.net_sales || 0));
      const fuelSales = Math.abs(parseFloat(row.fuel_sales || 0));
      const fuelCost = Math.abs(parseFloat(row.fuel_purchases || 0));
      const fuelProfit = fuelSales - fuelCost;
      const fuel_margin_pct = fuelSales > 0 ? (fuelProfit / fuelSales) * 100 : 0;
      return {
        site_code: siteCode,
        site_name: siteName,
        name: siteName,
        net_sales: netSales,
        fuel_profit: Math.abs(fuelProfit),
        margin: fuel_margin_pct,
        ppl: fuel_margin_pct,
        fuel_margin_pct
      };
    });
    const byProfitDesc = [...all].sort((a, b) => b.fuel_profit - a.fuel_profit);
    const top5 = byProfitDesc.slice(0, 5);
    const bottom5 = byProfitDesc.slice(-5).reverse();
    console.log('[site-rankings] top:', top5.length, 'bottom:', bottom5.length, 'total sites:', all.length, 'dateRange:', range.startDate, 'to', range.endDate);
    res.json({ success: true, data: { top: top5, bottom: bottom5 } });
  } catch (e) {
    console.error('[petrol-data/site-rankings]', e?.message || e);
    res.json({ success: true, data: { top: [], bottom: [] } });
  }
});

export default router;
