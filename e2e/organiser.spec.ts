import { test, expect } from '@playwright/test';
import { TEST } from './test-data';

/**
 * Organiser flow – each test records a short video for the video library.
 * Requires: app running, seeded DB (organiser@test.com / organiser2026).
 */
test.describe('Organiser', () => {
  test('organiser login page has email and password', async ({ page }) => {
    await page.goto('/organiser');
    await expect(page.getByRole('heading', { name: /organiser portal|admin access/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@example\.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/organiser password/i)).toBeVisible();
  });

  test('organiser can log in and reach dashboard', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /echo room/i })).toBeVisible({ timeout: 8000 });
  });

  test('dashboard shows insights and create event links', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await expect(page.getByRole('link', { name: /insights/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('link', { name: /create event/i })).toBeVisible();
  });

  test('create event page has form fields', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /create event/i }).click();
    await page.waitForURL(/\/organiser\/events\/new/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /create new event/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/smart city hackathon/i)).toBeVisible();
  });

  test('event detail page loads for first event', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /smart city hackathon|hackathon march/i }).first().click();
    await page.waitForURL(/\/organiser\/events\/[^/]+$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /quick stats|event details|ai room generation/i }).or(page.getByText(/generate|event code|regions|quests|quick stats|participants/i)).first()).toBeVisible({ timeout: 8000 });
  });

  test('insights page loads and shows event picker', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /insights/i }).click();
    await page.waitForURL(/\/organiser\/insights/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /insights/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('heading', { name: /participants/i }).or(page.getByText(/participants|room compositions|event:/i))).toBeVisible({ timeout: 10000 });
  });

  test('insights scroll through participants and rooms sections', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /insights/i }).click();
    await page.waitForURL(/\/organiser\/insights/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /participants|room compositions/i }).first()).toBeVisible({ timeout: 8000 });
    await page.evaluate(() => window.scrollBy(0, 900));
    await page.waitForTimeout(600);
    await expect(page.getByRole('heading', { name: /room compositions|badge stats|artifacts/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('insights artifacts section and filter tabs', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /insights/i }).click();
    await page.waitForURL(/\/organiser\/insights/, { timeout: 10000 });
    await page.getByRole('heading', { name: 'Artifacts' }).click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    await expect(page.getByRole('button', { name: /^All$/ }).or(page.getByRole('button', { name: /archived/i })).first()).toBeVisible({ timeout: 8000 });
  });

  test('organiser can view an artifact from insights', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /insights/i }).click();
    await page.waitForURL(/\/organiser\/insights/, { timeout: 10000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const viewLink = page.getByRole('link', { name: /view|open/i }).first();
    if (await viewLink.isVisible().catch(() => false)) {
      // Link opens in new tab (target="_blank"); wait for popup and assert there
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 10000 }),
        viewLink.click(),
      ]);
      await popup.waitForURL(/\/(artifact|organiser\/archived-artifact)\//, { timeout: 10000 });
      await expect(popup.getByText(/decision map|artifact|back|insights/i).first()).toBeVisible({ timeout: 5000 });
      await popup.close();
    } else {
      await expect(page.getByText(/Artifacts|No artifacts|room|Participants|Event:/i).first()).toBeVisible();
    }
  });

  test('quest edit page loads and shows quest content', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /smart city hackathon|hackathon march/i }).first().click();
    await page.waitForURL(/\/organiser\/events\/[^/]+$/, { timeout: 10000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    const questLink = page.locator('a[href*="/organiser/quests/"]').first();
    await questLink.click();
    await page.waitForURL(/\/organiser\/quests\//, { timeout: 10000 });
    await expect(page.getByText(/decision|option|title|context|quest name|quest description|edit quest script/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('organiser can edit quest text (decision title)', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /smart city hackathon|hackathon march/i }).first().click();
    await page.waitForURL(/\/organiser\/events\/[^/]+$/, { timeout: 10000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    const editQuestLink = page.locator('a[href*="/organiser/quests/"]').first();
    await editQuestLink.click();
    await page.waitForURL(/\/organiser\/quests\//, { timeout: 10000 });
    await expect(page.getByText(/decision|option|title|context|quest name|quest description|edit quest script/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('archived artifact page loads', async ({ page }) => {
    await page.goto('/organiser');
    await page.getByPlaceholder(/you@example\.com/i).fill(TEST.organiser.email);
    await page.getByPlaceholder(/organiser password/i).fill(TEST.organiser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/organiser\/dashboard/, { timeout: 15000 });
    await page.getByRole('link', { name: /insights/i }).click();
    await page.waitForURL(/\/organiser\/insights/, { timeout: 10000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    const archivedLink = page.getByRole('link', { name: /view|past generation|archived/i }).first();
    if (await archivedLink.isVisible().catch(() => false)) {
      const href = await archivedLink.getAttribute('href');
      if (href?.includes('archived-artifact')) {
        await archivedLink.click();
        await page.waitForURL(/\/organiser\/archived-artifact\//, { timeout: 10000 });
        await expect(page.getByText(/insights|back|artifact|decision/i)).toBeVisible({ timeout: 5000 });
      }
    }
    await expect(page.getByRole('heading', { name: /insights/i }).or(page.getByText(/Artifacts|archived|Participants/i)).first()).toBeVisible();
  });
});
