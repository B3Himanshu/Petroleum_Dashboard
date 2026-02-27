/**
 * November 2025 – nominal code 4001 only. Volume from details (positive vs negative breakdown).
 * Run: node export-nov-4001-only.js
 * Output: backend/exports/nov-2025-4001-only-YYYY-MM-DD-HHmmss.xlsx
 */
import { query } from './config/database.js';
import XLSX from 'xlsx';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, 'exports');
const NOV_START = '2025-11-01';
const NOV_END = '2025-11-30';
const NOMINAL_4001 = '4001';

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

async function get4001Rows() {
  for (const schema of ['public', 'sage_data']) {
    try {
      const res = await query(
        `SELECT id, nominal_code, dept_number, transaction_date, amount, details
         FROM "${schema.replace(/"/g, '""')}"."transactions"
         WHERE nominal_code = $1
           AND transaction_date >= $2::date AND transaction_date <= $3::date
         ORDER BY id`,
        [NOMINAL_4001, NOV_START, NOV_END]
      );
      if (res.rows && res.rows.length > 0) return { schema, rows: res.rows };
    } catch (_) {}
  }
  const res = await query(
    `SELECT id, nominal_code, dept_number, transaction_date, amount, details
     FROM transactions
     WHERE nominal_code = $1
       AND transaction_date >= $2::date AND transaction_date <= $3::date
     ORDER BY id`,
    [NOMINAL_4001, NOV_START, NOV_END]
  );
  return { schema: 'default', rows: res.rows || [] };
}

function timestamp() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'), '-',
    String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0'), String(d.getSeconds()).padStart(2, '0')].join('');
}

async function run() {
  console.log(`Fetching November 2025 – nominal_code ${NOMINAL_4001} only...\n`);

  const { schema, rows } = await get4001Rows();
  console.log(`Schema: ${schema}, rows: ${rows.length}`);

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
    if (b.negativeSum !== 0) rowsWithNegative.push({ id: row.id, details: row.details, negative_volume: b.negativeSum });

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

  const difference = sumNegative; // amount we don't count (negatives ignored in UI)
  console.log(`Nominal 4001 (Nov 2025):`);
  console.log(`  Rows:                    ${rows.length}`);
  console.log(`  Sum parsed (UI) L:       ${sumParsed.toFixed(2)}`);
  console.log(`  Sum positive only L:     ${sumPositive.toFixed(2)}`);
  console.log(`  Sum negative (ignored) L: ${sumNegative.toFixed(2)}`);
  console.log(`  → Difference for 4001:   ${difference.toFixed(2)} L (negatives not counted)`);
  console.log(`  Rows with negative:     ${rowsWithNegative.length}`);

  const summary = [
    { metric: 'Nominal code', value: NOMINAL_4001 },
    { metric: 'Period', value: `${NOV_START} to ${NOV_END}` },
    { metric: 'Row count', value: rows.length },
    { metric: 'Sum parsed volume (UI) L', value: sumParsed.toFixed(2) },
    { metric: 'Sum positive only L', value: sumPositive.toFixed(2) },
    { metric: 'Sum negative (ignored) L', value: sumNegative.toFixed(2) },
    { metric: 'Difference for 4001 L', value: difference.toFixed(2) },
    { metric: 'Rows with negative in details', value: rowsWithNegative.length },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), '4001_details');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
  if (rowsWithNegative.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsWithNegative), 'Rows_with_negative');
  }

  const filepath = join(EXPORTS_DIR, `nov-2025-4001-only-${timestamp()}.xlsx`);
  XLSX.writeFile(wb, filepath);
  console.log(`\nDone. File: ${filepath}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
