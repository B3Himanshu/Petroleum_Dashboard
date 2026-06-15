/**
 * Save admin username + password from backend/.env into HSRL_dashboard_admins (bcrypt hash).
 * Same logic as server startup bootstrap.
 *
 * Usage (from backend folder):
 *   npm run sync-admin
 *
 * Requires: npm run migrate-auth (tables must exist)
 * Env: ADMIN_USERNAME, ADMIN_PASSWORD (or BOOTSTRAP_ADMIN_*)
 */
import { syncAdminFromEnv } from '../lib/bootstrapAuth.js';
import { closePool } from '../config/database.js';

async function main() {
  try {
    const result = await syncAdminFromEnv();
    if (!result.ok) {
      console.error('❌', result.reason);
      process.exitCode = result.exitCode ?? 1;
      return;
    }
    const labels = {
      updated: 'Password updated for existing admin',
      created: 'First admin created',
      inserted: 'New admin row added',
    };
    console.log(`✅ ${labels[result.action]}: ${result.username}`);
  } catch (e) {
    console.error('❌ Failed:', e.message);
    console.error('   Did you run: npm run migrate-auth');
    process.exitCode = 1;
  } finally {
    await closePool().catch(() => {});
  }
}

main();
