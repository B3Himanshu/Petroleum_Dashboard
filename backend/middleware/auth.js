import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function getJwtSecret() {
  return JWT_SECRET;
}

/**
 * @param {import('express').Request} req
 * @returns {{ sub: number; role: string; typ: string } | null}
 */
export function decodeBearer(req) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  const token = h.slice(7).trim();
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireUser(req, res, next) {
  const payload = decodeBearer(req);
  if (!payload || payload.typ !== 'user' || payload.role !== 'user') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid user session required' });
  }
  req.auth = { userId: payload.sub, role: 'user' };
  next();
}

/** Dashboard / sites APIs: signed-in dashboard user or admin (view dashboard from /admin). */
export function requireUserOrAdmin(req, res, next) {
  const payload = decodeBearer(req);
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid user or admin session required' });
  }
  if (payload.typ === 'user' && payload.role === 'user') {
    req.auth = { userId: payload.sub, role: 'user' };
    return next();
  }
  if (payload.typ === 'admin' && payload.role === 'admin') {
    req.auth = { adminId: payload.sub, role: 'admin' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized', message: 'Valid user or admin session required' });
}

export function requireAdmin(req, res, next) {
  const payload = decodeBearer(req);
  if (!payload || payload.typ !== 'admin' || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid admin session required' });
  }
  req.auth = { adminId: payload.sub, role: 'admin' };
  next();
}
