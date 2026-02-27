/**
 * Test script: Fuel sales for November — simple SUM(amount), display as |SUM(amount)|.
 * Matches dashboard: revenue = |SUM(amount)| per nominal.
 *
 * Run from backend: node test-fuel-sales-nov.js
 * Optional: NOV_YEAR=2024 node test-fuel-sales-nov.js
 */

import { query, closePool } from './config/database.js';

const FUEL_CODES = ['4000', '4001', '4002', '4003', '4008'];

function getNovRange(year = 2025) {
  const startDate = `${year}-11-01`;
  const endDate = `${year}-11-30`;
  return { startDate, endDate, year };
}

async function run() {
  const year = parseInt(process.env.NOV_YEAR || '2025', 10);
  const { startDate, endDate } = getNovRange(year);

  try {
    const rows = await query(
      `SELECT nominal_code, amount FROM transactions
       WHERE nominal_code IN ($1, $2, $3, $4, $5)
         AND transaction_date >= $6::date AND transaction_date <= $7::date`,
      [...FUEL_CODES, startDate, endDate]
    );

    // Simple sum per code: SUM(amount), display as |SUM(amount)|
    const sumByCode = {};
    for (const code of FUEL_CODES) sumByCode[code] = 0;
    for (const r of rows.rows) {
      const amt = parseFloat(r.amount || 0);
      const code = r.nominal_code;
      sumByCode[code] = (sumByCode[code] || 0) + amt;
    }
    const byCode = {};
    let total = 0;
    for (const code of FUEL_CODES) {
      const raw = sumByCode[code] ?? 0;
      byCode[code] = Math.abs(raw);
      total += byCode[code];
    }

    const names = { '4000': 'Petrol', '4001': 'Diesel', '4002': 'Super Petrol', '4003': 'Super Diesel', '4008': 'AdBlue' };
    console.log('\n=== November fuel — |SUM(amount)| (same as dashboard) ===');
    console.log('Date range:', startDate, 'to', endDate);
    console.log('');
    for (const code of FUEL_CODES) {
      const val = byCode[code] ?? 0;
      console.log(code + '  ' + (names[code] || '').padEnd(14) + '  £' + val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
    console.log('---');
    console.log('Total                 £' + total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    console.log('');
  } catch (err) {
    console.error('Error:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

run();
