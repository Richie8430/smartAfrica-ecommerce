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
