/* Shoreline — the water reading: coastal detection, today's verdicts, tides, moon.
   The rules live here as plain functions so they can be driven straight from the brief.
   Everything arrives metric from Open-Meteo; unit conversion happens at render time. */
(function (root) {
  "use strict";

  const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
  const MARINE_CURRENT =
    "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction," +
    "swell_wave_period,sea_surface_temperature,sea_level_height_msl";
  const MARINE_HOURLY = "wave_height,sea_level_height_msl";

  const MOON_NAMES = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent",
  ];

  /* The 8-point compass point the swell comes FROM. */
  const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

  const THUNDER = [95, 96, 99];
  const CLEARISH = [0, 1, 2];
  const LOW_LIGHT_MIN = 90; /* dawn / dusk window, ±90 minutes */

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );

  /* The marine API answers inland places with JSON `null`s, and Number(null) is 0 —
     so a missing value must never become a number. */
  const num = (v) => {
    if (v === null || v === '' || typeof v === 'boolean' || Array.isArray(v)) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  function marineUrl(lat, lon) {
    return (
      `${MARINE_URL}?latitude=${lat}&longitude=${lon}` +
      `&current=${MARINE_CURRENT}&hourly=${MARINE_HOURLY}&forecast_days=5&timezone=auto`
    );
  }

  /* Coastal = the marine answer carries a numeric wave height. Away from the sea the
     live API answers 200 with nulls, so a place is inland unless the sea says otherwise. */
  const isCoastal = (marine) =>
    num(marine && marine.current && marine.current.wave_height) !== null;

  /* `current.time` sits on 15-minute marks from the live API while the hourly series
     steps on the hour, so snap any reading to the hour slot it belongs to. */
  const hourSlot = (iso) => `${String(iso).slice(0, 13)}:00`;

  function slotIndexOf(times, iso) {
    const at = times.indexOf(iso);
    if (at >= 0) return at;
    return times.indexOf(hourSlot(iso));
  }

  const minutesOf = (hhmm) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
    if (!m) return null;
    const h = Number(m[1]);
    const mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  };

  const inWindow = (hourMins, centre) =>
    centre !== null && hourMins >= centre - LOW_LIGHT_MIN && hourMins <= centre + LOW_LIGHT_MIN;

  /* ---------------- sea level: today's series, turns, trend ---------------- */
  /* Nulls (inland, or a gap in the model) stay null so nothing downstream invents a tide. */
  function todaySeries(marine, today) {
    const hourly = (marine && marine.hourly) || {};
    const times = hourly.time || [];
    const levels = hourly.sea_level_height_msl || [];
    const out = new Array(24).fill(null);
    for (let i = 0; i < times.length; i++) {
      const t = String(times[i] || "");
      if (t.slice(0, 10) !== today) continue;
      const h = Number(t.slice(11, 13));
      if (!(h >= 0 && h <= 23)) continue;
      out[h] = num(levels[i]);
    }
    return out;
  }

  /* A slot is a High when strictly above both neighbouring hours, a Low when strictly
     below. Walked over the whole series, so today's first hour still has yesterday as a
     neighbour, while the very first slot of the series has none and is never a turn. */
  function tideTurns(marine, today) {
    const hourly = (marine && marine.hourly) || {};
    const times = hourly.time || [];
    const levels = hourly.sea_level_height_msl || [];
    const turns = [];
    for (let i = 1; i < times.length - 1; i++) {
      if (String(times[i] || "").slice(0, 10) !== today) continue;
      const v = num(levels[i]);
      const prev = num(levels[i - 1]);
      const next = num(levels[i + 1]);
      if (v === null || prev === null || next === null) continue;
      const time = String(times[i]).slice(11, 16);
      if (!/^\d{2}:00$/.test(time)) continue;
      const hour = Number(time.slice(0, 2));
      if (v > prev && v > next) turns.push({ kind: "High", hour, time, heightM: v });
      else if (v < prev && v < next) turns.push({ kind: "Low", hour, time, heightM: v });
    }
    return turns;
  }

  /* Rising when the sea level an hour from now is higher than at the current hour. */
  function tideTrend(marine, nowIso) {
    const hourly = (marine && marine.hourly) || {};
    const times = hourly.time || [];
    const levels = hourly.sea_level_height_msl || [];
    const at = slotIndexOf(times, nowIso);
    if (at < 0 || at + 1 >= times.length) return null;
    const a = num(levels[at]);
    const b = num(levels[at + 1]);
    if (a === null || b === null) return null;
    return b > a ? "Rising" : "Falling";
  }

  /* ---------------- units ---------------- */
  const toF = (c) => (c * 9) / 5 + 32;
  const toMph = (kmh) => kmh / 1.609344;
  const toFt = (m) => m * 3.28084;

  const tempText = (c, units, withUnit) =>
    `${Math.round(units === "F" ? toF(c) : c)}${withUnit ? (units === "F" ? "°F" : "°C") : "°"}`;
  const windText = (kmh, units) =>
    units === "F" ? `${Math.round(toMph(kmh))} mph` : `${Math.round(kmh)} km/h`;
  const lenText = (m, units) =>
    m === null ? "—" : units === "F" ? `${toFt(m).toFixed(1)} ft` : `${Number(m).toFixed(1)} m`;
  const swellPoint = (deg) => {
    const d = num(deg);
    return d === null ? "—" : COMPASS[Math.round(d / 45) % 8];
  };
  const seaPeriodText = (p) => (p === null ? "—" : `${Math.round(p)} s`);
  const seaTempText = (c, units) =>
    c === null ? "—" : units === "F" ? `${Math.round(toF(c))}°F` : `${Math.round(c)}°C`;

  /* ---------------- verdicts ---------------- */
  const listUp = (parts) => {
    const clean = parts.filter(Boolean);
    if (clean.length <= 1) return clean.join("");
    return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
  };
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  /* Reason wording stays on the Celsius reading — the numbers beside the words are
     converted, the sentence is not. */
  function beachVerdict(i) {
    const W = i.waveHeight;
    const V = i.wind;
    const P = i.precipMax;
    const C = i.code;
    const T = i.temp;
    const wave = `${W === null ? "no" : Number(W).toFixed(1)} m waves`;
    const breeze = V === null ? "no" : `${Math.round(V)} km/h`;
    const cool = `cool air, ${T === null ? "cold" : Math.round(T)}°C`;
    const thunder = C !== null && THUNDER.indexOf(C) >= 0;

    const bad = [];
    if (W !== null && W >= 2.0) bad.push(["waves", wave]);
    if (V !== null && V >= 35) bad.push(["wind", `a ${breeze} wind`]);
    if (P !== null && P >= 60) bad.push(["rain", "rain likely"]);
    if (thunder) bad.push(["thunder", "thunder about"]);
    if (T !== null && T < 16) bad.push(["cool", cool]);
    if (bad.length) {
      return {
        rating: "Poor",
        holds: bad.map((b) => b[0]),
        reason: `${cap(listUp(bad.map((b) => b[1])))} — leave it today.`,
      };
    }

    const fine =
      W !== null && W < 1.0 && V !== null && V < 20 && P !== null && P < 30 &&
      CLEARISH.indexOf(C) >= 0 && T !== null && T >= 22;
    if (fine) {
      return {
        rating: "Good",
        holds: [],
        reason: `Small water (${W.toFixed(1)} m), a light ${breeze} breeze and clear skies — go.`,
      };
    }

    const held = [];
    if (W !== null && W >= 1.0) held.push(["waves", wave]);
    if (V !== null && V >= 20) held.push(["wind", `a ${breeze} wind`]);
    if (P !== null && P >= 30) held.push(["rain", "rain likely"]);
    if (!(C === 0 || C === 1 || C === 2)) held.push(["cloud", "grey cloud"]);
    if (T !== null && T < 22) held.push(["cool", cool]);
    return {
      rating: "Fair",
      holds: held.map((b) => b[0]),
      reason: held.length
        ? `${cap(listUp(held.map((b) => b[1])))} — workable, not perfect.`
        : "Pleasant, but not quite everything you'd want.",
    };
  }

  function fishingVerdict(i) {
    const W = i.waveHeight;
    const V = i.wind;
    const wave = `${W === null ? "no" : Number(W).toFixed(1)} m waves`;
    const breeze = V === null ? "no" : `${Math.round(V)} km/h`;
    const thunder = i.code !== null && THUNDER.indexOf(i.code) >= 0;

    const bad = [];
    if (W !== null && W >= 2.5) bad.push(["waves", wave]);
    if (V !== null && V >= 40) bad.push(["wind", `a ${breeze} wind`]);
    if (thunder) bad.push(["thunder", "thunder about"]);
    if (bad.length) {
      return {
        rating: "Poor",
        holds: bad.map((b) => b[0]),
        reason: `${cap(listUp(bad.map((b) => b[1])))} — the water's not for angling today.`,
      };
    }

    const dawn = i.turns.filter((t) => inWindow(t.hour * 60, i.sunriseMin));
    const dusk = i.turns.filter((t) => inWindow(t.hour * 60, i.sunsetMin));
    const calm = W !== null && W < 1.5 && V !== null && V < 25;

    if (calm && (dawn.length || dusk.length)) {
      const windows = [];
      if (dawn.length) windows.push(`dawn (${dawn.map((t) => t.time).join(", ")})`);
      if (dusk.length) windows.push(`dusk (${dusk.map((t) => t.time).join(", ")})`);
      return {
        rating: "Good",
        holds: [],
        reason: `Settled water, and the tide turns at ${listUp(windows)} — be in before it.`,
      };
    }

    const held = [];
    if (W === null || W >= 1.5) held.push(["waves", wave]);
    if (V === null || V >= 25) held.push(["wind", `a ${breeze} wind`]);
    if (!dawn.length && !dusk.length) {
      const when = i.turns.length ? i.turns.map((t) => t.time).join(", ") : "no clear turn today";
      held.push(["tide", `the tide turns at ${when}, not in low light`]);
    }
    return {
      rating: "Fair",
      holds: held.map((b) => b[0]),
      reason: `${cap(listUp(held.map((b) => b[1])))} — worth an hour, not the day.`,
    };
  }

  /* ---------------- moon ---------------- */
  function moonFor(today) {
    const t = Date.parse(`${today}T12:00:00Z`);
    if (Number.isNaN(t)) return { name: MOON_NAMES[0], frac: 0 };
    const days = (t - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
    const frac = ((days / 29.530588853) % 1 + 1) % 1;
    return { name: MOON_NAMES[Math.floor(frac * 8 + 0.5) % 8], frac };
  }

  /* ---------------- model ---------------- */
  function model(forecast, marine) {
    const daily = (forecast && forecast.daily) || {};
    const cur = (forecast && forecast.current) || {};
    const today = String((daily.time || [])[0] || String(cur.time || "").slice(0, 10));
    const nowIso = String(cur.time || "");
    const nowHour = Number(hourSlot(nowIso).slice(11, 13));
    const mcur = (marine && marine.current) || {};
    const turns = tideTurns(marine, today);

    const inputs = {
      waveHeight: num(mcur.wave_height),
      wind: num(cur.wind_speed_10m),
      precipMax: num((daily.precipitation_probability_max || [])[0]),
      code: num(cur.weather_code),
      temp: num(cur.temperature_2m),
      turns,
      sunriseMin: minutesOf(String((daily.sunrise || [])[0] || "").slice(11, 16)),
      sunsetMin: minutesOf(String((daily.sunset || [])[0] || "").slice(11, 16)),
      sunrise: String((daily.sunrise || [])[0] || "").slice(11, 16),
      sunset: String((daily.sunset || [])[0] || "").slice(11, 16),
    };

    return {
      today,
      nowHour: Number.isFinite(nowHour) ? nowHour : null,
      series: todaySeries(marine, today),
      turns,
      trend: tideTrend(marine, nowIso),
      inputs,
      sea: {
        waveHeight: num(mcur.wave_height),
        waveDirection: num(mcur.wave_direction),
        wavePeriod: num(mcur.wave_period),
        swellHeight: num(mcur.swell_wave_height),
        swellDirection: num(mcur.swell_wave_direction),
        swellPeriod: num(mcur.swell_wave_period),
        sst: num(mcur.sea_surface_temperature),
        level: num(mcur.sea_level_height_msl),
      },
      moon: moonFor(today),
    };
  }

  /* ---------------- "when" in plain words ---------------- */
  function bestTimes(m) {
    const dawn = m.turns.filter((t) => inWindow(t.hour * 60, m.inputs.sunriseMin));
    const dusk = m.turns.filter((t) => inWindow(t.hour * 60, m.inputs.sunsetMin));
    const bits = [];
    if (dawn.length) bits.push(`${dawn[0].kind.toLowerCase()} water at dawn (${dawn[0].time})`);
    if (dusk.length) bits.push(`${dusk[0].kind.toLowerCase()} water at dusk (${dusk[0].time})`);
    if (bits.length) return `Low light meets a turning tide: ${listUp(bits)}.`;
    if (m.turns.length) {
      const next = m.turns.find((t) => m.nowHour !== null && t.hour >= m.nowHour) || m.turns[0];
      return `No turn near sunrise or sunset — the next ${next.kind.toLowerCase()} is at ${next.time}.`;
    }
    return "No clear turn in today's hourly sea level.";
  }

  /* A local's shorthand for water temperature — never a score. */
  function seaTempNote(c) {
    if (c === null) return "no reading";
    if (c < 8) return "cold — a suit, at least";
    if (c < 14) return "chilly for a dip";
    if (c < 19) return "bracing but swimmable";
    if (c < 23) return "comfortable";
    if (c < 27) return "warm";
    return "bath-warm";
  }

  function moonNote(name) {
    if (name === "New moon") return "no moonlight tonight";
    if (name === "Full moon") return "bright all night";
    if (name === "First quarter" || name === "Last quarter") return "half a moon tonight";
    return "a slice of moon later";
  }

  /* ---------------- tide chart ---------------- */
  /* Inline SVG: CSS paint on a DOM element counts as a contrast candidate for any text
     sampled over it, so the chart belongs in the SVG layer. Marks: the curve and its
     filled belly, the dawn and dusk windows, every high and low with its time, and now. */
  function tideChart(m) {
    const W = 320;
    const H = 132;
    const padL = 10;
    const padR = 10;
    const top = 30;
    const bottom = H - 22;
    const vals = m.series.filter((v) => v !== null);
    const lo = vals.length ? Math.min(...vals) : -1;
    const hi = vals.length ? Math.max(...vals) : 1;
    const span = Math.max(0.2, hi - lo);
    const x = (h) => padL + (h / 23) * (W - padL - padR);
    const y = (v) => bottom - ((v - lo) / span) * (bottom - top);

    let d = "";
    let first = -1;
    let last = -1;
    for (let h = 0; h < 24; h++) {
      const v = m.series[h];
      if (v === null) continue;
      d += `${d ? "L" : "M"}${x(h).toFixed(1)} ${y(v).toFixed(1)}`;
      if (first < 0) first = h;
      last = h;
    }
    const area =
      first >= 0 && last > first
        ? `${d}L${x(last).toFixed(1)} ${bottom}L${x(first).toFixed(1)} ${bottom}Z`
        : "";

    const band = (centreMin, label) => {
      if (centreMin === null) return "";
      const from = x(Math.max(0, (centreMin - LOW_LIGHT_MIN) / 60));
      const to = x(Math.min(23, (centreMin + LOW_LIGHT_MIN) / 60));
      return (
        `<rect class="tc-band" x="${from.toFixed(1)}" y="14" width="${(to - from).toFixed(1)}" height="${bottom - 14}" rx="7"/>` +
        `<text class="tc-bandlabel" x="${((from + to) / 2).toFixed(1)}" y="11" text-anchor="middle">${label}</text>`
      );
    };

    const marks = m.turns
      .map((t) => {
        const mx = x(t.hour);
        const my = y(t.heightM);
        const high = t.kind === "High";
        const ly = high ? my - 8 : my + 14;
        const ky = high ? ly - 9 : ly + 9;
        return (
          `<g class="tc-turn tc-turn--${t.kind.toLowerCase()}">` +
          `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3.2"/>` +
          `<text x="${mx.toFixed(1)}" y="${Math.max(11, Math.min(H - 6, ly)).toFixed(1)}" text-anchor="middle">${t.time}</text>` +
          `<text class="tc-turnkind" x="${mx.toFixed(1)}" y="${Math.max(11, Math.min(H - 4, ky)).toFixed(1)}" text-anchor="middle">${t.kind}</text>` +
          `</g>`
        );
      })
      .join("");

    const nowX = m.nowHour === null ? null : x(m.nowHour);
    const nowY = m.nowHour === null || m.series[m.nowHour] === null ? null : y(m.series[m.nowHour]);
    const now =
      nowX === null
        ? ""
        : `<g class="tc-now">` +
          `<line x1="${nowX.toFixed(1)}" y1="14" x2="${nowX.toFixed(1)}" y2="${bottom + 3}"/>` +
          (nowY === null ? "" : `<circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="4.4"/>`) +
          `<text x="${Math.min(W - 18, Math.max(16, nowX)).toFixed(1)}" y="${bottom + 14}" text-anchor="middle">now</text>` +
          `</g>`;

    const hours = [0, 6, 12, 18, 23]
      .map(
        (h) =>
          `<text class="tc-hour" x="${x(h).toFixed(1)}" y="${bottom + 14}" text-anchor="${h === 0 ? "start" : h === 23 ? "end" : "middle"}">${String(h).padStart(2, "0")}</text>`,
      )
      .join("");

    return (
      `<svg class="tide-chart__svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" ` +
      `aria-label="Sea level today with the highs, lows, dawn and dusk windows, and now">` +
      band(m.inputs.sunriseMin, "dawn") +
      band(m.inputs.sunsetMin, "dusk") +
      `<line class="tc-zero" x1="${padL}" y1="${y(0).toFixed(1)}" x2="${W - padR}" y2="${y(0).toFixed(1)}"/>` +
      (area ? `<path class="tc-area" d="${area}"/>` : "") +
      (d ? `<path class="tc-line" d="${d}"/>` : "") +
      marks +
      hours +
      now +
      `</svg>`
    );
  }

  /* ---------------- markup ---------------- */
  function ratingCard(which, label, verdict, iconName) {
    const mark =
      verdict.rating === "Poor" ? "cross" : verdict.rating === "Fair" ? "tilt" : "check";
    return `<article class="rating rating--${verdict.rating.toLowerCase()} rating--${which}">
      <span class="rating__head">
        <span class="rating__mark" aria-hidden="true">${Icons.waterIcon(iconName, { size: 22 })}</span>
        <span class="rating__label">${label}</span>
        <span class="rating__flag" aria-hidden="true">${Icons.waterIcon(mark, { size: 15 })}</span>
      </span>
      <span class="rating__word" data-testid="${which}-rating">${verdict.rating}</span>
      <span class="rating__reason" data-testid="${which}-reason">${esc(verdict.reason)}</span>
    </article>`;
  }

  function html(m) {
    const v = {
      beach: beachVerdict(m.inputs),
      fishing: fishingVerdict(m.inputs),
    };
    const units = m.units || "C";
    const s = m.sea;

    const events = m.turns.length
      ? m.turns
          .map(
            (t) => `<li class="tide-event" data-testid="tide-event">
              <span class="tide-kind">${Icons.waterIcon(t.kind === "High" ? "up" : "down", { size: 14 })}<span data-testid="tide-kind">${t.kind}</span></span>
              <span class="tide-time" data-testid="tide-time">${t.time}</span>
              <span class="tide-height" data-testid="tide-height">${esc(lenText(t.heightM, units))}</span>
            </li>`,
          )
          .join("")
      : `<li class="tide-event tide-event--none">The hourly sea level stays flat today.</li>`;

    return `
      <div class="water__head">
        <h2 class="section__title water__title">Today at the water</h2>
        <p class="water__trend">
          ${Icons.waterIcon("tide", { size: 14 })}
          <span data-testid="tide-trend">${esc(m.trend || "Steady")}</span>
        </p>
      </div>
      <div class="ratings">
        ${ratingCard("beach", "Beach today", v.beach, "beach")}
        ${ratingCard("fishing", "Fishing today", v.fishing, "fish")}
      </div>
      <p class="water__disclaimer">An outlook from today's model data, not a promise — use your eyes once you're there.</p>
      <section class="water__panel tide">
        <h3 class="water__subtitle">Tides today</h3>
        <div class="tide-chart" data-testid="tide-chart">${tideChart(m)}</div>
        <ul class="tide-events">${events}</ul>
        <p class="best-times">${esc(bestTimes(m))}</p>
        <p class="tide-note" data-testid="tide-note">Tide times are approximate — hourly model values, not a harbour table.</p>
      </section>
      <section class="water__panel sea">
        <h3 class="water__subtitle">Sea state</h3>
        <div class="sea__grid">
          <div class="sea__stat">
            <span class="sea__label">${Icons.waterIcon("waves", { size: 15 })} Waves</span>
            <span class="sea__value" data-testid="wave-height">${esc(lenText(s.waveHeight, units))}</span>
            <span class="sea__sub">period <span data-testid="wave-period">${esc(seaPeriodText(s.wavePeriod))}</span></span>
          </div>
          <div class="sea__stat">
            <span class="sea__label">${Icons.waterIcon("swell", { size: 15 })} Swell from</span>
            <span class="sea__value sea__value--dir">
              <span class="sea__arrow" aria-hidden="true" style="--dir:${Number(s.swellDirection) || 0}deg">${Icons.waterIcon("arrow", { size: 15 })}</span>
              <span data-testid="swell-direction">${esc(swellPoint(s.swellDirection))}</span>
            </span>
            <span class="sea__sub">${s.swellHeight === null ? "swell height n/a" : `height ${esc(lenText(s.swellHeight, units))}`}</span>
          </div>
          <div class="sea__stat">
            <span class="sea__label">${Icons.waterIcon("thermo", { size: 15 })} Sea temp</span>
            <span class="sea__value" data-testid="sea-temperature">${esc(seaTempText(s.sst, units))}</span>
            <span class="sea__sub">${esc(seaTempNote(s.sst))}</span>
          </div>
          <div class="sea__stat">
            <span class="sea__label">${Icons.moonIcon(m.moon.name, { size: 15 })} Moon</span>
            <span class="sea__value sea__value--moon" data-testid="moon-phase">${esc(m.moon.name)}</span>
            <span class="sea__sub">${esc(moonNote(m.moon.name))}</span>
          </div>
        </div>
      </section>`;
  }

  root.Water = {
    marineUrl,
    isCoastal,
    model,
    render,
    html,
    tideChart,
    tideTurns,
    tideTrend,
    todaySeries,
    moonFor,
    swellPoint,
    lenText,
    seaTempText,
    seaPeriodText,
    bestTimes,
    beachVerdict,
    fishingVerdict,
    MOON_NAMES,
  };

  function render(node, forecast, marine, units) {
    const m = model(forecast, marine);
    m.units = units;
    node.innerHTML = html(m);
    return m;
  }
})(typeof window !== "undefined" ? window : globalThis);
