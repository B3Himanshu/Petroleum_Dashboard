import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

/**
 * Test script to verify the fuel volume query
 */

async function testFuelVolumeQuery() {
  let client;
  
  try {
    console.log('🔍 Testing fuel volume query...\n');
    
    client = await pool.connect();
    console.log('✅ Connected to database successfully!\n');
    
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';
    const nominalCodes = ['4000', '4001', '4002', '4003', '4008'];
    
    console.log('📊 Test Parameters:');
    console.log(`   Start Date: ${startDate}`);
    console.log(`   End Date: ${endDate}`);
    console.log(`   Nominal Codes: ${nominalCodes.join(', ')}\n`);
    
    // Test the exact query from the route
    const fuelVolumeQuery = `
      SELECT 
        COALESCE(SUM(volume), 0) as total_fuel_volume
      FROM transactions
      WHERE nominal_code IN ('4000', '4001', '4002', '4003', '4008')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL);
    `;
    
    console.log('📋 Executing query...');
    console.log('Query:', fuelVolumeQuery);
    console.log('Params:', [startDate, endDate]);
    console.log('');
    
    const result = await client.query(fuelVolumeQuery, [startDate, endDate]);
    
    const totalFuelVolume = parseFloat(result.rows[0]?.total_fuel_volume || 0);
    
    console.log('✅ Query executed successfully!');
    console.log('📊 Results:');
    console.log(`   Total Fuel Volume: ${totalFuelVolume}`);
    console.log(`   Raw result:`, result.rows[0]);
    
    // Also check how many records match
    const countQuery = `
      SELECT COUNT(*) as record_count
      FROM transactions
      WHERE nominal_code IN ('4000', '4001', '4002', '4003', '4008')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL);
    `;
    
    const countResult = await client.query(countQuery, [startDate, endDate]);
    const recordCount = parseInt(countResult.rows[0]?.record_count || 0);
    console.log(`   Matching Records: ${recordCount}`);
    
    // Check sample records
    if (recordCount > 0) {
      const sampleQuery = `
        SELECT 
          id,
          nominal_code,
          transaction_date,
          volume,
          amount,
          category
        FROM transactions
        WHERE nominal_code IN ('4000', '4001', '4002', '4003', '4008')
          AND transaction_date >= $1::date
          AND transaction_date <= $2::date
          AND (deleted_flag = 0 OR deleted_flag IS NULL)
        LIMIT 5;
      `;
      
      const sampleResult = await client.query(sampleQuery, [startDate, endDate]);
      console.log(`\n📋 Sample Records (first 5):`);
      sampleResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ID: ${row.id}, Code: ${row.nominal_code}, Date: ${row.transaction_date}, Volume: ${row.volume}, Amount: ${row.amount}`);
      });
    }
    
    console.log('\n✅ Test completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error testing query:', error);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    console.error('Error hint:', error.hint);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the test
testFuelVolumeQuery();
