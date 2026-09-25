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
  cairo: { lat: 30.0601, lon: 31.2466, current: { temperature_2m: 36.8, relative_humidity_2m: 19, weather_code: 0, wind_speed_10m: 7.8 }, daily: { weather_code: [0, 0, 0, 1, 2], temperature_2m_max: [38.4, 39.1, 37.6, 36.2, 35.0], temperature_2m_min: [24.7, 25.3, 24.1, 23.6, 22.9] } },
};

const WEIGHTS = [0.10, 0.06, 0.03, 0.01, 0.00, 0.02, 0.08, 0.18, 0.32, 0.47, 0.62, 0.77, 0.88, 0.96, 1.00, 0.97, 0.88, 0.74, 0.59, 0.45, 0.33, 0.24, 0.17, 0.13];
const PRECIP = { 0: 0, 1: 5, 2: 10, 3: 20, 45: 30, 48: 35, 51: 45, 53: 55, 55: 65, 56: 60, 57: 70, 61: 60, 63: 70, 65: 80, 66: 70, 67: 85, 71: 60, 73: 70, 75: 80, 77: 60, 80: 55, 81: 65, 82: 85, 85: 70, 86: 80, 95: 85, 96: 90, 99: 95 };
const DATES = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];

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
    const city = CITIES[key];
    const time = [], temperature_2m = [], weather_code = [], is_day = [], precipitation_probability = [];
    DATES.forEach((d, di) => {
      const min = city.daily.temperature_2m_min[di];
      const max = city.daily.temperature_2m_max[di];
      const pmax = PRECIP[city.daily.weather_code[di]] ?? 0;
      for (let h = 0; h < 24; h++) {
        time.push(`${d}T${String(h).padStart(2, '0')}:00`);
        temperature_2m.push(Math.round(min + (max - min) * WEIGHTS[h]));
        weather_code.push(di === 0 ? city.current.weather_code : city.daily.weather_code[di]);
        is_day.push(h >= 7 && h <= 19 ? 1 : 0);
        precipitation_probability.push(Math.round(pmax * (0.4 + 0.6 * WEIGHTS[h])));
      }
    });
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        timezone: 'GMT',
        current: { time: '2026-09-24T12:00', ...city.current, apparent_temperature: Math.round(city.current.temperature_2m) - 1, is_day: 1 },
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
const searchMapFor = (keys) => {
  const map = { london: SEARCH_LONDON, atlantis: [] };
  for (const k of keys) {
    map[fullLabel(k).toLowerCase()] = [k];
    map[MATCHES[k].name.toLowerCase()] = [k];
  }
  return map;
};

module.exports = { installStub, typeCity, setTheme, isDark, MATCHES, CITIES, fullLabel, searchMapFor };
