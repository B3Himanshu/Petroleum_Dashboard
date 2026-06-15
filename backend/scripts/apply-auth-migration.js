/**
 * Apply 001_auth_tables.sql using backend pool config.
 * Usage: node scripts/apply-auth-migration.js
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'migrations', '001_auth_tables.sql');

async function main() {
  const sql = readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('✅ Auth migration applied:', sqlPath);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
