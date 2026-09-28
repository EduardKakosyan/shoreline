import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, typeCity, searchMapForKeys, VIEWPORT, type Theme, setTheme } from './fixtures';

const THEMES: Theme[] = ['light', 'dark'];

for (const theme of THEMES) {
  test(`on a phone, a coastal place answers "beach? fishing?" on the first screen, before the hourly strip and forecast (${theme} theme)`, async ({ page }) => {
    await installOpenMeteoFixtures(page, { search: searchMapForKeys(['cascais']) });
    await page.setViewportSize(VIEWPORT);
    await page.goto('/');
    await setTheme(page, theme);
    await typeCity(page, 'Cascais');
    await expect(page.getByTestId('water')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('hourly')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const box = (id: string) => page.getByTestId(id).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, w: r.width, h: r.height };
    });
    for (const id of ['beach-rating', 'fishing-rating']) {
      const b = await box(id);
      expect(b.w > 0 && b.h > 0, `${id} has no size`).toBe(true);
      expect(b.bottom, `${id} ends ${Math.round(b.bottom)}px down the page; it must be within the first ${VIEWPORT.height}px`)
        .toBeLessThanOrEqual(VIEWPORT.height);
    }
    const water = await box('water');
    const hourly = await box('hourly');
    const forecast = await box('forecast-days');
    expect(water.top, 'the water section must come before the hourly strip').toBeLessThan(hourly.top);
    expect(water.top, 'the water section must come before the forecast').toBeLessThan(forecast.top);
  });
}
