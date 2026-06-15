import crypto from 'crypto';

export function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}
