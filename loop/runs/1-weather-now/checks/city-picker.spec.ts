import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, fullLabel } from './fixtures';

const KEYS = ['london_gb', 'london_ca', 'london_oh', 'london_ky', 'london_ar'];

test('several matches offer up to five "City, Region, Country" options and the pick opens', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { london: KEYS } });

  await page.goto('/');
  await page.getByLabel('City', { exact: true }).fill('London');
  await page.getByLabel('City', { exact: true }).press('Enter');

  const options = page.getByTestId('match-option');
  await expect(options).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await expect(options.nth(i)).toHaveText(fullLabel(KEYS[i]));
  }
  await expect(page.getByTestId('current-weather')).toBeHidden();

  await options.nth(1).click();
  await expect(page.getByTestId('match-list')).toBeHidden();

  const current = page.getByTestId('current-weather');
  await expect(current).toBeVisible();
  await expect(current.getByTestId('location-name')).toHaveText(fullLabel('london_ca'));
  await expect(current.getByTestId('current-temperature')).toHaveText('9°C');
  await expect(current.getByTestId('current-condition')).toHaveText('Light rain');
  await expect(current.getByTestId('humidity')).toHaveText('71%');
  await expect(current.getByTestId('wind')).toHaveText('14 km/h');
  await expect(page.getByTestId('forecast-day')).toHaveCount(5);
});

test('the picker replaces the previous results when a new search runs', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { london: KEYS, paris: ['paris'] } });

  await page.goto('/');
  const city = page.getByLabel('City', { exact: true });
  await city.fill('London');
  await city.press('Enter');
  await expect(page.getByTestId('match-option')).toHaveCount(5);

  await city.fill('Paris');
  await city.press('Enter');
  await expect(page.getByTestId('match-list')).toBeHidden();
  await expect(page.getByTestId('current-weather').getByTestId('location-name')).toHaveText(fullLabel('paris'));
});
