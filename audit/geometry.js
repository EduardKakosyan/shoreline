/* Prints element geometry + computed type scale so spacing/rhythm can be judged.
   node audit/geometry.js */
const path = require('path');
const { chromium } = require('@playwright/test');
const { installStub, typeCity, setTheme, searchMapFor } = require(path.join(__dirname, 'stub.js'));

const BASE = process.env.APP_URL || 'http://localhost:3000';
const PICKS = [
  '.app-header', '.brand__mark', '.search', '.search__input', '.search__submit', '.unit-toggle',
  '.hero', '.hero__top', '.hero__icon', '.location-name', '.current-temperature',
  '.current-condition', '.feels-line', '.hero__chips', '.metric', '#hour-strip', '.hour',
  '.hour-label', '.hour-temperature', '#day-list', '.day', '.day-name', '.day-condition',
  '.day-precip', '.day-high', '.day-low', '.recent__head', '.chip', '.footnote',
];

(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    await installStub(page, { search: searchMapFor(['paris', 'london_gb']) });
    await page.goto(BASE + '/');
    await page.evaluate(() =>
      localStorage.setItem('wn.recents.v1', JSON.stringify([
        { label: 'Paris, Île-de-France, France', lat: 48.8566, lon: 2.3522, at: 9 },
        { label: 'London, England, United Kingdom', lat: 51.50853, lon: -0.12574, at: 8 },
      ])),
    );
    await setTheme(page, process.env.THEME || 'light');
    await typeCity(page, 'Paris');
    await page.getByTestId('current-weather').waitFor();
    const res = await page.evaluate((picks) => {
      const out = [];
      for (const sel of picks) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        out.push({
          sel, x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width),
          h: Math.round(r.height), fs: cs.fontSize, fw: cs.fontWeight, gap: cs.gap, pad: cs.padding,
        });
      }
      return { out, doc: document.documentElement.scrollHeight, vw: innerWidth };
    }, PICKS);
    console.log(`=== viewport ${vp.width} docHeight=${res.doc}`);
    for (const b of res.out) {
      console.log(
        `  ${b.sel.padEnd(22)} x=${String(b.x).padStart(4)} y=${String(b.y).padStart(5)}` +
        ` w=${String(b.w).padStart(4)} h=${String(b.h).padStart(4)} fs=${b.fs.padEnd(6)} fw=${b.fw.padEnd(4)} gap=${b.gap.padEnd(6)} pad=${b.pad}`,
      );
    }
    await ctx.close();
  }
  await browser.close();
})();
