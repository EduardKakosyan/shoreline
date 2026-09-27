/* Desktop balance for a coastal place. The operator's complaint (2026-09-27):
   "the left column has a large empty gap between the hero and the hourly strip,
   while the water column runs long beside it. The hourly strip is also squeezed
   into the left column. Rebalance it so it reads as one composed dashboard,
   with no hole under the hero."
   A hole is measurable: the gap between two stacked blocks in a column, and the
   leftover space at the bottom of the shorter column.
   Run: node audit/desktop-balance.js */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const PLACES = (process.env.PLACES || 'cascais,newquay,sydney,paris').split(',');
const VIEWPORTS = (process.env.VIEWPORTS || '1024x800,1280x800,1440x900')
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { width: w, height: h, tag: s };
  });

const MEASURE = `(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
  const q = (s) => document.querySelector(s);
  const out = { coastal: document.body.classList.contains('is-coastal') };
  const ids = {
    hero: '[data-testid="current-weather"]',
    water: '[data-testid="water"]',
    hours: '[data-testid="hourly"]',
    week: '[data-testid="forecast-days"]',
    recents: '[data-testid="recents"]',
  };
  for (const k in ids) { const el = q(ids[k]); out[k] = el && !el.hidden ? box(el) : null; }
  out.columns = {};
  for (const k of ['hero','water','hours','week']) if (out[k]) out.columns[k] = { x: out[k].x, w: out[k].w };
  const sameCol = (a, b) => a && b && Math.abs(a.x - b.x) < 4 && Math.abs(a.w - b.w) < 4;
  const gap = (a, b) => (sameCol(a, b) ? b.y - a.bottom : null);
  out.gapHeroHours = gap(out.hero, out.hours);
  out.gapHoursWeek = gap(out.hours, out.week);
  out.hoursSharesHeroColumn = sameCol(out.hero, out.hours);
  const bottoms = {};
  for (const k of ['hero','water','hours','week']) if (out[k]) bottoms[k] = out[k].bottom;
  out.bottoms = bottoms;
  out.shell = box(q('.shell'));
  out.doc = { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight };
  return out;
})()`;

(async () => {
  const browser = await chromium.launch();
  let fails = 0;
  for (const vp of VIEWPORTS) {
    for (const place of PLACES) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await installStub(page, { search: searchMapFor([place]) });
      await page.goto(BASE + '/');
      await setTheme(page, 'light');
      await page.fill('#city-input', place[0].toUpperCase() + place.slice(1));
      await page.press('#city-input', 'Enter');
      await page.getByTestId('current-weather').waitFor();
      await page.waitForTimeout(450);
      const m = await page.evaluate(MEASURE);
      const colB = m.bottoms || {};
      // the strip is full-width on a coastal page, so it belongs to neither column
      const leftB = m.coastal ? Math.max(colB.hero || 0, colB.week || 0) : Math.max(colB.hero || 0, colB.hours || 0);
      const rightB = m.coastal ? colB.water || 0 : colB.week || 0;
      const hole = Math.round(rightB - leftB);
      const flags = [];
      if (m.gapHeroHours !== null && m.gapHeroHours > 40) flags.push(`hole under the hero: ${m.gapHeroHours}px`);
      if (m.coastal && Math.abs(hole) > 120) flags.push(`columns unbalanced by ${Math.abs(hole)}px`);
      // the 24-hour strip must not be squeezed into one column of a two-column page
      if (m.coastal && m.columns.hours && m.columns.hours.w < m.shell.w * 0.9) {
        flags.push(`hours squeezed into one column (${m.columns.hours.w}px of ${m.shell.w})`);
      }
      if (m.coastal && m.columns.week && m.columns.water && m.columns.week.x === m.columns.water.x) {
        flags.push('the week no longer reads beside the poster');
      }
      // a strip that fits all 24 hours without scrolling is the point of the row
      if (m.coastal) {
        const fit = await page.evaluate(`(() => { const s = document.querySelector('#hour-strip');
          return { scroll: s.scrollWidth, client: s.clientWidth, items: s.children.length }; })()`);
        const shown = Math.round(fit.client / (fit.scroll / fit.items));
        if (shown < 24) m.stripShown = shown;
      }
      if (m.doc.w > vp.width) flags.push(`document scrolls sideways (${m.doc.w}px)`);
      if (flags.length) fails++;
      const fmt = (b) => (b ? `x${b.x} y${b.y} w${b.w} h${b.h} bot${b.bottom}` : '—');
      const childBoxes = await page.evaluate(`(() => {
        const w = document.querySelector('#water-body');
        if (!w || !document.querySelector('[data-testid="water"]').offsetParent) return [];
        return [...w.children].map((el) => { const r = el.getBoundingClientRect(); return String(el.className).split(' ')[0] + ' h' + Math.round(r.height) + ' y' + Math.round(r.y); });
      })()`);
      console.log(
        `${flags.length ? 'FAIL' : 'ok  '} ${vp.tag.padEnd(9)} ${place.padEnd(8)}` +
          ` coastal=${m.coastal ? 'y' : 'n'}` +
          ` hero=[${fmt(m.hero)}] water=[${fmt(m.water)}] hours=[${fmt(m.hours)}] week=[${fmt(m.week)}]` +
          ` gapHeroHours=${m.gapHeroHours} hoursShown=${m.stripShown || 24}/24 docH=${m.doc.h}` +
          (flags.length ? `\n        ${flags.join('; ')}` : '') +
          (childBoxes.length ? `\n        ${childBoxes.join(' | ')}` : ''),
      );
      await ctx.close();
    }
  }
  await browser.close();
  console.log(fails ? `\n${fails} layout problems` : '\nlayout balanced');
  process.exit(fails ? 1 : 0);
})();
