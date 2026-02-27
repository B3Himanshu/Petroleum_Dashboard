/**
 * Export May–Dec volume by categories to Excel. Volume is taken only from details segments
 * whose label indicates a month in May–Dec (e.g. May'25, July'25, 04.05.25). Nominal codes 4000–4008.
 * Run from backend: node test/dec-volume-by-categories-excel.js  (or: npm run dec-volume-by-categories-excel)
 * Env: EXPORT_YEAR=2025 (default). Default range: 2025-05-01 to 2025-12-31. Or EXPORT_START + EXPORT_END.
 * Output: backend/exports/volume-by-categories-YYYY-MM-DD-to-YYYY-MM-DD.xlsx
 */
import { query } from '../config/database.js';
import XLSX from 'xlsx';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, '..', 'exports');

const FUEL_CATEGORY_NAMES = { '4000': 'Petrol', '4001': 'Diesel', '4002': 'Ultimate Petrol', '4003': 'Ultimate Diesel', '4008': 'Adblue' };
const CODES = ['4000', '4001', '4002', '4003', '4008'];

const TRANSACTIONS_SCHEMA = process.env.TRANSACTIONS_SCHEMA || process.env.DB_TRANSACTIONS_SCHEMA || '';
const TRANSACTIONS_TABLE = (TRANSACTIONS_SCHEMA && /^[a-zA-Z0-9_]+$/.test(TRANSACTIONS_SCHEMA))
  ? `"${TRANSACTIONS_SCHEMA}".transactions`
  : 'transactions';

// 29 sites (same as petrolDataSage)
const DEPT_TO_SITE_NAME = {
  6: 'Manor Service Station', 7: 'Hen And Chicken SS', 9: 'Salterton Road SS', 10: 'Lanner Moor Garage',
  11: 'Luton Road SS', 14: 'Kings Lane SS', 17: 'Delph SS', 18: 'Saxon Autopoint SS', 19: 'Jubits Lane SS',
  20: 'Worsley Brow', 23: 'Auto Pitstop', 24: 'Crown SS', 25: 'Marsland SS', 29: 'Gemini SS', 30: 'Park View',
  31: 'Filleybrook SS', 33: 'Swan Connect', 34: 'Portland', 35: 'Lower Lane', 36: 'Vale SS', 37: 'Kensington SS',
  38: 'County Oak SS', 39: 'Kings Of Sedgley', 40: 'Gnosall SS', 41: 'Minsterley SS', 42: 'Nelson SS',
  43: 'Yeovil SS', 44: 'Canklow SS', 45: 'Stanton Self Service',
};
const CANONICAL_SITE_NAMES = Object.values(DEPT_TO_SITE_NAME);
const LABEL_PREFIX_TO_CANONICAL_SITE = {};
CANONICAL_SITE_NAMES.forEach((n) => { LABEL_PREFIX_TO_CANONICAL_SITE[n] = n; });
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
PREFIX_ALIASES.forEach(([prefix, canonical]) => {
  if (!LABEL_PREFIX_TO_CANONICAL_SITE[prefix]) LABEL_PREFIX_TO_CANONICAL_SITE[prefix] = canonical;
});
const DASH_LIKE = /[\u2013\u2014\u2212-]/;
function getSitePrefixFromLabel(label) {
  if (!label || typeof label !== 'string') return '';
  const s = label.trim();
  const idx = s.search(DASH_LIKE);
  return idx !== -1 ? s.slice(0, idx).trim() : s;
}
function normalizeToCanonicalSite(labelPrefix) {
  if (!labelPrefix || typeof labelPrefix !== 'string') return null;
  let t = labelPrefix.trim().replace(/\s*&\s*/g, ' And ');
  if (LABEL_PREFIX_TO_CANONICAL_SITE[t]) return LABEL_PREFIX_TO_CANONICAL_SITE[t];
  const lower = t.toLowerCase();
  for (const [prefix, canonicalName] of PREFIX_ALIASES) {
    if (lower === prefix.toLowerCase()) return canonicalName;
  }
  return CANONICAL_SITE_NAMES.find((n) => n.toLowerCase() === lower) || null;
}

