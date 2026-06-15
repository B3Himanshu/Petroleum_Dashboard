import bcrypt from 'bcrypt';
import pool from '../config/database.js';

/**
 * Read admin credentials from env (ADMIN_* or legacy BOOTSTRAP_ADMIN_*).
 * @returns {{ username: string, password: string } | null}
 */
export function getAdminCredentialsFromEnv() {
  const username = (
    process.env.ADMIN_USERNAME ||
    process.env.BOOTSTRAP_ADMIN_USERNAME ||
    ''
  ).trim();
  const password = (
    process.env.ADMIN_PASSWORD ||
    process.env.BOOTSTRAP_ADMIN_PASSWORD ||
    ''
  ).trim();
  if (!username || !password) return null;
  return { username, password };
}

/**
 * Upsert admin row in hsrl_dashboard_users (role='admin') from .env.
 * Run migration first: npm run migrate-auth
 *
 * @returns {Promise<{ ok: true, action: 'updated'|'created', username: string } | { ok: false, reason: string, exitCode?: number }>}
 */
export async function syncAdminFromEnv() {
  const creds = getAdminCredentialsFromEnv();
  if (!creds) {
    return {
      ok: false,
      reason: 'Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env (or BOOTSTRAP_ADMIN_*).',
      exitCode: 1,
    };
  }

  const { username, password } = creds;
  const email = username.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 12);

  // Check if admin already exists in merged table
  const existing = await pool.query(
    `SELECT id FROM hsrl_dashboard_users WHERE email = $1 AND role = 'admin'`,
    [email]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE hsrl_dashboard_users SET password_hash = $1, updated_at = NOW() WHERE email = $2 AND role = 'admin'`,
      [hash, email]
    );
    return { ok: true, action: 'updated', username: email };
  }

  // Check if email exists as a regular user — promote to admin
  const asUser = await pool.query(
    `SELECT id FROM hsrl_dashboard_users WHERE email = $1`,
    [email]
  );

  if (asUser.rows.length > 0) {
    await pool.query(
      `UPDATE hsrl_dashboard_users SET password_hash = $1, role = 'admin', email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE email = $2`,
      [hash, email]
    );
    return { ok: true, action: 'updated', username: email };
  }

  // Insert new admin row
  await pool.query(
    `INSERT INTO hsrl_dashboard_users (email, password_hash, role, email_verified_at, created_at, updated_at)
     VALUES ($1, $2, 'admin', NOW(), NOW(), NOW())`,
    [email, hash]
  );
  return { ok: true, action: 'created', username: email };
}

/**
 * Called from server startup — logs only, never throws.
 */
export async function bootstrapAdminIfNeeded() {
  try {
    const result = await syncAdminFromEnv();
    if (!result.ok) {
      console.log('ℹ️ [Auth]', result.reason);
      return;
    }
    if (result.action === 'updated') {
      console.log('✅ [Auth] Admin password synced from .env for:', result.username);
    } else {
      console.log('✅ [Auth] Bootstrap admin created:', result.username);
    }
  } catch (e) {
    console.error('❌ [Auth] Bootstrap failed (did you run npm run migrate-auth?):', e.message);
  }
}
