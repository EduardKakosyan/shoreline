import type { Page, Route } from '@playwright/test';

export const GEO_HOST = 'geocoding-api.open-meteo.com';
export const WX_HOST = 'api.open-meteo.com';

export const DAY_DATES = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
export const WEEKDAYS = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
export const CURRENT_TIME = '2026-09-24T12:00';
export const SUNRISE_TEXT = '07:12';
export const SUNSET_TEXT = '19:26';
export const VIEWPORT = { width: 390, height: 844 };

export interface Match {
  name: string;
  admin1: string;
  country: string;
  lat: number;
  lon: number;
}

export interface CityFixture {
  lat: number;
  lon: number;
  current: { temperature_2m: number; relative_humidity_2m: number; weather_code: number; wind_speed_10m: number };
  daily: { weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
}

export const MATCHES: Record<string, Match> = {
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

export const CITIES: Record<string, CityFixture> = {
  london_gb: {
    lat: 51.50853, lon: -0.12574,
    current: { temperature_2m: 21.4, relative_humidity_2m: 64, weather_code: 3, wind_speed_10m: 8.6 },
    daily: {
      weather_code: [3, 3, 3, 51, 53],
      temperature_2m_max: [22.4, 24.4, 18.9, 22.9, 20.0],
      temperature_2m_min: [13.4, 15.2, 13.5, 15.3, 13.7],
    },
  },
  london_ca: {
    lat: 42.98339, lon: -81.23304,
    current: { temperature_2m: 9.2, relative_humidity_2m: 71, weather_code: 61, wind_speed_10m: 14.3 },
    daily: {
      weather_code: [61, 3, 0, 0, 51],
      temperature_2m_max: [12.1, 15.6, 18.2, 17.4, 11.8],
      temperature_2m_min: [4.3, 7.9, 9.5, 8.1, 5.6],
    },
  },
  london_oh: {
    lat: 39.88645, lon: -83.44825,
    current: { temperature_2m: 16.5, relative_humidity_2m: 88, weather_code: 53, wind_speed_10m: 3.2 },
    daily: {
      weather_code: [53, 61, 1, 0, 3],
      temperature_2m_max: [17.8, 20.4, 24.1, 26.5, 19.2],
      temperature_2m_min: [10.6, 12.4, 13.8, 14.2, 11.0],
    },
  },
  london_ky: {
    lat: 37.12898, lon: -84.08326,
    current: { temperature_2m: 19.8, relative_humidity_2m: 52, weather_code: 2, wind_speed_10m: 24.6 },
    daily: {
      weather_code: [2, 1, 0, 51, 3],
      temperature_2m_max: [21.3, 23.7, 25.0, 18.6, 17.4],
      temperature_2m_min: [11.8, 13.2, 15.4, 12.6, 10.1],
    },
  },
  london_ar: {
    lat: 35.32897, lon: -93.25296,
    current: { temperature_2m: 25.1, relative_humidity_2m: 33, weather_code: 1, wind_speed_10m: 12.9 },
    daily: {
      weather_code: [1, 0, 0, 2, 45],
      temperature_2m_max: [27.4, 29.8, 31.2, 28.5, 26.3],
      temperature_2m_min: [14.6, 16.8, 18.9, 17.5, 15.2],
    },
  },
  paris: {
    lat: 48.8566, lon: 2.3522,
    current: { temperature_2m: 27.9, relative_humidity_2m: 41, weather_code: 0, wind_speed_10m: 11.5 },
    daily: {
      weather_code: [0, 0, 1, 2, 3],
      temperature_2m_max: [28.6, 29.1, 26.3, 24.0, 22.7],
      temperature_2m_min: [15.2, 16.8, 17.4, 15.9, 14.3],
    },
  },
  berlin: {
    lat: 52.52437, lon: 13.41053,
    current: { temperature_2m: 18.3, relative_humidity_2m: 55, weather_code: 2, wind_speed_10m: 6.4 },
    daily: {
      weather_code: [2, 3, 45, 51, 0],
      temperature_2m_max: [19.5, 17.2, 16.0, 18.4, 21.0],
      temperature_2m_min: [9.8, 10.4, 11.2, 9.1, 12.3],
    },
  },
  sydney: {
    lat: -33.86785, lon: 151.20732,
    current: { temperature_2m: 13.7, relative_humidity_2m: 78, weather_code: 45, wind_speed_10m: 19.2 },
    daily: {
      weather_code: [45, 48, 3, 53, 1],
      temperature_2m_max: [15.4, 16.9, 18.1, 17.0, 14.2],
      temperature_2m_min: [8.6, 10.2, 11.7, 12.4, 9.9],
    },
  },
  madrid: {
    lat: 40.4165, lon: -3.7026,
    current: { temperature_2m: 31.2, relative_humidity_2m: 27, weather_code: 0, wind_speed_10m: 15.7 },
    daily: {
      weather_code: [0, 1, 0, 2, 3],
      temperature_2m_max: [33.5, 31.8, 30.2, 27.9, 26.4],
      temperature_2m_min: [18.6, 17.9, 16.5, 15.8, 16.2],
    },
  },
  lisbon: {
    lat: 38.71667, lon: -9.13333,
    current: { temperature_2m: 24.6, relative_humidity_2m: 62, weather_code: 1, wind_speed_10m: 21.4 },
    daily: {
      weather_code: [1, 2, 45, 53, 61],
      temperature_2m_max: [25.8, 24.3, 23.1, 22.6, 21.9],
      temperature_2m_min: [17.4, 18.1, 17.6, 18.9, 16.4],
    },
  },
  cairo: {
    lat: 30.0601, lon: 31.2466,
    current: { temperature_2m: 36.8, relative_humidity_2m: 19, weather_code: 0, wind_speed_10m: 7.8 },
    daily: {
      weather_code: [0, 0, 0, 1, 2],
      temperature_2m_max: [38.4, 39.1, 37.6, 36.2, 35.0],
      temperature_2m_min: [24.7, 25.3, 24.1, 23.6, 22.9],
    },
  },
};

const GEO_PATH = '/v1/search';
const WX_PATH = '/v1/forecast';

/** Deterministic day-part weights used to synthesise the hourly series. */
const HOUR_WEIGHTS = [0.10, 0.06, 0.03, 0.01, 0.00, 0.02, 0.08, 0.18, 0.32, 0.47, 0.62, 0.77,
  0.88, 0.96, 1.00, 0.97, 0.88, 0.74, 0.59, 0.45, 0.33, 0.24, 0.17, 0.13];

/** Deterministic WMO code -> precipitation probability (hourly and daily max). */
const PRECIP_BY_CODE: Record<number, number> = {
  0: 0, 1: 5, 2: 10, 3: 20, 45: 30, 48: 35, 51: 45, 53: 55, 55: 65, 56: 60, 57: 70,
  61: 60, 63: 70, 65: 80, 66: 70, 67: 85, 71: 60, 73: 70, 75: 80, 77: 60, 80: 55,
  81: 65, 82: 85, 85: 70, 86: 80, 95: 85, 96: 90, 99: 95,
};

const pad = (n: number) => String(n).padStart(2, '0');

export const precipMax = (code: number) => PRECIP_BY_CODE[code] ?? 0;

/** Integer hourly series (5 days x 24 h) derived deterministically from daily min/max. */
export function hourlySeries(c: CityFixture) {
  const temperature_2m: number[] = [];
  const weather_code: number[] = [];
  const is_day: number[] = [];
  const precipitation_probability: number[] = [];
  DAY_DATES.forEach((date, di) => {
    const min = c.daily.temperature_2m_min[di];
    const max = c.daily.temperature_2m_max[di];
    const pmax = precipMax(c.daily.weather_code[di]);
    for (let h = 0; h < 24; h++) {
      temperature_2m.push(Math.round(min + (max - min) * HOUR_WEIGHTS[h]));
      weather_code.push(di === 0 ? c.current.weather_code : c.daily.weather_code[di]);
      is_day.push(h >= 7 && h <= 19 ? 1 : 0);
      precipitation_probability.push(Math.round(pmax * (0.4 + 0.6 * HOUR_WEIGHTS[h])));
    }
  });
  const time = DAY_DATES.flatMap((date) => Array.from({ length: 24 }, (_, h) => `${date}T${pad(h)}:00`));
  return { time, temperature_2m, weather_code, is_day, precipitation_probability };
}

/** Integer Celsius apparent temperature, so unit conversion has no rounding ambiguity. */
export const apparentTempC = (c: CityFixture) => Math.round(c.current.temperature_2m) - 1;

/** The 24 hourly slots the hourly strip must show: CURRENT_TIME .. CURRENT_TIME + 23h. */
export function expectedHourWindow(key: string) {
  const series = hourlySeries(CITIES[key]);
  const start = series.time.indexOf(CURRENT_TIME);
  return Array.from({ length: 24 }, (_, i) => {
    const time = series.time[start + i];
    const tempC = series.temperature_2m[start + i];
    return { label: time.slice(11), tempC: `${tempC}°`, tempF: `${Math.round(tempC * 9 / 5 + 32)}°` };
  });
}

function matchObject(m: Match) {
  return {
    id: Math.round(Math.abs(m.lat) * 100000),
    name: m.name,
    latitude: m.lat,
    longitude: m.lon,
    country_code: '',
    admin1: m.admin1,
    country: m.country,
  };
}

function weatherJson(c: CityFixture) {
  const hourly = hourlySeries(c);
  const dailyCodes = c.daily.weather_code;
  return {
    latitude: c.lat,
    longitude: c.lon,
    timezone: 'GMT',
    utc_offset_seconds: 0,
    timezone_abbreviation: 'GMT',
    elevation: 0,
    current_units: {
      time: 'iso8601', interval: 'seconds', temperature_2m: '°C', apparent_temperature: '°C',
      relative_humidity_2m: '%', weather_code: 'wmo code', wind_speed_10m: 'km/h', is_day: '',
    },
    current: {
      time: CURRENT_TIME, interval: 900, ...c.current,
      apparent_temperature: apparentTempC(c), is_day: 1,
    },
    hourly_units: {
      time: 'iso8601', temperature_2m: '°C', weather_code: 'wmo code', is_day: '',
      precipitation_probability: '%',
    },
    hourly: {
      time: hourly.time,
      temperature_2m: hourly.temperature_2m,
      weather_code: hourly.weather_code,
      is_day: hourly.is_day,
      precipitation_probability: hourly.precipitation_probability,
    },
    daily_units: {
      time: 'iso8601', weather_code: 'wmo code', temperature_2m_max: '°C', temperature_2m_min: '°C',
      precipitation_probability_max: '%', sunrise: 'iso8601', sunset: 'iso8601',
    },
    daily: {
      time: DAY_DATES,
      weather_code: dailyCodes,
      temperature_2m_max: c.daily.temperature_2m_max,
      temperature_2m_min: c.daily.temperature_2m_min,
      precipitation_probability_max: dailyCodes.map(precipMax),
      sunrise: DAY_DATES.map((d) => `${d}T${SUNRISE_TEXT}`),
      sunset: DAY_DATES.map((d) => `${d}T${SUNSET_TEXT}`),
    },
    generationtime_ms: 0.1,
  };
}

function fulfil(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export interface FixtureOptions {
  search?: Record<string, string[]>;
  /** Keys whose forecast request always answers HTTP 500. */
  failingForecasts?: string[];
  /** Keys whose FIRST forecast request answers 500 and later ones succeed - exercises "Try again". */
  failingOnce?: string[];
  /** Delay in ms before the forecast is fulfilled - exercises loading skeletons. */
  forecastDelayMs?: number;
}

/**
 * Intercept both Open-Meteo hosts with fixed fixture JSON, so no check depends on live weather.
 *  - search: maps a lower-cased query to fixture match keys; an empty array means "no results".
 *    A query missing from the map also answers with no results. A query that carries a trailing
 *    region/country ("Cairo, Cairo Governorate, Egypt") is also matched on its first segment.
 *  - forecast: lists fixture keys whose forecast request must fail with HTTP 500.
 */
export async function installOpenMeteoFixtures(page: Page, opts: FixtureOptions = {}) {
  const searchMap = opts.search ?? {};
  const failing = opts.failingForecasts ?? [];
  const failingOnce = new Set(opts.failingOnce ?? []);
  const failedOnceAlready = new Set<string>();
  const delay = opts.forecastDelayMs ?? 0;
  const keyFor = (lat: number, lon: number) =>
    Object.keys(CITIES).find(
      (k) => Math.abs(CITIES[k].lat - lat) < 0.01 && Math.abs(CITIES[k].lon - lon) < 0.01,
    );
  const lookup = (query: string) => {
    const entries = Object.keys(searchMap);
    const exact = entries.find((k) => k.toLowerCase() === query);
    if (exact) return searchMap[exact];
    const head = query.split(',')[0].trim();
    const byHead = entries.find((k) => k.toLowerCase() === head);
    return byHead ? searchMap[byHead] : [];
  };

  await page.route(new RegExp(`^https?://${GEO_HOST}/`), (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== GEO_PATH) return fulfil(route, 404, { error: 'unexpected path' });
    const query = (url.searchParams.get('name') ?? '').trim().toLowerCase();
    const keys = lookup(query);
    const body = keys.length
      ? { results: keys.map((k) => matchObject(MATCHES[k])), generationtime_ms: 0.1 }
      : { generationtime_ms: 0.1 };
    return fulfil(route, 200, body);
  });

  await page.route(new RegExp(`^https?://${WX_HOST}/`), async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== WX_PATH) return fulfil(route, 404, { error: 'unexpected path' });
    const lat = Number(url.searchParams.get('latitude'));
    const lon = Number(url.searchParams.get('longitude'));
    const key = keyFor(lat, lon);
    if (!key) return fulfil(route, 400, { error: 'no fixture for this location' });
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (failing.includes(key)) return fulfil(route, 500, { error: 'forecast service unavailable' });
    if (failingOnce.has(key) && !failedOnceAlready.has(key)) {
      failedOnceAlready.add(key);
      return fulfil(route, 500, { error: 'forecast service unavailable' });
    }
    return fulfil(route, 200, weatherJson(CITIES[key]));
  });
}

