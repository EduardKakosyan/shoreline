/* Fixture stub shared by my audit scripts (mirrors checks/fixtures.ts data). */
const MATCHES = {
  london_gb: { name: 'London', admin1: 'England', country: 'United Kingdom', lat: 51.50853, lon: -0.12574 },
  london_ca: { name: 'London', admin1: 'Ontario', country: 'Canada', lat: 42.98339, lon: -81.23304 },
  london_oh: { name: 'London', admin1: 'Ohio', country: 'United States', lat: 39.88645, lon: -83.44825 },
  london_ky: { name: 'London', admin1: 'Kentucky', country: 'United States', lat: 37.12898, lon: -84.08326 },
  london_ar: { name: 'London', admin1: 'Arkansas', country: 'United States', lat: 35.32897, lon: -93.25296 },
  paris: { name: 'Paris', admin1: 'Île-de-France', country: 'France', lat: 48.8566, lon: 2.3522 },
  berlin: { name: 'Berlin', admin1: 'Berlin', country: 'Germany', lat: 52.52437, lon: 13.41053 },
  sydney: { name: 'Sydney', admin1: 'New South Wales', country: 'Australia', lat: -33.86785, lon: 151.20732 },
  madrid: { name: 'Madrid', admin1: 'Community of Madrid', country: 'Spain', lat: 40.4165, lon: -3.7026 },
  lisbon: { name: 'Lisbon', admin1: 'Lisbon District', country: 'Portugal', lat: 38.71667, lon: -9.13333 },
  cairo: { name: 'Cairo', admin1: 'Cairo Governorate', country: 'Egypt', lat: 30.0601, lon: 31.2466 },
  honolulu: { name: 'Honolulu', admin1: 'Hawaii', country: 'United States', lat: 21.30694, lon: -157.85834 },
  tokyo: { name: 'Tokyo', admin1: 'Tokyo', country: 'Japan', lat: 35.6895, lon: 139.69171 },
  flatbay: { name: 'Flatbay', admin1: 'Nowhere', country: 'Land', lat: 54.0, lon: -5.0 },
  pointArena: { name: 'Point Arena', admin1: 'California', country: 'United States', lat: 39.0, lon: -123.0 },
};

