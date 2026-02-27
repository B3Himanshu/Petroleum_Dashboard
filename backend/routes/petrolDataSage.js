/**
 * Petrol Data API for sage_data schema
 * PRL Logic Bar & Formula Sheet compliant
 * Uses transactions table only: id, nominal_code, dept_number, transaction_date, amount, created_at
 * dept_number = site identifier; use department numbers to bifurcate data site-wise
 *
 * FORMULA SHEET (6 formulas):
 * 1. Avg. Basket Size = Total Shop Sales / Transactions (N/A - Shop not in Sage)
 * 2. Average PPL = (Fuel profit / Fuel volume) × 100 (no volume in DB → 0)
 * 3. PPL after vending out overheads = (Over Heads / Volume) × 100 (no volume → 0)
 * 4. Customer Count = From EvoBos (external - N/A)
 * 5. Labour Cost % = (Labour cost / Shop or fuel sales) × 100
 * 6. ROI = (Net Profit / Total Investment or total operating cost) × 100
 */
import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Optional: force which schema the transactions table is read from (e.g. sage_data).
// If 5200 shows £0 in profit breakdown but check-5200-fuel.js has data, set DB_TRANSACTIONS_SCHEMA=sage_data (or public).
const TRANSACTIONS_SCHEMA = process.env.DB_TRANSACTIONS_SCHEMA || null;
const TRANSACTIONS_TABLE = (TRANSACTIONS_SCHEMA && /^[a-zA-Z0-9_]+$/.test(TRANSACTIONS_SCHEMA))
  ? `"${TRANSACTIONS_SCHEMA}".transactions`
  : 'transactions';

// PRL Logic Bar - Nominal codes from "PRL Logic Bar csv.csv" (single source of truth)
// Fuel Sales (CSV line 9): 4000, 4001, 4002, 4003, 4008 — Category names for display (Sage/Volume)
const FUEL_SALES_CODES = ['4000','4001','4002','4003','4008'];
const FUEL_CATEGORY_NAMES = { '4000':'Petrol','4001':'Diesel','4002':'Ultimate Petrol','4003':'Ultimate Diesel','4008':'Adblue' };
// Revenue N/Cs (CSV line 81): 4000, 4001, 4002, 4003, 4008, 4011, 4901, 4904, 4907, 4400, 6101, 6102 — 6100 is Cost, not Revenue
const REVENUE_CODES = ['4000','4001','4002','4003','4008','4011','4400','4901','4904','4907','6101','6102'];
// Total Site Revenue only: exclude 4011 (Fuel Other), 4400 (Shop), 6102 (Valeting)
const SITE_REVENUE_CODES = ['4000','4001','4002','4003','4008','4901','4904','4907','6101'];
const FUEL_PURCHASE_CODES = ['5000','5001','5003','5004','5007','5012','5014'];
// Labour (CSV line 42): 7000 Gross Wages, 7006 Employer NI, 7007 Staff Pensions
const LABOUR_CODES = ['7000','7006','7007'];
// Overheads (CSV lines 34, 98–102): 7103 General Rates, 7100 Rent, 7200 Electricity, 7801 Repairs & Renewals, 7905 Credit Charges
const OVERHEADS_CODES = ['7103','7100','7200','7801','7905'];
// Cost N/Cs (CSV line 85) — full list for Total Cost / Net Profit = Revenue − Cost
const COST_CODES = ['5000','5001','5003','5004','5007','5012','5014','5100','5102','5200','6100','7000','7001','7006','7007','7099','7100','7102','7103','7104','7200','7300','7301','7302','7303','7305','7306','7400','7402','7403','7500','7501','7502','7503','7550','7551','7552','7600','7601','7602','7603','7605','7607','7700','7702','7752','7800','7801','7802','7804','7901','7903','7905','8001','8002','8003','8004','8005','8006','8009','8200','8201','8204','8207','8250','8251','9000','9001','9999','7604'];

// Fuel Profit N/Cs — sum of all, do NOT remove negative sign (4000–4008,4400 sales; 5000–5014,5102,5200,6100 cost)
const FUEL_PROFIT_NOMINAL_CODES = ['4000','4001','4002','4003','4008','4400','5000','5001','5003','5004','5014','5102','5200','6100'];
const FUEL_PROFIT_SQL = "nominal_code IN ('" + FUEL_PROFIT_NOMINAL_CODES.join("','") + "')";
const FUEL_PROFIT_SALES_CODES = ['4000','4001','4002','4003','4008','4400'];
const FUEL_PROFIT_COST_CODES = ['5000','5001','5003','5004','5014','5102','5200','6100'];
const FUEL_PROFIT_SALES_SQL = "nominal_code IN ('" + FUEL_PROFIT_SALES_CODES.join("','") + "')";
const FUEL_PROFIT_COST_SQL = "nominal_code IN ('" + FUEL_PROFIT_COST_CODES.join("','") + "')";
const FUEL_PROFIT_NC_NAMES = { '4000':'Petrol-Sales','4001':'Diesel-Sales','4002':'Super Petrol-Sales','4003':'Super Diesel-Sales','4008':'AdBlue-Sales','4400':'Bunkering Charges','5000':'Petrol-Purchases','5001':'Diesel-Purchases','5003':'Super Petrol-Purchases','5004':'Super Diesel-Purchases','5014':'AdBlue-Purchases','5102':'Other Purchases-(Fuel Promotional)','5200':'Stock Movement','6100':'Fuel Commissions' };

// When DB stores purchase/cost amounts as positive but Sage uses negative, treat positive as negative for profit (all 8 cost codes)
const CODES_DB_POSITIVE_AS_NEGATIVE = ['4400', '5000', '5001', '5003', '5004', '5014', '5102', '5200', '6100'];

const REVENUE_SQL = "nominal_code IN ('" + REVENUE_CODES.join("','") + "')";
const SITE_REVENUE_SQL = "nominal_code IN ('" + SITE_REVENUE_CODES.join("','") + "')";
const COST_SQL = "nominal_code IN ('" + COST_CODES.join("','") + "')";
const FUEL_SALES_SQL = "nominal_code IN ('" + FUEL_SALES_CODES.join("','") + "')";
const FUEL_PURCHASE_SQL = "nominal_code IN ('" + FUEL_PURCHASE_CODES.join("','") + "')";
const OVERHEADS_SQL = "nominal_code IN ('" + OVERHEADS_CODES.join("','") + "')";
const LABOUR_SQL = "nominal_code IN ('" + LABOUR_CODES.join("','") + "')";