function getDateRange() {
  if (process.env.EXPORT_START && process.env.EXPORT_END) {
    return { start: process.env.EXPORT_START, end: process.env.EXPORT_END };
  }
  const year = parseInt(process.env.EXPORT_YEAR || '2025', 10);
  // Default: May 1 to Dec 31
  return { start: `${year}-05-01`, end: `${year}-12-31` };
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** Parse label for month/year (e.g. May'25, July'25, 04.05.25). Returns { month: 1-12, year } or null. */
function parseMonthYearFromLabel(label) {
  if (!label || typeof label !== 'string') return null;
  const s = label.trim();
  // Month'YY or Month YY (e.g. May'25, July'25, for May'25)
  const monthNameMatch = s.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|July|Aug|Sep|Oct|Nov|Dec)[\s']*(\d{2})\b/i);
  if (monthNameMatch) {
    const name = monthNameMatch[0].replace(/[\s']*\d{2}.*$/, '').trim().toLowerCase();
    const yy = parseInt(monthNameMatch[1], 10);
    const year = yy < 100 ? 2000 + yy : yy;
    let month = MONTH_NAMES.indexOf(name.slice(0, 3));
    if (month === -1 && name.slice(0, 4) === 'july') month = 6;
    if (month >= 0) return { month: month + 1, year };
  }
  // DD.MM.YY (e.g. 04.05.25 = 4 May 2025)
  const dmy = s.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2})\b/);
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const m = parseInt(dmy[2], 10);
    const yy = parseInt(dmy[3], 10);
    if (m >= 1 && m <= 12) {
      const year = yy < 100 ? 2000 + yy : yy;
      return { month: m, year };
    }
  }
  return null;
}

/** Segments with label and volume; optional filter by May–Dec of exportYear. */
function parseDetailsToVolumeSegments(details, exportYear = null, mayToDecOnly = false) {
  const out = [];
  if (details == null || details === '') return out;
  const s = String(details).trim();
  if (!s || !s.includes('/')) return out;
  const segments = s.split(/\s*[\|;\n\r]+\s*/);
  for (const seg of segments) {
    const trimmed = seg.trim();
    const lastSlash = trimmed.lastIndexOf('/');
    if (lastSlash === -1) continue;
    const label = trimmed.slice(0, lastSlash).trim();
    const afterSlash = trimmed.slice(lastSlash + 1).trim();
    const num = parseFloat(afterSlash.replace(/,/g, ''));
    if (typeof num !== 'number' || Number.isNaN(num)) continue;
    if (mayToDecOnly && exportYear != null) {
      const parsed = parseMonthYearFromLabel(label);
      if (!parsed || parsed.year !== exportYear || parsed.month < 5 || parsed.month > 12) continue;
    }
    out.push({ label: label || 'Unknown', volume: num });
  }
  return out;
}

