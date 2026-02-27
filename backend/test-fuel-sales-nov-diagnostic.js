/**
 * Diagnostic: Why Petrol (4000) and Diesel (4001) show less than "real" by 120.87 and 367.49.
 * Checks: sign handling, SUM(ABS) vs actual formula, row counts, and amounts near the difference.
 *
 * Run from backend: node test-fuel-sales-nov-diagnostic.js
 * Optional: NOV_YEAR=2025 node test-fuel-sales-nov-diagnostic.js
 */

import { query, closePool } from './config/database.js';

const startDate = '2025-11-01';
const endDate = '2025-11-30';

async function run() {
  try {
    // 1) Per-nominal: SQL aggregates (sum_neg, sum_pos, sum_abs, sum_raw, counts)
    const agg = await query(
      `SELECT nominal_code,
         COUNT(*) AS row_count,
         COUNT(*) FILTER (WHERE amount > 0)  AS cnt_positive,
         COUNT(*) FILTER (WHERE amount < 0)  AS cnt_negative,
         COUNT(*) FILTER (WHERE amount = 0)  AS cnt_zero,
         COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) AS sum_positive,
         COALESCE(SUM(amount) FILTER (WHERE amount <= 0), 0) AS sum_negative,
         COALESCE(SUM(ABS(amount)), 0) AS sum_abs,
         COALESCE(SUM(amount), 0) AS sum_raw
       FROM transactions
       WHERE nominal_code IN ('4000','4001')
         AND transaction_date >= $1::date AND transaction_date <= $2::date
       GROUP BY nominal_code
       ORDER BY nominal_code`,
      [startDate, endDate]
    );

    const names = { '4000': 'Petrol', '4001': 'Diesel' };
    console.log('\n=== November 2025: 4000 Petrol & 4001 Diesel — SQL aggregates ===\n');
    console.log('Date range:', startDate, 'to', endDate);

    for (const r of agg.rows) {
      const code = r.nominal_code;
      const sumPos = parseFloat(r.sum_positive || 0);
      const sumNeg = parseFloat(r.sum_negative || 0);
      const sumAbs = parseFloat(r.sum_abs || 0);
      const sumRaw = parseFloat(r.sum_raw || 0);
      const actual = Math.abs(sumNeg) + sumPos;

      console.log('\n' + code + ' ' + (names[code] || ''));
      console.log('  Rows: total=' + r.row_count + ', positive=' + r.cnt_positive + ', negative=' + r.cnt_negative + ', zero=' + r.cnt_zero);
      console.log('  Sum(amount WHERE amount > 0)  = £' + sumPos.toLocaleString('en-GB', { minimumFractionDigits: 2 }));
      console.log('  Sum(amount WHERE amount <= 0) = £' + sumNeg.toLocaleString('en-GB', { minimumFractionDigits: 2 }));
      console.log('  |sum_negative| + sum_positive (actual) = £' + actual.toLocaleString('en-GB', { minimumFractionDigits: 2 }));
      console.log('  SUM(ABS(amount))               = £' + sumAbs.toLocaleString('en-GB', { minimumFractionDigits: 2 }));
      console.log('  SUM(amount) raw                = £' + sumRaw.toLocaleString('en-GB', { minimumFractionDigits: 2 }));

      if (Math.abs(actual - sumAbs) > 0.01) {
        console.log('  *** MISMATCH: actual vs SUM(ABS) differ by £' + (sumAbs - actual).toFixed(2));
      }
    }

    // 2) Our script formula (row-by-row) — should match SQL actual
    const rows = await query(
      `SELECT nominal_code, amount FROM transactions
       WHERE nominal_code IN ('4000','4001')
         AND transaction_date >= $1::date AND transaction_date <= $2::date`,
      [startDate, endDate]
    );

    const sumNeg = { '4000': 0, '4001': 0 };
    const sumPos = { '4000': 0, '4001': 0 };
    for (const r of rows.rows) {
      const amt = parseFloat(r.amount || 0);
      const code = r.nominal_code;
      if (amt <= 0) sumNeg[code] += amt;
      else sumPos[code] += amt;
    }

    console.log('\n=== Script formula (JS row-by-row) ===');
    for (const code of ['4000', '4001']) {
      const actual = Math.abs(sumNeg[code]) + sumPos[code];
      console.log(code + ' ' + (names[code] || '') + ': actual = £' + actual.toLocaleString('en-GB', { minimumFractionDigits: 2 }));
    }

    // 3) Amounts near the "missing" differences (120.87 and 367.49) — could be one txn or several
    const near = await query(
      `SELECT nominal_code, amount, id, transaction_date
       FROM transactions
       WHERE nominal_code IN ('4000','4001')
         AND transaction_date >= $1::date AND transaction_date <= $2::date
         AND (ABS(amount) BETWEEN 100 AND 400 OR ABS(amount) BETWEEN 115 AND 125 OR ABS(amount) BETWEEN 360 AND 375)
       ORDER BY nominal_code, amount`,
      [startDate, endDate]
    );

    console.log('\n=== Transactions with amount between 100–400 or near 120.87 / 367.49 ===');
    if (near.rows.length === 0) {
      console.log('  (none found in that range)');
    } else {
      for (const r of near.rows) {
        console.log('  ' + r.nominal_code + '  id=' + r.id + '  date=' + r.transaction_date + '  amount=' + r.amount);
      }
    }

    // 4) Small positive amounts for 4000 and 4001 (might be excluded if wrongly treated as negative?)
    const smallPos = await query(
      `SELECT nominal_code, amount, id, transaction_date
       FROM transactions
       WHERE nominal_code IN ('4000','4001')
         AND transaction_date >= $1::date AND transaction_date <= $2::date
         AND amount > 0 AND amount < 500
       ORDER BY nominal_code, amount`,
      [startDate, endDate]
    );

    console.log('\n=== All small POSITIVE amounts (0 < amount < 500) ===');
    if (smallPos.rows.length === 0) {
      console.log('  (none)');
    } else {
      let sum4000 = 0, sum4001 = 0;
      for (const r of smallPos.rows) {
        const amt = parseFloat(r.amount);
        if (r.nominal_code === '4000') sum4000 += amt;
        else sum4001 += amt;
        console.log('  ' + r.nominal_code + '  id=' + r.id + '  date=' + r.transaction_date + '  amount=' + r.amount);
      }
      console.log('  Sum small positive 4000: £' + sum4000.toFixed(2) + '  4001: £' + sum4001.toFixed(2));
    }

    // 5) If "real" uses SUM(ABS) and we use actual — they must be equal for same rows. So show SUM(ABS) again vs expected "real"
    console.log('\n=== Expected "real" (if your source uses SUM(ABS)) ===');
    for (const r of agg.rows) {
      const code = r.nominal_code;
      const sumAbs = parseFloat(r.sum_abs || 0);
      const sumPos = parseFloat(r.sum_positive || 0);
      const sumNeg = parseFloat(r.sum_negative || 0);
      const actual = Math.abs(sumNeg) + sumPos;
      const diff = sumAbs - actual;
      console.log(code + ' ' + (names[code] || '') + ': SUM(ABS)=£' + sumAbs.toFixed(2) + ', our actual=£' + actual.toFixed(2) + ', diff=£' + diff.toFixed(2));
    }

    // 6) November 4000 & 4001 — Simple SUM(amount) (no ABS)
    console.log('\n=== November 4000 & 4001 — Simple SUM(amount) (no ABS) ===');
    for (const r of agg.rows) {
      const code = r.nominal_code;
      const sumRaw = parseFloat(r.sum_raw || 0);
      const sumAbs = parseFloat(r.sum_abs || 0);
      const asRevenue = Math.abs(sumRaw); // display as positive revenue
      console.log(code + ' ' + (names[code] || ''));
      console.log('  SUM(amount)        = £' + sumRaw.toLocaleString('en-GB', { minimumFractionDigits: 2 }));
      console.log('  |SUM(amount)|      = £' + asRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 }) + '  (use as revenue if simple sum)');
      console.log('  SUM(ABS(amount))   = £' + sumAbs.toLocaleString('en-GB', { minimumFractionDigits: 2 }));
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
