/* Checks water.js against the acceptance suite's own expectations (ported from
   checks/fixtures.ts). Run: node audit/water-rules.js */
const path = require('path');
require('../water.js');
const W = globalThis.Water;

const CURRENT_TIME = '2026-09-24T12:00';
const DAY_DATES = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
const SUNRISE = '07:12';
const SUNSET = '19:26';
const TIDE_PERIOD_H = 12.42;
const HOUR_WEIGHTS = [0.10, 0.06, 0.03, 0.01, 0.00, 0.02, 0.08, 0.18, 0.32, 0.47, 0.62, 0.77,
  0.88, 0.96, 1.00, 0.97, 0.88, 0.74, 0.59, 0.45, 0.33, 0.24, 0.17, 0.13];
const PRECIP_BY_CODE = {
  0: 0, 1: 5, 2: 10, 3: 20, 45: 30, 48: 35, 51: 45, 53: 55, 55: 65, 56: 60, 57: 70,
  61: 60, 63: 70, 65: 80, 66: 70, 67: 85, 71: 60, 73: 70, 75: 80, 77: 60, 80: 55,
  81: 65, 82: 85, 85: 70, 86: 80, 95: 85, 96: 90, 99: 95,
};
const precipMax = (c) => PRECIP_BY_CODE[c] ?? 0;

const MARINE = {
  cascais: { current: { wave_height: 0.6, wave_direction: 285, wave_period: 9.4, swell_wave_height: 0.5, swell_wave_direction: 290, swell_wave_period: 11.2, sea_surface_temperature: 20.6 }, tide: { amplitude: 1.33, highAt: 13.3, skew: 0.12 } },
  newquay: { current: { wave_height: 3.4, wave_direction: 265, wave_period: 13.6, swell_wave_height: 3.1, swell_wave_direction: 240, swell_wave_period: 14.1, sea_surface_temperature: 15.3 }, tide: { amplitude: 2.62, highAt: 10.4, skew: 0.2 } },
  lisbon: { current: { wave_height: 1.2, wave_direction: 300, wave_period: 11.6, swell_wave_height: 1.1, swell_wave_direction: 315, swell_wave_period: 12.3, sea_surface_temperature: 19.4 }, tide: { amplitude: 1.2, highAt: 3.7, skew: 0.1 } },
  sydney: { current: { wave_height: 1.8, wave_direction: 150, wave_period: 10.2, swell_wave_height: 1.6, swell_wave_direction: 135, swell_wave_period: 11.0, sea_surface_temperature: 18.1 }, tide: { amplitude: 0.8, highAt: 5.1, skew: 0.08 } },
};

const CITIES = {
  cascais: { current: { temperature_2m: 26.4, relative_humidity_2m: 58, weather_code: 0, wind_speed_10m: 9.8 }, daily: { weather_code: [0, 0, 1, 2, 1], temperature_2m_max: [27.1, 26.5, 25.8, 24.9, 25.3], temperature_2m_min: [18.2, 18.0, 17.6, 17.1, 17.4] } },
  newquay: { current: { temperature_2m: 14.2, relative_humidity_2m: 91, weather_code: 63, wind_speed_10m: 42.5 }, daily: { weather_code: [63, 61, 3, 2, 80], temperature_2m_max: [15.8, 16.4, 17.2, 17.9, 16.1], temperature_2m_min: [11.2, 11.9, 12.4, 12.8, 12.0] } },
  lisbon: { current: { temperature_2m: 24.6, relative_humidity_2m: 62, weather_code: 1, wind_speed_10m: 21.4 }, daily: { weather_code: [1, 2, 45, 53, 61], temperature_2m_max: [25.8, 24.3, 23.1, 22.6, 21.9], temperature_2m_min: [17.4, 18.1, 17.6, 18.9, 16.4] } },
  sydney: { current: { temperature_2m: 13.7, relative_humidity_2m: 78, weather_code: 45, wind_speed_10m: 19.2 }, daily: { weather_code: [45, 48, 3, 53, 1], temperature_2m_max: [15.4, 16.9, 18.1, 17.0, 14.2], temperature_2m_min: [8.6, 10.2, 11.7, 12.4, 9.9] } },
};

