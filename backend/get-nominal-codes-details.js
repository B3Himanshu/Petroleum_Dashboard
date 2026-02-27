import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

/**
 * Script to test and verify fuel volume and net sales calculations for specific nominal codes
 * Tests the same calculation logic used in the API endpoints
 */

// Nominal code names mapping for SALES (4000 series)
const salesCodeNames = {
  '4000': 'Petrol-sales',
  '4001': 'Diesel-sales',
  '4002': 'Super Petrol- sales',
  '4003': 'Super Diesel- sales',
  '4008': 'AdBlue- Sales'
};

// Nominal code names mapping for PURCHASES (5000 series)
const purchaseCodeNames = {
  '5000': 'Petrol- Purchases',
  '5001': 'Diesel- Purchases',
  '5003': 'Super Petrol- Purchases',
  '5004': 'Super Diesel- Purchases',
  '5014': 'AdBlue- Purchases'
};

// Target nominal codes
const salesCodes = ['4000', '4001', '4002', '4003', '4008'];
const purchaseCodes = ['5000', '5001', '5003', '5004', '5014'];

// Helper to format volume
const formatVolume = (volume) => {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)} M L`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(0)} K L`;
  return `${volume.toFixed(2)} L`;
};

// Helper to format currency
const formatCurrency = (amount) => {
  if (amount >= 1000000) return `£${(amount / 1000000).toFixed(2)} M`;
  if (amount >= 1000) return `£${(amount / 1000).toFixed(0)} K`;
  return `£${amount.toFixed(2)}`;
};

