/**
 * /api/v1/account  — authenticated customer account management.
 * Mounted in app.ts alongside auditRoutes at the same prefix.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db }              from '../utils/db.js';
import { authenticate }    from '../middlewares/authenticate.middleware.js';
import { writeAuditLog }   from '../utils/audit.js';
import { AppError }        from '../utils/errors.js';
import { success }         from '../utils/response.js';
import * as tokenStore     from '../utils/token.store.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── PUT /profile ─────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone:     z.string().regex(/^\+?[0-9\s\-().]{7,20}$/).optional().nullable(),
});

router.put(
  '/profile',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        next(new AppError(422, 'Invalid profile data'));
        return;
      }

      const { full_name, phone } = parsed.data;

      const user = await db.user.update({
        where:  { user_id: req.user!.userId },
        data:   {
          ...(full_name !== undefined ? { full_name }              : {}),
          ...(phone     !== undefined ? { phone: phone ?? null }   : {}),
        },
        select: { user_id: true, email: true, full_name: true, phone: true, role: true, biometric_enrolled: true },
      });

      writeAuditLog({ userId: req.user!.userId, action: 'PROFILE_UPDATED', ip: req.ip, userAgent: req.headers['user-agent'] });

      success(res, user);
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /account ──────────────────────────────────────────────────────────

router.delete(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { password } = req.body as { password?: string };
      if (!password) { next(new AppError(400, 'Password required to delete account')); return; }

      const user = await db.user.findUnique({ where: { user_id: req.user!.userId } });
      if (!user) { next(new AppError(404, 'User not found')); return; }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) { next(new AppError(401, 'Incorrect password')); return; }

      // Revoke all sessions first
      await tokenStore.deleteAllUserRefreshTokens(req.user!.userId);

      // Soft-delete by anonymising PII — real deletion cascades audit logs via SetNull.
      await db.user.update({
        where: { user_id: req.user!.userId },
        data: {
          email:         `deleted_${req.user!.userId}@deleted.invalid`,
          password_hash: 'DELETED',
          full_name:     'Deleted User',
          phone:         null,
          is_verified:   false,
        },
      });

      writeAuditLog({ userId: req.user!.userId, action: 'ACCOUNT_DELETED', ip: req.ip, userAgent: req.headers['user-agent'] });

      res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', path: '/' });
      success(res, null, 200, 'Account deleted');
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /addresses ───────────────────────────────────────────────────────────

router.get(
  '/addresses',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const addresses = await db.address.findMany({
        where:   { user_id: req.user!.userId },
        orderBy: [{ is_default: 'desc' }, { created_at: 'asc' }],
      });
      success(res, addresses);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /addresses ──────────────────────────────────────────────────────────

const addressSchema = z.object({
  full_name:    z.string().min(2).max(100),
  address_line: z.string().min(5).max(200),
  city:         z.string().min(2).max(100),
  state:        z.string().min(2).max(100),
  country:      z.string().min(2).max(100),
  zip_code:     z.string().min(3).max(20),
  phone:        z.string().optional().nullable(),
  is_default:   z.boolean().optional(),
});

router.post(
  '/addresses',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = addressSchema.safeParse(req.body);
      if (!parsed.success) { next(new AppError(422, 'Invalid address data')); return; }

      // If is_default, clear existing defaults first
      if (parsed.data.is_default) {
        await db.address.updateMany({
          where: { user_id: req.user!.userId },
          data:  { is_default: false },
        });
      }

      const address = await db.address.create({
        data: { ...parsed.data, user_id: req.user!.userId },
      });

      writeAuditLog({ userId: req.user!.userId, action: 'ADDRESS_CREATED', ip: req.ip });
      success(res, address, 201, 'Address added');
    } catch (err) {
      next(err);
    }
  },
);

// ─── PUT /addresses/:id ───────────────────────────────────────────────────────

router.put(
  '/addresses/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = addressSchema.partial().safeParse(req.body);
      if (!parsed.success) { next(new AppError(422, 'Invalid address data')); return; }

      const addressId = String(req.params['id'] ?? '');
      const existing = await db.address.findFirst({
        where: { address_id: addressId, user_id: req.user!.userId },
      });
      if (!existing) { next(new AppError(404, 'Address not found')); return; }

      if (parsed.data.is_default) {
        await db.address.updateMany({
          where: { user_id: req.user!.userId },
          data:  { is_default: false },
        });
      }

      const address = await db.address.update({
        where: { address_id: addressId },
        data:  parsed.data,
      });

      writeAuditLog({ userId: req.user!.userId, action: 'ADDRESS_UPDATED', ip: req.ip });
      success(res, address);
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /addresses/:id ────────────────────────────────────────────────────

router.delete(
  '/addresses/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const addressId = String(req.params['id'] ?? '');
      const existing = await db.address.findFirst({
        where: { address_id: addressId, user_id: req.user!.userId },
      });
      if (!existing) { next(new AppError(404, 'Address not found')); return; }

      await db.address.delete({ where: { address_id: addressId } });
      writeAuditLog({ userId: req.user!.userId, action: 'ADDRESS_DELETED', ip: req.ip });
      success(res, null, 200, 'Address deleted');
    } catch (err) {
      next(err);
    }
  },
);

export default router;
