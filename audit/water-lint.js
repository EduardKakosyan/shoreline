/* Composition lint for the water section — the checks assert contrast, overflow and
   the presence of things; this asserts the things a reviewer notices and a check
   cannot: is one verdict card taller than its twin, is any value clipped, do the tide
   turns line up as a row, does the curve stay inside its box, are the two panels the
   same width, does the reason wrap into a single unreadable band, is there a section
   peeking at the fold to say "scroll me".
   Run: node audit/water-lint.js */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES, typeCity } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
/* pointArena is the synthetic worst case: four tide turns and both reasons naming
   every factor at once — the tallest the rules can produce. */
const PLACES = (process.env.WATER_PLACES || 'cascais,newquay,flatbay,pointArena').split(',');
const VIEWPORTS = (process.env.WATER_VIEWPORTS || '390x844,1280x800')
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { width: w, height: h, tag: s };
  });

const MEASURE = `(() => {
  const px = (el, p) => parseFloat(getComputedStyle(el)[p]);
  const q = (s) => document.querySelector(s);
  const box = (el) => { const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const out = { notes: [] };
  const ratings = [...document.querySelectorAll('.rating')];
  if (ratings.length !== 2) out.notes.push('expected two verdict cards, found ' + ratings.length);
  const rb = ratings.map((r) => box(r));
  out.ratingHeights = rb.map((b) => Math.round(b.h));
  out.ratingTops = rb.map((b) => Math.round(b.y));
  out.ratingWidths = rb.map((b) => Math.round(b.w));
  const words = [...document.querySelectorAll('.rating__word')];
  out.wordPx = words.map((w) => Math.round(px(w, 'fontSize')));
  out.reasonPx = [...document.querySelectorAll('.rating__reason')].map((r) => Math.round(px(r, 'fontSize')));
  out.reasonLines = [...document.querySelectorAll('.rating__reason')].map((r) =>
    Math.round(r.getBoundingClientRect().height / px(r, 'lineHeight')));
  out.reasonChars = [...document.querySelectorAll('.rating__reason')].map((r) => r.textContent.length);
  // clipped text: content wider/taller than its own box
  out.clipped = [...document.querySelectorAll('[data-testid="water"] *')].filter((el) => {
    if (!el.textContent.trim()) return false;
    if (el.children.length) return false;
    const cs = getComputedStyle(el);
    if (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') return false;
    return el.scrollWidth - el.clientWidth > 1 || el.scrollHeight - el.clientHeight > 1;
  }).map((el) => el.className + ' "' + el.textContent.trim().slice(0, 24) + '"');

  const events = [...document.querySelectorAll('[data-testid="tide-event"]')].map((li) => box(li));
  out.eventRows = [...new Set(events.map((e) => e.y))].length;
  out.eventHeights = [...new Set(events.map((e) => Math.round(e.h)))];
  out.eventCount = events.length;

  const chart = q('[data-testid="tide-chart"]');
  const chartInner = chart ? { w: chart.clientWidth, h: chart.clientHeight } : null;
  const svg = chart && chart.querySelector('svg');
  if (!svg) out.notes.push('no tide chart painted');
  else {
    const cb = box(chart);
    const sb = box(svg);
    out.chartBox = [chartInner.w, chartInner.h];
    out.chartFills = Math.abs(sb.h - chartInner.h) < 2 && Math.abs(sb.w - chartInner.w) < 2;
    const parts = [...svg.querySelectorAll('path.tc-line, circle, text')].map((n) => box(n));
    const inside = parts.every((p) => p.x >= cb.x - 1.5 && p.x + p.w <= cb.x + cb.w + 1.5 && p.y >= cb.y - 1.5 && p.y + p.h <= cb.y + cb.h + 1.5);
    out.chartInside = inside;
    if (!inside) out.notes.push('chart marks spill outside the chart box');
    const line = svg.querySelector('path.tc-line');
    if (line) {
      const lb = box(line);
      out.curveSpan = Math.round((lb.w / (cb.w - 16)) * 100) + '%';
      out.curveRise = Math.round(lb.h);
    }
  }

  const sea = [...document.querySelectorAll('.sea__stat')].map((s) => box(s));
  out.seaRows = [...new Set(sea.map((s) => s.y))].length;
  out.seaWidths = [...new Set(sea.map((s) => Math.round(s.w)))];
  const panels = [...document.querySelectorAll('.water__panel')].map((p) => box(p));
  out.panelWidths = [...new Set(panels.map((p) => Math.round(p.w)))];
  out.panelCount = panels.length;

  // the fold: what is visible at scroll 0 on a phone, and does the next block peek?
  const hourly = q('[data-testid="hourly"]');
  const waterEl = q('[data-testid="water"]');
  const waterBox = waterEl ? box(waterEl) : { y: 0, h: 0 };
  out.waterEndsAt = Math.round(waterBox.y + waterBox.h);
  out.hourlyTop = hourly && !hourly.hidden ? Math.round(box(hourly).y) : null;
  out.fold = innerHeight;
  out.peek = out.hourlyTop !== null ? Math.max(0, innerHeight - out.hourlyTop) : 0;
  out.waterShareOfFold = Math.round(
    ((Math.min(innerHeight, out.waterEndsAt) - waterBox.y) / innerHeight) * 100,
  ) + '%';
  /* The chart is the answer to "when", and its time labels and "now" pill sit at the
     bottom of it. A chart cut by the fold loses exactly the part that carries the
     answer, so on a coastal first screen the whole box must be above the fold. */
  const chartEl = q('[data-testid="tide-chart"]');
  const chartBox = chartEl ? box(chartEl) : null;
  out.chartCut = chartBox && chartBox.w > 0 ? Math.round(chartBox.y + chartBox.h - innerHeight) : null;

  /* A good fold cuts through something: it says "there is more below" without anyone
     having to scroll to find that out. */
  out.foldCuts = [...document.querySelectorAll('.water__panel, .rating, [data-testid="hourly"]')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight - 8 && r.bottom > innerHeight + 8; })
    .map((el) => (el.getAttribute('data-testid') || el.className).toString().split(' ')[0]);

  // corner radii and gaps used inside the water section, for rhythm
  const radii = {};
  const gaps = {};
  for (const el of document.querySelectorAll('[data-testid="water"] *')) {
    const cs = getComputedStyle(el);
    const r = cs.borderRadius;
    if (r && r !== '0px') radii[r] = (radii[r] || 0) + 1;
    if (cs.display.includes('flex') || cs.display.includes('grid'))
      for (const g of [cs.rowGap, cs.columnGap]) if (g && g !== 'normal') gaps[g] = (gaps[g] || 0) + 1;
  }
  out.radii = radii;
  out.gaps = gaps;
  return out;
})()`;

