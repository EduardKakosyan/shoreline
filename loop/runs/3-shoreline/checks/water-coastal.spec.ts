import { test, expect } from '@playwright/test';
import {
  installOpenMeteoFixtures, typeCity, searchMapForKeys, MARINE, tideEventsToday, tideTrend,
  metres, feet, compass, moonPhaseToday,
} from './fixtures';

const SEARCH = searchMapForKeys(['cascais', 'lisbon', 'newquay', 'paris']);

test('a coastal place shows sea conditions: wave height and period, swell direction, sea temperature', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: SEARCH });
  await page.goto('/');
  await typeCity(page, 'Cascais');

  const water = page.getByTestId('water');
  await expect(water).toBeVisible({ timeout: 15_000 });
  const m = MARINE.cascais.current;
  await expect(water.getByTestId('wave-height')).toHaveText(metres(m.wave_height));
  await expect(water.getByTestId('wave-period')).toHaveText(`${Math.round(m.wave_period)} s`);
  await expect(water.getByTestId('swell-direction')).toHaveText(compass(m.swell_wave_direction));
  await expect(water.getByTestId('sea-temperature')).toHaveText(`${Math.round(m.sea_surface_temperature)}°C`);
});

test('a coastal place shows today\'s tides: rising or falling now, each high and low with time and height, and a tide chart', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: SEARCH });
  await page.goto('/');
  await typeCity(page, 'Cascais');

  const water = page.getByTestId('water');
  await expect(water).toBeVisible({ timeout: 15_000 });
  await expect(water.getByTestId('tide-trend')).toHaveText(tideTrend('cascais'));
  await expect(water.getByTestId('tide-note')).toHaveText(/approximate/i);
  await expect(water.getByTestId('tide-chart')).toBeVisible();

  const expected = tideEventsToday('cascais');
  const rows = water.getByTestId('tide-event');
  await expect(rows).toHaveCount(expected.length);
  for (const [i, e] of expected.entries()) {
    await expect(rows.nth(i).getByTestId('tide-kind')).toHaveText(e.kind);
    await expect(rows.nth(i).getByTestId('tide-time')).toHaveText(e.time);
    await expect(rows.nth(i).getByTestId('tide-height')).toHaveText(metres(e.heightM));
  }
});

test('the moon phase for today is shown for a coastal place', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: SEARCH });
  await page.goto('/');
  await typeCity(page, 'Cascais');
  await expect(page.getByTestId('water').getByTestId('moon-phase')).toHaveText(moonPhaseToday(), { timeout: 15_000 });
});

test('the unit toggle converts sea temperature, wave height and tide heights, and back', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: SEARCH });
  await page.goto('/');
  await typeCity(page, 'Cascais');

  const water = page.getByTestId('water');
  await expect(water).toBeVisible({ timeout: 15_000 });
  const m = MARINE.cascais.current;
  const first = tideEventsToday('cascais')[0];

  await page.getByTestId('unit-toggle').click();
  await expect(water.getByTestId('sea-temperature')).toHaveText(
    `${Math.round(m.sea_surface_temperature * 9 / 5 + 32)}°F`);
  await expect(water.getByTestId('wave-height')).toHaveText(feet(m.wave_height));
  await expect(water.getByTestId('tide-event').first().getByTestId('tide-height')).toHaveText(feet(first.heightM));
  await expect(water.getByTestId('wave-period')).toHaveText(`${Math.round(m.wave_period)} s`);

  await page.reload();
  await typeCity(page, 'Cascais');
  await expect(page.getByTestId('water').getByTestId('wave-height')).toHaveText(feet(m.wave_height), { timeout: 15_000 });

  await page.getByTestId('unit-toggle').click();
  await expect(page.getByTestId('water').getByTestId('sea-temperature')).toHaveText(
    `${Math.round(m.sea_surface_temperature)}°C`);
});

test('opening another coastal place replaces the sea data', async ({ page }) => {
  await installOpenMeteoFixtures(page, { search: SEARCH });
  await page.goto('/');
  await typeCity(page, 'Cascais');
  await expect(page.getByTestId('water').getByTestId('wave-height')).toHaveText(metres(MARINE.cascais.current.wave_height), { timeout: 15_000 });

  await typeCity(page, 'Newquay');
  const water = page.getByTestId('water');
  await expect(water.getByTestId('wave-height')).toHaveText(metres(MARINE.newquay.current.wave_height), { timeout: 15_000 });
  await expect(water.getByTestId('tide-trend')).toHaveText(tideTrend('newquay'));
  await expect(water.getByTestId('tide-event')).toHaveCount(tideEventsToday('newquay').length);
});