// EBITA = SUM of 69 N/Cs (do not remove negative sign from any value)
const EBITA_CODES = [
  '4000','4001','4002','4003','4008','4400','4011','4901','4904','4907',
  '5000','5001','5003','5004','5007','5012','5014','5102','5200','6100',
  '6101','6102','7000','7001','7006','7007','7099','7100','7102','7103',
  '7104','7200','7300','7301','7302','7303','7305','7306','7400','7402',
  '7403','7500','7501','7502','7503','7550','7551','7552','7600','7601',
  '7602','7603','7605','7607','7700','7702','7800','7801','7802','5100',
  '7804','7901','7905','8201','8204','8207','8250','8251','9999',
];
const EBITA_SQL = "TRIM(nominal_code::text) IN ('" + EBITA_CODES.join("','") + "')";

// ROI = Net Profit / Investment × 100. Net Profit = sum of 82 N/Cs (do not remove negative sign). Investment = sum of 15 N/Cs.
const NET_PROFIT_CODES = [
  '4000','4001','4002','4003','4008','4400','4011','4901','4904','4907',
  '5000','5001','5003','5004','5007','5012','5014','5102','5200','6100',
  '6101','6102','7000','7001','7006','7007','7099','7100','7102','7103',
  '7104','7200','7300','7301','7302','7303','7305','7306','7400','7402',
  '7403','7500','7501','7502','7503','7550','7551','7552','7600','7601',
  '7602','7603','7605','7607','7700','7702','7800','7801','7802','5100',
  '7804','7901','7905','8201','8204','8207','8250','8251','9999',
  '7752','7604','7903','8001','8002','8003','8004','8005','8006','8009','8200','9000','9001',
];
// All 15 Investment N/Cs; codes with no rows in transactions (e.g. 0012, 0014, 0055, 0056, 0057, 0058, 0062, 0064) contribute 0 to the sum.
const INVESTMENT_CODES = ['0010','0012','0014','0020','0030','0040','0050','0055','0056','0057','0058','0060','0062','0064','0080'];
const NET_PROFIT_SQL = "TRIM(nominal_code::text) IN ('" + NET_PROFIT_CODES.join("','") + "')";
const INVESTMENT_SQL = "TRIM(nominal_code::text) IN ('" + INVESTMENT_CODES.join("','") + "')";

// Dept number (site_code) → display name for site-rankings (aligned with testScript.js / document)
const DEPT_TO_SITE_NAME = {
  6: 'Manor Service Station',
  7: 'Hen And Chicken SS',
  9: 'Salterton Road SS',
  10: 'Lanner Moor Garage',
  11: 'Luton Road SS',
  14: 'Kings Lane SS',
  17: 'Delph SS',
  18: 'Saxon Autopoint SS',
  19: 'Jubits Lane SS',
  20: 'Worsley Brow',
  23: 'Auto Pitstop',
  24: 'Crown SS',
  25: 'Marsland SS',
  29: 'Gemini SS',
  30: 'Park View',
  31: 'Filleybrook SS',
  33: 'Swan Connect',
  34: 'Portland',
  35: 'Lower Lane',
  36: 'Vale SS',
  37: 'Kensington SS',
  38: 'County Oak SS',
  39: 'Kings Of Sedgley',
  40: 'Gnosall SS',
  41: 'Minsterley SS',
  42: 'Nelson SS',
  43: 'Yeovil SS',
  44: 'Canklow SS',
  45: 'Stanton Self Service',
};

// Site code → postcode (from testScript.js expectedPostcodes)
const DEPT_TO_POSTCODE = {
  6: 'SO18 1AR', 7: 'GU34 4JH', 9: 'EX8 2NE', 10: 'TR16 6HT', 11: 'LU5 4LW',
  14: 'PE19 1JZ', 17: 'PE7 1RO', 18: 'PE7 1NJ', 19: 'WA9 4RX', 20: 'WA9 3EZ',
  23: 'PE13 4AA', 24: 'HD6 1QH', 25: 'OL8 1SY', 29: 'WA5 7TY', 30: 'DE45 1AW',
  31: 'ST15 0PT', 33: 'B70 0YA', 34: 'DT5 1BW', 35: 'GL16 8QQ', 36: 'WR11 7QP',
  37: 'B29 7NY', 38: 'RH10 9TA', 39: 'DY3 1RA', 40: 'ST20 0EZ', 41: 'SY5 0BE',
  42: 'BB9 7AJ', 43: 'BA21 4EH', 44: 'S60 2XG', 45: 'IP31 2BZ',
};

// Label prefix (first segment from details, e.g. "Sax", "Luton Road") → canonical site name (one of 29). Used to combine volume by site in fuel-volume-transition-breakdown.
const CANONICAL_SITE_NAMES = Object.values(DEPT_TO_SITE_NAME);
const LABEL_PREFIX_TO_CANONICAL_SITE = {};
for (const name of CANONICAL_SITE_NAMES) {
  LABEL_PREFIX_TO_CANONICAL_SITE[name] = name;
}
// Map common label prefixes from details to canonical name (29 sites only)
const PREFIX_ALIASES = [
  ['Sax', 'Saxon Autopoint SS'], ['Saxon', 'Saxon Autopoint SS'], ['Saxon Autopoint', 'Saxon Autopoint SS'],
  ['Luton Road', 'Luton Road SS'], ['Gemini Services', 'Gemini SS'], ['Gemini', 'Gemini SS'],
  ['Manor', 'Manor Service Station'], ['Hen And Chicken', 'Hen And Chicken SS'], ['Hen', 'Hen And Chicken SS'], ['Hen & Chicken', 'Hen And Chicken SS'],
  ['Salterton Road', 'Salterton Road SS'], ['Salterton', 'Salterton Road SS'], ['Lanner Moor', 'Lanner Moor Garage'],
  ['Kings Lane', 'Kings Lane SS'], ['Delph', 'Delph SS'], ['Jubits Lane', 'Jubits Lane SS'],
  ['Worsley Brow', 'Worsley Brow'], ['Worsley', 'Worsley Brow'], ['Auto Pitstop', 'Auto Pitstop'], ['Auto', 'Auto Pitstop'], ['Autokey', 'Auto Pitstop'],
  ['Crown', 'Crown SS'], ['Marsland', 'Marsland SS'], ['Park View', 'Park View'],
  ['Filleybrook', 'Filleybrook SS'], ['Swan', 'Swan Connect'], ['Portland', 'Portland'],
  ['Lower Lane', 'Lower Lane'], ['Vale', 'Vale SS'], ['Kensington', 'Kensington SS'],
  ['County Oak', 'County Oak SS'], ['Kings Of Sedgley', 'Kings Of Sedgley'], ['Sedgley', 'Kings Of Sedgley'], ['Gnosall', 'Gnosall SS'],
  ['Minsterley', 'Minsterley SS'], ['Nelson', 'Nelson SS'], ['Yeovil', 'Yeovil SS'],
  ['Canklow', 'Canklow SS'], ['Stanton', 'Stanton Self Service'], ['Stanton Self Service', 'Stanton Self Service'],
];
for (const [prefix, canonical] of PREFIX_ALIASES) {
  if (!LABEL_PREFIX_TO_CANONICAL_SITE[prefix]) LABEL_PREFIX_TO_CANONICAL_SITE[prefix] = canonical;
}

