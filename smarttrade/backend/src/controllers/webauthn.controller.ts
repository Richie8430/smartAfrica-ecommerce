import type { Request, Response, NextFunction } from 'express';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';
import * as webauthnService from '../services/webauthn.service.js';
import { db }               from '../utils/db.js';
import { AppError }         from '../utils/errors.js';
import { success, error }   from '../utils/response.js';

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
};

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof AppError) { error(res, err.message, err.statusCode); return; }
  next(err);
}

// ─── Registration ─────────────────────────────────────────────────────────────

/** Step 1 — authenticated user requests a registration challenge. */
export async function registerChallenge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user   = await db.user.findUnique({
      where:  { user_id: userId },
      select: { full_name: true, email: true },
    });
    if (!user) { error(res, 'User not found', 404); return; }

    const options = await webauthnService.getRegistrationOptions(
      userId,
      user.full_name,
      user.email,
    );
    success(res, options);
  } catch (err) {
    handleError(err, res, next);
  }
}

/** Step 2 — authenticated user submits the authenticator's registration response. */
export async function registerVerify(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await webauthnService.verifyRegistration(
      userId,
      req.body as RegistrationResponseJSON,
    );
    success(res, result, 200, 'Biometric credential registered successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Authentication ───────────────────────────────────────────────────────────

/** Step 1 — client sends email, receives a challenge + userId for the next call. */
export async function authChallenge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (!email) { error(res, 'email is required', 400); return; }

    const result = await webauthnService.getAuthenticationOptions(email);
    success(res, result);
  } catch (err) {
    handleError(err, res, next);
  }
}

/** Step 2 — client sends userId + the authenticator assertion; receives tokens. */
export async function authVerify(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, ...assertionBody } = req.body as { userId?: string } & AuthenticationResponseJSON;
    if (!userId) { error(res, 'userId is required', 400); return; }

    const result = await webauthnService.verifyAuthentication(
      userId,
      assertionBody as AuthenticationResponseJSON,
    );

    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTS);
    success(res, { accessToken: result.accessToken, user: result.user }, 200, 'Biometric login successful');
  } catch (err) {
    handleError(err, res, next);
  }
}

// ─── Credential management ────────────────────────────────────────────────────

/** DELETE /credentials/:id — revoke a single passkey. */
export async function revokeCredential(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId       = req.user!.userId;
    const credentialId = String(req.params['id'] ?? '');
    await webauthnService.revokeCredential(credentialId, userId);
    success(res, null, 200, 'Biometric credential revoked');
  } catch (err) {
    handleError(err, res, next);
  }
}

/** GET /credentials — list the user's registered passkeys (no public keys). */
export async function listCredentials(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId      = req.user!.userId;
    const credentials = await webauthnService.listCredentials(userId);
    success(res, credentials);
  } catch (err) {
    handleError(err, res, next);
  }
}