const CITIES = {
  london_gb: { lat: 51.50853, lon: -0.12574, current: { temperature_2m: 21.4, relative_humidity_2m: 64, weather_code: 3, wind_speed_10m: 8.6 }, daily: { weather_code: [3, 3, 3, 51, 53], temperature_2m_max: [22.4, 24.4, 18.9, 22.9, 20.0], temperature_2m_min: [13.4, 15.2, 13.5, 15.3, 13.7] } },
  london_ca: { lat: 42.98339, lon: -81.23304, current: { temperature_2m: 9.2, relative_humidity_2m: 71, weather_code: 61, wind_speed_10m: 14.3 }, daily: { weather_code: [61, 3, 0, 0, 51], temperature_2m_max: [12.1, 15.6, 18.2, 17.4, 11.8], temperature_2m_min: [4.3, 7.9, 9.5, 8.1, 5.6] } },
  london_oh: { lat: 39.88645, lon: -83.44825, current: { temperature_2m: 16.5, relative_humidity_2m: 88, weather_code: 53, wind_speed_10m: 3.2 }, daily: { weather_code: [53, 61, 1, 0, 3], temperature_2m_max: [17.8, 20.4, 24.1, 26.5, 19.2], temperature_2m_min: [10.6, 12.4, 13.8, 14.2, 11.0] } },
  london_ky: { lat: 37.12898, lon: -84.08326, current: { temperature_2m: 19.8, relative_humidity_2m: 52, weather_code: 2, wind_speed_10m: 24.6 }, daily: { weather_code: [2, 1, 0, 51, 3], temperature_2m_max: [21.3, 23.7, 25.0, 18.6, 17.4], temperature_2m_min: [11.8, 13.2, 15.4, 12.6, 10.1] } },
  london_ar: { lat: 35.32897, lon: -93.25296, current: { temperature_2m: 25.1, relative_humidity_2m: 33, weather_code: 1, wind_speed_10m: 12.9 }, daily: { weather_code: [1, 0, 0, 2, 45], temperature_2m_max: [27.4, 29.8, 31.2, 28.5, 26.3], temperature_2m_min: [14.6, 16.8, 18.9, 17.5, 15.2] } },
  paris: { lat: 48.8566, lon: 2.3522, current: { temperature_2m: 27.9, relative_humidity_2m: 41, weather_code: 0, wind_speed_10m: 11.5 }, daily: { weather_code: [0, 0, 1, 2, 3], temperature_2m_max: [28.6, 29.1, 26.3, 24.0, 22.7], temperature_2m_min: [15.2, 16.8, 17.4, 15.9, 14.3] } },
  berlin: { lat: 52.52437, lon: 13.41053, current: { temperature_2m: 18.3, relative_humidity_2m: 55, weather_code: 2, wind_speed_10m: 6.4 }, daily: { weather_code: [2, 3, 45, 51, 0], temperature_2m_max: [19.5, 17.2, 16.0, 18.4, 21.0], temperature_2m_min: [9.8, 10.4, 11.2, 9.1, 12.3] } },
  sydney: { lat: -33.86785, lon: 151.20732, current: { temperature_2m: 13.7, relative_humidity_2m: 78, weather_code: 45, wind_speed_10m: 19.2 }, daily: { weather_code: [45, 48, 3, 53, 1], temperature_2m_max: [15.4, 16.9, 18.1, 17.0, 14.2], temperature_2m_min: [8.6, 10.2, 11.7, 12.4, 9.9] } },
  madrid: { lat: 40.4165, lon: -3.7026, current: { temperature_2m: 31.2, relative_humidity_2m: 27, weather_code: 0, wind_speed_10m: 15.7 }, daily: { weather_code: [0, 1, 0, 2, 3], temperature_2m_max: [33.5, 31.8, 30.2, 27.9, 26.4], temperature_2m_min: [18.6, 17.9, 16.5, 15.8, 16.2] } },
  lisbon: { lat: 38.71667, lon: -9.13333, current: { temperature_2m: 24.6, relative_humidity_2m: 62, weather_code: 1, wind_speed_10m: 21.4 }, daily: { weather_code: [1, 2, 45, 53, 61], temperature_2m_max: [25.8, 24.3, 23.1, 22.6, 21.9], temperature_2m_min: [17.4, 18.1, 17.6, 18.9, 16.4] } },
  honolulu: { lat: 21.30694, lon: -157.85834, current: { temperature_2m: 27.2, relative_humidity_2m: 74, weather_code: 3, wind_speed_10m: 16.4 }, daily: { weather_code: [3, 3, 2, 51, 1], temperature_2m_max: [28.4, 28.9, 29.4, 27.6, 28.1], temperature_2m_min: [22.4, 23.1, 22.6, 21.9, 22.2] } },
  tokyo: { lat: 35.6895, lon: 139.69171, current: { temperature_2m: 18.4, relative_humidity_2m: 82, weather_code: 63, wind_speed_10m: 13.2 }, daily: { weather_code: [63, 61, 3, 2, 0], temperature_2m_max: [19.2, 20.4, 22.1, 23.6, 24.8], temperature_2m_min: [14.1, 14.9, 15.2, 14.4, 13.6] } },
  cascais: { lat: 38.7, lon: -9.423, current: { temperature_2m: 24.6, relative_humidity_2m: 58, weather_code: 1, wind_speed_10m: 16.4 }, daily: { weather_code: [1, 2, 0, 1, 3], temperature_2m_max: [25.8, 24.3, 26.1, 23.6, 22.4], temperature_2m_min: [17.4, 18.1, 17.6, 18.9, 16.4] } },
  newquay: { lat: 50.414, lon: -5.061, current: { temperature_2m: 14.2, relative_humidity_2m: 81, weather_code: 63, wind_speed_10m: 42.6 }, daily: { weather_code: [63, 80, 3, 2, 61], temperature_2m_max: [15.8, 16.3, 17.1, 18.0, 15.2], temperature_2m_min: [11.4, 12.1, 12.4, 13.8, 11.9] } },
  pointArena: { lat: 39.0, lon: -123.0, current: { temperature_2m: 17.4, relative_humidity_2m: 84, weather_code: 51, wind_speed_10m: 26.2 }, daily: { weather_code: [51, 45, 2, 1, 0], temperature_2m_max: [20.4, 21.1, 19.6, 18.9, 20.2], temperature_2m_min: [14.1, 14.8, 13.6, 12.9, 13.7] } },
  flatbay: { lat: 54.0, lon: -5.0, current: { temperature_2m: 11.2, relative_humidity_2m: 93, weather_code: 45, wind_speed_10m: 9.4 }, daily: { weather_code: [45, 3, 2, 51, 1], temperature_2m_max: [13.4, 14.9, 16.1, 15.0, 12.2], temperature_2m_min: [8.6, 9.2, 10.7, 11.4, 7.9] } },
  cairo: { lat: 30.0601, lon: 31.2466, current: { temperature_2m: 36.8, relative_humidity_2m: 19, weather_code: 0, wind_speed_10m: 7.8 }, daily: { weather_code: [0, 0, 0, 1, 2], temperature_2m_max: [38.4, 39.1, 37.6, 36.2, 35.0], temperature_2m_min: [24.7, 25.3, 24.1, 23.6, 22.9] } },
};


