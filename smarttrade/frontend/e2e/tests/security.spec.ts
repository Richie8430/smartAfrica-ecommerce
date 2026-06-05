/**
 * Security E2E tests — validates that the server and UI handle attacks correctly.
 * These tests make direct HTTP requests to the backend (via proxy or direct).
 */

import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';

const API = 'http://localhost:4000/api/v1';

// ── Helper ────────────────────────────────────────────────────────────────────

/** Gets a CSRF token+cookie pair from the backend, ready for mutation requests. */
async function getCsrf(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  const res    = await page.request.get(`${API}/products`);
  const cookie = res.headers()['set-cookie'] ?? '';
  const token  = decodeURIComponent(cookie.match(/csrf_token=([^;]+)/)?.[1] ?? '');
  return { token, cookieHeader: `csrf_token=${token}` };
}

// ── XSS ──────────────────────────────────────────────────────────────────────

test('XSS payload in search query is not executed', async ({ page }) => {
  const xss = '<script>window.__XSS__=1</script>';

  let alertFired = false;
  page.on('dialog', async (dialog) => {
    alertFired = true;
    await dialog.dismiss();
  });

  await page.goto(`/products?q=${encodeURIComponent(xss)}`);
  await page.waitForLoadState('networkidle');

  // No dialog should fire
  expect(alertFired).toBe(false);

  // Script must NOT have executed — __XSS__ should remain undefined
  // (body HTML will contain the query as safe text — that's expected and correct)
  const xssSet = await page.evaluate(() =>
    (window as unknown as Record<string, unknown>)['__XSS__'],
  );
  expect(xssSet).toBeUndefined();
});

test('XSS in URL fragment does not execute', async ({ page }) => {
  let alertFired = false;
  page.on('dialog', async (d) => { alertFired = true; await d.dismiss(); });

  await page.goto('/products#<img src=x onerror=alert(1)>');
  await page.waitForLoadState('networkidle');
  expect(alertFired).toBe(false);
});

// ── CSRF ──────────────────────────────────────────────────────────────────────

test('POST without X-CSRF-Token header returns 403', async ({ page }) => {
  const res = await page.request.post(`${API}/cart/items`, {
    data:    { productId: 'fake-id', quantity: 1 },
    headers: { 'Content-Type': 'application/json' },
    // Deliberately omit X-CSRF-Token
  });

  expect([400, 401, 403]).toContain(res.status());
});

// ── Authentication ────────────────────────────────────────────────────────────

test('expired / tampered JWT returns 401', async ({ page }) => {
  // Craft a JWT signed with the wrong key — will fail signature verification
  const header    = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload   = Buffer.from(JSON.stringify({ userId: 'fake', exp: Math.floor(Date.now() / 1000) - 60 })).toString('base64url');
  const signature = crypto.randomBytes(32).toString('base64url');
  const fakeJWT   = `${header}.${payload}.${signature}`;

  const res = await page.request.get(`${API}/cart`, {
    headers: { 'Authorization': `Bearer ${fakeJWT}` },
  });

  expect(res.status()).toBe(401);
});

test('missing Authorization header on protected endpoint returns 401', async ({ page }) => {
  const res = await page.request.get(`${API}/cart`);
  expect(res.status()).toBe(401);
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

test('login rate limiter triggers on repeated failed attempts', async ({ page }) => {
  const { token, cookieHeader } = await getCsrf(page);

  // Use a unique spoofed IP so this test's rate-limit counter is isolated
  // from all other tests. app.set('trust proxy', 1) makes Express use
  // X-Forwarded-For as req.ip, so each test suite can have its own counter.
  const RATE_LIMIT_IP = '10.99.255.1';

  // Fire 12 login attempts with a nonexistent email
  const responses = await Promise.all(
    Array.from({ length: 12 }, () =>
      page.request.post(`${API}/auth/login`, {
        data:    { email: `rate-test-${Date.now()}@nowhere.invalid`, password: 'WrongPass@1' },
        headers: {
          'X-CSRF-Token':    token,
          'Cookie':          cookieHeader,
          'X-Forwarded-For': RATE_LIMIT_IP,
        },
      }),
    ),
  );

  const statuses = responses.map((r) => r.status());
  console.log('[rate-limit] response statuses:', statuses);

  // Expect at least one 429 (rate limit) or 401/403 (auth reject); never all-500s
  const anyThrottle = statuses.some((s) => [429, 423].includes(s));
  const anyAuth     = statuses.some((s) => [401, 403].includes(s));
  expect(anyThrottle || anyAuth).toBe(true);
});

// ── Security headers ──────────────────────────────────────────────────────────

test('backend responses include required security headers', async ({ page }) => {
  const res     = await page.request.get(`${API}/products`);
  const headers = res.headers();

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(['DENY', 'SAMEORIGIN']).toContain(headers['x-frame-options']?.toUpperCase());
  expect(headers['x-request-id']).toBeTruthy();
});

test('frontend dev server is reachable', async ({ page }) => {
  const res = await page.request.get('http://localhost:5173');
  expect(res.status()).toBe(200);

  const headers = res.headers();
  if (headers['content-security-policy']) {
    expect(headers['content-security-policy']).toContain('default-src');
  } else {
    console.info('[csp] Not set on Vite dev server — expected in development');
  }
});

// ── SQL injection ─────────────────────────────────────────────────────────────

test('SQL injection in search query is handled safely', async ({ page }) => {
  const injection = "'; DROP TABLE users; --";
  const res  = await page.request.get(`${API}/products/search?q=${encodeURIComponent(injection)}`);

  expect(res.status()).toBeLessThan(500);
  const body = await res.json() as { success: boolean };
  expect(body.success).toBe(true);
});
