import { test, expect } from '@playwright/test';
import { openState, type Theme } from './fixtures';
import { collectVisual } from './visual';

const STATES = ['empty', 'results', 'picker', 'notice', 'error'] as const;
const THEMES: Theme[] = ['light', 'dark'];

for (const theme of THEMES) {
  for (const state of STATES) {
    test(`no horizontal scrolling or oversized elements (${state} state, ${theme} theme)`, async ({ page }) => {
      test.setTimeout(55_000);
      await openState(page, state, theme);

      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
      }));
      expect(
        doc.scrollWidth,
        `document scrolls horizontally: scrollWidth=${doc.scrollWidth} viewport=${doc.innerWidth}`,
      ).toBeLessThanOrEqual(doc.innerWidth + 1);
      expect(
        doc.bodyScrollWidth,
        `body scrolls horizontally: scrollWidth=${doc.bodyScrollWidth} viewport=${doc.innerWidth}`,
      ).toBeLessThanOrEqual(doc.innerWidth + 1);

      const report = await page.evaluate(collectVisual, { overflow: true });
      expect(
        report.overflow,
        `elements wider than the viewport in ${state}/${theme}: ${JSON.stringify(report.overflow, null, 1)}`,
      ).toEqual([]);
    });
  }
}
