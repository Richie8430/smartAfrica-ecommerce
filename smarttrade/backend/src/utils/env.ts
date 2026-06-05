import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // JWT — RS256 key paths loaded from filesystem at runtime
  JWT_PRIVATE_KEY_PATH: z.string().min(1, 'JWT_PRIVATE_KEY_PATH is required'),
  JWT_PUBLIC_KEY_PATH: z.string().min(1, 'JWT_PUBLIC_KEY_PATH is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS is required'),

  // Flutterwave
  FLW_PUBLIC_KEY: z.string().min(1, 'FLW_PUBLIC_KEY is required'),
  FLW_SECRET_KEY: z.string().min(1, 'FLW_SECRET_KEY is required'),
  FLW_ENCRYPTION_KEY: z.string().min(1, 'FLW_ENCRYPTION_KEY is required'),
  FLW_WEBHOOK_HASH: z.string().min(1, 'FLW_WEBHOOK_HASH is required'),

  // SMTP
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  EMAIL_FROM: z.string().email('EMAIL_FROM must be a valid email address'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),

  // Monitoring (optional)
  SENTRY_DSN: z.string().url().optional(),

  // App URLs
  APP_URL: z.string().url('APP_URL must be a valid URL'),
  API_URL: z.string().url('API_URL must be a valid URL'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`);
  console.error('❌ Environment validation failed:\n' + missing.join('\n'));
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;
