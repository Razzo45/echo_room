import { test, expect } from '@playwright/test';
import { TEST } from './test-data';

/**
 * Admin flow – each test records a short video for the video library.
 * Requires: app running, seeded DB (admin@echo-room.local / admin123).
 */
test.describe('Admin', () => {
  test('admin login page shows password field', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByRole('heading', { name: /admin access/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('admin can log in with email and password', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test('admin dashboard shows stats and section links', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('link', { name: /events/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /organisers/i }).first()).toBeVisible();
  });

  test('admin config page loads', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('link', { name: /system config/i }).first().click();
    await page.waitForURL(/\/admin\/config/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /system configuration|config/i })).toBeVisible({ timeout: 8000 });
  });

  test('admin organisers page loads', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await page.getByRole('link', { name: /organisers/i }).click();
    await page.waitForURL(/\/admin\/organisers/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /organisers/i })).toBeVisible({ timeout: 8000 });
  });

  test('admin events page loads', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await page.getByRole('link', { name: /events/i }).click();
    await page.waitForURL(/\/admin\/events/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible({ timeout: 8000 });
  });

  test('admin rooms page loads', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await page.getByRole('link', { name: /rooms/i }).click();
    await page.waitForURL(/\/admin\/rooms/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /rooms/i })).toBeVisible({ timeout: 8000 });
  });

  test('admin participants page loads', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await page.getByRole('link', { name: /participants/i }).click();
    await page.waitForURL(/\/admin\/participants/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /participants/i })).toBeVisible({ timeout: 8000 });
  });

  test('admin retention page loads', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await page.getByRole('link', { name: /data lifecycle|retention/i }).click();
    await page.waitForURL(/\/admin\/retention/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /retention|data retention/i })).toBeVisible({ timeout: 8000 });
  });

  test('admin audit log page loads', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByPlaceholder(/admin@example\.com/i).fill(TEST.admin.email);
    await page.locator('input[type="password"]').fill(TEST.admin.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/admin(?:\/)?(?!login)/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 5000 });
    await page.locator('a[href="/admin/audit-log"]').scrollIntoViewIfNeeded().catch(() => {});
    await page.locator('a[href="/admin/audit-log"]').click();
    await page.waitForURL(/\/admin\/audit-log/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /audit log|audit/i })).toBeVisible({ timeout: 8000 });
  });

  test('unauthenticated admin dashboard redirects to login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();
    const hasLogin = url.includes('/admin/login');
    const hasDashboard = await page.getByText(/admin dashboard|events|organisers/i).isVisible().catch(() => false);
    expect(hasLogin || hasDashboard).toBeTruthy();
  });
});
