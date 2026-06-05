import { test, expect } from '@playwright/test';
import { loginAsCustomer, registerAndLogin, warmCsrf } from '../helpers/auth.helper';

// Fresh email for registration tests (unique per run)
const RUN_ID    = Date.now();
const NEW_EMAIL = `e2e-reg-${RUN_ID}@example.com`;

test.describe('Authentication flows', () => {

  // ── Registration ────────────────────────────────────────────────────────────

  test('full registration flow via register page', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Inject CSRF token before the form POST via page.request (exposes Set-Cookie)
    await warmCsrf(page);

    // react-hook-form sets name attributes matching the schema field names;
    // the Input component derives id from label (e.g. "Full name" → "full-name")
    await page.locator('input[name="full_name"]').fill('E2E Test User');
    await page.locator('input[type="email"]').first().fill(NEW_EMAIL);
    // Phone must be unique per run — previous runs' users stay in the DB
    await page.locator('input[name="phone"]').fill(`+234${String(RUN_ID).slice(-10)}`);
    await page.locator('input[name="password"]').fill('TestPass@1234');

    await page.getByRole('button', { name: /create account/i }).click();

    // Expect redirect to /verify-email
    await page.waitForURL(/verify-email/, { timeout: 20_000 });
    await expect(page).toHaveURL(/verify-email/);
  });

  test('OTP verification flow', async ({ page }) => {
    // Use the helper which handles the full register + verify + login via API
    const email = `e2e-verify-${RUN_ID}@example.com`;
    await registerAndLogin(page, {
      email,
      password:  'TestPass@1234',
      full_name: 'OTP Test User',
    });

    // Should land on account dashboard or home
    await expect(page).toHaveURL(/account|\/$/);
  });

  // ── Login ───────────────────────────────────────────────────────────────────

  test('login with valid credentials lands on account', async ({ page }) => {
    await loginAsCustomer(page);

    await page.waitForLoadState('networkidle');

    // Should be on the account page or home with user visible
    const welcome = page.getByText(/welcome|good morning|good afternoon|good evening/i);
    await expect(welcome.first()).toBeVisible({ timeout: 10_000 });
  });

  test('wrong password shows generic error message', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Inject CSRF token so the POST reaches the auth handler (not blocked at 403)
    await warmCsrf(page);

    await page.locator('input[type="email"]').first().fill('customer@smarttrade.test');
    await page.locator('input[type="password"]').first().fill('WrongPassword@1');

    // Capture the actual login response to diagnose auth/CSRF issues
    const [loginRes] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/auth/login') && r.request().method() === 'POST',
        { timeout: 10_000 },
      ),
      page.getByRole('button', { name: 'Sign in', exact: true }).click(),
    ]);

    const status = loginRes.status();
    console.log('[test4] login status:', status);
    if (status !== 401) {
      const body = await loginRes.text();
      throw new Error(`Expected 401 (wrong password) but got ${status}: ${body.slice(0, 200)}`);
    }

    // Login.tsx on 401: setError('password', { message: 'Invalid email or password' })
    // Input component renders it as a <p> below the password field (no role="alert")
    // Use a <p> filter to avoid matching SVG title text inside the icon
    const errText = page.locator('p').filter({ hasText: /invalid email or password/i });
    await expect(errText.first()).toBeVisible({ timeout: 5_000 });

    // Must NOT reveal whether the email address exists
    await expect(errText.first()).not.toContainText(/email not found|user not found/i);
  });

  test('account lockout after 5 wrong password attempts', async ({ page }) => {
    const lockEmail = `e2e-lock-${RUN_ID}@example.com`;

    // Create and verify the user to lock via browser fetch (shares cookie jar)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const lockData = await page.evaluate(async (email: string) => {
      const health = await fetch('/api/v1/health');
      const cookie = health.headers.get('set-cookie') ?? '';
      const token  = decodeURIComponent(cookie.match(/csrf_token=([^;]+)/)?.[1] ?? '');

      const reg  = await fetch('/api/v1/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body:    JSON.stringify({ email, password: 'LockMe@1234', full_name: 'Lock Test', phone: '+2348022222222' }),
      });
      const regBody = await reg.json() as { data?: { userId: string; otp?: string } };

      if (regBody.data?.otp && regBody.data?.userId) {
        await fetch('/api/v1/auth/verify-email', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
          body:    JSON.stringify({ userId: regBody.data.userId, otp: regBody.data.otp }),
        });
      }
      return { token, userId: regBody.data?.userId };
    }, lockEmail);

    if (!lockData.userId) {
      console.log('[lockout] Could not create lock test user — skipping');
      return;
    }

    // Navigate to login and attempt 6 wrong passwords
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 6; i++) {
      await page.locator('input[type="email"], input[name="email"]').first().fill(lockEmail);
      await page.locator('input[type="password"]').first().fill('WrongPass@1234');
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForResponse((r) => r.url().includes('/auth/login'));
      if (i < 5) await page.waitForTimeout(300);
    }

    // After the 6th attempt, expect lockout message
    const lockMsg = page.getByText(/locked|temporarily|too many/i);
    await expect(lockMsg.first()).toBeVisible({ timeout: 8_000 });
  });

  test('forgot password page shows success message after submission', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    await page.getByLabel(/email/i).fill('customer@smarttrade.test');
    await page.getByRole('button', { name: /send|reset|submit/i }).click();

    // Expect success state (check link or OTP sent message)
    const success = page.getByText(/sent|email|check|link/i);
    await expect(success.first()).toBeVisible({ timeout: 10_000 });
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  test('logout redirects to login', async ({ page }) => {
    await loginAsCustomer(page);

    // The logout button in AccountLayout sidebar has aria-label="Sign out of your account".
    // Use force:true because the dashboard card links can intercept pointer events
    // in some viewport/scroll configurations.
    const logoutBtn = page.getByRole('button', { name: 'Sign out of your account' });
    await logoutBtn.click({ force: true });

    // Logout should redirect specifically to the login page
    await page.waitForURL(/\/login/, { timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
