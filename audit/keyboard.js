/* Keyboard audit: tab through every state and assert (a) the search can be
   run with the keyboard alone, (b) every focused element paints a visible
   focus indicator, (c) no focusable element is aria-hidden.
   Run: node audit/keyboard.js */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const LONDONS = ['london_gb', 'london_ca', 'london_oh', 'london_ky', 'london_ar'];
const SEARCH = Object.assign(searchMapFor(Object.keys(MATCHES)), { london: LONDONS, atlantis: [] });

const FOCUS_PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const outlineW = parseFloat(cs.outlineWidth) || 0;
  const hasOutline = outlineW > 0 && cs.outlineStyle !== 'none';
  const boxShadow = cs.boxShadow && cs.boxShadow !== 'none';
  const tid = el.getAttribute('data-testid');
  return {
    tag: el.tagName.toLowerCase(),
    key: el.id || (tid ? 'tid-' + tid : '') || el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.split(' ')[0] : ''),
    outlineW: outlineW,
    outlineStyle: cs.outlineStyle,
    visible: hasOutline || boxShadow,
    ariaHidden: !!(el.closest && el.closest('[aria-hidden="true"]')),
  };
})()`;

async function tabWalk(page, label, issues) {
  await page.evaluate(() => document.body.focus());
  const seen = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(FOCUS_PROBE);
    if (!info) break;
    if (seen.includes(info.key)) break;
    seen.push(info.key);
    if (!info.visible) issues.push(`${label}: no visible focus indicator on ${info.key}`);
    if (info.ariaHidden) issues.push(`${label}: aria-hidden element is focusable: ${info.key}`);
  }
  return seen;
}

(async () => {
  const browser = await chromium.launch();
  const issues = [];
  for (const theme of ['light', 'dark']) {
    for (const stateName of ['empty', 'results', 'picker']) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await installStub(page, { search: SEARCH });
      await page.goto(BASE + '/');
      await setTheme(page, theme);
      if (stateName === 'picker') {
        await page.fill('#city-input', 'London');
        await page.press('#city-input', 'Enter');
        await page.getByTestId('match-option').first().waitFor();
      } else if (stateName === 'results') {
        await page.fill('#city-input', 'Paris');
        await page.press('#city-input', 'Enter');
        await page.getByTestId('current-weather').waitFor();
      }
      const order = await tabWalk(page, `${theme}/${stateName}`, issues);
      console.log(`\n### ${theme}/${stateName} tab order (${order.length}): ${order.join(' > ')}`);

      if (stateName !== 'picker') {
        const city = stateName === 'results' ? 'Berlin' : 'Madrid';
        await page.evaluate(() => document.getElementById('city-input').focus());
        await page.fill('#city-input', '');
        await page.evaluate(() => document.getElementById('city-input').focus());
        await page.keyboard.type(city);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(800);
        const opened = await page.getByTestId('location-name').isVisible();
        const text = opened ? await page.getByTestId('location-name').innerText() : '';
        if (!opened || !text.startsWith(city)) {
          issues.push(`${theme}/${stateName}: keyboard search for ${city} did not open it (got "${text}")`);
        } else {
          console.log(`  keyboard-only search opened: ${text}`);
        }
      }
      await ctx.close();
    }
  }
  await browser.close();
  if (issues.length) {
    console.log('\nISSUES:');
    for (const i of issues) console.log('  ' + i);
    process.exit(1);
  }
  console.log('\nKEYBOARD CLEAN');
})();
