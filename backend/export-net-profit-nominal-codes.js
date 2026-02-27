/**
 * Export Net Profit by nominal code to Excel.
 * Uses all 82 Net Profit N/Cs; each row = nominal code + sum(amount) for the period.
 * Raw amounts (no ABS); negative values preserved.
 *
 * Run from backend: node export-net-profit-nominal-codes.js
 * Or: npm run export-net-profit
 *
 * Env:
 *   EXPORT_START=2025-05-01  EXPORT_END=2025-12-31  (default: May–Dec 2025)
 *   DB_TRANSACTIONS_SCHEMA=sage_data  (optional)
 */
import { query } from './config/database.js';
import XLSX from 'xlsx';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, 'exports');

// All 82 Net Profit N/Cs (same as petrolDataSage NET_PROFIT_CODES)
const NET_PROFIT_CODES = [
  '4000', '4001', '4002', '4003', '4008', '4400', '4011', '4901', '4904', '4907',
  '5000', '5001', '5003', '5004', '5007', '5012', '5014', '5102', '5200', '6100',
  '6101', '6102', '7000', '7001', '7006', '7007', '7099', '7100', '7102', '7103',
  '7104', '7200', '7300', '7301', '7302', '7303', '7305', '7306', '7400', '7402',
  '7403', '7500', '7501', '7502', '7503', '7550', '7551', '7552', '7600', '7601',
  '7602', '7603', '7605', '7607', '7700', '7702', '7800', '7801', '7802', '5100',
  '7804', '7901', '7905', '8201', '8204', '8207', '8250', '8251', '9999',
  '7752', '7604', '7903', '8001', '8002', '8003', '8004', '8005', '8006', '8009', '8200', '9000', '9001',
];

const CODE_NAMES = {
  '4000': 'Petrol', '4001': 'Diesel', '4002': 'Ultimate Petrol', '4003': 'Ultimate Diesel', '4008': 'Adblue',
  '4400': 'Shop/Bunkering', '4011': 'Fuel Other', '4901': 'ATM Machine income', '4904': 'Rent income', '4907': 'Sundry income',
  '5000': 'Petrol Purchases', '5001': 'Diesel Purchases', '5003': 'Super Petrol Purchases', '5004': 'Super Diesel Purchases',
  '5007': 'Purchases', '5012': 'Purchases', '5014': 'AdBlue Purchases', '5102': 'Other Purchases', '5200': 'Stock Movement',
  '6100': 'Fuel Commissions', '6101': 'Daily Facility Fees', '6102': 'Valeting',
  '7000': 'Gross Wages', '7001': 'Wages', '7006': 'Employer NI', '7007': 'Staff Pensions', '7099': 'Labour',
  '7100': 'Rent', '7102': 'Rates', '7103': 'General Rates', '7104': 'Rates', '7200': 'Electricity',
  '7300': 'Maintenance', '7301': 'Maint', '7302': 'Maint', '7303': 'Maint', '7305': 'Maint', '7306': 'Maint',
  '7400': 'Overheads', '7402': 'OH', '7403': 'OH', '7500': 'OH', '7501': 'OH', '7502': 'OH', '7503': 'OH',
  '7550': 'OH', '7551': 'OH', '7552': 'OH', '7600': 'OH', '7601': 'OH', '7602': 'OH', '7603': 'OH',
  '7605': 'OH', '7607': 'OH', '7700': 'OH', '7702': 'OH', '7752': 'OH', '7604': 'OH',
  '7800': 'OH', '7801': 'Repairs & Renewals', '7802': 'OH', '5100': 'Purchases', '7804': 'OH',
  '7901': 'OH', '7905': 'Credit Charges', '7903': 'OH',
  '8001': 'OH', '8002': 'OH', '8003': 'OH', '8004': 'OH', '8005': 'OH', '8006': 'OH', '8009': 'OH',
  '8200': 'OH', '8201': 'OH', '8204': 'OH', '8207': 'OH', '8250': 'OH', '8251': 'OH',
  '9000': 'OH', '9001': 'OH', '9999': 'Sundry',
};

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

const startDate = process.env.EXPORT_START || '2025-05-01';
const endDate = process.env.EXPORT_END || '2025-12-31';

const envSchema = (process.env.DB_TRANSACTIONS_SCHEMA || process.env.PETROL_DATA_SCHEMA || '').trim();
const SCHEMAS_TO_TRY = envSchema ? [envSchema, 'public', 'sage_data'].filter((s, i, a) => s && a.indexOf(s) === i) : ['public', 'sage_data'];

async function resolveTransactionsTable() {
  const placeholders = SCHEMAS_TO_TRY.map((_, i) => `$${i + 1}`).join(',');
  const res = await query(
    `SELECT table_schema FROM information_schema.tables
     WHERE table_schema IN (${placeholders}) AND table_name = 'transactions' AND table_type = 'BASE TABLE'
     ORDER BY table_schema LIMIT 1`,
    SCHEMAS_TO_TRY
  );
  const schema = res.rows[0]?.table_schema;
  if (schema && /^[a-zA-Z0-9_]+$/.test(schema)) return `"${schema}".transactions`;
  return 'transactions';
}

