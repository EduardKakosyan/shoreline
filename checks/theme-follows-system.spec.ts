import { test, expect } from '@playwright/test';
import { installOpenMeteoFixtures, isDarkBackground } from './fixtures';

test('a first visit follows the system color preference', async ({ browser }) => {
  for (const scheme of ['dark', 'light'] as const) {
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await installOpenMeteoFixtures(page, { search: { paris: ['paris'] } });
    await page.goto('/');
    const dark = await isDarkBackground(page);
    await expect(
      dark,
      `system prefers ${scheme}, but the page background was ${dark ? 'dark' : 'light'}`,
    ).toBe(scheme === 'dark');
    await context.close();
  }
});
