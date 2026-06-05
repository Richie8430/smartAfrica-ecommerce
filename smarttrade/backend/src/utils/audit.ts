import type { AuditAction, Prisma } from '@prisma/client';
import { db } from './db.js';

interface AuditInput {
  userId?: string;
  action: AuditAction;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log writer.
 * Runs in the next event-loop tick via setImmediate so it never blocks the
 * response.  Errors are silently swallowed — audit must never crash the app.
 */
export function writeAuditLog(input: AuditInput): void {
  setImmediate(() => {
    db.auditLog
      .create({
        data: {
          user_id:    input.userId ?? null,
          action:     input.action,
          ip_address: input.ip ?? null,
          user_agent: input.userAgent ?? null,
          metadata:   (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      })
      .catch(() => {
        // Intentionally silent — audit failures must not disrupt the caller.
      });
  });
}