// Dash-like characters: ASCII hyphen, en-dash, em-dash, minus, Unicode hyphen variants (so "Auto-Adblue", "Auto–Adblue" etc. all yield prefix "Auto")
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
  // Normalize "&" to " And " so "Hen & Chicken" matches "Hen And Chicken"
  trimmed = trimmed.replace(/\s*&\s*/g, ' And ');
  const canonical = LABEL_PREFIX_TO_CANONICAL_SITE[trimmed];
  if (canonical) return canonical;
  const lower = trimmed.toLowerCase();
  for (const [prefix, canonicalName] of PREFIX_ALIASES) {
    if (lower === prefix.toLowerCase()) return canonicalName;
  }
  const found = CANONICAL_SITE_NAMES.find(n => n.toLowerCase() === lower);
  if (found) return found;
  // Labels with no dash (e.g. "Autokey Fuel Adblue for May'25") use full string as prefix; map "Autokey" → Auto Pitstop so -481.59 etc. are attributed
  if (lower.startsWith('autokey')) return 'Auto Pitstop';
  // Any prefix starting with "Auto" (e.g. "Auto-Adblue Pumped...", "Auto Adblue Pumped", "AutoAdblue...") → Auto Pitstop so self-bill +481.59 etc. are included
  if (lower.startsWith('auto')) return 'Auto Pitstop';
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

// Profit (EBITA, Net Profit) data is from May to Dec only. Clamp startDate to May 1 of the start year if earlier.
function getProfitDateRange(startDate, endDate) {
  const [y, m] = startDate.split('-').map(Number);
  const month = m || 0;
  const clampedStart = month >= 5 ? startDate : `${y}-05-01`;
  return { startDate: clampedStart, endDate };
}

// Optional site filter: ?siteIds=6,7,9 (dept numbers). Returns [] for "all sites", or array of integers.
function parseSiteIds(req) {
  const raw = req.query.siteIds;
  if (raw == null || raw === '') return [];
  const parts = String(raw).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && Number.isInteger(n));
  return parts;
}

// Given baseParams (e.g. [startDate, endDate]) and optional siteIds, returns { deptClause, params }.
// When siteIds is empty, deptClause is '' and params = baseParams. Otherwise adds AND dept_number IN ($n,...).
function buildDeptFilter(baseParams, siteIds) {
  if (!siteIds || siteIds.length === 0) return { deptClause: '', params: baseParams };
  const start = baseParams.length + 1;
  const placeholders = siteIds.map((_, i) => `$${start + i}`).join(',');
  return { deptClause: ` AND dept_number IN (${placeholders})`, params: [...baseParams, ...siteIds] };
}

