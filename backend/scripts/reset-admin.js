/**
 * Delete ALL existing admins and create fresh one from ADMIN_USERNAME / ADMIN_PASSWORD in .env
 * Usage: node scripts/reset-admin.js
 */
import bcrypt from 'bcrypt';
import { query, closePool } from '../config/database.js';

const USERNAME = process.env.ADMIN_USERNAME;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!USERNAME || !PASSWORD) {
  console.error('❌ ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

async function main() {
  const email = USERNAME.trim().toLowerCase();

  const { rowCount } = await query(`DELETE FROM hsrl_dashboard_users WHERE role = 'admin'`);
  console.log(`🗑  Removed ${rowCount} old admin(s)`);

  const hash = await bcrypt.hash(PASSWORD, 10);
  await query(
    `INSERT INTO hsrl_dashboard_users (email, password_hash, role, email_verified_at, created_at, updated_at)
     VALUES ($1, $2, 'admin', NOW(), NOW(), NOW())`,
    [email, hash]
  );
  console.log(`✅ Admin created: ${email}`);
}

main()
  .catch((e) => { console.error('❌', e.message); process.exit(1); })
  .finally(() => closePool());
