/**
 * January – Fuel Sales nominal codes 4000, 4001, 4002, 4003, 4004 (wireframe.csv lines 5–9).
 * Run: node export-nov-4001-only.js [YEAR]
 *   e.g. node export-nov-4001-only.js        → January 2026 (default)
 *       node export-nov-4001-only.js 2026   → January 2026 (Windows & Unix)
 *       JAN_YEAR=2026 node export-nov-4001-only.js (Unix only)
 * Output: backend/exports/jan-YYYY-fuel-4000-4004-YYYY-MM-DD-HHmmss.xlsx
 */
import { query } from './config/database.js';
import XLSX from 'xlsx';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, 'exports');

// January year: from first CLI arg, or JAN_YEAR env, or default 2026
const yearArg = process.argv[2] ? parseInt(process.argv[2], 10) : NaN;
const JAN_YEAR = Number.isInteger(yearArg) && yearArg > 2000 && yearArg < 2100
  ? yearArg
  : (process.env.JAN_YEAR ? parseInt(process.env.JAN_YEAR, 10) : 2026);
const JAN_START = `${JAN_YEAR}-01-01`;
const JAN_END = `${JAN_YEAR}-01-31`;

// Fuel Sales: wireframe.csv lines 5–9 — N/C 4000, 4001, 4002, 4003, 4004
const FUEL_SALES_CODES = ['4000', '4001', '4002', '4003', '4004'];
const FUEL_SALES_IN = FUEL_SALES_CODES.map(c => `'${c}'`).join(',');

if (!existsSync(EXPORTS_DIR)) {
  mkdirSync(EXPORTS_DIR, { recursive: true });
}

function parseVolumeFromDetails(details) {
  if (details == null || details === '') return NaN;
  const s = String(details).trim();
  if (!s || !s.includes('/')) return NaN;
  let total = 0;
  const segments = s.split(/\s*[\|;\n\r]+\s*/);
  for (const seg of segments) {
    const lastSlash = seg.lastIndexOf('/');
    if (lastSlash !== -1) {
      const afterSlash = seg.slice(lastSlash + 1).trim();
      const num = parseFloat(afterSlash.replace(/,/g, ''));
      if (typeof num === 'number' && !Number.isNaN(num)) total += num;
    }
  }
  return total;
}

function parseVolumeBreakdown(details) {
  const out = { total: 0, positiveSum: 0, negativeSum: 0 };
  if (details == null || details === '') return out;
  const s = String(details).trim();
  if (!s || !s.includes('/')) return out;
  const segments = s.split(/\s*[\|;\n\r]+\s*/);
  for (const seg of segments) {
    const lastSlash = seg.lastIndexOf('/');
    if (lastSlash !== -1) {
      const afterSlash = seg.slice(lastSlash + 1).trim();
      const num = parseFloat(afterSlash.replace(/,/g, ''));
      if (typeof num === 'number' && !Number.isNaN(num)) {
        out.total += num;
        if (num >= 0) out.positiveSum += num;
        else out.negativeSum += num;
      }
    }
  }
  return out;
}

async function getFuelRows() {
  // HSRL_sage_audit_journal uses sage_date; transactions table uses transaction_date
  const dateColSage = process.env.DB_DATE_COLUMN || 'sage_date';

  // 1) Try HSRL_sage_audit_journal (same as petrol API) – uses sage_date
  try {
    const res = await query(
      `SELECT id, nominal_code, dept_number, ${dateColSage} AS transaction_date, amount, details
       FROM HSRL_sage_audit_journal
       WHERE TRIM(nominal_code::text) IN (${FUEL_SALES_IN})
         AND ${dateColSage} >= $1::date AND ${dateColSage} <= $2::date
       ORDER BY nominal_code, ${dateColSage}, id`,
      [JAN_START, JAN_END]
    );
    if (res.rows && res.rows.length >= 0) return { source: 'HSRL_sage_audit_journal', rows: res.rows || [] };
  } catch (_) {}

  // 2) Try transactions in schema public / sage_data (if you have that table)
  for (const schema of ['public', 'sage_data']) {
    try {
      const res = await query(
        `SELECT id, nominal_code, dept_number, transaction_date, amount, details
         FROM "${schema.replace(/"/g, '""')}"."transactions"
         WHERE nominal_code IN (${FUEL_SALES_IN})
           AND transaction_date >= $1::date AND transaction_date <= $2::date
         ORDER BY nominal_code, transaction_date, id`,
        [JAN_START, JAN_END]
      );
      if (res.rows && res.rows.length > 0) return { source: `${schema}.transactions`, rows: res.rows };
    } catch (_) {}
  }

  // 3) Default transactions table (may not exist – return empty then)
  try {
    const res = await query(
      `SELECT id, nominal_code, dept_number, transaction_date, amount, details
       FROM transactions
       WHERE nominal_code IN (${FUEL_SALES_IN})
         AND transaction_date >= $1::date AND transaction_date <= $2::date
       ORDER BY nominal_code, transaction_date, id`,
      [JAN_START, JAN_END]
    );
    return { source: 'transactions', rows: res.rows || [] };
  } catch (_) {
    return { source: 'none', rows: [] };
  }
}

