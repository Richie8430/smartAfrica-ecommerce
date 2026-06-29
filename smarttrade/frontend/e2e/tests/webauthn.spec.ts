/**
 * WebAuthn / Biometric E2E tests.
 * Uses Playwright's CDP virtual authenticator (Chromium-only — see playwright.config.ts
 * testIgnore on the firefox project).
 *
 * Tests 1 and 2 share a single browser context + virtual authenticator (via
 * test.describe.serial + beforeAll) so the credential enrolled in Test 1 is
 * still present on the "device" when Test 2 logs in with it, exactly as a real
 * user's authenticator would persist between visits.
 */

import { test, expect } from '@playwright/test';
import type { Browser, BrowserContext, Page, CDPSession } from '@playwright/test';
import { loginAsCustomer } from '../helpers/auth.helper';

const CUSTOMER_EMAIL = 'customer@smarttrade.test';

async function addVirtualAuthenticator(cdp: CDPSession): Promise<string> {
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol:                    'ctap2',
      transport:                   'internal',
      hasResidentKey:              true,
      hasUserVerification:         true,
      isUserVerified:              true,
      automaticPresenceSimulation: true,
    },
  });
  return authenticatorId;
}

test.describe.serial('WebAuthn / Biometric flows — enrollment then login', () => {
  let context: BrowserContext;
  let page: Page;
  let cdp: CDPSession;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    context = await browser.newContext();
    page    = await context.newPage();
    cdp     = await context.newCDPSession(page);
    await addVirtualAuthenticator(cdp);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Test 1 — Enrollment flow', async () => {
    await loginAsCustomer(page);

    // The post-login enroll prompt should appear automatically for a user
    // without biometric_enrolled yet.
    await expect(page.getByRole('heading', { name: 'Enable fingerprint login' })).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: 'Enable fingerprint login' }).click();

    // Virtual authenticator auto-approves the ceremony.
    await expect(page.getByText('Fingerprint enabled!')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Got it' }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/account'), { timeout: 10_000 });
    await expect(page).toHaveURL(/\/account/);

    // Verify the DB state — navigating to Security triggers a real authenticated
    // GET /auth/webauthn/credentials, so a populated list is a direct read of
    // what verifyRegistration() persisted (credential row + biometric_enrolled).
    await page.goto('/account/security');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('li', { hasText: 'Enrolled' }).first()).toBeVisible({ timeout: 8_000 });
  });

  test('Test 2 — Biometric login flow', async () => {
    // Log out (clear client-side session) — the credential from Test 1 is
    // still registered with the same virtual authenticator on this page.
    await context.clearCookies();
    await page.evaluate(() => localStorage.removeItem('smarttrade_auth'));

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').first().fill(CUSTOMER_EMAIL);
    await page.getByRole('button', { name: /sign in with fingerprint/i }).click();

    await page.waitForURL((url) => url.pathname.startsWith('/account'), { timeout: 15_000 });
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(/welcome back|test customer/i).first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('WebAuthn / Biometric flows — cancellation and revoke', () => {

  test('Test 3 — Cancellation is handled gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page    = await context.newPage();
    const cdp     = await context.newCDPSession(page);
    const authId  = await addVirtualAuthenticator(cdp);

    try {
      // Enroll a credential first so the auth-challenge step succeeds and we
      // actually reach the authenticator ceremony (otherwise we'd just hit the
      // "no fingerprint enrolled" case instead of a cancellation).
      await loginAsCustomer(page);
      await expect(page.getByRole('heading', { name: 'Enable fingerprint login' })).toBeVisible({ timeout: 8_000 });
      await page.getByRole('button', { name: 'Enable fingerprint login' }).click();
      await expect(page.getByText('Fingerprint enabled!')).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Got it' }).click();

      await context.clearCookies();
      await page.evaluate(() => localStorage.removeItem('smarttrade_auth'));

      // Remove the virtual authenticator — the next ceremony has nothing to
      // respond with, which is what we use to provoke the "cancelled" path.
      await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId: authId });

      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.locator('input[type="email"]').first().fill(CUSTOMER_EMAIL);
      await page.getByRole('button', { name: /sign in with fingerprint/i }).click();

      // Expect a visible error — not a crash, not a silent hang.
      await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15_000 });

      // The login form must still be visible and usable.
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    } finally {
      await context.close();
    }
  });

  test('Test 4 — Revoke credential', async ({ browser }) => {
    const context = await browser.newContext();
    const page    = await context.newPage();
    const cdp     = await context.newCDPSession(page);
    await addVirtualAuthenticator(cdp);

    try {
      await loginAsCustomer(page);
      await expect(page.getByRole('heading', { name: 'Enable fingerprint login' })).toBeVisible({ timeout: 8_000 });
      await page.getByRole('button', { name: 'Enable fingerprint login' }).click();
      await expect(page.getByText('Fingerprint enabled!')).toBeVisible({ timeout: 15_000 });
      await page.getByRole('button', { name: 'Got it' }).click();

      await page.goto('/account/security');
      await page.waitForLoadState('networkidle');

      const credentialRow = page.locator('li', { hasText: 'Enrolled' }).first();
      await expect(credentialRow).toBeVisible({ timeout: 8_000 });

      // Security.tsx's revoke confirmation is a native browser confirm() dialog.
      page.once('dialog', (dialog) => dialog.accept());
      await credentialRow.getByRole('button', { name: 'Revoke' }).click();

      await expect(credentialRow).not.toBeVisible({ timeout: 8_000 });
      await expect(page.getByText('No fingerprint enrolled on this account')).toBeVisible({ timeout: 5_000 });
    } finally {
      await context.close();
    }
  });
});
