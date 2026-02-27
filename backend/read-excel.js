import XLSX from 'xlsx';

const filePath = './petroleum_data_export_2026-01-07T09-40-48.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('=== Excel File: petroleum_data_export_2026-01-07T09-40-48.xlsx ===\n');
console.log('Sheet names:', workbook.SheetNames);
console.log('');

workbook.SheetNames.forEach((name) => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rows = data.length;
  const cols = data[0] ? data[0].length : 0;
  console.log(`\n📋 Sheet: "${name}"`);
  console.log(`   Rows: ${rows}, Columns: ${cols}`);
  if (data[0]) {
    console.log(`   Headers: ${JSON.stringify(data[0])}`);
  }
  if (rows > 1 && data[1]) {
    console.log(`   Sample row 2: ${JSON.stringify(data[1]).slice(0, 200)}...`);
  }
  if (rows > 2 && data[2]) {
    console.log(`   Sample row 3: ${JSON.stringify(data[2]).slice(0, 200)}...`);
  }
});

console.log('\n✅ Done.');
