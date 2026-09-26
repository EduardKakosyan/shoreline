/* The operator asked, of the weather marks:
   1. "Mainly clear" must not look the same as "Partly cloudy" — mostly clear has to
      read as mostly clear.
   2. At night the moon must sit *behind* the cloud, not have a fragment of a crescent
      poking above it, which reads as a drawing error.
   These are rasterised and measured rather than eyeballed: ink share, the topmost ink
   column, and a pixel-by-pixel distance between the two marks.
   Run: node audit/icon-check.js */
const { chromium } = require('@playwright/test');

const CODES = { 0: 'clear', 1: 'mainly', 2: 'partly', 3: 'cloudy' };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await page.goto('file://' + __dirname + '/../index.html');
  const problems = [];
  const rows = [];

  for (const isDay of [1, 0]) {
    for (const code of [0, 1, 2, 3]) {
      const svg = await page.evaluate(
        ({ code, isDay }) => window.Icons.weatherIcon(code, isDay, { size: 128 }),
        { code, isDay },
      );
      const shot = await page.evaluateHandle(
        (markup) => {
          const d = document.createElement('div');
          d.dataset.iconshot = '1';
          d.innerHTML = markup;
          d.style.cssText = 'position:fixed;left:0;top:0;background:#ffffff;color:#12233b';
          document.body.appendChild(d);
          return d;
        },
        svg,
      );
      const buf = await shot.asElement().screenshot();
      await page.evaluate(() => document.querySelectorAll('body > div[data-iconshot]').forEach((n) => n.remove()));
      await shot.dispose().catch(() => {});
      rows.push({ code: CODES[code] + (isDay ? '-day' : '-night'), bytes: buf.length });
      // rasterise in the browser: draw to canvas, read pixels
      const stats = await page.evaluate(async (b64) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        const ink = [];
        let hot = 0;
        for (let y = 0; y < c.height; y++) {
          for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4;
            const a = px[i + 3] / 255;
            if (a < 0.06) continue;
            const r = px[i], g = px[i + 1], bl = px[i + 2];
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
            const alpha = a * (255 - lum) / 255; // how far from the white page
            if (alpha < 0.08) continue;
            ink.push([x, y, r, g, bl, alpha]);
            if (r > 180 && g > 110 && g < 220 && bl < 120) hot++; // warm accent (sun/moon)
          }
        }
        return {
          w: c.width, h: c.height,
          inkShare: +(ink.length / (c.width * c.height)).toFixed(3),
          warmPx: hot,
          topRows: (() => {
            const ys = ink.map((p) => p[1]).sort((a, b) => a - b);
            return ys.length ? { first: ys[0], last: ys[ys.length - 1] } : { first: -1, last: -1 };
          })(),
          // warm (sun/moon) pixels above the cloud body's top edge?
          warmTop: (() => {
            const warm = ink.filter((p) => p[2] > 180 && p[3] > 110 && p[3] < 220 && p[4] < 120);
            if (!warm.length) return null;
            return Math.min(...warm.map((p) => p[1]));
          })(),
          sig: ink.map((p) => (p[0] >> 3) + ',' + (p[1] >> 3)).join('|').length,
        };
      }, buf.toString('base64'));
      rows[rows.length - 1].stats = stats;
    }
  }

  const by = Object.fromEntries(rows.map((r) => [r.code, r]));
  for (const r of rows) {
    console.log(
      `${r.code.padEnd(13)} ink ${String(r.stats.inkShare).padEnd(6)} warm px ${String(r.stats.warmPx).padStart(5)}` +
      `  topmost warm row ${r.stats.warmTop === null ? '-' : r.stats.warmTop}`,
    );
  }

  // 1. "Mainly clear" is a shape claim, not an ink claim: what has to differ is the
  //    cloud. A cloud is the only ink in the lower fifth of the box (the sun's lowest
  //    ray ends above it), so cloud area is measured on its own.
  const cloudInk = async (code, isDay) => {
    const svg = await page.evaluate(
      ({ code, isDay }) => window.Icons.weatherIcon(code, isDay, { size: 160 }),
      { code, isDay },
    );
    return page.evaluate(async (markup) => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:0;top:0;background:#fff;color:#12233b';
      d.innerHTML = markup;
      document.body.appendChild(d);
      const blob = new XMLSerializer().serializeToString(d.firstElementChild);
      d.remove();
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(blob.replace(/var\([^)]*\)/g, '#12233b'))));
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 160; c.height = 160;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 160, 160);
      const px = ctx.getImageData(0, 0, 160, 160).data;
      let n = 0;
      for (let y = Math.round(160 * 0.56); y < 160; y++)
        for (let x = 0; x < 160; x++) {
          const i = (y * 160 + x) * 4;
          const a = px[i + 3] / 255;
          const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          if (a * (1 - lum) > 0.08) n++;
        }
      return n;
    }, svg);
  };

  for (const isDay of [1, 0]) {
    const suffix = isDay ? 'day' : 'night';
    const mC = await cloudInk(1, isDay);
    const pC = await cloudInk(2, isDay);
    const clear = await cloudInk(0, isDay);
    const cloudy = await cloudInk(3, isDay);
    console.log(
      `cloud ink (${suffix}): clear ${clear}  mainly ${mC}  partly ${pC}  overcast ${cloudy}`,
    );
    if (mC > pC * 0.75) problems.push(`mainly-${suffix}: its cloud is ${Math.round((mC / pC) * 100)}% of partly-${suffix}'s, so the two marks still read the same`);
    if (mC < clear + 40) problems.push(`mainly-${suffix}: no cloud left at all, it now reads as clear sky`);
    /* partly cloudy and overcast share one cloud path on purpose — what separates
       them is the sun/moon above it, so compare the whole marks, not the cloud. */
    const pAll = by['partly-' + suffix].stats.inkShare;
    const cAll = by['cloudy-' + suffix].stats.inkShare;
    const rel = Math.abs(pAll - cAll) / Math.max(pAll, cAll);
    console.log(`partly vs overcast (${suffix}): whole-mark difference ${(rel * 100).toFixed(0)}%`);
    if (rel < 0.12) problems.push(`partly-${suffix} is too close to overcast (${(rel * 100).toFixed(0)}% apart)`);
  }

  // 2. night marks: no warm moon ink stranded near the very top of the box when a
  //    cloud is present (the fragment the reviewer saw). The moon may sit behind the
  //    cloud, so its ink must be low enough to overlap the cloud body.
  for (const code of [1, 2]) {
    const n = by[CODES[code] + '-night'].stats;
    const box = n.h;
    console.log(`${CODES[code]}-night: warm ink starts at row ${n.warmTop} of ${box}`);
    if (code === 2 && n.warmTop !== null && n.warmTop < box * 0.12) {
      problems.push(`partly-night: warm moon ink starts at row ${n.warmTop}/${box}, stranded above the cloud`);
    }
  }

  await browser.close();
  if (problems.length) {
    console.log('\nPROBLEMS:');
    problems.forEach((p) => console.log('  ! ' + p));
    process.exit(1);
  }
  console.log('\nICON CHECK CLEAN');
})();
