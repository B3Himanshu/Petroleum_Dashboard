/**
 * Base URL for links in emails (verify, reset) and CORS.
 * Call at request/link-build time — do not cache at module load, or links can stick to localhost
 * after FRONTEND_URL is updated in backend/.env.
 */
export function getFrontendBaseUrl() {
  const raw = process.env.FRONTEND_URL || 'http://localhost:9090';
  return String(raw).trim().replace(/\/$/, '');
}

/**
 * Origin only (scheme + host + port) for comparing against the browser `Origin` header.
 * `FRONTEND_URL` is often set with a path prefix in production (e.g. /hsrl); Origin never includes a path,
 * so CORS must compare origins, not the full configured URL string.
 */
export function getFrontendOriginForCors() {
  const base = getFrontendBaseUrl();
  try {
    if (/^https?:\/\//i.test(base)) {
      return new URL(base).origin;
    }
  } catch {
    /* ignore */
  }
  return base;
}
