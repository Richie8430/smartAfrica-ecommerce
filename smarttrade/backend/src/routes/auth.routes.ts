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

router.post('/register',        authSlowDown, authLimiter, validateBody(registerSchema), register);
router.post('/verify-email',    verifyEmail);
router.post('/resend-otp',      otpLimiter, resendOTP);
router.post('/login',           authSlowDown, authLimiter, validateBody(loginSchema), login);
router.post('/logout',          authenticate, logout);
router.post('/refresh',         refresh);
router.post('/forgot-password', authSlowDown, authLimiter, forgotPassword);
router.post('/reset-password',  resetPassword);

// ─── PUT /change-password ─────────────────────────────────────────────────────

const changePwSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).regex(
    /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/,
    'Password must contain uppercase, number, and special character',
  ),
});

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
