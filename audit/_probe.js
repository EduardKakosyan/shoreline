const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor } = require('./stub.js');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await installStub(page, { search: searchMapFor(['cascais']) });
  await page.goto('http://localhost:3000/');
  await setTheme(page, 'light');
  await page.fill('#city-input', 'Cascais');
  await page.press('#city-input', 'Enter');
  await page.getByTestId('water').waitFor();
  await page.waitForTimeout(400);
  console.log(await page.evaluate(`(() => {
    const out = [];
    ['.app-header','.search','.hero','.hero__top','.location-name','.hero__icon','.hero__reading','.temp-block','.current-temperature','.current-condition','.feels-line','.hero__chips','.ratings','[data-testid=beach-rating]','[data-testid=fishing-rating]','.water__disclaimer','.tide__head','[data-testid=tide-chart]'].forEach((sel) => {
      const e = document.querySelector(sel); if (!e) return out.push(sel.padEnd(24)+' MISSING'); const r = e.getBoundingClientRect();
      out.push(sel.padEnd(24)+' y '+String(Math.round(r.y)).padStart(4)+' h '+String(Math.round(r.height)).padStart(4)+' bottom '+String(Math.round(r.bottom)).padStart(4)+' w '+Math.round(r.width));
    });
    const line = (sel, root) => { const e = root ? root.querySelector(sel) : document.querySelector(sel); if (!e) return out.push(sel.padEnd(22)+' MISSING'); const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e); out.push(sel.padEnd(22)+' y '+String(Math.round(r.y)).padStart(4)+' h '+String(Math.round(r.height)).padStart(4)+' w '+String(Math.round(r.width)).padStart(4)+' fs '+cs.fontSize); };
    ['.hero','.hero__top','.hero__place','.location-name','.hero__icon','.hero__reading','.temp-block','.current-temperature','.current-condition','.feels-line','.hero__chips'].forEach((s) => line(s));
    const h = document.querySelector('.hero'); const cs = getComputedStyle(h);
    out.push('hero padding ' + cs.padding + ' gap ' + cs.gap + ' display ' + cs.display + ' flexDir ' + cs.flexDirection);
    return out.join('\\n');
  })()`));
  await b.close();
})();
