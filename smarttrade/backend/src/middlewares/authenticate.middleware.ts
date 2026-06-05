import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenExpiredError, JsonWebTokenError } from '../utils/jwt.js';

/**
 * Validates a Bearer token from the Authorization header.
 * Attaches the decoded payload to req.user on success.
 * Returns 401 on any failure — never passes the error downstream.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7).trim();

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' });
      return;
    }
    if (err instanceof JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    // Unexpected errors still return 401 — never leak internals
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}
