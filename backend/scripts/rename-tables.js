/**
 * Rename all tables to HSRL_ prefix. Safe — no data loss.
 * Usage: node scripts/rename-tables.js
 */
import { query, closePool } from '../config/database.js';

const renames = [
  ['HSRL_sage_audit_journal',  'HSRL_HSRL_sage_audit_journal'],
  ['HSRL_volumne_2025',        'HSRL_HSRL_volumne_2025'],
  ['HSRL_departments',    'HSRL_departments'],
  ['HSRL_nominal_codes',  'HSRL_nominal_codes'],
  ['HSRL_dashboard_users',     'HSRL_HSRL_dashboard_users'],
  ['HSRL_dashboard_admins',    'HSRL_HSRL_dashboard_admins'],
  ['HSRL_auth_tokens',         'HSRL_HSRL_auth_tokens'],
];

async function main() {
  for (const [from, to] of renames) {
    // Check if old name exists
    const { rows } = await query(
      `SELECT to_regclass($1::text) AS tbl`,
      [from]
    );
    if (!rows[0].tbl) {
      console.log(`⏭  Skipping ${from} (not found — already renamed?)`);
      continue;
    }
    await query(`ALTER TABLE "${from}" RENAME TO "${to}"`);
    console.log(`✅ ${from} → ${to}`);
  }
  console.log('\n🎉 All tables renamed successfully. No data lost.');
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => closePool());
