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
      held.push(["tide", i.turns.length
        ? `the tide turns at ${i.turns.map((t) => t.time).join(", ")}, not in low light`
        : "no clear tide turn today, so nothing to time around"]);
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
  /* The chart is painted into a viewBox that matches its own box pixel-for-pixel, so
     strokes and labels never stretch: the box is measured after the markup is in the
     DOM and the chart is painted in a second pass (paintChart). Marks: the curve and
     its filled belly, the dawn and dusk windows, every high and low with its time,
     hour gridlines, mean sea level, and now. */
  const CHART_MIN_W = 260;
  const CHART_MIN_H = 124;

  /* Catmull-Rom -> cubic bezier: hourly tide values are smooth, and a polyline reads
     as a zigzag at 24 points across 300px. */
  function smoothPath(pts) {
    if (pts.length < 2) return pts.length ? `M${pts[0][0]} ${pts[0][1]}` : "";
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  function tideChart(m, width, height) {
    const W = Math.max(CHART_MIN_W, Math.round(width || 320));
    const H = Math.max(CHART_MIN_H, Math.round(height || 136));
    const padL = 8;
    const padR = 8;
    const top = 16;
    const bottom = H - 24;
    const vals = m.series.filter((v) => v !== null);
    const lo = vals.length ? Math.min(...vals) : -1;
    const hi = vals.length ? Math.max(...vals) : 1;
    const span = Math.max(0.2, hi - lo);
    const x = (h) => padL + (h / 23) * (W - padL - padR);
    const y = (v) => bottom - ((v - lo) / span) * (bottom - top);
    const cl = (v, a, b) => Math.max(a, Math.min(b, v));

    /* Runs of consecutive hours with a reading, so a gap breaks the curve. */
    const runs = [];
    let run = [];
    for (let h = 0; h < 24; h++) {
      const v = m.series[h];
      if (v === null) {
        if (run.length) runs.push(run);
        run = [];
        continue;
      }
      run.push([x(h), y(v)]);
    }
    if (run.length) runs.push(run);

    const paths = runs
      .map((r) => smoothPath(r))
      .filter(Boolean)
      .join(" ");
    const areas = runs
      .filter((r) => r.length > 1)
      .map((r) => `${smoothPath(r)}L${r[r.length - 1][0].toFixed(1)} ${bottom}L${r[0][0].toFixed(1)} ${bottom}Z`)
      .join(" ");

    const grid = [0, 6, 12, 18, 23]
      .map(
        (h) =>
          `<line class="tc-grid" x1="${x(h).toFixed(1)}" y1="${top}" x2="${x(h).toFixed(1)}" y2="${bottom}"/>`,
      )
      .join("");

    const band = (centreMin, label) => {
      if (centreMin === null) return "";
      const from = x(cl((centreMin - LOW_LIGHT_MIN) / 60, 0, 23));
      const to = x(cl((centreMin + LOW_LIGHT_MIN) / 60, 0, 23));
      return (
        `<rect class="tc-band" x="${from.toFixed(1)}" y="${top}" width="${(to - from).toFixed(1)}" height="${bottom - top}" rx="8"/>` +
        `<text class="tc-bandlabel" x="${((from + to) / 2).toFixed(1)}" y="10" text-anchor="middle">${label}</text>`
      );
    };

    const marks = m.turns
      .map((t) => {
        const mx = x(t.hour);
        const my = y(t.heightM);
        const high = t.kind === "High";
        const ly = cl(high ? my - 9 : my + 15, top + 8, bottom - 2);
        const ky = cl(high ? ly - 10 : ly + 10, 10, H - 4);
        return (
          `<g class="tc-turn tc-turn--${t.kind.toLowerCase()}">` +
          `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="3.4"/>` +
          `<text x="${mx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${t.time}</text>` +
          `<text class="tc-turnkind" x="${mx.toFixed(1)}" y="${ky.toFixed(1)}" text-anchor="middle">${t.kind}</text>` +
          `</g>`
        );
      })
      .join("");

    const hours = [0, 6, 12, 18, 23]
      .map(
        (h) =>
          `<text class="tc-hour" x="${x(h).toFixed(1)}" y="${H - 6}" text-anchor="${h === 0 ? "start" : h === 23 ? "end" : "middle"}">${String(h).padStart(2, "0")}</text>`,
      )
      .join("");

    const nowX = m.nowHour === null ? null : x(m.nowHour);
    const nowY = m.nowHour === null || m.series[m.nowHour] === null ? null : y(m.series[m.nowHour]);
    const pillW = 30;
    const now =
      nowX === null
        ? ""
        : `<g class="tc-now">` +
          `<line x1="${nowX.toFixed(1)}" y1="${top}" x2="${nowX.toFixed(1)}" y2="${bottom + 2}"/>` +
          (nowY === null ? "" : `<circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="4.6"/>`) +
          `<rect class="tc-nowpill" x="${cl(nowX - pillW / 2, 2, W - pillW - 2).toFixed(1)}" y="${H - 17}" width="${pillW}" height="13" rx="6.5"/>` +
          `<text x="${cl(nowX, 2 + pillW / 2, W - pillW / 2 - 2).toFixed(1)}" y="${H - 7}" text-anchor="middle">now</text>` +
          `</g>`;

    /* A hour tick that sits under the "now" pill would fight it, so drop that tick. */
    const ticks =
      nowX === null
        ? hours
        : hours
            .split("</text>")
            .filter((frag) => {
              const at = /x="([\d.]+)"/.exec(frag);
              if (!at) return true;
              return Math.abs(Number(at[1]) - nowX) > pillW / 2 + 6;
            })
            .join("</text>");

    return (
      `<svg class="tide-chart__svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ` +
      `aria-label="Sea level today. ${
        m.turns.length
          ? m.turns.map((t) => `${t.kind} ${t.time}, ${t.heightM.toFixed(1)} metres`).join("; ")
          : "no clear turn today"
      }.${m.trend ? ` Now ${m.trend.toLowerCase()}.` : ""}` +
      ` Dawn is around ${m.inputs.sunrise || "sunrise"} and dusk around ${m.inputs.sunset || "sunset"}.">` +
      grid +
      band(m.inputs.sunriseMin, "dawn") +
      band(m.inputs.sunsetMin, "dusk") +
      `<line class="tc-zero" x1="${padL}" y1="${y(0).toFixed(1)}" x2="${W - padR}" y2="${y(0).toFixed(1)}"/>` +
      (areas ? `<path class="tc-area" d="${areas}"/>` : "") +
      (paths ? `<path class="tc-line" d="${paths}"/>` : "") +
      marks +
      ticks +
      now +
      `</svg>`
    );
  }

  /* The kicker repeats the place, so it takes only the town — the hero already
     prints the full "City, Region, Country" label. */
  function shortPlace(label) {
    const head = String(label).split(",")[0].trim();
    return head.length > 22 ? `${head.slice(0, 21).trim()}…` : head;
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

    const trendChip = `<span class="tide-trend">${Icons.waterIcon("tide", { size: 13 })}Tide <span data-testid="tide-trend">${esc(m.trend || "Steady")}</span></span>`;

    return `
      <div class="water__head">
        <p class="water__kicker">${Icons.waterIcon("wave", { size: 14 })} ${esc(m.place || "Today at the water")}</p>
        <p class="water__trendwrap">${trendChip}</p>
      </div>
      <div class="ratings">
        ${ratingCard("beach", "Beach today", v.beach, "beach")}
        ${ratingCard("fishing", "Fishing today", v.fishing, "fish")}
      </div>
      <p class="water__disclaimer">An outlook from today's model data, not a promise — use your eyes once you're there.</p>
      <section class="water__panel tide">
        <h3 class="water__subtitle">Tides today</h3>
        <div class="tide-chart" data-testid="tide-chart"></div>
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

  function render(node, forecast, marine, units, ctx) {
    const m = model(forecast, marine);
    m.units = units;
    m.place = shortPlace((ctx && ctx.place) || "");
    node.innerHTML = html(m);
    paintChart(node, m);
    return m;
  }

  /* Second pass: the chart needs its own pixel box before it can be drawn, so it is
     painted once the markup is in the document. A ResizeObserver keeps it honest when
     the column changes width (rotation, desktop reflow), since the drawing is
     pixel-for-pixel with its box. */
  function paintChart(node, m) {
    const box = node.querySelector('[data-testid="tide-chart"]');
    if (!box) return;
    let lastW = 0;
    const draw = () => {
      const w = box.clientWidth || 0;
      if (!w) return false;
      /* Only repaint when the box actually changes size, otherwise a repaint would
         wipe a text selection out from under someone reading the page. */
      if (w === lastW) return true;
      lastW = w;
      box.innerHTML = tideChart(m, w, box.clientHeight || 136);
      return true;
    };
    if (!draw() && typeof requestAnimationFrame === "function") requestAnimationFrame(draw);
    if (typeof ResizeObserver === "function") {
      if (box.__tideResize) box.__tideResize.disconnect();
      const ro = new ResizeObserver(() => {
        if (Math.abs(box.clientWidth - lastW) > 1) draw();
      });
      ro.observe(box);
      box.__tideResize = ro;
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
