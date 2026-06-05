/**
 * /api/v1/dev  — test/dev seeding endpoints.
 * These routes are registered ONLY when NODE_ENV !== 'production'.
 * Never import this file in production — app.ts guards the mount.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db }      from '../utils/db.js';
import { success } from '../utils/response.js';

const router = Router();

const guard = (_req: Request, res: Response, next: NextFunction) => {
  if (process.env['NODE_ENV'] === 'production') {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  next();
};

router.use(guard);

// ─── POST /dev/seed ────────────────────────────────────────────────────────────
// Creates deterministic test fixtures for E2E tests.

router.post(
  '/seed',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [adminHash, custHash] = await Promise.all([
        bcrypt.hash('Admin@1234', 10),
        bcrypt.hash('Customer@1234', 10),
      ]);

      // Admin user
      const admin = await db.user.upsert({
        where:  { email: 'admin@smarttrade.test' },
        update: { password_hash: adminHash, role: 'ADMIN', is_verified: true },
        create: {
          email:         'admin@smarttrade.test',
          password_hash: adminHash,
          full_name:     'Test Admin',
          role:          'ADMIN',
          is_verified:   true,
        },
      });

      // Customer user
      const customer = await db.user.upsert({
        where:  { email: 'customer@smarttrade.test' },
        update: { password_hash: custHash, role: 'CUSTOMER', is_verified: true },
        create: {
          email:         'customer@smarttrade.test',
          password_hash: custHash,
          full_name:     'Test Customer',
          role:          'CUSTOMER',
          is_verified:   true,
        },
      });

      // Test category
      const category = await db.category.upsert({
        where:  { slug: 'e2e-test-electronics' },
        update: { name: 'E2E Test Electronics', is_active: true },
        create: {
          name:        'E2E Test Electronics',
          slug:        'e2e-test-electronics',
          description: 'Category for E2E tests',
          is_active:   true,
        },
      });

      // In-stock test product
      const existingProduct = await db.product.findFirst({ where: { name: 'E2E Test Widget' } });
      const product = existingProduct
        ? await db.product.update({
            where: { product_id: existingProduct.product_id },
            data:  { stock_qty: 20, price: 29.99, is_active: true },
          })
        : await db.product.create({
            data: {
              name:        'E2E Test Widget',
              description: 'A test product created for E2E tests. Safe to ignore.',
              price:       29.99,
              stock_qty:   20,
              category_id: category.category_id,
              is_active:   true,
            },
          });

      // Out-of-stock test product
      const existingOos = await db.product.findFirst({ where: { name: 'E2E Out Of Stock' } });
      const oos = existingOos
        ? await db.product.update({
            where: { product_id: existingOos.product_id },
            data:  { stock_qty: 0, is_active: true },
          })
        : await db.product.create({
            data: {
              name:        'E2E Out Of Stock',
              description: 'Out-of-stock product for E2E tests.',
              price:       9.99,
              stock_qty:   0,
              category_id: category.category_id,
              is_active:   true,
            },
          });

      success(res, {
        adminId:     admin.user_id,
        customerId:  customer.user_id,
        categoryId:  category.category_id,
        productId:   product.product_id,
        oosProductId: oos.product_id,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /dev/cleanup ───────────────────────────────────────────────────────
// Removes test fixtures created by /seed (for teardown).

router.delete(
  '/cleanup',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Cascade: delete orders with test user first
      await db.cartItem.deleteMany({
        where: { user: { email: { contains: '@smarttrade.test' } } },
      });

      // Delete test products
      await db.product.deleteMany({
        where: { name: { in: ['E2E Test Widget', 'E2E Out Of Stock'] } },
      });

      // Delete test category
      await db.category.deleteMany({
        where: { slug: 'e2e-test-electronics' },
      });

      // Delete test users (cascade handles related records)
      await db.user.deleteMany({
        where: { email: { endsWith: '@smarttrade.test' } },
      });

      success(res, null, 200, 'Test fixtures cleaned up');
    } catch (err) {
      next(err);
    }
  },
);

export default router;
