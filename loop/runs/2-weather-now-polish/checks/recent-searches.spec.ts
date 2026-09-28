import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, fullLabel } from './fixtures';

const KEYS6 = ['cairo', 'berlin', 'madrid', 'sydney', 'lisbon', 'paris'];
const LABELS6 = KEYS6.map(fullLabel);

async function searchCity(page: import('@playwright/test').Page, term: string) {
  await page.getByLabel('City', { exact: true }).fill(term);
  await page.getByLabel('City', { exact: true }).press('Enter');
}

test('recent searches become chips: newest first, deduplicated, capped at five, persisted, tappable, clearable', async ({ page }) => {
  const search: Record<string, string[]> = {};
  for (const k of KEYS6) search[fullLabel(k).toLowerCase()] = [k];
  await installOpenMeteoFixtures(page, { search });

  await page.goto('/');
  const chips = page.getByTestId('recent-chip');
  await expect(chips).toHaveCount(0);

  await searchCity(page, LABELS6[0]);
  await searchCity(page, LABELS6[1]);
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toHaveText(LABELS6[1]);
  await expect(chips.nth(1)).toHaveText(LABELS6[0]);

  await page.reload();
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toHaveText(LABELS6[1]);

  for (let i = 2; i < 6; i++) await searchCity(page, LABELS6[i]);
  await expect(chips).toHaveCount(5);
  await expect(chips.nth(0)).toHaveText(LABELS6[5]);
  await expect(chips.nth(4)).toHaveText(LABELS6[1]);

  await searchCity(page, LABELS6[4]);
  await expect(chips).toHaveCount(5);
  await expect(chips.nth(0)).toHaveText(LABELS6[4]);

  await chips.nth(3).click();
  await expect(page.getByTestId('current-weather').getByTestId('location-name')).toHaveText(LABELS6[2]);

  await page.getByTestId('clear-recents').click();
  await expect(chips).toHaveCount(0);

  await page.reload();
  await expect(chips).toHaveCount(0);
});
