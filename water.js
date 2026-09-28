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

  /* A High is a hour (or a run of hours) higher than the water on both sides of it, a
     Low lower on both sides. Comparing one slot against its two neighbours — the
     brief's original wording — loses real turns: the model routinely holds the same
     value for two hours at the top or the bottom of a curve, and 0.93, 0.93 then has no
     neighbour pair that is strictly beaten, so Honolulu's 03:00 high never appeared and
     the chart peaked at 3 a.m. while the list said nothing. So a run of two or more
     consecutive equal readings counts as ONE turn, judged by the readings just outside
     the run, and its time is the run's first hour. Used for the list, the chart markers
     and the fishing verdict alike. A run at either end of the series has no water on one
     side, so it is never a turn. */
  function tideTurns(marine, today) {
    const hourly = (marine && marine.hourly) || {};
    const times = hourly.time || [];
    const levels = hourly.sea_level_height_msl || [];
    const turns = [];
    let i = 0;
    while (i < times.length) {
      const v = num(levels[i]);
      if (v === null) {
        i += 1;
        continue;
      }
      let j = i;
      while (j + 1 < times.length) {
        const w = num(levels[j + 1]);
        /* Only a run of the same value, and only across contiguous hours: a gap in the
           series or a jump to another day must break it, or a null-separated pair of
           identical readings would read as a plateau. */
        if (w === null || w !== v || !isNextHour(times[j], times[j + 1])) break;
        j += 1;
      }
      const before = i > 0 ? num(levels[i - 1]) : null;
      const after = j + 1 < times.length ? num(levels[j + 1]) : null;
      if (before !== null && after !== null) {
        const date = String(times[i] || "").slice(0, 10);
        const time = String(times[i]).slice(11, 16);
        if (date === today && /^\d{2}:00$/.test(time)) {
          const hour = Number(time.slice(0, 2));
          if (v > before && v > after) turns.push({ kind: "High", hour, time, heightM: v });
          else if (v < before && v < after) turns.push({ kind: "Low", hour, time, heightM: v });
        }
      }
      i = j + 1;
    }
    return turns;
  }

  /* Contiguous in the series, and one hour apart in time. */
  function isNextHour(a, b) {
    const ta = Date.parse(`${String(a).slice(0, 13)}:00:00Z`);
    const tb = Date.parse(`${String(b).slice(0, 13)}:00:00Z`);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
    return tb - ta === 3600000;
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

  /* Reasons are re-derived per render so they always agree with the unit toggle:
     the numbers in the sentence are the numbers printed beside them. Every held-back
     factor keeps its contract keyword. */
  function beachVerdict(i, units = "C") {
    const W = i.waveHeight;
    const V = i.wind;
    const P = i.precipMax;
    const C = i.code;
    const T = i.temp;
    const wave = `${W === null ? "no" : lenText(W, units)} waves`;
    const breeze = V === null ? "no" : windText(V, units);
    const cool = `cool air, ${T === null ? "cold" : tempText(T, units, true)}`;
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
        reason: `Small water (${lenText(W, units)}), a light ${breeze} breeze and clear skies — go.`,
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

  function fishingVerdict(i, units = "C") {
    const W = i.waveHeight;
    const V = i.wind;
    const wave = `${W === null ? "no" : lenText(W, units)} waves`;
    const breeze = V === null ? "no" : windText(V, units);
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
      /* A noun phrase, so it lists cleanly beside "2.2 m waves". The turn times are
         deliberately not repeated here — the chart and the tiles below print them, and
         spelling them out pushed the second card to seven lines and the tide chart off
         the first screen at a four-turn place like Honolulu. */
      held.push(["tide", i.turns.length
        ? "no tide turn in low light"
        : "no tide turn to time the day around"]);
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
    /* Tomorrow's turns exist only so the app can answer "what happens next" once
       today's last turn has gone, instead of quoting a time that has already passed. */
    const tomorrow = nextDay(today);
    const laterTurns = tomorrow ? tideTurns(marine, tomorrow) : [];

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

    const next = tomorrowFacts(forecast, marine, tomorrow, nowIso);

    return {
      today,
      tomorrow,
      laterTurns,
      next,
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
  function nextDay(day) {
    const t = Date.parse(`${day}T12:00:00Z`);
    if (Number.isNaN(t)) return null;
    return new Date(t + 86400000).toISOString().slice(0, 10);
  }

  /* The next turn is the next one AFTER now — strictly after, because a turn stamped
     21:00 has gone by 21:27 and reading it as "next" is the one thing that makes a
     person lose trust in the whole panel. When today's tides are done, say which of
     tomorrow's turns is next rather than wrapping around to this morning. */
  function nextTurn(m) {
    if (m.nowHour === null) return null;
    const later = (m.turns || []).find((t) => t.hour > m.nowHour);
    if (later) return { ...later, day: "today" };
    const tm = (m.laterTurns || [])[0];
    if (tm) return { ...tm, day: "tomorrow" };
    return null;
  }

  /* "High at 15:00" / "High tomorrow at 03:00" — the day goes in before the time, so a
     reader never mistakes a tomorrow hour for one still to come today. */
  function atWords(t) {
    return t.day === "tomorrow" ? `tomorrow at ${t.time}` : `at ${t.time}`;
  }

  function bestTimes(m) {
    const dawn = m.turns.filter((t) => inWindow(t.hour * 60, m.inputs.sunriseMin));
    const dusk = m.turns.filter((t) => inWindow(t.hour * 60, m.inputs.sunsetMin));
    const bits = [];
    if (dawn.length) bits.push(`${dawn[0].kind.toLowerCase()} water at dawn (${dawn[0].time})`);
    if (dusk.length) bits.push(`${dusk[0].kind.toLowerCase()} water at dusk (${dusk[0].time})`);
    if (bits.length) return `Low light meets a turning tide: ${listUp(bits)}.`;
    if (m.turns.length) return "No turn near sunrise or sunset today.";
    return "No clear turn in today's hourly sea level.";
  }

  /* ---------------- the day after today ---------------- */
  /* Minutes into the local day, so "is it past sunset" can be answered at all — the
     contract's `nowHour` is hour-only, and 19:26 is not the same moment as 19:00. */
  function minuteOfDay(iso) {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(String(iso || ""));
    if (!m) return null;
    return Number(m[2]) * 60 + Number(m[3]);
  }

  /* What the requested fields actually say about tomorrow. Tomorrow's WIND is absent by
     design: the fixed forecast request carries an hourly temperature/weather/precip
     series and no hourly wind, and the beach rule needs wind — so tomorrow can be
     described, never rated. Nothing here runs the beach or fishing rule. */
  function tomorrowFacts(forecast, marine, tomorrow, nowIso) {
    const daily = (forecast && forecast.daily) || {};
    const mHourly = (marine && marine.hourly) || {};
    const dayIndex = (daily.time || []).findIndex((d) => String(d).slice(0, 10) === tomorrow);
    const day = dayIndex >= 0 ? tomorrow : null;
    const at = (arr) => (day ? num((arr || [])[dayIndex]) : null);
    let waveMax = null;
    if (day) {
      const times = mHourly.time || [];
      const levels = mHourly.wave_height || [];
      for (let i = 0; i < times.length; i++) {
        if (String(times[i] || "").slice(0, 10) !== day) continue;
        const v = num(levels[i]);
        if (v !== null && (waveMax === null || v > waveMax)) waveMax = v;
      }
    }
    return {
      day,
      nowMinute: day ? minuteOfDay(nowIso) : null,
      waveMax,
      precipMax: at(daily.precipitation_probability_max),
      tempMax: at(daily.temperature_2m_max),
      code: at(daily.weather_code),
      turns: day ? tideTurns(marine, day) : [],
    };
  }

  /* One word per WMO family, for a line that has no room for the contract's table. */
  const TOMORROW_SKY = {
    0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "cloudy",
    45: "fog", 48: "fog", 95: "thunder", 96: "thunder", 99: "thunder",
  };
  const skyWord = (code) =>
    code === null
      ? null
      : TOMORROW_SKY[code] ||
        (code >= 80 && code <= 82 ? "showers" : code >= 71 && code <= 86 ? "snow" : code >= 51 && code <= 67 ? "rain" : "unsettled");

  /* After sunset, "Beach today" is a verdict on a day that's over, so a quiet line says
     what the data carries for tomorrow: the sea's worst hour, the daily rain/cloud and
     high, and tomorrow's first turns. Facts only — never Good/Fair/Poor, so it cannot
     contradict today's rules, and only ever printed once today has actually ended. */
  function tomorrowLine(m) {
    const n = m.next;
    if (!n || !n.day) return "";
    if (n.nowMinute === null || m.inputs.sunsetMin === null || n.nowMinute <= m.inputs.sunsetMin) return "";
    const units = m.units || "C";
    const bits = [];
    if (n.waveMax !== null) bits.push(`waves up to ${lenText(n.waveMax, units)}`);
    if (n.precipMax !== null && n.precipMax >= 30) bits.push(`${Math.round(n.precipMax)}% rain`);
    else {
      const sky = skyWord(n.code);
      if (sky) bits.push(sky);
    }
    if (n.tempMax !== null) bits.push(`high ${tempText(n.tempMax, units, true)}`);
    /* "Next tide" above already names tomorrow's first turn once today's are spent; say
       it twice in one panel reads as filler, so the turns only appear when that line is
       talking about a later hour today. */
    const next = nextTurn(m);
    const turns =
      next && next.day === "tomorrow" ? [] : (n.turns || []).slice(0, 2).map((t) => `${t.kind.toLowerCase()} ${t.time}`);
    if (turns.length) bits.push(`tide ${listUp(turns)}`);
    if (!bits.length) return "";
    return `<p class="tomorrow"><span class="tomorrow__label">Tomorrow</span> <span class="tomorrow__text">${esc(
      `${bits.join(", ")}.`,
    )}</span></p>`;
  }

  /* A standing answer to "so when do I put the wetsuit on", so the tide panel always
     names the turn still to come, including one that lands tomorrow. When today's tides
     are genuinely over and the forecast has nothing further, say so plainly rather than
     leaving the reader to wonder whether the panel simply broke. */
  function nextLine(m) {
    const next = nextTurn(m);
    if (!next) {
      const done =
        (m.turns || []).length > 0 &&
        m.nowHour !== null &&
        (m.turns || []).every((t) => t.hour <= m.nowHour);
      return done
        ? `<p class="next-turn"><span class="next-turn__now">Today's tides are done.</span></p>`
        : '';
    }
    const rest = (m.turns || []).filter((t) => m.nowHour !== null && t.hour > m.nowHour).slice(1);
    const more = rest.length
      ? ` <span class="next-turn__more">${esc(rest.map((t) => `${t.kind} ${t.time}`).join(" \u00b7 "))}</span>`
      : "";
    return `<p class="next-turn"><span class="next-turn__label">Next tide</span> <span class="next-turn__now">${esc(
      `${next.kind} ${atWords(next)}`,
    )}</span>${more}</p>`;
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
  /* Font sizes as CSS paints them, so label boxes can be measured before the SVG is
     built — the viewBox is 1:1 with the box, so these are px on screen too. */
  const TIME_PX = 10;
  const KIND_PX = 8.5;
  const BAND_BASELINE = 10;

  const boxOf = (text, cx, baseline, px) => {
    const w = String(text).length * px * 0.62;
    return { x1: cx - w / 2, x2: cx + w / 2, y1: baseline - px * 0.82, y2: baseline + px * 0.22 };
  };
  const hits = (b, boxes) => boxes.some((o) => b.x1 < o.x2 && o.x1 < b.x2 && b.y1 < o.y2 && o.y1 < b.y2);

  /* One word per turn, not two. Four turns a day means four times, and adding
     "High"/"Low" beside every one pushes fifteen words into a 366x128 box, where
     they land on the dawn and dusk labels, on the "now" pill and on each other.
     High and low are carried instead by a filled disc and a hollow ring, and by
     which side of the curve their time sits on; the tiles under the chart spell
     each turn out in full. A time is nudged to the other side of the curve, then
     offset, and only dropped as a last resort — a missing label beats a pile.
     `curveClear` answers whether a candidate box keeps clear of the drawn curve,
     which is the other thing a reader notices (the operator, on Sydney's 08:00 and
     Honolulu's 03:00: "a few chart labels sit on top of their dots or on the
     curve"). A turn's own dot is on the curve, so the side that matches its kind is
     clear by construction — but a High pushed BELOW its peak, or a Low above its
     trough, lands right where the water is. */
  function labelTurns(m, x, y, cl, top, bottom, W, occupied, curveClear) {
    const placed = occupied.slice();
    const out = [];
    for (const t of m.turns) {
      const mx = x(t.hour);
      const my = y(t.heightM);
      const high = t.kind === "High";
      const w = String(t.time).length * TIME_PX * 0.66;
      const cx = cl(mx, 2 + w / 2, W - 2 - w / 2);
      const boxAt = (up, dy) => boxOf(t.time, cx, cl(my + (up ? -10 : 16) + dy, top + 8, bottom - 2), TIME_PX);
      /* Nudge further as well as sideways: a turn pinned at the very top of the plot
         has no room above it at all, so the escape is several steps below. */
      const tries = [
        boxAt(high, 0), boxAt(!high, 0),
        boxAt(high, -10), boxAt(!high, 10),
        boxAt(high, 10), boxAt(!high, -10),
        boxAt(!high, 20), boxAt(!high, -20),
        boxAt(high, 20), boxAt(high, -20),
      ];
      const clear = (b) => !hits(b, placed) && curveClear(b);
      const chosen = tries.find(clear);
      if (chosen) placed.push(chosen);
      const label = chosen
        ? `<text x="${cx.toFixed(1)}" y="${(chosen.y2 - TIME_PX * 0.22).toFixed(1)}" text-anchor="middle">${t.time}</text>`
        : "";
      out.push(
        `<g class="tc-turn tc-turn--${t.kind.toLowerCase()}">` +
          `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${high ? "4" : "3.4"}"/>` +
          label +
          `</g>`,
      );
    }
    return out.join("");
  }

  /* Vertical extent of the drawn curve over a pixel span, sampling the same Catmull-Rom
     segments the path is built from. Used to keep a label off the water: the box either
     sits wholly above the highest sample or wholly below the lowest one. */
  function curveSpan(runs, x0, x1) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const pts of runs) {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        for (let s = 0; s <= 12; s++) {
          const t = s / 12;
          const mt = 1 - t;
          const bx = mt ** 3 * p1[0] + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t ** 3 * p2[0];
          if (bx < x0 || bx > x1) continue;
          const by = mt ** 3 * p1[1] + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t ** 3 * p2[1];
          if (by < lo) lo = by;
          if (by > hi) hi = by;
        }
      }
    }
    return hi === -Infinity ? null : [lo, hi];
  }

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
    let lo = vals.length ? Math.min(...vals) : -1;
    let hi = vals.length ? Math.max(...vals) : 1;
    /* A dead-flat sea (real at some model points) would otherwise pin its line to the
       floor of the box; centre it instead, so "flat" reads as flat. */
    if (hi - lo < 0.05) {
      const mid = (hi + lo) / 2;
      lo = mid - 0.5;
      hi = mid + 0.5;
    }
    const span = hi - lo;
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
        `<text class="tc-bandlabel" x="${((from + to) / 2).toFixed(1)}" y="${BAND_BASELINE}" text-anchor="middle">${label}</text>`
      );
    };
    /* The ruler along the bottom (hour ticks and the "now" pill) and the strip above
       the plot (dawn and dusk) are already owned; a turn's labels must not walk into
       either, so their boxes are registered here before labelling starts. */
    const HOUR_PX = 9.5;
    const pillW = 30;
    const nowX = m.nowHour === null ? null : x(m.nowHour);
    const nowY = m.nowHour === null || m.series[m.nowHour] === null ? null : y(m.series[m.nowHour]);
    const nowPillX = nowX === null ? null : cl(nowX - pillW / 2, 2, W - pillW - 2);
    const nowTextX = nowX === null ? null : cl(nowX, 2 + pillW / 2, W - pillW / 2 - 2);

    const occupied = [
      { x1: 0, x2: W, y1: 0, y2: top - 1 },
      { x1: 0, x2: W, y1: bottom + 1, y2: H },
      ...(nowX === null ? [] : [{ x1: nowPillX, x2: nowPillX + pillW, y1: H - 17, y2: H - 4 }]),
      ...[0, 6, 12, 18, 23].map((h) => {
        const anchor = h === 0 ? "start" : h === 23 ? "end" : "middle";
        const cx = x(h);
        const w = HOUR_PX * 0.66 * 2;
        const left = anchor === "start" ? cx : anchor === "end" ? cx - w : cx - w / 2;
        return { x1: left, x2: left + w, y1: H - 6 - HOUR_PX * 0.82, y2: H - 6 + HOUR_PX * 0.22 };
      }),
    ];

    /* A label has to clear the water itself, not just the other words. The box here is
       estimated from the font size (boxOf), and an estimate that is 1-2px optimistic
       reads as "the label is touching the line", so the box is inflated a touch before
       it is compared. */
    const CURVE_PAD_PX = 3;
    const curveClear = (b) => {
      const span = curveSpan(runs, b.x1, b.x2);
      if (!span) return true;
      return b.y2 + CURVE_PAD_PX <= span[0] || b.y1 - CURVE_PAD_PX >= span[1];
    };
    const marks = labelTurns(m, x, y, cl, top, bottom, W, occupied, curveClear);

    const hours = [0, 6, 12, 18, 23]
      .map(
        (h) =>
          `<text class="tc-hour" x="${x(h).toFixed(1)}" y="${H - 6}" text-anchor="${h === 0 ? "start" : h === 23 ? "end" : "middle"}">${String(h).padStart(2, "0")}</text>`,
      )
      .join("");

    const now =
      nowX === null
        ? ""
        : `<g class="tc-now">` +
          `<line x1="${nowX.toFixed(1)}" y1="${top}" x2="${nowX.toFixed(1)}" y2="${bottom + 2}"/>` +
          (nowY === null ? "" : `<circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="4.6"/>`) +
          `<rect class="tc-nowpill" x="${nowPillX.toFixed(1)}" y="${H - 17}" width="${pillW}" height="13" rx="6.5"/>` +
          `<text x="${nowTextX.toFixed(1)}" y="${H - 7}" text-anchor="middle">now</text>` +
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
    const units = m.units || "C";
    const v = {
      beach: beachVerdict(m.inputs, units),
      fishing: fishingVerdict(m.inputs, units),
    };
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

    /* The trend rides in the tides header, where it is read against the chart; the
       phone gives that row the whole width and drops the kicker line, because the
       hero above already says where we are. */
    const trendChip = `<span class="tide-trend">${Icons.waterIcon("tide", { size: 13 })}Tide <span data-testid="tide-trend">${esc(m.trend || "Steady")}</span></span>`;

    return `
      <p class="water__kicker">${Icons.waterIcon("wave", { size: 14 })} ${esc(m.place || "Today at the water")}</p>
      <div class="ratings">
        ${ratingCard("beach", "Beach today", v.beach, "beach")}
        ${ratingCard("fishing", "Fishing today", v.fishing, "fish")}
      </div>
      <p class="water__disclaimer">An outlook from today's model data, not a promise.</p>
      <section class="water__panel tide">
        <p class="tide__head">
          <span class="water__subtitle">Tides today</span>
          ${trendChip}
        </p>
        <div class="tide-chart" data-testid="tide-chart"></div>
        ${
          m.turns.length
            ? `<p class="tide-legend" aria-hidden="true">
              <span class="tide-legend__mark tide-legend__mark--high"></span> high
              <span class="tide-legend__mark tide-legend__mark--low"></span> low
              <span class="tide-legend__now"></span> now
            </p>`
            : ""
        }
        <ul class="tide-events">${events}</ul>
        ${nextLine(m)}
        ${tomorrowLine(m)}
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
    nextTurn,
    nextLine,
    tomorrowLine,
    tomorrowFacts,
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
    let lastH = 0;
    const draw = () => {
      const w = box.clientWidth || 0;
      const h = box.clientHeight || 136;
      if (!w) return false;
      /* Only repaint when the box actually changes size, otherwise a repaint would
         wipe a text selection out from under someone reading the page. Height counts
         too: on a wide screen the chart is the flexible block in its column, so it
         grows with the column rather than keeping the size it first happened to get. */
      if (w === lastW && h === lastH) return true;
      lastW = w;
      lastH = h;
      box.innerHTML = tideChart(m, w, h);
      return true;
    };
    if (!draw() && typeof requestAnimationFrame === "function") requestAnimationFrame(draw);
    if (typeof ResizeObserver === "function") {
      if (box.__tideResize) box.__tideResize.disconnect();
      const ro = new ResizeObserver(() => {
        if (Math.abs(box.clientWidth - lastW) > 1 || Math.abs(box.clientHeight - lastH) > 1) draw();
      });
      ro.observe(box);
      box.__tideResize = ro;
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
