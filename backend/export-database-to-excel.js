/**
 * Export ALL database data to Excel – every table, every column, every row.
 * Uses config/database.js. Run: npm run export-db
 * Output: backend/exports/database-export-YYYY-MM-DD-HHmmss.xlsx
 *
 * Transactions: by default exports May–Dec (1 May to 31 Dec of EXPORT_TRANSACTIONS_YEAR, default 2025).
 * Override with env: EXPORT_TRANSACTIONS_START + EXPORT_TRANSACTIONS_END (YYYY-MM-DD), or
 * EXPORT_TRANSACTIONS_MONTH (1–12) for a single month.
 * Column order puts "details" (fuel volume text) in a consistent position. Supports multiple schemas (e.g. sage_data).
 */
import { query } from './config/database.js';
import XLSX from 'xlsx';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, 'exports');

// Schemas to export (comma-separated). Default: public and sage_data so transactions with details are included.
const EXPORT_SCHEMAS = (process.env.EXPORT_SCHEMAS || 'public,sage_data').split(',').map((s) => s.trim()).filter(Boolean);
// Optional cap per table (e.g. 1048576 for Excel). Unset = export all rows.
const MAX_ROWS = parseInt(process.env.MAX_ROWS_PER_TABLE || '0', 10);
// Transactions date range. Options (in order):
// 1) EXPORT_TRANSACTIONS_START + EXPORT_TRANSACTIONS_END (YYYY-MM-DD) – export only that range
// 2) EXPORT_TRANSACTIONS_MONTH (1–12) + optional EXPORT_TRANSACTIONS_YEAR – export only that month
// 3) Default: May–Dec (1 May to 31 Dec of EXPORT_TRANSACTIONS_YEAR)
const EXPORT_YEAR = parseInt(process.env.EXPORT_TRANSACTIONS_YEAR || '2025', 10);
const EXPORT_MONTH = process.env.EXPORT_TRANSACTIONS_MONTH ? parseInt(process.env.EXPORT_TRANSACTIONS_MONTH, 10) : null;
function getTransactionsDateRange() {
  if (process.env.EXPORT_TRANSACTIONS_START && process.env.EXPORT_TRANSACTIONS_END) {
    return { start: process.env.EXPORT_TRANSACTIONS_START, end: process.env.EXPORT_TRANSACTIONS_END };
  }
  if (EXPORT_MONTH >= 1 && EXPORT_MONTH <= 12) {
    const start = `${EXPORT_YEAR}-${String(EXPORT_MONTH).padStart(2, '0')}-01`;
    const lastDay = new Date(EXPORT_YEAR, EXPORT_MONTH, 0).getDate();
    const end = `${EXPORT_YEAR}-${String(EXPORT_MONTH).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }
  // Default: May to Dec (all data for those months)
  return { start: `${EXPORT_YEAR}-05-01`, end: `${EXPORT_YEAR}-12-31` };
}
const TRANSACTIONS_DATE_RANGE = getTransactionsDateRange();

if (!existsSync(EXPORTS_DIR)) {
  mkdirSync(EXPORTS_DIR, { recursive: true });
}

const timestamp = () => {
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
};

function rowToObject(row, options = {}) {
  const { keyOrder, stringifyDetails } = options;
  const keys = keyOrder || Object.keys(row);
  const obj = {};
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
    let v = row[key];
    if (key === 'details' && stringifyDetails) {
      obj[key] = v == null ? '' : String(v);
      continue;
    }
    if (v instanceof Date) obj[key] = v.toISOString();
    else if (v && typeof v === 'object' && typeof v.toISOString === 'function') obj[key] = v.toISOString();
    else obj[key] = v;
  }
  return obj;
}

/** Get (schema, table_name) for all tables in the configured schemas */
async function getAllTableNames() {
  if (!EXPORT_SCHEMAS.length) {
    const res = await query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `);
    return (res.rows || []).map((r) => ({ schema: r.table_schema, tableName: r.table_name }));
  }
  const placeholders = EXPORT_SCHEMAS.map((_, i) => `$${i + 1}`).join(',');
  const res = await query(
    `SELECT table_schema, table_name
     FROM information_schema.tables
     WHERE table_schema IN (${placeholders})
       AND table_type = 'BASE TABLE'
     ORDER BY table_schema, table_name`,
    EXPORT_SCHEMAS
  );
  return (res.rows || []).map((r) => ({ schema: r.table_schema, tableName: r.table_name }));
}

/** Get column names for a table in order (prefer: id, nominal_code, dept_number, transaction_date, amount, details, created_at, then rest) */
async function getTableColumns(schema, tableName) {
  const res = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [schema, tableName]
  );
  const all = (res.rows || []).map((r) => r.column_name);
  if (tableName !== 'transactions' || !all.length) return all;
  const preferred = ['id', 'nominal_code', 'dept_number', 'transaction_date', 'amount', 'details', 'created_at'];
  const ordered = [];
  for (const col of preferred) {
    if (all.includes(col)) ordered.push(col);
  }
  for (const col of all) {
    if (!ordered.includes(col)) ordered.push(col);
  }
  return ordered;
}

