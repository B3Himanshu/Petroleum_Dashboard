import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

/**
 * Script to check columns in transactions table
 */

async function checkTransactionsColumns() {
  let client;
  
  try {
    console.log('🔍 Checking transactions table columns...\n');
    
    client = await pool.connect();
    console.log('✅ Connected to database successfully!\n');
    
    // Get all columns from transactions table
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'transactions'
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(columnsQuery);
    
    console.log('📊 Transactions Table Columns:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    result.rows.forEach((col, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log(`\n✅ Total columns: ${result.rows.length}\n`);
    
    // Check for volume-related columns
    const volumeColumns = result.rows.filter(col => 
      col.column_name.toLowerCase().includes('volume') ||
      col.column_name.toLowerCase().includes('quantity') ||
      col.column_name.toLowerCase().includes('liter') ||
      col.column_name.toLowerCase().includes('fuel')
    );
    
    if (volumeColumns.length > 0) {
      console.log('📊 Volume/Quantity Related Columns:');
      volumeColumns.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('⚠️  No volume/quantity related columns found');
    }
    
    // Get sample data to see what fields are available
    console.log('\n📊 Sample Transaction Data (first row):');
    const sampleQuery = `SELECT * FROM transactions LIMIT 1;`;
    const sampleResult = await client.query(sampleQuery);
    
    if (sampleResult.rows.length > 0) {
      const sampleRow = sampleResult.rows[0];
      console.log('   Available fields:');
      Object.keys(sampleRow).forEach(key => {
        const value = sampleRow[key];
        const valueStr = value !== null && value !== undefined ? String(value).substring(0, 50) : 'null';
        console.log(`   - ${key}: ${valueStr}`);
      });
    }
    
    console.log('\n✅ Column check completed!\n');
    
  } catch (error) {
    console.error('❌ Error checking columns:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the check
checkTransactionsColumns();