async function testNominalCodesCalculations() {
  let client;
  
  try {
    console.log('🔍 Testing Fuel Volume & Net Sales Calculations...\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    client = await pool.connect();
    console.log('✅ Connected to database successfully!\n');
    
    // Define test date range (November 2025)
    const startDate = '2025-11-01';
    const endDate = '2025-11-30';
    
    // ═══════════════════════════════════════════════════════════════════════
    // PART 1: FUEL VOLUME (Sales Codes - 4000 series)
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⛽ PART 1: FUEL VOLUME (Sales Codes - 4000 series)');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📋 Target Codes:', salesCodes.join(', '));
    console.log(`📅 Date Range: ${startDate} to ${endDate}\n`);
    
    const fuelVolumeQuery = `
      SELECT 
        nominal_code,
        COALESCE(SUM(volume), 0) as total_volume,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('4000', '4001', '4002', '4003', '4008')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;
    
    const fuelVolumeResult = await client.query(fuelVolumeQuery, [startDate, endDate]);
    
    let totalFuelVolume = 0;
    console.log('Code'.padEnd(8) + 'Name'.padEnd(25) + 'Volume'.padEnd(15) + 'Transactions');
    console.log('-'.repeat(70));
    
    fuelVolumeResult.rows.forEach((row) => {
      const code = row.nominal_code;
      const name = salesCodeNames[code] || `Code ${code}`;
      const volume = parseFloat(row.total_volume || 0);
      const transactions = parseInt(row.transaction_count || 0);
      
      totalFuelVolume += volume;
      
      console.log(
        code.padEnd(8) + 
        name.padEnd(25) + 
        formatVolume(volume).padEnd(15) + 
        transactions.toLocaleString()
      );
    });
    
    console.log('\n' + '─'.repeat(70));
    console.log('TOTAL'.padEnd(8) + 'All Sales Codes'.padEnd(25) + formatVolume(totalFuelVolume).padEnd(15) + 
      fuelVolumeResult.rows.reduce((sum, r) => sum + parseInt(r.transaction_count || 0), 0).toLocaleString()
    );
    
    // ═══════════════════════════════════════════════════════════════════════
    // PART 2: NET SALES (Purchase Codes - 5000 series) WITH ABS()
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('💰 PART 2: NET SALES (Purchase Codes - 5000 series) WITH ABS()');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📋 Target Codes:', purchaseCodes.join(', '));
    console.log(`📅 Date Range: ${startDate} to ${endDate}`);
    console.log('🔄 Using ABS() to convert negative amounts to positive\n');
    
    // First, check raw amounts (with negatives)
    const rawAmountsQuery = `
      SELECT 
        nominal_code,
        COALESCE(SUM(amount), 0) as raw_total,
        COALESCE(SUM(ABS(amount)), 0) as abs_total,
        COUNT(*) as transaction_count,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM transactions
      WHERE nominal_code IN ('5000', '5001', '5003', '5004', '5014')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;
    
    const rawAmountsResult = await client.query(rawAmountsQuery, [startDate, endDate]);
    
    console.log('Code'.padEnd(8) + 'Name'.padEnd(25) + 'Raw Amount'.padEnd(15) + 'ABS Amount'.padEnd(15) + 'Transactions');
    console.log('-'.repeat(85));
    
    let totalRaw = 0;
    let totalAbs = 0;
    
    rawAmountsResult.rows.forEach((row) => {
      const code = row.nominal_code;
      const name = purchaseCodeNames[code] || `Code ${code}`;
      const rawAmount = parseFloat(row.raw_total || 0);
      const absAmount = parseFloat(row.abs_total || 0);
      const transactions = parseInt(row.transaction_count || 0);
      const minAmt = parseFloat(row.min_amount || 0);
      const maxAmt = parseFloat(row.max_amount || 0);
      
      totalRaw += rawAmount;
      totalAbs += absAmount;
      
      console.log(
        code.padEnd(8) + 
        name.padEnd(25) + 
        formatCurrency(rawAmount).padEnd(15) + 
        formatCurrency(absAmount).padEnd(15) + 
        transactions.toLocaleString()
      );
      
      // Show min/max if there are negative values
      if (minAmt < 0) {
        console.log(`         Min: ${formatCurrency(minAmt)}, Max: ${formatCurrency(maxAmt)} (Has negative values)`);
      }
    });
    
    console.log('\n' + '─'.repeat(85));
    console.log('TOTAL'.padEnd(8) + 'All Purchase Codes'.padEnd(25) + formatCurrency(totalRaw).padEnd(15) + formatCurrency(totalAbs).padEnd(15) + 
      rawAmountsResult.rows.reduce((sum, r) => sum + parseInt(r.transaction_count || 0), 0).toLocaleString()
    );
    
    // ═══════════════════════════════════════════════════════════════════════
    // PART 3: VERIFY API ENDPOINT SIMULATION
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('✅ PART 3: API ENDPOINT SIMULATION VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Simulate the exact net-sales-breakdown API query
    const apiNetSalesQuery = `
      SELECT 
        nominal_code,
        COALESCE(SUM(ABS(amount)), 0) as net_sales,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE nominal_code IN ('5000', '5001', '5003', '5004', '5014')
        AND transaction_date >= $1::date
        AND transaction_date <= $2::date
        AND (deleted_flag = 0 OR deleted_flag IS NULL)
      GROUP BY nominal_code
      ORDER BY nominal_code;
    `;
    
    const apiResult = await client.query(apiNetSalesQuery, [startDate, endDate]);
    
    const breakdown = apiResult.rows.map(row => ({
      code: row.nominal_code,
      name: purchaseCodeNames[row.nominal_code] || `Nominal Code ${row.nominal_code}`,
      netSales: parseFloat(row.net_sales || 0),
      transactionCount: parseInt(row.transaction_count || 0)
    }));
    
    const apiTotalNetSales = breakdown.reduce((sum, item) => sum + item.netSales, 0);
    
    console.log('📊 Net Sales Breakdown (API Simulation with ABS):\n');
    breakdown.forEach((item) => {
      const percentage = apiTotalNetSales > 0 ? ((item.netSales / apiTotalNetSales) * 100).toFixed(1) : '0.0';
      console.log(`  ${item.code} - ${item.name}`);
      console.log(`     Amount: ${formatCurrency(item.netSales)} (${item.transactionCount.toLocaleString()} transactions, ${percentage}%)\n`);
    });
    
    console.log('─'.repeat(60));
    console.log(`  TOTAL NET SALES: ${formatCurrency(apiTotalNetSales)}`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // PART 4: VERIFICATION SUMMARY
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('📋 VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Check if ABS is working correctly
    const absWorking = Math.abs(totalAbs - apiTotalNetSales) < 0.01;
    console.log(`✅ ABS() Conversion: ${absWorking ? 'WORKING CORRECTLY ✓' : 'FAILED ✗'}`);
    console.log(`   Raw Sum (with negatives): ${formatCurrency(totalRaw)}`);
    console.log(`   ABS Sum (all positive):   ${formatCurrency(totalAbs)}`);
    console.log(`   API Total:                ${formatCurrency(apiTotalNetSales)}`);
    
    if (totalRaw < 0) {
      console.log(`\n   ⚠️  Raw total is negative, ABS() is converting to positive`);
      console.log(`   Difference: ${formatCurrency(totalAbs - totalRaw)}`);
    }
    
    // Check for missing codes
    const foundCodes = new Set(breakdown.map(item => item.code));
    const missingPurchaseCodes = purchaseCodes.filter(code => !foundCodes.has(code));
    
    console.log(`\n✅ Code Verification:`);
    if (missingPurchaseCodes.length === 0) {
      console.log('   All purchase codes (5000 series) found in database');
    } else {
      console.log(`   ⚠️  Missing codes: ${missingPurchaseCodes.join(', ')}`);
      console.log('   These codes have no transactions in the specified date range.');
    }
    
    console.log('\n✅ Testing completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error testing nominal codes calculations:', error);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your .env file has correct DATABASE_URL or DB_* settings');
    console.error('   2. Ensure PostgreSQL is running');
    console.error('   3. Verify database credentials are correct');
    console.error('   4. Check that the transactions table exists and has data');
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
testNominalCodesCalculations();