const WEIGHTS = [0.10, 0.06, 0.03, 0.01, 0.00, 0.02, 0.08, 0.18, 0.32, 0.47, 0.62, 0.77, 0.88, 0.96, 1.00, 0.97, 0.88, 0.74, 0.59, 0.45, 0.33, 0.24, 0.17, 0.13];
const PRECIP = { 0: 0, 1: 5, 2: 10, 3: 20, 45: 30, 48: 35, 51: 45, 53: 55, 55: 65, 56: 60, 57: 70, 61: 60, 63: 70, 65: 80, 66: 70, 67: 85, 71: 60, 73: 70, 75: 80, 77: 60, 80: 55, 81: 65, 82: 85, 85: 70, 86: 80, 95: 85, 96: 90, 99: 95 };
const DATES = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];

/* --------------------------------------------------------------------------
 * Marine stub, mirroring checks/fixtures.ts: coastal keys carry sea data plus a
 * semi-diurnal hourly sea level; every other location answers 200 with nulls,
 * like a real inland point. `wavesOf` lets a caller drive calm/choppy/stormy.
 * -------------------------------------------------------------------------- */
const MARINE = {
  cascais: { current: { wave_height: 0.6, wave_direction: 285, wave_period: 9.4, swell_wave_height: 0.5, swell_wave_direction: 290, swell_wave_period: 11.2, sea_surface_temperature: 20.6 }, tide: { amplitude: 1.33, highAt: 13.3, skew: 0.12 } },
  newquay: { current: { wave_height: 3.4, wave_direction: 265, wave_period: 13.6, swell_wave_height: 3.1, swell_wave_direction: 240, swell_wave_period: 14.1, sea_surface_temperature: 15.3 }, tide: { amplitude: 2.62, highAt: 10.4, skew: 0.2 } },
  lisbon: { current: { wave_height: 1.2, wave_direction: 300, wave_period: 11.6, swell_wave_height: 1.1, swell_wave_direction: 315, swell_wave_period: 12.3, sea_surface_temperature: 19.4 }, tide: { amplitude: 1.2, highAt: 3.7, skew: 0.1 } },
  sydney: { current: { wave_height: 1.8, wave_direction: 150, wave_period: 10.2, swell_wave_height: 1.6, swell_wave_direction: 135, swell_wave_period: 11.0, sea_surface_temperature: 18.1 }, tide: { amplitude: 0.8, highAt: 5.1, skew: 0.08 } },
  honolulu: { current: { wave_height: 0.9, wave_direction: 62, wave_period: 12.8, swell_wave_height: 0.8, swell_wave_direction: 68, swell_wave_period: 15.2, sea_surface_temperature: 26.4 }, tide: { amplitude: 0.66, highAt: 8.2, skew: 0.05 } },
  /* The worst case the fixtures never produce: four tide turns *and* both verdict
     reasons holding every factor at once (Fair/Fair naming waves, wind, rain, cloud,
     cool, and waves, wind, tide). Honolulu hit this live and pushed the tide chart
     33px below the phone fold, so the fold budget is now asserted against it. */
  pointArena: { current: { wave_height: 1.9, wave_direction: 250, wave_period: 12.0, swell_wave_height: 2.0, swell_wave_direction: 255, swell_wave_period: 13.0, sea_surface_temperature: 17.0 }, tide: { amplitude: 1.2, highAt: 3.7, skew: 0.1 } },
  // a flat sea: no turns at all, an edge case the live API really does produce
  flatbay: { current: { wave_height: 0.2, wave_direction: 20, wave_period: 3.1, swell_wave_height: 0.2, swell_wave_direction: 25, swell_wave_period: 4.0, sea_surface_temperature: 9.2 }, tide: { amplitude: 0.0, highAt: 0, skew: 0 } },
};
const MARINE_CURRENT = ['wave_height', 'wave_direction', 'wave_period', 'swell_wave_height', 'swell_wave_direction', 'swell_wave_period', 'sea_surface_temperature', 'sea_level_height_msl'];
const MARINE_HOURLY = ['wave_height', 'sea_level_height_msl'];
const TIDE_PERIOD_H = 12.42;
const HOUR_WEIGHTS = WEIGHTS;

