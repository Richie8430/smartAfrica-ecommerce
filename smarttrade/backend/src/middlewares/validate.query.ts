import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Factory that validates req.query against a Zod schema.
 * On success, replaces req.query with the coerced, type-safe values.
 * On failure, returns 422 with a field→message error map.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = result.error.issues.reduce<Record<string, string>>(
        (acc, issue) => {
          const field = issue.path.join('.') || '_root';
          acc[field] = issue.message;
          return acc;
        },
        {},
      );
      res.status(422).json({ success: false, error: 'Invalid query parameters', errors });
      return;
    }

    // req.query is a getter on Node's IncomingMessage — use defineProperty to override it.
    Object.defineProperty(req, 'query', {
      value:        result.data,
      writable:     true,
      configurable: true,
      enumerable:   true,
    });
    next();
  };
}
