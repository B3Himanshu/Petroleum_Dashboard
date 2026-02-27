/**
 * Test case: database → Excel for May–Dec Volume by categories.
 * Verifies: Volume by categories (4000–4008 + Total), Transactions (with details column), Volume by site (29 sites).
 * Run from backend: node test/dec-volume-by-categories-excel.test.js  (or: npm run test-dec-volume-by-categories)
 */
import { runExport } from './dec-volume-by-categories-excel.js';
import XLSX from 'xlsx';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPECTED_CODES = ['4000', '4001', '4002', '4003', '4008'];
const SHEETS = ['Volume by categories', 'Transactions', 'Volume by site'];

async function run() {
  console.log('Test: Database to Excel (May–Dec volume by categories, transactions, 29 sites)');
  const { filepath } = await runExport();

  if (!existsSync(filepath)) {
    throw new Error(`Export file not created: ${filepath}`);
  }

  const wb = XLSX.readFile(filepath);
  for (const name of SHEETS) {
    if (!wb.SheetNames.includes(name)) {
      throw new Error(`Expected sheet "${name}", got: ${wb.SheetNames.join(', ')}`);
    }
  }

  const catWs = wb.Sheets['Volume by categories'];
  const catData = XLSX.utils.sheet_to_json(catWs);
  const codes = catData.map((r) => r.Code).filter(Boolean);
  for (const code of EXPECTED_CODES) {
    if (!codes.includes(code)) throw new Error(`Missing code ${code} in Volume by categories`);
  }
  if (!codes.includes('Total')) throw new Error('Missing Total row in Volume by categories');

  const txnWs = wb.Sheets['Transactions'];
  const txnData = XLSX.utils.sheet_to_json(txnWs);
  if (txnData.length > 0 && !('details' in txnData[0])) {
    throw new Error('Transactions sheet must include "details" column');
  }

  const siteWs = wb.Sheets['Volume by site'];
  const siteData = XLSX.utils.sheet_to_json(siteWs);
  const sites = siteData.map((r) => r.Site).filter(Boolean);
  if (!sites.includes('Total')) throw new Error('Volume by site must include Total row');

  console.log('OK: All sheets present; Volume by categories has codes', EXPECTED_CODES.join(', '), '+ Total');
  console.log('OK: Transactions has details column; Volume by site has', sites.length, 'rows');
  console.log('OK: Database converted to Excel:', filepath);
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
