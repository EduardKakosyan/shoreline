/* Render the weather marks as ASCII density maps so they can be *read* in a terminal
   — the only way to check a shape claim without eyes. Run: node audit/icon-see.js */
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await page.goto('file://' + __dirname + '/../index.html');
  const N = Number(process.env.SEESIZE || 20);
  for (const isDay of [1, 0]) {
    for (const code of [0, 1, 2, 3]) {
      const svg = await page.evaluate(
        ({ code, isDay }) => window.Icons.weatherIcon(code, isDay, { size: 160 }),
        { code, isDay },
      );
      const map = await page.evaluate(async ({ markup, N }) => {
        const d = document.createElement('div');
        d.dataset.x = '1';
        d.style.cssText = 'position:fixed;left:0;top:0;background:#ffffff;color:#12233b';
        d.innerHTML = markup;
        document.body.appendChild(d);
        const r = await d.getBoundingClientRect();
        const shot = await d.screenshot ? null : null;
        const img = new Image();
        const blob = new XMLSerializer().serializeToString(d.firstElementChild);
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(blob.replace(/var\([^)]*\)/g, '#12233b'))));
        await img.decode();
        const c = document.createElement('canvas');
        c.width = 160; c.height = 160;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 160, 160);
        const px = ctx.getImageData(0, 0, 160, 160).data;
        d.remove();
        const rows = [];
        for (let gy = 0; gy < N; gy++) {
          let line = '';
          for (let gx = 0; gx < N; gx++) {
            let acc = 0;
            const x0 = Math.floor((gx * 160) / N), x1 = Math.floor(((gx + 1) * 160) / N);
            const y0 = Math.floor((gy * 160) / N), y1 = Math.floor(((gy + 1) * 160) / N);
            let n = 0;
            for (let y = y0; y < y1; y += 2)
              for (let x = x0; x < x1; x += 2) {
                const i = (y * 160 + x) * 4;
                const a = px[i + 3] / 255;
                const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
                acc += a * (1 - lum);
                n++;
              }
            const v = acc / Math.max(1, n);
            line += v > 0.55 ? '#' : v > 0.25 ? 'O' : v > 0.1 ? 'o' : v > 0.03 ? '.' : ' ';
          }
          rows.push(line);
        }
        return rows;
      }, { markup: svg, N });
      console.log(`\n--- code ${code} ${isDay ? 'day' : 'night'} ---`);
      map.forEach((r) => console.log('|' + r + '|'));
    }
  }
  await browser.close();
})();