async function getTableRows(schema, tableName) {
  const schemaQuoted = `"${schema.replace(/"/g, '""')}"`;
  const tableQuoted = `"${tableName.replace(/"/g, '""')}"`;
  const fullName = `${schemaQuoted}.${tableQuoted}`;
  try {
    const columns = await getTableColumns(schema, tableName);
    if (!columns.length) {
      console.warn(`  ${fullName}: no columns found`);
      return [];
    }
    const limitClause = MAX_ROWS > 0 ? ` LIMIT ${MAX_ROWS}` : '';
    const columnList = columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');
    const isTransactions = tableName === 'transactions';
    const hasTransactionDate = columns.some((c) => c.toLowerCase() === 'transaction_date');
    let sql;
    let params = [];
    if (isTransactions && hasTransactionDate && TRANSACTIONS_DATE_RANGE) {
      sql = `SELECT ${columnList} FROM ${fullName} WHERE "transaction_date" >= $1::date AND "transaction_date" <= $2::date${limitClause}`;
      params = [TRANSACTIONS_DATE_RANGE.start, TRANSACTIONS_DATE_RANGE.end];
    } else {
      sql = `SELECT ${columnList} FROM ${fullName}${limitClause}`;
    }
    const res = await query(sql, params);
    const keyOrder = columns;
    const rows = (res.rows || []).map((row) => rowToObject(row, { keyOrder, stringifyDetails: isTransactions }));
    const capped = MAX_ROWS > 0 && rows.length >= MAX_ROWS;
    const dateInfo = isTransactions && hasTransactionDate
      ? (TRANSACTIONS_DATE_RANGE ? ` (${TRANSACTIONS_DATE_RANGE.start} to ${TRANSACTIONS_DATE_RANGE.end})` : ' (all dates)')
      : '';
    console.log(`  ${fullName}: ${rows.length} rows${dateInfo}${capped ? ` (capped at ${MAX_ROWS})` : ''}`);
    return rows;
  } catch (err) {
    console.warn(`  ${fullName}: failed - ${err.message}`);
    return [];
  }
}

async function run() {
  console.log('Exporting entire database to Excel...');
  console.log(`Schemas: ${EXPORT_SCHEMAS.length ? EXPORT_SCHEMAS.join(', ') : 'public'}`);
  console.log(`Transactions: ${TRANSACTIONS_DATE_RANGE ? `${TRANSACTIONS_DATE_RANGE.start} to ${TRANSACTIONS_DATE_RANGE.end}` : 'all dates (no filter)'}\n`);

  const tables = await getAllTableNames();
  if (!tables.length) {
    console.log('No tables found in selected schema(s).');
    process.exit(0);
    return;
  }

  console.log(`Tables: ${tables.map((t) => (t.schema !== 'public' ? `${t.schema}.${t.tableName}` : t.tableName)).join(', ')}\n`);

  const wb = XLSX.utils.book_new();
  const sheetNamesUsed = new Set();

  for (const { schema, tableName } of tables) {
    const rows = await getTableRows(schema, tableName);
    let sheetName = tableName;
    if (schema !== 'public') {
      sheetName = `${schema}_${tableName}`;
    }
    sheetName = sheetName.substring(0, 31);
    if (sheetNamesUsed.has(sheetName)) {
      sheetName = `${sheetName.slice(0, 28)}_${schema.slice(0, 2)}`;
    }
    sheetNamesUsed.add(sheetName);

    if (rows.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['(empty)']]), sheetName);
      if (tableName === 'transactions') {
        const sheet5200 = `5200_Stock_Movement${schema !== 'public' ? `_${schema}` : ''}`.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['(no 5200 rows in this period)']]), sheet5200);
      }
      continue;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Add 5200-only sheet when exporting transactions so you can verify 5200 data exists or not
    if (tableName === 'transactions') {
      const rows5200 = rows.filter((r) => String(r.nominal_code ?? '').trim() === '5200');
      const sheet5200 = `5200_Stock_Movement${schema !== 'public' ? `_${schema}` : ''}`.substring(0, 31);
      if (rows5200.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['(no 5200 rows in this period)']]), sheet5200);
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows5200), sheet5200);
      }
      console.log(`  5200_Stock_Movement: ${rows5200.length} rows`);
    }
  }

  const filename = `database-export-${timestamp()}.xlsx`;
  const filepath = join(EXPORTS_DIR, filename);
  XLSX.writeFile(wb, filepath);

  console.log(`\nDone. File: ${filepath}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
