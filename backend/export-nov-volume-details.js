/**
 * Export November 2025 fuel transactions with details + parsed volume for debugging.
 * Compares UI total (sum of parseVolumeFromDetails) vs real total (9,254,576.65 L).
 * Run: node export-nov-volume-details.js
 * Output: backend/exports/nov-2025-volume-details-YYYY-MM-DD-HHmmss.xlsx
 */
import { query } from './config/database.js';
import XLSX from 'xlsx';
import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORTS_DIR = join(__dirname, 'exports');

const NOV_START = '2025-11-01';
const NOV_END = '2025-11-30';
const FUEL_CODES = ['4000', '4001', '4002', '4003', '4008'];
const REAL_TOTAL_L = 9254576.65; // expected / real total (L)

if (!existsSync(EXPORTS_DIR)) {
  mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Same logic as petrolDataSage.js parseVolumeFromDetails (must stay in sync). Segments split by | ; or newline.
function parseVolumeFromDetails(details) {
  if (details == null || details === '') return NaN;
  const s = String(details).trim();
  if (!s) return NaN;

  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === 'object') {
        const v =
          parsed.volume ?? parsed.quantity ?? parsed.litres ?? parsed.Volume ?? parsed.Quantity
          ?? parsed.volume_sold ?? parsed.VolumeSold ?? parsed.litres_sold ?? parsed.qty ?? parsed.Qty
          ?? parsed.amount_litres ?? parsed.litre ?? parsed.Litre ?? parsed.sales_volume ?? parsed.salesVolume
          ?? (parsed.data && (parsed.data.volume ?? parsed.data.quantity ?? parsed.data.litres));
        if (v !== undefined && v !== null) {
          if (typeof v === 'number' && !Number.isNaN(v)) return v;
          if (typeof v === 'string') return parseFloat(v.replace(/,/g, '')) || NaN;
        }
      }
    } catch (_) { /* invalid JSON */ }
    return NaN;
  }

  if (s.includes(',')) {
    const byComma = s.split(',');
    const afterLastComma = byComma[byComma.length - 1].trim();
    const labelMatch = afterLastComma.match(/(?:sales\s*volume|volume)\s*[:\s]*(\d+(?:[.,]\d+)*)/i);
    if (labelMatch) {
      const v = parseFloat(labelMatch[1].replace(/,/g, ''));
      if (!Number.isNaN(v) && v > 0) return v;
    }
    const num = parseFloat(afterLastComma.replace(/,/g, ''));
    if (typeof num === 'number' && !Number.isNaN(num) && num > 0) return num;
  }

  if (s.includes('/')) {
    let total = 0;
    const segments = s.split(/\s*[\|;\n\r]+\s*/);
    for (const seg of segments) {
      const lastSlash = seg.lastIndexOf('/');
      if (lastSlash !== -1) {
        const afterSlash = seg.slice(lastSlash + 1).trim();
        const num = parseFloat(afterSlash.replace(/,/g, ''));
        if (typeof num === 'number' && !Number.isNaN(num)) total += num;
      }
    }
    return total;
  }

  return NaN;
}

/** Parse details and return { total, positiveSum, negativeSum } for slash-format (breakdown; UI uses total = positive + negative). */
function parseVolumeBreakdown(details) {
  const out = { total: 0, positiveSum: 0, negativeSum: 0 };
  if (details == null || details === '') return out;
  const s = String(details).trim();
  if (!s || !s.includes('/')) return out;
  const segments = s.split(/\s*[\|;\n\r]+\s*/);
  for (const seg of segments) {
    const lastSlash = seg.lastIndexOf('/');
    if (lastSlash !== -1) {
      const afterSlash = seg.slice(lastSlash + 1).trim();
      const num = parseFloat(afterSlash.replace(/,/g, ''));
      if (typeof num === 'number' && !Number.isNaN(num)) {
        out.total += num;
        if (num >= 0) out.positiveSum += num;
        else out.negativeSum += num;
      }
    }
  }
  return out;
}

/** Try public then sage_data so we hit the same table as the app */
async function getNovemberFuelRows() {
  const schemas = ['public', 'sage_data'];
  for (const schema of schemas) {
    try {
      const sql = `
        SELECT id, nominal_code, dept_number, transaction_date, amount, details
        FROM "${schema.replace(/"/g, '""')}"."transactions"
        WHERE nominal_code IN ($1, $2, $3, $4, $5)
          AND transaction_date >= $6::date AND transaction_date <= $7::date
        ORDER BY id
      `;
      const res = await query(sql, [...FUEL_CODES, NOV_START, NOV_END]);
      if (res.rows && res.rows.length > 0) {
        return { schema, rows: res.rows };
      }
    } catch (_) {
      continue;
    }
  }
  try {
    const res = await query(
      `SELECT id, nominal_code, dept_number, transaction_date, amount, details
       FROM transactions
       WHERE nominal_code IN ($1, $2, $3, $4, $5)
         AND transaction_date >= $6::date AND transaction_date <= $7::date
       ORDER BY id`,
      [...FUEL_CODES, NOV_START, NOV_END]
    );
    return { schema: 'default', rows: res.rows || [] };
  } catch (e) {
    throw e;
  }
}

