/**
 * Local auth Zod schemas — mirrors the shared workspace definitions.
 * These live here so the backend can compile without the shared package
 * being linked.  Update both places if schema rules change.
 */
import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  email:     z.string().email('Invalid email address'),
  password:  passwordSchema,
  full_name: z.string().min(2).max(100).trim(),
  phone:     z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number — use international format'),
});

export const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z
  .object({
    token:           z.string().min(1, 'Reset token is required'),
    password:        passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path:    ['confirmPassword'],
  });

export type RegisterInput      = z.infer<typeof registerSchema>;
export type LoginInput         = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
