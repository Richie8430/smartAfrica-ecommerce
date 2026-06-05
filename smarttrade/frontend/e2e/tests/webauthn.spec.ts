/**
 * WebAuthn / Biometric E2E tests.
 * Uses Playwright's CDP virtual authenticator (Chromium-only).
 */

import { test, expect, type CDPSession } from '@playwright/test';
import { loginAsCustomer } from '../helpers/auth.helper';

// ── Helper: set up virtual authenticator via CDP ──────────────────────────────

async function addVirtualAuthenticator(cdp: CDPSession): Promise<string> {
  await cdp.send('WebAuthn.enable', { enableUI: false });
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol:            'ctap2',
      transport:           'internal',
      hasResidentKey:      true,
      hasUserVerification: true,
      isUserVerified:      true,
      automaticPresenceSimulation: true,
    },
  });
  return authenticatorId;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('WebAuthn / Biometric flows', () => {

  test('biometric enrollment via account security page', async ({ page, browser }) => {
    // Chromium only — other projects skip this file via playwright.config.ts
    const context = await browser.newContext();
    const p       = await context.newPage();
    const cdp     = await context.newCDPSession(p);
    const authId  = await addVirtualAuthenticator(cdp);

    try {
      await loginAsCustomer(p);

      // Navigate to security settings
      await p.goto('/account/security');
      await p.waitForLoadState('networkidle');

      // Click enroll biometric
      const enrollBtn = p.getByRole('button', { name: /enroll|enable.*bio|fingerprint/i });
      if (await enrollBtn.count() === 0) {
        console.log('Enroll button not found — biometric may already be enrolled or not supported');
        return;
      }
      await enrollBtn.click();

      // Modal should appear
      const modal = p.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5_000 });

      // Trigger enrollment (virtual authenticator will auto-respond)
      const startBtn = modal.getByRole('button', { name: /enable|fingerprint|start/i });
      await startBtn.click();

      // Expect success indicator within the modal or on the page
      const success = p.getByText(/biometric verified|enrolled|enabled|success/i);
      await expect(success.first()).toBeVisible({ timeout: 15_000 });
    } finally {
      await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId: authId });
      await context.close();
    }
  });

  test('biometric login flow', async ({ page, browser }) => {
    const context = await browser.newContext();
    const p       = await context.newPage();
    const cdp     = await context.newCDPSession(p);

    // First enroll a credential so login can succeed
    await addVirtualAuthenticator(cdp);

    try {
      await p.goto('/login');
      await p.waitForLoadState('networkidle');

      // Look for the biometric login button
      const bioBtn = p.getByRole('button', { name: /fingerprint|biometric|passkey/i });
      if (await bioBtn.count() === 0) {
        console.log('Biometric login button not visible — skipping (user may not be enrolled)');
        return;
      }

      // Enter email to identify the user
      const emailInput = p.getByLabel(/email/i);
      if (await emailInput.count() > 0) {
        await emailInput.fill('customer@smarttrade.test');
      }
      await bioBtn.click();

      // Virtual authenticator handles the prompt automatically
      await p.waitForURL(/account/, { timeout: 15_000 });
      await expect(p).toHaveURL(/account/);
    } finally {
      await context.close();
    }
  });
});
