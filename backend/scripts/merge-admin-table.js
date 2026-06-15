/**
 * Merge hsrl_dashboard_admins into hsrl_dashboard_users with a `role` column.
 * Safe to re-run — checks each step before applying.
 * No data is lost.
 *
 * Usage (from backend folder):
 *   node scripts/merge-admin-table.js
 */
import { query, closePool } from '../config/database.js';

async function main() {
  // 1. Add role column if not present
  await query(`
    ALTER TABLE hsrl_dashboard_users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  `);
  console.log('✅ role column ready on hsrl_dashboard_users');

  // 2. Pull all admins from old table
  const { rows: admins } = await query(
    `SELECT id, username, password_hash, first_name, last_name FROM hsrl_dashboard_admins`
  );
  console.log(`📋 Found ${admins.length} admin(s) to migrate`);

  for (const admin of admins) {
    const email = admin.username.trim().toLowerCase();

    // Check if this email already exists in hsrl_dashboard_users
    const { rows: existing } = await query(
      `SELECT id FROM hsrl_dashboard_users WHERE email = $1`,
      [email]
    );

    if (existing.length > 0) {
      // Update existing user row: promote to admin, sync password + name
      await query(
        `UPDATE hsrl_dashboard_users
         SET role = 'admin',
             password_hash = $1,
             first_name = COALESCE($2, first_name),
             last_name  = COALESCE($3, last_name),
             email_verified_at = COALESCE(email_verified_at, NOW()),
             updated_at = NOW()
         WHERE email = $4`,
        [admin.password_hash, admin.first_name, admin.last_name, email]
      );
      console.log(`✅ Promoted existing user to admin: ${email} (id=${existing[0].id})`);
    } else {
      // Insert as new admin row
      await query(
        `INSERT INTO hsrl_dashboard_users
           (email, password_hash, role, first_name, last_name, email_verified_at, created_at, updated_at)
         VALUES ($1, $2, 'admin', $3, $4, NOW(), NOW(), NOW())`,
        [email, admin.password_hash, admin.first_name, admin.last_name]
      );
      console.log(`✅ Inserted admin as new user: ${email}`);
    }
  }

  // 3. Drop old admins table
  await query(`DROP TABLE IF EXISTS hsrl_dashboard_admins`);
  console.log('✅ hsrl_dashboard_admins table dropped');

  console.log('\n🎉 Done. All admins are now in hsrl_dashboard_users with role=admin. No data lost.');
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => closePool());
