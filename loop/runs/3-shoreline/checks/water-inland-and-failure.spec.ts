import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, typeCity, searchMapForKeys, fullLabel, MARINE, metres } from './fixtures';

const SEARCH = searchMapForKeys(['cascais', 'lisbon', 'paris', 'cairo']);

test('an inland place shows the weather and nothing about the sea', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: SEARCH });
  await page.goto('/');
  await typeCity(page, 'Paris');
  await expect(page.getByTestId('current-weather')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('forecast-day')).toHaveCount(5);
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('water')).toBeHidden();
  await expect(page.getByTestId('marine-unavailable')).toBeHidden();
  await expect(page.getByTestId('beach-rating')).toBeHidden();
});

test('going from a coastal place to an inland one removes the sea section', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: SEARCH });
  await page.goto('/');
  await typeCity(page, 'Cascais');
  await expect(page.getByTestId('water')).toBeVisible({ timeout: 15_000 });
  await typeCity(page, 'Cairo');
  await expect(page.getByTestId('current-weather').getByTestId('location-name')).toHaveText(fullLabel('cairo'));
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('water')).toBeHidden();
  await expect(page.getByTestId('marine-unavailable')).toBeHidden();
});

test('when the sea data fails, the weather still shows with a short note, and the next place works', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: SEARCH, failingMarine: ['cascais'] });
  await page.goto('/');
  await typeCity(page, 'Cascais');
  await expect(page.getByTestId('current-weather')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('forecast-day')).toHaveCount(5);
  await expect(page.getByTestId('marine-unavailable')).toBeVisible();
  await expect(page.getByTestId('error')).toBeHidden();
  await expect(page.getByTestId('beach-rating')).toBeHidden();

  await typeCity(page, 'Lisbon');
  await expect(page.getByTestId('water').getByTestId('wave-height')).toHaveText(metres(MARINE.lisbon.current.wave_height), { timeout: 15_000 });
  await expect(page.getByTestId('marine-unavailable')).toBeHidden();
});