const seaLevelSeries = (key) => {
  const { amplitude, highAt, skew } = MARINE[key].tide;
  return Array.from({ length: 120 }, (_, h) => {
    const x = (2 * Math.PI * (h - highAt)) / TIDE_PERIOD_H;
    return Math.round((amplitude * Math.cos(x) + skew * Math.cos(x / 2)) * 100) / 100;
  });
};

const marineJson = (key) => {
  const level = seaLevelSeries(key);
  const time = DAY_DATES.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`));
  return {
    current: { ...MARINE[key].current, sea_level_height_msl: level[12], time: CURRENT_TIME },
    hourly: { time, sea_level_height_msl: level, wave_height: time.map((_, h) => Math.round(MARINE[key].current.wave_height * (0.85 + 0.3 * HOUR_WEIGHTS[h % 24]) * 100) / 100) },
  };
};

const forecastJson = (key) => {
  const c = CITIES[key];
  return {
    current: { time: CURRENT_TIME, ...c.current, apparent_temperature: Math.round(c.current.temperature_2m) - 1, is_day: 1 },
    hourly: { time: DAY_DATES.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`)) },
    daily: {
      time: DAY_DATES,
      weather_code: c.daily.weather_code,
      temperature_2m_max: c.daily.temperature_2m_max,
      temperature_2m_min: c.daily.temperature_2m_min,
      precipitation_probability_max: c.daily.weather_code.map(precipMax),
      sunrise: DAY_DATES.map((d) => `${d}T${SUNRISE}`),
      sunset: DAY_DATES.map((d) => `${d}T${SUNSET}`),
    },
  };
};

/* ---- expectations, exactly as checks/fixtures.ts derives them ---- */
function expectedTurns(key) {
  const v = seaLevelSeries(key);
  const out = [];
  for (let i = 1; i < 24; i++) {
    const time = `${String(i).padStart(2, '0')}:00`;
    if (v[i] > v[i - 1] && v[i] > v[i + 1]) out.push({ kind: 'High', time, heightM: v[i] });
    if (v[i] < v[i - 1] && v[i] < v[i + 1]) out.push({ kind: 'Low', time, heightM: v[i] });
  }
  return out;
}
const expectedTrend = (key) => {
  const v = seaLevelSeries(key);
  const i = Number(CURRENT_TIME.slice(11, 13));
  return v[i + 1] > v[i] ? 'Rising' : 'Falling';
};
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass = (d) => COMPASS[Math.round(d / 45) % 8];
const metres = (m) => `${m.toFixed(1)} m`;
const feet = (m) => `${(m * 3.28084).toFixed(1)} ft`;
const moonPhaseToday = () => {
  const NAMES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  const days = (Date.parse(`${DAY_DATES[0]}T12:00:00Z`) - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  const frac = ((days / 29.530588853) % 1 + 1) % 1;
  return NAMES[Math.floor(frac * 8 + 0.5) % 8];
};

const EXPECTED_OUTLOOK = {
  cascais: { beach: 'Good', fishing: 'Good', beachWords: [], fishingWords: ['dawn'] },
  newquay: { beach: 'Poor', fishing: 'Poor', beachWords: ['waves', 'wind', 'rain', 'cool'], fishingWords: ['waves', 'wind'] },
  lisbon: { beach: 'Fair', fishing: 'Fair', beachWords: ['waves', 'wind'], fishingWords: ['tide'] },
};

let fails = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); }
  else console.log(`ok   ${name}`);
};

