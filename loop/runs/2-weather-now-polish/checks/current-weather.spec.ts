import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, fullLabel } from './fixtures';

async function searchCity(page: import('@playwright/test').Page, term: string) {
  await page.getByLabel('City', { exact: true }).fill(term);
  await page.getByLabel('City', { exact: true }).press('Enter');
}

test('searching a single-match city shows its current weather', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });

  await page.goto('/');
  await searchCity(page, 'Paris');

  const current = page.getByTestId('current-weather');
  await expect(current).toBeVisible();
  await expect(current.getByTestId('location-name')).toHaveText(fullLabel('paris'));
  await expect(current.getByTestId('current-temperature')).toHaveText('28°C');
  await expect(current.getByTestId('current-condition')).toHaveText('Clear sky');
  await expect(current.getByTestId('humidity')).toHaveText('41%');
  await expect(current.getByTestId('wind')).toHaveText('12 km/h');
  await expect(page.getByTestId('empty-state')).toBeHidden();
});

test('humidity stays a percentage when switching to Fahrenheit', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });

  await page.goto('/');
  await searchCity(page, 'Paris');
  await page.getByTestId('unit-toggle').click();

  const current = page.getByTestId('current-weather');
  await expect(current.getByTestId('current-temperature')).toHaveText('82°F');
  await expect(current.getByTestId('wind')).toHaveText('7 mph');
  await expect(current.getByTestId('humidity')).toHaveText('41%');
});
