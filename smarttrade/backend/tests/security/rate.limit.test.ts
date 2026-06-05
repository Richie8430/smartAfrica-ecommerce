/**
 * Security tests — Rate Limiting
 *
 * The auth limiter allows 10 requests per 15-minute window per IP.
 * Tests use a unique X-Forwarded-For IP (trust proxy is set in app.ts)
 * so each test run has its own counter and doesn't bleed into other suites.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

// Unique IP per test run to avoid colliding with other tests' rate-limit counters
const TEST_IP = `10.0.${Math.floor(Math.random() * 254) + 1}.${Math.floor(Math.random() * 254) + 1}`;

let csrf:         string;
let csrfCookieStr: string;

beforeAll(async () => {
  // Obtain a CSRF token using a plain GET (no agent needed for rate limit tests)
  const res = await request(app)
    .get('/api/v1/products')
    .set('X-Forwarded-For', TEST_IP);

  const setCookie  = (res.headers['set-cookie'] as string[] | undefined) ?? [];
  const csrfCookie = setCookie.find((c) => c.startsWith('csrf_token=')) ?? '';
  csrf             = decodeURIComponent(csrfCookie.split(';')[0]?.split('=')[1] ?? '');
  csrfCookieStr    = csrfCookie.split(';')[0] ?? '';
});

describe('Auth rate limiter', () => {
  it('allows the first 10 login attempts then returns 429 on the 11th', async () => {
    const loginPayload = { email: `ratelimit-${Date.now()}@example.com`, password: 'WrongPass@1' };

    // First 10 requests — should be 401 (wrong credentials) not 429
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', TEST_IP)
        .set('X-CSRF-Token', csrf)
        .set('Cookie', csrfCookieStr)
        .send(loginPayload);

      expect(res.status).not.toBe(429);
    }

    // 11th request — must be rate limited
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', TEST_IP)
      .set('X-CSRF-Token', csrf)
      .set('Cookie', csrfCookieStr)
      .send(loginPayload);

    expect(res.status).toBe(429);
    // express-rate-limit sets RateLimit-* standard headers
    expect(res.headers['ratelimit-limit'] ?? res.headers['x-ratelimit-limit']).toBeDefined();
  });

  it('response for a non-email auth-route request also rate-limits correctly', async () => {
    // Just verify the global limiter exists on a non-auth route with the same IP
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .set('X-Forwarded-For', TEST_IP)
      .set('X-CSRF-Token', csrf)
      .set('Cookie', csrfCookieStr)
      .send({ email: 'nobody@example.com' });

    // At this point we've already sent 11 requests to auth routes.
    // The auth-limiter window covers /register /login /forgot-password.
    // We should get 429 since the same IP is over the limit.
    expect(res.status).toBe(429);
  });
});