/** "City, Region, Country" label as the app must render it. */
export const fullLabel = (key: string) => {
  const m = MATCHES[key];
  return `${m.name}, ${m.admin1}, ${m.country}`;
};

/* --------------------------------------------------------------------------
 * Helpers shared by the visual / state checks
 * -------------------------------------------------------------------------- */

export async function typeCity(page: Page, term: string) {
  const city = page.getByLabel('City', { exact: true });
  await city.fill(term);
  await city.press('Enter');
}

export const KEY6 = ['cairo', 'berlin', 'madrid', 'sydney', 'lisbon', 'paris'];

/** Search map that resolves the given cities by their full "City, Region, Country" labels. */
export function searchMapForKeys(keys: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const k of keys) {
    map[fullLabel(k).toLowerCase()] = [k];
    map[MATCHES[k].name.toLowerCase()] = [k];
  }
  return map;
}



/** True when the page background (html, else body) is dark. */
export async function isDarkBackground(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const parse = (v: string) => {
      const m = v.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (p.length < 3) return null;
      return { rgb: [p[0], p[1], p[2]] as [number, number, number], a: p.length > 3 ? p[3] : 1 };
    };
    const lin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));
    const lum = (rgb: [number, number, number]) =>
      0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    const html = parse(getComputedStyle(document.documentElement).backgroundColor);
    const body = parse(getComputedStyle(document.body).backgroundColor);
    const chosen = html && html.a >= 0.95 ? html : body && body.a >= 0.95 ? body : null;
    return chosen ? lum(chosen.rgb) < 0.4 : false;
  });
}

