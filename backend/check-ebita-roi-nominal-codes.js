/**
 * Check that EBITA, Net Profit, and Investment nominal codes from the
 * dashboard spec exist in the database and show record counts/sums in
 * the transactions table (same table the API uses).
 *
 * Run from backend: node check-ebita-roi-nominal-codes.js
 * Or: npm run check-ebita-nominal-codes
 * Uses same .env as the API (including DB_TRANSACTIONS_SCHEMA if set).
 *
 * SPEC (must match petrolDataSage.js and this file):
 * 1. EBITA = SUM of 69 N/C's below. Do not remove negative sign from any value.
 * 2. Net Profit = SUM of 82 N/C's (EBITA 69 + 13 extra). Do not remove negative sign. ROI = Net Profit / Investment * 100.
 * 3. Investment = SUM of 15 N/C's below (denominator in ROI).
 * Date ranges (same as dashboard): Profit (EBITA/Net Profit) = May to Dec only; Investment = from 2000.
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, closePool } from './config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

// Same as petrolDataSage.js: which table to read
const TRANSACTIONS_SCHEMA = process.env.DB_TRANSACTIONS_SCHEMA || null;
const TRANSACTIONS_TABLE =
  TRANSACTIONS_SCHEMA && /^[a-zA-Z0-9_]+$/.test(TRANSACTIONS_SCHEMA)
    ? `"${TRANSACTIONS_SCHEMA}".transactions`
    : 'transactions';

// Profit (EBITA, Net Profit): May to Dec only. Investment: from 2000. Override via env if needed.
const PROFIT_START = process.env.CHECK_PROFIT_START || '2025-05-01';
const PROFIT_END = process.env.CHECK_PROFIT_END || '2025-12-31';
const INVESTMENT_START = process.env.CHECK_INVESTMENT_START || '2000-01-01';

function quoteId(name) {
  if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) return null;
  return `"${name}"`;
}

// 1. N/C's for EBITA (69 codes) – sum of all below; do not remove negative sign from any value.
const EBITA_CODES = [
  '4000', '4001', '4002', '4003', '4008', '4400', '4011', '4901', '4904', '4907',
  '5000', '5001', '5003', '5004', '5007', '5012', '5014', '5102', '5200', '6100',
  '6101', '6102', '7000', '7001', '7006', '7007', '7099', '7100', '7102', '7103',
  '7104', '7200', '7300', '7301', '7302', '7303', '7305', '7306', '7400', '7402',
  '7403', '7500', '7501', '7502', '7503', '7550', '7551', '7552', '7600', '7601',
  '7602', '7603', '7605', '7607', '7700', '7702', '7800', '7801', '7802', '5100',
  '7804', '7901', '7905', '8201', '8204', '8207', '8250', '8251', '9999',
];

// 2. Net Profit (82 codes) = EBITA 69 + extra 13 below. Keep negative signs. ROI = Net Profit / Investment * 100.
const NET_PROFIT_EXTRA = [
  '7752', '7604', '7903', '8001', '8002', '8003', '8004', '8005', '8006', '8009',
  '8200', '9000', '9001',
];
const NET_PROFIT_CODES = [...new Set([...EBITA_CODES, ...NET_PROFIT_EXTRA])];

// 3. N/C's for Investment (15 codes) – denominator in ROI.
const INVESTMENT_CODES = [
  '0010', '0012', '0014', '0020', '0030', '0040', '0050', '0055', '0056', '0057',
  '0058', '0060', '0062', '0064', '0080',
];

// Assert spec counts (69, 82, 15)
if (EBITA_CODES.length !== 69) throw new Error(`EBITA_CODES must have 69 codes, got ${EBITA_CODES.length}`);
if (NET_PROFIT_CODES.length !== 82) throw new Error(`NET_PROFIT_CODES must have 82 codes, got ${NET_PROFIT_CODES.length}`);
if (INVESTMENT_CODES.length !== 15) throw new Error(`INVESTMENT_CODES must have 15 codes, got ${INVESTMENT_CODES.length}`);

const INVESTMENT_LABELS = {
  '0010': 'Freehold Property',
  '0012': 'Leasehold Property',
  '0014': 'Property',
  '0020': 'Plant and Machinery',
  '0030': 'Office Equipment',
  '0040': 'Furniture and Fixtures',
  '0050': 'Motor Vehicles',
  '0055': 'Investment – Dearnside Motor Co',
  '0056': 'Investment in Joint Venture – PAIL',
  '0057': 'Investment in Subsidiary',
  '0058': 'Investment – JBros (Investments) Ltd.',
  '0060': 'Others',
  '0062': 'Intangible Assets',
  '0064': 'Improvement of Assets',
  '0080': 'Professional Fees (Capitalisation)',
};

function normalizeCode(code) {
  if (code == null) return '';
  // Plain code like 5007: strip quotes, semicolons, trailing .0 so "5007.0" or "\"5007\"" or "5007;" -> "5007"
  let s = String(code)
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/;+/g, '')
    .trim()
    .replace(/\.0+$/, '');
  if (/^\d+$/.test(s) && s.length <= 4) return s.padStart(4, '0');
  return s;
}

// Single SQL expression to normalize nominal_code: trim, strip quotes, strip trailing .0, pad to 4 digits (5007.0 -> 5007, 10 -> 0010).
function normalizeNominalCodeSql(columnRef) {
  return `LPAD(REGEXP_REPLACE(TRIM(BOTH '"' FROM TRIM(${columnRef}::text)), '\\.0+$', ''), 4, '0')`;
}
const NOMINAL_CODE_NORM = normalizeNominalCodeSql('nominal_code');

// Find all tables in the database that have a nominal_code column (any schema).
async function getTablesWithNominalCodeColumn() {
  const r = await query(`
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE column_name = 'nominal_code'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name
  `);
  return r.rows.map((row) => ({ schema: row.table_schema, table: row.table_name }));
}

// Get distinct nominal_code values from one table. Table/schema must be safe identifiers.
// Normalize in SQL so numeric types (5007.0) match required codes ("5007").
async function getDistinctCodesFromTable(schema, tableName) {
  const qSchema = quoteId(schema);
  const qTable = quoteId(tableName);
  if (!qSchema || !qTable) return { codes: new Set(), rows: 0 };
  const fullName = schema === 'public' ? qTable : `${qSchema}.${qTable}`;
  const r = await query(
    `SELECT DISTINCT ${normalizeNominalCodeSql('nominal_code')} AS code FROM ${fullName} WHERE nominal_code IS NOT NULL`
  );
  const codes = new Set(r.rows.map((row) => normalizeCode(row.code)));
  const countResult = await query(`SELECT COUNT(*) AS cnt FROM ${fullName}`);
  const rows = parseInt(countResult.rows[0]?.cnt || 0, 10);
  return { codes, rows };
}

// Check entire database: all tables that have nominal_code column.
async function getDistinctNominalCodesInDb() {
  const tables = await getTablesWithNominalCodeColumn();
  const allCodes = new Set();
  const tableStats = [];
  for (const { schema, table } of tables) {
    const { codes, rows } = await getDistinctCodesFromTable(schema, table);
    codes.forEach((c) => allCodes.add(c));
    const name = schema === 'public' ? table : `${schema}.${table}`;
    tableStats.push({ name, rows, distinctCodes: codes.size });
  }
  return { dbCodes: allCodes, tableStats };
}

// Get distinct nominal_code from the transactions table the API uses (same table/schema as TRANSACTIONS_TABLE).
// Uses same SQL normalization so 5007.0, "5007", 5007 all become "5007".
async function getDistinctCodesFromTransactionsTable() {
  const r = await query(
    `SELECT DISTINCT ${normalizeNominalCodeSql('nominal_code')} AS code FROM ${TRANSACTIONS_TABLE} WHERE nominal_code IS NOT NULL`
  );
  return new Set(r.rows.map((row) => normalizeCode(row.code)));
}

function report(name, requiredCodes, dbCodes) {
  const required = new Set(requiredCodes.map(normalizeCode));
  const present = [...required].filter((c) => dbCodes.has(c));
  const missing = [...required].filter((c) => !dbCodes.has(c));
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Required: ${required.size}  |  In DB: ${present.length}  |  Missing: ${missing.length}`);
  if (missing.length > 0) {
    console.log(`  Missing N/C's: ${missing.sort().join(', ')}`);
  } else {
    console.log(`  OK – All required nominal codes are present in the database.`);
  }
}

// Query the transactions table (same as API) for record counts and sums.
// Profit (EBITA, Net Profit): May to Dec only. Investment: from 2000 to same end date.
async function reportTransactionsTable() {
  const ebitaIn = EBITA_CODES.map((c) => `'${c}'`).join(',');
  const netProfitIn = NET_PROFIT_CODES.map((c) => `'${c}'`).join(',');
  const investmentIn = INVESTMENT_CODES.map((c) => `'${c}'`).join(',');

  const profitDateClause = ` AND transaction_date >= $1::date AND transaction_date <= $2::date`;
  const investmentDateClause = ` AND transaction_date >= $1::date AND transaction_date <= $2::date`;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  TRANSACTIONS TABLE: ${TRANSACTIONS_TABLE}`);
  console.log(`  Profit (EBITA/Net Profit) date range: ${PROFIT_START} to ${PROFIT_END} (May–Dec)`);
  console.log(`  Investment date range: ${INVESTMENT_START} to ${PROFIT_END} (from 2000)`);
  console.log(`${'═'.repeat(60)}`);

  try {
    const [ebitaRes, netProfitRes, investmentRes, invByCodeRes] = await Promise.all([
      query(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NOMINAL_CODE_NORM} IN (${ebitaIn})${profitDateClause}`,
        [PROFIT_START, PROFIT_END]
      ),
      query(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NOMINAL_CODE_NORM} IN (${netProfitIn})${profitDateClause}`,
        [PROFIT_START, PROFIT_END]
      ),
      query(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NOMINAL_CODE_NORM} IN (${investmentIn})${investmentDateClause}`,
        [INVESTMENT_START, PROFIT_END]
      ),
      query(
        `SELECT ${NOMINAL_CODE_NORM} AS code, COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total FROM ${TRANSACTIONS_TABLE} WHERE ${NOMINAL_CODE_NORM} IN (${investmentIn})${investmentDateClause} GROUP BY ${NOMINAL_CODE_NORM} ORDER BY code`,
        [INVESTMENT_START, PROFIT_END]
      ),
    ]);

    const ebitaRows = parseInt(ebitaRes.rows[0]?.cnt ?? 0, 10);
    const ebitaSum = parseFloat(ebitaRes.rows[0]?.total ?? 0);
    const npRows = parseInt(netProfitRes.rows[0]?.cnt ?? 0, 10);
    const npSum = parseFloat(netProfitRes.rows[0]?.total ?? 0);
    const invRows = parseInt(investmentRes.rows[0]?.cnt ?? 0, 10);
    const invSum = parseFloat(investmentRes.rows[0]?.total ?? 0);

    console.log(`\n  EBITA (69 N/Cs):     ${ebitaRows.toLocaleString()} rows   |   Sum(amount): £${ebitaSum.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  Net Profit (82 N/Cs): ${npRows.toLocaleString()} rows   |   Sum(amount): £${npSum.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  Investment (15 N/Cs): ${invRows.toLocaleString()} rows   |   Sum(amount): £${invSum.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    console.log(`\n  Investment by code (in transactions table):`);
    if (invByCodeRes.rows.length === 0) {
      console.log(`    (no rows)`);
    } else {
      invByCodeRes.rows.forEach((r) => {
        const code = String(r.code ?? '').trim().padStart(4, '0');
        const label = INVESTMENT_LABELS[code] || '';
        const cnt = parseInt(r.cnt ?? 0, 10);
        const total = parseFloat(r.total ?? 0);
        console.log(`    ${code}  ${(label || '(no label)').padEnd(40)}  ${String(cnt).padStart(6)} rows   £${total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      });
    }
  } catch (e) {
    console.log(`  Error querying ${TRANSACTIONS_TABLE}: ${e.message}`);
  }
}

async function main() {
  console.log('EBITA / Net Profit / Investment – Nominal code check (ENTIRE DATABASE – all tables with nominal_code column)');
  console.log('Scope: every table in the DB that has a nominal_code column (no single table or column filter).\n');

  try {
    const { dbCodes, tableStats } = await getDistinctNominalCodesInDb();
    const totalRows = tableStats.reduce((sum, t) => sum + t.rows, 0);

    if (tableStats.length === 0) {
      console.log('No tables with a nominal_code column found in the database.');
      await closePool();
      process.exit(1);
    }

    console.log(`Tables scanned: ${tableStats.length}`);
    tableStats.forEach((t) => {
      console.log(`  • ${t.name}: ${t.rows.toLocaleString()} rows, ${t.distinctCodes} distinct nominal_code(s)`);
    });
    console.log(`\nTotal rows (all tables): ${totalRows.toLocaleString()}`);
    console.log(`Distinct nominal_code values in entire DB: ${dbCodes.size}`);

    report('1. N/C\'s for EBITA', EBITA_CODES, dbCodes);
    report('2. N/C\'s for Net Profit (EBITA + extra)', NET_PROFIT_CODES, dbCodes);
    report('3. N/C\'s for Investment', INVESTMENT_CODES, dbCodes);

    // Authoritative: check against the transactions table the API uses (same table/schema)
    const txCodes = await getDistinctCodesFromTransactionsTable();
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  BASED ON TRANSACTIONS TABLE (API table): ${TRANSACTIONS_TABLE}`);
    console.log(`  Distinct nominal_code values: ${txCodes.size}`);
    console.log(`${'═'.repeat(60)}`);
    report('1. N/C\'s for EBITA (in transactions table)', EBITA_CODES, txCodes);
    report('2. N/C\'s for Net Profit (in transactions table)', NET_PROFIT_CODES, txCodes);
    report('3. N/C\'s for Investment (in transactions table)', INVESTMENT_CODES, txCodes);

    // Optional: list Investment codes with labels for missing (from transactions table)
    const invRequired = new Set(INVESTMENT_CODES.map(normalizeCode));
    const invMissing = INVESTMENT_CODES.map(normalizeCode).filter((c) => !txCodes.has(c));
    if (invMissing.length > 0) {
      console.log(`\n  Investment missing in transactions table (with labels):`);
      invMissing.forEach((c) => {
        console.log(`    ${c} – ${INVESTMENT_LABELS[c] || '(no label)'}`);
      });
    }

    // Codes in DB that are not in any of the three lists (informational)
    const allRequired = new Set([
      ...EBITA_CODES.map(normalizeCode),
      ...NET_PROFIT_CODES.map(normalizeCode),
      ...INVESTMENT_CODES.map(normalizeCode),
    ]);
    const extraInDb = [...dbCodes].filter((c) => !allRequired.has(c)).sort();
    if (extraInDb.length > 0) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`  Other N/C's in DB (not in EBITA/Net Profit/Investment lists): ${extraInDb.length}`);
      console.log(`  ${extraInDb.join(', ')}`);
    }

    // --- Data in transactions table (same table the API uses) ---
    await reportTransactionsTable();
    console.log('\nDone.\n');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
