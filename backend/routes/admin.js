import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool, { query } from '../config/database.js';
import { getJwtSecret, requireAdmin } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';
import { generateRawToken, hashToken } from '../lib/authTokens.js';
import { getFrontendBaseUrl } from '../lib/frontendUrl.js';

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const MIN_PASSWORD_LEN = 8;

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function signAdminToken(adminId, email, firstName, lastName) {
  return jwt.sign(
    { sub: adminId, role: 'admin', typ: 'admin', email, firstName: firstName || null, lastName: lastName || null },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
);
}

function buildVerificationLinkEmail(email, verificationUrl) {
  const subject = 'HSRL Dashboard – Please verify your email address';
  const text =
    `Dear user,\n\n` +
    `Your HSRL Dashboard account has been created for ${email}.\n\n` +
    `To activate your access and keep your account secure, please verify your email address by opening the link below (valid for 24 hours):\n\n` +
    `${verificationUrl}\n\n` +
    `If you did not expect this email, you can safely ignore it and your account will not be activated.\n\n` +
    `Best regards,\n` +
    `HSRL Dashboard Team`;
  const html =
    `<p>Dear user,</p>` +
    `<p>Your <strong>HSRL Dashboard</strong> account has been created for <strong>${email}</strong>.</p>` +
    `<p>To activate your access and keep your account secure, please verify your email address by clicking the button below (the link is valid for <strong>24 hours</strong>):</p>` +
    `<p><a href="${verificationUrl}" style="display:inline-block;padding:10px 16px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:500;">Verify my email</a></p>` +
    `<p>If the button does not work, copy and paste this link into your browser:</p>` +
    `<p><a href="${verificationUrl}">${verificationUrl}</a></p>` +
    `<p>If you did not expect this email, you can safely ignore it and your account will not be activated.</p>` +
    `<p>Best regards,<br/>HSRL Dashboard Team</p>`;
  return { subject, text, html };
}

function buildDirectVerifiedInfoEmail(email) {
  const subject = 'HSRL Dashboard – Your account is now active';
  const loginUrl = `${getFrontendBaseUrl()}/login`;
  const text =
    `Dear user,\n\n` +
    `Your HSRL Dashboard account has been created and activated for ${email}.\n\n` +
    `You can now sign in to the dashboard using your registered email address by visiting:\n\n` +
    `${loginUrl}\n\n` +
    `If you did not expect this email, you can safely ignore it.\n\n` +
    `Best regards,\n` +
    `HSRL Dashboard Team`;
  const html =
    `<p>Dear user,</p>` +
    `<p>Your <strong>HSRL Dashboard</strong> account has been created and <strong>activated</strong> for <strong>${email}</strong>.</p>` +
    `<p>You can now sign in to the dashboard using your registered email address by clicking the button below:</p>` +
    `<p><a href="${loginUrl}" style="display:inline-block;padding:10px 16px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:500;">Go to dashboard login</a></p>` +
    `<p>If the button does not work, copy and paste this link into your browser:</p>` +
    `<p><a href="${loginUrl}">${loginUrl}</a></p>` +
    `<p>If you did not expect this email, you can safely ignore it.</p>` +
    `<p>Best regards,<br/>HSRL Dashboard Team</p>`;
  return { subject, text, html };
}

/** Include verification link in API JSON when email did not send (dev / EMAIL_DEV_RETURN_LINK=1 only). */
function allowVerificationLinkInApiResponse() {
  return (
    process.env.NODE_ENV !== 'production' || process.env.EMAIL_DEV_RETURN_LINK === '1'
  );
}

