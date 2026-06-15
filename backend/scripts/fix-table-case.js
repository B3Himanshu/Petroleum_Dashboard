/**
 * Fix table name case: rename "HSRL_xxx" (quoted mixed-case) to hsrl_xxx (lowercase).
 * PostgreSQL folds unquoted identifiers to lowercase, so code using HSRL_xxx
 * will automatically find hsrl_xxx. No data lost.
 * Usage: node scripts/fix-table-case.js
 */
import { query, closePool } from '../config/database.js';

const renames = [
  ['"HSRL_sage_audit_journal"',  'hsrl_sage_audit_journal'],
  ['"HSRL_volumne_2025"',        'hsrl_volumne_2025'],
  ['"HSRL_departments"',         'hsrl_departments'],
  ['"HSRL_nominal_codes"',       'hsrl_nominal_codes'],
  ['"HSRL_dashboard_users"',     'hsrl_dashboard_users'],
  ['"HSRL_dashboard_admins"',    'hsrl_dashboard_admins'],
  ['"HSRL_auth_tokens"',         'hsrl_auth_tokens'],
];

async function main() {
  for (const [from, to] of renames) {
    // Check if already renamed to lowercase
    const { rows: r2 } = await query(`SELECT to_regclass($1::text) AS tbl`, [to]);
    if (r2[0].tbl) {
      console.log(`⏭  ${to} already exists — skipping`);
      continue;
    }
    // Check if mixed-case version exists (pass quoted name so PG respects case)
    const { rows } = await query(`SELECT to_regclass($1::text) AS tbl`, [from]);
    if (!rows[0].tbl) {
      console.log(`⚠️  ${from} not found — skipping`);
      continue;
    }
    await query(`ALTER TABLE ${from} RENAME TO ${to}`);
    console.log(`✅ ${from} → ${to}`);
  }
  console.log('\n🎉 Done. All tables are now lowercase hsrl_ prefix — no data lost.');
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => closePool());
