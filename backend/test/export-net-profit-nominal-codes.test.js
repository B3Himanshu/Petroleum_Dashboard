/**
 * Test: export Net Profit nominal codes to Excel.
 * Runs the export and checks the output file has all 82 codes + header + total row.
 *
 * Run: npm run test:export-net-profit
 * Or: node test/export-net-profit-nominal-codes.test.js
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { run } from '../export-net-profit-nominal-codes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NET_PROFIT_COUNT = 82;

function main() {
  console.log('Test: Export Net Profit nominal codes to Excel\n');
  return run()
    .then((filepath) => {
      const buf = readFileSync(filepath);
      const wb = XLSX.read(buf, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      if (sheetName !== 'Net Profit by NC') throw new Error(`Expected sheet "Net Profit by NC", got "${sheetName}"`);
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const header = data[0];
      if (!header || header[0] !== 'Nominal_Code' || header[1] !== 'Name' || header[2] !== 'Value') {
        throw new Error(`Expected header [Nominal_Code, Name, Value], got ${JSON.stringify(header)}`);
      }
      const codeRows = data.slice(1, 1 + NET_PROFIT_COUNT);
      if (codeRows.length !== NET_PROFIT_COUNT) {
        throw new Error(`Expected ${NET_PROFIT_COUNT} nominal code rows, got ${codeRows.length}`);
      }
      const codes = codeRows.map((r) => String(r[0]).trim());
      const uniqueCodes = [...new Set(codes)];
      if (uniqueCodes.length !== NET_PROFIT_COUNT) {
        throw new Error(`Expected ${NET_PROFIT_COUNT} unique codes, got ${uniqueCodes.length}`);
      }
      const totalRow = data[1 + NET_PROFIT_COUNT];
      if (!totalRow || totalRow[1] !== 'TOTAL (Net Profit)') {
        throw new Error('Expected TOTAL (Net Profit) row after code rows');
      }
      if (!wb.SheetNames.includes('By Month')) {
        throw new Error('Expected "By Month" sheet with month-wise data');
      }
      console.log('✅ Test passed:');
      console.log('   - Sheet "Net Profit by NC" present');
      console.log('   - Sheet "By Month" (month-wise) present');
      console.log('   - Header: Nominal_Code, Name, Value');
      console.log('   - Rows: ' + codeRows.length + ' nominal codes');
      console.log('   - TOTAL row: present');
      console.log('   - File: ' + filepath);
    });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  });
