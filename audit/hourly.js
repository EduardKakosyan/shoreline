/* Invariants of the hourly strip that the acceptance suite does not all cover:
   24 items, contiguous HH:00 labels starting at the current hour, items are
   display-only (never buttons), exactly one "Now", at most one "Tomorrow" and
   it sits on the hour that crosses into the next day.
   Run: node audit/hourly.js */
const { chromium } = require('@playwright/test');
const { installStub, searchMapFor, MATCHES } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const SEARCH = Object.assign(searchMapFor(Object.keys(MATCHES)), { atlantis: [] });

(async () => {
  const browser = await chromium.launch();
  const issues = [];
  for (const isDay of [1, 0]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await installStub(page, { search: SEARCH, city: { key: 'paris', currentCode: 2, isDay } });
    await page.goto(BASE + '/');
    await page.fill('#city-input', 'Paris');
    await page.press('#city-input', 'Enter');
    await page.getByTestId('current-weather').waitFor();

    const s = await page.locator('#hour-strip').evaluate((strip) => {
      const items = [...strip.querySelectorAll('[data-testid="hour-item"]')];
      return {
        count: items.length,
        labels: items.map((i) => i.querySelector('[data-testid="hour-label"]').textContent.trim()),
        temps: items.map((i) => i.querySelector('[data-testid="hour-temperature"]').textContent.trim()),
        tags: items.map((i) => i.querySelector('.hour__nowtag').textContent.trim()),
        interactive: items.filter((i) => i.tagName === 'BUTTON' || i.getAttribute('role') === 'button').length,
        minDim: Math.round(Math.min(...items.map((i) => {
          const r = i.getBoundingClientRect();
          return Math.max(r.width, r.height);
        }))),
      };
    });

    if (s.count !== 24) issues.push(`is_day=${isDay}: expected 24 items, got ${s.count}`);
    if (s.interactive !== 0) issues.push(`is_day=${isDay}: ${s.interactive} hour items are interactive`);
    if (!s.labels.every((l) => /^\d{2}:00$/.test(l))) issues.push(`is_day=${isDay}: label not HH:00 -> ${s.labels.filter((l) => !/^\d{2}:00$/.test(l))}`);
    if (s.labels[0] !== '12:00') issues.push(`is_day=${isDay}: strip starts at ${s.labels[0]}, expected the current hour 12:00`);
    for (let i = 1; i < s.labels.length; i++) {
      const prev = Number(s.labels[i - 1].slice(0, 2));
      const cur = Number(s.labels[i].slice(0, 2));
      if (cur !== (prev + 1) % 24) issues.push(`is_day=${isDay}: gap between ${s.labels[i - 1]} and ${s.labels[i]}`);
    }
    if (!s.temps.every((t) => /^-?\d+°$/.test(t))) issues.push(`is_day=${isDay}: bad hour temperature text -> ${s.temps.filter((t) => !/^-?\d+°$/.test(t))}`);
    const nows = s.tags.filter((t) => t === 'Now');
    const tmrs = s.tags.filter((t) => t === 'Tomorrow');
    if (nows.length !== 1 || s.tags[0] !== 'Now') issues.push(`is_day=${isDay}: expected exactly one "Now" on the first item, tags=${JSON.stringify(s.tags)}`);
    if (tmrs.length > 1) issues.push(`is_day=${isDay}: more than one "Tomorrow" tag`);
    const crossIdx = s.labels.findIndex((l) => l === '00:00');
    if (crossIdx > 0 && s.tags[crossIdx] !== 'Tomorrow') issues.push(`is_day=${isDay}: midnight hour not tagged "Tomorrow" (tags=${JSON.stringify(s.tags)})`);
    console.log(`is_day=${isDay}: 24 items, ${nows.length} Now, ${tmrs.length} Tomorrow at index ${crossIdx}, min card span ${s.minDim}px`);
    await ctx.close();
  }
  await browser.close();
  if (issues.length) {
    console.log('\nISSUES:');
    for (const i of issues) console.log('  ' + i);
    process.exit(1);
  }
  console.log('\nHOURLY CLEAN');
})();
