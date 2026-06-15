import nodemailer from 'nodemailer';

function getTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

/**
 * @param {{ to: string; subject: string; text: string; html?: string }} opts
 * @returns {Promise<{ sent: true, messageId?: string } | { sent: false, reason: 'no_smtp' | 'smtp_error', error?: string }>}
 */
export async function sendEmail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost';
  const transport = getTransport();

  if (!transport) {
    console.warn('[email] SMTP_HOST not set — email not sent. To:', to, 'Subject:', subject);
    console.warn('[email] Full message body (copy link from here in dev):\n', text);
    return { sent: false, reason: 'no_smtp' };
  }

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br/>'),
    });
    console.log('[email] Sent OK:', { to, subject, messageId: info.messageId });
    return { sent: true, messageId: info.messageId };
  } catch (e) {
    const msg = e?.message || String(e);
    console.error('[email] sendMail failed:', msg);
    return { sent: false, reason: 'smtp_error', error: msg };
  }
}
