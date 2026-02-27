import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

/**
 * Script to check if daily transaction data is available in the database
 * Specifically checks for transactions within a date range
 */

async function checkDailyTransactionData() {
  let client;
  
  try {
    console.log('🔍 Checking for daily transaction data...\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    client = await pool.connect();
    console.log('✅ Connected to database successfully!\n');
    
    // Check if transaction_date column exists and has data
    console.log('📊 TRANSACTIONS WITH DATES:');
    console.log('─────────────────────────────────────────────────────────────');
    const transactionCheckQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT transaction_date) as distinct_dates,
        MIN(transaction_date) as earliest_date,
        MAX(transaction_date) as latest_date,
        COUNT(CASE WHEN transaction_date IS NULL THEN 1 END) as null_dates
      FROM transactions
      WHERE (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1);
    `;
    
    const result = await client.query(transactionCheckQuery);
    const data = result.rows[0];
    
    console.log(`Total Records:        ${data.total_records.toLocaleString()}`);
    console.log(`Distinct Dates:       ${data.distinct_dates.toLocaleString()}`);
    console.log(`Null/Missing Dates:   ${data.null_dates.toLocaleString()}`);
    console.log(`Earliest Date:        ${data.earliest_date ? new Date(data.earliest_date).toDateString() : 'N/A'}`);
    console.log(`Latest Date:          ${data.latest_date ? new Date(data.latest_date).toDateString() : 'N/A'}\n`);
    
    if (data.distinct_dates > 0) {
      console.log('✅ Daily transaction data IS AVAILABLE!\n');
    } else {
      console.log('❌ NO daily transaction data found!\n');
    }
    
    // Check specific date range (November 2025 as example)
    console.log('📅 CHECKING NOVEMBER 2025 TRANSACTIONS:');
    console.log('─────────────────────────────────────────────────────────────');
    const novemberQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT transaction_date) as distinct_dates,
        MIN(transaction_date) as earliest_date,
        MAX(transaction_date) as latest_date
      FROM transactions
      WHERE transaction_date >= '2025-11-01'::date
        AND transaction_date <= '2025-11-30'::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
        AND site_code NOT IN (0, 1);
    `;
    
    const novResult = await client.query(novemberQuery);
    const novData = novResult.rows[0];
    
    console.log(`Total Records:        ${novData.total_records.toLocaleString()}`);
    console.log(`Distinct Dates:       ${novData.distinct_dates.toLocaleString()}`);
    console.log(`Date Range:           ${novData.earliest_date ? new Date(novData.earliest_date).toDateString() : 'N/A'} to ${novData.latest_date ? new Date(novData.latest_date).toDateString() : 'N/A'}\n`);
    
    // Sample daily breakdown
    if (novData.distinct_dates > 0) {
      console.log('📊 DAILY BREAKDOWN FOR NOVEMBER 2025:');
      console.log('─────────────────────────────────────────────────────────────');
      const dailyBreakdownQuery = `
        SELECT 
          DATE(transaction_date) as date,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT CASE WHEN nominal_code IN ('4000', '4001', '4002', '4003', '4008') THEN 1 END) as fuel_sales_count,
          COUNT(DISTINCT CASE WHEN nominal_code IN ('5000', '5001', '5003', '5004', '5014') THEN 1 END) as fuel_purchases_count,
          SUM(CASE WHEN nominal_code IN ('4000', '4001', '4002', '4003', '4008') THEN ABS(amount) ELSE 0 END) as fuel_sales,
          SUM(CASE WHEN nominal_code IN ('5000', '5001', '5003', '5004', '5014') THEN ABS(amount) ELSE 0 END) as fuel_purchases
        FROM transactions
        WHERE transaction_date >= '2025-11-01'::date
          AND transaction_date <= '2025-11-30'::date
          AND (deleted_flag = 0 OR deleted_flag IS NULL)
          AND site_code NOT IN (0, 1)
        GROUP BY DATE(transaction_date)
        ORDER BY date
        LIMIT 10;
      `;
      
      const dailyResult = await client.query(dailyBreakdownQuery);
      
      console.log(`Date        | Transactions | Sales | Purchases | Revenue`);
      console.log('─────────────────────────────────────────────────────────────');
      dailyResult.rows.forEach(row => {
        const dateStr = new Date(row.date).toISOString().split('T')[0];
        const revenue = parseFloat(row.fuel_sales || 0).toFixed(2);
        console.log(`${dateStr} | ${row.transaction_count.toString().padEnd(12)} | ${row.fuel_sales_count.toString().padEnd(5)} | ${row.fuel_purchases_count.toString().padEnd(9)} | £${revenue}`);
      });
      
      if (dailyResult.rows.length > 0) {
        console.log('\n✅ Daily transaction data exists for November 2025!');
      }
    } else {
      console.log('❌ No transactions found for November 2025!');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Daily data check complete!\n');
    
  } catch (error) {
    console.error('❌ Error checking daily data:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the script
checkDailyTransactionData();
