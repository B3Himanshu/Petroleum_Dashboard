/**
 * Check nominal code 4400 (Bunkering Charges) in the fuel/transactions table only (not volume).
 * Does not change any main code. Use to verify 4400 data exists and which date range it has.
 * Resolves transactions table from information_schema (public/sage_data) like export script.
 *
 * Run from backend: node test/check-4400-fuel.js
 * Optional env: CHECK_4400_START=2025-05-01, CHECK_4400_END=2025-12-31 (default: all time)
 */
import { query } from '../config/database.js';

const startDate = process.env.CHECK_4400_START || null;
const endDate = process.env.CHECK_4400_END || null;

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

async function run() {
  const TRANSACTIONS_TABLE = await resolveTransactionsTable();
  console.log('Check 4400 (Bunkering Charges) in fuel/transactions table only\n');
  console.log('Table:', TRANSACTIONS_TABLE, '\n');

  // 1) Any 4400 rows at all (no date filter)
  const allRes = await query(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) = '4400'`
  );
  const allRow = allRes.rows[0];
  const allCnt = parseInt(allRow?.cnt || 0, 10);
  const allTotal = parseFloat(allRow?.total || 0);
  console.log('4400 in transactions (all time):');
  console.log('  Rows:', allCnt, '| Sum(amount):', allTotal);

  if (allCnt === 0) {
    console.log('\nNo 4400 rows in transactions. Add/update 4400 in this table (fuel data, not volume).');
    console.log('If 4400 exists in another schema, set DB_TRANSACTIONS_SCHEMA or PETROL_DATA_SCHEMA and run again.');
    return;
  }

  // 2) Date range of 4400 rows
  const rangeRes = await query(
    `SELECT MIN(transaction_date) as min_dt, MAX(transaction_date) as max_dt
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) = '4400'`
  );
  const r = rangeRes.rows[0];
  console.log('  Date range in DB:', r?.min_dt ?? '—', 'to', r?.max_dt ?? '—');

  // 3) If env date range given, show sum for that period (same as API)
  if (startDate && endDate) {
    const periodRes = await query(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total
       FROM ${TRANSACTIONS_TABLE}
       WHERE TRIM(nominal_code::text) = '4400'
         AND transaction_date >= $1::date
         AND transaction_date <= $2::date`,
      [startDate, endDate]
    );
    const p = periodRes.rows[0];
    const periodCnt = parseInt(p?.cnt || 0, 10);
    console.log('\n4400 in period', startDate, 'to', endDate, '(same as API/Excel):');
    console.log('  Rows:', periodCnt, '| Sum(amount):', parseFloat(p?.total || 0));
    if (periodCnt === 0) {
      console.log('  No 4400 rows in this period. DB has 4400 from', r?.min_dt ?? '—', 'to', r?.max_dt ?? '—');
    }
  }

  console.log('\nDone. Main app reads from this same transactions table (fuel, not volume).');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
