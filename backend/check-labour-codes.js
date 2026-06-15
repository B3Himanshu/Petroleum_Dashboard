/**
 * Check Labour Cost nominal codes (Wireframe §8): 7000, 7001, 7005
 * - Are they present in HSRL_sage_audit_journal?
 * - Do they have any data (row count, sum)?
 * Optional: filter by month/year (e.g. January 2026).
 * Run from backend: node check-labour-codes.js
 *                 : node check-labour-codes.js 1 2026
 */
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

// Optional: month (1-12) and year from CLI — e.g. node check-labour-codes.js 1 2026 (January 2026)
const args = process.argv.slice(2).map((a) => parseInt(a, 10)).filter((n) => !Number.isNaN(n));
const filterMonth = args[0] >= 1 && args[0] <= 12 ? args[0] : null;
const filterYear = args[1] > 0 ? args[1] : null;
const dateFilter = filterMonth != null && filterYear != null
  ? { month: filterMonth, year: filterYear, startDate: `${filterYear}-${String(filterMonth).padStart(2, '0')}-01` }
  : null;

const TRANSACTIONS_TABLE = 'HSRL_sage_audit_journal';
const LABOUR_CODES = ['7000', '7001', '7005'];
const LABOUR_NAMES = {
  '7000': 'Gross Wages',
  '7001': 'Employer NI (Staff)',
  '7005': 'Staff Pensions',
};

