import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, WEEKDAYS } from './fixtures';

const HIGH_C = ['29°', '29°', '26°', '24°', '23°'];
const LOW_C = ['15°', '17°', '17°', '16°', '14°'];
const HIGH_F = ['83°', '84°', '79°', '75°', '73°'];
const LOW_F = ['59°', '62°', '63°', '61°', '58°'];
const CONDITIONS = ['Clear sky', 'Clear sky', 'Mainly clear', 'Partly cloudy', 'Overcast'];

async function searchParis(page: import('@playwright/test').Page) {
  await page.getByLabel('City', { exact: true }).fill('Paris');
  await page.getByLabel('City', { exact: true }).press('Enter');
}

test('a search shows exactly five forecast days with day name, high, low and condition', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });

  await page.goto('/');
  await expect(page.getByTestId('forecast-days')).toBeHidden();
  await searchParis(page);

  const rows = page.getByTestId('forecast-day');
  await expect(rows).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const row = rows.nth(i);
    await expect(row.getByTestId('day-name')).toHaveText(WEEKDAYS[i]);
    await expect(row.getByTestId('day-high')).toHaveText(HIGH_C[i]);
    await expect(row.getByTestId('day-low')).toHaveText(LOW_C[i]);
    await expect(row.getByTestId('day-condition')).toHaveText(CONDITIONS[i]);
  }
});

test('forecast highs and lows convert when Fahrenheit is selected', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });

  await page.goto('/');
  await searchParis(page);
  await page.getByTestId('unit-toggle').click();

  const rows = page.getByTestId('forecast-day');
  await expect(rows).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    await expect(rows.nth(i).getByTestId('day-name')).toHaveText(WEEKDAYS[i]);
    await expect(rows.nth(i).getByTestId('day-high')).toHaveText(HIGH_F[i]);
    await expect(rows.nth(i).getByTestId('day-low')).toHaveText(LOW_F[i]);
    await expect(rows.nth(i).getByTestId('day-condition')).toHaveText(CONDITIONS[i]);
  }
});