const seaLevelSeries = (key) => {
  const { amplitude, highAt, skew } = MARINE[key].tide;
  return Array.from({ length: 120 }, (_, h) => {
    const x = (2 * Math.PI * (h - highAt)) / TIDE_PERIOD_H;
    return Math.round((amplitude * Math.cos(x) + skew * Math.cos(x / 2)) * 100) / 100;
  });
};

function marineJson(lat, lon, key, params) {
  const coastal = key !== undefined && key in MARINE;
  const wanted = (n) => (params.get(n) || '').split(',').map((s) => s.trim()).filter(Boolean);
  const level = coastal ? seaLevelSeries(key) : null;
  const nowIndex = 12;
  const currentAll = coastal
    ? { ...MARINE[key].current, sea_level_height_msl: level[nowIndex] }
    : Object.fromEntries(MARINE_CURRENT.map((k) => [k, null]));
  const time = DATES.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`));
  const hourlyAll = {
    wave_height: time.map((_, h) => (coastal ? Math.round(MARINE[key].current.wave_height * (0.85 + 0.3 * HOUR_WEIGHTS[h % 24]) * 100) / 100 : null)),
    sea_level_height_msl: coastal ? level : time.map(() => null),
  };
  const current = { time: '2026-09-24T12:00', interval: 900 };
  const current_units = { time: 'iso8601', interval: 'seconds' };
  for (const k of wanted('current')) {
    if (!MARINE_CURRENT.includes(k)) continue;
    current[k] = currentAll[k];
    current_units[k] = k.includes('direction') ? '°' : k.includes('period') ? 's' : k === 'sea_surface_temperature' ? '°C' : 'm';
  }
  const hourly = { time };
  const hourly_units = { time: 'iso8601' };
  for (const k of wanted('hourly')) {
    if (!MARINE_HOURLY.includes(k)) continue;
    hourly[k] = hourlyAll[k];
    hourly_units[k] = 'm';
  }
  return { latitude: lat, longitude: lon, generationtime_ms: 0.1, utc_offset_seconds: 0, timezone: 'GMT', timezone_abbreviation: 'GMT', elevation: 0, current_units, current, hourly_units, hourly };
}

const COASTAL_MATCHES = {
  cascais: { name: 'Cascais', admin1: 'Lisbon District', country: 'Portugal', lat: 38.7, lon: -9.423 },
  newquay: { name: 'Newquay', admin1: 'England', country: 'United Kingdom', lat: 50.414, lon: -5.061 },
  flatbay: { name: 'Flatbay', admin1: 'Nowhere', country: 'Land', lat: 54.0, lon: -5.0 },
  pointArena: { name: 'Point Arena', admin1: 'California', country: 'United States', lat: 39.0, lon: -123.0 },
};

const fullLabel = (key) => {
  const m = MATCHES[key];
  return `${m.name}, ${m.admin1}, ${m.country}`;
};

/**
 * Intercept both Open-Meteo hosts.
 * opts.search: query(lower) -> keys; opts.failing: keys always 500;
 * opts.failingOnce: keys 500 the first time; opts.delay: forecast latency ms.
 */
async function installStub(page, opts = {}) {
  const search = opts.search || {};
  const failing = opts.failing || [];
  const failingOnce = new Set(opts.failingOnce || []);
  const done = new Set();
  const delay = opts.delay || 0;
  /* opts.city: { key, currentCode, isDay, dailyCodes } -> rewrite one fixture
     city's weather so a caller can drive every WMO code through the real render
     path instead of patching the DOM afterwards. */
  const patch = opts.city || null;

  const lookup = (query) => {
    const keys = Object.keys(search);
    const exact = keys.find((k) => k.toLowerCase() === query);
    if (exact) return search[exact];
    const head = query.split(',')[0].trim();
    const byHead = keys.find((k) => k.toLowerCase() === head);
    return byHead ? search[byHead] : [];
  };

  await page.route(/^https?:\/\/geocoding-api\.open-meteo\.com\//, (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get('name') || '').trim().toLowerCase();
    const keys = lookup(q);
    const body = keys.length
      ? { results: keys.map((k) => ({ id: 1, name: MATCHES[k].name, latitude: MATCHES[k].lat, longitude: MATCHES[k].lon, admin1: MATCHES[k].admin1, country: MATCHES[k].country })) }
      : {};
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  const failingMarine = opts.failingMarine || [];
  await page.route(/^https?:\/\/marine-api\.open-meteo\.com\//, (route) => {
    const url = new URL(route.request().url());
    const lat = Number(url.searchParams.get('latitude'));
    const lon = Number(url.searchParams.get('longitude'));
    const near = (k) => Math.abs(k.lat - lat) < 0.01 && Math.abs(k.lon - lon) < 0.01;
    const key =
      Object.keys(COASTAL_MATCHES).find((k) => near(COASTAL_MATCHES[k])) ||
      Object.keys(CITIES).find((k) => near(CITIES[k]));
    if (!key) return route.fulfill({ status: 400, contentType: 'application/json', body: '{}' });
    /* opts.inland: answer like an inland point (200 + nulls) whatever the key,
       so a coastal fixture city can be read as the weather app. */
    if (opts.inland && key in MARINE) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(marineJson(lat, lon, undefined, url.searchParams)),
      });
    }
    if (failingMarine.includes(key)) return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(marineJson(lat, lon, key, url.searchParams)) });
  });

  await page.route(/^https?:\/\/api\.open-meteo\.com\//, async (route) => {
    const url = new URL(route.request().url());
    const lat = Number(url.searchParams.get('latitude'));
    const lon = Number(url.searchParams.get('longitude'));
    const key = Object.keys(CITIES).find((k) => Math.abs(CITIES[k].lat - lat) < 0.01 && Math.abs(CITIES[k].lon - lon) < 0.01);
    if (!key) return route.fulfill({ status: 400, contentType: 'application/json', body: '{}' });
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (failing.includes(key)) return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    if (failingOnce.has(key) && !done.has(key)) {
      done.add(key);
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    }
    const base = CITIES[key];
    const city =
      patch && patch.key === key
        ? {
            ...base,
            current: {
              ...base.current,
              weather_code: patch.currentCode ?? base.current.weather_code,
            },
            daily: {
              ...base.daily,
              weather_code: patch.dailyCodes || base.daily.weather_code,
              temperature_2m_max: patch.highs || base.daily.temperature_2m_max,
              temperature_2m_min: patch.lows || base.daily.temperature_2m_min,
            },
          }
        : base;
    const isDayFlag = patch && patch.key === key ? patch.isDay ?? 1 : 1;
    const time = [], temperature_2m = [], weather_code = [], is_day = [], precipitation_probability = [];
    DATES.forEach((d, di) => {
      const min = city.daily.temperature_2m_min[di];
      const max = city.daily.temperature_2m_max[di];
      const pmax = PRECIP[city.daily.weather_code[di]] ?? 0;
      for (let h = 0; h < 24; h++) {
        time.push(`${d}T${String(h).padStart(2, '0')}:00`);
        temperature_2m.push(Math.round(min + (max - min) * WEIGHTS[h]));
        weather_code.push(di === 0 ? city.current.weather_code : city.daily.weather_code[di]);
        is_day.push(isDayFlag === 0 ? 0 : h >= 7 && h <= 19 ? 1 : 0);
        precipitation_probability.push(Math.round(pmax * (0.4 + 0.6 * WEIGHTS[h])));
      }
    });
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        timezone: 'GMT',
        current: { time: '2026-09-24T12:00', ...city.current, apparent_temperature: Math.round(city.current.temperature_2m) - 1, is_day: isDayFlag },
        hourly: { time, temperature_2m, weather_code, is_day, precipitation_probability },
        daily: {
          time: DATES,
          weather_code: city.daily.weather_code,
          temperature_2m_max: city.daily.temperature_2m_max,
          temperature_2m_min: city.daily.temperature_2m_min,
          precipitation_probability_max: city.daily.weather_code.map((c) => PRECIP[c] ?? 0),
          sunrise: DATES.map((d) => `${d}T07:12`),
          sunset: DATES.map((d) => `${d}T19:26`),
        },
      }),
    });
  });
}

const typeCity = async (page, term) => {
  await page.getByLabel('City', { exact: true }).fill(term);
  await page.getByLabel('City', { exact: true }).press('Enter');
};

const isDark = (page) =>
  page.evaluate(() => {
    const m = getComputedStyle(document.documentElement).backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    const lin = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]) < 0.4;
  });

async function setTheme(page, theme) {
  if ((await isDark(page)) === (theme === 'dark')) return;
  await page.getByRole('button', { name: 'Theme', exact: true }).click();
  await page.waitForTimeout(260);
}

const SEARCH_LONDON = ['london_gb', 'london_ca', 'london_oh', 'london_ky', 'london_ar'];
Object.assign(MATCHES, COASTAL_MATCHES);
const ALL_MATCHES = MATCHES;
const searchMapFor = (keys) => {
  const map = { london: SEARCH_LONDON, atlantis: [] };
  for (const k of keys) {
    const m = ALL_MATCHES[k];
    if (!m) continue;
    map[`${m.name}, ${m.admin1}, ${m.country}`.toLowerCase()] = [k];
    map[m.name.toLowerCase()] = [k];
  }
  return map;
};

module.exports = { installStub, typeCity, setTheme, isDark, MATCHES: ALL_MATCHES, CITIES, MARINE, fullLabel, searchMapFor };
