import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  register,
  verifyEmail,
  resendOTP,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import { authenticate }   from '../middlewares/authenticate.middleware.js';
import { validateBody }   from '../middlewares/validate.middleware.js';
import { authLimiter, authSlowDown, otpLimiter } from '../middlewares/rate.limiters.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { db }            from '../utils/db.js';
import * as tokenStore   from '../utils/token.store.js';
import { writeAuditLog } from '../utils/audit.js';
import { AppError }      from '../utils/errors.js';
import { success }       from '../utils/response.js';

const router = Router();

/**
 * @openapi
 * /auth/csrf:
 *   get:
 *     summary: Prime the CSRF cookie
 *     description: Triggers the CSRF middleware to set the csrf_token cookie for the client. No request body needed.
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: CSRF cookie set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 */
// Triggers the CSRF middleware to set the csrf_token cookie for the client.
router.get('/csrf', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, full_name, phone]
 *             properties:
 *               email: { type: string, format: email }
 *               password:
 *                 type: string
 *                 description: Min 8 chars, requires uppercase, number, and special character
 *               full_name: { type: string, minLength: 2, maxLength: 100 }
 *               phone: { type: string, description: 'International format, e.g. +15551234567' }
 *     responses:
 *       201:
 *         description: Registration successful — verification OTP sent by email (also returned in body outside production)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId: { type: string }
 *                     message: { type: string }
 *                     otp: { type: string, description: 'Only present outside production' }
 *       400:
 *         description: Validation error or email already registered
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/register',        authSlowDown, authLimiter, validateBody(registerSchema), register);
/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Verify a user's email using the OTP sent at registration
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, otp]
 *             properties:
 *               userId: { type: string }
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: userId and otp are required, or OTP invalid/expired
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/verify-email',    verifyEmail);
/**
 * @openapi
 * /auth/resend-otp:
 *   post:
 *     summary: Resend the email verification OTP
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *     responses:
 *       200:
 *         description: New OTP sent (also returned in body outside production)
 *       400:
 *         description: userId is required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/resend-otp',      otpLimiter, resendOTP);
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful — access token in body, refresh token set as HttpOnly cookie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string }
 *                     user: { type: object }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/login',           authSlowDown, authLimiter, validateBody(loginSchema), login);
/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Log out the current session
 *     description: Revokes the refresh token tied to the current session's cookie and clears it.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout',          authenticate, logout);
/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Exchange the refresh token cookie for a new access token
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken: { type: string }
 *       401:
 *         description: No refresh token provided or token invalid/expired
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/refresh',         refresh);
/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     description: Always responds 200 to avoid leaking which emails are registered.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: If the email is registered, a reset link/token has been sent (token also returned in body outside production)
 *       400:
 *         description: Email is required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/forgot-password', authSlowDown, authLimiter, forgotPassword);
/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using a reset token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *               confirmPassword: { type: string, description: 'If provided, must match password' }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: token and password are required, or passwords do not match
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.post('/reset-password',  resetPassword);

// ─── PUT /change-password ─────────────────────────────────────────────────────

const changePwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).regex(
    /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/,
    'Password must contain uppercase, number, and special character',
  ),
});

/**
 * @openapi
 * /auth/change-password:
 *   put:
 *     summary: Change the authenticated user's password
 *     description: Revokes all other sessions (refresh tokens) on success.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword:
 *                 type: string
 *                 description: Min 8 chars, requires uppercase, number, and special character
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 *       422:
 *         description: Invalid data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.put(
  '/change-password',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = changePwSchema.safeParse(req.body);
      if (!parsed.success) {
        next(new AppError(422, parsed.error.errors[0]?.message ?? 'Invalid data'));
        return;
      }
      const { currentPassword, newPassword } = parsed.data;

      const user = await db.user.findUnique({ where: { user_id: req.user!.userId } });
      if (!user) { next(new AppError(404, 'User not found')); return; }

      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) { next(new AppError(401, 'Current password is incorrect')); return; }

      const hash = await bcrypt.hash(newPassword, 12);
      await db.user.update({ where: { user_id: user.user_id }, data: { password_hash: hash } });

      // Revoke all existing sessions (force re-login on other devices)
      await tokenStore.deleteAllUserRefreshTokens(user.user_id);

      writeAuditLog({ userId: user.user_id, action: 'PASSWORD_CHANGED', ip: req.ip, userAgent: req.headers['user-agent'] });

      success(res, null, 200, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /logout-all ─────────────────────────────────────────────────────────

/**
 * @openapi
 * /auth/logout-all:
 *   post:
 *     summary: Sign out from all devices
 *     description: Revokes all refresh tokens for the authenticated user and clears the current session's cookie.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Signed out from all devices
 */
router.post(
  '/logout-all',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await tokenStore.deleteAllUserRefreshTokens(req.user!.userId);
      writeAuditLog({ userId: req.user!.userId, action: 'LOGOUT_ALL', ip: req.ip, userAgent: req.headers['user-agent'] });
      res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', path: '/' });
      success(res, null, 200, 'Signed out from all devices');
    } catch (err) {
      next(err);
    }
  },
);

export default router;
