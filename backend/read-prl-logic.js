import XLSX from 'xlsx';

const filePath = '../PRL Logic Bar for Wireframe.xlsx';
const workbook = XLSX.readFile(filePath);

console.log('=== PRL Logic Bar for Wireframe.xlsx ===\n');
console.log('Sheet names:', workbook.SheetNames);
console.log('');

workbook.SheetNames.forEach((name) => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rows = data.length;
  const cols = data[0] ? data[0].length : 0;
  console.log(`\n--- Sheet: "${name}" (${rows} rows, ${cols} cols) ---`);
  if (data[0]) console.log('Headers:', data[0]);
  // Print all rows
  for (let i = 1; i < Math.min(rows, 100); i++) {
    if (data[i] && data[i].some(cell => cell !== '' && cell != null)) {
      console.log(`Row ${i + 1}:`, data[i]);
    }
  }
  if (rows > 100) console.log(`... (${rows - 100} more rows)`);
});

console.log('\nDone.');
