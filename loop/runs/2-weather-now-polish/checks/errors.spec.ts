import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, fullLabel } from './fixtures';

const LISBON = fullLabel('lisbon');

async function searchCity(page: import('@playwright/test').Page, term: string) {
  await page.getByLabel('City', { exact: true }).fill(term);
  await page.getByLabel('City', { exact: true }).press('Enter');
}

test('a search with no geocoding match shows a message and keeps the app usable', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { atlantis: [], lisbon: ['lisbon'] } });

  await page.goto('/');
  await searchCity(page, 'Atlantis');

  await expect(page.getByTestId('notice')).toHaveText(/atlantis/i);
  await expect(page.getByTestId('current-weather')).toBeHidden();
  await expect(page.getByTestId('forecast-days')).toBeHidden();

  await searchCity(page, 'Lisbon');
  await expect(page.getByTestId('notice')).toBeHidden();
  await expect(page.getByTestId('current-weather')).toBeVisible();
  await expect(page.getByTestId('current-weather').getByTestId('location-name')).toHaveText(LISBON);
});

test('a failing forecast request shows an error and the app still works afterwards', async ({ page }) => {
  await installOpenMeteoFixtures(page, {
    search: { paris: ['paris'], lisbon: ['lisbon'] },
    failingForecasts: ['paris'],
  });

  await page.goto('/');
  await searchCity(page, 'Paris');

  await expect(page.getByTestId('error')).toBeVisible();
  await expect(page.getByTestId('current-weather')).toBeHidden();
  await expect(page.getByTestId('forecast-days')).toBeHidden();

  await searchCity(page, 'Lisbon');
  await expect(page.getByTestId('error')).toBeHidden();
  await expect(page.getByTestId('current-weather')).toBeVisible();
  await expect(page.getByTestId('current-weather').getByTestId('location-name')).toHaveText(LISBON);
});

test('the error state offers a "Try again" action that re-runs the failed forecast', async ({ page }) => {
  await installOpenMeteoFixtures(page, {
    search: { paris: ['paris'] },
    failingOnce: ['paris'],
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await searchCity(page, 'Paris');

  await expect(page.getByTestId('error')).toBeVisible();
  await expect(page.getByTestId('current-weather')).toBeHidden();

  await page.getByTestId('try-again').click();
  await expect(page.getByTestId('error')).toBeHidden();
  await expect(page.getByTestId('current-weather')).toBeVisible();
  await expect(page.getByTestId('current-weather').getByTestId('location-name')).toHaveText(fullLabel('paris'));
  await expect(page.getByTestId('forecast-day')).toHaveCount(5);
});
