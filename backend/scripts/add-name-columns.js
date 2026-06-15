/**
 * Add first_name and last_name columns to HSRL_dashboard_users.
 * Safe to run multiple times (IF NOT EXISTS).
 * Usage: node scripts/add-name-columns.js
 */
import { query } from '../config/database.js';
import { closePool } from '../config/database.js';

async function main() {
  await query(`ALTER TABLE HSRL_dashboard_users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)`);
  await query(`ALTER TABLE HSRL_dashboard_users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)`);
  console.log('✅ first_name and last_name columns ready in HSRL_dashboard_users');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); }).finally(() => closePool());
