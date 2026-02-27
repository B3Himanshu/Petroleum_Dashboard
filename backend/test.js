import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

const run = async () => {
  console.log('=== sage_data Deep Database Discovery ===');
  console.log(`Host: 164.52.192.205 | DB: sage_data | User: amazon_user`);
  console.log('');

  try {
    // 1) Connectivity
    const ping = await pool.query('SELECT NOW() as now, version() as version;');
    console.log('DB connected');
    console.log(`   Time: ${ping.rows[0].now}`);
    console.log(`   Version: ${ping.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    console.log('');

    // =============================================
    // 2) TABLE INVENTORY
    // =============================================
    console.log('========================================');
    console.log('  TABLE INVENTORY');
    console.log('========================================');

    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Tables (${tables.length}): ${tables.join(', ')}\n`);

    for (const table of tables) {
      const colsRes = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      const cols = colsRes.rows;
      const countRes = await pool.query(`SELECT COUNT(*)::int as c FROM "${table}"`);
      const count = countRes.rows[0].c;

      console.log(`[${table}] ${count} rows`);
      console.log(`   Columns: ${cols.map(c => `${c.column_name} (${c.data_type})`).join(', ')}`);

      if (count > 0) {
        const sampleRes = await pool.query(`SELECT * FROM "${table}" LIMIT 2`);
        sampleRes.rows.forEach((row, i) => {
          const preview = {};
          for (const k of Object.keys(row)) {
            const v = row[k];
            preview[k] = v === null ? 'NULL' : typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : String(v).slice(0, 40);
          }
          console.log(`   Row ${i + 1}: ${JSON.stringify(preview)}`);
        });
      }
      console.log('');
    }

    // =============================================
    // 3) TRANSACTIONS DEEP DIVE
    // =============================================
    if (!tables.includes('transactions')) {
      console.log('transactions table NOT FOUND - skipping deep dive.\n');
    } else {
      console.log('========================================');
      console.log('  TRANSACTIONS DEEP DIVE');
      console.log('========================================\n');

      // 3a) Date range and month count
      const dateRes = await pool.query(`
        SELECT 
          COUNT(*)::int as total_rows,
          COUNT(DISTINCT date_trunc('month', transaction_date))::int as month_count,
          MIN(transaction_date::date) as min_date,
          MAX(transaction_date::date) as max_date,
          SUM(amount) as total_amount,
          SUM(ABS(amount)) as total_abs_amount
        FROM transactions
        WHERE transaction_date IS NOT NULL
      `);
      const dr = dateRes.rows[0];
      console.log('--- Date Range ---');
      console.log(`   Total rows: ${dr.total_rows}`);
      console.log(`   Date range: ${dr.min_date} to ${dr.max_date}`);
      console.log(`   Distinct months: ${dr.month_count}`);
      console.log(`   Total amount (signed): ${Number(dr.total_amount).toFixed(2)}`);
      console.log(`   Total amount (absolute): ${Number(dr.total_abs_amount).toFixed(2)}`);
      console.log('');

      // List all months
      const monthListRes = await pool.query(`
        SELECT DISTINCT to_char(date_trunc('month', transaction_date), 'YYYY-MM') as ym
        FROM transactions
        WHERE transaction_date IS NOT NULL
        ORDER BY 1
      `);
      console.log(`   Months: ${monthListRes.rows.map(r => r.ym).join(', ')}`);
      console.log('');

      // 3b) Nominal codes breakdown by category
      console.log('--- Nominal Codes by Category ---');

      const nominalRes = await pool.query(`
        SELECT 
          nominal_code,
          COUNT(*)::int as txn_count,
          SUM(amount) as total_signed,
          SUM(ABS(amount)) as total_abs,
          MIN(transaction_date::date) as min_date,
          MAX(transaction_date::date) as max_date
        FROM transactions
        GROUP BY nominal_code
        ORDER BY nominal_code
      `);

      // Group by category
      const categories = {
        'Fuel Sales (4000-4008)': [],
        'Fuel Purchases (5000-5014)': [],
        'Other Income (6100-6102)': [],
        'Labour (7000-7099)': [],
        'Overheads (7100-7999)': [],
        'Bank Accounts (1200-1299)': [],
        'Other': []
      };

      const nominalCodeNames = {
        '4000': 'Petrol', '4001': 'Diesel', '4002': 'Super Petrol',
        '4003': 'Super Diesel', '4008': 'AdBlue',
        '5000': 'Petrol Purchases', '5001': 'Diesel Purchases',
        '5003': 'Super Petrol Purchases', '5004': 'Super Diesel Purchases',
        '5014': 'AdBlue Purchases',
        '6100': 'Fuel Commissions / Shop Sales', '6101': 'Daily Facility Fees',
        '6102': 'Valeting Commissions',
        '7000': 'Gross Wages', '7006': 'Employers NI', '7007': 'Staff Pensions',
        '1200': 'PRL HSBC', '1223': 'Edmonton A/C', '1224': 'Lloyds Bank'
      };

      for (const row of nominalRes.rows) {
        const code = parseInt(row.nominal_code);
        const entry = {
          code: row.nominal_code,
          name: nominalCodeNames[row.nominal_code] || '',
          count: row.txn_count,
          totalSigned: Number(row.total_signed).toFixed(2),
          totalAbs: Number(row.total_abs).toFixed(2),
          minDate: row.min_date,
          maxDate: row.max_date
        };

        if (code >= 4000 && code <= 4008) categories['Fuel Sales (4000-4008)'].push(entry);
        else if (code >= 5000 && code <= 5014) categories['Fuel Purchases (5000-5014)'].push(entry);
        else if (code >= 6100 && code <= 6102) categories['Other Income (6100-6102)'].push(entry);
        else if (code >= 7000 && code < 7100) categories['Labour (7000-7099)'].push(entry);
        else if (code >= 7100 && code < 8000) categories['Overheads (7100-7999)'].push(entry);
        else if (code >= 1200 && code < 1300) categories['Bank Accounts (1200-1299)'].push(entry);
        else categories['Other'].push(entry);
      }

      for (const [category, entries] of Object.entries(categories)) {
        if (entries.length === 0) continue;
        const catTotal = entries.reduce((sum, e) => sum + Math.abs(parseFloat(e.totalSigned)), 0);
        const catCount = entries.reduce((sum, e) => sum + e.count, 0);
        console.log(`\n   ${category} (${catCount} txns, total abs: ${catTotal.toFixed(2)})`);
        for (const e of entries) {
          const label = e.name ? `${e.code} (${e.name})` : e.code;
          console.log(`      ${label}: ${e.count} txns | signed: ${e.totalSigned} | abs: ${e.totalAbs} | ${e.minDate} to ${e.maxDate}`);
        }
      }
      console.log('');

      // 3c) Dept numbers breakdown (likely maps to sites)
      console.log('--- Department Numbers (likely site mapping) ---');
      const deptRes = await pool.query(`
        SELECT 
          dept_number,
          COUNT(*)::int as txn_count,
          SUM(ABS(amount)) as total_abs,
          COUNT(DISTINCT nominal_code)::int as distinct_codes,
          MIN(transaction_date::date) as min_date,
          MAX(transaction_date::date) as max_date
        FROM transactions
        GROUP BY dept_number
        ORDER BY dept_number
      `);
      console.log(`   Distinct dept_numbers: ${deptRes.rows.length}`);
      for (const row of deptRes.rows) {
        console.log(`      Dept ${row.dept_number}: ${row.txn_count} txns | abs amount: ${Number(row.total_abs).toFixed(2)} | ${row.distinct_codes} nominal codes | ${row.min_date} to ${row.max_date}`);
      }
      console.log('');

      // 3d) Cross-tab: dept_number x nominal code category summary
      console.log('--- Dept x Category Summary (top 10 dept by amount) ---');
      const crossRes = await pool.query(`
        SELECT 
          dept_number,
          CASE
            WHEN nominal_code::int >= 4000 AND nominal_code::int <= 4008 THEN 'Fuel Sales'
            WHEN nominal_code::int >= 5000 AND nominal_code::int <= 5014 THEN 'Fuel Purchases'
            WHEN nominal_code::int >= 6100 AND nominal_code::int <= 6102 THEN 'Other Income'
            WHEN nominal_code::int >= 7000 AND nominal_code::int < 7100 THEN 'Labour'
            WHEN nominal_code::int >= 7100 AND nominal_code::int < 8000 THEN 'Overheads'
            WHEN nominal_code::int >= 1200 AND nominal_code::int < 1300 THEN 'Bank'
            ELSE 'Other'
          END as category,
          COUNT(*)::int as txn_count,
          SUM(ABS(amount)) as total_abs
        FROM transactions
        GROUP BY dept_number, category
        ORDER BY dept_number, category
      `);

      // Group by dept
      const deptMap = {};
      for (const row of crossRes.rows) {
        if (!deptMap[row.dept_number]) deptMap[row.dept_number] = {};
        deptMap[row.dept_number][row.category] = {
          count: row.txn_count,
          amount: Number(row.total_abs).toFixed(2)
        };
      }

      // Sort by total amount and show top 10
      const deptsSorted = Object.entries(deptMap)
        .map(([dept, cats]) => ({
          dept,
          totalAmt: Object.values(cats).reduce((s, c) => s + parseFloat(c.amount), 0),
          cats
        }))
        .sort((a, b) => b.totalAmt - a.totalAmt)
        .slice(0, 10);

      for (const { dept, totalAmt, cats } of deptsSorted) {
        console.log(`      Dept ${dept} (total: ${totalAmt.toFixed(2)}):`);
        for (const [cat, data] of Object.entries(cats)) {
          console.log(`         ${cat}: ${data.count} txns, ${data.amount}`);
        }
      }
      console.log('');

      // 3e) Monthly totals by category
      console.log('--- Monthly Totals by Category ---');
      const monthlyRes = await pool.query(`
        SELECT 
          to_char(date_trunc('month', transaction_date), 'YYYY-MM') as month,
          CASE
            WHEN nominal_code::int >= 4000 AND nominal_code::int <= 4008 THEN 'Fuel Sales'
            WHEN nominal_code::int >= 5000 AND nominal_code::int <= 5014 THEN 'Fuel Purchases'
            WHEN nominal_code::int >= 6100 AND nominal_code::int <= 6102 THEN 'Other Income'
            WHEN nominal_code::int >= 7000 AND nominal_code::int < 7100 THEN 'Labour'
            WHEN nominal_code::int >= 7100 AND nominal_code::int < 8000 THEN 'Overheads'
            WHEN nominal_code::int >= 1200 AND nominal_code::int < 1300 THEN 'Bank'
            ELSE 'Other'
          END as category,
          COUNT(*)::int as txn_count,
          SUM(amount) as total_signed,
          SUM(ABS(amount)) as total_abs
        FROM transactions
        WHERE transaction_date IS NOT NULL
        GROUP BY month, category
        ORDER BY month, category
      `);

      const monthMap = {};
      for (const row of monthlyRes.rows) {
        if (!monthMap[row.month]) monthMap[row.month] = {};
        monthMap[row.month][row.category] = {
          count: row.txn_count,
          signed: Number(row.total_signed).toFixed(2),
          abs: Number(row.total_abs).toFixed(2)
        };
      }

      for (const [month, cats] of Object.entries(monthMap).sort()) {
        const monthTotal = Object.values(cats).reduce((s, c) => s + parseFloat(c.abs), 0);
        console.log(`   ${month} (total abs: ${monthTotal.toFixed(2)}):`);
        for (const [cat, data] of Object.entries(cats)) {
          console.log(`      ${cat}: ${data.count} txns | signed: ${data.signed} | abs: ${data.abs}`);
        }
      }
      console.log('');
    }

    // =============================================
    // 4) CHART_OF_ACCOUNTS CHECK
    // =============================================
    if (tables.includes('chart_of_accounts')) {
      console.log('========================================');
      console.log('  CHART_OF_ACCOUNTS');
      console.log('========================================');
      const coaCount = await pool.query(`SELECT COUNT(*)::int as c FROM chart_of_accounts`);
      console.log(`   Rows: ${coaCount.rows[0].c}`);
      if (coaCount.rows[0].c > 0) {
        const coaAll = await pool.query(`SELECT * FROM chart_of_accounts ORDER BY nominal_code LIMIT 20`);
        for (const row of coaAll.rows) {
          console.log(`      ${row.nominal_code}: ${row.account_name} [${row.account_category || 'N/A'}]`);
        }
      } else {
        console.log('   (empty - no account mappings)');
      }
      console.log('');
    }

    // =============================================
    // 5) DEPARTMENTS CHECK
    // =============================================
    if (tables.includes('departments')) {
      console.log('========================================');
      console.log('  DEPARTMENTS');
      console.log('========================================');
      const deptCount = await pool.query(`SELECT COUNT(*)::int as c FROM departments`);
      console.log(`   Rows: ${deptCount.rows[0].c}`);
      if (deptCount.rows[0].c > 0) {
        const deptAll = await pool.query(`SELECT * FROM departments ORDER BY dept_number LIMIT 30`);
        for (const row of deptAll.rows) {
          console.log(`      Dept ${row.dept_number}: ${row.dept_name} (active: ${row.is_active})`);
        }
      } else {
        console.log('   (empty - no department mappings)');
      }
      console.log('');
    }

    // =============================================
    // 6) EXCEL LOGIC CODES - WHICH EXIST IN DB?
    // =============================================
    const EXCEL_CODE_GROUPS = {
      'Fuel Sales': ['4000','4001','4002','4003','4008'],
      'Fuel + Other Income': ['4000','4001','4002','4003','4008','4011','4400','4901','4904','4907','6101','6102'],
      'Total Labour Cost': ['7000','7006','7007'],
      'Overheads N/C': ['7103','7100','7200','7801','7905'],
      'ROI Section': ['4014','4902','4906','5015','7105','7803','7907']
    };

    if (tables.includes('transactions')) {
      console.log('========================================');
      console.log('  EXCEL LOGIC CODES - PRESENCE IN DB');
      console.log('========================================');
      const codesInDbRes = await pool.query(`
        SELECT nominal_code, COUNT(*)::int as txn_count, SUM(ABS(amount)) as total_abs
        FROM transactions
        GROUP BY nominal_code
      `);
      const dbCodes = new Map(codesInDbRes.rows.map(r => [String(r.nominal_code).trim(), r]));

      for (const [groupName, codes] of Object.entries(EXCEL_CODE_GROUPS)) {
        const found = codes.filter(c => dbCodes.has(c));
        const missing = codes.filter(c => !dbCodes.has(c));
        console.log(`\n   ${groupName}:`);
        if (found.length > 0) {
          for (const c of found) {
            const r = dbCodes.get(c);
            console.log(`      ${c}: YES - ${r.txn_count} txns, abs: ${Number(r.total_abs).toFixed(2)}`);
          }
        }
        if (missing.length > 0) {
          console.log(`      MISSING: ${missing.join(', ')}`);
        }
        if (found.length === 0) console.log(`      (none of these codes exist in DB)`);
      }
      console.log('');
    }

    // =============================================
    // 7) NOMINAL CODES NOT IN ALLOWED LIST
    // =============================================
    const ALLOWED_NOMINAL_CODES = new Set([
      '5000','5001','5003','5004','5007','5012','5014','5100','5102','5200',
      '6100','7000','7001','7006','7007','7099','7100','7102','7103','7104',
      '7200','7300','7301','7302','7303','7305','7306','7400','7402','7403',
      '7500','7501','7502','7503','7550','7551','7552','7600','7601','7602',
      '7603','7604','7605','7606','7607','7700','7702','7752','7800','7801',
      '7802','7804','7901','7903','7905','8001','8002','8003','8004','8005',
      '8006','8009','8200','8201','8204','8207','8250','8251','9000','9001','9999'
    ]);

    if (tables.includes('transactions')) {
      console.log('========================================');
      console.log('  NOMINAL CODES NOT IN ALLOWED LIST');
      console.log('========================================');
      const allCodesRes = await pool.query(`
        SELECT nominal_code, COUNT(*)::int as txn_count, SUM(ABS(amount)) as total_abs
        FROM transactions
        GROUP BY nominal_code
        ORDER BY nominal_code
      `);
      const notAllowed = allCodesRes.rows.filter(r => !ALLOWED_NOMINAL_CODES.has(String(r.nominal_code).trim()));
      const notAllowedCodes = notAllowed.map(r => r.nominal_code);
      const notAllowedCount = notAllowed.reduce((s, r) => s + r.txn_count, 0);
      const notAllowedAmount = notAllowed.reduce((s, r) => s + parseFloat(r.total_abs), 0);

      if (notAllowed.length === 0) {
        console.log('   (none - all codes are in the allowed list)');
      } else {
        console.log(`   ${notAllowed.length} codes | ${notAllowedCount} txns | total abs: ${notAllowedAmount.toFixed(2)}`);
        console.log(`   Codes: ${notAllowedCodes.join(', ')}`);
        for (const r of notAllowed) {
          console.log(`      ${r.nominal_code}: ${r.txn_count} txns | abs: ${Number(r.total_abs).toFixed(2)}`);
        }
      }
      console.log('');
    }

    // =============================================
    // 8) SUMMARY
    // =============================================
    console.log('========================================');
    console.log('  SUMMARY');
    console.log('========================================');
    for (const table of tables) {
      const countRes = await pool.query(`SELECT COUNT(*)::int as c FROM "${table}"`);
      console.log(`   ${table}: ${countRes.rows[0].c} rows`);
    }

    if (tables.includes('transactions')) {
      const summRes = await pool.query(`
        SELECT 
          COUNT(DISTINCT nominal_code)::int as distinct_codes,
          COUNT(DISTINCT dept_number)::int as distinct_depts,
          COUNT(DISTINCT date_trunc('month', transaction_date))::int as distinct_months
        FROM transactions
      `);
      const s = summRes.rows[0];
      console.log(`\n   Transactions summary:`);
      console.log(`      Distinct nominal codes: ${s.distinct_codes}`);
      console.log(`      Distinct departments: ${s.distinct_depts}`);
      console.log(`      Distinct months: ${s.distinct_months}`);
    }

    console.log('\nDatabase discovery complete.');
  } catch (error) {
    console.error('\nFailed:', error.message);
    if (error.code) console.error(`   code: ${error.code}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
