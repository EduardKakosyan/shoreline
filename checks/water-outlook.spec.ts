import { test, expect, type Locator } from '@playwright/test';
import { installOpenMeteoFixtures, typeCity, searchMapForKeys } from './fixtures';

const SEARCH = searchMapForKeys(['cascais', 'lisbon', 'newquay']);

async function outlook(page: import('@playwright/test').Page, city: string) {
  await installOpenMeteoFixtures(page, { search: SEARCH });
  await page.goto('/');
  await typeCity(page, city);
  const water = page.getByTestId('water');
  await expect(water).toBeVisible({ timeout: 15_000 });
  return water;
}

async function expectReason(reason: Locator, words: string[]) {
  await expect(reason).toBeVisible();
  const text = (await reason.innerText()).toLowerCase();
  expect(text.trim().length, 'the reason is empty').toBeGreaterThan(0);
  for (const w of words) expect(text, `the reason should mention "${w}"`).toContain(w);
}

test('calm, warm and clear with a tide turning at dawn: beach Good, fishing Good (dawn named)', async ({ page }) => {
  const water = await outlook(page, 'Cascais');
  await expect(water.getByTestId('beach-rating')).toHaveText('Good');
  await expect(water.getByTestId('fishing-rating')).toHaveText('Good');
  await expectReason(water.getByTestId('beach-reason'), []);
  await expectReason(water.getByTestId('fishing-reason'), ['dawn']);
});

test('big waves, strong wind, rain and cool air: beach Poor and fishing Poor, each saying why', async ({ page }) => {
  const water = await outlook(page, 'Newquay');
  await expect(water.getByTestId('beach-rating')).toHaveText('Poor');
  await expect(water.getByTestId('fishing-rating')).toHaveText('Poor');
  await expectReason(water.getByTestId('beach-reason'), ['waves', 'wind', 'rain', 'cool']);
  await expectReason(water.getByTestId('fishing-reason'), ['waves', 'wind']);
});

test('moderate waves and a breeze, no tide turn near dawn or dusk: beach Fair and fishing Fair, each saying why', async ({ page }) => {
  const water = await outlook(page, 'Lisbon');
  await expect(water.getByTestId('beach-rating')).toHaveText('Fair');
  await expect(water.getByTestId('fishing-rating')).toHaveText('Fair');
  await expectReason(water.getByTestId('beach-reason'), ['waves', 'wind']);
  await expectReason(water.getByTestId('fishing-reason'), ['tide']);
});
