import { test, expect } from '@playwright/test';
import { openState, type Theme } from './fixtures';
import { collectVisual } from './visual';

const STATES = ['empty', 'results', 'picker', 'notice', 'error'] as const;
const THEMES: Theme[] = ['light', 'dark'];

for (const theme of THEMES) {
  for (const state of STATES) {
    test(`buttons, chips and toggles are at least 44x44 px (${state} state, ${theme} theme)`, async ({ page }) => {
      test.setTimeout(55_000);
      await openState(page, state, theme);
      const report = await page.evaluate(collectVisual, { tap: true });
      expect(
        report.tap,
        `tap targets smaller than 44x44 in ${state}/${theme}: ${JSON.stringify(report.tap, null, 1)}`,
      ).toEqual([]);
    });
  }
}
