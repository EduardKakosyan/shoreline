/* The tide chart is the answer to "when", and the operator asked for it to be good
   enough to plan by. A label that lands on another label destroys exactly that, and
   it depends on where the turns fall relative to dawn, dusk and now — a
   configuration a fixed fixture only sometimes produces (Sydney, a live place the
   operator named, does: "dusk" on top of a "High", and a "Low" on top of "now").
   This sweeps the tide phase across the day for several places, in both themes, and
   asserts no two words inside the chart overlap, that every label stays inside the
   chart box, and that the curve still spans its width.
   Run: node audit/chart-collide.js */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES, fullLabel, MARINE } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const PLACES = (process.env.CHART_PLACES || 'cascais,sydney,newquay,pointArena').split(',');
const PHASES = (process.env.CHART_PHASES || '0,4,8,12,16,20').split(',').map(Number);
const THEMES = ['light', 'dark'];

const MEASURE = `(() => {
  const host = document.querySelector('[data-testid="tide-chart"]');
  const svg = host && host.querySelector('svg');
  if (!svg) return null;
  const hb = host.getBoundingClientRect();
  const texts = [...svg.querySelectorAll('text')].map((t) => {
    const b = t.getBoundingClientRect();
    return {
      s: t.textContent.trim(),
      cls: (t.getAttribute('class') || '').split(' ')[0],
      x: b.x, y: b.y, w: b.width, h: b.height,
      right: b.x + b.width, bottom: b.y + b.height,
    };
  });
  const overlaps = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.x, b.x);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      if (ox > 0.75 && oy > 0.75) {
        overlaps.push(a.s + '[' + (a.cls || 'time') + '] x ' + a.x.toFixed(0) + '-' + a.right.toFixed(0) +
          ' vs ' + b.s + '[' + (b.cls || 'time') + '] x ' + b.x.toFixed(0) + '-' + b.right.toFixed(0) +
          ' overlap ' + ox.toFixed(1) + 'x' + oy.toFixed(1));
      }
    }
  }
  const spill = texts.filter((t) => t.x < hb.x - 1 || t.right > hb.right + 1 || t.y < hb.y - 1 || t.bottom > hb.bottom + 1)
    .map((t) => t.s + ' outside the chart box');
  /* high is a solid disc, low a ring of the panel's own colour: if those two ever
     paint the same, the chart silently stops distinguishing them and the one-word
     label layout stops working. */
  const markOf = (kind) => {
    const g = svg.querySelector('g.tc-turn--' + kind);
    if (!g) return null;
    const c = g.querySelector('circle');
    const cs = getComputedStyle(c);
    const bb = c.getBoundingClientRect();
    return { fill: cs.fill, stroke: cs.stroke, d: Math.round(bb.width * 10) / 10 };
  };
  const hi = markOf('high');
  const lo = markOf('low');
  const legend = !!document.querySelector('.tide-legend');

  /* every turn the app reports must be readable on the chart, not just dotted */
  const turnDots = [...svg.querySelectorAll('g.tc-turn')];
  const turnTimes = turnDots.map((g) => (g.querySelector('text') || {}).textContent || '');
  const tileTimes = [...document.querySelectorAll('[data-testid="tide-time"]')].map((n) => n.textContent.trim());
  const line = svg.querySelector('path.tc-line');
  const lb = line ? line.getBoundingClientRect() : null;
  return {
    words: texts.length,
    overlaps,
    spill,
    missing: tileTimes.filter((t) => !turnTimes.includes(t)),
    turns: turnDots.length,
    hi, lo, legend,
    panel: getComputedStyle(host).backgroundColor,
    curveW: lb ? Math.round(lb.width) : 0,
    hostW: Math.round(hb.width),
  };
})()`;

(async () => {
  const problems = [];
  const lines = [];
  const browser = await chromium.launch();
  const saved = new Map();
  for (const p of PLACES) if (MARINE[p] && MARINE[p].tide) saved.set(p, MARINE[p].tide.highAt);

  for (const place of PLACES) {
    if (!MATCHES[place]) {
      problems.push(`unknown fixture place "${place}"`);
      continue;
    }
    for (const phase of PHASES) {
      if (MARINE[place] && MARINE[place].tide) MARINE[place].tide.highAt = phase + 0.3;
      for (const theme of THEMES) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await installStub(page, { search: searchMapFor([place]) });
        await page.goto(BASE, { waitUntil: 'domcontentloaded' });
        await setTheme(page, theme);
        await page.getByLabel('City', { exact: true }).fill(fullLabel(place));
        await page.keyboard.press('Enter');
        const shown = await page
          .waitForSelector('[data-testid="water"]:not([hidden])', { timeout: 5000 })
          .then(() => true)
          .catch(() => false);
        if (!shown) {
          problems.push(`${place} phase ${phase} ${theme}: the water section never appeared`);
          await page.close();
          continue;
        }
        await page.waitForTimeout(150);
        const r = await page.evaluate(MEASURE);
        if (!r) {
          problems.push(`${place} phase ${phase} ${theme}: no tide chart painted`);
          await page.close();
          continue;
        }
        r.overlaps.forEach((o) => problems.push(`${place} phase ${phase} ${theme}: ${o}`));
        r.spill.forEach((s) => problems.push(`${place} phase ${phase} ${theme}: ${s}`));
        r.missing.forEach((t) => problems.push(`${place} phase ${phase} ${theme}: turn ${t} has no time on the chart`));
        if (r.turns > 0) {
          if (!r.hi || !r.lo) problems.push(`${place} phase ${phase} ${theme}: no high or low mark to distinguish`);
          else {
            if (r.hi.fill === r.lo.fill) problems.push(`${place} phase ${phase} ${theme}: high and low paint the same fill (${r.hi.fill}) — the disc/ring distinction is gone`);
            if (r.lo.fill === r.panel && r.hi.fill === r.panel) problems.push(`${place} phase ${phase} ${theme}: both marks match the panel`);
            if (r.hi.d <= r.lo.d) problems.push(`${place} phase ${phase} ${theme}: a high is not drawn larger than a low (${r.hi.d} vs ${r.lo.d})`);
          }
          if (!r.legend) problems.push(`${place} phase ${phase} ${theme}: turns shown with no legend to decode the marks`);
        }
        if (r.words < 3) problems.push(`${place} phase ${phase} ${theme}: only ${r.words} words in the chart`);
        lines.push(
          `${place}/${String(phase).padStart(2, '0')}h ${theme}: ${r.words} words, ${r.overlaps.length} overlap(s), curve ${r.curveW}/${r.hostW}px`,
        );
        await page.close();
      }
    }
  }
  for (const [p, v] of saved) if (MARINE[p] && MARINE[p].tide) MARINE[p].tide.highAt = v;

  await browser.close();
  for (const l of lines) console.log('  ' + l);
  console.log('');
  if (problems.length) {
    problems.forEach((p) => console.log('FAIL ' + p));
    console.log(`CHART LABELS: ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log('CHART LABELS CLEAN');
})();
