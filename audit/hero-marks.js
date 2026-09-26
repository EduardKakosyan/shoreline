/* Nothing may sit above or around the hero's weather mark.
   A reviewer read the decoration near the icon (stars, fog bands, rain streaks,
   haze blooms, tile hairlines) as a smudge / a row of dashes / a rendering
   glitch, twice. Rather than look for those shapes, this check screenshots the
   rendered hero and compares every sky pixel in a ring around the mark against
   the card's own CSS gradient, evaluated analytically. A sliver, hairline,
   veil, bloom or clipped texture departs from that gradient and fails; a smooth
   sky does not. Pixels inside a text, icon or tile box are the mark itself and
   are skipped. Run: node audit/hero-marks.js */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const SEARCH = searchMapFor(Object.keys(MATCHES));
const SCENES = [
  { code: 0, fam: 'clear' }, { code: 3, fam: 'cloudy' }, { code: 61, fam: 'rain' },
  { code: 73, fam: 'snow' }, { code: 45, fam: 'fog' }, { code: 95, fam: 'thunder' },
];
const TOL = 6;   // max per-channel departure from the painted gradient (0-255)
const RING = 20; // how far around the mark "around" means, in CSS px
const ANGLE = 158; // the hero's gradient angle, in styles.css

const GEOMETRY = `(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return { error: 'no hero' };
  const cs = getComputedStyle(hero);
  const h = hero.getBoundingClientRect();
  const stops = ['--hero-1', '--hero-2', '--hero-3'].map((n) => cs.getPropertyValue(n).trim());
  const boxes = [];
  for (const el of hero.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    const painted = (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)')
      || s.backgroundImage !== 'none'
      || /^(svg|img)$/i.test(el.tagName)
      || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!painted) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    boxes.push({ l: r.left - h.left, t: r.top - h.top, r: r.right - h.left, b: r.bottom - h.top });
  }
  const icon = document.querySelector('.hero__icon').getBoundingClientRect();
  return {
    scene: hero.dataset.scene, stops, radius: parseFloat(getComputedStyle(hero).borderTopLeftRadius) || 0,
    hero: { l: h.left, t: h.top, w: h.width, h: h.height },
    icon: { l: icon.left - h.left, t: icon.top - h.top, r: icon.right - h.left, b: icon.bottom - h.top },
    boxes,
  };
})()`;

