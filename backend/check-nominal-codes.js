/**
 * Check that nominal codes from All Nominal code.csv exist in the database (HSRL_sage_audit_journal).
 * Prints a detailed list of what IS in the DB and what is NOT, and writes a report file.
 * Run from backend: node check-nominal-codes.js
 */
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();

const TRANSACTIONS_TABLE = 'HSRL_sage_audit_journal';

// CSV path: repo root = HSRLDatabase, script = HSRL_ui/backend → ../../All Nominal code.csv
const CSV_PATH = join(__dirname, '..', '..', 'All Nominal code.csv');
// Detailed report output (in backend folder)
const REPORT_PATH = join(__dirname, 'nominal-codes-detail-report.md');

function loadNominalCodesFromCsv() {
  try {
    const content = readFileSync(CSV_PATH, 'utf8');
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    const codes = [];
    for (let i = 0; i < lines.length; i++) {
      if (i === 0 && lines[i].toUpperCase().startsWith('N/C')) continue; // skip header
      const line = lines[i];
      const firstComma = line.indexOf(',');
      const nc = firstComma >= 0 ? line.slice(0, firstComma).trim() : line.trim();
      const name = firstComma >= 0 ? line.slice(firstComma + 1).trim() : '';
      if (nc) codes.push({ nc, name });
    }
    return codes;
  } catch (e) {
    console.error('❌ Failed to read All Nominal code.csv:', e.message);
    console.error('   Expected path:', CSV_PATH);
    process.exit(1);
  }
}

async function checkNominalCodes() {
  let client;
  try {
    console.log('🔍 Checking nominal codes: All Nominal code.csv vs database\n');

    const csvCodes = loadNominalCodesFromCsv();
    const csvSet = new Set(csvCodes.map((c) => String(c.nc).trim()));
    console.log(`📄 Loaded ${csvCodes.length} nominal codes from All Nominal code.csv\n`);

    client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Check HSRL_sage_audit_journal exists and has nominal_code
    const tableCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name ILIKE '%nominal%'
    `, [TRANSACTIONS_TABLE]);

    if (tableCheck.rows.length === 0) {
      console.log(`⚠️  Table "${TRANSACTIONS_TABLE}" not found or has no nominal_code column.`);
      console.log('   Checking for tables with nominal_code...\n');
      const anyTable = await client.query(`
        SELECT table_schema, table_name
        FROM information_schema.columns
        WHERE column_name ILIKE '%nominal%'
        ORDER BY table_schema, table_name
      `);
      if (anyTable.rows.length > 0) {
        anyTable.rows.forEach((r) => console.log(`   - ${r.table_schema}.${r.table_name}`));
      }
      return;
    }

    const nominalCol = tableCheck.rows[0].column_name;
    console.log(`📋 Using table: ${TRANSACTIONS_TABLE}, column: ${nominalCol}\n`);

    // Get distinct nominal_code values from DB (normalise to string for comparison)
    const dbResult = await client.query(`
      SELECT DISTINCT TRIM(nominal_code::text) AS nc
      FROM ${TRANSACTIONS_TABLE}
      WHERE nominal_code IS NOT NULL AND TRIM(nominal_code::text) <> ''
      ORDER BY nc
    `);
    const dbCodes = dbResult.rows.map((r) => String(r.nc).trim());
    const dbSet = new Set(dbCodes);
    console.log(`🗄️  Found ${dbCodes.length} distinct nominal codes in database\n`);

    // Compare: CSV codes that ARE in DB
    const inBoth = csvCodes.filter((c) => dbSet.has(String(c.nc).trim()));
    // CSV codes that are NOT in DB
    const inCsvNotInDb = csvCodes.filter((c) => !dbSet.has(String(c.nc).trim()));
    // DB codes that are NOT in CSV
    const inDbNotInCsv = dbCodes.filter((nc) => !csvSet.has(nc));

    // ---- Console: summary and full lists ----
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`✅ IN DATABASE (${inBoth.length} codes) – These have transactions in ${TRANSACTIONS_TABLE}:\n`);
    inBoth.forEach((c) => console.log(`   ${String(c.nc).padEnd(6)}  ${c.name || ''}`));
    console.log('');

    console.log(`⚠️  NOT IN DATABASE (${inCsvNotInDb.length} codes) – In CSV but no transactions in ${TRANSACTIONS_TABLE}:\n`);
    inCsvNotInDb.forEach((c) => console.log(`   ${String(c.nc).padEnd(6)}  ${c.name || ''}`));
    console.log('');

    if (inDbNotInCsv.length > 0) {
      console.log(`📌 IN DB BUT NOT IN CSV (${inDbNotInCsv.length} codes):\n`);
      inDbNotInCsv.forEach((nc) => console.log(`   ${nc}`));
      console.log('');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`   CSV total:              ${csvCodes.length}`);
    console.log(`   DB distinct codes:      ${dbCodes.length}`);
    console.log(`   In DB (have data):      ${inBoth.length}`);
    console.log(`   Not in DB (no data):    ${inCsvNotInDb.length}`);
    console.log(`   In DB only (not in CSV): ${inDbNotInCsv.length}`);
    console.log('');

    // ---- Write detailed report file ----
    const report = [
      '# Nominal codes: All Nominal code.csv vs database',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Table: **${TRANSACTIONS_TABLE}** (column: nominal_code)`,
      '',
      '---',
      '',
      '## Summary',
      '',
      '| Description | Count |',
      '|-------------|-------|',
      `| Total codes in CSV (All Nominal code.csv) | ${csvCodes.length} |`,
      `| Distinct nominal codes in database | ${dbCodes.length} |`,
      `| **In database** (CSV codes that have transactions) | **${inBoth.length}** |`,
      `| **Not in database** (CSV codes with no transactions) | **${inCsvNotInDb.length}** |`,
      `| In DB but not in CSV | ${inDbNotInCsv.length} |`,
      '',
      '---',
      '',
      '## 1. IN DATABASE – nominal codes that HAVE transactions',
      '',
      'These codes from your CSV appear in `HSRL_sage_audit_journal` (at least one row each). The dashboard can show data for these.',
      '',
      '| N/C | Name |',
      '|-----|------|',
      ...inBoth.map((c) => `| ${c.nc} | ${(c.name || '').replace(/\|/g, '\\|')} |`),
      '',
      '---',
      '',
      '## 2. NOT IN DATABASE – nominal codes with NO transactions',
      '',
      'These codes are in All Nominal code.csv but do **not** appear in `HSRL_sage_audit_journal`. There are no transactions with these codes, so the dashboard will show £0 or no data for them.',
      '',
      '| N/C | Name |',
      '|-----|------|',
      ...inCsvNotInDb.map((c) => `| ${c.nc} | ${(c.name || '').replace(/\|/g, '\\|')} |`),
      '',
    ];
    if (inDbNotInCsv.length > 0) {
      report.push('---', '', '## 3. In DB but not in CSV', '', 'These nominal codes exist in the database but are not in your CSV.', '', inDbNotInCsv.map((nc) => `- ${nc}`).join('\n'), '');
    }
    report.push('', '---', '', '*Report generated by `check-nominal-codes.js`*');

    writeFileSync(REPORT_PATH, report.join('\n'), 'utf8');
    console.log(`📄 Detailed report written to: ${REPORT_PATH}\n`);
    if (inCsvNotInDb.length > 0) {
      console.log('💡 "Not in database" = no rows in HSRL_sage_audit_journal for that code; dashboard will show no data for them.');
    }
    console.log('✅ Check completed.\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error('   Code:', error.code);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

checkNominalCodes();
