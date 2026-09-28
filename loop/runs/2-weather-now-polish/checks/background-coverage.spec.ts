import { test, expect } from '@playwright/test';
import { openState, type Theme } from './fixtures';
import { collectVisual } from './visual';

const STATES = ['empty', 'results', 'picker', 'notice', 'error'] as const;
const THEMES: Theme[] = ['light', 'dark'];

for (const theme of THEMES) {
  for (const state of STATES) {
    test(`the theme background covers the viewport at every scroll position (${state} state, ${theme} theme)`, async ({ page }) => {
      test.setTimeout(55_000);
      await openState(page, state, theme);

      const base = await page.evaluate(() => ({
        html: getComputedStyle(document.documentElement).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
      }));
      const opaque = (v: string) => {
        const m = v.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return p.length <= 3 || p[3] >= 0.95;
      };
      expect(
        opaque(base.html) || opaque(base.body),
        `no opaque page background: html=${base.html} body=${base.body}`,
      ).toBe(true);

      const report = await page.evaluate(collectVisual, { coverage: ['start', 'middle', 'end'] });
      expect(
        report.coverage,
        `background/contrast failures in ${state}/${theme}: ${JSON.stringify(report.coverage, null, 1)}`,
      ).toEqual([]);
    });
  }
}
