/**
 * Check nominal code 5200 (Stock Movement) in the fuel/transactions table only (not volume).
 * Does not change any main code. Use to verify 5200 data exists and which date range it has.
 * Uses same schema as API when DB_TRANSACTIONS_SCHEMA or DB_SEARCH_PATH is set.
 *
 * Run from backend: node test/check-5200-fuel.js
 * Optional env: CHECK_5200_START=2025-05-01, CHECK_5200_END=2025-12-31 (default: all time)
 */
import { query } from '../config/database.js';

const startDate = process.env.CHECK_5200_START || null;
const endDate = process.env.CHECK_5200_END || null;

const TRANSACTIONS_SCHEMA = process.env.DB_TRANSACTIONS_SCHEMA || null;
const TRANSACTIONS_TABLE = (TRANSACTIONS_SCHEMA && /^[a-zA-Z0-9_]+$/.test(TRANSACTIONS_SCHEMA))
  ? `"${TRANSACTIONS_SCHEMA}".transactions`
  : 'transactions';

async function run() {
  console.log('Check 5200 (Stock Movement) in fuel/transactions table only\n');
  if (TRANSACTIONS_SCHEMA) console.log('Table:', TRANSACTIONS_TABLE, '\n');

  // 1) Any 5200 rows at all (no date filter)
  const allRes = await query(
    `SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) = '5200'`
  );
  const allRow = allRes.rows[0];
  const allCnt = parseInt(allRow?.cnt || 0, 10);
  const allTotal = parseFloat(allRow?.total || 0);
  console.log('5200 in transactions (all time):');
  console.log('  Rows:', allCnt, '| Sum(amount):', allTotal);

  if (allCnt === 0) {
    console.log('\nNo 5200 rows in transactions. Add/update 5200 in this table (fuel data, not volume).');
    console.log('If 5200 exists in another schema, set DB_TRANSACTIONS_SCHEMA=sage_data (or public) and run again.');
    return;
  }

  // 2) Date range of 5200 rows
  const rangeRes = await query(
    `SELECT MIN(transaction_date) as min_dt, MAX(transaction_date) as max_dt
     FROM ${TRANSACTIONS_TABLE}
     WHERE TRIM(nominal_code::text) = '5200'`
  );
  const r = rangeRes.rows[0];
  console.log('  Date range in DB:', r?.min_dt ?? '—', 'to', r?.max_dt ?? '—');

  // 3) If env date range given, show sum for that period (same as API)
  if (startDate && endDate) {
    const periodRes = await query(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(amount),0) as total
       FROM ${TRANSACTIONS_TABLE}
       WHERE TRIM(nominal_code::text) = '5200'
         AND transaction_date >= $1::date
         AND transaction_date <= $2::date`,
      [startDate, endDate]
    );
    const p = periodRes.rows[0];
    const periodCnt = parseInt(p?.cnt || 0, 10);
    console.log('\n5200 in period', startDate, 'to', endDate, '(same as API/Excel):');
    console.log('  Rows:', periodCnt, '| Sum(amount):', parseFloat(p?.total || 0));
    if (periodCnt === 0) {
      console.log('  No 5200 rows in this period. DB has 5200 from', r?.min_dt ?? '—', 'to', r?.max_dt ?? '—');
    }
  }

  console.log('\nDone. Main app reads from this same transactions table (fuel, not volume).');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
