/* Design lint: objective composition checks that stand in for eyeballing.
   Measures type-scale dominance, spacing rhythm, corner-radius consistency,
   line-length, clipped/truncated text, and empty vertical space at 390x844
   and 1280x900, in both themes. Run: node audit/design-lint.js */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const LONDONS = ['london_gb', 'london_ca', 'london_oh', 'london_ky', 'london_ar'];
const SEARCH = Object.assign(searchMapFor(Object.keys(MATCHES)), { london: LONDONS, atlantis: [] });
const CITY = process.env.LINT_CITY || 'Berlin';

const MEASURE = `(() => {
  const px = (el, p) => parseFloat(getComputedStyle(el)[p]);
  const q = (s) => document.querySelector(s);
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden'; };
  const out = { notes: [] };

  const hero = q('.hero');
  if (hero) {
    const temp = q('.current-temperature');
    const cond = q('.current-condition');
    const loc = q('[data-testid="location-name"]');
    const t = px(temp, 'fontSize');
    out.heroTempPx = Math.round(t);
    out.tempToConditionRatio = Math.round((t / px(cond, 'fontSize')) * 10) / 10;
    out.tempToBodyRatio = Math.round((t / px(document.body, 'fontSize')) * 10) / 10;
    const heroR = hero.getBoundingClientRect();
    out.heroFill = Math.round((heroR.height / window.innerHeight) * 100) + '%';
    // does the hero temperature visually dominate the card area?
    const tRect = temp.getBoundingClientRect();
    out.tempShareOfHero = Math.round((tRect.height / heroR.height) * 100) + '%';
    // metric grid: equal widths, aligned rows
    const metrics = [...document.querySelectorAll('.metric')].map((m) => m.getBoundingClientRect());
    if (metrics.length) {
      const w = metrics[0].width;
      out.metricsEqualWidth = metrics.every((m) => Math.abs(m.width - w) < 0.6);
      out.metricMinPx = Math.round(Math.min(...metrics.map((m) => Math.min(m.width, m.height))));
    }
  }

  // corner radius consistency: how many distinct radii are in play?
  const radii = {};
  document.querySelectorAll('body *').forEach((el) => {
    if (!vis(el)) return;
    const cs = getComputedStyle(el);
    if (cs.backgroundColor === 'rgba(0, 0, 0, 0)' && cs.borderTopLeftRadius === '0px') return;
    const r = cs.borderTopLeftRadius;
    if (r === '0px') return;
    const same = r === cs.borderTopRightRadius && r === cs.borderBottomLeftRadius && r === cs.borderBottomRightRadius;
    if (!same) return;
    radii[r] = (radii[r] || 0) + 1;
  });
  out.radii = radii;

  // spacing rhythm: distinct vertical gaps between stacked children
  const gaps = {};
  document.querySelectorAll('body *').forEach((el) => {
    if (!vis(el)) return;
    const cs = getComputedStyle(el);
    if (cs.display !== 'flex' && cs.display !== 'grid') return;
    const g = cs.rowGap === 'normal' ? '0px' : cs.rowGap;
    if (g === '0px') return;
    gaps[g] = (gaps[g] || 0) + 1;
  });
  out.gapScale = Object.keys(gaps).sort((a, b) => parseFloat(a) - parseFloat(b));

  // truncated / clipped visible text (internal scrollers are intentional)
  const isScroller = (el) => {
    let p = el;
    while (p) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
      p = p.parentElement;
    }
    return false;
  };
  const clipped = [];
  document.querySelectorAll('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.clipPath !== 'none') return;
    if (cs.overflowX === 'visible' || el.scrollWidth <= el.clientWidth + 1) return;
    if (isScroller(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 2) return;
    if (!el.textContent.trim()) return;
    clipped.push(el.className + ':' + el.scrollWidth + '>' + el.clientWidth);
  });
  out.clippedText = clipped;

  // overlapping text: two leaf text elements whose boxes collide and neither
  // contains the other (this is how a crushed column shows up)
  const leaves = [];
  document.querySelectorAll('body *').forEach((el) => {
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (parseFloat(cs.opacity) < 0.05) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    let clipped = false;
    let p = el.parentElement;
    while (p) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') {
        const pr = p.getBoundingClientRect();
        if (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) clipped = true;
      }
      p = p.parentElement;
    }
    if (clipped) return;
    leaves.push({ el, r, txt: el.textContent.trim().slice(0, 22), cls: (typeof el.className === 'string' ? el.className : '').split(' ')[0] });
  });
  const overlaps = [];
  for (let i = 0; i < leaves.length; i++) {
    for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.el.parentElement === b.el.parentElement) continue; // siblings in a row are laid out side by side
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox > 2 && oy > 2) overlaps.push((a.cls || a.txt) + ' x ' + (b.cls || b.txt) + ' (' + Math.round(ox) + 'x' + Math.round(oy) + 'px)');
    }
  }
  out.overlaps = overlaps.slice(0, 6);

  // readable line measure for paragraph copy
  out.longLines = [...document.querySelectorAll('p')]
    .filter((p) => vis(p) && p.getBoundingClientRect().width > 620 && p.textContent.trim().length > 60)
    .map((p) => p.className + ' ' + Math.round(p.getBoundingClientRect().width) + 'px');

  // forecast cards: equal widths, one column, no stretched-out card
  const days = [...document.querySelectorAll('[data-testid="forecast-day"]')].map((d) => d.getBoundingClientRect());
  if (days.length) {
    out.dayWidths = [...new Set(days.map((d) => Math.round(d.width)))];
    out.dayRows = [...new Set(days.map((d) => Math.round(d.y)))].length;
    out.dayMaxWidth = Math.round(Math.max(...days.map((d) => d.width)));
  }
  if (out.dayWidths && out.dayWidths.length > 1) out.notes.push('forecast cards are different widths: ' + out.dayWidths.join(', '));
  if (out.dayMaxWidth > 620) out.notes.push('a forecast card is ' + out.dayMaxWidth + 'px wide — stretched');

  // horizontal overflow + scroll height
  out.docScrollWidth = document.documentElement.scrollWidth;
  out.innerWidth = window.innerWidth;
  out.docHeight = document.documentElement.scrollHeight;
  return out;
})()`;

