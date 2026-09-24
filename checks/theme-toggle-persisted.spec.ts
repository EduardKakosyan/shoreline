import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, typeCity, isDarkBackground } from './fixtures';

test('the "Theme" toggle switches the theme and the choice survives reloads', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const toggle = page.getByRole('button', { name: 'Theme', exact: true });
  await expect(toggle).toBeVisible();

  const startedDark = await isDarkBackground(page);
  await toggle.click();
  await page.waitForTimeout(300);
  expect(await isDarkBackground(page)).toBe(!startedDark);

  await page.reload();
  await expect(toggle).toBeVisible();
  expect(await isDarkBackground(page)).toBe(!startedDark);

  await typeCity(page, 'Paris');
  await expect(page.getByTestId('current-weather')).toBeVisible();
  expect(await isDarkBackground(page)).toBe(!startedDark);

  await toggle.click();
  await page.waitForTimeout(300);
  await page.reload();
  expect(await isDarkBackground(page)).toBe(startedDark);
});
