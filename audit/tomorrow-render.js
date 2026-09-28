/* The after-sunset "Tomorrow" line, in a real browser.

   The unit harness (tomorrow-line.js) proves the wording; this proves the render:
   that an evening reading actually shows the line, that its two spans clear the
   acceptance contrast rule against the tide panel in both themes, that it adds no
   overflow, and — the point of putting it inside the tide panel — that it does not
   shift the verdicts or the tide chart on a phone, where both must stay above 844px.

   Run: node audit/tomorrow-render.js */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, typeCity } = require('./stub.js');
const AUDIT = fs.readFileSync(path.join(__dirname, 'audit-lib.js'), 'utf8');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const OPTS = { text: true, coverage: ['start'], tap: true, overflow: true };
const EVENING = '2026-09-24T21:27';
const NOON = '2026-09-24T12:00';

let fails = 0;
const check = (name, ok, detail) => {
  if (ok) console.log(`ok   ${name}`);
  else {
    fails++;
    console.log(`FAIL ${name}${detail === undefined ? '' : `\n  ${detail}`}`);
  }
};

const READ = `(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: +(r.top + scrollY).toFixed(1), bottom: +(r.bottom + scrollY).toFixed(1) };
  };
  const shown = (el) => !!el && el.getBoundingClientRect().width > 0;
  const line = document.querySelector('.tomorrow');
  return {
    has: !!line,
    shown: shown(line),
    text: line ? line.textContent.replace(/\\s+/g, ' ').trim() : '',
    inPanel: !!line && !!line.closest('.water__panel.tide'),
    verdictBottom: Math.max((box('[data-testid="beach-rating"]') || {}).bottom || 0, (box('[data-testid="fishing-rating"]') || {}).bottom || 0),
    chartBottom: (box('[data-testid="tide-chart"]') || {}).bottom || 0,
    panelBottom: (box('.water__panel.tide') || {}).bottom || 0,
    docH: document.documentElement.scrollHeight,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  };
})()`;

const open = async (page, key, now, theme) => {
  await installStub(page, { search: searchMapFor([key, 'paris', 'cascais', 'newquay']), now });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await setTheme(page, theme);
  await page.getByLabel('City', { exact: true }).fill(key === 'pointArena' ? 'Point Arena' : key[0].toUpperCase() + key.slice(1));
  await page.getByLabel('City', { exact: true }).press('Enter');
  await page.waitForSelector('[data-testid="water"]', { state: 'visible', timeout: 8000 });
  await page.waitForTimeout(250);
};

const run = async () => {
  const browser = await chromium.launch();
  const dayBaseline = {};
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    for (const theme of ['light', 'dark']) {
      const tag = `${vp.width}x${vp.height} ${theme}`;
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));

      // daytime: the acceptance state — the line must not exist at all
      await open(page, 'cascais', NOON, theme);
      const day = await page.evaluate(READ);
      const k = `${vp.width}x${vp.height}`;
      dayBaseline[k] = day;
      check(`${tag} noon: no tomorrow line rendered`, !day.has, day.text);

      // evening: the line must be there, visible, inside the tide panel
      await open(page, 'cascais', EVENING, theme);
      const eve = await page.evaluate(READ);
      check(`${tag} evening: the line renders and is visible`, eve.has && eve.shown);
      check(`${tag} evening: it sits inside the tide panel`, eve.inPanel);
      check(`${tag} evening: it says something`, /\w/.test(eve.text), eve.text);
      check(`${tag} evening: never a rating word`, !/\b(good|fair|poor)\b/i.test(eve.text), eve.text);
      console.log(`     "${eve.text}"`);
      check(`${tag} evening: the tide chart is painted`, eve.chartBottom > 0);

      // the phone budget: the line must not move the verdicts or the chart
      if (vp.height === 844) {
        const base = dayBaseline[k];
        check(
          `${tag} both verdicts still end above the fold (${eve.verdictBottom} < 844)`,
          eve.verdictBottom > 0 && eve.verdictBottom <= 844,
          String(eve.verdictBottom),
        );
        check(
          `${tag} the whole tide chart still ends above the fold (${eve.chartBottom} < 844)`,
          eve.chartBottom > 0 && eve.chartBottom <= 844,
          String(eve.chartBottom),
        );
        check(
          `${tag} the line did not shift the verdicts (${base.verdictBottom} -> ${eve.verdictBottom})`,
          Math.abs(eve.verdictBottom - base.verdictBottom) <= 1,
        );
        check(
          `${tag} the line did not shift the chart (${base.chartBottom} -> ${eve.chartBottom})`,
          Math.abs(eve.chartBottom - base.chartBottom) <= 1,
        );
      }

      // contrast / tap / overflow, on the state the checks will never reach
      const res = await page.evaluate(`${AUDIT}\n;auditPage(${JSON.stringify(OPTS)})`);
      check(`${tag} evening: no contrast findings`, res.text.length === 0, JSON.stringify(res.text));
      check(`${tag} evening: no tap-target findings`, res.tap.length === 0, JSON.stringify(res.tap));
      check(`${tag} evening: no overflow findings`, res.overflow.length === 0, JSON.stringify(res.overflow));
      check(`${tag} evening: the document still does not scroll sideways`, res.doc.scrollWidth <= vp.width + 1, JSON.stringify(res.doc));
      check(`${tag} evening: no console output`, errors.length === 0, errors.join(' | '));

      await page.screenshot({ path: path.join(__dirname, `tomorrow-${vp.width}x${vp.height}-${theme}.png`), fullPage: vp.width > 900 });
      await ctx.close();
    }
  }
  await browser.close();
};

run().then(() => {
  console.log(fails ? `\n${fails} FAILURE(S)` : '\nTOMORROW RENDER OK');
  process.exit(fails ? 1 : 0);
});
