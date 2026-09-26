/* Shoreline — static client, calls Open-Meteo directly (forecast, geocoding, marine). */
(function () {
  "use strict";

  const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const WX_URL = "https://api.open-meteo.com/v1/forecast";

  const KEYS = {
    theme: "sl.theme.v1",
    units: "sl.units.v1",
    recents: "sl.recents.v1",
  };

  const CONDITIONS = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Light rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Light snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with heavy hail",
  };

  const FAMILY = {
    clear: [0, 1],
    cloudy: [2, 3],
    fog: [45, 48],
    drizzle: [51, 53, 55, 56, 57],
    rain: [61, 63, 65, 66, 67, 80, 81, 82],
    snow: [71, 73, 75, 77, 85, 86],
    thunder: [95, 96, 99],
  };

  const RECENTS_MAX = 5;

  const HINTS = ["Cascais", "Newquay", "Honolulu", "Sydney", "Halifax", "Cape Town", "Lisbon"];

  const $ = (id) => document.getElementById(id);
  const el = {
    form: $("search-form"),
    input: $("city-input"),
    loading: document.querySelector('[data-testid="loading"]'),
    empty: document.querySelector('[data-testid="empty-state"]'),
    matchList: document.querySelector('[data-testid="match-list"]'),
    matchOptions: $("match-options"),
    notice: document.querySelector('[data-testid="notice"]'),
    noticeText: $("notice-text"),
    error: document.querySelector('[data-testid="error"]'),
    errorText: $("error-text"),
    tryAgain: $("try-again"),
    marineNote: document.querySelector('[data-testid="marine-unavailable"]'),
    water: document.querySelector('[data-testid="water"]'),
    waterBody: $("water-body"),
    current: document.querySelector('[data-testid="current-weather"]'),
    hourlySection: $("hourly-section"),
    strip: $("hour-strip"),
    forecastSection: $("forecast-section"),
    dayList: $("day-list"),
    chips: $("recent-chips"),
    clearRecents: $("clear-recents"),
    recentHint: $("recent-hint"),
    status: $("live-status"),
    shell: document.querySelector(".shell"),
  };

  /* ---------------------------------------------------------------- storage */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : raw;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {}
    },
  };

  const state = {
    units: store.get(KEYS.units, "C") === "F" ? "F" : "C",
    weather: null,
    marine: null,
    city: null,
    pending: null,
    searchToken: 0,
    seq: 0,
  };

  /* ---------------------------------------------------------------- helpers */
  const conditionText = (code) =>
    Object.prototype.hasOwnProperty.call(CONDITIONS, code) ? CONDITIONS[code] : "Unknown";

  const familyOf = (code) => {
    for (const fam of Object.keys(FAMILY)) if (FAMILY[fam].includes(code)) return fam;
    return "cloudy";
  };

  const sceneOf = (code, isDay) => {
    let fam = familyOf(code);
    if (fam === "drizzle") fam = "rain";
    return `${fam}-${isDay === 0 ? "night" : "day"}`;
  };

  const toF = (c) => (c * 9) / 5 + 32;
  const toMph = (kmh) => kmh / 1.609344;

  const temp = (celsius, withUnit) =>
    `${Math.round(state.units === "F" ? toF(celsius) : celsius)}${withUnit ? (state.units === "F" ? "°F" : "°C") : "°"}`;

  const windText = (kmh) =>
    state.units === "F"
      ? `${Math.round(toMph(kmh))} mph`
      : `${Math.round(kmh)} km/h`;

  const labelOf = (r) =>
    [r.name, r.admin1, r.country]
      .map((s) => (s == null ? "" : String(s).trim()))
      .filter(Boolean)
      .join(", ");

  const announce = (msg) => {
    el.status.textContent = msg;
  };

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );

  /* ------------------------------------------------------------------ theme */
  const themeToggle = document.querySelector('[data-testid="theme-toggle"]');

  /* Icon marks bake their accent per theme into the markup (an SVG cannot pick up a
     CSS custom property set on an ancestor in every browser), so a theme change has to
     re-render what is on screen rather than only flip the data-theme attribute. */
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    store.set(KEYS.theme, theme);
    if (state.weather) {
      renderWeather(state.weather);
      renderRecents();
    }
  }

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    announce(`${next === "dark" ? "Dark" : "Light"} theme on`);
  });

  /* ------------------------------------------------------------------ units */
  const unitToggle = document.querySelector('[data-testid="unit-toggle"]');

  function paintUnitToggle() {
    const celsius = state.units === "C";
    const foot = $("footnote-unit");
    if (foot) foot.textContent = celsius ? "shown in Celsius" : "shown in Fahrenheit";
    unitToggle.dataset.unit = state.units;
    unitToggle.querySelector(".unit-toggle__dial").innerHTML = celsius
      ? '<span class="u-c">°C</span>'
      : '<span class="u-f">°F</span>';
    unitToggle.setAttribute(
      "aria-label",
      celsius
        ? "Current unit is Celsius. Switch to Fahrenheit"
        : "Current unit is Fahrenheit. Switch to Celsius",
    );
  }

  unitToggle.addEventListener("click", () => {
    state.units = state.units === "C" ? "F" : "C";
    store.set(KEYS.units, state.units);
    paintUnitToggle();
    if (state.weather) renderWeather(state.weather);
    announce(`Units set to ${state.units === "C" ? "Celsius" : "Fahrenheit"}`);
  });

  /* ---------------------------------------------------------------- recents */
  function readRecents() {
    try {
      const list = JSON.parse(store.get(KEYS.recents, "[]"));
      if (!Array.isArray(list)) return [];
      return list
        .filter((r) => r && typeof r.label === "string" && isFinite(r.lat) && isFinite(r.lon))
        .sort((a, b) => (b.at || 0) - (a.at || 0))
        .slice(0, RECENTS_MAX);
    } catch (e) {
      return [];
    }
  }

  function writeRecents(list) {
    store.set(KEYS.recents, JSON.stringify(list.slice(0, 5)));
    renderRecents();
  }

  /* Each search takes a sequence number the moment it is submitted; an opened city
     stores that number, so the list reads newest-first even when responses resolve
     out of order and a search is superseded before it lands. The counter continues
     past anything already stored, so a reload cannot hand out a number two entries
     already occupy. */
  function nextSeq() {
    const storedAt = readRecents().reduce((max, r) => Math.max(max, Number(r.at) || 0), 0);
    state.seq = Math.max(state.seq, storedAt) + 1;
    return state.seq;
  }

  function remember(rec, seq) {
    const entry = { label: rec.label, lat: rec.lat, lon: rec.lon, at: seq || nextSeq() };
    const list = readRecents()
      .filter((r) => r.label !== entry.label)
      .concat([entry])
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, RECENTS_MAX);
    store.set(KEYS.recents, JSON.stringify(list));
    renderRecents();
  }

  function renderRecents() {
    const list = readRecents();
    el.chips.innerHTML = list
      .map(
        (r, i) =>
          `<button type="button" class="chip" data-testid="recent-chip" data-index="${i}" data-lat="${r.lat}" data-lon="${r.lon}" aria-label="Open ${esc(r.label)}">${Icons.uiIcon("pin", { size: 15, cls: "chip__pin" })}<span>${esc(r.label)}</span></button>`,
      )
      .join("");
    el.chips.dataset.labels = JSON.stringify(list.map((r) => r.label));
    el.clearRecents.hidden = list.length === 0;
    el.recentHint.hidden = list.length > 0;
  }

  el.chips.addEventListener("click", (event) => {
    const chip = event.target.closest('[data-testid="recent-chip"]');
    if (!chip) return;
    openCity(
      { label: chip.textContent.trim(), lat: Number(chip.dataset.lat), lon: Number(chip.dataset.lon) },
      nextSeq(),
    );
  });

  el.clearRecents.addEventListener("click", () => {
    writeRecents([]);
    announce("Recent searches cleared");
  });

  /* ------------------------------------------------------------- visibility */
  function setVisible(node, visible) {
    node.hidden = !visible;
  }

  function clearPanels() {
    setVisible(el.notice, false);
    setVisible(el.error, false);
    setVisible(el.marineNote, false);
    setVisible(el.matchList, false);
    el.matchOptions.innerHTML = "";
  }

  function hideResults() {
    document.body.classList.remove("is-coastal");
    setVisible(el.current, false);
    setVisible(el.hourlySection, false);
    setVisible(el.forecastSection, false);
    setVisible(el.water, false);
    el.waterBody.innerHTML = "";
    el.strip.innerHTML = "";
    el.dayList.innerHTML = "";
  }

  /* ---------------------------------------------------------------- rendering */
  function metricRow(testid, icon, value, label) {
    return `<div class="metric">
      <span class="metric__heading">${Icons.uiIcon(icon, { size: 15, cls: "metric__icon" })}<span class="metric__label">${esc(label)}</span></span>
      <span class="metric__value" data-testid="${testid}">${esc(value)}</span>
    </div>`;
  }


  /* The hero carries no decoration around its weather mark: a haze bloom, a fog
     band, a rain streak or a star painted near it all read as smudges or dashes
     rather than as weather, and a reviewer said so twice. The sky gradient, the
     mark and the condition text carry the condition between them. */
  const deepInk = (overDeep) => (overDeep ? " icon--deep" : "");
  const themeIsDark = () => document.documentElement.dataset.theme === "dark";

  function heroIcon(code, isDay, scene, size) {
    /* In the dark theme every sky reads deeper, so the mark there always takes
       the bright set; in the light theme only a night sky does. */
    const deep = themeIsDark() || scene.endsWith("night");
    return `<span class="hero__icon${deep ? " icon--deep" : ""}">${Icons.weatherIcon(code, isDay, { size })}</span>`;
  }

  /* A coastal phone shows the verdicts first, so there the sky is a band, not a slab:
     CSS (.is-coastal .hero) rearranges the same markup — the reading and the metrics
     share one row instead of stacking. One markup path means the theme/unit re-render
     can never disagree with what the width needs. */
  function renderWeather(data) {
    const city = state.city;
    const cur = data.current || {};
    const daily = data.daily || {};
    const code = Number(cur.weather_code);
    const isDay = Number(cur.is_day) === 0 ? 0 : 1;
    const scene = sceneOf(Number.isFinite(code) ? code : 3, isDay);
    const sunrise = (daily.sunrise && daily.sunrise[0]) || "";
    const sunset = (daily.sunset && daily.sunset[0]) || "";

    const metrics = [
      metricRow("humidity", "droplet", `${Math.round(Number(cur.relative_humidity_2m))}%`, "Humidity"),
      metricRow("wind", "wind", windText(Number(cur.wind_speed_10m)), "Wind"),
      metricRow("sunrise", "sunrise", String(sunrise).slice(11, 16), "Sunrise"),
      metricRow("sunset", "sunset", String(sunset).slice(11, 16), "Sunset"),
    ];

    document.body.classList.toggle("is-coastal", isCoastalView());

    el.current.innerHTML = `<div class="hero" data-scene="${scene}">
      <div class="hero__top">
        <div class="hero__place">
          <p class="hero__eyebrow">${isDay ? "Right now" : "Right now · night"}</p>
          <p class="location-name" data-testid="location-name">${esc(city.label)}</p>
        </div>
        ${heroIcon(code, isDay, scene, 70)}
      </div>
      <div class="hero__reading">
        <div class="temp-block">
          <div class="current-temperature" data-testid="current-temperature">${temp(Number(cur.temperature_2m), true)}</div>
          <div class="current-condition" data-testid="current-condition">${esc(conditionText(code))}</div>
          <div class="feels-line">
            ${Icons.uiIcon("thermometer", { size: 17 })}
            <span>Feels like</span>
            <span class="feels-like" data-testid="feels-like">${temp(Number(cur.apparent_temperature), true)}</span>
          </div>
        </div>
        <div class="hero__chips">${metrics.join("")}</div>
      </div>
    </div>`;
    el.current.hidden = false;

    renderHourly(data);
    renderDaily(data);
    renderWater();
    animateIn();
  }

  /* ------------------------------------------------------------- water section */
  const isCoastalView = () => Water.isCoastal(state.marine);

  function renderWater() {
    if (!state.weather || !Water.isCoastal(state.marine)) {
      el.water.hidden = true;
      el.waterBody.innerHTML = "";
      return;
    }
    /* Unhide before painting: the tide chart measures its own box, and a hidden
       section measures zero. */
    el.water.hidden = false;
    Water.render(el.waterBody, state.weather, state.marine, state.units, {
      place: state.city ? state.city.label : "",
    });
  }

  /* Data bars are inline SVG: CSS paint on a DOM element counts as a background
     candidate for any text sampled on top of it, so decoration belongs in the SVG
     layer where it cannot be mistaken for a text background.
     Temperature gets one colour language: the rail in a forecast row and the
     two numbers beside it use the same bucket, so the rail reads as
     "how warm this day runs" and not as decoration. */
  const tempBucket = (c) =>
    c <= 0 ? "cold" : c <= 10 ? "cool" : c <= 18 ? "mild" : c <= 26 ? "warm" : "hot";

  /* The rail is the week's range: the track spans the coldest low to the warmest
     high of all five days, and the filled segment is that day's own low -> high.
     Ends are marked so the segment reads as a span, not a progress bar. */
  const rangeBar = (leftPct, widthPct, bucket) => {
    const w = Math.max(5, widthPct);
    const x = Math.min(leftPct, 100 - w);
    return (
      `<svg class="day__range" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true" focusable="false">` +
      '<rect width="100" height="6" rx="3" fill="var(--rail-track)"/>' +
      `<rect class="rail-fill rail-fill--${bucket}" x="${x}" y="0" width="${w}" height="6" rx="3"/>` +
      `<rect class="rail-cap" x="${x}" y="0" width="1.6" height="6" rx="0.8"/>` +
      "</svg>"
    );
  };

  function renderHourly(data) {
    const hourly = data.hourly || {};
    const times = hourly.time || [];
    const cur = data.current || {};
    const currentIso = String(cur.time || "");
    let start = times.indexOf(currentIso);
    /* Live Open-Meteo reports current.time at 15-minute marks while the hourly series
       steps on the hour, so fall back to the hour the reading belongs to. */
    if (start < 0) start = times.indexOf(`${currentIso.slice(0, 13)}:00`);
    if (start < 0) start = 0;

    let markup = "";
    const firstDate = String(times[start] || "").slice(0, 10);
    let markedNextDay = false;
    for (let i = 0; i < 24; i++) {
      const idx = start + i;
      const t = times[idx];
      if (t === undefined) break;
      const code = Number(hourly.weather_code[idx]);
      const isDay = Number(hourly.is_day[idx]) === 0 ? 0 : 1;
      const pop = Number(hourly.precipitation_probability[idx]);
      const showPop = Number.isFinite(pop) && pop >= 10;
      /* The slot above the time label is display-only: "Now" on the live hour,
         "Tomorrow" on the first hour that crosses into the next day. */
      let tag = "";
      if (i === 0) tag = "Now";
      else if (markedNextDay === false && String(t).slice(0, 10) !== firstDate) {
        tag = "Tomorrow";
        markedNextDay = true;
      }
      const night = isDay === 0 ? " hour--night" : "";
      markup += `<div class="hour${night}${i === 0 ? " hour--now" : ""}" data-testid="hour-item">
        <span class="hour__nowtag" aria-hidden="true">${tag}</span>
        <span class="hour-label" data-testid="hour-label">${esc(String(t).slice(11, 16))}</span>
        <span class="hour__icon${deepInk(themeIsDark())}">${Icons.weatherIcon(code, isDay, { size: 27 })}</span>
        <span class="hour-temperature" data-testid="hour-temperature">${temp(Number(hourly.temperature_2m[idx]))}</span>
        <span class="hour__precip">${showPop ? Icons.uiIcon("droplet", { size: 10 }) + Math.round(pop) + "%" : ""}</span>
      </div>`;
    }
    el.strip.innerHTML = markup;
    el.strip.scrollLeft = 0;
    el.hourlySection.hidden = false;
  }

  const dayName = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (!m) return "";
    const d = new Date(`${m[0]}T12:00:00Z`);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  };

  const monthDay = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (!m) return "";
    const d = new Date(`${m[0]}T12:00:00Z`);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  };

  function renderDaily(data) {
    const daily = data.daily || {};
    const times = daily.time || [];
    const n = Math.min(5, times.length);

    const lows = [], highs = [];
    for (let i = 0; i < n; i++) {
      lows.push(Number(daily.temperature_2m_min[i]));
      highs.push(Number(daily.temperature_2m_max[i]));
    }
    const weekMin = lows.length ? Math.min(...lows) : 0;
    const weekMax = highs.length ? Math.max(...highs) : 1;
    const weekSpan = Math.max(1, weekMax - weekMin);

    let markup = "";
    for (let i = 0; i < n; i++) {
      const code = Number(daily.weather_code[i]);
      const pop = Number(daily.precipitation_probability_max[i]);
      const left = Math.round(((lows[i] - weekMin) / weekSpan) * 100);
      const width = Math.max(6, Math.round(((highs[i] - lows[i]) / weekSpan) * 100));
      const bucket = tempBucket(highs[i]);
      markup += `<div class="day card" data-testid="forecast-day">
        <div class="day__icon${deepInk(themeIsDark())}">${Icons.weatherIcon(code, 1, { size: 32 })}</div>
        <div class="day__main">
          <p class="day__heading">
            <span class="day-name" data-testid="day-name">${esc(dayName(times[i]))}</span>
            <span class="day-date">${esc(monthDay(times[i]))}</span>
          </p>
          <p class="day-condition" data-testid="day-condition">${esc(conditionText(code))}</p>
          ${rangeBar(left, width, bucket)}
        </div>
        <div class="day__meta">
          <span class="day-precip" data-testid="day-precip">${
            Number.isFinite(pop) ? Math.round(pop) : 0
          }%</span>
          <span class="day-temps day-temps--${bucket}">
            <span class="day-low" data-testid="day-low">${temp(Number(daily.temperature_2m_min[i]))}</span>
            <span class="day-high" data-testid="day-high">${temp(Number(daily.temperature_2m_max[i]))}</span>
          </span>
        </div>
      </div>`;
    }
    el.dayList.innerHTML = markup;
    el.forecastSection.hidden = n === 0;
  }

  function animateIn() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let step = 0;
    for (const node of [el.current, el.water, el.hourlySection, el.forecastSection]) {
      if (node.hidden) continue;
      const inner = node.firstElementChild || node;
      inner.classList.remove("is-entering");
      void inner.offsetWidth;
      inner.style.animationDelay = `${step++ * 60}ms`;
      inner.classList.add("is-entering");
    }
  }

  /* ------------------------------------------------------------------- fetch */
  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
    return res.json();
  }

  function forecastUrl(lat, lon) {
    return (
      `${WX_URL}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
      `&hourly=temperature_2m,weather_code,is_day,precipitation_probability` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
      `&forecast_days=5&timezone=auto`
    );
  }

  function geocodeUrl(query) {
    return `${GEO_URL}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  }

  function setLoading(on) {
    el.loading.hidden = !on;
    el.loading.setAttribute("aria-hidden", on ? "false" : "true");
  }

  /* A failed sea request is not a failed forecast: it resolves, never rejects, so the
     weather always gets to render and the note simply appears where the water would be. */
  const marineRequest = (lat, lon) =>
    fetch(Water.marineUrl(lat, lon))
      .then((res) => {
        if (!res.ok) throw new Error(`marine ${res.status}`);
        return res.json();
      })
      .catch(() => ({ __failed: true }));

  /* -------------------------------------------------------------- open city */
  async function openCity(city, seq) {
    const token = ++state.searchToken;
    state.city = city;
    state.pending = city;
    if (seq) remember(city, seq);
    clearPanels();
    hideResults();
    setVisible(el.empty, false);
    setLoading(true);
    state.marine = null;
    announce(`Loading forecast for ${city.label}`);

    /* Both requests go out together; only the forecast gates the page. */
    const marinePromise = marineRequest(city.lat, city.lon);
    let data;
    try {
      data = await getJSON(forecastUrl(city.lat, city.lon));
    } catch (err) {
      if (token !== state.searchToken) return;
      setLoading(false);
      state.weather = null;
      hideResults();
      el.errorText.textContent = `We could not load the forecast for ${city.label}. ${
        err && err.message ? err.message : "Please check your connection."
      }`;
      setVisible(el.error, true);
      announce(`Could not load the forecast for ${city.label}`);
      return;
    }
    if (token !== state.searchToken) return;
    const marine = await marinePromise;
    if (token !== state.searchToken) return;

    state.weather = data;
    state.marine = marine.__failed ? null : marine;
    setLoading(false);
    setVisible(el.error, false);
    setVisible(el.marineNote, !!marine.__failed);
    renderWeather(data);
    announce(
      isCoastalView()
        ? `${city.label} is ready: today's outlook for the beach and for fishing, tides and the sea.`
        : `Forecast for ${city.label} is ready`,
    );
  }

  el.tryAgain.addEventListener("click", () => {
    if (state.pending) openCity(state.pending);
  });

  /* ------------------------------------------------------------------ search */
  function renderMatches(matches) {
    el.matchOptions.innerHTML = matches
      .map(
        (m, i) =>
          `<button type="button" class="match-option" data-testid="match-option" data-index="${i}">
            <span class="match-option__pin" aria-hidden="true">${Icons.uiIcon("pin", { size: 19 })}</span>
            <span class="match-option__label">${esc(m.label)}</span>
            <span class="match-option__go" aria-hidden="true">${Icons.uiIcon("chevron", { size: 18 })}</span></button>`,
      )
      .join("");
    el.matchList.hidden = false;
  }

  el.matchOptions.addEventListener("click", (event) => {
    const option = event.target.closest('[data-testid="match-option"]');
    if (!option) return;
    const match = (state.matches || [])[Number(option.dataset.index)];
    if (match) openCity(match, nextSeq());
  });

  async function runSearch(rawQuery) {
    const query = rawQuery.trim();
    const token = ++state.searchToken;
    const seq = nextSeq();
    clearPanels();
    if (!query) {
      hideResults();
      state.weather = null;
      setVisible(el.empty, true);
      return;
    }
    setLoading(true);
    announce(`Searching for ${query}`);
    let payload;
    try {
      payload = await getJSON(geocodeUrl(query));
    } catch (err) {
      if (token === state.searchToken) {
        setLoading(false);
        hideResults();
        el.errorText.textContent = `Search could not reach the weather service. ${
          err && err.message ? err.message : ""
        }`;
        setVisible(el.error, true);
      }
      return;
    }

    const results = payload && Array.isArray(payload.results) ? payload.results : [];
    const matches = results
      .map((r) => ({ label: labelOf(r), lat: r.latitude, lon: r.longitude }))
      .filter((m) => m.label && isFinite(m.lat) && isFinite(m.lon))
      .slice(0, 5);

    /* A single match is a city the user opened, so it is recorded even when a newer
       search has already taken over the screen — the recents list follows submission
       order, not the order responses happened to arrive in. */
    if (matches.length === 1) remember(matches[0], seq);
    if (token !== state.searchToken) return;
    setLoading(false);

    if (matches.length === 0) {
      hideResults();
      state.weather = null;
      el.noticeText.textContent = `No results found for “${query}”. Try another place name.`;
      setVisible(el.notice, true);
      announce(`No results found for ${query}`);
      return;
    }
    if (matches.length === 1) {
      openCity(matches[0]);
      return;
    }
    state.matches = matches;
    setVisible(el.empty, false);
    hideResults();
    renderMatches(matches);
    announce(`${matches.length} places match ${query}. Pick one.`);
  }

  el.form.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch(el.input.value);
  });

  /* ------------------------------------------------------------------- init */
  function init() {
    paintUnitToggle();
    $("search-icon").innerHTML = Icons.uiIcon("search", { size: 19 });
    $("notice-icon").innerHTML = Icons.uiIcon("globe", { size: 22 });
    $("error-icon").innerHTML = Icons.uiIcon("alert", { size: 22 });
    $("try-again-icon").innerHTML = Icons.uiIcon("refresh", { size: 18 });
    $("clear-icon").innerHTML = Icons.uiIcon("trash", { size: 15 });
    $("hourly-icon").innerHTML = Icons.uiIcon("clock", { size: 15 });
    $("forecast-icon").innerHTML = Icons.uiIcon("calendar", { size: 15 });
    $("recents-icon").innerHTML = Icons.uiIcon("history", { size: 15 });
    HINTS.slice(0, 3).forEach((city, i) => {
      const node = $(`hint-${i + 1}`);
      if (!node) return;
      node.hidden = false;
      /* aria-hidden and keyboard-skipped: a focusable element that the a11y tree
         cannot name is a violation, and the keyboard already has the search field. */
      node.setAttribute("aria-hidden", "true");
      node.tabIndex = -1;
      node.innerHTML = Icons.uiIcon("pin", { size: 15 }) + `<span>${esc(city)}</span>`;
      node.addEventListener("click", () => {
        el.input.value = city;
        runSearch(city);
      });
    });
    renderRecents();
  }

  init();
})();
