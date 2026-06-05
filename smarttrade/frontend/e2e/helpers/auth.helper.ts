/**
 * Auth helpers for Playwright E2E tests.
 *
 * CSRF strategy:
 *  - page.request.get() exposes Set-Cookie response headers (unlike browser fetch)
 *  - We extract the csrf_token value and inject it via page.context().addCookies()
 *  - The React apiClient then reads document.cookie and sends X-CSRF-Token header
 */

import type { Page } from '@playwright/test';

const ADMIN_EMAIL    = 'admin@smarttrade.test';
const ADMIN_PASSWORD = 'Admin@1234';
const CUST_EMAIL     = 'customer@smarttrade.test';
const CUST_PASSWORD  = 'Customer@1234';
const API_DIRECT     = 'http://localhost:4000/api/v1';

/**
 * Obtains a fresh CSRF token from the backend and injects it directly
 * into the browser's cookie jar. After this call, js-cookie (`Cookies.get`)
 * will return the token and apiClient will add the X-CSRF-Token header.
 */
export async function warmCsrf(page: Page): Promise<string> {
  // page.request uses Playwright's HTTP client — it exposes Set-Cookie headers
  const res        = await page.request.get(`${API_DIRECT}/products`);
  const setCookie  = res.headers()['set-cookie'] ?? '';
  const rawToken   = setCookie.match(/csrf_token=([^;]+)/)?.[1] ?? '';
  const token      = decodeURIComponent(rawToken);

  if (token) {
    // Inject into the browser's cookie jar so the React apiClient can read it
    await page.context().addCookies([{
      name:   'csrf_token',
      value:  token,
      domain: 'localhost',
      path:   '/',
      // Do NOT set httpOnly — the client-side apiClient must be able to read it
    }]);
  }

  return token;
}

/** Fills and submits the login form, then waits for redirect away from /login. */
async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Inject CSRF token before the POST
  await warmCsrf(page);

  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);

  // exact: true distinguishes "Sign in" from "Sign in with fingerprint"
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await fillLoginForm(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}

export async function loginAsCustomer(page: Page): Promise<void> {
  await fillLoginForm(page, CUST_EMAIL, CUST_PASSWORD);
}

export interface RegisterOptions {
  email:     string;
  password:  string;
  full_name: string;
  phone?:    string;
}

/**
 * Registers + verifies a user via direct API calls (using page.request so
 * we can extract and send CSRF tokens), then logs in via the UI.
 *
 * Relies on the backend returning `otp` in non-production mode.
 */
export async function registerAndLogin(page: Page, opts: RegisterOptions): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const token = await warmCsrf(page);
  if (!token) throw new Error('Could not obtain CSRF token from the backend');

  const authHeaders = {
    'X-CSRF-Token': token,
    'Cookie':       `csrf_token=${token}`,
  };

  // Register — use page.request so we can set custom headers
  const regRes  = await page.request.post(`${API_DIRECT}/auth/register`, {
    data:    {
      email:     opts.email,
      password:  opts.password,
      full_name: opts.full_name,
      // Generate a unique phone per call so concurrent runs don't clash on the unique constraint
      phone:     opts.phone ?? `+234${String(Date.now()).slice(-10)}`,
    },
    headers: authHeaders,
  });

  const regBody = await regRes.json() as {
    success: boolean;
    data?: { userId: string; otp?: string };
    error?: string;
  };

  if (!regRes.ok || !regBody.data) {
    throw new Error(`Registration failed: ${regBody.error ?? regRes.status()}`);
  }

  const { userId, otp } = regBody.data;
  if (!otp) throw new Error('OTP not returned — is NODE_ENV set to production?');

  // Verify email
  const verifyRes = await page.request.post(`${API_DIRECT}/auth/verify-email`, {
    data:    { userId, otp },
    headers: authHeaders,
  });
  if (!verifyRes.ok) throw new Error(`OTP verification failed: ${verifyRes.status()}`);

  // Log in via UI (CSRF cookie already injected into the browser above)
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.locator('input[type="email"]').first().fill(opts.email);
  await page.locator('input[type="password"]').first().fill(opts.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 });
}