function timestamp() {
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
}

async function run() {
  console.log('Fetching November 2025 fuel transactions (details + parsed volume)...\n');

  const { schema, rows } = await getNovemberFuelRows();
  console.log(`Schema: ${schema}, rows: ${rows.length}`);

  const data = [];
  let sumParsed = 0;
  let sumPositiveOnly = 0;
  let sumNegativeOnly = 0;
  let noVolumeCount = 0;
  const noVolumeRows = [];
  const byNominal = {}; // nominal_code -> { rowCount, total, positiveSum, negativeSum }

  for (const row of rows) {
    const parsed = parseVolumeFromDetails(row.details);
    const breakdown = parseVolumeBreakdown(row.details);
    const isNum = typeof parsed === 'number' && !Number.isNaN(parsed);
    if (isNum) {
      sumParsed += parsed;
      sumPositiveOnly += breakdown.positiveSum;
      sumNegativeOnly += breakdown.negativeSum;
    } else noVolumeCount++;
    if (!isNum && row.details != null && String(row.details).trim()) noVolumeRows.push({ id: row.id, details: row.details });

    const code = String(row.nominal_code || '');
    if (!byNominal[code]) byNominal[code] = { rowCount: 0, total: 0, positiveSum: 0, negativeSum: 0 };
    byNominal[code].rowCount++;
    if (isNum) {
      byNominal[code].total += parsed;
      byNominal[code].positiveSum += breakdown.positiveSum;
      byNominal[code].negativeSum += breakdown.negativeSum;
    }

    data.push({
      id: row.id,
      nominal_code: row.nominal_code,
      dept_number: row.dept_number,
      transaction_date: row.transaction_date instanceof Date ? row.transaction_date.toISOString().slice(0, 10) : row.transaction_date,
      amount: row.amount,
      details: row.details == null ? '' : String(row.details),
      parsed_volume: isNum ? parsed : '',
      positive_volume: breakdown.positiveSum || '',
      negative_volume: breakdown.negativeSum !== 0 ? breakdown.negativeSum : '',
    });
  }

  const diff = REAL_TOTAL_L - sumParsed;
  const diffVsPositiveOnly = REAL_TOTAL_L - sumPositiveOnly;
  console.log(`Sum of parsed_volume (UI logic): ${sumParsed.toFixed(2)} L`);
  console.log(`  = positive only:              ${sumPositiveOnly.toFixed(2)} L`);
  console.log(`  + negative (subtracted):     ${sumNegativeOnly.toFixed(2)} L`);
  console.log(`Real total:                      ${REAL_TOTAL_L.toFixed(2)} L`);
  console.log(`Difference (UI vs real):         ${diff.toFixed(2)} L (${diff > 0 ? 'UI under' : 'UI over'})`);
  console.log(`If real = positive-only, diff:   ${diffVsPositiveOnly.toFixed(2)} L`);
  console.log(`Rows with no parsed volume:      ${noVolumeCount}`);
  console.log('\nBy nominal_code:');
  for (const code of FUEL_CODES) {
    const n = byNominal[code];
    if (n) console.log(`  ${code}: rows=${n.rowCount}, total=${n.total.toFixed(2)}, positive=${n.positiveSum.toFixed(2)}, negative=${n.negativeSum.toFixed(2)}`);
  }

  const summary = [
    { metric: 'November period', value: `${NOV_START} to ${NOV_END}` },
    { metric: 'Row count', value: rows.length },
    { metric: 'Sum parsed volume (UI) L', value: sumParsed.toFixed(2) },
    { metric: 'Sum positive only L', value: sumPositiveOnly.toFixed(2) },
    { metric: 'Sum negative (subtracted) L', value: sumNegativeOnly.toFixed(2) },
    { metric: 'Real total L', value: REAL_TOTAL_L.toFixed(2) },
    { metric: 'Difference L', value: diff.toFixed(2) },
    { metric: 'Rows with no volume parsed', value: noVolumeCount },
  ];

  const byNominalRows = FUEL_CODES.map((code) => {
    const n = byNominal[code] || { rowCount: 0, total: 0, positiveSum: 0, negativeSum: 0 };
    return {
      nominal_code: code,
      row_count: n.rowCount,
      total_volume: n.total.toFixed(2),
      positive_only: n.positiveSum.toFixed(2),
      negative_subtracted: n.negativeSum.toFixed(2),
    };
  });

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, wsData, 'Nov2025_details');

  const wsSummary = XLSX.utils.json_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const wsByNominal = XLSX.utils.json_to_sheet(byNominalRows);
  XLSX.utils.book_append_sheet(wb, wsByNominal, 'By_nominal_code');

  if (noVolumeRows.length > 0) {
    const wsNoVol = XLSX.utils.json_to_sheet(noVolumeRows.map((r) => ({ id: r.id, details: r.details })));
    XLSX.utils.book_append_sheet(wb, wsNoVol, 'Rows_no_volume_parsed');
  }

  const filename = `nov-2025-volume-details-${timestamp()}.xlsx`;
  const filepath = join(EXPORTS_DIR, filename);
  XLSX.writeFile(wb, filepath);

  console.log(`\nDone. File: ${filepath}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