/** Click the "Theme" toggle until the page background is dark / light. */
export async function setTheme(page: Page, theme: 'light' | 'dark') {
  const toggle = page.getByRole('button', { name: 'Theme', exact: true });
  await toggle.waitFor({ state: 'visible', timeout: 10_000 });
  if ((await isDarkBackground(page)) === (theme === 'dark')) return;
  await toggle.click();
  await page.waitForTimeout(300);
  if ((await isDarkBackground(page)) !== (theme === 'dark')) {
    throw new Error(`the "Theme" toggle did not switch the page background to ${theme}`);
  }
}

export type UIState = 'empty' | 'results' | 'picker' | 'notice' | 'error';
export type Theme = 'light' | 'dark';

/**
 * Put the app into one of its five visual states, in the given theme, with the
 * unit toggle at Celsius. The theme is set through the app's own "Theme" toggle
 * (no colorScheme emulation), so every visual check runs in both app themes.
 * Uses the app's own storage keys, so the state is exactly what a user sees.
 */
export async function openState(
  page: Page,
  state: UIState,
  theme: Theme,
  opts: { failingOnce?: string[]; forecastDelayMs?: number } = {},
) {
  await installOpenMeteoFixtures(page, {
    search: {
      london: ['london_gb', 'london_ca', 'london_oh', 'london_ky', 'london_ar'],
      atlantis: [],
      ...searchMapForKeys(KEY6),
    },
    failingForecasts: state === 'error' ? ['london_ky'] : undefined,
    failingOnce: opts.failingOnce,
    forecastDelayMs: opts.forecastDelayMs,
  });
  await page.setViewportSize(VIEWPORT);
  await page.goto('/');
  const unit = page.getByTestId('unit-toggle');
  if (/F/.test((await unit.textContent()) ?? '')) await unit.click();
  await setTheme(page, theme);
  if (state === 'empty') return;
  if (state === 'picker') {
    await typeCity(page, 'London');
    await page.getByTestId('match-option').first().waitFor({ state: 'visible', timeout: 10_000 });
    return;
  }
  if (state === 'notice') {
    await typeCity(page, 'Atlantis');
    await page.getByTestId('notice').waitFor({ state: 'visible', timeout: 10_000 });
    return;
  }
  if (state === 'error') {
    await typeCity(page, 'London');
    await page.getByTestId('match-option')
      .filter({ hasText: 'London, Kentucky, United States' })
      .click({ timeout: 10_000 });
    await page.getByTestId('error').waitFor({ state: 'visible', timeout: 15_000 });
    return;
  }
  await typeCity(page, 'Paris');
  await page.getByTestId('current-weather').waitFor({ state: 'visible', timeout: 15_000 });
}