const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const vp of VIEWPORTS) {
    for (const theme of ['light', 'dark']) {
      for (const place of PLACES) {
        const ctx = await browser.newContext({ viewport: vp });
        const page = await ctx.newPage();
        await installStub(page, { search: searchMapFor([place, 'cascais']) });
        await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
        await setTheme(page, theme);
        await typeCity(page, MATCHES[place] ? MATCHES[place].name : place);
        await page.waitForTimeout(650);
        const m = await page.evaluate(MEASURE);
        const tag = `${place}/${theme}/${vp.tag}`;

        // twin verdict cards: same size, same top — a pair, not two accidents
        if (m.ratingHeights.length === 2 && !near(m.ratingHeights[0], m.ratingHeights[1], 2)) {
          problems.push(`${tag}: verdict cards differ in height (${m.ratingHeights.join(' vs ')}px)`);
        }
        if (m.ratingTops.length === 2 && !near(m.ratingTops[0], m.ratingTops[1], 1)) {
          problems.push(`${tag}: verdict cards do not start at the same line`);
        }
        if (m.ratingWidths.length === 2 && !near(m.ratingWidths[0], m.ratingWidths[1], 2)) {
          problems.push(`${tag}: verdict cards differ in width (${m.ratingWidths.join(' vs ')}px)`);
        }
        if (m.wordPx[0] !== m.wordPx[1]) problems.push(`${tag}: verdict words are different sizes`);
        if (m.reasonPx[0] !== m.reasonPx[1]) problems.push(`${tag}: verdict reasons are different sizes`);
        if (m.reasonPx[0] < 12) problems.push(`${tag}: verdict reason is ${m.reasonPx[0]}px, too small to read outdoors`);
        // a Fair verdict naming all five factors is six lines at 390px — that's the
        // rules talking, not sloppy copy; anything past it is a reason nobody will read.
        if (m.reasonLines.some((n) => n > 6)) problems.push(`${tag}: a verdict reason wraps to ${Math.max(...m.reasonLines)} lines`);
        if (m.reasonChars.some((n) => n > 120)) problems.push(`${tag}: a verdict reason is ${Math.max(...m.reasonChars)} characters`);
        if (m.wordPx[0] < m.reasonPx[0] * 1.7) problems.push(`${tag}: the verdict word only leads the reason ${((m.wordPx[0] / m.reasonPx[0]) * 100).toFixed(0)}%`);

        if (m.clipped.length) problems.push(`${tag}: clipped text in the water section: ${m.clipped.join(' | ')}`);
        if (m.eventCount > 1 && m.eventRows > (vp.width >= 940 ? 2 : 2)) problems.push(`${tag}: tide turns wrap to ${m.eventRows} rows`);
        if (m.eventHeights.length > 1) problems.push(`${tag}: tide turn tiles are ragged (${m.eventHeights.join(', ')})`);
        if (m.chartCut !== null && m.chartCut > 0)
          problems.push(`${tag}: the tide chart is cut by the fold — its bottom ${m.chartCut}px (the time labels and "now") sit below the first screen`);
        if (m.seaWidths.length > 1) problems.push(`${tag}: sea-state tiles are ragged (${m.seaWidths.join(', ')})`);
        if (m.panelWidths.length > 1) problems.push(`${tag}: water panels are different widths (${m.panelWidths.join(', ')})`);
        if (m.chartFills === false) problems.push(`${tag}: the chart does not fill its box`);
        if (m.curveSpan && parseInt(m.curveSpan, 10) < 92) problems.push(`${tag}: the tide curve only spans ${m.curveSpan} of the box`);
        if (m.curveRise !== undefined && m.curveRise < 20 && m.eventCount > 0) problems.push(`${tag}: the tide curve only rises ${m.curveRise}px — the shape is invisible`);
        if (Object.keys(m.radii).length > 6) problems.push(`${tag}: ${Object.keys(m.radii).length} different corner radii inside the water section`);
        if (vp.height === 844) {
          if (!m.foldCuts.length) problems.push(`${tag}: the fold cuts nothing — the page gives no hint it scrolls`);
          if (m.waterShareOfFold === '0%') problems.push(`${tag}: the water section is not on the first screen`);
        }
        console.log(
          `${tag}: cards ${m.ratingHeights.join('/')}px word ${m.wordPx[0]}px reason ${m.reasonPx[0]}px/${m.reasonLines[0]}ln` +
            ` · turns ${m.eventCount} in ${m.eventRows} row(s) · sea ${m.seaRows} row(s)` +
            ` · curve ${m.curveSpan} wide, ${m.curveRise}px tall · fold share ${m.waterShareOfFold}, peek ${m.peek}px`,
        );
        await ctx.close();
      }
    }
  }
  await browser.close();
  if (problems.length) {
    console.log(`\n${problems.length} PROBLEM(S):`);
    problems.forEach((p) => console.log('  ! ' + p));
    process.exit(1);
  }
  console.log('\nWATER LINT CLEAN');
})();
