const { chromium } = require('@playwright/test');

const BASE = process.env.APP_URL || 'http://localhost:3000';

async function openCity(page, query) {
  await page.fill('#city-input', query);
  await page.press('#city-input', 'Enter');
  await Promise.race([
    page.waitForSelector('[data-testid="match-option"]', { timeout: 15000 }),
    page.waitForSelector('[data-testid="current-weather"]:not([hidden])', { timeout: 15000 }),
  ]);
  if (await page.getByTestId('match-option').count()) await page.getByTestId('match-option').first().click();
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => errors.push('dialog: ' + d.message()));

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await openCity(page, 'Lisbon');
  await page.waitForSelector('[data-testid="current-weather"] >> visible=true', { timeout: 15000 });

  const out = {};
  out.label = await page.getByTestId('location-name').innerText();
  out.temp = await page.getByTestId('current-temperature').innerText();
  out.condition = await page.getByTestId('current-condition').innerText();
  out.feels = await page.getByTestId('feels-like').innerText();
  out.sunrise = await page.getByTestId('sunrise').innerText();
  out.sunset = await page.getByTestId('sunset').innerText();
  out.humidity = await page.getByTestId('humidity').innerText();
  out.wind = await page.getByTestId('wind').innerText();
  out.hours = await page.getByTestId('hour-item').count();
  out.hourLabels = await page.locator('[data-testid="hour-item"] [data-testid="hour-label"]').allInnerTexts();
  out.days = await page.getByTestId('forecast-day').count();
  out.dayRows = [];
  for (let i = 0; i < (await page.getByTestId('forecast-day').count()); i++) {
    const row = page.getByTestId('forecast-day').nth(i);
    out.dayRows.push(
      [
        await row.locator('[data-testid="day-name"]').innerText(),
        await row.locator('[data-testid="day-high"]').innerText(),
        await row.locator('[data-testid="day-low"]').innerText(),
        await row.locator('[data-testid="day-condition"]').innerText(),
        await row.locator('[data-testid="day-precip"]').innerText(),
      ].join(' ')
    );
  }
  // hour labels must be HH:00 and start at the hour of current.time
  const badLabel = out.hourLabels.find((t) => !/^\d{2}:00$/.test(t.trim()));
  // strip contiguity
  const first = new Date(`2000-01-01T${out.hourLabels[0].trim()}`);
  let gaps = 0;
  out.hourLabels.forEach((t, i) => {
    const expect = new Date(first.getTime() + i * 3600e3);
    const hh = String(expect.getUTCHours()).padStart(2, '0') + ':00';
    if (t.trim() !== hh) gaps++;
  });
  out.badHourLabel = badLabel || null;
  out.hourGaps = gaps;

  // toggle units, then reload and search again
  await page.getByTestId('unit-toggle').click();
  await page.waitForTimeout(250);
  out.tempF = await page.getByTestId('current-temperature').innerText();
  out.windF = await page.getByTestId('wind').innerText();
  await page.reload({ waitUntil: 'networkidle' });
  out.unitAfterReload = await page.evaluate(() => localStorage.getItem('wn.units.v1'));
  out.emptyAfterReload = await page.getByTestId('empty-state').isVisible();
  await openCity(page, 'Reykjavik');
  await page.waitForSelector('[data-testid="current-weather"] >> visible=true', { timeout: 15000 });
  out.coldLabel = await page.getByTestId('location-name').innerText();
  out.coldTemp = await page.getByTestId('current-temperature').innerText();
  out.coldCondition = await page.getByTestId('current-condition').innerText();
  out.recents = await page.locator('[data-testid="recent-chip"]:visible').allInnerTexts();

  // overflow at 390 in results state
  const overflow = await page.evaluate(() => ({
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth,
    wide: [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > window.innerWidth + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed';
      })
      .map((el) => el.className + ':' + Math.round(el.getBoundingClientRect().width)),
  }));
  out.overflow = overflow;

  console.log(JSON.stringify(out, null, 2));
  console.log('CONSOLE_ERRORS:', JSON.stringify(errors));
  await browser.close();
  const ok =
    !out.badHourLabel &&
    out.hourGaps === 0 &&
    out.hours === 24 &&
    out.days === 5 &&
    errors.length === 0 &&
    overflow.docW <= overflow.winW;
  console.log(ok ? 'LIVE CHECK CLEAN' : 'LIVE CHECK FAILED');
  process.exit(ok ? 0 : 1);
})();
