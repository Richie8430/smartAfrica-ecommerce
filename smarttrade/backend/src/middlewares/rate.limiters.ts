import rateLimit from 'express-rate-limit';
import { slowDown } from 'express-slow-down';

const isProd = process.env['NODE_ENV'] === 'production';

/** Login, register, forgot-password — 10 attempts per 15 minutes per IP in prod;
 *  relaxed to 200 in dev/test so E2E suites running from 127.0.0.1 don't self-throttle. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts — try again in 15 minutes.' },
});

/** OTP resend — 5 requests per hour per IP. */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many OTP requests — try again in 1 hour.' },
});

/** Payment initiation — 10 requests per minute per IP. */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many payment requests — slow down.' },
});

/**
 * Auth slow-down — adds 200 ms delay per request after the 5th in the window.
 * Applied before the hard rate limit so brute-force attempts get progressively
 * slower before they are blocked.
 */
export const authSlowDown = slowDown({
  windowMs:   15 * 60 * 1000,
  delayAfter: 5,
  delayMs:    (used: number) => (used - 5) * 200,
  skip:       () => process.env['NODE_ENV'] !== 'production',
});
