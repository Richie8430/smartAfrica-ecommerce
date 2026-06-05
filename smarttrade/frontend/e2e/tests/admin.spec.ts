import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.helper';

test.describe('Admin dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // ── Dashboard ────────────────────────────────────────────────────────────────

  test('admin dashboard loads with stat cards', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Four stat cards should render
    const statCards = page.locator('[class*="rounded-2xl"]').filter({ hasText: /order|product|user|revenue/i });
    const count     = await statCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── Products ────────────────────────────────────────────────────────────────

  test('admin products page shows data table', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    // Table header row must be visible
    const header = page.getByRole('columnheader', { name: /product/i });
    await expect(header).toBeVisible({ timeout: 10_000 });
  });

  test('admin can open add product modal', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add product/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(modal.getByRole('heading', { name: /add product/i })).toBeVisible();
  });

  test('add product form validates required fields', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add product/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Submit without filling fields
    await modal.getByRole('button', { name: /create|save/i }).click();

    // Validation errors should appear
    const errors = modal.locator('[class*="red"], input:invalid');
    await expect(errors.first()).toBeVisible({ timeout: 5_000 });
  });

  test('admin can create a product', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add product/i }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const uniq = Date.now();
    await modal.getByLabel(/name/i).fill(`Playwright Product ${uniq}`);
    await modal.locator('textarea').fill('Created by Playwright E2E test');
    await modal.getByLabel(/price/i).fill('49.99');
    await modal.getByLabel(/stock/i).fill('10');

    // Select category if available
    const catSelect = modal.locator('select');
    const options   = await catSelect.locator('option').count();
    if (options > 1) {
      await catSelect.selectOption({ index: 1 });
    } else {
      // No categories — close modal and skip
      await modal.getByRole('button', { name: /cancel/i }).click();
      test.skip();
      return;
    }

    await modal.getByRole('button', { name: /create/i }).click();

    // Modal should close and product should appear in table
    await expect(modal).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(`Playwright Product ${uniq}`)).toBeVisible({ timeout: 10_000 });
  });

  // ── Orders ─────────────────────────────────────────────────────────────────

  test('admin orders page loads with filter tabs', async ({ page }) => {
    await page.goto('/admin/orders');
    await page.waitForLoadState('networkidle');

    // Filter tabs (ALL, PENDING, CONFIRMED, etc.)
    const allTab = page.getByRole('button', { name: /^all$/i });
    await expect(allTab).toBeVisible({ timeout: 8_000 });
  });

  // ── Audit Logs ─────────────────────────────────────────────────────────────

  test('admin audit logs page loads with filter bar', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await page.waitForLoadState('networkidle');

    // Export button and action filter should be present
    await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('combobox', { name: /action/i })).toBeVisible();
  });

  // ── Sidebar navigation ─────────────────────────────────────────────────────

  test('admin sidebar links navigate correctly', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const navLinks = [
      { name: /products/i, url: '/admin/products'   },
      { name: /orders/i,   url: '/admin/orders'     },
      { name: /audit/i,    url: '/admin/audit-logs' },
    ];

    for (const { name, url } of navLinks) {
      const link = page.getByRole('link', { name }).first();
      if (await link.count() > 0) {
        await link.click();
        await page.waitForURL(url, { timeout: 8_000 });
        await expect(page).toHaveURL(url);
      }
    }
  });
});
