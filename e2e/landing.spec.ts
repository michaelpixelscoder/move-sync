import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop', width: 1440, height: 1024 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'android-phone', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`captures the logged-out landing page on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Keep every rehearsal safe' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continue with Google' }),
    ).toBeVisible();
    await page.screenshot({
      path: `artifacts/screenshots/web/landing-${viewport.name}.png`,
      fullPage: true,
    });
  });
}
