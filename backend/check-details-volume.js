/**
 * Diagnostic: Why isn't volume coming from transaction details properly?
 * Run: node check-details-volume.js
 * Checks: sample details content, parseable volume count, and key names used.
 */

import { query, closePool } from './config/database.js';

const startDate = '2025-11-01';
const endDate = '2025-11-30';

async function run() {
  try {
    const r = await query(`
      SELECT id, nominal_code, transaction_date, amount, details
      FROM transactions
      WHERE nominal_code IN ('4000','4001','4002','4003','4008')
        AND transaction_date >= $1::date AND transaction_date <= $2::date
      ORDER BY id
      LIMIT 200
    `, [startDate, endDate]);

    const rows = r.rows || [];
    console.log('\n=== Transaction details diagnostic (Nov 2025, fuel codes, limit 200) ===\n');
    console.log('Total rows:', rows.length);

    let withDetails = 0;
    let withVolumeParsed = 0;
    const sampleDetails = [];
    const keySet = new Set();

    for (const row of rows) {
      const d = row.details;
      if (d != null && String(d).trim() !== '') {
        withDetails++;
        if (sampleDetails.length < 10) sampleDetails.push({ id: row.id, details: d });
        try {
          const parsed = JSON.parse(String(d));
          if (parsed && typeof parsed === 'object') {
            Object.keys(parsed).forEach(k => keySet.add(k));
            const v = parsed.volume ?? parsed.quantity ?? parsed.litres ?? parsed.Volume ?? parsed.Quantity;
            if (v !== undefined && v !== null) {
              const num = typeof v === 'number' ? v : parseFloat(v);
              if (!Number.isNaN(num) && num > 0) withVolumeParsed++;
            }
          }
        } catch (_) {}
      }
    }

    console.log('Rows with non-empty details:', withDetails);
    console.log('Rows with parseable volume (volume/quantity/litres/Volume/Quantity):', withVolumeParsed);
    console.log('Keys seen in details JSON:', [...keySet].sort().join(', ') || '(none)');
    console.log('\nSample details (first few):');
    sampleDetails.forEach((s, i) => {
      console.log(`\n--- Sample ${i + 1} (id=${s.id}) ---`);
      const str = String(s.details);
      console.log(str.length > 500 ? str.substring(0, 500) + '...' : str);
    });

    if (rows.length > 0 && withDetails === 0) {
      console.log('\n⚠️  No rows have non-empty details — volume cannot come from details.');
    } else if (withDetails > 0 && withVolumeParsed === 0) {
      console.log('\n⚠️  Details exist but no volume found in keys: volume, quantity, litres, Volume, Quantity.');
      console.log('   Add the actual key names from the samples above to parseVolumeFromDetails.');
    }

    console.log('\n');
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

run();
