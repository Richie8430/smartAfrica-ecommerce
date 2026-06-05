/**
 * Accessibility audit using @axe-core/playwright.
 * Runs axe on every public and authenticated page, fails on critical violations.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsCustomer } from '../helpers/auth.helper';
import { getFixtures } from '../helpers/api.helper';

// Pages to audit without authentication
const PUBLIC_PAGES = [
  { path: '/',              name: 'Home' },
  { path: '/products',      name: 'Products listing' },
  { path: '/login',         name: 'Login' },
  { path: '/register',      name: 'Register' },
  { path: '/forgot-password', name: 'Forgot password' },
  { path: '/privacy',       name: 'Privacy policy' },
  { path: '/terms',         name: 'Terms of service' },
];

// Pages that require authentication
const PROTECTED_PAGES = [
  { path: '/cart',              name: 'Cart' },
  { path: '/checkout',          name: 'Checkout' },
  { path: '/orders',            name: 'My orders' },
  { path: '/account',           name: 'Account dashboard' },
  { path: '/account/profile',   name: 'Account profile' },
  { path: '/account/orders',    name: 'Account orders' },
  { path: '/account/security',  name: 'Account security' },
  { path: '/account/addresses', name: 'Account addresses' },
];

// ── Utility ──────────────────────────────────────────────────────────────────

function formatViolation(v: { id: string; impact?: string; description: string; nodes: { html: string }[] }): string {
  const node = v.nodes[0]?.html ?? '(no element)';
  return `[${v.impact ?? 'unknown'}] ${v.id}: ${v.description}\n  Element: ${node.slice(0, 120)}`;
}

// ── Public page audits ───────────────────────────────────────────────────────

for (const { path, name } of PUBLIC_PAGES) {
  test(`accessibility – ${name} (${path})`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Filter out known false positives and low-impact issues in dev builds
    const critical = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact ?? ''),
    );

    if (critical.length > 0) {
      const details = critical.map(formatViolation).join('\n\n');
      console.error(`\n── Accessibility violations on ${name} ──\n${details}\n`);
    }

    expect(
      critical.length,
      `${critical.length} critical/serious axe violation(s) on "${name}":\n` +
        critical.map(formatViolation).join('\n'),
    ).toBe(0);
  });
}

// ── Protected page audits ────────────────────────────────────────────────────

test.describe('Accessibility – authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCustomer(page);
  });

  for (const { path, name } of PROTECTED_PAGES) {
    test(`accessibility – ${name} (${path})`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = results.violations.filter((v) =>
        ['critical', 'serious'].includes(v.impact ?? ''),
      );

      if (critical.length > 0) {
        const details = critical.map(formatViolation).join('\n\n');
        console.error(`\n── Accessibility violations on ${name} ──\n${details}\n`);
      }

      expect(
        critical.length,
        `${critical.length} critical/serious axe violation(s) on "${name}":\n` +
          critical.map(formatViolation).join('\n'),
      ).toBe(0);
    });
  }

  test(`accessibility – Product detail page`, async ({ page }) => {
    let productPath = '/products';
    try {
      const f = getFixtures();
      if (f.productId) productPath = `/products/${f.productId}`;
    } catch { /* use fallback */ }

    await page.goto(productPath);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact ?? ''),
    );

    expect(
      critical.length,
      critical.map(formatViolation).join('\n'),
    ).toBe(0);
  });
});