function timestamp() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'),
    '-', String(d.getHours()).padStart(2, '0'), String(d.getMinutes()).padStart(2, '0'), String(d.getSeconds()).padStart(2, '0')].join('');
}

async function run() {
  const TRANSACTIONS_TABLE = await resolveTransactionsTable();
  const codeList = NET_PROFIT_CODES.map((c) => `'${c}'`).join(',');
  const sql = `SELECT TRIM(nominal_code::text) AS code, COALESCE(SUM(amount),0) AS value
    FROM ${TRANSACTIONS_TABLE}
    WHERE TRIM(nominal_code::text) IN (${codeList})
      AND transaction_date >= $1::date
      AND transaction_date <= $2::date
    GROUP BY TRIM(nominal_code::text)
    ORDER BY TRIM(nominal_code::text)`;

  console.log('Net Profit by Nominal Code – export to Excel');
  console.log('Period:', startDate, 'to', endDate);
  console.log('Codes:', NET_PROFIT_CODES.length);
  console.log('Table:', TRANSACTIONS_TABLE, '\n');

  const res = await query(sql, [startDate, endDate]);
  const byCode = {};
  (res.rows || []).forEach((r) => {
    byCode[String(r.code).trim()] = parseFloat(r.value) || 0;
  });

  // Month-wise query: value per nominal code per month
  const sqlByMonth = `SELECT TRIM(nominal_code::text) AS code, EXTRACT(YEAR FROM transaction_date)::int AS y, EXTRACT(MONTH FROM transaction_date)::int AS m, COALESCE(SUM(amount),0) AS value
    FROM ${TRANSACTIONS_TABLE}
    WHERE TRIM(nominal_code::text) IN (${codeList})
      AND transaction_date >= $1::date
      AND transaction_date <= $2::date
    GROUP BY TRIM(nominal_code::text), EXTRACT(YEAR FROM transaction_date), EXTRACT(MONTH FROM transaction_date)
    ORDER BY TRIM(nominal_code::text), y, m`;
  const resMonth = await query(sqlByMonth, [startDate, endDate]);
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const byCodeMonth = {};
  (resMonth.rows || []).forEach((r) => {
    const code = String(r.code).trim();
    const key = `${code}-${r.y}-${r.m}`;
    byCodeMonth[key] = parseFloat(r.value) || 0;
  });

  // Build ordered list of months in range (May to Dec or start month to end month)
  const start = new Date(startDate);
  const end = new Date(endDate);
  let y = start.getFullYear();
  let m = Math.max(1, start.getMonth() + 1);
  const endY = end.getFullYear();
  const endM = end.getMonth() + 1;
  const monthColumns = [];
  while (y < endY || (y === endY && m <= endM)) {
    monthColumns.push({ y, m, label: `${monthNames[m]} ${y}` });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }

  const rows = [
    ['Nominal_Code', 'Name', 'Value'],
    ...NET_PROFIT_CODES.map((code) => [
      code,
      CODE_NAMES[code] || code,
      byCode[code] ?? 0,
    ]),
  ];
  const total = NET_PROFIT_CODES.reduce((s, code) => s + (byCode[code] ?? 0), 0);
  rows.push(['', 'TOTAL (Net Profit)', total]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Net Profit by NC');

  // By Month sheet: Nominal_Code, Name, May 2025, Jun 2025, ..., Total
  const monthHeader = ['Nominal_Code', 'Name', ...monthColumns.map((c) => c.label), 'Total'];
  const monthRows = NET_PROFIT_CODES.map((code) => {
    const row = [code, CODE_NAMES[code] || code];
    let rowTotal = 0;
    monthColumns.forEach(({ y, m }) => {
      const val = byCodeMonth[`${code}-${y}-${m}`] ?? 0;
      row.push(val);
      rowTotal += val;
    });
    row.push(rowTotal);
    return row;
  });
  const monthTotalRow = ['', 'TOTAL (Net Profit)', ...monthColumns.map(({ y, m }) => {
    return NET_PROFIT_CODES.reduce((s, code) => s + (byCodeMonth[`${code}-${y}-${m}`] ?? 0), 0);
  }), total];
  const wsMonth = XLSX.utils.aoa_to_sheet([monthHeader, ...monthRows, monthTotalRow]);
  wsMonth['!cols'] = [{ wch: 12 }, { wch: 28 }, ...monthColumns.map(() => ({ wch: 12 })), { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsMonth, 'By Month');

  const filename = `net-profit-nominal-codes-${timestamp()}.xlsx`;
  const filepath = join(OUT_DIR, filename);
  XLSX.writeFile(wb, filepath);

  console.log('Exported', NET_PROFIT_CODES.length, 'rows + TOTAL');
  console.log('Sheets: Net Profit by NC (summary), By Month (month-wise)');
  console.log('Total Net Profit (sum):', total);
  console.log('File:', filepath);
  return filepath;
}

export { run };

const isMain = process.argv[1] && process.argv[1].endsWith('export-net-profit-nominal-codes.js');
if (isMain) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
