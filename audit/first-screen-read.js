/* Reading the first screen without eyes. The checks assert the parts exist and the
   geometry lints assert they are well-formed; neither says what a person actually
   reads when they open a coastal place on a phone. This prints the above-the-fold
   text in visual order (top to bottom, then left to right), the first thing below
   the fold, and an ASCII density map of the tide chart, so the copy, the order and
   the chart can be reviewed as a user would review a screenshot.
   Run: node audit/first-screen-read.js [place ...]  (default: cascais newquay paris) */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES, fullLabel } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const ARGS = process.argv.slice(2);
const PLACES = ARGS.length ? ARGS : ['cascais', 'newquay', 'paris'];

const READ = `(() => {
  const inFold = (b) => b.top < innerHeight;
  const items = [];
  const walk = (el, depth) => {
    for (const kid of el.children) {
      const b = kid.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      const cs = getComputedStyle(kid);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      const own = [...kid.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      const testid = kid.getAttribute && kid.getAttribute('data-testid');
      if (own) {
        items.push({
          y: b.top, x: b.left, depth,
          tag: kid.tagName.toLowerCase(),
          testid: testid || '',
          cls: (kid.className || '').toString().split(' ')[0],
          text: own.slice(0, 110),
          px: Math.round(parseFloat(cs.fontSize)),
          fold: inFold(b),
          cut: inFold(b) && b.bottom > innerHeight,
        });
      } else {
        walk(kid, depth + 1);
      }
    }
  };
  walk(document.body, 0);
  items.sort((a, b) => (Math.round(a.y / 6) - Math.round(b.y / 6)) || (a.x - b.x));
  const fold = items.filter((i) => i.fold);
  const below = items.filter((i) => !i.fold);
  return {
    vh: innerHeight,
    doc: Math.round(document.documentElement.scrollHeight),
    fold,
    cut: fold.filter((i) => i.cut),
    belowFirst: below.slice(0, 3),
    belowCount: below.length,
    coastal: document.documentElement.classList.contains('is-coastal') ||
      !!document.querySelector('.is-coastal') ||
      !document.querySelector('[data-testid="water"]').hidden,
  };
})()`;

/* Density map of a screenshot region: '#' dense ink, '.' mid, ' ' nothing. */
(async () => {
  const browser = await chromium.launch();
  for (const place of PLACES) {
    const key = MATCHES[place] ? place : null;
    if (!key) {
      console.log(`unknown place "${place}"`);
      continue;
    }
    for (const theme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await installStub(page, { search: searchMapFor([key]), city: { key, currentCode: null, isDay: 1 } });
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await setTheme(page, theme);
      await page.locator('#city-input, [data-testid="city-input"], input[type="search"], input[type="text"]').first().fill(fullLabel(key));
      await page.keyboard.press('Enter');
      await page.waitForSelector('[data-testid="current-weather"]:not([hidden])');
      await page.waitForTimeout(250);
      await page.evaluate(() => window.scrollTo(0, 0));
      const r = await page.evaluate(READ);
      const bar = '='.repeat(78);
      console.log(`\n${bar}\n${fullLabel(key)}  ·  ${theme}  ·  390x844  ·  ${r.coastal ? 'COASTAL' : 'INLAND'}  ·  doc ${r.doc}px\n${bar}`);
      for (const it of r.fold) {
        const mark = it.cut ? '~' : ' ';
        const who = it.testid || it.cls || it.tag;
        console.log(`${mark}${String(Math.round(it.y)).padStart(4)} ${String(it.px).padStart(2)}px ${who.padEnd(20).slice(0, 20)} | ${it.text}`);
      }
      console.log(`--- fold ${r.vh}px --- above: ${r.fold.length} text nodes, below: ${r.belowCount}`);
      for (const it of r.belowFirst) {
        console.log(`   +${String(Math.round(it.y)).padStart(4)} ${String(it.px).padStart(2)}px ${(it.testid || it.cls || it.tag).padEnd(20).slice(0, 20)} | ${it.text}`);
      }
      await page.close();
    }
  }
  await browser.close();
})();
