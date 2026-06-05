import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';
import { success, error } from '../utils/response.js';

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,
  secure:   process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path:     '/',
};

/** Read a cookie value from the raw Cookie header (no cookie-parser required). */
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers['cookie'] ?? '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

// ─── Error handler ────────────────────────────────────────────────────────────

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof AppError) {
    error(res, err.message, err.statusCode);
    return;
  }
  next(err); // Unexpected error → global handler
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.registerUser(req.body as {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
    });

    // In development return the OTP so testers can verify without SMTP.
    const isDev = process.env['NODE_ENV'] !== 'production';
    success(
      res,
      {
        userId:  result.userId,
        message: 'Registration successful — check your email for a verification code.',
        ...(isDev && { otp: result.otp }),
      },
      201,
    );
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, otp } = req.body as { userId: string; otp: string };
    if (!userId || !otp) {
      error(res, 'userId and otp are required', 400);
      return;
    }
    const user = await authService.verifyEmail(userId, otp);
    success(res, user, 200, 'Email verified successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function resendOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.body as { userId: string };
    if (!userId) {
      error(res, 'userId is required', 400);
      return;
    }
    const result = await authService.resendOTP(userId);
    const isDev  = process.env['NODE_ENV'] !== 'production';
    success(res, {
      message: 'New OTP sent.',
      ...(isDev && { otp: result.otp }),
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const ip        = req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    const result = await authService.loginUser(email, password, ip, userAgent);

    // Refresh token → HttpOnly cookie; access token → response body.
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions);

    success(res, { accessToken: result.accessToken, user: result.user }, 200, 'Login successful');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = readCookie(req, REFRESH_COOKIE);

    if (refreshToken) {
      try {
        const payload = verifyToken<{ userId: string; tokenId: string }>(refreshToken);
        const ip        = req.ip ?? 'unknown';
        const userAgent = req.headers['user-agent'] ?? 'unknown';
        await authService.logoutUser(payload.userId, payload.tokenId, ip, userAgent);
      } catch {
        // Token invalid / already expired — still clear the cookie.
      }
    }

    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    success(res, null, 200, 'Logged out successfully');
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = readCookie(req, REFRESH_COOKIE);
    if (!refreshToken) {
      error(res, 'No refresh token provided', 401);
      return;
    }

    const tokens = await authService.refreshTokens(refreshToken);

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    success(res, { accessToken: tokens.accessToken });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      error(res, 'Email is required', 400);
      return;
    }

    const result = await authService.forgotPassword(email);
    const isDev  = process.env['NODE_ENV'] !== 'production';

    // Always return 200 to prevent email enumeration.
    success(res, {
      message: 'If that email is registered you will receive a reset link.',
      // Expose token in dev so we can test without SMTP.
      ...(isDev && result.token ? { token: result.token } : {}),
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password, confirmPassword } = req.body as {
      token: string;
      password: string;
      confirmPassword?: string;
    };

    if (!token || !password) {
      error(res, 'token and password are required', 400);
      return;
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      error(res, 'Passwords do not match', 400);
      return;
    }

    await authService.resetPassword(token, password);
    success(res, null, 200, 'Password reset successfully. Please log in with your new password.');
  } catch (err) {
    handleError(err, res, next);
  }
}
