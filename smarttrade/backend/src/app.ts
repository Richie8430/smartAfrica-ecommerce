import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { slowDown } from 'express-slow-down';
import hpp from 'hpp';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './utils/logger.js';
import { csrfMiddleware } from './middlewares/csrf.middleware.js';
import { mountSwagger } from './swagger.js';
import authRoutes     from './routes/auth.routes.js';
import webauthnRoutes from './routes/webauthn.routes.js';
import productRoutes  from './routes/product.routes.js';
import cartRoutes     from './routes/cart.routes.js';
import orderRoutes    from './routes/order.routes.js';
import paymentRoutes  from './routes/payment.routes.js';
import auditRoutes    from './routes/audit.routes.js';
import accountRoutes  from './routes/account.routes.js';
import adminRoutes    from './routes/admin.routes.js';
import devRoutes      from './routes/dev.routes.js';

const app = express();

// Trust first proxy hop so X-Forwarded-For is used for rate-limit key and req.ip.
app.set('trust proxy', 1);

// ─── (a) Helmet — security headers + custom CSP ───────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],
        imgSrc:      ["'self'", 'data:', 'https:'],
        connectSrc:  ["'self'", 'https://api.flutterwave.com'],
        frameSrc:    ["'none'"],
        objectSrc:   ["'none'"],
      },
    },
    // Helmet sets X-Frame-Options: SAMEORIGIN by default; we override to DENY below.
    frameguard: false,
  }),
);

// ─── (b) Additional security headers ─────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ─── (b2) X-Request-ID — unique ID per request for tracing ──────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.requestId   = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ─── (c) CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '').split(',').filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    // X-CSRF-Token must be allowed so the browser doesn't block preflight for mutations.
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }),
);

// ─── (d) Compression ──────────────────────────────────────────────────────────
app.use(compression());

// ─── (e) Morgan → Winston ─────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: {
      write: (msg: string) => {
        logger.info(msg.trim());
      },
    },
  }),
);

// ─── (e2) HPP — HTTP Parameter Pollution prevention ──────────────────────────
app.use(hpp());

// ─── (f) Webhook raw body — must come BEFORE express.json() ──────────────────
// Flutterwave sends application/json but we need the raw bytes to verify HMAC.
app.use('/api/v1/payments/webhook', express.raw({ type: '*/*' }));

// ─── (g) JSON body parser (2 MB limit) ───────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// ─── (h) URL-encoded body parser ─────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── (i) Global rate limiter — 100 req / 15 min per IP ───────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests' },
});
app.use(globalLimiter);

// ─── (i2) Slow-down — progressive delay after the 5th request in the window ──
// skip() short-circuits in test mode so integration tests don't accumulate delays.
app.use(
  slowDown({
    windowMs:   15 * 60 * 1000,
    delayAfter: 5,
    delayMs:    (used) => (used - 5) * 200,
    skip:       () => process.env['NODE_ENV'] === 'test',
  }),
);

// ─── (j) CSRF double-submit cookie ───────────────────────────────────────────
app.use(csrfMiddleware);

// ─── (k0) API docs — non-production only ─────────────────────────────────────
mountSwagger(app);

// ─── (k) Health check ────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── (l) API routes ──────────────────────────────────────────────────────────
app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/auth/webauthn', webauthnRoutes);
app.use('/api/v1/products',      productRoutes);
app.use('/api/v1/cart',          cartRoutes);
app.use('/api/v1/orders',        orderRoutes);
app.use('/api/v1/payments',      paymentRoutes);
app.use('/api/v1/account',       auditRoutes);    // /account/audit-log
app.use('/api/v1/account',       accountRoutes);  // /account/profile, /account/addresses, etc.
app.use('/api/v1/admin',         auditRoutes);    // /admin/audit-logs[/export]
app.use('/api/v1/admin',         adminRoutes);    // /admin/stats
// Dev-only routes (seed/cleanup for E2E tests) — guarded inside the router
app.use('/api/v1/dev',           devRoutes);

// ─── (m) 404 — no route matched ──────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── (n) Global error handler ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  const isProd = process.env['NODE_ENV'] === 'production';
  res.status(500).json({
    success: false,
    error: isProd ? 'Internal server error' : err.message,
  });
});

export default app;