// Single source: 14 Fuel Profit N/Cs — use raw DB amounts (no sign flip). Total = sum of line items = same as Excel.
const FUEL_PROFIT_14_IN_SQL = "TRIM(nominal_code::text) IN ('" + FUEL_PROFIT_NOMINAL_CODES.join("','") + "')";
async function getFuelProfit14Sums(startDate, endDate, siteIds = []) {
  const baseParams = [startDate, endDate];
  const { deptClause, params } = buildDeptFilter(baseParams, siteIds);
  const rows = await query(`
    SELECT TRIM(nominal_code::text) AS nc, COALESCE(SUM(amount),0) AS total
    FROM ${TRANSACTIONS_TABLE}
    WHERE ${FUEL_PROFIT_14_IN_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
    GROUP BY TRIM(nominal_code::text)
  `, params);
  const rawByCode = {};
  rows.rows.forEach((row) => {
    const code = String(row.nc ?? '').trim();
    if (!code) return;
    rawByCode[code] = parseFloat(row.total || 0);
  });
  // 5200 (Stock Movement): dedicated query so we always have a value; uses same table (and schema) as above
  const code5200Row = await query(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) = '5200'
       AND transaction_date >= $1::date
       AND transaction_date <= $2::date${deptClause}`,
    params
  );
  const p = code5200Row.rows[0];
  const total5200 = parseFloat(p?.total || 0);
  const cnt5200 = parseInt(p?.cnt || 0, 10);
  rawByCode['5200'] = total5200;
  // Always log 5200 so we can see why it might show £0 in UI (wrong schema or no rows in date range)
  console.log('[5200] period', startDate, 'to', endDate, '| Rows:', cnt5200, '| Sum(amount):', total5200, TRANSACTIONS_SCHEMA ? `| table: ${TRANSACTIONS_TABLE}` : '');
  // Use raw amounts only (no ABS, no sign flip) so total matches Excel and breakdown shows real signs
  const breakdown = FUEL_PROFIT_NOMINAL_CODES.map((code) => {
    const raw = rawByCode[String(code)] ?? 0;
    return { code, name: FUEL_PROFIT_NC_NAMES[code] || code, amount: raw };
  });
  const totalProfit = breakdown.reduce((s, x) => s + (x.amount || 0), 0);
  const totalRevenue = breakdown.filter((x) => FUEL_PROFIT_SALES_CODES.includes(x.code)).reduce((s, x) => s + (x.amount || 0), 0);
  const totalCost = breakdown.filter((x) => FUEL_PROFIT_COST_CODES.includes(x.code)).reduce((s, x) => s + (x.amount || 0), 0);
  return { byCode: rawByCode, breakdown, totalRevenue, totalCost, totalProfit };
}

// GET /petrol-data/fuel-volume - No volume in transactions; use 0 or estimate from purchases
router.get('/fuel-volume', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const { startDate, endDate } = range;
    // No volume column - return 0 (fuel sales 4000s also missing)
    res.json({ success: true, data: { totalFuelVolume: 0 } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/fuel-grade-breakdown - Fuel sales by nominal. Use positive amounts so Fuel Grade Mix shows revenue and % mix correctly (DB may store as negative).
router.get('/fuel-grade-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT nominal_code, COALESCE(SUM(amount),0) as total_amt, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${FUEL_SALES_SQL}
        AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    const breakdown = r.rows.map(row => {
      const amt = parseFloat(row.total_amt||0);
      const volume = Math.abs(amt);
      return { code: row.nominal_code, name: FUEL_CATEGORY_NAMES[row.nominal_code]||row.nominal_code, volume, transactionCount: parseInt(row.txn_count||0) };
    });
    const totalVolume = breakdown.reduce((s,x)=>s+x.volume,0);
    res.json({ success: true, data: { breakdown, totalVolume, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Parse details column: segments separated by | or ; or newline; each segment is "label/volume" (volume in L after /).
// Example: "Sax-Keyfuel-Nov'25-17.11.25-23.11.25/5712.23 | Saxon Autopoint-Diesel Sales-Nov'25/162038.38" → volume 5712.23, 162038.38.
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

// Total fuel volume (L) from transaction details column for date range. Used for Average PPL = (Fuel profit / Fuel volume) × 100.
async function getTotalFuelVolumeFromDetails(startDate, endDate, siteIds = []) {
  try {
    const { deptClause, params } = buildDeptFilter([startDate, endDate], siteIds);
    const r = await query(`
      SELECT details FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('4000','4001','4002','4003','4008')
        AND transaction_date >= $1::date AND transaction_date <= $2::date
        AND details IS NOT NULL AND TRIM(details::text) <> ''${deptClause}
    `, params);
    let total = 0;
    for (const row of r.rows || []) {
      const segments = parseDetailsToVolumeSegments(row.details);
      for (const { volume } of segments) total += volume;
    }
    return total;
  } catch (e) {
    return 0;
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
      SELECT dept_number, COALESCE(SUM(amount),0) as total_amt
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('4000','4001','4002','4003','4008')
        AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
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
    res.status(500).json({ success: false, message: e.message });
  }
});

// Infer nominal code (4000-4008) from details label e.g. "Swan-Diesel Sales-Sept'25" → 4001, "Canklow-Unleaded Sales-Nov'25" → 4000.
function inferNominalCodeFromLabel(label) {
  if (!label || typeof label !== 'string') return '4000';
  const L = label.toLowerCase();
  if (L.includes('adblue') || L.includes('ad blue')) return '4008';
  if (L.includes('ultimate diesel')) return '4003';
  if (L.includes('ultimate unleaded') || L.includes('ultimate petrol')) return '4002';
  if (L.includes('diesel')) return '4001';
  if (L.includes('unleaded') || L.includes('petrol')) return '4000';
  return '4000';
}

// GET /petrol-data/fuel-volume-transition-breakdown - Volume (litres) from transaction details. Use each row's nominal_code for accuracy (4000/4001/4002/4003/4008), not label inference.
router.get('/fuel-volume-transition-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    let rows = [];
    try {
      const r = await query(`
        SELECT id, nominal_code, dept_number, details
        FROM ${TRANSACTIONS_TABLE}
        WHERE nominal_code IN ('4000','4001','4002','4003','4008')
          AND transaction_date >= $1::date AND transaction_date <= $2::date
          AND details IS NOT NULL AND TRIM(details::text) <> ''${deptClause}
        ORDER BY id
      `, params);
      rows = r.rows || [];
    } catch (dbErr) {
      return res.json({ success: true, data: { breakdown: [], byNominalCode: [], totalVolume: 0, ...range } });
    }
    const bySite = {};
    const byCode = { '4000': 0, '4001': 0, '4002': 0, '4003': 0, '4008': 0 };
    for (const row of rows) {
      const rowCode = String(row.nominal_code || '').trim();
      const dept = row.dept_number != null ? parseInt(Number(row.dept_number), 10) : null;
      const siteName = (dept != null && DEPT_TO_SITE_NAME[dept]) ? DEPT_TO_SITE_NAME[dept] : null;
      const segments = parseDetailsToVolumeSegments(row.details);
      for (const { volume } of segments) {
        if (siteName) {
          if (!bySite[siteName]) bySite[siteName] = 0;
          bySite[siteName] += volume;
        }
        if (byCode[rowCode] !== undefined) byCode[rowCode] += volume;
        else if (rowCode) byCode['4000'] += volume;
      }
    }
    // Only the 29 canonical sites in breakdown; combine all data per site
    const breakdown = CANONICAL_SITE_NAMES
      .map(site => ({ label: site, site, volume: bySite[site] || 0 }))
      .sort((a, b) => Math.abs(b.volume) - Math.abs(a.volume));
    const byNominalCode = ['4000', '4001', '4002', '4003', '4008'].map(code => ({
      code,
      name: FUEL_CATEGORY_NAMES[code] || code,
      volume: byCode[code] || 0
    }));
    const totalVolume = Object.values(byCode).reduce((s, v) => s + v, 0);
    res.json({ success: true, data: { breakdown, byNominalCode, totalVolume, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/net-sales - Total Site Revenue and fuel site revenue. Use positive magnitudes so Labour Cost % and other metrics use positive sales.
router.get('/net-sales', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const fuel = await query(`SELECT COALESCE(SUM(amount),0) as total FROM ${TRANSACTIONS_TABLE} WHERE nominal_code IN ('4000','4001','4002','4003','4008') AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}`, params);
    const rev = await query(`SELECT COALESCE(SUM(amount),0) as total FROM ${TRANSACTIONS_TABLE} WHERE ${SITE_REVENUE_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}`, params);
    const fuelSales = Math.abs(parseFloat(fuel.rows[0]?.total || 0));
    const totalRevenue = Math.abs(parseFloat(rev.rows[0]?.total || 0));
    res.json({ success: true, data: { totalNetSales: totalRevenue, totalRevenue, fuelSales, startDate: range.startDate, endDate: range.endDate } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/net-sales-breakdown - By Revenue N/Cs
router.get('/net-sales-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT nominal_code, COALESCE(SUM(amount),0) as total, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${REVENUE_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    const names = { ...FUEL_CATEGORY_NAMES, '4011':'Fuel Other','4400':'Shop','4901':'ATM Machine income','4904':'Rent income','4907':'Sundry income','6101':'Daily Facility Fees','6102':'Valeting' };
    const breakdown = r.rows.map(row => ({ code: row.nominal_code, name: names[row.nominal_code]||row.nominal_code, netSales: parseFloat(row.total||0), value: parseFloat(row.total||0), transactionCount: parseInt(row.txn_count||0) }));
    res.json({ success: true, data: { breakdown, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/profit - Total Profit = sum of all 14 N/Cs only. Nothing else.
router.get('/profit', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { totalRevenue, totalCost, totalProfit } = await getFuelProfit14Sums(range.startDate, range.endDate, siteIds);
    res.json({ success: true, data: { totalProfit, totalRevenue, totalCost, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/profit-breakdown - Breakdown by 14 N/Cs; Total Profit = sum of all 14. Nothing else.
router.get('/profit-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { breakdown, totalRevenue, totalCost, totalProfit } = await getFuelProfit14Sums(range.startDate, range.endDate, siteIds);
    const totalPositives = breakdown.filter((x) => (x.amount || 0) > 0).reduce((s, x) => s + x.amount, 0);
    const totalNegatives = breakdown.filter((x) => (x.amount || 0) < 0).reduce((s, x) => s + x.amount, 0);
    res.json({ success: true, data: { fuelSalesBreakdown: [], otherIncomeBreakdown: breakdown, totalProfit, totalPositives, totalNegatives, totalRevenue, totalCost, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/avg-ppl - Use flipped fuel profit (converted) for PPL: (Flipped fuel profit / Fuel volume) × 100. Flipped = -raw sum of 14 N/Cs.
router.get('/avg-ppl', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { totalRevenue, totalCost, totalProfit } = await getFuelProfit14Sums(range.startDate, range.endDate, siteIds);
    const fuelProfitRaw = totalProfit;
    const fuelProfitFlipped = -fuelProfitRaw; // converted: same sign as breakdown modal
    const fuelSales = totalRevenue;
    const fuelVolume = await getTotalFuelVolumeFromDetails(range.startDate, range.endDate, siteIds);
    const avgPPL = fuelVolume > 0
      ? (fuelProfitFlipped / fuelVolume) * 100
      : (fuelSales !== 0 ? (fuelProfitFlipped / fuelSales) * 100 : 0);
    res.json({ success: true, data: { avgPPL, fuelProfit: fuelProfitRaw, fuelVolume, fuelSales, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/actual-ppl - Use flipped fuel profit (converted) for PPL. PPL after OH = (Flipped fuel profit − |Overheads|) / (Volume or Sales) × 100. Overhead per unit = (|Overheads| ÷ Volume or Sales) × 100.
router.get('/actual-ppl', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const OH_NC = ['7103','7100','7200','7801','7905'];
    const [overheadsRes, fuelSalesRes, revenueRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount),0) as total FROM ${TRANSACTIONS_TABLE} WHERE nominal_code IN ('${OH_NC.join("','")}') AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}`, params),
      query(`SELECT COALESCE(SUM(amount),0) as total FROM ${TRANSACTIONS_TABLE} WHERE nominal_code IN ('4000','4001','4002','4003','4008') AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}`, params),
      query(`SELECT COALESCE(SUM(amount),0) as total FROM ${TRANSACTIONS_TABLE} WHERE ${REVENUE_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}`, params)
    ]);
    const totalOverheads = parseFloat(overheadsRes.rows[0]?.total||0);
    const fuelSales = parseFloat(fuelSalesRes.rows[0]?.total||0);
    const totalRevenue = parseFloat(revenueRes.rows[0]?.total||0);
    const fuelVolume = await getTotalFuelVolumeFromDetails(range.startDate, range.endDate, siteIds);
    const denominator = fuelVolume > 0 ? fuelVolume : (fuelSales > 0 ? fuelSales : (totalRevenue > 0 ? totalRevenue : 0));
    const overheadPerUnitPence = denominator > 0 ? (Math.abs(totalOverheads) / denominator) * 100 : 0;
    const { totalProfit: fuelProfitRaw } = await getFuelProfit14Sums(range.startDate, range.endDate, siteIds); // 14 fuel profit N/C
    const fuelProfitFlipped = -fuelProfitRaw; // converted: same as breakdown modal
    const pplAfterOverheads = denominator > 0 ? ((fuelProfitFlipped - Math.abs(totalOverheads)) / denominator) * 100 : 0; // (Flipped fuel profit − |OH|) / (Vol or Sales) × 100
    res.json({ success: true, data: { actualPPL: overheadPerUnitPence, totalOverheads, pplAfterOverheads, fuelSales, totalRevenue, fuelVolume, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/actual-ppl-breakdown - PRL Overheads N/C: 7103,7100,7200,7801,7905
router.get('/actual-ppl-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT nominal_code, COALESCE(SUM(amount),0) as amount, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('7103','7100','7200','7801','7905') AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    const names = { '7103':'Rates','7100':'Rent','7200':'Electricity','7801':'Repair & Maintenance','7905':'Credit Charges' };
    const breakdown = r.rows.map(row => ({ category: names[row.nominal_code]||row.nominal_code, code: row.nominal_code, amount: parseFloat(row.amount||0), transactionCount: parseInt(row.txn_count||0) }));
    const totalOverheads = breakdown.reduce((s,x)=>s+x.amount,0);
    res.json({ success: true, data: { breakdown, totalOverheads, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/labour-cost - Use positive magnitudes for labour cost so display and Labour Cost % are correct.
router.get('/labour-cost', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN nominal_code = '7000' THEN amount ELSE 0 END),0) as gross_wages,
        COALESCE(SUM(CASE WHEN nominal_code = '7006' THEN amount ELSE 0 END),0) as employers_ni,
        COALESCE(SUM(CASE WHEN nominal_code = '7007' THEN amount ELSE 0 END),0) as staff_pensions
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('7000','7006','7007')
        AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
    `, params);
    const row = r.rows[0];
    const grossWages = Math.abs(parseFloat(row?.gross_wages||0));
    const employersNI = Math.abs(parseFloat(row?.employers_ni||0));
    const staffPensions = Math.abs(parseFloat(row?.staff_pensions||0));
    const totalLabourCost = grossWages + employersNI + staffPensions;
    res.json({ success: true, data: { totalLabourCost, grossWages, employersNI, staffPensions, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/labour-cost-breakdown - Use positive magnitudes for amounts.
router.get('/labour-cost-breakdown', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const r = await query(`
      SELECT nominal_code, COALESCE(SUM(amount),0) as amount, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('7000','7006','7007')
        AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    const names = { '7000':'Gross Wages','7006':'Employers N.I.','7007':'Staff Pensions' };
    const breakdown = r.rows.map(row => ({ code: row.nominal_code, name: names[row.nominal_code]||row.nominal_code, amount: Math.abs(parseFloat(row.amount||0)), transactionCount: parseInt(row.txn_count||0) }));
    const totalLabourCost = breakdown.reduce((s,x)=>s+x.amount,0);
    res.json({ success: true, data: { breakdown, totalLabourCost, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
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
      WHERE transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
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
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/roi - ROI = Net Profit / Investment × 100.
// Net Profit = sum of 82 N/Cs from May to Dec (till date). Investment = sum of 15 N/Cs from 2000 up to endDate.
router.get('/roi', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const profitRange = getProfitDateRange(range.startDate, range.endDate);
    const { deptClause: npDeptClause, params: npParams } = buildDeptFilter([profitRange.startDate, profitRange.endDate], siteIds);
    const { deptClause: invDeptClause, params: invParams } = buildDeptFilter(['2000-01-01', range.endDate], siteIds);
    const [netProfitRes, investmentRes] = await Promise.all([
      query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${npDeptClause}`,
        npParams
      ),
      query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM ${TRANSACTIONS_TABLE} WHERE ${INVESTMENT_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${invDeptClause}`,
        invParams
      ),
    ]);
    const netProfit = parseFloat(netProfitRes.rows[0]?.total ?? 0);
    const investment = parseFloat(investmentRes.rows[0]?.total ?? 0);
    // Simple: ROI = (Net Profit / Investment) × 100; negative/positive as-is, no abs
    let roi = investment !== 0 ? (netProfit / investment) * 100 : 0;
    roi = Number.isFinite(roi) ? Math.max(-1000, Math.min(1000, roi)) : 0;
    res.json({
      success: true,
      data: { netProfit, investment, roi, startDate: range.startDate, endDate: range.endDate },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/roi-monthly-trend - ROI and EBITA by month for trend chart.
// Net Profit & EBITA = per-month from May to Dec within selected range. Investment = from 2000 up to endDate (same for every month).
router.get('/roi-monthly-trend', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const profitRange = getProfitDateRange(range.startDate, range.endDate);
    const { deptClause: npDeptClause, params: npParams } = buildDeptFilter([profitRange.startDate, profitRange.endDate], siteIds);
    const { deptClause: invDeptClause, params: invParams } = buildDeptFilter(['2000-01-01', range.endDate], siteIds);
    const { deptClause: ebitaDeptClause, params: ebitaParams } = buildDeptFilter([profitRange.startDate, profitRange.endDate], siteIds);
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [npRes, invRes, ebitaRes] = await Promise.all([
      query(
        `SELECT EXTRACT(YEAR FROM transaction_date)::int AS y, EXTRACT(MONTH FROM transaction_date)::int AS m, COALESCE(SUM(amount),0) AS total
         FROM ${TRANSACTIONS_TABLE} WHERE ${NET_PROFIT_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${npDeptClause}
         GROUP BY y, m ORDER BY y, m`,
        npParams
      ),
      query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM ${TRANSACTIONS_TABLE} WHERE ${INVESTMENT_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${invDeptClause}`,
        invParams
      ),
      query(
        `SELECT EXTRACT(YEAR FROM transaction_date)::int AS y, EXTRACT(MONTH FROM transaction_date)::int AS m, COALESCE(SUM(amount),0) AS total
         FROM ${TRANSACTIONS_TABLE} WHERE ${EBITA_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${ebitaDeptClause}
         GROUP BY y, m ORDER BY y, m`,
        ebitaParams
      ),
    ]);
    const investment = parseFloat(invRes.rows[0]?.total ?? 0);
    const ebitaByMonth = new Map();
    (ebitaRes.rows || []).forEach((r) => {
      const key = `${r.y}-${r.m}`;
      ebitaByMonth.set(key, parseFloat(r.total ?? 0));
    });
    const rows = npRes.rows.map((r) => {
      const netProfit = parseFloat(r.total ?? 0);
      let roi = investment !== 0 ? (netProfit / investment) * 100 : 0;
      roi = Number.isFinite(roi) ? Math.max(-1000, Math.min(1000, roi)) : 0;
      const key = `${r.y}-${r.m}`;
      const ebita = ebitaByMonth.get(key) ?? 0;
      return {
        year: r.y,
        month: r.m,
        month_name: monthNames[r.m] || String(r.m),
        netProfit,
        investment,
        roi,
        ebita,
      };
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/ebita - EBITA = SUM of 69 N/Cs; data from May to Dec only. Raw amounts, do not remove negative sign.
router.get('/ebita', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const profitRange = getProfitDateRange(range.startDate, range.endDate);
    const { deptClause, params } = buildDeptFilter([profitRange.startDate, profitRange.endDate], siteIds);
    const result = await query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM ${TRANSACTIONS_TABLE}
       WHERE ${EBITA_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}`,
      params
    );
    const ebita = parseFloat(result.rows[0]?.total ?? 0);
    res.json({ success: true, data: { ebita, startDate: profitRange.startDate, endDate: profitRange.endDate } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/avg-sale-per-site - Revenue per site
router.get('/avg-sale-per-site', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const sites = await query(`SELECT COUNT(DISTINCT dept_number) as cnt FROM ${TRANSACTIONS_TABLE} WHERE transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}`, params);
    const rev = await query(`SELECT COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${REVENUE_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}`, params);
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
      SELECT COALESCE(SUM(amount),0) as total
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('5000','5001','5003','5004','5007','5012','5014')
        AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
    `, params);
    const totalPurchases = parseFloat(r.rows[0]?.total||0);
    res.json({ success: true, data: { totalPurchases, ...range } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
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
      SELECT nominal_code, COALESCE(SUM(amount),0) as amount, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('5000','5001','5003','5004','5007','5012','5014')
        AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
      GROUP BY nominal_code ORDER BY nominal_code
    `, params);
    const purchaseNames = { '5000':'Unleaded','5001':'Diesel','5003':'Ultimate Unleaded','5004':'Ultimate Diesel','5007':'Diesel','5012':'Diesel','5014':'Adblue' };
    const breakdown = r.rows.map(row => ({ code: row.nominal_code, name: purchaseNames[row.nominal_code]||row.nominal_code, amount: parseFloat(row.amount||0), transactionCount: parseInt(row.txn_count||0) }));
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
      SELECT COALESCE(SUM(amount),0) as total
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('1200','1223','1224') AND transaction_date <= $1::date${deptClause}
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
      SELECT nominal_code, COALESCE(SUM(amount),0) as amount, COUNT(*) as txn_count
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IN ('1200','1223','1224') AND transaction_date <= $1::date${deptClause}
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
      SELECT COALESCE(SUM(amount),0) as total FROM ${TRANSACTIONS_TABLE}
      WHERE ${REVENUE_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
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
    const r = await query(`
      SELECT
        EXTRACT(YEAR FROM transaction_date)::int as year,
        EXTRACT(MONTH FROM transaction_date)::int as month,
        COALESCE(SUM(CASE WHEN nominal_code IN ('7000','7006','7007') THEN amount ELSE 0 END), 0) as labour,
        COALESCE(SUM(CASE WHEN nominal_code = '7200' THEN amount ELSE 0 END), 0) as utilities,
        COALESCE(SUM(CASE WHEN nominal_code::integer >= 7300 AND nominal_code::integer < 7400 THEN amount ELSE 0 END), 0) as maintenance,
        COALESCE(SUM(CASE WHEN nominal_code = '7100' THEN amount ELSE 0 END), 0) as rent,
        COALESCE(SUM(CASE WHEN nominal_code = '7103' THEN amount ELSE 0 END), 0) as general_rates,
        COALESCE(SUM(CASE WHEN nominal_code = '7905' THEN amount ELSE 0 END), 0) as credit_charges,
        COALESCE(SUM(CASE WHEN nominal_code::integer >= 7000 AND nominal_code::integer < 8000 THEN amount ELSE 0 END), 0) as total
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code::integer >= 7000 AND nominal_code::integer < 8000
        AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
      GROUP BY year, month ORDER BY year, month
    `, params);
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const rows = r.rows.map(row => ({
      month: `${monthNames[Number(row.month)] || row.month} ${row.year}`,
      labour: parseFloat(row.labour || 0),
      utilities: parseFloat(row.utilities || 0),
      maintenance: parseFloat(row.maintenance || 0),
      rent: parseFloat(row.rent || 0),
      generalRates: parseFloat(row.general_rates || 0),
      creditCharges: parseFloat(row.credit_charges || 0),
      total: parseFloat(row.total || 0),
    }));
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/monthly-trends - Sales = Fuel sales only. Volume from details. Profit = raw 14 N/Cs. avgPPL/pplAfterOverheads = same formula as card (flipped fuel profit).
router.get('/monthly-trends', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const [fuelSalesRes, costRes, labourRes, detailsRes, profit14Res, overheadsRes] = await Promise.all([
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause} GROUP BY y, m ORDER BY y, m`, params),
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${COST_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause} GROUP BY y, m ORDER BY y, m`, params),
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${LABOUR_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause} GROUP BY y, m ORDER BY y, m`, params),
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, details FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date AND details IS NOT NULL AND TRIM(details::text) <> ''${deptClause}`, params),
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_PROFIT_14_IN_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause} GROUP BY y, m ORDER BY y, m`, params),
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${OVERHEADS_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause} GROUP BY y, m ORDER BY y, m`, params)
    ]);
    const fuelSalesMap = new Map(fuelSalesRes.rows.map(x => [`${x.y}-${x.m}`, parseFloat(x.t||0)]));
    const costMap = new Map(costRes.rows.map(x => [`${x.y}-${x.m}`, parseFloat(x.t||0)]));
    const labourMap = new Map(labourRes.rows.map(x => [`${x.y}-${x.m}`, parseFloat(x.t||0)]));
    const profit14Map = new Map((profit14Res.rows || []).map(x => [`${x.y}-${x.m}`, parseFloat(x.t||0)]));
    const overheadsMap = new Map((overheadsRes.rows || []).map(x => [`${x.y}-${x.m}`, parseFloat(x.t||0)]));
    const volumeMap = new Map();
    for (const row of detailsRes.rows || []) {
      const key = `${row.y}-${row.m}`;
      const segments = parseDetailsToVolumeSegments(row.details);
      const add = segments.reduce((s, seg) => s + (seg.volume || 0), 0);
      volumeMap.set(key, (volumeMap.get(key) || 0) + add);
    }
    const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const allKeys = new Set([...fuelSalesMap.keys(), ...costMap.keys(), ...volumeMap.keys(), ...profit14Map.keys(), ...overheadsMap.keys()]);
    const sortedKeys = [...allKeys].sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return y1 !== y2 ? y1 - y2 : m1 - m2;
    });
    const rows = sortedKeys.map(key => {
      const [y, m] = key.split('-').map(Number);
      const sales = Math.abs(fuelSalesMap.get(key) || 0);
      const totalCost = Math.abs(costMap.get(key) || 0);
      const labour = labourMap.get(key) || 0;
      const volume = volumeMap.get(key) || 0;
      const profit = profit14Map.get(key) ?? 0;
      const fuelProfitFlipped = -profit;
      const totalOverheads = Math.abs(overheadsMap.get(key) || 0);
      const denominator = volume > 0 ? volume : (sales > 0 ? sales : 0);
      const avgPPL = denominator > 0 ? (fuelProfitFlipped / denominator) * 100 : null;
      const pplAfterOverheads = denominator > 0 ? ((fuelProfitFlipped - totalOverheads) / denominator) * 100 : null;
      return {
        year: y, month: m,
        month_name: monthNames[m] || String(m),
        sales, net_sales: sales, volume, sale_volume: volume,
        profit, fuel_profit: profit,
        purchases: totalCost, labour,
        avgPPL: avgPPL ?? undefined,
        pplAfterOH: pplAfterOverheads ?? undefined,
      };
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
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
      SELECT transaction_date::date as date, COALESCE(SUM(amount),0) as sales
      FROM ${TRANSACTIONS_TABLE}
      WHERE ${REVENUE_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
      GROUP BY transaction_date::date ORDER BY date
    `, params);
    const dailyData = r.rows.map(row => ({ date: row.date, sales: parseFloat(row.sales||0), volume: 0 }));
    res.json({ success: true, data: dailyData });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /petrol-data/ppl-comparison - monthly Avg PPL and OH Deduction. Same formulas as card (avg-ppl + actual-ppl): 14-code profit and overheads ÷ (volume or fuel sales).
router.get('/ppl-comparison', async (req, res) => {
  try {
    const range = validateDateRange(req, res);
    if (!range) return;
    const siteIds = parseSiteIds(req);
    const { deptClause, params } = buildDeptFilter([range.startDate, range.endDate], siteIds);
    const [fuelSalesRes, detailsRes, profit14Res, overheadsRes] = await Promise.all([
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause} GROUP BY y, m ORDER BY y, m`, params),
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, details FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_SALES_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date AND details IS NOT NULL AND TRIM(details::text) <> ''${deptClause}`, params),
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${FUEL_PROFIT_14_IN_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause} GROUP BY y, m ORDER BY y, m`, params),
      query(`SELECT EXTRACT(YEAR FROM transaction_date)::int as y, EXTRACT(MONTH FROM transaction_date)::int as m, COALESCE(SUM(amount),0) as t FROM ${TRANSACTIONS_TABLE} WHERE ${OVERHEADS_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date${deptClause} GROUP BY y, m ORDER BY y, m`, params)
    ]);
    const fuelSalesMap = new Map(fuelSalesRes.rows.map(x => [`${x.y}-${x.m}`, parseFloat(x.t || 0)]));
    const profit14Map = new Map((profit14Res.rows || []).map(x => [`${x.y}-${x.m}`, parseFloat(x.t || 0)]));
    const overheadsMap = new Map((overheadsRes.rows || []).map(x => [`${x.y}-${x.m}`, parseFloat(x.t || 0)]));
    const volumeMap = new Map();
    for (const row of detailsRes.rows || []) {
      const key = `${row.y}-${row.m}`;
      const segments = parseDetailsToVolumeSegments(row.details);
      const add = segments.reduce((s, seg) => s + (seg.volume || 0), 0);
      volumeMap.set(key, (volumeMap.get(key) || 0) + add);
    }
    const allKeys = new Set([...fuelSalesMap.keys(), ...volumeMap.keys(), ...profit14Map.keys(), ...overheadsMap.keys()]);
    const sortedKeys = [...allKeys].sort((a, b) => {
      const [y1, m1] = a.split('-').map(Number);
      const [y2, m2] = b.split('-').map(Number);
      return y1 !== y2 ? y1 - y2 : m1 - m2;
    });
    const rows = sortedKeys.map(key => {
      const [y, m] = key.split('-').map(Number);
      const sales = Math.abs(fuelSalesMap.get(key) || 0);
      const volume = volumeMap.get(key) || 0;
      const profit = profit14Map.get(key) ?? 0;
      const fuelProfitFlipped = -profit;
      const totalOverheads = Math.abs(overheadsMap.get(key) || 0);
      const denominator = volume > 0 ? volume : (sales > 0 ? sales : 0);
      const avgPPL = denominator > 0 ? (fuelProfitFlipped / denominator) * 100 : 0;
      const actualPPL = denominator > 0 ? (totalOverheads / denominator) * 100 : 0;
      return { year: y, month: m, avgPPL, actualPPL, overheads: totalOverheads };
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
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
        COALESCE(SUM(CASE WHEN ${REVENUE_SQL} THEN amount ELSE 0 END),0) as rev,
        COALESCE(SUM(CASE WHEN ${COST_SQL} THEN amount ELSE 0 END),0) as cost
      FROM ${TRANSACTIONS_TABLE}
      WHERE transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
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
          amount
        FROM ${TRANSACTIONS_TABLE}
        WHERE transaction_date >= $1::date AND transaction_date <= $2::date${deptClause}
          AND TRIM(COALESCE(dept_number::text, '')) ~ '^[0-9]+$'
          AND (NULLIF(TRIM(dept_number::text), '')::int) NOT IN (0, 1)
      )
      SELECT
        site_code,
        COALESCE(SUM(amount), 0) AS raw_profit,
        COALESCE(SUM(CASE WHEN nc IN ('4000','4001','4002','4003','4008') THEN ABS(amount) ELSE 0 END), 0) AS fuel_sales,
        COALESCE(SUM(CASE WHEN nc IN ('5000','5001','5003','5004','5014') THEN ABS(amount) ELSE 0 END), 0) AS fuel_purchases,
        COALESCE(SUM(CASE WHEN nc IN (${FUEL_PROFIT_SALES_CODES.map(c => `'${c}'`).join(',')}) THEN ABS(amount) ELSE 0 END), 0) AS net_sales
      FROM dept_parsed
      WHERE nc IN (${FUEL_PROFIT_NOMINAL_CODES.map(c => `'${c}'`).join(',')})
        AND site_code >= 6 AND site_code <= 45
      GROUP BY site_code
    `, params);
    const all = (r.rows || []).map(row => {
      const siteCode = Number(row.site_code);
      const siteName = DEPT_TO_SITE_NAME[siteCode] || ('Dept ' + siteCode);
      const netSales = parseFloat(row.net_sales || 0);
      const profit = -(parseFloat(row.raw_profit || 0));
      const fuelSales = parseFloat(row.fuel_sales || 0);
      const fuelPurchases = parseFloat(row.fuel_purchases || 0);
      const fuelProfit = fuelSales - fuelPurchases;
      const fuelMarginFromFuel = fuelSales > 0 ? (fuelProfit / fuelSales) * 100 : null;
      const fuelMarginFromNet = netSales > 0 ? (profit / netSales) * 100 : null;
      // Use fuel-based margin only when it is meaningfully positive (> 0.05%); otherwise use profit % of net sales.
      // This avoids showing 0.0% when fuel sales are tiny and fuel margin rounds to zero (e.g. Bunkering-heavy sites like Lanner Moor).
      let fuel_margin_pct = (fuelMarginFromFuel != null && Number.isFinite(fuelMarginFromFuel) && fuelMarginFromFuel > 0.05)
        ? fuelMarginFromFuel
        : fuelMarginFromNet;
      if (fuel_margin_pct != null && !Number.isFinite(fuel_margin_pct)) fuel_margin_pct = null;
      const margin = netSales > 0 ? (profit / netSales) * 100 : 0;
      return {
        site_code: siteCode,
        site_name: siteName,
        name: siteName,
        net_sales: netSales,
        fuel_profit: profit,
        margin,
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
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
