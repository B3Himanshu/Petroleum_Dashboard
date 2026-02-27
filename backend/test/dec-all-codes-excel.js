/**
 * Export December data for all nominal codes used in the app (fuel profit codes) to one Excel file.
 * One sheet per code + a Summary sheet. Amounts are raw (no ABS); negative values stay negative.
 *
 * Run from backend: node test/dec-all-codes-excel.js
 * Output: backend/exports/dec-all-codes-YYYY-MM-DD-HHMMSS.xlsx
 *
 * Env: DEC_YEAR=2025, DEC_MONTH=12 (default Dec 2025).
 *      DEC_CODES=4000,4400,5001 (optional: comma-separated codes; default = all fuel profit codes).
 */
import { query } from '../config/database.js';
import XLSX from 'xlsx';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'exports');

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

// Same codes as petrolDataSage FUEL_PROFIT_NOMINAL_CODES
const DEFAULT_CODES = ['4000', '4001', '4002', '4003', '4008', '4400', '5000', '5001', '5003', '5004', '5014', '5102', '5200', '6100'];
const CODE_NAMES = {
  '4000': 'Petrol-Sales',
  '4001': 'Diesel-Sales',
  '4002': 'Super Petrol-Sales',
  '4003': 'Super Diesel-Sales',
  '4008': 'AdBlue-Sales',
  '4400': 'Bunkering Charges',
  '5000': 'Petrol-Purchases',
  '5001': 'Diesel-Purchases',
  '5003': 'Super Petrol-Purchases',
  '5004': 'Super Diesel-Purchases',
  '5014': 'AdBlue-Purchases',
  '5102': 'Other Purchases-(Fuel Promotional)',
  '5200': 'Stock Movement',
  '6100': 'Fuel Commissions',
};

const year = parseInt(process.env.DEC_YEAR || '2025', 10);
const month = parseInt(process.env.DEC_MONTH || '12', 10);
const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
const lastDay = new Date(year, month, 0).getDate();
const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

const codesToExport = process.env.DEC_CODES
  ? process.env.DEC_CODES.split(',').map((c) => String(c).trim()).filter(Boolean)
  : [...DEFAULT_CODES];

const envSchema = (process.env.DB_TRANSACTIONS_SCHEMA || process.env.PETROL_DATA_SCHEMA || '').trim();
const SCHEMAS_TO_TRY = envSchema
  ? [envSchema, 'public', 'sage_data'].filter((s, i, a) => s && a.indexOf(s) === i)
  : ['public', 'sage_data'];

async function resolveTransactionsTable() {
  const placeholders = SCHEMAS_TO_TRY.map((_, i) => `$${i + 1}`).join(',');
  const res = await query(
    `SELECT table_schema
     FROM information_schema.tables
     WHERE table_schema IN (${placeholders})
       AND table_name = 'transactions'
       AND table_type = 'BASE TABLE'
     ORDER BY table_schema
     LIMIT 1`,
    SCHEMAS_TO_TRY
  );
  const schema = res.rows[0]?.table_schema;
  if (schema && /^[a-zA-Z0-9_]+$/.test(schema)) {
    return `"${schema}".transactions`;
  }
  return 'transactions';
}

function timestamp() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    '-',
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('');
}

// Normalize nominal code so 4000, "4000", "4000.00" all match "4000" (DB can return int or string)
function normalizeNominalCode(val) {
  if (val == null || val === '') return '';
  const n = Number(val);
  return Number.isNaN(n) ? String(val).trim() : String(Math.floor(n));
}

function rowToExport(row) {
  const d = row.transaction_date;
  const dateStr = d instanceof Date ? d.toISOString().slice(0, 10) : (d ? String(d).slice(0, 10) : '');
  const amount = row.amount != null ? parseFloat(row.amount) : row.amount;
  const rawCode = row.nominal_code;
  const codeStr = normalizeNominalCode(rawCode) || String(rawCode ?? '').trim();
  return {
    Id: row.id,
    Nominal_Code: codeStr,
    Dept_Number: row.dept_number,
    Transaction_Date: dateStr,
    Amount: amount,
    Details: row.details != null ? String(row.details) : '',
    Created_At: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function run() {
  const TRANSACTIONS_TABLE = await resolveTransactionsTable();
  console.log(`Dec ${year} – export all codes (${codesToExport.length} codes)`);
  console.log(`Period: ${startDate} to ${endDate}`);
  console.log('Codes:', codesToExport.join(', '));
  console.log('Amounts: raw signed (no ABS).\n');

  // Use numeric comparison so 4000, 4000.0, '4000', '4001.00' all match (DB column may be int or numeric)
  const codeNumbers = codesToExport.map((c) => parseInt(c, 10));
  const placeholders = codesToExport.map((_, i) => `$${i + 3}::numeric`).join(',');
  const res = await query(
    `SELECT id, nominal_code, dept_number, transaction_date, amount, details, created_at
     FROM ${TRANSACTIONS_TABLE}
     WHERE (nominal_code::numeric)::integer IN (${placeholders})
       AND transaction_date >= $1::date
       AND transaction_date <= $2::date
     ORDER BY (nominal_code::numeric)::integer, transaction_date, id`,
    [startDate, endDate, ...codeNumbers]
  );

  const allRows = (res.rows || []).map(rowToExport);
  const byCode = {};
  for (const code of codesToExport) {
    byCode[code] = allRows.filter((r) => normalizeNominalCode(r.Nominal_Code) === code);
  }

  const wb = XLSX.utils.book_new();

  // Build summary data for all codes – signed sum only (no ABS; negatives stay negative)
  const summaryData = [
    ['December data – all codes', '', '', ''],
    ['Period', `${startDate} to ${endDate}`, '', ''],
    [''],
    ['Code', 'Name', 'Row_Count', 'Sum_Amount'],
  ];
  for (const code of codesToExport) {
    const rows = byCode[code] || [];
    const name = CODE_NAMES[code] || code;
    const sumAmount = rows.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
    summaryData.push([code, name, rows.length, sumAmount]);
    console.log(`  ${code} ${name}: ${rows.length} rows, Sum(Amount)=${sumAmount}`);
  }

  // Summary sheet first (so opening the file shows overview)
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 8 }, { wch: 35 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // One sheet per code with proper column widths
  const colWidths = [{ wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 50 }, { wch: 22 }];
  for (const code of codesToExport) {
    const rows = byCode[code] || [];
    const name = CODE_NAMES[code] || code;
    const sheetName = code.length <= 31 ? code : code.slice(0, 31);
    if (rows.length === 0) {
      const emptySheet = XLSX.utils.aoa_to_sheet([
        [`${code} - ${name}`],
        ['Period:', `${startDate} to ${endDate}`],
        ['(no rows)'],
      ]);
      XLSX.utils.book_append_sheet(wb, emptySheet, sheetName);
    } else {
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    }
  }

  const filename = `dec-all-codes-${timestamp()}.xlsx`;
  const filepath = join(OUT_DIR, filename);
  XLSX.writeFile(wb, filepath);

  console.log(`\nDone. File: ${filepath}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
