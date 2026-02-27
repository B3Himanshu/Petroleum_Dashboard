import dotenv from 'dotenv';
import pool from './config/database.js';
import * as XLSX from 'xlsx';
import { mapSiteToFrontend } from './utils/cityMapping.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Database Data Export Script
 * Exports all database data to Excel format
 */

async function exportToExcel() {
  let client;
  
  try {
    console.log('📊 Starting database data export to Excel...\n');
    
    // Connect to database
    client = await pool.connect();
    console.log('✅ Connected to database successfully!\n');
    
    const workbook = XLSX.utils.book_new();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Step 0: Discover all tables in the database
    console.log('📋 Step 0: Discovering all tables in database...');
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
    console.log(`   ✅ Found ${tablesResult.rows.length} table(s) in database\n`);
    
    const allTables = tablesResult.rows.map(row => ({
      schema: row.table_schema,
      name: row.table_name,
      fullName: `${row.table_schema}.${row.table_name}`
    }));
    
    console.log('   Tables to export:');
    allTables.forEach((table, idx) => {
      console.log(`   ${idx + 1}. ${table.fullName}`);
    });
    console.log('');
    
    // 1. Export Sites Data - Get ALL columns dynamically
    console.log('📋 Step 1: Exporting Sites data...');
    
    // First, get all columns from sites table
    const sitesColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sites'
      ORDER BY ordinal_position;
    `;
    const sitesColumnsResult = await client.query(sitesColumnsQuery);
    const allSitesColumns = sitesColumnsResult.rows.map(r => r.column_name);
    console.log(`   📋 Found ${allSitesColumns.length} columns in sites table: ${allSitesColumns.join(', ')}`);
    
    // Build dynamic SELECT query with all columns
    const sitesColumnsStr = allSitesColumns.join(', ');
    const sitesQuery = `
      SELECT ${sitesColumnsStr}
      FROM sites
      WHERE is_active = true
        AND site_code > 1
        AND post_code IS NOT NULL
        AND post_code != ''
        AND site_name IS NOT NULL
        AND site_name != ''
      ORDER BY site_code;
    `;
    const sitesResult = await client.query(sitesQuery);
    console.log(`   ✅ Found ${sitesResult.rows.length} sites`);
    
    // Map sites and add city information, preserving ALL columns
    const sitesData = sitesResult.rows.map(row => {
      const mapped = mapSiteToFrontend(row);
      const formattedRow = {};
      
      // Add all original columns with proper formatting
      allSitesColumns.forEach(col => {
        const value = row[col];
        if (value === null || value === undefined) {
          formattedRow[col] = '';
        } else if (value instanceof Date) {
          formattedRow[col] = value.toISOString().split('T')[0];
        } else if (typeof value === 'boolean') {
          formattedRow[col] = value ? 'Yes' : 'No';
        } else {
          formattedRow[col] = value;
        }
      });
      
      // Add city information
      formattedRow['City'] = mapped.cityDisplay;
      
      return formattedRow;
    });
    
    const sitesSheet = XLSX.utils.json_to_sheet(sitesData);
    XLSX.utils.book_append_sheet(workbook, sitesSheet, 'Sites');
    console.log('   ✅ Sites sheet created with all columns\n');
    
    // 2. Export Monthly Summary Data - Get ALL columns dynamically
    console.log('📋 Step 2: Exporting Monthly Summary data...');
    
    // Get all columns from monthly_summary table
    const monthlyColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'monthly_summary'
      ORDER BY ordinal_position;
    `;
    const monthlyColumnsResult = await client.query(monthlyColumnsQuery);
    const allMonthlyColumns = monthlyColumnsResult.rows.map(r => r.column_name);
    console.log(`   📋 Found ${allMonthlyColumns.length} columns in monthly_summary table: ${allMonthlyColumns.join(', ')}`);
    
    // Build dynamic SELECT query with all columns
    const monthlyColumnsStr = allMonthlyColumns.map(col => `ms.${col}`).join(', ');
    const monthlySummaryQuery = `
      SELECT 
        ${monthlyColumnsStr},
        s.site_name
      FROM monthly_summary ms
      LEFT JOIN sites s ON ms.site_code = s.site_code
      ORDER BY ms.site_code, ms.year, ms.month;
    `;
    const monthlyResult = await client.query(monthlySummaryQuery);
    console.log(`   ✅ Found ${monthlyResult.rows.length} monthly records`);
    
    const monthlyData = monthlyResult.rows.map(row => {
      const formattedRow = {};
      
      // Add all original columns with proper formatting
      allMonthlyColumns.forEach(col => {
        const value = row[col];
        if (value === null || value === undefined) {
          formattedRow[col] = '';
        } else if (value instanceof Date) {
          formattedRow[col] = value.toISOString().split('T')[0];
        } else if (typeof value === 'number') {
          formattedRow[col] = parseFloat(value || 0);
        } else {
          formattedRow[col] = value;
        }
      });
      
      // Add site name
      formattedRow['site_name'] = row.site_name || '';
      
      // Add calculated fields
      const bunkeredSales = parseFloat(row.bunkered_sales || 0);
      const nonBunkeredSales = parseFloat(row.non_bunkered_sales || 0);
      const bunkeredPurchases = parseFloat(row.bunkered_purchases || 0);
      const nonBunkeredPurchases = parseFloat(row.non_bunkered_purchases || 0);
      const shopSales = parseFloat(row.shop_sales || 0);
      const shopPurchases = parseFloat(row.shop_purchases || 0);
      const valetSales = parseFloat(row.valet_sales || 0);
      const valetPurchases = parseFloat(row.valet_purchases || 0);
      
      formattedRow['total_fuel_sales'] = bunkeredSales + nonBunkeredSales;
      formattedRow['fuel_profit'] = (bunkeredSales + nonBunkeredSales) - (bunkeredPurchases + nonBunkeredPurchases);
      formattedRow['shop_profit'] = shopSales - shopPurchases;
      formattedRow['valet_profit'] = valetSales - valetPurchases;
      
      // Add month name if month column exists
      if (row.month) {
        formattedRow['month_name'] = monthNames[row.month - 1] || '';
      }
      
      return formattedRow;
    });
    
    const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Summary');
    console.log('   ✅ Monthly Summary sheet created with all columns\n');
    
    // 3. Export Fuel Margin Data - Get ALL columns dynamically
    console.log('📋 Step 3: Exporting Fuel Margin data...');
    
    // Get all columns from fuel_margin_data table
    const fuelMarginColumnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'fuel_margin_data'
      ORDER BY ordinal_position;
    `;
    const fuelMarginColumnsResult = await client.query(fuelMarginColumnsQuery);
    const allFuelMarginColumns = fuelMarginColumnsResult.rows.map(r => r.column_name);
    console.log(`   📋 Found ${allFuelMarginColumns.length} columns in fuel_margin_data table: ${allFuelMarginColumns.join(', ')}`);
    
    // Build dynamic SELECT query with all columns
    const fuelMarginColumnsStr = allFuelMarginColumns.map(col => `fmd.${col}`).join(', ');
    const fuelMarginQuery = `
      SELECT 
        ${fuelMarginColumnsStr},
        s.site_name
      FROM fuel_margin_data fmd
      LEFT JOIN sites s ON fmd.site_code = s.site_code
      ORDER BY fmd.site_code, fmd.year, fmd.month;
    `;
    const fuelMarginResult = await client.query(fuelMarginQuery);
    console.log(`   ✅ Found ${fuelMarginResult.rows.length} fuel margin records`);
    
    const fuelMarginData = fuelMarginResult.rows.map(row => {
      const formattedRow = {};
      
      // Add all original columns with proper formatting
      allFuelMarginColumns.forEach(col => {
        const value = row[col];
        if (value === null || value === undefined) {
          formattedRow[col] = '';
        } else if (value instanceof Date) {
          formattedRow[col] = value.toISOString().split('T')[0];
        } else if (typeof value === 'number') {
          formattedRow[col] = parseFloat(value || 0);
        } else {
          formattedRow[col] = value;
        }
      });
      
      // Add site name
      formattedRow['site_name'] = row.site_name || '';
      
      // Add month name if month column exists
      if (row.month) {
        formattedRow['month_name'] = monthNames[row.month - 1] || '';
      }
      
      return formattedRow;
    });
    
    const fuelMarginSheet = XLSX.utils.json_to_sheet(fuelMarginData);
    XLSX.utils.book_append_sheet(workbook, fuelMarginSheet, 'Fuel Margin');
    console.log('   ✅ Fuel Margin sheet created with all columns\n');
    
    // 4. Try to export Transactions data (if table exists) - Get ALL columns dynamically
    console.log('📋 Step 4: Checking for Transactions data...');
    try {
      // Get all columns from transactions table
      const transactionsColumnsQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'transactions'
        ORDER BY ordinal_position;
      `;
      const transactionsColumnsResult = await client.query(transactionsColumnsQuery);
      const allTransactionsColumns = transactionsColumnsResult.rows.map(r => r.column_name);
      console.log(`   📋 Found ${allTransactionsColumns.length} columns in transactions table: ${allTransactionsColumns.join(', ')}`);
      
      // Build dynamic SELECT query with all columns
      // Note: transactions table already has site_name column, so we don't need to join
      // Removing ORDER BY and JOIN for better performance on large tables
      const transactionsColumnsStr = allTransactionsColumns.map(col => `t.${col}`).join(', ');
      console.log(`   ⏳ Executing query for transactions (this may take a moment for large datasets)...`);
      const transactionsQuery = `
        SELECT ${transactionsColumnsStr}
        FROM transactions t
        WHERE t.deleted_flag = 0 OR t.deleted_flag IS NULL
        LIMIT 100000;
      `;
      const transactionsResult = await client.query(transactionsQuery);
      console.log(`   ✅ Found ${transactionsResult.rows.length} transaction records`);
      
      if (transactionsResult.rows.length > 0) {
        console.log(`   ⏳ Formatting ${transactionsResult.rows.length} transaction records...`);
        const transactionsData = transactionsResult.rows.map((row, index) => {
          // Show progress every 10000 records
          if (index > 0 && index % 10000 === 0) {
            console.log(`      Processed ${index} of ${transactionsResult.rows.length} records...`);
          }
          
          const formattedRow = {};
          
          // Add all original columns with proper formatting
          allTransactionsColumns.forEach(col => {
            const value = row[col];
            if (value === null || value === undefined) {
              formattedRow[col] = '';
            } else if (value instanceof Date) {
              formattedRow[col] = value.toISOString().split('T')[0];
            } else if (typeof value === 'boolean') {
              formattedRow[col] = value ? 'Yes' : 'No';
            } else if (typeof value === 'number') {
              formattedRow[col] = parseFloat(value || 0);
            } else {
              formattedRow[col] = value;
            }
          });
          
          return formattedRow;
        });
        
        console.log(`   ⏳ Creating Excel sheet for transactions...`);
        const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
        XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');
        console.log('   ✅ Transactions sheet created with all columns\n');
      }
    } catch (err) {
      console.log(`   ⚠️  Transactions table not found or error: ${err.message}\n`);
    }
    
    // 5. Try to export Daily Summary data (if table exists) - Get ALL columns dynamically
    console.log('📋 Step 5: Checking for Daily Summary data...');
    try {
      // Get all columns from daily_summary table
      const dailySummaryColumnsQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'daily_summary'
        ORDER BY ordinal_position;
      `;
      const dailySummaryColumnsResult = await client.query(dailySummaryColumnsQuery);
      const allDailySummaryColumns = dailySummaryColumnsResult.rows.map(r => r.column_name);
      console.log(`   📋 Found ${allDailySummaryColumns.length} columns in daily_summary table: ${allDailySummaryColumns.join(', ')}`);
      
      // Build dynamic SELECT query with all columns
      // Removing ORDER BY and JOIN for better performance on large tables
      const dailySummaryColumnsStr = allDailySummaryColumns.map(col => `ds.${col}`).join(', ');
      console.log(`   ⏳ Executing query for daily_summary (this may take a moment for large datasets)...`);
      const dailySummaryQuery = `
        SELECT ${dailySummaryColumnsStr}
        FROM daily_summary ds
        LIMIT 100000;
      `;
      const dailySummaryResult = await client.query(dailySummaryQuery);
      console.log(`   ✅ Found ${dailySummaryResult.rows.length} daily summary records`);
      
      if (dailySummaryResult.rows.length > 0) {
        console.log(`   ⏳ Formatting ${dailySummaryResult.rows.length} daily summary records...`);
        const dailySummaryData = dailySummaryResult.rows.map((row, index) => {
          // Show progress every 5000 records
          if (index > 0 && index % 5000 === 0) {
            console.log(`      Processed ${index} of ${dailySummaryResult.rows.length} records...`);
          }
          
          const formattedRow = {};
          
          // Add all original columns with proper formatting
          allDailySummaryColumns.forEach(col => {
            const value = row[col];
            if (value === null || value === undefined) {
              formattedRow[col] = '';
            } else if (value instanceof Date) {
              formattedRow[col] = value.toISOString().split('T')[0];
            } else if (typeof value === 'number') {
              formattedRow[col] = parseFloat(value || 0);
            } else {
              formattedRow[col] = value;
            }
          });
          
          return formattedRow;
        });
        
        console.log(`   ⏳ Creating Excel sheet for daily summary...`);
        const dailySummarySheet = XLSX.utils.json_to_sheet(dailySummaryData);
        XLSX.utils.book_append_sheet(workbook, dailySummarySheet, 'Daily Summary');
        console.log('   ✅ Daily Summary sheet created with all columns\n');
      }
    } catch (err) {
      console.log(`   ⚠️  Daily Summary table not found or error: ${err.message}\n`);
    }
    
    // 6. Export all other tables dynamically (including sync_log and any new tables)
    console.log('📋 Step 6: Exporting all other tables...\n');
    const exportedTables = ['sites', 'monthly_summary', 'fuel_margin_data', 'transactions', 'daily_summary'];
    const exportStats = [];
    
    for (const table of allTables) {
      const tableName = table.name.toLowerCase();
      
      // Skip tables we've already exported
      if (exportedTables.includes(tableName)) {
        continue;
      }
      
      try {
        console.log(`   📊 Exporting table: ${table.fullName}...`);
        
        // Get column information first
        const columnsQuery = `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position;
        `;
        const columnsResult = await client.query(columnsQuery, [table.schema, table.name]);
        
        if (columnsResult.rows.length === 0) {
          console.log(`   ⚠️  No columns found for ${table.fullName}\n`);
          continue;
        }
        
        // Get all data from table (with limit for very large tables)
        // Use parameterized query to safely handle schema.table names
        const dataQuery = `SELECT * FROM ${table.fullName} LIMIT 100000;`;
        const dataResult = await client.query(dataQuery);
        
        if (dataResult.rows.length === 0) {
          console.log(`   ⚠️  No data found in ${table.fullName}\n`);
          exportStats.push({ table: table.fullName, rows: 0, status: 'Empty' });
          continue;
        }
        
        // Convert data to array of objects with proper formatting
        const tableData = dataResult.rows.map(row => {
          const formattedRow = {};
          Object.keys(row).forEach(key => {
            const value = row[key];
            // Format dates and timestamps
            if (value instanceof Date) {
              formattedRow[key] = value.toISOString().split('T')[0];
            } else if (value === null || value === undefined) {
              formattedRow[key] = '';
            } else if (typeof value === 'boolean') {
              formattedRow[key] = value ? 'Yes' : 'No';
            } else if (typeof value === 'number') {
              // Preserve numeric values, but handle bigint properly
              formattedRow[key] = value;
            } else {
              formattedRow[key] = String(value);
            }
          });
          return formattedRow;
        });
        
        // Create sheet (limit sheet name to 31 characters as per Excel limit)
        const sheetName = table.name.length > 31 ? table.name.substring(0, 31) : table.name;
        const tableSheet = XLSX.utils.json_to_sheet(tableData);
        XLSX.utils.book_append_sheet(workbook, tableSheet, sheetName);
        
        console.log(`   ✅ Exported ${dataResult.rows.length} rows from ${table.fullName}\n`);
        exportStats.push({ table: table.fullName, rows: dataResult.rows.length, status: 'Success' });
        
      } catch (err) {
        console.log(`   ❌ Error exporting ${table.fullName}: ${err.message}\n`);
        exportStats.push({ table: table.fullName, rows: 0, status: `Error: ${err.message}` });
      }
    }
    
    // 7. Create Summary Sheet
    console.log('📋 Step 7: Creating Summary sheet...');
    
    // Get counts for all tables
    let transactionsCount = 0;
    let dailySummaryCount = 0;
    try {
      const transactionsCountQuery = await client.query(`
        SELECT COUNT(*) as count FROM transactions WHERE deleted_flag = 0 OR deleted_flag IS NULL
      `);
      transactionsCount = parseInt(transactionsCountQuery.rows[0]?.count || 0);
    } catch (e) {
      // Table might not exist
    }
    try {
      const dailySummaryCountQuery = await client.query(`SELECT COUNT(*) as count FROM daily_summary`);
      dailySummaryCount = parseInt(dailySummaryCountQuery.rows[0]?.count || 0);
    } catch (e) {
      // Table might not exist
    }
    
    const summaryData = [
      { 'Metric': 'Total Sites', 'Value': sitesData.length },
      { 'Metric': 'Total Monthly Records', 'Value': monthlyData.length },
      { 'Metric': 'Total Fuel Margin Records', 'Value': fuelMarginData.length },
      { 'Metric': 'Total Transaction Records', 'Value': transactionsCount },
      { 'Metric': 'Total Daily Summary Records', 'Value': dailySummaryCount },
      { 'Metric': 'Total Tables in Database', 'Value': allTables.length },
      { 'Metric': 'Tables Exported', 'Value': workbook.SheetNames.length - 1 }, // -1 for Summary sheet
      { 'Metric': 'Export Date', 'Value': new Date().toISOString() },
      { 'Metric': 'Database', 'Value': process.env.DB_NAME || 'N/A' }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    console.log('   ✅ Summary sheet created\n');
    
    // 8. Create Export Statistics Sheet
    console.log('📋 Step 8: Creating Export Statistics sheet...');
    
    // Reuse the counts already calculated in Step 7
    const statsData = [
      { 'Table Name': 'Sites', 'Rows Exported': sitesData.length, 'Status': 'Success' },
      { 'Table Name': 'Monthly Summary', 'Rows Exported': monthlyData.length, 'Status': 'Success' },
      { 'Table Name': 'Fuel Margin', 'Rows Exported': fuelMarginData.length, 'Status': 'Success' },
      { 'Table Name': 'Transactions', 'Rows Exported': transactionsCount, 'Status': 'Success' },
      { 'Table Name': 'Daily Summary', 'Rows Exported': dailySummaryCount, 'Status': 'Success' },
      ...exportStats.map(stat => ({
        'Table Name': stat.table,
        'Rows Exported': stat.rows,
        'Status': stat.status
      }))
    ];
    
    const statsSheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Export Statistics');
    console.log('   ✅ Export Statistics sheet created\n');
    
    // 7. Write Excel file
    const filename = `petroleum_data_export_${timestamp}.xlsx`;
    const filepath = join(__dirname, filename);
    
    XLSX.writeFile(workbook, filepath);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Excel export completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`📁 File saved: ${filepath}`);
    console.log(`📊 Total sheets: ${workbook.SheetNames.length}`);
    console.log(`   - ${workbook.SheetNames.join('\n   - ')}\n`);
    
  } catch (error) {
    console.error('❌ Error exporting data:', error);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your .env file has correct DATABASE_URL or DB_* settings');
    console.error('   2. Ensure PostgreSQL is running');
    console.error('   3. Verify database credentials are correct');
    console.error('   4. Check network connectivity to database server');
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the export
exportToExcel();

