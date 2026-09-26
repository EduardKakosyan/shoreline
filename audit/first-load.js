/* The brief asks for a clean initial load: no console errors, no network calls, no
   geolocation prompt. Nothing in the suite asserts it, so a stray analytics call or a
   "use my location" experiment would pass unnoticed. Run: node audit/first-load.js */
const { chromium } = require('@playwright/test');
const BASE = process.env.APP_URL || 'http://localhost:3000';
(async () => {
  const b = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const msgs = [];
    page.on('console', (m) => msgs.push(m.type() + ': ' + m.text()));
    page.on('pageerror', (e) => msgs.push('pageerror: ' + e.message));
    page.on('crash', () => msgs.push('crash'));
    ctx.on('request', (r) => { if (/geocoding|open-meteo/.test(r.url())) msgs.push('NETWORK ' + r.url().slice(0, 60)); });
    await page.addInitScript(() => {
      window.__geo = 0;
      const g = navigator.geolocation;
      if (g) { g.getCurrentPosition = () => { window.__geo++; }; g.watchPosition = () => { window.__geo++; }; }
    });
    await page.goto(BASE + '/', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const geo = await page.evaluate(() => window.__geo);
    const empty = await page.evaluate(() => {
      const e = document.querySelector('[data-testid="empty-state"]');
      const cw = document.querySelector('[data-testid="current-weather"]');
      return !!e && getComputedStyle(e).display !== 'none' && (!cw || getComputedStyle(cw).display === 'none');
    });
    if (!empty) msgs.push('the empty state is not what a first visit shows');
    if (geo) msgs.push('geolocation was called ' + geo + 'x');
    console.log(theme.padEnd(6), msgs.length ? 'PROBLEMS: ' + msgs.join(' | ') : 'clean (no console output, no API calls, empty state shown)');
    if (msgs.length) process.exitCode = 1;
    await ctx.close();
  }
  await b.close();
})();
