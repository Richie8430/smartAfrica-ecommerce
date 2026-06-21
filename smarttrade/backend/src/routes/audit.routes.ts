import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AuditAction, Prisma } from '@prisma/client';
import { db }           from '../utils/db.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { requireRole }  from '../middlewares/require.role.middleware.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAdminWhere(query: Record<string, unknown>): Prisma.AuditLogWhereInput {
  const { user_id, action, from, to } = query;

  return {
    ...(typeof user_id === 'string' && user_id ? { user_id } : {}),
    ...(typeof action  === 'string' && action  ? { action: action as AuditAction } : {}),
    ...((from || to) ? {
      created_at: {
        ...(typeof from === 'string' && from ? { gte: new Date(from) } : {}),
        ...(typeof to   === 'string' && to   ? { lte: new Date(to)   } : {}),
      },
    } : {}),
  };
}

function buildCSV(rows: Array<{
  log_id:     string;
  user_id:    string | null;
  action:     AuditAction;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
  user?:      { email: string } | null;
}>): string {
  const header = ['log_id', 'user_id', 'user_email', 'action', 'ip_address', 'user_agent', 'created_at'];

  const escape = (v: unknown): string => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const lines = rows.map((r) => [
    r.log_id,
    r.user_id    ?? '',
    r.user?.email ?? '',
    r.action,
    r.ip_address  ?? '',
    r.user_agent  ?? '',
    r.created_at.toISOString(),
  ].map(escape).join(','));

  return [header.join(','), ...lines].join('\r\n');
}

// ─── GET /audit-log  (customer — own last 30 days) ────────────────────────────

/**
 * @openapi
 * /account/audit-log:
 *   get:
 *     summary: Get the authenticated user's own audit log (last 30 days)
 *     description: Mounted under /account — returns at most the 50 most recent entries for the current user.
 *     tags: [Audit]
 *     responses:
 *       200:
 *         description: Audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *                 total: { type: integer }
 */
router.get(
  '/audit-log',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const logs = await db.auditLog.findMany({
        where: {
          user_id:    req.user!.userId,
          created_at: { gte: thirtyDaysAgo },
        },
        select: {
          log_id:     true,
          action:     true,
          ip_address: true,
          user_agent: true,
          created_at: true,
          metadata:   true,
        },
        orderBy: { created_at: 'desc' },
        take:    50,
      });

      res.json({ success: true, data: logs, total: logs.length });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /audit-logs/export  (admin — must come before /:anything) ────────────

/**
 * @openapi
 * /admin/audit-logs/export:
 *   get:
 *     summary: Export all audit logs as CSV (admin only)
 *     description: Mounted under /admin. Requires ADMIN role. Returns up to 10,000 rows as a CSV file attachment.
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: CSV file of audit log entries
 *         content:
 *           text/csv:
 *             schema: { type: string }
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get(
  '/audit-logs/export',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const where = buildAdminWhere(req.query as Record<string, unknown>);

      const logs = await db.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { created_at: 'desc' },
        take:    10_000,
      });

      const csv = buildCSV(logs);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /audit-logs  (admin — paginated with filters) ───────────────────────

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     summary: List all audit logs, paginated with filters (admin only)
 *     description: Mounted under /admin. Requires ADMIN role.
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: user_id
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 totalPages: { type: integer }
 *                 limit: { type: integer }
 *       403:
 *         description: Forbidden — admin role required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiError' }
 */
router.get(
  '/audit-logs',
  authenticate,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page  = Math.max(1, Number(req.query['page']  ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)));
      const where = buildAdminWhere(req.query as Record<string, unknown>);

      const [logs, total] = await Promise.all([
        db.auditLog.findMany({
          where,
          include: { user: { select: { email: true } } },
          orderBy: { created_at: 'desc' },
          take:    limit,
          skip:    (page - 1) * limit,
        }),
        db.auditLog.count({ where }),
      ]);

      res.json({
        success:    true,
        data:       logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
