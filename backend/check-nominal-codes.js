import dotenv from 'dotenv';
import pool from './config/database.js';

dotenv.config();

/**
 * Script to check for nominal codes in the database
 */

async function checkNominalCodes() {
  let client;
  
  try {
    console.log('🔍 Connecting to database to check for nominal codes...\n');
    
    client = await pool.connect();
    console.log('✅ Connected to database successfully!\n');
    
    // Step 1: List all tables to find potential nominal code tables
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 STEP 1: Finding all tables in database');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const tablesQuery = `
      SELECT 
        table_schema,
        table_name
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name;
    `;
    const tablesResult = await client.query(tablesQuery);
    const allTables = tablesResult.rows.map(row => ({
      schema: row.table_schema,
      name: row.table_name,
      fullName: `${row.table_schema}.${row.table_name}`
    }));
    
    console.log(`✅ Found ${allTables.length} table(s) in database\n`);
    allTables.forEach((table, idx) => {
      console.log(`   ${idx + 1}. ${table.fullName}`);
    });
    console.log('');
    
    // Step 2: Search for tables with "nominal" in the name
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 STEP 2: Searching for tables with "nominal" in name');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const nominalTables = allTables.filter(t => 
      t.name.toLowerCase().includes('nominal')
    );
    
    if (nominalTables.length > 0) {
      console.log(`✅ Found ${nominalTables.length} table(s) with "nominal" in name:\n`);
      nominalTables.forEach((table, idx) => {
        console.log(`   ${idx + 1}. ${table.fullName}`);
      });
      console.log('');
    } else {
      console.log('⚠️  No tables found with "nominal" in the name\n');
    }
    
    // Step 3: Search for columns with "nominal" in the name across all tables
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 STEP 3: Searching for columns with "nominal" in name');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const columnsQuery = `
      SELECT 
        table_schema,
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE column_name ILIKE '%nominal%'
      ORDER BY table_schema, table_name, column_name;
    `;
    const columnsResult = await client.query(columnsQuery);
    
    if (columnsResult.rows.length > 0) {
      console.log(`✅ Found ${columnsResult.rows.length} column(s) with "nominal" in name:\n`);
      columnsResult.rows.forEach((col, idx) => {
        console.log(`   ${idx + 1}. ${col.table_schema}.${col.table_name}.${col.column_name} (${col.data_type})`);
      });
      console.log('');
    } else {
      console.log('⚠️  No columns found with "nominal" in the name\n');
    }
    
    // Step 4: If we found nominal tables, count the codes
    if (nominalTables.length > 0) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📋 STEP 4: Counting nominal codes in tables');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      for (const table of nominalTables) {
        try {
          // Get all columns to find the code column
          const tableColumnsQuery = `
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position;
          `;
          const tableColumnsResult = await client.query(tableColumnsQuery, [table.schema, table.name]);
          
          console.log(`📊 Table: ${table.fullName}`);
          console.log(`   Columns: ${tableColumnsResult.rows.map(c => c.column_name).join(', ')}`);
          
          // Count total rows
          const countQuery = `SELECT COUNT(*) as total_count FROM ${table.fullName};`;
          const countResult = await client.query(countQuery);
          const totalCount = parseInt(countResult.rows[0].total_count);
          
          console.log(`   Total Rows: ${totalCount}`);
          
          // Try to find distinct codes (look for columns with "code" in name)
          const codeColumns = tableColumnsResult.rows.filter(c => 
            c.column_name.toLowerCase().includes('code')
          );
          
          if (codeColumns.length > 0) {
            for (const codeCol of codeColumns) {
              const distinctQuery = `SELECT COUNT(DISTINCT ${codeCol.column_name}) as distinct_count FROM ${table.fullName};`;
              const distinctResult = await client.query(distinctQuery);
              const distinctCount = parseInt(distinctResult.rows[0].distinct_count);
              console.log(`   Distinct ${codeCol.column_name}: ${distinctCount}`);
            }
          }
          
          // Show sample data
          if (totalCount > 0) {
            const sampleQuery = `SELECT * FROM ${table.fullName} LIMIT 5;`;
            const sampleResult = await client.query(sampleQuery);
            console.log(`   Sample Data (first ${sampleResult.rows.length} row(s)):`);
            sampleResult.rows.forEach((row, idx) => {
              const rowData = Object.entries(row).slice(0, 5).map(([k, v]) => `${k}=${v}`).join(', ');
              console.log(`      Row ${idx + 1}: ${rowData}${Object.keys(row).length > 5 ? '...' : ''}`);
            });
          }
          console.log('');
        } catch (error) {
          console.error(`   ❌ Error querying ${table.fullName}:`, error.message);
          console.log('');
        }
      }
    }
    
    // Step 5: Check transactions table for nominal_code column (common in accounting systems)
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 STEP 5: Checking transactions table for nominal codes');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const transactionsTable = allTables.find(t => t.name.toLowerCase() === 'transactions');
    if (transactionsTable) {
      try {
        // Check if transactions has nominal_code column
        const transColumnsQuery = `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
            AND column_name ILIKE '%nominal%'
          ORDER BY column_name;
        `;
        const transColumnsResult = await client.query(transColumnsQuery, [
          transactionsTable.schema,
          transactionsTable.name
        ]);
        
        if (transColumnsResult.rows.length > 0) {
          console.log(`✅ Found nominal code columns in transactions table:\n`);
          transColumnsResult.rows.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type})`);
          });
          
          // Count distinct nominal codes
          for (const col of transColumnsResult.rows) {
            const distinctQuery = `SELECT COUNT(DISTINCT ${col.column_name}) as distinct_count FROM ${transactionsTable.fullName} WHERE ${col.column_name} IS NOT NULL;`;
            const distinctResult = await client.query(distinctQuery);
            const distinctCount = parseInt(distinctResult.rows[0].distinct_count);
            console.log(`   Distinct ${col.column_name}: ${distinctCount}`);
          }
          console.log('');
        } else {
          console.log('⚠️  No nominal code columns found in transactions table\n');
        }
      } catch (error) {
        console.error(`   ❌ Error checking transactions table:`, error.message);
        console.log('');
      }
    } else {
      console.log('⚠️  Transactions table not found\n');
    }
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (nominalTables.length > 0) {
      console.log(`✅ Found ${nominalTables.length} table(s) with "nominal" in name`);
      console.log(`   Tables: ${nominalTables.map(t => t.name).join(', ')}\n`);
    } else {
      console.log('⚠️  No tables found with "nominal" in name');
      console.log('   Nominal codes might be stored in a different table or column\n');
    }
    
    if (columnsResult.rows.length > 0) {
      console.log(`✅ Found ${columnsResult.rows.length} column(s) with "nominal" in name`);
      console.log(`   Columns: ${columnsResult.rows.map(c => `${c.table_name}.${c.column_name}`).join(', ')}\n`);
    } else {
      console.log('⚠️  No columns found with "nominal" in name\n');
    }
    
    console.log('✅ Database check completed!\n');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your .env file has correct DATABASE_URL or DB_* settings');
    console.error('   2. Ensure PostgreSQL is running');
    console.error('   3. Verify database credentials are correct');
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
checkNominalCodes();
