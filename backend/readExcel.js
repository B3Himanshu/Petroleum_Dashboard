import dotenv from 'dotenv';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Excel File Reader Script
 * Reads and analyzes the exported Excel file to understand data structure
 */

async function readExcelFile() {
  try {
    const filename = 'petroleum_data_export_2025-12-24T07-02-09.xlsx';
    const filepath = join(__dirname, filename);
    
    console.log('📊 Reading Excel file...\n');
    console.log(`📁 File: ${filepath}\n`);
    
    // Read the workbook
    const workbook = XLSX.readFile(filepath);
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 EXCEL FILE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    console.log(`Total Sheets: ${workbook.SheetNames.length}\n`);
    
    // Analyze each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n${index + 1}. Sheet: "${sheetName}"`);
      console.log('─────────────────────────────────────────────────────────────');
      
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`   Rows: ${data.length}`);
      
      if (data.length > 0) {
        console.log(`   Columns: ${Object.keys(data[0]).length}`);
        console.log(`   Column Names:`);
        Object.keys(data[0]).forEach((col, idx) => {
          console.log(`      ${idx + 1}. ${col}`);
        });
        
        // Show sample data (first 3 rows)
        console.log(`\n   Sample Data (first 3 rows):`);
        data.slice(0, 3).forEach((row, rowIdx) => {
          console.log(`   Row ${rowIdx + 1}:`);
          Object.entries(row).slice(0, 5).forEach(([key, value]) => {
            const displayValue = value !== null && value !== undefined ? String(value).substring(0, 50) : 'null';
            console.log(`      ${key}: ${displayValue}`);
          });
          if (Object.keys(row).length > 5) {
            console.log(`      ... (${Object.keys(row).length - 5} more columns)`);
          }
        });
        
        // Show data statistics
        if (sheetName === 'Sites') {
          console.log(`\n   Sites Statistics:`);
          const activeSites = data.filter(s => s['Is Active'] === 'Yes').length;
          const bunkeredSites = data.filter(s => s['Is Bunkered'] === 'Yes').length;
          console.log(`      Active Sites: ${activeSites}`);
          console.log(`      Bunkered Sites: ${bunkeredSites}`);
          console.log(`      Total Sites: ${data.length}`);
        }
        
        if (sheetName === 'Monthly Summary') {
          console.log(`\n   Monthly Summary Statistics:`);
          const years = [...new Set(data.map(r => r.Year))].sort();
          const months = [...new Set(data.map(r => r['Month Number']))].sort();
          const sites = [...new Set(data.map(r => r['Site Code']))].length;
          console.log(`      Years: ${years.join(', ')}`);
          console.log(`      Months: ${months.length} (${months.join(', ')})`);
          console.log(`      Sites with data: ${sites}`);
          console.log(`      Total records: ${data.length}`);
        }
        
        if (sheetName === 'Fuel Margin') {
          console.log(`\n   Fuel Margin Statistics:`);
          const years = [...new Set(data.map(r => r.Year))].sort();
          const sites = [...new Set(data.map(r => r['Site Code']))].length;
          console.log(`      Years: ${years.join(', ')}`);
          console.log(`      Sites with data: ${sites}`);
          console.log(`      Total records: ${data.length}`);
        }
      } else {
        console.log(`   ⚠️  Sheet is empty`);
      }
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Excel file analysis completed!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Generate UI update recommendations
    console.log('💡 UI UPDATE RECOMMENDATIONS:');
    console.log('─────────────────────────────────────────────────────────────\n');
    
    const sitesSheet = workbook.Sheets['Sites'];
    const monthlySheet = workbook.Sheets['Monthly Summary'];
    const fuelMarginSheet = workbook.Sheets['Fuel Margin'];
    
    if (sitesSheet) {
      const sitesData = XLSX.utils.sheet_to_json(sitesSheet);
      console.log(`✅ Sites: ${sitesData.length} sites found - UI should display all of these`);
    }
    
    if (monthlySheet) {
      const monthlyData = XLSX.utils.sheet_to_json(monthlySheet);
      const years = [...new Set(monthlyData.map(r => r.Year))].sort();
      const months = [...new Set(monthlyData.map(r => r['Month Number']))].sort();
      console.log(`✅ Monthly Data: Available for ${years.length} year(s) (${years.join(', ')})`);
      console.log(`   - Months with data: ${months.length}/12 (${months.join(', ')})`);
      console.log(`   - UI should support filtering by all these months and years`);
    }
    
    if (fuelMarginSheet) {
      const fuelMarginData = XLSX.utils.sheet_to_json(fuelMarginSheet);
      console.log(`✅ Fuel Margin Data: ${fuelMarginData.length} records`);
      console.log(`   - UI should display PPL, Fuel Profit, Net Sales, Sale Volume`);
    }
    
    // Check for other sheets
    const otherSheets = workbook.SheetNames.filter(name => 
      !['Sites', 'Monthly Summary', 'Fuel Margin', 'Summary', 'Export Statistics'].includes(name)
    );
    
    if (otherSheets.length > 0) {
      console.log(`\n⚠️  Additional tables found that may need UI integration:`);
      otherSheets.forEach(sheet => {
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
        console.log(`   - ${sheet}: ${sheetData.length} records`);
      });
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error reading Excel file:', error);
    console.error('\n💡 Make sure the Excel file exists in the backend directory');
    process.exit(1);
  }
}

// Run the analysis
readExcelFile();

