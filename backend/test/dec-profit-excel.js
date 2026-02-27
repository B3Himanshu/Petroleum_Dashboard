/**
 * Export December 2025 profit to Excel using the same 14 nominal codes as the Fuel Profit formula.
 * Run from backend: node test/dec-profit-excel.js  (or: npm run dec-profit-excel)
 * Output: backend/exports/dec-profit-excel-YYYY-MM-DD-HHMMSS.xlsx
 *
 * Default: Dec 2025 (2025-12-01 to 2025-12-31).
 * Optional env: DEC_PROFIT_YEAR=2025, DEC_PROFIT_MONTH=12 to override.
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

// Same 14 nominal codes as petrolDataSage.js Fuel Profit (includes 5200 Stock Movement)
const FUEL_PROFIT_NOMINAL_CODES = ['4000', '4001', '4002', '4003', '4008', '4400', '5000', '5001', '5003', '5004', '5014', '5102', '5200', '6100'];
const FUEL_PROFIT_NC_NAMES = {
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

const FUEL_PROFIT_SQL = "nominal_code IN ('" + FUEL_PROFIT_NOMINAL_CODES.join("','") + "')";

// When DB stores purchase/cost amounts as positive but Sage uses negative, treat positive as negative for profit
const CODES_DB_POSITIVE_AS_NEGATIVE = ['4400', '5000', '5001', '5003', '5004', '5014', '6100'];

// Dec 2025 by default
const year = parseInt(process.env.DEC_PROFIT_YEAR || '2025', 10);
const month = parseInt(process.env.DEC_PROFIT_MONTH || '12', 10);
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
  console.log(`Dec 2025 profit export: ${startDate} to ${endDate}`);
  console.log('Nominal codes:', FUEL_PROFIT_NOMINAL_CODES.join(', '));

  const [breakdownRows, fullDataRows, signDiagnosticRows] = await Promise.all([
    query(
      `SELECT nominal_code, COALESCE(SUM(amount),0) as total FROM transactions WHERE ${FUEL_PROFIT_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date GROUP BY nominal_code ORDER BY nominal_code`,
      [startDate, endDate]
    ),
    query(
      `SELECT id, nominal_code, dept_number, transaction_date, amount, details FROM transactions WHERE ${FUEL_PROFIT_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date ORDER BY nominal_code, transaction_date, id`,
      [startDate, endDate]
    ),
    query(
      `SELECT nominal_code,
        COUNT(*) FILTER (WHERE amount > 0)  AS cnt_positive,
        COUNT(*) FILTER (WHERE amount < 0)  AS cnt_negative,
        COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) AS sum_positive,
        COALESCE(SUM(amount) FILTER (WHERE amount < 0), 0) AS sum_negative,
        COALESCE(SUM(amount), 0) AS sum_total
       FROM transactions WHERE ${FUEL_PROFIT_SQL} AND transaction_date >= $1::date AND transaction_date <= $2::date
       GROUP BY nominal_code ORDER BY nominal_code`,
      [startDate, endDate]
    ),
  ]);

  const breakdown = breakdownRows.rows.map((row) => {
    const codeKey = String(row.nominal_code ?? '').trim();
    const raw = parseFloat(row.total || 0);
    const amount = CODES_DB_POSITIVE_AS_NEGATIVE.includes(codeKey) ? -Math.abs(raw) : raw;
    return {
      nominal_code: codeKey || row.nominal_code,
      name: FUEL_PROFIT_NC_NAMES[codeKey] || FUEL_PROFIT_NC_NAMES[row.nominal_code] || row.nominal_code,
      amount,
    };
  });

  // Ensure all 14 codes appear (fill 0 if missing); key by string+trim so 5200 matches even if DB has "5200 "
  const byCode = {};
  breakdown.forEach((r) => {
    const key = String(r.nominal_code ?? '').trim();
    if (key) byCode[key] = r;
  });
  const fullBreakdown = FUEL_PROFIT_NOMINAL_CODES.map((code) =>
    byCode[code]
      ? { Nominal_Code: code, Name: byCode[code].name, Amount: byCode[code].amount }
      : { Nominal_Code: code, Name: FUEL_PROFIT_NC_NAMES[code] || code, Amount: 0 }
  );

  // Step-by-step: total = sum of line items (no ABS). Same as UI.
  const totalPositives = fullBreakdown.filter((r) => (r.Amount || 0) > 0).reduce((s, r) => s + r.Amount, 0);
  const totalNegatives = fullBreakdown.filter((r) => (r.Amount || 0) < 0).reduce((s, r) => s + r.Amount, 0);
  const totalProfit = totalPositives + totalNegatives;

  const summary = [
    { Label: 'Period', Value: `${startDate} to ${endDate}` },
    { Label: 'Sum of positives', Value: totalPositives },
    { Label: 'Sum of negatives', Value: totalNegatives },
    { Label: 'Total Net Profit (positives + negatives)', Value: totalProfit },
  ];

  // Full Data = raw transaction rows from DB only (no placeholder rows)
  const fullData = (fullDataRows.rows || []).map((row) => {
    const d = row.transaction_date;
    const dateStr = d instanceof Date ? d.toISOString().slice(0, 10) : (d ? String(d).slice(0, 10) : '');
    const code = row.nominal_code;
    const codeStr = String(code);
    return {
      Id: row.id,
      Nominal_Code: code,
      Name: FUEL_PROFIT_NC_NAMES[codeStr] || FUEL_PROFIT_NC_NAMES[code] || codeStr,
      Dept_Number: row.dept_number,
      Transaction_Date: dateStr,
      Amount: row.amount != null ? parseFloat(row.amount) : row.amount,
      Details: row.details != null ? String(row.details) : '',
    };
  });

  const wb = XLSX.utils.book_new();
  const wsFullData = XLSX.utils.json_to_sheet(fullData);
  XLSX.utils.book_append_sheet(wb, wsFullData, 'Full Data');

  const wsBreakdown = XLSX.utils.json_to_sheet(fullBreakdown);
  XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Profit by Nominal Code');

  // 5200-only sheet so you can see if Stock Movement data exists for the period
  const rows5200 = fullData.filter((r) => String(r.Nominal_Code ?? '').trim() === '5200');
  const ws5200 = rows5200.length
    ? XLSX.utils.json_to_sheet(rows5200)
    : XLSX.utils.aoa_to_sheet([['5200 - Stock Movement'], ['(no 5200 transactions in this period)'], ['Sum in Profit by Nominal Code:', fullBreakdown.find((r) => String(r.Nominal_Code).trim() === '5200')?.Amount ?? 0]]);
  XLSX.utils.book_append_sheet(wb, ws5200, '5200_Stock_Movement');

  // Diagnostic: every value (positive + negative) included; none neglected. Simple sum and ABS sum both.
  const signByCode = {};
  (signDiagnosticRows.rows || []).forEach((row) => {
    const key = String(row.nominal_code ?? '').trim();
    if (key) {
      const sumPos = parseFloat(row.sum_positive || 0);
      const sumNeg = parseFloat(row.sum_negative || 0);
      signByCode[key] = {
        Nominal_Code: key,
        Name: FUEL_PROFIT_NC_NAMES[key] || key,
        Rows_positive: parseInt(row.cnt_positive || 0, 10),
        Rows_negative: parseInt(row.cnt_negative || 0, 10),
        Sum_positive: sumPos,
        Sum_negative: sumNeg,
        Sum_total: parseFloat(row.sum_total || 0),
        Sum_ABS: sumPos + Math.abs(sumNeg),
      };
    }
  });
  const signDiagnostic = FUEL_PROFIT_NOMINAL_CODES.map((code) =>
    signByCode[code] || {
      Nominal_Code: code,
      Name: FUEL_PROFIT_NC_NAMES[code] || code,
      Rows_positive: 0,
      Rows_negative: 0,
      Sum_positive: 0,
      Sum_negative: 0,
      Sum_total: 0,
      Sum_ABS: 0,
    }
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(signDiagnostic), 'Positive vs Negative');

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const filename = `dec-profit-excel-${timestamp()}.xlsx`;
  const filepath = join(OUT_DIR, filename);
  XLSX.writeFile(wb, filepath);

  console.log('Total Net Profit:', totalProfit);
  console.log('Breakdown rows:', fullBreakdown.length);
  console.log('Full data rows:', fullData.length);
  console.log('Done. File:', filepath);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
