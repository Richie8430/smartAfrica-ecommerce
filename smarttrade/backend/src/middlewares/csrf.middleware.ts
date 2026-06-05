import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

// Paths that bypass CSRF — Flutterwave uses HMAC-SHA512; health check is read-only.
const EXEMPT_PATHS = new Set(['/api/v1/payments/webhook', '/api/v1/health']);

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Parse a raw Cookie header string into a key→value map (no external dependency). */
function parseCookies(header: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) map[k] = decodeURIComponent(v);
  }
  return map;
}

/**
 * CSRF double-submit cookie middleware.
 *
 * GET requests  → issue a fresh csrf_token cookie (httpOnly:false so JS can read it).
 * Mutation requests → compare X-CSRF-Token header against the cookie value.
 * Mismatches are rejected with 403.
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow integration tests to bypass CSRF via env flag (never set in production).
  if (process.env['DISABLE_CSRF'] === 'true') return next();

  if (EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', token, {
      httpOnly: false,         // Must be readable by JavaScript to set the header
      sameSite: 'strict',
      secure: process.env['NODE_ENV'] === 'production',
      path: '/',
    });
    return next();
  }

  if (MUTATION_METHODS.has(req.method)) {
    const headerToken = req.headers['x-csrf-token'] as string | undefined;
    const cookies = parseCookies(req.headers['cookie'] ?? '');
    const cookieToken = cookies['csrf_token'];

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      res.status(403).json({ success: false, error: 'Invalid or missing CSRF token' });
      return;
    }
  }

  next();
}
