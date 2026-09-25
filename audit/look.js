/* First-impressions harness: what a person sees on first load, at 390x844 and
   1280x800, per hero scene x theme. Viewport shots only (no full-page), plus
   the two numbers the operator complained about: how much of the hour strip is
   inside the first screen, and how much of the hero is empty space beside the
   temperature. Run: node audit/look.js  (LOOK_VIEWPORTS=1280x800,390x844)
   Screenshots: audit/look-<vp>-<scene>-<theme>.png (git-ignored) */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const HERE = __dirname;

const SCENES = [
  { name: 'clear-day', code: 0, isDay: 1 },
  { name: 'cloudy-day', code: 3, isDay: 1 },
  { name: 'rain-day', code: 63, isDay: 1 },
  { name: 'clear-night', code: 0, isDay: 0 },
];

const VIEWPORTS = (process.env.LOOK_VIEWPORTS || '390x844,1280x800')
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { width: w, height: h, tag: s };
  });

const MEASURE = `(() => {
  const vh = innerHeight;
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom), right: Math.round(b.right) }; };
  const hero = document.querySelector('.hero');
  const strip = document.querySelector('.strip');
  const week = document.querySelector('[data-testid="forecast-days"]');
  const temp = document.querySelector('.current-temperature');
  const chips = document.querySelector('.hero__chips');
  const badge = document.querySelector('.hero__icon');
  const out = { vh, doc: { h: Math.round(document.documentElement.scrollHeight), w: document.documentElement.scrollWidth }, };
  out.hero = r(hero);
  out.badge = r(badge);
  out.strip = r(strip);
  out.week = r(week);
  out.temp = r(temp);
  out.chips = r(chips);
  if (out.hero && temp) {
    /* "empty space to the right of the temperature": the reading row is the
       band that must feel used, so measure how much of it no child box covers.
       A row whose children tile it end to end has nothing left over. */
    const cs = getComputedStyle(hero);
    const padR = parseFloat(cs.paddingRight);
    const block = temp.closest('.temp-block') || temp;
    let inkRight = 0;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const rect of range.getClientRects()) inkRight = Math.max(inkRight, rect.right);
    }
    out.inkRightOfTemp = Math.round(inkRight);
    out.emptyRightOfTemp = Math.round(out.hero.x + out.hero.w - padR - inkRight);
    const band = document.querySelector('.hero__reading') || block.parentElement;
    const bb = band.getBoundingClientRect();
    const covered = [];
    for (const child of band.children) {
      const r = child.getBoundingClientRect();
      if (r.height < 2) continue;
      covered.push([r.left - bb.left, r.right - bb.left]);
    }
    const rowRight = out.hero.x + out.hero.w - padR - bb.left;
    const usedRight = covered.length ? Math.max(...covered.map((c) => c[1])) : 0;
    out.uncoveredRightOfReading = Math.round(rowRight - usedRight);
  }
  if (out.strip) {
    const visible = Math.max(0, Math.min(vh, out.strip.bottom) - Math.max(0, out.strip.y));
    out.stripVisibleFrac = +(visible / out.strip.h).toFixed(2);
  }
  const firstHour = document.querySelector('.hour');
  out.hours = { count: document.querySelectorAll('.hour').length, w: firstHour ? Math.round(firstHour.getBoundingClientRect().width) : 0, h: firstHour ? Math.round(firstHour.getBoundingClientRect().height) : 0 };
  return out;
})()`;

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const vp of VIEWPORTS) {
    const wide = vp.width >= 940;
    for (const theme of ['light', 'dark']) {
      for (const scene of SCENES) {
        const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
        const page = await ctx.newPage();
        await installStub(page, {
          search: searchMapFor(['lisbon']),
          city: { key: 'lisbon', currentCode: scene.code, isDay: scene.isDay },
        });
        await page.goto(BASE + '/');
        await setTheme(page, theme);
        await page.fill('#city-input', 'Lisbon');
        await page.press('#city-input', 'Enter');
        await page.getByTestId('current-weather').waitFor({ timeout: 6000 });
        await page.waitForTimeout(250);
        const m = await page.evaluate(MEASURE);
        const shot = path.join(HERE, `look-${vp.tag}-${scene.name}-${theme}.png`);
        await page.screenshot({ path: shot });
        rows.push({ vp: vp.tag, wide, theme, scene: scene.name, ...m });
        console.log(
          `${vp.tag.padEnd(9)} ${theme.padEnd(5)} ${scene.name.padEnd(11)}` +
            ` hero ${String(m.hero && m.hero.h).padStart(4)}px  emptyRight ${String(m.emptyRightOfTemp).padStart(4)}px  uncovered ${String(m.uncoveredRightOfReading).padStart(4)}px` +
            `  strip ${String(m.strip && m.strip.h).padStart(4)}px @y${m.strip && m.strip.y} visible ${m.stripVisibleFrac}` +
            `  badge ${m.badge && m.badge.w}x${m.badge && m.badge.h}` +
            `  doc ${m.doc.h}`,
        );
        await ctx.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(HERE, 'look.json'), JSON.stringify(rows, null, 2));

  const problems = [];
  for (const r of rows) {
    if (r.doc.w > (r.vp === '390x844' ? 390 : 1280)) problems.push(`${r.vp} ${r.theme} ${r.scene}: doc wider than viewport`);
    if (r.wide && r.stripVisibleFrac !== undefined && r.stripVisibleFrac < 0.99)
      problems.push(`${r.vp} ${r.theme} ${r.scene}: hour strip only ${(r.stripVisibleFrac * 100).toFixed(0)}% visible on first load`);
    if (r.wide && r.uncoveredRightOfReading > 24)
      problems.push(`${r.vp} ${r.theme} ${r.scene}: ${r.uncoveredRightOfReading}px of the hero's reading row is empty on the right`);
  }
  if (problems.length) {
    console.log('\nISSUES:');
    for (const p of problems) console.log('  ' + p);
    process.exit(1);
  }
  console.log('\nLOOK OK (hour strip fully visible on first load, no h-overflow)');
})();
