import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, typeCity } from './fixtures';

test('a loading skeleton is shown while the forecast request is in flight', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] }, forecastDelayMs: 3000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await typeCity(page, 'Paris');

  await expect(page.getByTestId('loading')).toBeVisible({ timeout: 2000 });

  await page.getByTestId('current-weather').waitFor({ state: 'visible', timeout: 10_000 });
  await expect(page.getByTestId('loading')).toBeHidden();
});
