/* Decoration must never touch text. Walks every hero scene (driven through real
   fixture weather, both themes) and asserts that no SVG decoration shape inside
   the hero paints over a text element or a metric tile, and that the sky window
   does not overlap the location name. Run: node audit/decor.js */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const SEARCH = Object.assign(searchMapFor(Object.keys(MATCHES)), {
  london: ['london_gb', 'london_ca', 'london_oh', 'london_ky', 'london_ar'],
  atlantis: [],
});

/* Codes covering every family, day and night. */
const SCENES = [
  { code: 0, fam: 'clear' },
  { code: 3, fam: 'cloudy' },
  { code: 61, fam: 'rain' },
  { code: 73, fam: 'snow' },
  { code: 45, fam: 'fog' },
  { code: 95, fam: 'thunder' },
];

const MEASURE = `(() => {
  const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const hit = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5;
  const hero = document.querySelector('.hero');
  if (!hero) return { error: 'no hero' };
  const clip = hero.getBoundingClientRect();
  const badge = document.querySelector('.hero__icon');
  const brect = badge.getBoundingClientRect();

  const shapes = [...document.querySelectorAll('.hero__texture circle, .hero__texture rect, .hero__texture line, .hero__texture path, .hero__texture ellipse')]
    .map((el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });

  const textNodes = [];
  const walk = document.createTreeWalker(hero, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walk.nextNode())) {
    const t = (n.textContent || '').trim();
    if (!t) continue;
    const el = n.parentElement;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    textNodes.push({ label: t.slice(0, 24), rect: { l: r.left, t: r.top, r: r.right, b: r.bottom } });
  }
  const tiles = [...hero.querySelectorAll('.metric')].map((el) => ({ label: 'tile', rect: rect(el) }));

  const offenders = [];
  for (const s of shapes) {
    // a shape fully clipped by the window can only paint inside the window
    const visible = { l: Math.max(s.l, brect.left), t: Math.max(s.t, brect.top), r: Math.min(s.r, brect.right), b: Math.min(s.b, brect.bottom) };
    const clippedBy = brect.left - s.l > 0.5 || brect.top - s.t > 0.5 || s.r - brect.right > 0.5 || s.b - brect.bottom > 0.5;
    const target = clippedBy ? visible : s;
    if (target.r - target.l <= 0 || target.b - target.t <= 0) continue;
    for (const t of [...textNodes, ...tiles]) {
      if (hit(target, t.rect)) offenders.push({ shape: Math.round(s.l) + ',' + Math.round(s.t) + '-' + Math.round(s.r) + ',' + Math.round(s.b), text: t.label });
    }
  }
  const badgeOverText = textNodes.filter((t) => hit(brect, t.rect)).map((t) => t.label);
  return {
    shapes: shapes.length,
    offenders,
    badgeOverText,
    scene: hero.dataset.scene,
    heroInside: clip.width > 0 && clip.height > 0,
  };
})()`;

(async () => {
  const browser = await chromium.launch();
  const issues = [];
  let checked = 0;
  for (const theme of ['light', 'dark']) {
    for (const { code, fam } of SCENES) {
      for (const isDay of [1, 0]) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const page = await ctx.newPage();
        await installStub(page, { search: SEARCH, city: { key: 'paris', currentCode: code, isDay } });
        await page.goto(BASE + '/');
        await setTheme(page, theme);
        await page.fill('#city-input', 'Paris');
        await page.press('#city-input', 'Enter');
        try {
          await page.getByTestId('current-weather').waitFor({ timeout: 6000 });
        } catch (e) {
          issues.push(`${theme} ${fam}-${isDay ? 'day' : 'night'}: hero never rendered`);
          await ctx.close();
          continue;
        }
        await page.waitForTimeout(200);
        const r = await page.evaluate(MEASURE);
        checked++;
        if (process.env.DECOR_VERBOSE) console.log(`  ok ${theme} ${fam}-${isDay ? 'day' : 'night'} shapes=${r.shapes}`);
        const tag = `${theme} ${fam}-${isDay ? 'day' : 'night'}`;
        if (r.error) issues.push(`${tag}: ${r.error}`);
        else if (r.offenders.length) {
          issues.push(`${tag}: decoration over text -> ${JSON.stringify(r.offenders.slice(0, 3))}`);
        } else if (r.badgeOverText.length) {
          issues.push(`${tag}: sky window overlaps text -> ${r.badgeOverText.join(', ')}`);
        }
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log(`scenes checked: ${checked} (12 skies x 2 themes)`);
  if (issues.length) {
    console.log('ISSUES:');
    for (const i of issues) console.log('  ' + i);
    process.exit(1);
  }
  console.log('DECOR CLEAN');
})();
