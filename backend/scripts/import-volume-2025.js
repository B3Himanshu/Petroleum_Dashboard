/**
 * Import script: Fuel_Sale_Combined (2).xlsx → HSRL_volumne_2025 table
 * Run: node scripts/import-volume-2025.js
 * Safe: only touches HSRL_volumne_2025, no other tables affected.
 */

import XLSX from 'xlsx';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = join(__dirname, '../../volumne/Fuel_Sale_Combined (2).xlsx');

// Sheet name → dept_number (matches HSRL_sage_audit_journal dept_number)
const SHEET_TO_DEPT = {
  'Amersham Service Station':  15,
  'Erith Service Station':     18,
  'Anson Service Station':      1,
  'Astwick Service Station':    6,
  'Belgrave Service Station':   2,
  'Park Royal Station':        13,
  'Gravesend Service Station': 14,
  'Patcham Service Station':   11,
  'Girton Service Station':    10,
  'Wexham Service Station':     8,
  'Vineyard Service Station':   7,
  'Lye Service Station':        9,
  'Swanley Service Station':    5,
  'Baddesley Service Station':  4,
};

// Valid fuel nominal codes
const VALID_NOMINAL_CODES = new Set(['4000', '4001', '4002', '4003', '4004']);

/**
 * Parse date string like "1/1/2025" or "31/12/2025" → "YYYY-MM-DD"
 */
function parseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const parts = s.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Parse one sheet and return array of records
 */
function parseSheet(sheetName, ws) {
  const deptNumber = SHEET_TO_DEPT[sheetName];
  if (deptNumber === undefined) {
    console.warn(`  ⚠️  No dept mapping for sheet: ${sheetName}`);
    return [];
  }

  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const records = [];
  let i = 0;

  while (i < data.length) {
    const row = data[i];
    if (!row || !row[0]) { i++; continue; }

    // Detect header row: col0 = 'Fuel Type', col1 = 'Nominal Code'
    if (String(row[0]).trim() === 'Fuel Type' && String(row[1] || '').trim() === 'Nominal Code') {
      // Build date column map — last column is "Total", skip it
      const dateCols = [];
      for (let c = 2; c < row.length; c++) {
        const val = row[c];
        if (!val || String(val).trim().toLowerCase() === 'total') continue;
        const dateStr = parseDate(val);
        if (dateStr) dateCols.push({ col: c, date: dateStr });
      }

      i++;
      // Read fuel rows until blank row or next section header
      while (i < data.length) {
        const fuelRow = data[i];
        if (!fuelRow || !fuelRow[0] || String(fuelRow[0]).trim() === '') break;
        if (String(fuelRow[0]).includes('StockLoss') || String(fuelRow[0]).trim() === 'Fuel Type') break;

        const fuelType  = String(fuelRow[0]).trim();
        const nominalRaw = String(fuelRow[1] || '').trim();
        const nominalCode = nominalRaw.split(' ')[0].trim(); // "4000 - Petrol Unleaded" → "4000"

        // Skip non-fuel rows (Other, Total)
        if (fuelType === 'Other' || fuelType === 'Total' || !VALID_NOMINAL_CODES.has(nominalCode)) {
          i++; continue;
        }

        for (const { col, date } of dateCols) {
          const raw = fuelRow[col];
          const vol = typeof raw === 'number' ? raw : parseFloat(String(raw || '0').replace(/,/g, ''));
          if (!isNaN(vol) && vol > 0) {
            records.push({
              dept_number:   deptNumber,
              site_name:     sheetName,
              nominal_code:  nominalCode,
              fuel_type:     fuelType,
              sale_date:     date,
              volume_litres: vol,
            });
          }
        }
        i++;
      }
    } else {
      i++;
    }
  }

  return records;
}

/**
 * Batch insert records into HSRL_volumne_2025
 */
async function insertBatch(records) {
  if (!records.length) return;
  const BATCH = 500;
  for (let start = 0; start < records.length; start += BATCH) {
    const batch = records.slice(start, start + BATCH);
    const values = batch.map((_, i) => {
      const base = i * 6;
      return `($${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6})`;
    }).join(', ');
    const params = batch.flatMap(r => [
      r.dept_number,
      r.site_name,
      r.nominal_code,
      r.fuel_type,
      r.sale_date,
      r.volume_litres,
    ]);
    await query(
      `INSERT INTO HSRL_volumne_2025 (dept_number, site_name, nominal_code, fuel_type, sale_date, volume_litres)
       VALUES ${values}`,
      params
    );
  }
}

async function main() {
  console.log('📂 Reading Excel:', EXCEL_PATH);
  const wb = XLSX.readFile(EXCEL_PATH);
  console.log(`📋 Sheets found: ${wb.SheetNames.length}`);

  // Clear existing data to avoid duplicates on re-run
  console.log('\n🗑️  Clearing existing HSRL_volumne_2025 data...');
  await query('DELETE FROM HSRL_volumne_2025');
  console.log('   Done.\n');

  let totalRecords = 0;

  for (const sheetName of wb.SheetNames) {
    const dept = SHEET_TO_DEPT[sheetName];
    const ws   = wb.Sheets[sheetName];
    console.log(`📊 Processing: ${sheetName} → dept_number ${dept ?? '???'}`);

    const records = parseSheet(sheetName, ws);
    console.log(`   Parsed ${records.length} daily records`);

    await insertBatch(records);
    console.log(`   ✅ Inserted`);
    totalRecords += records.length;
  }

  // Verify
  const countRes = await query('SELECT COUNT(*) as cnt FROM HSRL_volumne_2025');
  console.log(`\n✅ Import complete! Total rows in DB: ${countRes.rows[0].cnt}`);
  console.log(`   Total records processed: ${totalRecords}`);

  // Summary by site
  const summary = await query(`
    SELECT dept_number, site_name,
           COUNT(*) as rows,
           SUM(volume_litres) as total_litres,
           MIN(sale_date) as from_date,
           MAX(sale_date) as to_date
    FROM HSRL_volumne_2025
    GROUP BY dept_number, site_name
    ORDER BY dept_number
  `);
  console.log('\n📊 Summary by site:');
  summary.rows.forEach(r => {
    console.log(`   Dept ${r.dept_number} | ${r.site_name} | ${r.rows} rows | ${Number(r.total_litres).toLocaleString()} L | ${r.from_date} → ${r.to_date}`);
  });

  process.exit(0);
}

main().catch(e => {
  console.error('❌ Import failed:', e.message);
  process.exit(1);
});
