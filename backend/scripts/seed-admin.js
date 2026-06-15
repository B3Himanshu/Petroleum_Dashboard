/**
 * Seed admin user into hsrl_dashboard_users with role='admin'.
 * Run from backend folder: node scripts/seed-admin.js
 */
import bcrypt from 'bcrypt';
import pool from '../config/database.js';

const EMAIL = process.env.ADMIN_USERNAME || 'HSRLADMIN@gmail.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'ADMIN123';

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  await pool.query(
    `INSERT INTO hsrl_dashboard_users (email, password_hash, role, email_verified_at, created_at, updated_at)
     VALUES ($1, $2, 'admin', NOW(), NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [EMAIL.trim().toLowerCase(), hash]
  );

  console.log(`✅ Admin saved: ${EMAIL}`);
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
