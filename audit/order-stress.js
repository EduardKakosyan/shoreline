/* Stresses the recents ordering contract with out-of-order responses: the geocoder
   answers each query with a different delay so a city typed first can resolve last.
   node audit/order-stress.js */
const { expect } = require('@playwright/test');
const path = require('path');
const { chromium } = require('@playwright/test');
const { MATCHES, fullLabel } = require(path.join(__dirname, 'stub.js'));

const BASE = process.env.APP_URL || 'http://localhost:3000';
const KEYS = ['cairo', 'berlin', 'madrid', 'sydney', 'lisbon', 'paris'];
const LABELS = KEYS.map(fullLabel);
const SEARCH = {};
for (const k of KEYS) {
  SEARCH[fullLabel(k).toLowerCase()] = k;
  SEARCH[MATCHES[k].name.toLowerCase()] = k;
}

/* delay schedule (ms) keyed by fixture city, shuffled per round */
const SCHEDULES = [
  {},
  { cairo: 700, berlin: 20, madrid: 400, sydney: 10, lisbon: 250, paris: 5 },
  { cairo: 10, berlin: 650, madrid: 5, sydney: 500, lisbon: 3, paris: 400 },
  { cairo: 500, berlin: 500, madrid: 500, sydney: 500, lisbon: 500, paris: 500 },
];

const ok = [];
const bad = [];

async function run(browser, schedule, label) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad.push(`${label}: page error ${e.message}`));

  await ctx.route(/^https?:\/\/geocoding-api\.open-meteo\.com\//, async (route) => {
    const q = (new URL(route.request().url()).searchParams.get('name') || '').trim().toLowerCase();
    const key = SEARCH[q];
    if (schedule[key]) await new Promise((r) => setTimeout(r, schedule[key]));
    const m = key ? MATCHES[key] : null;
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(m ? { results: [{ id: 1, name: m.name, latitude: m.lat, longitude: m.lon, admin1: m.admin1, country: m.country }] } : {}),
    });
  });
  await ctx.route(/^https?:\/\/api\.open-meteo\.com\//, (route) => {
    const dates = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        current: { time: '2026-09-24T12:00', temperature_2m: 20, relative_humidity_2m: 50, apparent_temperature: 19, weather_code: 0, wind_speed_10m: 10, is_day: 1 },
        hourly: {
          time: dates.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`)),
          temperature_2m: new Array(120).fill(20), weather_code: new Array(120).fill(0),
          is_day: new Array(120).fill(1), precipitation_probability: new Array(120).fill(10),
        },
        daily: {
          time: dates, weather_code: [0, 0, 0, 0, 0], temperature_2m_max: [20, 20, 20, 20, 20],
          temperature_2m_min: [10, 10, 10, 10, 10], precipitation_probability_max: [0, 0, 0, 0, 0],
          sunrise: dates.map((d) => `${d}T07:12`), sunset: dates.map((d) => `${d}T19:26`),
        },
      }),
    });
  });

  const chips = page.getByTestId('recent-chip');
  const search = async (term) => {
    await page.getByLabel('City', { exact: true }).fill(term);
    await page.getByLabel('City', { exact: true }).press('Enter');
  };
  const expectOrder = async (want, step) => {
    try {
      await expect(chips).toHaveText(want, { timeout: 4000 });
      ok.push(`${label} ${step}`);
    } catch (e) {
      bad.push(`${label} ${step}: got ${JSON.stringify(await chips.allTextContents())} want ${JSON.stringify(want)}`); console.log('FAIL ' + label + ' ' + step + ' got ' + JSON.stringify(await chips.allTextContents()));
    }
  };

  await page.goto(BASE + '/');
  await search(LABELS[0]);
  await search(LABELS[1]);
  await expectOrder([LABELS[1], LABELS[0]], 'two searches');

  await page.reload();
  await expectOrder([LABELS[1], LABELS[0]], 'after reload');

  for (let i = 2; i < 6; i++) await search(LABELS[i]);
  await expectOrder([LABELS[5], LABELS[4], LABELS[3], LABELS[2], LABELS[1]], 'five searches');

  await search(LABELS[4]);
  await expectOrder([LABELS[4], LABELS[5], LABELS[3], LABELS[2], LABELS[1]], 'dedupe re-open');

  await chips.nth(3).waitFor({ timeout: 5000 });
  console.log("CHIPS BEFORE CLICK " + JSON.stringify(await chips.allTextContents()));
  await chips.nth(3).click();
  try {
    await expect(page.getByTestId('location-name')).toHaveText(LABELS[2], { timeout: 4000 });
    ok.push(`${label} chip click`);
  } catch (e) {
    bad.push(`${label} chip click: got ${await page.getByTestId('location-name').textContent()}`);
  }

  await page.getByTestId('clear-recents').click();
  await expect(chips).toHaveCount(0);
  await page.reload();
  await expect(chips).toHaveCount(0);
  ok.push(`${label} cleared + persisted`);

  await ctx.close();
}

(async () => {
  const { expect } = require('@playwright/test');
  const browser = await chromium.launch();
  for (let i = 0; i < SCHEDULES.length; i++) await run(browser, SCHEDULES[i], `sched${i}`);
  await browser.close();
  console.log(ok.map((o) => '  ok  ' + o).join('\n'));
  if (bad.length) {
    console.log('\nFAILURES:\n' + bad.map((b) => '  XX  ' + b).join('\n'));
    process.exit(1);
  }
  console.log('\nORDER STRESS CLEAN');
})();
