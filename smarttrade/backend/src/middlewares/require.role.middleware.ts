import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';

/**
 * Factory that returns a middleware enforcing that req.user.role is one
 * of the specified roles.  Must be used after authenticate().
 *
 * Example:
 *   router.delete('/product/:id', authenticate, requireRole('ADMIN'), deleteProduct);
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    next();
  };
}
