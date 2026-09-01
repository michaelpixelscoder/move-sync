import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const appOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8081').origin;

test.describe('Move Sync web', () => {
  test('browses real cloud videos, plays one, and shows stored metadata', async ({ page }) => {
    const pageErrors: string[] = []; page.on('pageerror', error => pageErrors.push(error.message));
    await page.setViewportSize({ width: 1920, height: 1080 }); await page.goto('/'); await expect(page.getByRole('heading', { name: 'Videos' })).toBeVisible(); await page.waitForTimeout(700); await page.screenshot({ path: 'artifacts/desktop-library.png', fullPage: true });
    await expect(page.getByLabel(/sintel_trailer-480p\.mp4, Backed up/)).toBeVisible(); await expect(page.getByLabel(/trailer_iphone\.m4v, Backed up/)).toBeVisible();
    await page.getByLabel(/sintel_trailer-480p\.mp4, Backed up/).click(); await expect(page.locator('video').first()).toBeVisible();
    await page.getByLabel('Show video details').click(); await expect(page.getByText('Details')).toBeVisible(); await expect(page.getByText('Backed up')).toBeVisible(); await expect(page.getByText(/MB/).first()).toBeVisible();
    await page.screenshot({ path: 'artifacts/web-player.png', fullPage: true }); expect(pageErrors).toEqual([]);
  });

  test('uploads a real video through the web picker and Convex Storage', async ({ page }) => {
    const uploadName = `playwright-upload-${Date.now()}.m4v`;
    await page.goto('/'); const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Upload' }).click(); const fileChooser = await chooser; await fileChooser.setFiles({ name: uploadName, mimeType: 'video/mp4', buffer: readFileSync('/tmp/move-sync-real-demo/trailer_iphone.m4v') });
    await expect(page.getByLabel(`${uploadName}, uploading`)).toBeVisible({ timeout: 20_000 });
    await page.getByRole('tab', { name: 'All' }).click(); await expect(page.getByLabel(`${uploadName}, Backed up`)).toBeVisible({ timeout: 60_000 });
  });

  test('selects and shares cloud media, and provides usable desktop navigation', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: appOrigin }); await page.setViewportSize({ width: 1920, height: 1080 }); await page.goto('/'); const card = page.getByLabel(/sintel_trailer-480p\.mp4, Backed up/); const box = await card.boundingBox(); if (!box) throw new Error('Media card has no bounds'); await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
    await expect(page.getByText('1 selected')).toBeVisible(); await page.getByRole('button', { name: 'Share' }).click(); await expect(page.getByText('1 selected')).toBeHidden();
    await page.getByRole('button', { name: 'Collections' }).click(); await expect(page.getByRole('heading', { name: 'Collections' })).toBeVisible();
    await page.getByRole('button', { name: 'Backup' }).click(); await expect(page.getByText('Automatic backup is managed on your phone')).toBeVisible(); await page.screenshot({ path: 'artifacts/desktop-autosync.png', fullPage: true });
  });

  test('uses the mobile list and bottom navigation without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/'); await expect(page.getByRole('button', { name: 'Videos' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Backup' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Videos' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); expect(overflow).toBeLessThanOrEqual(1); await page.screenshot({ path: 'artifacts/mobile-library.png', fullPage: true });
    await page.getByRole('button', { name: 'Settings' }).click(); await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible(); await page.getByRole('button', { name: 'Automatic backup' }).click(); await expect(page.getByRole('heading', { name: 'Backup' })).toBeVisible();
  });
});
