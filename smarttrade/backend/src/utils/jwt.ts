import fs from 'node:fs';
// jsonwebtoken is a CJS module — under Node.js ESM only the default export is
// accessible via named imports. Destructure error classes from the default object.
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { JwtPayload } from '../types/index.js';
import type { Role } from '@prisma/client';

// Destructure CJS-exported classes so callers can use instanceof checks.
export const TokenExpiredError = jwt.TokenExpiredError;
export const JsonWebTokenError = jwt.JsonWebTokenError;

// ─── Key store (lazy-loaded on first use) ─────────────────────────────────────

let _privateKey: string | null = null;
let _publicKey: string | null = null;

export function loadKeys(): void {
  const privatePath = process.env['JWT_PRIVATE_KEY_PATH'];
  const publicPath = process.env['JWT_PUBLIC_KEY_PATH'];

  if (!privatePath || !publicPath) {
    throw new Error(
      'JWT key paths not configured — set JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH in .env',
    );
  }

  try {
    _privateKey = fs.readFileSync(privatePath, 'utf-8');
    _publicKey = fs.readFileSync(publicPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to load JWT keys: ${(err as Error).message}`);
  }
}

function keys(): { privateKey: string; publicKey: string } {
  if (!_privateKey || !_publicKey) loadKeys();
  if (!_privateKey || !_publicKey) throw new Error('JWT keys unavailable');
  return { privateKey: _privateKey, publicKey: _publicKey };
}

// ─── Token payloads ───────────────────────────────────────────────────────────

export type AccessTokenInput = {
  userId: string;
  email: string;
  role: Role;
};

export type RefreshTokenInput = {
  userId: string;
  tokenId: string;
};

// ─── Sign ─────────────────────────────────────────────────────────────────────

export function signAccessToken(payload: AccessTokenInput): string {
  const { privateKey } = keys();
  // StringValue is ms's branded time-string type — env var is always a valid ms string.
  const expiresIn = (process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m') as StringValue;
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn });
}

export function signRefreshToken(payload: RefreshTokenInput): string {
  const { privateKey } = keys();
  const expiresIn = (process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d') as StringValue;
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn });
}

// ─── Verify ───────────────────────────────────────────────────────────────────

// Throws TokenExpiredError or JsonWebTokenError on failure — callers must catch.
export function verifyToken<T extends object>(token: string): T {
  const { publicKey } = keys();
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as T;
}

// Convenience wrapper typed to JwtPayload.
export function verifyAccessToken(token: string): JwtPayload {
  return verifyToken<JwtPayload>(token);
}
