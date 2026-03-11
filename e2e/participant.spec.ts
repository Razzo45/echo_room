import { test, expect, Page } from '@playwright/test';
import { TEST } from './test-data';

/**
 * Participant flow – each test records a short video for the video library.
 * Requires: app running (npm run dev), seeded DB (npm run prisma:seed).
 */
async function ensureProfileCompleted(page: Page, name: string) {
  // Profile form uses label/input siblings without htmlFor; use placeholders to target inputs
  await page.getByPlaceholder(/your full name/i).fill(name);
  await page.getByPlaceholder(/company or institution/i).fill('E2E Org');
  await page.getByPlaceholder(/job title or position/i).fill('E2E Role');
  await page.getByPlaceholder(/where are you based/i).fill('E2E Country');
  await page.getByPlaceholder(/key skill you bring/i).fill('E2E Skill');
  await page.getByPlaceholder(/curious about in smart cities/i).fill('E2E Curiosity');
  await page.getByRole('button', { name: /continue to world map|save changes/i }).click();
  await page.waitForURL(/\/world/, { timeout: 15000 });
}

test.describe('Participant', () => {
  test('landing page shows Echo Room and event code form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /echo room/i })).toBeVisible();
    await expect(page.getByPlaceholder(/event code|SMARTCITY/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  });

  test('participant can enter event code and enable Continue', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await expect(page.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  test('participant submits event code and reaches profile or world', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    const url = page.url();
    expect(url.includes('/profile') || url.includes('/world')).toBeTruthy();
  });

  test('profile page shows create or edit profile form', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/world')) {
      await page.goto('/profile');
    }
    await expect(page.getByRole('heading', { name: /create profile|edit profile/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/your full name/i)).toBeVisible();
  });

  test('participant can fill and save profile then reach world', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/world')) await page.goto('/profile');
    await ensureProfileCompleted(page, 'E2E Participant');
    await expect(page.getByRole('heading', { name: /world map/i })).toBeVisible({ timeout: 8000 });
  });

  test('world map shows regions and welcome', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/profile')) {
      await ensureProfileCompleted(page, 'E2E World');
    }
    await expect(page.getByRole('heading', { name: /world map/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /city district/i })).toBeVisible({ timeout: 5000 });
  });

  test('district page shows quest list', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/profile')) {
      await ensureProfileCompleted(page, 'E2E District');
    }
    await page.goto('/district?regionName=city-district');
    await expect(page.getByRole('heading', { name: /city district|city-district|district/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /join quest/i })).toBeVisible({ timeout: 5000 });
  });

  test('participant can join a quest and see room lobby', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/profile')) {
      await ensureProfileCompleted(page, 'E2E Join');
    }
    await page.goto('/district?regionName=city-district');
    await page.waitForLoadState('networkidle').catch(() => {});
    const joinBtn = page.getByRole('button', { name: /join quest/i }).first();
    await joinBtn.click();
    await page.waitForURL(/\/room\//, { timeout: 15000 });
    // Lobby shows room code and team; if room auto-started we may be on play page
    await expect(
      page.getByText(/share this code|room code|decision \d+ of 3|choose one/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('participant can open room play page (voting or waiting state)', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/profile')) {
      await ensureProfileCompleted(page, 'E2E Play');
    }
    await page.goto('/district?regionName=city-district');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.getByRole('button', { name: /join quest/i }).first().click();
    await page.waitForURL(/\/room\/([^/]+)/, { timeout: 15000 });
    const roomId = page.url().match(/\/room\/([^/]+)/)?.[1];
    if (roomId) {
      await page.goto(`/room/${roomId}/play`);
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(page.getByText(/choose one|decision \d+ of \d+|you're done/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('room lobby shows room code and team section', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/profile')) {
      await ensureProfileCompleted(page, 'E2E Lobby');
    }
    await page.goto('/district?regionName=city-district');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.getByRole('button', { name: /join quest/i }).first().click();
    await page.waitForURL(/\/room\//, { timeout: 15000 });
    // Lobby: room code + team; or play page if room started
    await expect(page.getByText(/share this code|team|member|decision \d+ of \d+|choose one|submit vote/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('participant me page shows rooms or empty state', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/profile')) {
      await ensureProfileCompleted(page, 'E2E Me');
    }
    await page.goto('/me');
    await expect(page.getByRole('heading', { name: /my rooms|me|profile/i })).toBeVisible({ timeout: 8000 });
  });

  test('participant people page loads', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/profile')) {
      await ensureProfileCompleted(page, 'E2E People');
    }
    await page.goto('/people');
    await expect(page.getByRole('heading', { name: /people|discover|participants/i })).toBeVisible({ timeout: 8000 });
  });

  test('participant badges page loads', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/enter event code/i).fill(TEST.eventCode);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL(/\/(profile|world)/, { timeout: 15000 });
    if (page.url().includes('/profile')) {
      await ensureProfileCompleted(page, 'E2E Badges');
    }
    await page.goto('/badges');
    await expect(page.getByRole('heading', { name: /badges/i })).toBeVisible({ timeout: 8000 });
  });

  test('organiser login page shows form', async ({ page }) => {
    await page.goto('/organiser');
    await expect(page.getByRole('heading', { name: /organiser/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@example\.com/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('back to participant link on organiser page', async ({ page }) => {
    await page.goto('/organiser');
    await expect(page.getByRole('link', { name: /back to participant/i })).toBeVisible();
  });
});
