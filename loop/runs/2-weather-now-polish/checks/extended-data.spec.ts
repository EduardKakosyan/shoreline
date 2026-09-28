import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, typeCity, expectedHourWindow, apparentTempC, SUNRISE_TEXT, SUNSET_TEXT, precipMax, CITIES } from './fixtures';

test('current weather shows apparent temperature and sunrise/sunset, and the hourly strip lists the next 24 hours', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });

  await page.goto('/');
  await typeCity(page, 'Paris');
  const current = page.getByTestId('current-weather');
  await expect(current).toBeVisible();

  const apparentC = apparentTempC(CITIES.paris);
  await expect(current.getByTestId('feels-like')).toHaveText(`${apparentC}°C`);
  await expect(current.getByTestId('sunrise')).toHaveText(SUNRISE_TEXT);
  await expect(current.getByTestId('sunset')).toHaveText(SUNSET_TEXT);

  const items = page.getByTestId('hour-item');
  await expect(items).toHaveCount(24);
  const hours = expectedHourWindow('paris');
  for (const [i, hour] of hours.entries()) {
    const item = items.nth(i);
    await expect(item.getByTestId('hour-label')).toHaveText(hour.label);
    await expect(item.getByTestId('hour-temperature')).toHaveText(hour.tempC);
  }

  await page.getByTestId('unit-toggle').click();
  await expect(current.getByTestId('feels-like')).toHaveText(`${Math.round(apparentC * 9 / 5 + 32)}°F`);
  await expect(items.nth(0).getByTestId('hour-temperature')).toHaveText(hours[0].tempF);
  await expect(items.nth(23).getByTestId('hour-temperature')).toHaveText(hours[23].tempF);
});

test('each forecast day shows its precipitation probability', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });

  await page.goto('/');
  await typeCity(page, 'Paris');
  await expect(page.getByTestId('current-weather')).toBeVisible();

  const rows = page.getByTestId('forecast-day');
  await expect(rows).toHaveCount(5);
  const codes = CITIES.paris.daily.weather_code;
  for (const [i, code] of codes.entries()) {
    await expect(rows.nth(i).getByTestId('day-precip')).toHaveText(`${precipMax(code)}%`);
  }
});
