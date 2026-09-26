/* First-screen and screenshot harness for the coastal state — the thing the checks
   can only partially measure. For each place x theme x viewport it reports:
   where the two verdicts end on a phone, whether `water` really precedes the hour
   strip and the week, the hero temperature size, whether the tide chart painted at
   its own pixel size, and any console error. Screenshots: audit/water-*.png.

   Run: node audit/water-look.js            (WATER_PLACES=cascais,newquay,flatbay)
   Also drives the marine-failure note, which has no visual check of its own. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, typeCity } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const HERE = __dirname;

const PLACES = (process.env.WATER_PLACES || 'cascais,newquay,flatbay,paris').split(',');
const VIEWPORTS = (process.env.WATER_VIEWPORTS || '390x844,1280x800')
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { width: w, height: h, tag: s };
  });
const THEMES = (process.env.WATER_THEMES || 'light,dark').split(',');

const MEASURE = `(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: +(r.top + scrollY).toFixed(0), bottom: +(r.bottom + scrollY).toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0) };
  };
  const temp = document.querySelector('.current-temperature');
  const chart = document.querySelector('[data-testid="tide-chart"]');
  const svg = chart && chart.querySelector('svg');
  const out = {
    vh: innerHeight,
    scrollW: document.documentElement.scrollWidth,
    innerW: innerWidth,
    hero: box('.hero'),
    water: box('[data-testid="water"]'),
    hourly: box('[data-testid="hourly"]'),
    week: box('[data-testid="forecast-days"]'),
    ratings: { beach: box('[data-testid="beach-rating"]'), fishing: box('[data-testid="fishing-rating"]') },
    reasons: {
      beach: (document.querySelector('[data-testid="beach-reason"]') || {}).textContent,
      fishing: (document.querySelector('[data-testid="fishing-reason"]') || {}).textContent,
    },
    tempPx: temp ? Math.round(parseFloat(getComputedStyle(temp).fontSize)) : null,
    chart: chart ? { w: chart.clientWidth, h: chart.clientHeight } : null,
    chartBox: svg ? { vb: svg.getAttribute('viewBox'), w: Math.round(svg.getBoundingClientRect().width), h: Math.round(svg.getBoundingClientRect().height) } : null,
    turns: [...document.querySelectorAll('[data-testid="tide-event"]')].map((li) =>
      [li.querySelector('[data-testid="tide-kind"]'), li.querySelector('[data-testid="tide-time"]'), li.querySelector('[data-testid="tide-height"]')].map((n) => (n ? n.textContent : '')).join(' ')),
    trend: (document.querySelector('[data-testid="tide-trend"]') || {}).textContent,
    head: (document.querySelector('.water__head') || {}).textContent,
    moon: (document.querySelector('[data-testid="moon-phase"]') || {}).textContent,
    sea: [...document.querySelectorAll('.sea__value')].map((n) => n.textContent.trim()),
    best: (document.querySelector('.best-times') || {}).textContent,
  };
  return out;
})()`;

const overlap = (a, b) => {
  if (!a || !b) return false;
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return x > 1.5 && y > 1.5;
};

const chartLabelCollisions = `(() => {
  const overlap = (a, b) => {
    const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return x > 1.5 && y > 1.5;
  };
  const svg = document.querySelector('[data-testid="tide-chart"] svg');
  if (!svg) return [];
  const out = [];
  const texts = [...svg.querySelectorAll('text')].map((t) => {
    const r = t.getBoundingClientRect();
    return { s: t.textContent, x: r.x, y: r.y, w: r.width, h: r.height };
  });
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++)
      if (overlap(texts[i], texts[j])) out.push(texts[i].s + ' / ' + texts[j].s);
  return out;
})()`;

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const report = [];

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      for (const place of PLACES) {
        const ctx = await browser.newContext({ viewport: vp, ignoreHTTPSErrors: true });
        const page = await ctx.newPage();
        const errors = [];
        page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
        page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

        const failingMarine = place === 'marine-fail' ? ['cascais'] : [];
        const key = place === 'marine-fail' ? 'cascais' : place;
        await installStub(page, { search: searchMapFor([key, 'paris', 'cascais']), failingMarine });
        await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await setTheme(page, theme);
        await typeCity(page, key === 'paris' ? 'Paris' : place === 'marine-fail' ? 'Cascais' : key);
        await page.waitForTimeout(700);

        const m = await page.evaluate(MEASURE);
        const shots = path.join(HERE, `water-${vp.tag}-${place}-${theme}.png`);
        await page.screenshot({ path: shots, fullPage: vp.width >= 940 });
        if (vp.width < 700) {
          await page.screenshot({ path: path.join(HERE, `water-${vp.tag}-${place}-${theme}-fold.png`) });
        }

        const waterVisible = !!(m.water && m.water.w > 0);
        report.push({ place, theme, vp: vp.tag, ...m, errors });

        if (errors.length) problems.push(`${place}/${theme}/${vp.tag}: console ${errors.slice(0, 2).join(' | ')}`);
        if (m.scrollW > m.innerW + 1) problems.push(`${place}/${theme}/${vp.tag}: document scrolls sideways (${m.scrollW} > ${m.innerW})`);

        if (place === 'marine-fail') {
          const note = await page.getByTestId('marine-unavailable').isVisible().catch(() => false);
          if (!note) problems.push('marine-fail: the calm note is not visible');
          if (waterVisible) problems.push('marine-fail: the water section showed anyway');
          if (!m.hero) problems.push('marine-fail: the weather did not render');
        } else if (place === 'paris') {
          if (waterVisible) problems.push('paris (inland): a water section appeared');
        } else if (waterVisible) {
          if (vp.height === 844) {
            for (const [k, r] of Object.entries(m.ratings)) {
              if (!r) problems.push(`${place}/${theme}: ${k}-rating missing`);
              else if (r.bottom > vp.height) problems.push(`${place}/${theme}/${vp.tag}: ${k}-rating ends ${r.bottom}px down (budget ${vp.height})`);
            }
            if (m.water && m.hourly && m.water.top >= m.hourly.top) problems.push(`${place}/${theme}: water is not above the hourly strip`);
            if (m.water && m.week && m.water.top >= m.week.top) problems.push(`${place}/${theme}: water is not above the forecast`);
          }
          if (m.tempPx !== null && m.tempPx < 64) problems.push(`${place}/${theme}/${vp.tag}: hero temperature is only ${m.tempPx}px`);
          if (!m.chart || !m.chart.w) problems.push(`${place}/${theme}/${vp.tag}: the tide chart did not paint`);
          if (m.chartBox) {
            const vb = (m.chartBox.vb || '0 0 0 0').split(' ').map(Number);
            if (Math.abs(vb[2] - m.chartBox.w) > 1.5 || Math.abs(vb[3] - m.chartBox.h) > 1.5) {
              problems.push(`${place}/${theme}/${vp.tag}: chart viewBox ${m.chartBox.vb} != its box ${m.chartBox.w}x${m.chartBox.h} (labels will stretch)`);
            }
          }
          const collisions = await page.evaluate(chartLabelCollisions);
          if (collisions.length) problems.push(`${place}/${theme}/${vp.tag}: tide-chart labels overlap: ${collisions.join(', ')}`);
        }
        await ctx.close();
      }
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(HERE, 'water.json'), JSON.stringify(report, null, 2));

  for (const r of report) {
    console.log(`\n${r.place} · ${r.theme} · ${r.vp}   doc ${r.scrollW}x${r.vh} (inner ${r.innerW})`);
    if (r.hero) console.log(`  hero   y ${r.hero.top}–${r.hero.bottom}  temp ${r.tempPx}px`);
    if (r.water) console.log(`  water  y ${r.water.top}–${r.water.bottom}  (hourly ${r.hourly && r.hourly.top}, week ${r.week && r.week.top})`);
    if (r.ratings.beach) console.log(`  beach  ${r.ratings.beach.bottom}px down · fishing ${r.ratings.fishing.bottom}px down`);
    if (r.head) console.log(`  head   ${r.head.replace(/\s+/g, ' ').trim()}`);
    if (r.reasons.beach) console.log(`  beach  ${r.reasons.beach}`);
    if (r.reasons.fishing) console.log(`  fish   ${r.reasons.fishing}`);
    if (r.turns) console.log(`  tides  ${r.trend} · ${r.turns.join(' | ')}`);
    if (r.chart) console.log(`  chart  ${r.chart.w}x${r.chart.h} svg ${r.chartBox && r.chartBox.vb}`);
    if (r.sea && r.sea.length) console.log(`  sea    ${r.sea.join('  ')}  ·  ${r.moon}`);
    if (r.best) console.log(`  best   ${r.best}`);
  }

  console.log(`\n${problems.length ? problems.length + ' PROBLEM(S)' : 'no problems'} — wrote ${report.length} reports`);
  problems.forEach((p) => console.log('  ! ' + p));
  process.exit(problems.length ? 1 : 0);
})();
