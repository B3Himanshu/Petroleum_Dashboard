/**
 * Check why a nominal code's sign differs from Sage (e.g. 4400, 5102, 5200).
 * Shows: raw DB sum, row counts by sign, and how petrolDataSage.js profit logic treats it.
 * No sign flip – diagnostic only.
 *
 * Resolves transactions table like export-database-to-excel.js: queries information_schema
 * for table_name = 'transactions' in schemas public,sage_data (or env), so it works when
 * the table lives in public and sage_data does not exist.
 *
 * Run from backend: node test/check-nominal-sign.js
 * Env:
 *   NOMINAL_CODE=4400          (default 4400; use 5102 or 5200 for the other two)
 *   CHECK_START=2025-05-01     (optional; default 2025-05-01)
 *   CHECK_END=2025-12-31       (optional; default 2025-12-31)
 *   DB_TRANSACTIONS_SCHEMA or PETROL_DATA_SCHEMA (optional; prefer this schema if it has transactions)
 *   CHECK_NO_ABS=1              (optional; use raw sum without Math.abs for this test run)
 */
import { query } from '../config/database.js';

const NOMINAL_CODE = (process.env.NOMINAL_CODE || '4400').trim();
const START = process.env.CHECK_START || '2025-05-01';
const END = process.env.CHECK_END || '2025-12-31';
const NO_ABS = process.env.CHECK_NO_ABS === '1' || process.env.CHECK_NO_ABS === 'true';

// Same schema list as export-database-to-excel.js (public, sage_data). Prefer env schema first if set.
const envSchema = (process.env.DB_TRANSACTIONS_SCHEMA || process.env.PETROL_DATA_SCHEMA || '').trim();
const SCHEMAS_TO_TRY = envSchema
  ? [envSchema, 'public', 'sage_data'].filter((s, i, a) => s && a.indexOf(s) === i)
  : ['public', 'sage_data'];

/** Resolve transactions table: find schema that has table "transactions" (like export script). */
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
    return { schema, table: `"${schema}".transactions` };
  }
  return { schema: null, table: 'transactions' };
}

// Same classification as petrolDataSage.js (do not change – for explanation only)
const FUEL_PROFIT_SALES_CODES = ['4000', '4001', '4002', '4003', '4008', '4400'];
const FUEL_PROFIT_COST_CODES = ['5000', '5001', '5003', '5004', '5014', '5102', '5200', '6100'];
const FUEL_PROFIT_NC_NAMES = {
  '4400': 'Bunkering Charges',
  '5102': 'Other Purchases-(Fuel Promotional)',
  '5200': 'Stock Movement',
};
const NAME = FUEL_PROFIT_NC_NAMES[NOMINAL_CODE] || NOMINAL_CODE;

async function run() {
  const { schema: resolvedSchema, table: TRANSACTIONS_TABLE } = await resolveTransactionsTable();
  if (!resolvedSchema) {
    console.log('No transactions table found in schemas:', SCHEMAS_TO_TRY.join(', '));
    process.exit(1);
  }

  console.log('Nominal code:', NOMINAL_CODE, '-', NAME);
  console.log('Date range:', START, 'to', END);
  console.log('Table:', TRANSACTIONS_TABLE, '(resolved from information_schema)');
  console.log('');

  // 1) Raw sum and row count (same as API: SUM(amount) for this code in date range)
  const sumRes = await query(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(amount), 0) AS total
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) = $1
       AND transaction_date >= $2::date
       AND transaction_date <= $3::date`,
    [NOMINAL_CODE, START, END]
  );
  const row = sumRes.rows[0];
  const cnt = parseInt(row?.cnt || 0, 10);
  const rawSum = parseFloat(row?.total || 0);

  // 2) Sign breakdown: how many rows positive/negative and their sums
  const signRes = await query(
    `SELECT
       COUNT(*) FILTER (WHERE amount > 0)  AS cnt_positive,
       COUNT(*) FILTER (WHERE amount < 0)  AS cnt_negative,
       COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) AS sum_positive,
       COALESCE(SUM(amount) FILTER (WHERE amount < 0), 0) AS sum_negative
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) = $1
       AND transaction_date >= $2::date
       AND transaction_date <= $3::date`,
    [NOMINAL_CODE, START, END]
  );
  const s = signRes.rows[0];
  const cntPositive = parseInt(s?.cnt_positive || 0, 10);
  const cntNegative = parseInt(s?.cnt_negative || 0, 10);
  const sumPositive = parseFloat(s?.sum_positive || 0);
  const sumNegative = parseFloat(s?.sum_negative || 0);

  console.log('--- Raw in DB ---');
  console.log('  Row count:', cnt);
  console.log('  SUM(amount) (raw total):', rawSum);
  console.log('  Rows with amount > 0:', cntPositive, '  Sum(amount) where amount > 0:', sumPositive);
  console.log('  Rows with amount < 0:', cntNegative, '  Sum(amount) where amount < 0:', sumNegative);
  console.log('  (Check: sum_positive + sum_negative =', sumPositive + sumNegative, ')');
  console.log('');

  // 3) Profit logic: with CHECK_NO_ABS=1 use actual data (rawSum, no abs, no cost/sales flip)
  const isCost = FUEL_PROFIT_COST_CODES.includes(NOMINAL_CODE);
  const isSales = FUEL_PROFIT_SALES_CODES.includes(NOMINAL_CODE);
  const amountInProfit = NO_ABS
    ? rawSum
    : (isCost ? -Math.abs(rawSum) : Math.abs(rawSum));

  console.log('--- In profit calculation (petrolDataSage.js) ---');
  if (NO_ABS) {
    console.log('  [CHECK_NO_ABS=1 — actual data: raw sum, no Math.abs, no sign flip. Negative or positive as in DB.]');
    console.log('  Formula: amount = rawSum');
  } else {
    console.log('  Classified as:', isSales ? 'SALES (revenue)' : 'COST');
    console.log('  Formula: amount =', isCost ? '-Math.abs(rawSum)' : 'Math.abs(rawSum)');
  }
  console.log('  Value used in profit breakdown:', amountInProfit);
  console.log('');
  if (!NO_ABS) {
    console.log('If Sage shows the opposite sign, the difference is because:');
    if (NOMINAL_CODE === '4400') {
      console.log('  4400 is in FUEL_PROFIT_SALES_CODES → we always show Math.abs(raw) = positive.');
      console.log('  If Sage treats Bunkering Charges as a cost (negative), move 4400 to cost logic or adjust classification.');
    } else if (NOMINAL_CODE === '5102' || NOMINAL_CODE === '5200') {
      console.log('  ' + NOMINAL_CODE + ' is in FUEL_PROFIT_COST_CODES → we always show -Math.abs(raw) = negative.');
      console.log('  If Sage shows positive, either DB stores negative and we flip to negative (expected), or Sage treats it as income.');
    }
    console.log('');
  }
  console.log('Done. Change NOMINAL_CODE=5102 or NOMINAL_CODE=5200 to check the other two.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