async function run(browser, width, height, theme) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await installStub(page, { search: SEARCH });
  await page.goto(BASE + '/');
  await setTheme(page, theme);
  await page.fill('#city-input', 'Paris');
  await page.press('#city-input', 'Enter');
  await page.getByTestId('current-weather').waitFor();
  await page.fill('#city-input', CITY);
  await page.press('#city-input', 'Enter');
  await page.getByTestId('current-weather').waitFor();
  await page.waitForTimeout(650);
  const res = await page.evaluate(MEASURE);
  await ctx.close();
  return res;
}

(async () => {
  const browser = await chromium.launch();
  let issues = 0;
  for (const [w, h, label] of [[390, 844, 'phone'], [1280, 900, 'desktop']]) {
    for (const theme of ['light', 'dark']) {
      const r = await run(browser, w, h, theme);
      console.log(`\n### ${label} ${theme} · ${CITY}`);
      console.log('  hero temp', r.heroTempPx + 'px', '| vs condition', r.tempToConditionRatio + 'x', '| vs body', r.tempToBodyRatio + 'x', '| temp share of hero', r.tempShareOfHero, '| hero fills', r.heroFill);
      console.log('  radii', JSON.stringify(r.radii));
      console.log('  gap scale', r.gapScale.join(' '));
      if (r.metricsEqualWidth === false) { console.log('  ISSUE metric widths differ'); issues++; }
      if (r.clippedText.length) { console.log('  ISSUE clipped', r.clippedText); issues++; }
      if (r.overlaps && r.overlaps.length) { console.log('  ISSUE overlapping text', r.overlaps); issues++; }
      if (r.longLines.length) { console.log('  ISSUE long measure', r.longLines); issues++; }
      if (r.docScrollWidth > r.innerWidth) { console.log('  ISSUE overflow', r.docScrollWidth, '>', r.innerWidth); issues++; }
      if (r.heroTempPx !== undefined && r.heroTempPx < 64) { console.log('  ISSUE hero temperature below 64px'); issues++; }
      const distinctRadii = Object.keys(r.radii).length;
      if (distinctRadii > 5) { console.log(`  ISSUE ${distinctRadii} distinct corner radii (want a tight scale)`); issues++; }
    }
  }
  await browser.close();
  console.log(issues === 0 ? '\nDESIGN LINT CLEAN' : `\nDESIGN LINT: ${issues} issue(s)`);
  process.exit(issues === 0 ? 0 : 1);
})();
