/**
 * Export December 2025 – nominal code 4400 (Bunkering Charges) only – to Excel.
 * Includes both positive and negative amounts (no ABS). Sum = sum of all transaction amounts.
 * Negative values in the database are never converted to positive: Excel Amount column and
 * the main total use raw signed values only.
 *
 * Run from backend: node test/dec-4400-excel.js
 * Output: backend/exports/dec-4400-YYYY-MM-DD-HHMMSS.xlsx
 *
 * Default: Dec 2025. Optional env: DEC_4400_YEAR=2025, DEC_4400_MONTH=12, DEC_4400_EXPECTED=167408.83 (reference value to show difference).
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

const year = parseInt(process.env.DEC_4400_YEAR || '2025', 10);
const month = parseInt(process.env.DEC_4400_MONTH || '12', 10);
const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
const lastDay = new Date(year, month, 0).getDate();
const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

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

async function run() {
  const TRANSACTIONS_TABLE = await resolveTransactionsTable();
  console.log(`Dec ${year} – nominal code 4400 (Bunkering Charges) export`);
  console.log(`Period: ${startDate} to ${endDate}`);
  console.log('Treating positive and negative amounts (no ABS).\n');

  // Include EVERY row (positive and negative amount); do not neglect any value
  const res = await query(
    `SELECT id, nominal_code, dept_number, transaction_date, amount, details, created_at
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) = '4400'
       AND transaction_date >= $1::date
       AND transaction_date <= $2::date
     ORDER BY transaction_date, id`,
    [startDate, endDate]
  );

  const rows = (res.rows || []).map((row) => {
    const d = row.transaction_date;
    const dateStr = d instanceof Date ? d.toISOString().slice(0, 10) : (d ? String(d).slice(0, 10) : '');
    // Raw amount only – never convert negative to positive (no Math.abs, no sign flip)
    const amount = row.amount != null ? parseFloat(row.amount) : row.amount;
    return {
      Id: row.id,
      Nominal_Code: String(row.nominal_code ?? '').trim(),
      Dept_Number: row.dept_number,
      Transaction_Date: dateStr,
      Amount: amount,
      Details: row.details != null ? String(row.details) : '',
      Created_At: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    };
  });

  // Simple sum: every value (positive + negative), none neglected. ABS sum: same rows, |amount|.
  const sumTotal = rows.reduce((s, r) => s + (Number(r.Amount) || 0), 0);
  const sumTotalAbs = rows.reduce((s, r) => s + Math.abs(Number(r.Amount) || 0), 0);
  const diffSimpleVsAbs = sumTotalAbs - sumTotal;

  const positiveRows = rows.filter((r) => (Number(r.Amount) || 0) > 0);
  const negativeRows = rows.filter((r) => (Number(r.Amount) || 0) < 0);
  const sumPositive = positiveRows.reduce((s, r) => s + Number(r.Amount), 0);
  const sumNegative = negativeRows.reduce((s, r) => s + Number(r.Amount), 0);

  // Reference expected total (Sage). Override with env DEC_4400_EXPECTED.
  const expectedRaw = process.env.DEC_4400_EXPECTED;
  const parsed = expectedRaw != null && expectedRaw !== '' ? parseFloat(expectedRaw) : NaN;
  const expected = Number.isNaN(parsed) ? 167408.83 : parsed;
  const difference = sumTotal - expected;

  const wb = XLSX.utils.book_new();

  if (rows.length === 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['4400 - Bunkering Charges'],
        ['Period:', `${startDate} to ${endDate}`],
        ['(no rows found)'],
      ]),
      '4400_All'
    );
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '4400_All');
  }

  const summaryRows = [
    ['4400 - Bunkering Charges summary (simple vs ABS)'],
    ['Period', `${startDate} to ${endDate}`],
    ['All values included (positive + negative); none neglected.'],
    [''],
    ['Row count (all)', rows.length],
    ['Rows with Amount > 0', positiveRows.length],
    ['Rows with Amount < 0', negativeRows.length],
    [''],
    ['Sum(Amount) – simple (signed)', sumTotal],
    ['Sum(ABS(Amount)) – with ABS', sumTotalAbs],
    ['Difference (ABS total - simple total)', diffSimpleVsAbs],
    [''],
    ['Sum(Amount) where Amount > 0', sumPositive],
    ['Sum(Amount) where Amount < 0', sumNegative],
    [''],
    ['Expected (reference)', expected],
    ['Difference (total - expected)', difference],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  const filename = `dec-4400-${timestamp()}.xlsx`;
  const filepath = join(OUT_DIR, filename);
  XLSX.writeFile(wb, filepath);

  console.log(`Rows: ${rows.length} (positive: ${positiveRows.length}, negative: ${negativeRows.length})`);
  console.log(`Sum(Amount) – simple (signed): ${sumTotal}`);
  console.log(`Sum(ABS(Amount)): ${sumTotalAbs}`);
  console.log(`Difference (simple vs ABS): ${diffSimpleVsAbs}`);
  console.log(`Sum(positive): ${sumPositive}`);
  console.log(`Sum(negative): ${sumNegative}`);
  console.log(`Expected (reference): ${expected}`);
  console.log(`Difference (total - expected): ${difference}`);
  console.log(`Done. File: ${filepath}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