for (const key of Object.keys(MARINE)) {
  const m = W.model(forecastJson(key), marineJson(key));
  check(`${key} turns`, m.turns.map((t) => [t.kind, t.time, t.heightM]), expectedTurns(key).map((t) => [t.kind, t.time, t.heightM]));
  check(`${key} trend`, m.trend, expectedTrend(key));
  check(`${key} wave-height`, W.lenText(m.sea.waveHeight, 'C'), metres(MARINE[key].current.wave_height));
  check(`${key} wave-height F`, W.lenText(m.sea.waveHeight, 'F'), feet(MARINE[key].current.wave_height));
  check(`${key} wave-period`, W.seaPeriodText(m.sea.wavePeriod), `${Math.round(MARINE[key].current.wave_period)} s`);
  check(`${key} swell-direction`, W.swellPoint(m.sea.swellDirection), compass(MARINE[key].current.swell_wave_direction));
  check(`${key} sea-temp C`, W.seaTempText(m.sea.sst, 'C'), `${Math.round(MARINE[key].current.sea_surface_temperature)}°C`);
  check(`${key} sea-temp F`, W.seaTempText(m.sea.sst, 'F'), `${Math.round(MARINE[key].current.sea_surface_temperature * 9 / 5 + 32)}°F`);
  check(`${key} tide-height C`, m.turns.map((t) => W.lenText(t.heightM, 'C')), expectedTurns(key).map((t) => metres(t.heightM)));
  check(`${key} tide-height F`, m.turns.map((t) => W.lenText(t.heightM, 'F')), expectedTurns(key).map((t) => feet(t.heightM)));
  check(`${key} moon`, m.moon.name, moonPhaseToday());
  if (EXPECTED_OUTLOOK[key]) {
    const b = W.beachVerdict(m.inputs);
    const f = W.fishingVerdict(m.inputs);
    check(`${key} beach rating`, b.rating, EXPECTED_OUTLOOK[key].beach);
    check(`${key} fishing rating`, f.rating, EXPECTED_OUTLOOK[key].fishing);
    const low = (s) => s.toLowerCase();
    for (const w of EXPECTED_OUTLOOK[key].beachWords) check(`${key} beach reason "${w}"`, low(b.reason).includes(w), true);
    for (const w of EXPECTED_OUTLOOK[key].fishingWords) check(`${key} fishing reason "${w}"`, low(f.reason).includes(w), true);
    check(`${key} reasons non-empty`, b.reason.trim().length > 0 && f.reason.trim().length > 0, true);
    // brief: a non-Good rating must name the keyword of EVERY held-back factor
    check(`${key} beach holds named`, b.holds.every((h) => low(b.reason).includes(h)), true);
    check(`${key} fishing holds named`, f.holds.every((h) => low(f.reason).includes(h)), true);
    // same keywords must survive the Fahrenheit rendering of the sentence
    const bf = W.beachVerdict(m.inputs, 'F');
    const ff = W.fishingVerdict(m.inputs, 'F');
    check(`${key} beach rating (F)`, bf.rating, b.rating);
    check(`${key} fishing rating (F)`, ff.rating, f.rating);
    check(`${key} beach holds named (F)`, bf.holds.every((h) => low(bf.reason).includes(h)), true);
    check(`${key} fishing holds named (F)`, ff.holds.every((h) => low(ff.reason).includes(h)), true);
    for (const w of EXPECTED_OUTLOOK[key].fishingWords) check(`${key} fishing reason F "${w}"`, low(ff.reason).includes(w), true);
    console.log(`     beach: ${b.rating} — ${b.reason}`);
    console.log(`     fish : ${f.rating} — ${f.reason}`);
    console.log(`     fishF: ${ff.rating} — ${ff.reason}`);
    console.log(`     best : ${W.bestTimes(m)}`);
  }
}

