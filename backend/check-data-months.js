/**
 * Check available months of data in transactions table
 */
import 'dotenv/config';
import { query } from './config/database.js';

(async () => {
  const r = await query(`
    SELECT 
      COUNT(*)::int as total_rows,
      MIN(transaction_date::date) as min_date,
      MAX(transaction_date::date) as max_date,
      COUNT(DISTINCT date_trunc('month', transaction_date))::int as month_count
    FROM transactions
    WHERE transaction_date IS NOT NULL
  `);
  const row = r.rows[0];
  console.log('Transactions:', row.total_rows);
  console.log('Date range:', row.min_date, 'to', row.max_date);
  console.log('Distinct months:', row.month_count);

  const monthsRes = await query(`
    SELECT 
      to_char(date_trunc('month', transaction_date), 'YYYY-MM') as ym,
      COUNT(*)::int as cnt,
      MIN(transaction_date::date) as min_d,
      MAX(transaction_date::date) as max_d
    FROM transactions
    WHERE transaction_date IS NOT NULL
    GROUP BY date_trunc('month', transaction_date)
    ORDER BY ym
  `);
  console.log('\nMonths with data:');
  monthsRes.rows.forEach(m => console.log(`  ${m.ym}: ${m.cnt} txns (${m.min_d} to ${m.max_d})`));
})();
