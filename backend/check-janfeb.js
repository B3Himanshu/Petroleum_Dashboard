import 'dotenv/config';
import { query } from './config/database.js';

(async () => {
  const r = await query(`
    SELECT nominal_code, COUNT(*) as cnt, SUM(ABS(amount)) as total
    FROM transactions
    WHERE transaction_date >= $1::date AND transaction_date <= $2::date
    GROUP BY nominal_code ORDER BY nominal_code
  `, ['2025-01-01', '2025-02-28']);
  console.log('Jan-Feb 2025 by nominal_code:');
  r.rows.forEach(row => console.log(row.nominal_code, row.cnt, parseFloat(row.total).toFixed(2)));
  
  const other = await query(`
    SELECT COALESCE(SUM(ABS(amount)),0) as t FROM transactions
    WHERE nominal_code IN ('6100','6101','6102') AND transaction_date >= $1::date AND transaction_date <= $2::date
  `, ['2025-01-01', '2025-02-28']);
  console.log('\nOther Income (6100,6101,6102) total:', other.rows[0].t);
})();
