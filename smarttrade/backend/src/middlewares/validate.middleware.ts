import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Factory that validates req.body against a Zod schema.
 * Returns 422 with a field→message error map on failure.
 * Replaces req.body with the safely-parsed (coerced) data on success.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.reduce<Record<string, string>>(
        (acc, issue) => {
          const field = issue.path.join('.') || '_root';
          acc[field] = issue.message;
          return acc;
        },
        {},
      );

      res.status(422).json({ success: false, error: 'Validation failed', errors });
      return;
    }

    req.body = result.data;
    next();
  };
}
