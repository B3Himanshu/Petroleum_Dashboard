/**
 * Export December 2025 – nominal code 5200 (Stock Movement) only – to Excel.
 * Use this to verify whether 5200 data exists in the database for the period.
 *
 * Run from backend: node test/dec-5200-excel.js
 * Output: backend/exports/dec-5200-YYYY-MM-DD-HHMMSS.xlsx
 *
 * Default: Dec 2025. Optional env: DEC_5200_YEAR=2025, DEC_5200_MONTH=12.
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

const year = parseInt(process.env.DEC_5200_YEAR || '2025', 10);
const month = parseInt(process.env.DEC_5200_MONTH || '12', 10);
const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
const lastDay = new Date(year, month, 0).getDate();
const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

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
  console.log(`Dec ${year} – nominal code 5200 (Stock Movement) export`);
  console.log(`Period: ${startDate} to ${endDate}\n`);

  // Match 5200 as number or string (and trimmed) so we don't miss rows
  const res = await query(
    `SELECT id, nominal_code, dept_number, transaction_date, amount, details, created_at
     FROM transactions
     WHERE TRIM(nominal_code::text) = '5200'
       AND transaction_date >= $1::date
       AND transaction_date <= $2::date
     ORDER BY transaction_date, id`,
    [startDate, endDate]
  );

  const rows = (res.rows || []).map((row) => {
    const d = row.transaction_date;
    const dateStr = d instanceof Date ? d.toISOString().slice(0, 10) : (d ? String(d).slice(0, 10) : '');
    return {
      Id: row.id,
      Nominal_Code: String(row.nominal_code ?? '').trim(),
      Dept_Number: row.dept_number,
      Transaction_Date: dateStr,
      Amount: row.amount != null ? parseFloat(row.amount) : row.amount,
      Details: row.details != null ? String(row.details) : '',
      Created_At: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    };
  });

  const totalAmount = rows.reduce((s, r) => s + (Number(r.Amount) || 0), 0);

  const wb = XLSX.utils.book_new();

  if (rows.length === 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['5200 - Stock Movement'],
        ['Period:', `${startDate} to ${endDate}`],
        ['(no rows found)'],
        [''],
        ['If you expect data here, check that transactions exist with nominal_code 5200 in this period.'],
      ]),
      '5200_Stock_Movement'
    );
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), '5200_Stock_Movement');
  }

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['5200 - Stock Movement summary'],
      ['Period', `${startDate} to ${endDate}`],
      ['Row count', rows.length],
      ['Sum(Amount)', totalAmount],
    ]),
    'Summary'
  );

  const filename = `dec-5200-${timestamp()}.xlsx`;
  const filepath = join(OUT_DIR, filename);
  XLSX.writeFile(wb, filepath);

  console.log(`Rows: ${rows.length}`);
  console.log(`Sum(Amount): ${totalAmount}`);
  console.log(`Done. File: ${filepath}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
