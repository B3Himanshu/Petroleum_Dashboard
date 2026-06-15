import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool, { query } from '../config/database.js';
import { getJwtSecret, requireUser } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { generateRawToken, hashToken } from '../lib/authTokens.js';
import { getFrontendBaseUrl } from '../lib/frontendUrl.js';

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
// Default: dashboard users must verify email before login.
// Set AUTH_REQUIRE_EMAIL_VERIFIED=0 or false to skip (local dev only).
const _authVerifyRaw = (process.env.AUTH_REQUIRE_EMAIL_VERIFIED ?? '').trim().toLowerCase();
const REQUIRE_EMAIL_VERIFIED =
  !(_authVerifyRaw === '0' || _authVerifyRaw === 'false' || _authVerifyRaw === 'no');

const MIN_PASSWORD_LEN = 8;

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function signUserToken(userId, email) {
  return jwt.sign(
    { sub: userId, role: 'user', typ: 'user', email },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** GET /api/auth/status — public; helps debug login (count only, no emails) */
router.get('/status', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS c FROM hsrl_dashboard_users WHERE role = 'user'`
    );
    return res.json({ success: true, dashboardUserCount: rows[0]?.c ?? 0 });
  } catch (e) {
    console.error('[auth/status]', e.message);
    return res.status(503).json({
      success: false,
      message: 'Dashboard user table is missing. Run: npm run migrate-auth (in the backend folder), then restart.',
    });
  }
});

/** POST /api/auth/login — regular users only (role='user') */
router.post('/login', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email and password required' });
    }
    const { rows } = await query(
      `SELECT id, email, password_hash, email_verified_at
       FROM hsrl_dashboard_users
       WHERE email = $1 AND role = 'user'`,
      [email]
    );
    if (rows.length === 0) {
      return res.status(200).json({ success: false, error: 'Unauthorized', message: 'Invalid email or password' });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(200).json({ success: false, error: 'Unauthorized', message: 'Invalid email or password' });
    }
    if (REQUIRE_EMAIL_VERIFIED && !user.email_verified_at) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Please verify your email before signing in. Check your inbox or ask an admin to resend verification.',
      });
    }
    const token = signUserToken(user.id, user.email);
    return res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, emailVerified: !!user.email_verified_at },
    });
  } catch (e) {
    console.error('[auth/login]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** GET /api/auth/verify-email?token= */
router.get('/verify-email', async (req, res) => {
  try {
    const raw = (req.query.token || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'Bad Request', message: 'token required' });
    }
    const tokenHash = hashToken(raw);
    const { rows } = await query(
      `SELECT id, user_id FROM hsrl_auth_tokens
       WHERE token_hash = $1 AND type = 'email_verify' AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid token', message: 'Link expired or already used' });
    }
    const { id: tokenId, user_id: userId } = rows[0];
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE hsrl_dashboard_users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [userId]
      );
      await client.query(`UPDATE hsrl_auth_tokens SET used_at = NOW() WHERE id = $1`, [tokenId]);
    });
    return res.json({ success: true, message: 'Email verified. You can sign in.' });
  } catch (e) {
    console.error('[auth/verify-email]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

const GENERIC_FORGOT_MSG = 'If an account exists for that email, we sent password reset instructions.';

/** POST /api/auth/forgot-password */
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return res.json({ success: true, message: GENERIC_FORGOT_MSG });
    }
    const { rows } = await query(
      `SELECT id FROM hsrl_dashboard_users WHERE email = $1 AND role = 'user'`,
      [email]
    );
    if (rows.length === 0) {
      return res.json({ success: true, message: GENERIC_FORGOT_MSG });
    }
    const userId = rows[0].id;
    const raw = generateRawToken();
    const tokenHash = hashToken(raw);
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await query(
      `INSERT INTO hsrl_auth_tokens (user_id, token_hash, type, expires_at) VALUES ($1, $2, 'password_reset', $3)`,
      [userId, tokenHash, expires]
    );
    const link = `${getFrontendBaseUrl()}/reset-password?token=${encodeURIComponent(raw)}`;
    await sendEmail({
      to: email,
      subject: 'Reset your dashboard password',
      text: `Reset your password by opening this link (valid 1 hour):\n\n${link}\n\nIf you did not request this, ignore this email.`,
      html: `<p>Reset your password by clicking the link below (valid 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you did not request this, ignore this email.</p>`,
    });
    return res.json({ success: true, message: GENERIC_FORGOT_MSG });
  } catch (e) {
    console.error('[auth/forgot-password]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** POST /api/auth/reset-password */
router.post('/reset-password', async (req, res) => {
  try {
    const raw = (req.body?.token || '').trim();
    const newPassword = req.body?.newPassword || '';
    if (!raw || !newPassword) {
      return res.status(400).json({ error: 'Bad Request', message: 'token and newPassword required' });
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Password must be at least ${MIN_PASSWORD_LEN} characters`,
      });
    }
    const tokenHash = hashToken(raw);
    const { rows } = await query(
      `SELECT id, user_id FROM hsrl_auth_tokens
       WHERE token_hash = $1 AND type = 'password_reset' AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid token', message: 'Link expired or already used' });
    }
    const { id: tokenId, user_id: userId } = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE hsrl_dashboard_users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [passwordHash, userId]
      );
      await client.query(`UPDATE hsrl_auth_tokens SET used_at = NOW() WHERE id = $1`, [tokenId]);
      await client.query(
        `UPDATE hsrl_auth_tokens SET used_at = NOW() WHERE user_id = $1 AND type = 'password_reset' AND used_at IS NULL AND id <> $2`,
        [userId, tokenId]
      );
    });
    return res.json({ success: true, message: 'Password updated. You can sign in.' });
  } catch (e) {
    console.error('[auth/reset-password]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** GET /api/auth/me — returns current user profile */
router.get('/me', requireUser, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, first_name, last_name, email_verified_at
       FROM hsrl_dashboard_users WHERE id = $1 AND role = 'user'`,
      [req.auth.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    const u = rows[0];
    return res.json({
      success: true,
      data: { id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name },
    });
  } catch (e) {
    console.error('[auth/me]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** PATCH /api/auth/profile — update first_name and last_name */
router.patch('/profile', requireUser, async (req, res) => {
  try {
    const firstName = (req.body?.firstName || '').trim().slice(0, 100);
    const lastName = (req.body?.lastName || '').trim().slice(0, 100);
    await query(
      `UPDATE hsrl_dashboard_users SET first_name = $1, last_name = $2, updated_at = NOW()
       WHERE id = $3 AND role = 'user'`,
      [firstName || null, lastName || null, req.auth.userId]
    );
    return res.json({ success: true, message: 'Profile updated', data: { firstName, lastName } });
  } catch (e) {
    console.error('[auth/profile]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

export default router;