/* inland: marine answers 200 with nulls */
const inland = { current: { wave_height: null, sea_level_height_msl: null }, hourly: { time: DAY_DATES.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`)), sea_level_height_msl: Array(120).fill(null) } };
check('inland is not coastal', W.isCoastal(inland), false);
check('no marine is not coastal', W.isCoastal(undefined), false);
check('sea data is coastal', W.isCoastal(marineJson('cascais')), true);
const flat = { current: { wave_height: 0.5, sea_level_height_msl: 0 }, hourly: { time: marineJson('cascais').hourly.time, sea_level_height_msl: Array(120).fill(0.4) } };
const flatModel = W.model(forecastJson('cascais'), flat);
check('flat tide: no turns', flatModel.turns.length, 0);
/* the brief is literal: Rising only when the next hour is strictly higher, so a
   perfectly flat series reads Falling. */
check('flat tide: trend per the rule', flatModel.trend, 'Falling');
console.log(`     flat best-times: ${W.bestTimes(flatModel)}`);

/* ---- the amended turn rule: a run of equal readings is ONE turn ----
   The acceptance fixtures are smooth by construction, so nothing in checks/ can catch a
   regression here. The operator found the bug on live data (Honolulu held 0.93 m at both
   03:00 and 04:00, 0.26 m at 21:00 and 22:00), so these cases are pinned directly. */
check(
  'fixture series has no equal adjacent hours (so the strict oracle above stays valid)',
  Object.keys(MARINE).map((k) => {
    const v = seaLevelSeries(k);
    return v.slice(0, 24).some((x, i) => i > 0 && x === v[i - 1]);
  }),
  [false, false, false, false],
);

const HOURS = Array.from({ length: 120 }, (_, h) => {
  const d = DAY_DATES[Math.floor(h / 24)];
  return `${d}T${String(h % 24).padStart(2, '0')}:00`;
});
const marineWithLevels = (levels, key = 'cascais') => ({
  current: { ...MARINE[key].current, sea_level_height_msl: levels[12], time: CURRENT_TIME },
  hourly: { time: HOURS, sea_level_height_msl: levels },
});
const turnsOf = (levels) =>
  W.tideTurns(marineWithLevels(levels), DAY_DATES[0]).map((t) => [t.kind, t.time, t.heightM]);
const shape = (spec) => {
  const out = Array(120).fill(null);
  for (let h = 0; h < 24; h++) out[h] = typeof spec === 'function' ? spec(h) : 0;
  return out;
};

// 1. two-hour top -> exactly one High, stamped with the run's FIRST hour
check('plateau high (2h): one turn at the run start', turnsOf(shape((h) => (h < 5 ? h : h < 7 ? 5 : 10 - h))), [['High', '05:00', 5]]);
// 2. two-hour bottom -> exactly one Low, stamped with the run's FIRST hour
check('plateau low (2h): one turn at the run start', turnsOf(shape((h) => (h < 5 ? 5 - h : h < 7 ? 0 : h - 6))), [['Low', '05:00', 0]]);
// 3. three or more equal hours at the top -> still one turn
check('plateau high (4h): still one turn', turnsOf(shape((h) => (h < 4 ? h : h < 8 ? 4 : 12 - h))), [['High', '04:00', 4]]);
// 4. an ordinary single-hour peak is unaffected
check('single-hour peak still works', turnsOf(shape((h) => (h < 6 ? h : 12 - h))), [['High', '06:00', 6]]);
// 5. a plateau touching the start of the series has no water before it -> never a turn
check('plateau at series start is never a turn', turnsOf(shape((h) => (h < 2 ? 5 : 5 - (h - 1) / 2))), []);
// 6. a plateau touching the END of the series has no water after it -> never a turn
check('plateau at series end is never a turn', (() => {
  const a = Array.from({ length: 120 }, (_, h) => (h <= 118 ? h : 118));
  return W.tideTurns(marineWithLevels(a), DAY_DATES[4]).map((t) => [t.kind, t.time]);
})(), []);
// 7. equal readings separated by a null are two unrelated readings, not a plateau
check('null inside a run breaks it', turnsOf([4, 5, null, 5, 4, 3, 2, 1, 0, ...Array(111).fill(null)]), []);
// 8. the operator's own Honolulu readings: both plateaus must produce a turn
check(
  "operator's Honolulu series: plateau high and plateau low both found",
  turnsOf([0.5, 0.7, 0.85, 0.93, 0.93, 0.8, 0.6, 0.45, 0.3, 0.26, 0.26, 0.3, 0.5, 0.68, 0.8, 0.9, 0.95, 0.9, 0.75, 0.55, 0.4, 0.26, 0.26, 0.35]),
  [['High', '03:00', 0.93], ['Low', '09:00', 0.26], ['High', '16:00', 0.95], ['Low', '21:00', 0.26]],
);
// 9. the fishing verdict reads the plateau turns too, not just the list
{
  const lv = shape((h) => (h < 6 ? h : h < 8 ? 6 : 14 - h)); // plateau high across 06:00-07:00
  const mm = W.model(forecastJson('cascais'), marineWithLevels(lv, 'cascais'));
  const f = W.fishingVerdict(mm.inputs);
  check('plateau high inside the dawn window counts for fishing', f.rating, 'Good');
  check('and the Good reason names the window', /dawn/i.test(f.reason), true);
}

process.exit(fails ? 1 : 0);