function timestamp() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'), '-',
    String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0'), String(d.getSeconds()).padStart(2, '0')].join('');
}

async function run() {
  console.log(`Fetching January ${JAN_YEAR} – Fuel Sales N/C ${FUEL_SALES_CODES.join(', ')} (wireframe 4000–4004)...\n`);

  const { source, rows } = await getFuelRows();
  console.log(`Source: ${source}, rows: ${rows.length}`);

  let sumParsed = 0;
  let sumPositive = 0;
  let sumNegative = 0;
  const data = [];
  const rowsWithNegative = [];

  for (const row of rows) {
    const parsed = parseVolumeFromDetails(row.details);
    const b = parseVolumeBreakdown(row.details);
    const isNum = typeof parsed === 'number' && !Number.isNaN(parsed);
    if (isNum) {
      sumParsed += parsed;
      sumPositive += b.positiveSum;
      sumNegative += b.negativeSum;
    }
    if (b.negativeSum !== 0) rowsWithNegative.push({ id: row.id, nominal_code: row.nominal_code, details: row.details, negative_volume: b.negativeSum });

    data.push({
      id: row.id,
      nominal_code: row.nominal_code,
      dept_number: row.dept_number,
      transaction_date: row.transaction_date instanceof Date ? row.transaction_date.toISOString().slice(0, 10) : row.transaction_date,
      amount: row.amount,
      details: row.details == null ? '' : String(row.details),
      parsed_volume: isNum ? parsed : '',
      positive_volume: b.positiveSum || '',
      negative_volume: b.negativeSum !== 0 ? b.negativeSum : '',
    });
  }

  console.log(`Fuel N/C 4000–4004 (Jan ${JAN_YEAR}):`);
  console.log(`  Rows:                      ${rows.length}`);
  console.log(`  Sum parsed (UI) L:         ${sumParsed.toFixed(2)}`);
  console.log(`  Sum positive only L:      ${sumPositive.toFixed(2)}`);
  console.log(`  Sum negative (ignored) L:  ${sumNegative.toFixed(2)}`);
  console.log(`  Rows with negative:        ${rowsWithNegative.length}`);

  const summary = [
    { metric: 'Nominal codes', value: FUEL_SALES_CODES.join(', ') },
    { metric: 'Period', value: `${JAN_START} to ${JAN_END}` },
    { metric: 'Row count', value: rows.length },
    { metric: 'Sum parsed volume (UI) L', value: sumParsed.toFixed(2) },
    { metric: 'Sum positive only L', value: sumPositive.toFixed(2) },
    { metric: 'Sum negative (ignored) L', value: sumNegative.toFixed(2) },
    { metric: 'Rows with negative in details', value: rowsWithNegative.length },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Fuel_4000_4004_details');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
  if (rowsWithNegative.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsWithNegative), 'Rows_with_negative');
  }

  const filepath = join(EXPORTS_DIR, `jan-${JAN_YEAR}-fuel-4000-4004-${timestamp()}.xlsx`);
  XLSX.writeFile(wb, filepath);
  console.log(`\nDone. File: ${filepath}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
