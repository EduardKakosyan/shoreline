/* Overflow / tap / contrast sweep across viewport widths (the checks only run
   390x844 and a desktop pass, but the operator may resize). Also drives an
   extreme location name and an extreme recents list.
   Run: node audit/widths.js */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const AUDIT = fs.readFileSync(path.join(__dirname, 'audit-lib.js'), 'utf8');
const OPTS = { text: true, tap: true, overflow: true, coverage: ['start', 'middle', 'end'] };
const WIDTHS = [320, 360, 390, 414, 540, 768, 1024, 1280, 1440];
const SEARCH = Object.assign(searchMapFor(Object.keys(MATCHES)), {
  london: ['london_gb', 'london_ca', 'london_oh', 'london_ky', 'london_ar'],
  atlantis: [],
});

(async () => {
  const browser = await chromium.launch();
  let failures = 0;
  for (const width of WIDTHS) {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await ctx.newPage();
      await installStub(page, { search: SEARCH });
      await page.goto(BASE + '/');
      await setTheme(page, theme);
      await page.fill('#city-input', 'Paris');
      await page.press('#city-input', 'Enter');
      await page.getByTestId('current-weather').waitFor();
      await page.waitForTimeout(500);
      const res = await page.evaluate(`${AUDIT}\n;auditPage(${JSON.stringify(OPTS)})`);
      const problems = [...res.text, ...res.coverage, ...res.tap, ...res.overflow];
      const line = `${problems.length ? 'FAIL' : 'ok  '}  ${String(width).padStart(4)}px ${theme}  text:${res.text.length} cov:${res.coverage.length} tap:${res.tap.length} of:${res.overflow.length} doc:${res.doc.scrollWidth}x${res.doc.scrollHeight}`;
      console.log(line);
      if (problems.length) {
        failures++;
        for (const p of problems.slice(0, 4)) console.log('        ' + JSON.stringify(p));
      }
      await ctx.close();
    }
  }

  /* extreme strings: very long place name + long recents at the narrowest width */
  for (const width of [320, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 } });
    const page = await ctx.newPage();
    await installStub(page, { search: SEARCH });
    await page.goto(BASE + '/');
    await setTheme(page, 'light');
    await page.evaluate(() => {
      localStorage.setItem(
        'wn.recents.v1',
        JSON.stringify([
          { label: 'Ulan-Bator, Khüree, Mongol Uls Republic with a very long administrative suffix', lat: 1, lon: 2, at: 5 },
          { label: 'São Bernardo do Campo, São Paulo, Brasil', lat: 3, lon: 4, at: 4 },
          { label: 'A'.repeat(70), lat: 5, lon: 6, at: 3 },
        ]),
      );
    });
    await page.reload();
    await page.fill('#city-input', 'Paris');
    await page.press('#city-input', 'Enter');
    await page.getByTestId('current-weather').waitFor();
    await page.evaluate(() => {
      document.querySelector('.location-name').textContent =
        'Charlottenburg-Wilmersdorf von Berlin, Land Berlin, Bundesrepublik Deutschland';
    });
    await page.waitForTimeout(400);
    const res = await page.evaluate(`${AUDIT}\n;auditPage(${JSON.stringify(OPTS)})`);
    const problems = [...res.text, ...res.coverage, ...res.tap, ...res.overflow];
    console.log(`${problems.length ? 'FAIL' : 'ok  '}  ${String(width).padStart(4)}px extreme-strings  text:${res.text.length} cov:${res.coverage.length} tap:${res.tap.length} of:${res.overflow.length}`);
    if (problems.length) {
      failures++;
      for (const p of problems.slice(0, 5)) console.log('        ' + JSON.stringify(p));
    }
    await ctx.close();
  }

  await browser.close();
  console.log(failures === 0 ? '\nWIDTHS CLEAN' : `\nWIDTHS: ${failures} failing width(s)`);
  process.exit(failures === 0 ? 0 : 1);
})();
