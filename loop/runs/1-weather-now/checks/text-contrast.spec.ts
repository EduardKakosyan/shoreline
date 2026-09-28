import { test, expect } from '@playwright/test';
import { openState, type Theme } from './fixtures';
import { collectVisual } from './visual';

const STATES = ['empty', 'results', 'picker', 'notice', 'error'] as const;
const THEMES: Theme[] = ['light', 'dark'];

for (const theme of THEMES) {
  for (const state of STATES) {
    test(`every visible text has sufficient contrast (${state} state, ${theme} theme)`, async ({ page }) => {
      test.setTimeout(55_000);
      await openState(page, state, theme);
      const report = await page.evaluate(collectVisual, { text: true, coverage: ['start'] });
      expect(
        report.text,
        `contrast failures in ${state}/${theme}: ${JSON.stringify(report.text, null, 1)}`,
      ).toEqual([]);
    });
  }
}