export async function runExport() {
  const { start, end } = getDateRange();
  const exportYear = parseInt(start.slice(0, 4), 10);
  if (!existsSync(EXPORTS_DIR)) {
    mkdirSync(EXPORTS_DIR, { recursive: true });
  }

  console.log('Fetching transactions for', start, 'to', end, '(volume from details segments May–Dec only)...');
  const fullTx = await query(`
    SELECT id, nominal_code, dept_number, transaction_date, amount, details
    FROM ${TRANSACTIONS_TABLE}
    WHERE nominal_code IN ('4000','4001','4002','4003','4008')
      AND transaction_date >= $1::date AND transaction_date <= $2::date
    ORDER BY id
  `, [start, end]);

  const byCode = { '4000': 0, '4001': 0, '4002': 0, '4003': 0, '4008': 0 };
  const bySite = {};
  const rowsWithDetails = (fullTx.rows || []).filter((r) => r.details != null && String(r.details).trim() !== '');

  for (const row of rowsWithDetails) {
    const rowCode = String(row.nominal_code || '').trim();
    const segments = parseDetailsToVolumeSegments(row.details, exportYear, true);
    for (const { label, volume } of segments) {
      const labelPrefix = getSitePrefixFromLabel(label);
      const siteKey = normalizeToCanonicalSite(labelPrefix);
      if (siteKey && CANONICAL_SITE_NAMES.includes(siteKey)) {
        bySite[siteKey] = (bySite[siteKey] || 0) + volume;
      }
      if (byCode[rowCode] !== undefined) byCode[rowCode] += volume;
      else if (rowCode) byCode['4000'] += volume;
    }
  }

  const totalVolume = Object.values(byCode).reduce((s, v) => s + v, 0);
  const categoryRows = CODES.map((code) => {
    const volumeL = byCode[code] || 0;
    return {
      Code: code,
      Name: FUEL_CATEGORY_NAMES[code] || code,
      'Volume (L)': Math.round(volumeL * 100) / 100,
      'Volume (KL)': Math.round((volumeL / 1000) * 100) / 100,
      'Volume (ML)': Math.round((volumeL / 1e6) * 100) / 100,
    };
  });
  categoryRows.push({
    Code: 'Total',
    Name: '',
    'Volume (L)': Math.round(totalVolume * 100) / 100,
    'Volume (KL)': Math.round((totalVolume / 1000) * 100) / 100,
    'Volume (ML)': Math.round((totalVolume / 1e6) * 100) / 100,
  });

  const transactionRows = (fullTx.rows || []).map((row) => ({
    id: row.id,
    nominal_code: row.nominal_code,
    Category: FUEL_CATEGORY_NAMES[String(row.nominal_code || '').trim()] || row.nominal_code,
    dept_number: row.dept_number,
    transaction_date: row.transaction_date,
    amount: row.amount,
    details: row.details != null ? String(row.details) : '',
  }));

  const siteVolumeTotal = Object.values(bySite).reduce((s, v) => s + v, 0);
  const siteRows = CANONICAL_SITE_NAMES.map((site) => {
    const volumeL = bySite[site] || 0;
    return {
      Site: site,
      'Volume (L)': Math.round(volumeL * 100) / 100,
      'Volume (KL)': Math.round((volumeL / 1000) * 100) / 100,
      'Volume (ML)': Math.round((volumeL / 1e6) * 100) / 100,
    };
  });
  siteRows.push({
    Site: 'Total',
    'Volume (L)': Math.round(siteVolumeTotal * 100) / 100,
    'Volume (KL)': Math.round((siteVolumeTotal / 1000) * 100) / 100,
    'Volume (ML)': Math.round((siteVolumeTotal / 1e6) * 100) / 100,
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(categoryRows), 'Volume by categories');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactionRows), 'Transactions');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(siteRows), 'Volume by site');

  const filename = `volume-by-categories-${start}-to-${end}.xlsx`;
  const filepath = join(EXPORTS_DIR, filename);
  XLSX.writeFile(wb, filepath);

  console.log('Volume by categories (May–Dec from details):', categoryRows.slice(0, -1).map((x) => `${x.Code} ${x.Name}: ${x['Volume (ML)']} ML`).join(', '));
  console.log('Total:', totalVolume.toFixed(2), 'L =', (totalVolume / 1e6).toFixed(2), 'ML');
  console.log('Transactions:', fullTx.rows?.length ?? 0, '| Sites:', CANONICAL_SITE_NAMES.length);
  console.log('Written:', filepath);
  return { filepath, rows: categoryRows, start, end };
}

async function main() {
  await runExport();
  process.exit(0);
}

// Run only when executed directly (not when imported by test)
const runAsScript = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('dec-volume-by-categories-excel.js');
if (runAsScript) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