/* Reproduce linear-gradient(158deg, s1 0%, s2 52%, s3 100%) per pixel. */
function score(payload) {
  const { b64, geo, tol, ring, angle } = payload;
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  return img.decode().then(() => {
    const scale = img.width / window.innerWidth;
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const parse = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
    const c = geo.stops.map(parse);
    const rad = (angle * Math.PI) / 180;
    const d = [Math.sin(rad), -Math.cos(rad)];
    const W = geo.hero.w, Hh = geo.hero.h;
    const len = Math.abs(W * d[0]) + Math.abs(Hh * d[1]);
    const mid = [W / 2, Hh / 2];
    const start = [mid[0] - (d[0] * len) / 2, mid[1] - (d[1] * len) / 2];
    const want = (x, y) => {
      const t = ((x - start[0]) * d[0] + (y - start[1]) * d[1]) / len;
      const k = Math.max(0, Math.min(1, t));
      const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
      return k <= 0.52 ? mix(c[0], c[1], k / 0.52) : mix(c[1], c[2], (k - 0.52) / 0.48);
    };
    const H = { l: geo.hero.l * scale, t: geo.hero.t * scale, w: W * scale, h: Hh * scale };
    const bx = geo.boxes.map((b) => ({
      l: H.l + b.l * scale, t: H.t + b.t * scale, r: H.l + b.r * scale, b: H.t + b.b * scale,
    }));
    const inBox = (x, y, pad) => bx.some((b) => x > b.l - pad && x < b.r + pad && y > b.t - pad && y < b.b + pad);
    const r0 = {
      l: H.l + (geo.icon.l - ring) * scale, t: H.t + (geo.icon.t - ring) * scale,
      r: H.l + (geo.icon.r + ring) * scale, b: H.t + (geo.icon.b + ring) * scale,
    };
    /* the card paints a rounded rect; outside it the page shows through */
    function insideCard(cx, cy, w, hh, rad) {
      const r = Math.min(rad, w / 2, hh / 2);
      if (cx < 3 || cy < 3 || w - cx < 3 || hh - cy < 3) return false;
      const qx = cx < r ? r - cx : (cx > w - r ? cx - (w - r) : 0);
      const qy = cy < r ? r - cy : (cy > hh - r ? cy - (hh - r) : 0);
      if (!qx || !qy) return true;
      // 3px inside the curve, so the card's own 1px border and its antialiasing
      // never count as a mark.
      return Math.hypot(qx, qy) <= r - 3;
    }
    let bad = 0, tested = 0, worst = 0, spot = '';
    for (let y = Math.max(0, Math.floor(r0.t)); y < Math.min(img.height - 1, r0.b); y += 2) {
      for (let x = Math.max(0, Math.floor(r0.l)); x < Math.min(img.width - 1, r0.r); x += 2) {
        if (inBox(x, y, 3 * scale)) continue;
        const self = at(x, y);
        if (!self) continue;
        const cx = (x - H.l) / scale, cy = (y - H.t) / scale;
        if (!insideCard(cx, cy, W, Hh, geo.radius)) continue;
        const e = want(cx, cy);
        tested++;
        const dev = Math.max(Math.abs(self[0] - e[0]), Math.abs(self[1] - e[1]), Math.abs(self[2] - e[2]));
        if (dev > worst) {
          worst = Math.round(dev);
          spot = Math.round(cx) + ',' + Math.round(cy) + ' got rgb(' + self.slice(0, 3).join(',') + ') want ' + e.map((v) => Math.round(v)).join(',');
        }
        if (dev > tol) bad++;
      }
    }
    function at(x, y) {
      const i = (Math.round(y) * cv.width + Math.round(x)) * 4;
      const p = [px[i], px[i + 1], px[i + 2], px[i + 3]];
      return p[3] < 250 ? null : p;
    }
    return { bad, tested, worst, spot, scene: geo.scene };
  });
}

(async () => {
  const browser = await chromium.launch();
  const issues = [];
  let checked = 0;
  for (const theme of ['light', 'dark']) {
    for (const { code, fam } of SCENES) {
      for (const isDay of [1, 0]) {
        const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
        const page = await ctx.newPage();
        await installStub(page, { search: SEARCH, city: { key: 'paris', currentCode: code, isDay } });
        await page.goto(BASE + '/');
        await setTheme(page, theme);
        await page.fill('#city-input', 'Paris');
        await page.press('#city-input', 'Enter');
        const tag = `${theme} ${fam}-${isDay ? 'day' : 'night'}`;
        try {
          await page.getByTestId('current-weather').waitFor({ timeout: 6000 });
        } catch (e) {
          issues.push(`${tag}: hero never rendered`);
          await ctx.close();
          continue;
        }
        await page.waitForTimeout(250);
        const geo = await page.evaluate(GEOMETRY);
        const buf = await page.screenshot();
        const res = await page.evaluate(score, {
          b64: buf.toString('base64'), geo, tol: TOL, ring: RING, angle: ANGLE,
        }).catch((e) => ({ error: String(e) }));
        checked++;
        if (res.error) issues.push(`${tag}: ${res.error}`);
        else if (res.bad) issues.push(`${tag}: ${res.bad}/${res.tested} sky pixels are not the gradient (worst ${res.worst} at ${res.spot})`);
        else console.log(`ok ${tag}: worst departure ${res.worst}/255 over ${res.tested} sky px`);
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log(`heroes checked: ${checked} (12 skies x 2 themes)`);
  if (issues.length) {
    console.log('ISSUES:');
    for (const i of issues) console.log('  ' + i);
    process.exit(1);
  }
  console.log('HERO SKY CLEAN - nothing painted above or around the mark');
})();