async function sendVerificationEmail(userId, email) {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO hsrl_auth_tokens (user_id, token_hash, type, expires_at) VALUES ($1, $2, 'email_verify', $3)`,
    [userId, tokenHash, expires]
  );
  const verificationUrl = `${getFrontendBaseUrl()}/verify-email?token=${encodeURIComponent(raw)}`;
  const { subject, text, html } = buildVerificationLinkEmail(email, verificationUrl);
  const mail = await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
  return { verificationUrl, mail };
}

function verificationEmailApiPayload(mail, verificationUrl) {
  const sent = mail.sent === true;
  const base = { emailSent: sent };
  if (sent) return { ...base, message: 'Verification email sent.' };
  const reason = mail.reason || 'unknown';
  const hint =
    reason === 'no_smtp'
      ? 'Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM in backend/.env. Until then, emails are not delivered.'
      : `SMTP error: ${mail.error || reason}. Check credentials.`;
  const out = {
    ...base,
    message: hint,
    emailReason: reason,
    ...(mail.error && { smtpError: mail.error }),
  };
  if (allowVerificationLinkInApiResponse()) {
    out.verificationUrl = verificationUrl;
    out.message += ' Verification link included for local development only.';
  }
  return out;
}

/** POST /api/admin/login — public */
router.post('/login', async (req, res) => {
  try {
    // Accept username or email field (backward compat)
    const email = ((req.body?.username || req.body?.email || '')).trim().toLowerCase();
    const password = req.body?.password || '';
    if (!email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'Username and password required' });
    }
    const { rows } = await query(
      `SELECT id, email, password_hash, first_name, last_name
       FROM hsrl_dashboard_users
       WHERE email = $1 AND role = 'admin'`,
      [email]
    );
    if (rows.length === 0) {
      return res.status(200).json({ success: false, error: 'Unauthorized', message: 'Invalid username or password' });
    }
    const admin = rows[0];
    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(200).json({ success: false, error: 'Unauthorized', message: 'Invalid username or password' });
    }
    const token = signAdminToken(admin.id, admin.email, admin.first_name, admin.last_name);
    return res.json({
      success: true,
      token,
      admin: { id: admin.id, username: admin.email },
    });
  } catch (e) {
    console.error('[admin/login]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

router.use(requireAdmin);

/** GET /api/admin/users — returns regular users only (role='user') */
router.get('/users', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, first_name, last_name, email_verified_at, created_at
       FROM hsrl_dashboard_users
       WHERE role = 'user'
       ORDER BY id ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[admin/users GET]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** POST /api/admin/users — create a new regular user */
router.post('/users', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';
    const firstName = (req.body?.firstName || '').trim().slice(0, 100) || null;
    const lastName = (req.body?.lastName || '').trim().slice(0, 100) || null;
    const verificationModeRaw = (req.body?.verificationMode || '').trim().toLowerCase();
    const verificationMode =
      verificationModeRaw === 'direct' || verificationModeRaw === 'direct_verify'
        ? 'direct'
        : 'user_link';
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Valid email required' });
    }
    if (password.length < MIN_PASSWORD_LEN) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Password must be at least ${MIN_PASSWORD_LEN} characters`,
      });
    }
    const passwordHash = await bcrypt.hash(password, 12);

    const client = await pool.connect();
    let userId;
    let createUserMail = { sent: false };
    let verificationUrlForUser = null;
    try {
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO hsrl_dashboard_users (email, password_hash, role, first_name, last_name, email_verified_at)
         VALUES ($1, $2, 'user', $3, $4, $5) RETURNING id`,
        [
          email,
          passwordHash,
          firstName,
          lastName,
          verificationMode === 'direct' ? new Date() : null,
        ]
      );
      userId = ins.rows[0].id;

      if (verificationMode === 'user_link') {
        const raw = generateRawToken();
        const tokenHash = hashToken(raw);
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await client.query(
          `INSERT INTO hsrl_auth_tokens (user_id, token_hash, type, expires_at) VALUES ($1, $2, 'email_verify', $3)`,
          [userId, tokenHash, expires]
        );
        verificationUrlForUser = `${getFrontendBaseUrl()}/verify-email?token=${encodeURIComponent(raw)}`;
        const { subject, text, html } = buildVerificationLinkEmail(email, verificationUrlForUser);
        createUserMail = await sendEmail({ to: email, subject, text, html });
      } else {
        const { subject, text, html } = buildDirectVerifiedInfoEmail(email);
        createUserMail = await sendEmail({ to: email, subject, text, html });
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Conflict', message: 'Email already registered' });
      }
      throw e;
    } finally {
      client.release();
    }

    const emailPart =
      verificationMode === 'user_link'
        ? verificationEmailApiPayload(createUserMail, verificationUrlForUser)
        : {
            emailSent: createUserMail.sent === true,
            message: createUserMail.sent ? 'Welcome email sent.' : 'Welcome email failed to send.',
          };

    const baseMessage =
      verificationMode === 'user_link'
        ? 'User created. Store the initial password securely. Verification email sent.'
        : 'User created and marked verified. Store the initial password securely.';

    return res.status(201).json({
      success: true,
      data: { id: userId, email, emailVerified: verificationMode === 'direct' },
      initialPassword: password,
      ...emailPart,
      message:
        createUserMail.sent && verificationMode === 'user_link'
          ? baseMessage
          : `${baseMessage} ${emailPart.message || ''}`.trim(),
    });
  } catch (e) {
    console.error('[admin/users POST]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** DELETE /api/admin/users/:id — can only delete regular users, not admins */
router.delete('/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid id' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sel = await client.query(
      `SELECT id FROM hsrl_dashboard_users WHERE id = $1 AND role = 'user'`,
      [id]
    );
    if (sel.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    await client.query(`DELETE FROM hsrl_auth_tokens WHERE user_id = $1`, [id]);
    await client.query(`DELETE FROM hsrl_dashboard_users WHERE id = $1 AND role = 'user'`, [id]);
    await client.query('COMMIT');
    return res.json({ success: true, message: 'User deleted' });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore */
    }
    console.error('[admin/users DELETE]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  } finally {
    client.release();
  }
});

/** POST /api/admin/users/:id/resend-verification */
router.post('/users/:id/resend-verification', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid id' });
    }
    const { rows } = await query(
      `SELECT id, email, email_verified_at FROM hsrl_dashboard_users WHERE id = $1 AND role = 'user'`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    const user = rows[0];
    if (user.email_verified_at) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email already verified' });
    }
    await query(
      `DELETE FROM hsrl_auth_tokens WHERE user_id = $1 AND type = 'email_verify' AND used_at IS NULL`,
      [id]
    );
    const { verificationUrl, mail } = await sendVerificationEmail(user.id, user.email);
    const emailPart = verificationEmailApiPayload(mail, verificationUrl);
    return res.json({ success: true, ...emailPart });
  } catch (e) {
    console.error('[admin/resend-verification]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** POST /api/admin/users/:id/verify — mark email verified */
router.post('/users/:id/verify', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid id' });
    }
    const { rows } = await query(
      `SELECT id, email, email_verified_at FROM hsrl_dashboard_users WHERE id = $1 AND role = 'user'`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    const user = rows[0];
    if (user.email_verified_at) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email already verified' });
    }
    await query(
      `UPDATE hsrl_dashboard_users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
    await query(
      `UPDATE hsrl_auth_tokens SET used_at = NOW() WHERE user_id = $1 AND type = 'email_verify' AND used_at IS NULL`,
      [id]
    );
    try {
      const { subject, text, html } = buildDirectVerifiedInfoEmail(user.email);
      await sendEmail({ to: user.email, subject, text, html });
    } catch (mailErr) {
      console.error('[admin/verify-user email]', mailErr?.message || mailErr);
    }
    return res.json({ success: true, message: 'User verified. They can sign in now.' });
  } catch (e) {
    console.error('[admin/verify-user]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** GET /api/admin/profile — get admin's own profile */
router.get('/profile', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, first_name, last_name FROM hsrl_dashboard_users WHERE id = $1 AND role = 'admin'`,
      [req.auth.adminId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not Found', message: 'Admin not found' });
    const a = rows[0];
    return res.json({
      success: true,
      data: { id: a.id, username: a.email, email: a.email, firstName: a.first_name, lastName: a.last_name },
    });
  } catch (e) {
    console.error('[admin/profile GET]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** PATCH /api/admin/profile — update admin's own first_name, last_name */
router.patch('/profile', async (req, res) => {
  try {
    const firstName = (req.body?.firstName || '').trim().slice(0, 100) || null;
    const lastName = (req.body?.lastName || '').trim().slice(0, 100) || null;
    await query(
      `UPDATE hsrl_dashboard_users SET first_name = $1, last_name = $2, updated_at = NOW()
       WHERE id = $3 AND role = 'admin'`,
      [firstName, lastName, req.auth.adminId]
    );
    return res.json({ success: true, message: 'Profile updated' });
  } catch (e) {
    console.error('[admin/profile PATCH]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

/** PATCH /api/admin/users/:id/password — update a user's password */
router.patch('/users/:id/password', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid id' });
    }
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Bad Request', message: 'Password must be at least 8 characters' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const { rowCount } = await query(
      `UPDATE hsrl_dashboard_users SET password_hash = $1, updated_at = NOW() WHERE id = $2 AND role = 'user'`,
      [passwordHash, id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    return res.json({ success: true, message: 'Password updated' });
  } catch (e) {
    console.error('[admin/users PATCH password]', e);
    return res.status(500).json({ error: 'Server Error', message: e.message });
  }
});

export default router;
