import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures } from './fixtures';

async function searchParis(page: import('@playwright/test').Page) {
  await page.getByLabel('City', { exact: true }).fill('Paris');
  await page.getByLabel('City', { exact: true }).press('Enter');
}

test('the unit toggle converts temperatures and wind, and survives reloads', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });

  await page.goto('/');
  await searchParis(page);

  const current = page.getByTestId('current-weather');
  await expect(current.getByTestId('current-temperature')).toHaveText('28°C');
  await expect(current.getByTestId('wind')).toHaveText('12 km/h');

  await page.getByTestId('unit-toggle').click();
  await expect(current.getByTestId('current-temperature')).toHaveText('82°F');
  await expect(current.getByTestId('wind')).toHaveText('7 mph');
  await expect(page.getByTestId('forecast-day').first().getByTestId('day-high')).toHaveText('83°');

  await page.reload();
  await searchParis(page);
  await expect(current.getByTestId('current-temperature')).toHaveText('82°F');
  await expect(current.getByTestId('wind')).toHaveText('7 mph');

  await page.getByTestId('unit-toggle').click();
  await expect(current.getByTestId('current-temperature')).toHaveText('28°C');
  await expect(current.getByTestId('wind')).toHaveText('12 km/h');

  await page.reload();
  await searchParis(page);
  await expect(current.getByTestId('current-temperature')).toHaveText('28°C');
  await expect(page.getByTestId('forecast-day').first().getByTestId('day-high')).toHaveText('29°');
});
