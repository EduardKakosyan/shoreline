/* Tide-chart label clearance, against the real sea.
   The fixture sweep in chart-collide.js moves the tide phase around but always draws a
   smooth synthetic curve, and the operator's two complaints — Sydney's "08:00",
   Honolulu's "03:00" sitting on the line — came from live data, where a plateau pins
   several hours to the same height and the label of the run's first hour has nowhere
   clean to go. Real curves are also flatter, steeper and odder than any fixture.
   Run: node audit/chart-live.js   (LIVE_PLACES=cascais,sydney,honolulu) */
const { chromium } = require('@playwright/test');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const PLACES = (process.env.LIVE_PLACES || 'cascais,sydney,honolulu,newquay,capetown').split(',');
const THEMES = ['light', 'dark'];

const MEASURE = `(() => {
  const host = document.querySelector('[data-testid="tide-chart"]');
  const svg = host && host.querySelector('svg');
  if (!svg) return null;
  const hb = host.getBoundingClientRect();
  const line = svg.querySelector('path.tc-line');
  const samples = [];
  if (line) {
    /* the viewBox is 1:1 with the box, so user space maps onto the screen through the
       SVG's own origin - not the path's bounding box, which starts wherever the water
       starts. Using the path box shifts every sample down by the water's own top. */
    const base = svg.getBoundingClientRect();
    const len = line.getTotalLength();
    for (let i = 0; i <= 800; i++) {
      const p = line.getPointAtLength((len * i) / 800);
      samples.push({ x: base.x + p.x, y: base.y + p.y });
    }
  }
  const gaps = [];
  const onCurve = [];
  for (const t of svg.querySelectorAll('g.tc-turn text')) {
    const b = t.getBoundingClientRect();
    const near = samples.filter((p) => p.x >= b.x && p.x <= b.right);
    if (!near.length) { gaps.push(999); continue; }
    const top = Math.min(...near.map((p) => p.y));
    const bot = Math.max(...near.map((p) => p.y));
    const above = b.bottom <= top ? top - b.bottom : -1;
    const below = b.y >= bot ? b.y - bot : -1;
    const gap = Math.max(above, below);
    gaps.push(Math.round(gap * 10) / 10);
    if (gap < 1.5) {
      onCurve.push(t.textContent + ' box y' + b.y.toFixed(0) + '-' + b.bottom.toFixed(0) +
        ' over curve y' + top.toFixed(0) + '-' + bot.toFixed(0) + ' (gap ' + gap.toFixed(1) + 'px)');
    }
  }
  const words = [...svg.querySelectorAll('text')].map((t) => {
    const b = t.getBoundingClientRect();
    return { s: t.textContent.trim(), x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
  });
  const overlaps = [];
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const a = words[i], c = words[j];
      const ox = Math.min(a.right, c.right) - Math.max(a.x, c.x);
      const oy = Math.min(a.bottom, c.bottom) - Math.max(a.y, c.y);
      if (ox > 0.75 && oy > 0.75) overlaps.push(a.s + ' vs ' + c.s);
    }
  }
  const turnTimes = [...svg.querySelectorAll('g.tc-turn')].map((g) => (g.querySelector('text') || {}).textContent || '');
  const tileTimes = [...document.querySelectorAll('[data-testid="tide-time"]')].map((n) => n.textContent.trim());
  return {
    onCurve,
    gaps,
    overlaps,
    missing: tileTimes.filter((t) => !turnTimes.includes(t)),
    spill: words.filter((w) => w.x < hb.x - 1 || w.right > hb.right + 1 || w.y < hb.y - 1 || w.bottom > hb.bottom + 1).map((w) => w.s),
    turns: tileTimes.length,
  };
})()`;

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const place of PLACES) {
    for (const theme of THEMES) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.evaluate((t) => {
        localStorage.setItem('sl.theme.v1', t);
      }, theme);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByLabel('City', { exact: true }).fill(place[0].toUpperCase() + place.slice(1));
      await page.keyboard.press('Enter');
      /* The live geocoder answers "Cascais" with several places, so the picker may be
         the next step — the same as live-check.js. */
      await page.waitForSelector(
        '[data-testid="match-option"], [data-testid="current-weather"]:not([hidden])',
        { timeout: 25000 },
      ).catch(() => {});
      const option = page.getByTestId('match-option');
      if (await option.count()) await option.first().click();
      const shown = await page
        .waitForSelector('[data-testid="water"]:not([hidden])', { timeout: 25000 })
        .then(() => true)
        .catch(() => false);
      if (!shown) {
        const why = await page.evaluate(() => ({
          err: !document.querySelector('[data-testid="error"]').hidden,
          notice: !document.querySelector('[data-testid="notice"]').hidden,
          cw: !document.querySelector('[data-testid="current-weather"]').hidden,
        }));
        console.log(`  skip ${place} ${theme}: no water section ${JSON.stringify(why)}`);
        await page.close();
        continue;
      }
      await page.waitForTimeout(300);
      const r = await page.evaluate(MEASURE);
      const before = problems.length;
      r.onCurve.forEach((o) => problems.push(`${place} ${theme}: ${o}`));
      r.overlaps.forEach((o) => problems.push(`${place} ${theme}: labels overlap — ${o}`));
      r.spill.forEach((o) => problems.push(`${place} ${theme}: "${o}" outside the chart box`));
      r.missing.forEach((o) => problems.push(`${place} ${theme}: turn ${o} has no time on the chart`));
      const bad = problems.length > before;
      console.log(`  ${bad ? 'FAIL' : 'ok  '} ${place} ${theme}: ${r.turns} turns, label-vs-curve gaps ${r.gaps.join('/')}`);
      await page.close();
    }
  }
  await browser.close();
  console.log('');
  if (problems.length) {
    problems.forEach((p) => console.log('FAIL ' + p));
    console.log(`LIVE CHART LABELS: ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log('LIVE CHART LABELS CLEAN');
})();