const DATE_COLUMN = process.env.DB_DATE_COLUMN || 'sage_date';
const AMOUNT_COLUMN = process.env.DB_AMOUNT_COLUMN || 'amount';
const DATE_EXPR = `(NULLIF(TRIM(${DATE_COLUMN}), ''))::date`;
const AMOUNT_EXPR = `(NULLIF(TRIM(${AMOUNT_COLUMN}), ''))::numeric`;
const NET_EXPR = "(NULLIF(TRIM(net), ''))::numeric";

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function checkLabourCodes() {
  let client;
  try {
    console.log('🔍 Labour Cost codes (Wireframe §8): 7000, 7001, 7005\n');
    if (dateFilter) {
      console.log(`   📅 Filter: ${MONTH_NAMES[dateFilter.month]} ${dateFilter.year}\n`);
    }
    console.log('  7000 = Gross Wages');
    console.log('  7001 = Employer NI (Staff)');
    console.log('  7005 = Staff Pensions\n');

    client = await pool.connect();
    console.log('✅ Connected to database\n');

    // 1) Table exists and has nominal_code
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = (SELECT table_schema FROM information_schema.tables WHERE table_name = $1 LIMIT 1)
        AND table_name = $1
        AND column_name IN ('nominal_code', 'amount', 'net', 'sage_date', 'dept_number')
    `, [TRANSACTIONS_TABLE]);

    const columns = (colCheck.rows || []).map((r) => r.column_name);
    if (!columns.includes('nominal_code')) {
      console.log(`❌ Table "${TRANSACTIONS_TABLE}" not found or missing nominal_code column.`);
      return;
    }
    console.log(`📋 Table: ${TRANSACTIONS_TABLE}, columns: ${columns.join(', ')}\n`);

    const hasAmount = columns.includes('amount') || columns.includes(AMOUNT_COLUMN);
    const hasNet = columns.includes('net');

    // 2) Distinct nominal codes in DB for 7xxx range (to see if 7000, 7001, 7005 exist)
    const distinctRes = await client.query(`
      SELECT DISTINCT TRIM(nominal_code::text) AS nc
      FROM ${TRANSACTIONS_TABLE}
      WHERE TRIM(nominal_code::text) IN ('7000','7001','7005')
      ORDER BY nc
    `);
    const inDb = (distinctRes.rows || []).map((r) => String(r.nc).trim());
    const missing = LABOUR_CODES.filter((nc) => !inDb.includes(nc));

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('1. CODES PRESENT IN DATABASE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    for (const code of LABOUR_CODES) {
      const present = inDb.includes(code);
      console.log(`  ${code} ${LABOUR_NAMES[code]} : ${present ? '✅ YES' : '❌ NO'}`);
    }
    if (missing.length) {
      console.log(`\n⚠️  Missing in DB: ${missing.join(', ')} (no rows with these nominal_code values).\n`);
    } else {
      console.log('\n  All three Labour Cost codes exist in the table.\n');
    }

    // 3) Row counts and sums per code (amount column; fallback to net if amount all zero)
    const sumCol = hasAmount ? AMOUNT_EXPR : (hasNet ? NET_EXPR : null);
    if (!sumCol) {
      console.log('⚠️  No amount or net column found; skipping row count and sum.\n');
    } else {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('2. ROW COUNTS AND TOTALS (all time)');
      console.log('═══════════════════════════════════════════════════════════════\n');

      for (const code of LABOUR_CODES) {
        const countRes = await client.query(`
          SELECT COUNT(*) AS cnt, COALESCE(SUM(${sumCol}), 0) AS total
          FROM ${TRANSACTIONS_TABLE}
          WHERE TRIM(nominal_code::text) = $1
        `, [code]);
        const row = countRes.rows[0];
        const cnt = parseInt(row?.cnt || 0, 10);
        const total = parseFloat(row?.total || 0);
        const hasData = cnt > 0;
        console.log(`  ${code} ${LABOUR_NAMES[code]}:`);
        console.log(`     Rows: ${cnt}  ${hasData ? '✅ has data' : '❌ no data'}`);
        console.log(`     Sum (${AMOUNT_COLUMN}): ${total.toFixed(2)}\n`);
      }

      // If amount was zero for all, try net
      const anySumRes = await client.query(`
        SELECT COALESCE(SUM(${AMOUNT_EXPR}), 0) AS amt_total
        FROM ${TRANSACTIONS_TABLE}
        WHERE TRIM(nominal_code::text) IN ('7000','7001','7005')
      `);
      const amtTotal = parseFloat(anySumRes.rows[0]?.amt_total || 0);
      if (hasNet && amtTotal === 0) {
        const netSumRes = await client.query(`
          SELECT TRIM(nominal_code::text) AS nc, COALESCE(SUM(${NET_EXPR}), 0) AS total
          FROM ${TRANSACTIONS_TABLE}
          WHERE TRIM(nominal_code::text) IN ('7000','7001','7005')
          GROUP BY TRIM(nominal_code::text)
        `);
        const hasAnyNet = (netSumRes.rows || []).some((r) => parseFloat(r.total) !== 0);
        if (hasAnyNet) {
          console.log('  (Values are in "net" column; labour-cost API uses net when amount is zero.)\n');
          netSumRes.rows.forEach((r) => {
            console.log(`     ${r.nc} ${LABOUR_NAMES[r.nc]}: Sum(net) = ${parseFloat(r.total).toFixed(2)}`);
          });
          console.log('');
        }
      }

      // 2b) For specific month (e.g. January 2026)
      if (dateFilter && sumCol) {
        const endDay = new Date(dateFilter.year, dateFilter.month, 0).getDate();
        const endDate = `${dateFilter.year}-${String(dateFilter.month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
        const monthLabel = `${MONTH_NAMES[dateFilter.month]} ${dateFilter.year}`;
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`2b. FOR ${monthLabel.toUpperCase()} (${dateFilter.startDate} to ${endDate})`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        let totalLabourMonth = 0;
        for (const code of LABOUR_CODES) {
          const countRes = await client.query(`
            SELECT COUNT(*) AS cnt, COALESCE(SUM(${sumCol}), 0) AS total
            FROM ${TRANSACTIONS_TABLE}
            WHERE TRIM(nominal_code::text) = $1
              AND ${DATE_EXPR} >= $2::date AND ${DATE_EXPR} <= $3::date
          `, [code, dateFilter.startDate, endDate]);
          const row = countRes.rows[0];
          const cnt = parseInt(row?.cnt || 0, 10);
          const total = parseFloat(row?.total || 0);
          totalLabourMonth += total;
          const hasData = cnt > 0;
          console.log(`  ${code} ${LABOUR_NAMES[code]}:`);
          console.log(`     Rows: ${cnt}  ${hasData ? '✅ has data' : '❌ no data'}`);
          console.log(`     Sum: ${total.toFixed(2)}\n`);
        }
        console.log(`  Total Labour Cost (7000+7001+7005) for ${monthLabel}: ${totalLabourMonth.toFixed(2)}\n`);

        if (hasNet && totalLabourMonth === 0) {
          const netSumRes = await client.query(`
            SELECT TRIM(nominal_code::text) AS nc, COALESCE(SUM(${NET_EXPR}), 0) AS total
            FROM ${TRANSACTIONS_TABLE}
            WHERE TRIM(nominal_code::text) IN ('7000','7001','7005')
              AND ${DATE_EXPR} >= $1::date AND ${DATE_EXPR} <= $2::date
            GROUP BY TRIM(nominal_code::text)
          `, [dateFilter.startDate, endDate]);
          const hasAnyNet = (netSumRes.rows || []).some((r) => parseFloat(r.total) !== 0);
          if (hasAnyNet) {
            let netTotal = 0;
            netSumRes.rows.forEach((r) => {
              const t = parseFloat(r.total);
              netTotal += t;
              console.log(`     ${r.nc} ${LABOUR_NAMES[r.nc]}: Sum(net) = ${t.toFixed(2)}`);
            });
            console.log(`     Total (net): ${netTotal.toFixed(2)}\n`);
          }
        }
      }
    }

    // 4) Sample date range (min/max date for these codes)
    try {
      const rangeRes = await client.query(`
        SELECT MIN(${DATE_EXPR}) AS min_date, MAX(${DATE_EXPR}) AS max_date
        FROM ${TRANSACTIONS_TABLE}
        WHERE TRIM(nominal_code::text) IN ('7000','7001','7005')
      `);
      const minD = rangeRes.rows[0]?.min_date;
      const maxD = rangeRes.rows[0]?.max_date;
      if (minD && maxD) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('3. DATE RANGE (Labour codes 7000, 7001, 7005)');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`  From: ${minD}  To: ${maxD}\n`);
      }
    } catch (e) {
      console.log('  (Could not get date range; date column may differ.)\n');
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Labour codes check done.');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code) console.error('   Code:', err.code);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

checkLabourCodes();
