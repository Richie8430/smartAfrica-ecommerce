/**
 * /api/v1/admin — admin-only endpoints.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db }           from '../utils/db.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { requireRole }  from '../middlewares/require.role.middleware.js';
import { success }      from '../utils/response.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

// ─── GET /stats ───────────────────────────────────────────────────────────────

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Get dashboard statistics (admin only)
 *     description: Requires ADMIN role. Returns order/user/product counts, revenue totals (today/week/month), order status breakdown, low-stock products, and recent orders.
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalOrders: { type: integer }
 *                     totalUsers: { type: integer }
 *                     totalProducts: { type: integer }
 *                     todayRevenue: { type: number }
 *                     weekRevenue: { type: number }
 *                     monthRevenue: { type: number }
 *                     totalRevenue: { type: number }
 *                     ordersByStatus: { type: object }
 *                     lowStockProducts: { type: array, items: { type: object } }
 *                     recentOrders: { type: array, items: { type: object } }
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const now       = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalOrders,
        totalUsers,
        totalProducts,
        todayRevResult,
        weekRevResult,
        monthRevResult,
        ordersByStatus,
        lowStockProducts,
        recentOrders,
      ] = await Promise.all([
        db.order.count(),
        db.user.count({ where: { email: { not: { endsWith: '@deleted.invalid' } } } }),
        db.product.count({ where: { is_active: true } }),

        db.payment.aggregate({
          _sum:  { amount: true },
          where: { status: 'PAID', created_at: { gte: todayStart } },
        }),
        db.payment.aggregate({
          _sum:  { amount: true },
          where: { status: 'PAID', created_at: { gte: weekStart } },
        }),
        db.payment.aggregate({
          _sum:  { amount: true },
          where: { status: 'PAID', created_at: { gte: monthStart } },
        }),

        db.order.groupBy({
          by:     ['status'],
          _count: { _all: true },
        }),

        db.product.findMany({
          where:   { stock_qty: { lt: 10 }, is_active: true },
          select:  { product_id: true, name: true, stock_qty: true, category: { select: { name: true } } },
          orderBy: { stock_qty: 'asc' },
          take:    10,
        }),

        db.order.findMany({
          include: { user: { select: { email: true, full_name: true } } },
          orderBy: { created_at: 'desc' },
          take:    10,
        }),
      ]);

      const byStatus = Object.fromEntries(
        ordersByStatus.map((g) => [g.status, g._count._all]),
      );

      success(res, {
        totalOrders,
        totalUsers,
        totalProducts,
        todayRevenue:  Number(todayRevResult._sum.amount  ?? 0),
        weekRevenue:   Number(weekRevResult._sum.amount   ?? 0),
        monthRevenue:  Number(monthRevResult._sum.amount  ?? 0),
        totalRevenue:  Number(monthRevResult._sum.amount  ?? 0),
        ordersByStatus: byStatus,
        lowStockProducts,
        recentOrders,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
