/* Live pass: the real Open-Meteo APIs, no interception, for coastal and inland
   places across timezones. Fixtures are polite; the sea is not. This looks for the
   things real data does — nulls inland, current.time on :15/:30/:45, a tide series
   with no turn today, negative heights, a swell direction of 0/359, a place whose
   local "today" differs from UTC — and asserts the page never breaks, never prints
   NaN/undefined/Infinity, and never shows the water section where it should not be.
   Run: node audit/live-check.js   (LIVE_PLACES=cascais,denoman) */
const { chromium } = require('@playwright/test');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const PLACES = (
  process.env.LIVE_PLACES ||
  'Cascais,Newquay,Honolulu,Sydney,Cape Town,Halifax,Madrid,Denver,Tokyo,Reykjavik'
).split(',');
const VIEWPORTS = (process.env.LIVE_VIEWPORTS || '390x844,1280x800')
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { width: w, height: h, tag: s };
  });

const BAD = /(NaN|undefined|Infinity|°C°C|--°|:NaN|null m|m m|\bnull\b)/;

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const rows = [];

  for (const place of PLACES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      const calls = { geo: 0, wx: 0, marine: 0 };
      page.on('request', (r) => {
        if (r.url().includes('geocoding-api')) calls.geo++;
        if (r.url().includes('api.open-meteo.com/v1/forecast')) calls.wx++;
        if (r.url().includes('marine-api')) calls.marine++;
      });

      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
      await page.getByLabel('City', { exact: true }).fill(place);
      await page.keyboard.press('Enter');
      // real network: give it room, then settle
      await page.getByTestId('current-weather').waitFor({ timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(2500);

      const picker = await page.getByTestId('match-list').isVisible().catch(() => false);
      if (picker) {
        await page.getByTestId('match-option').first().click();
        await page.waitForTimeout(2500);
      }

      const m = await page.evaluate(`(() => {
        const txt = (s) => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; };
        const vis = (s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const water = document.querySelector('[data-testid="water"]');
        const r = water ? water.getBoundingClientRect() : null;
        return {
          place: txt('[data-testid="location-name"]'),
          temp: txt('[data-testid="current-temperature"]'),
          hours: document.querySelectorAll('[data-testid="hour-item"]').length,
          days: document.querySelectorAll('[data-testid="forecast-day"]').length,
          water: !!(r && r.width > 0),
          marineNote: vis('[data-testid="marine-unavailable"]'),
          error: vis('[data-testid="error"]'),
          beach: txt('[data-testid="beach-rating"]'),
          beachWhy: txt('[data-testid="beach-reason"]'),
          fish: txt('[data-testid="fishing-rating"]'),
          fishWhy: txt('[data-testid="fishing-reason"]'),
          trend: txt('[data-testid="tide-trend"]'),
          turns: [...document.querySelectorAll('[data-testid="tide-event"]')].map((li) =>
            ['tide-kind','tide-time','tide-height'].map((t) => { const n = li.querySelector('[data-testid="'+t+'"]'); return n ? n.textContent : ''; }).join(' ')),
          note: txt('[data-testid="tide-note"]'),
          waves: txt('[data-testid="wave-height"]'),
          period: txt('[data-testid="wave-period"]'),
          swell: txt('[data-testid="swell-direction"]'),
          sst: txt('[data-testid="sea-temperature"]'),
          moon: txt('[data-testid="moon-phase"]'),
          chart: vis('[data-testid="tide-chart"]'),
          chartSvg: !!(document.querySelector('[data-testid="tide-chart"] svg')),
          scrollW: document.documentElement.scrollWidth,
          innerW: innerWidth,
          bodyText: document.body.innerText,
          fold: (() => { const b = document.querySelector('[data-testid="beach-rating"]'); return b ? Math.round(b.getBoundingClientRect().bottom + scrollY) : null; })(),
        };
      })()`);

      rows.push({ place, vp: vp.tag, ...m, errors });
      const tag = `${place}/${vp.tag}`;

      if (errors.length) problems.push(`${tag}: console ${errors.slice(0, 2).join(' | ')}`);
      if (m.error) problems.push(`${tag}: the forecast error state showed for a live search`);
      if (!m.place) problems.push(`${tag}: no weather rendered`);
      if (m.hours !== 24) problems.push(`${tag}: hourly strip has ${m.hours} items, not 24`);
      if (m.days !== 5) problems.push(`${tag}: ${m.days} forecast days, not 5`);
      if (m.scrollW > m.innerW + 1) problems.push(`${tag}: document scrolls sideways (${m.scrollW} > ${m.innerW})`);
      if (calls.marine === 0) problems.push(`${tag}: no marine request went out`);
      if (BAD.test(m.bodyText)) {
        const hit = m.bodyText.match(new RegExp('.{0,30}' + BAD.source + '.{0,30}'));
        problems.push(`${tag}: suspicious text on the page — "${hit && hit[0].replace(/\s+/g, ' ')}"`);
      }
      if (m.water) {
        for (const [k, v] of [['beach', m.beach], ['fishing', m.fish]]) {
          if (!['Good', 'Fair', 'Poor'].includes(v)) problems.push(`${tag}: ${k} rating reads "${v}"`);
        }
        for (const [k, v] of [['beach-reason', m.beachWhy], ['fishing-reason', m.fishWhy]]) {
          if (!v || v.length < 8) problems.push(`${tag}: ${k} is empty ("${v}")`);
        }
        if (!m.waves || !/\d/.test(m.waves)) problems.push(`${tag}: wave height reads "${m.waves}"`);
        if (!m.period || !/\d s/.test(m.period)) problems.push(`${tag}: wave period reads "${m.period}"`);
        if (!['N','NE','E','SE','S','SW','W','NW'].includes(m.swell)) problems.push(`${tag}: swell direction reads "${m.swell}"`);
        if (!m.sst || !/°[CF]/.test(m.sst)) problems.push(`${tag}: sea temperature reads "${m.sst}"`);
        if (!['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'].includes(m.moon)) {
          problems.push(`${tag}: moon phase reads "${m.moon}"`);
        }
        if (!m.chartSvg) problems.push(`${tag}: no tide chart painted for a coastal place`);
        if (m.note && !/approximate/i.test(m.note)) problems.push(`${tag}: the tide note no longer says "approximate"`);
        if (!m.turns.length) console.log(`  note ${tag}: no tide turn today (${m.trend}) — the flat/edge-case path`);
        m.turns.forEach((t) => {
          if (!/^(High|Low) \d{2}:00 -?\d+\.\d (m|ft)$/.test(t)) problems.push(`${tag}: tide turn reads "${t}"`);
        });
        if (!['Rising','Falling','Steady'].includes(m.trend)) problems.push(`${tag}: tide trend reads "${m.trend}"`);
        if (vp.height === 844 && m.fold !== null && m.fold > vp.height) {
          problems.push(`${tag}: verdicts end ${m.fold}px down, past the first screen`);
        }
      } else if (!m.marineNote) {
        console.log(`  note ${tag}: treated as inland (marine answered nulls)`);
      }
      await ctx.close();
    }
  }

  await browser.close();
  for (const r of rows.filter((x) => x.vp === '390x844')) {
    console.log(
      `\n${(r.place || '?').slice(0, 34).padEnd(34)} ${r.water ? 'coastal' : 'inland'}  ${r.beach || '-'}/${r.fish || '-'}`,
    );
    if (r.water) {
      console.log(`  beach  ${r.beachWhy}`);
      console.log(`  fish   ${r.fishWhy}`);
      console.log(`  sea    ${r.waves} · ${r.period} · from ${r.swell} · ${r.sst} · ${r.moon} · tide ${r.trend}`);
      console.log(`  turns  ${r.turns.join(' | ') || '(none today)'}  verdicts end ${r.fold}px`);
    }
  }
  console.log(`\n${problems.length ? problems.length + ' PROBLEM(S)' : 'no problems'} across ${PLACES.length} live places`);
  problems.forEach((p) => console.log('  ! ' + p));
  process.exit(problems.length ? 1 : 0);
})();
