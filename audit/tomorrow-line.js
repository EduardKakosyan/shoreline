/* The after-sunset "Tomorrow" line: facts only, and only once today has ended.
   The operator asked for a quiet line about tomorrow after sunset, "if it never
   contradicts today's rules". Nothing in checks/ can catch a regression here — every
   fixture answers current.time = 12:00, so the line never renders under the suite.
   Pinned here:
     1. it never prints Good / Fair / Poor for tomorrow (the fixed forecast request has
        no hourly wind, and the beach rule needs wind, so a rating word would be a guess);
     2. it never contradicts today: it is absent until the moment is strictly after
        sunset, and it speaks only about tomorrow;
     3. its facts are read from tomorrow's own fields and convert with the unit toggle;
     4. it degrades to nothing at all when the data carries nothing for tomorrow;
     5. it repeats no tide turn that "Next tide" in the same panel has already named.
   Run: node audit/tomorrow-line.js */
globalThis.window = globalThis; // water.js's html() draws icon marks, which live on window.Icons
require('../icons.js');
require('../water.js');
const W = globalThis.Water;

let fails = 0;
const check = (name, ok, detail) => {
  if (ok) console.log(`ok   ${name}`);
  else {
    fails++;
    console.log(`FAIL ${name}${detail === undefined ? '' : `\n  ${detail}`}`);
  }
};

const DATES = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
const TIMES = DATES.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`));
const SUNSET_MIN = 19 * 60 + 26;

const forecast = (over = {}) => ({
  current: {
    time: '2026-09-24T21:27',
    temperature_2m: 24.6,
    relative_humidity_2m: 58,
    weather_code: 1,
    wind_speed_10m: 9.8,
    is_day: 0,
    ...(over.current || {}),
  },
  hourly: {
    time: TIMES,
    temperature_2m: TIMES.map((_, i) => 20 + (i % 24)),
    weather_code: TIMES.map(() => 1),
    is_day: TIMES.map(() => 0),
    precipitation_probability: TIMES.map(() => 5),
    ...(over.hourly || {}),
  },
  daily: {
    time: DATES,
    weather_code: [1, 2, 0, 1, 3],
    temperature_2m_max: [25.8, 24.3, 26.1, 23.6, 22.4],
    temperature_2m_min: [17.4, 18.1, 17.6, 18.9, 16.4],
    precipitation_probability_max: [5, 60, 0, 5, 20],
    sunrise: DATES.map((d) => `${d}T07:12`),
    sunset: DATES.map((d) => `${d}T19:26`),
    ...(over.daily || {}),
  },
});

/* A semi-diurnal sea level whose peaks land away from dawn/dusk, plus a wave series that
   rises through the day so "tomorrow's worst hour" is distinguishable from today's. */
const marine = (over = {}) => {
  const level = TIMES.map((_, i) => {
    const x = (2 * Math.PI * (i - 13.3)) / 12.42;
    return Math.round((1.33 * Math.cos(x) + 0.12 * Math.cos(x / 2)) * 100) / 100;
  });
  const waves = TIMES.map((_, i) => Math.round((0.5 + 0.02 * (i % 24)) * 100) / 100);
  return {
    current: { wave_height: 0.6, wave_period: 9.4, swell_wave_direction: 290, sea_surface_temperature: 20.6 },
    hourly: { time: TIMES, sea_level_height_msl: level, wave_height: waves },
    ...over,
  };
};

const model = (fOpts, mOpts, units = 'C') => {
  const m = W.model(forecast(fOpts), marine(mOpts));
  m.units = units;
  return m;
};
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/* ---- 1. it stays quiet until today is actually over ---------------------- */
const quietAt = (iso) => {
  const m = model({ current: { time: iso } });
  return text(W.tomorrowLine(m)) === '';
};
check('quiet at midday', quietAt('2026-09-24T12:00'));
check('quiet at sunset exactly (19:26 is not after 19:26)', quietAt('2026-09-24T19:26'));
check('quiet at 19:25', quietAt('2026-09-24T19:25'));
check('speaks at 19:27, one minute after sunset', !quietAt('2026-09-24T19:27'));
/* The trap this guards: an hour-only clock would call 19:27 the same hour as a 19:00
   sunset and print "tomorrow" while the day is still up. */
const mEarlyEvening = model({ current: { time: '2026-09-24T19:00' } });
check(
  'quiet at 19:00 even though the current HOUR equals the sunset hour',
  text(W.tomorrowLine(mEarlyEvening)) === '',
  text(W.tomorrowLine(mEarlyEvening)),
);
check('sunset time really is 19:26 in the model', mEarlyEvening.inputs.sunsetMin === SUNSET_MIN, String(mEarlyEvening.inputs.sunsetMin));

/* ---- 2. never a rating word, for any data the APIs can answer ------------ */
const CODES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
const WAVES = [0, 0.4, 1.2, 2.4, 6];
const PRECIPS = [0, 25, 30, 59, 60, 100];
const MAXES = [-8, 15.5, 22, 31];
/* Stormy today (Poor/Poor) and calm today are both read, so a rating word leaking from
   today's verdict into the tomorrow line cannot hide behind one data set. */
const stormy = {
  current: { temperature_2m: 12, weather_code: 95, wind_speed_10m: 48 },
  daily: {
    weather_code: [95, 65, 3, 61, 80],
    temperature_2m_max: [13.1, 12.4, 14.0, 13.2, 12.8],
    precipitation_probability_max: [85, 90, 70, 80, 88],
  },
};
let swept = 0;
const ratingWord = /\b(good|fair|poor)\b/i;
for (const code of CODES) {
  for (const waveBase of WAVES) {
    for (const p of PRECIPS) {
      for (const hi of MAXES) {
        const m = model(
          {
            current: { weather_code: code },
            daily: { weather_code: [code, code, code, code, code], precipitation_probability_max: [p, p, p, p, p], temperature_2m_max: [hi, hi, hi, hi, hi] },
          },
          { hourly: { wave_height: TIMES.map((_, i) => waveBase + 0.01 * (i % 24)) } },
        );
        const line = text(W.tomorrowLine(m));
        swept++;
        if (ratingWord.test(line)) {
          check(`no rating word for code=${code} waves=${waveBase} precip=${p} max=${hi}`, false, line);
        }
        if (/nan|undefined|null|—\s*°|°C m|m ft/i.test(line)) {
          check(`no broken formatting for code=${code} waves=${waveBase} precip=${p} max=${hi}`, false, line);
        }
      }
    }
  }
}
check(`${swept} data combinations, no rating word and no broken formatting`, true);
const mStorm = model(stormy);
const stormLine = text(W.tomorrowLine(mStorm));
check('a stormy today still yields no rating word tomorrow', !ratingWord.test(stormLine), stormLine);
const todayLine = text(W.html(model(stormy)));
check(
  'today keeps its verdict words (the line does not mute them)',
  ratingWord.test(todayLine),
);

/* ---- 3. facts come from tomorrow's own fields, and convert --------------- */
const mC = model();
const lineC = text(W.tomorrowLine(mC));
const mF = model({}, {}, 'F');
const lineF = text(W.tomorrowLine(mF));
const waveMaxTomorrow = Math.max(...TIMES.map((t, i) => (t.slice(0, 10) === '2026-09-25' ? marine().hourly.wave_height[i] : -1)));
check(
  `metric wave bit uses tomorrow's peak (${waveMaxTomorrow.toFixed(1)} m), not today's`,
  lineC.includes(`waves up to ${waveMaxTomorrow.toFixed(1)} m`),
  lineC,
);
check('metric high uses the °C suffix', lineC.includes(`high ${Math.round(24.3)}°C`), lineC);
check(
  'fahrenheit converts the same high',
  lineF.includes(`high ${Math.round((24.3 * 9) / 5 + 32)}°F`),
  lineF,
);
check('fahrenheit converts the same wave height', lineF.includes(`${(waveMaxTomorrow * 3.28084).toFixed(1)} ft`), lineF);
check(
  'rain percentage is never converted',
  lineC.includes('60% rain') && lineF.includes('60% rain'),
  `${lineC} / ${lineF}`,
);
check(
  'the rain percentage is tomorrow\'s, not today\'s',
  !lineC.includes('5%'),
  lineC,
);
const mDry = model({ daily: { precipitation_probability_max: [5, 0, 0, 0, 0] } });
check('dry tomorrow falls back to a sky word', /\b(clear|mostly clear|partly cloudy|cloudy|fog|thunder|rain|snow|showers|unsettled)\b/.test(text(W.tomorrowLine(mDry))), text(W.tomorrowLine(mDry)));
check(
  'a thunder code reads as thunder',
  text(W.tomorrowLine(model({ daily: { weather_code: [1, 96, 96, 96, 96], precipitation_probability_max: [5, 0, 0, 0, 0] } }))).includes('thunder'),
);
check(
  'a rain code reads as rain, a shower code as showers, snow as snow',
  text(W.tomorrowLine(model({ daily: { weather_code: [1, 63, 63, 63, 63], precipitation_probability_max: [5, 0, 0, 0, 0] } }))).includes('rain') &&
    text(W.tomorrowLine(model({ daily: { weather_code: [1, 80, 80, 80, 80], precipitation_probability_max: [5, 0, 0, 0, 0] } }))).includes('showers') &&
    text(W.tomorrowLine(model({ daily: { weather_code: [1, 73, 73, 73, 73], precipitation_probability_max: [5, 0, 0, 0, 0] } }))).includes('snow'),
);

/* ---- 4. nothing to say when the data carries nothing --------------------- */
check(
  'silent when the forecast has no tomorrow',
  text(W.tomorrowLine(model({ daily: { time: ['2026-09-24'] } }))) === '',
);
const mNoMarineHourly = model({ daily: {} }, { hourly: { time: TIMES, sea_level_height_msl: TIMES.map(() => null) } });
const noMarineLine = text(W.tomorrowLine(mNoMarineHourly));
check('silent when marine carries no hourly at all', noMarineLine === '' || !/waves up to/.test(noMarineLine), noMarineLine);
check(
  'a marine answer with nulls says nothing about waves',
  !/waves up to/.test(
    text(
      W.tomorrowLine(
        model({}, { hourly: { time: TIMES, sea_level_height_msl: TIMES.map(() => null), wave_height: TIMES.map(() => null) } }),
      ),
    ),
  ),
);
check(
  'a missing daily high is dropped, not printed as NaN°',
  !/NaN/.test(
    text(
      W.tomorrowLine(
        model({
          daily: { temperature_2m_max: [25.8, null, 26.1, 23.6, 22.4], precipitation_probability_max: [5, null, 0, 0, 0], weather_code: [1, null, 0, 0, 0] },
        }),
      ),
    ),
  ),
);
check(
  'everything missing renders as an empty string, never "Tomorrow ."',
  text(
    W.tomorrowLine(
      model(
        { daily: { temperature_2m_max: [25.8, null, null, null, null], precipitation_probability_max: [5, null, null, null, null], weather_code: [1, null, null, null, null] } },
        { hourly: { time: TIMES, sea_level_height_msl: TIMES.map(() => null), wave_height: TIMES.map(() => null) } },
      ),
    ),
  ) === '',
);

/* ---- 5. no turn named twice inside one panel ---------------------------- */
const evening = model({ current: { time: '2026-09-24T19:45' } });
const nextStillToday = W.nextTurn(evening);
check('at 19:45 "next" is still a turn today', nextStillToday && nextStillToday.day === 'today', JSON.stringify(nextStillToday));
const turns1945 = text(W.tomorrowLine(evening));
check(
  'while "next tide" is today\'s, tomorrow names its first turns',
  /tide (high|low) \d\d:00/.test(turns1945),
  turns1945,
);
const late = model({ current: { time: '2026-09-24T21:27' } });
const nextIsTomorrow = W.nextTurn(late);
check('at 21:27 "next tide" already points at tomorrow', nextIsTomorrow && nextIsTomorrow.day === 'tomorrow', JSON.stringify(nextIsTomorrow));
const turns2127 = text(W.tomorrowLine(late));
check(
  'so the tomorrow line names no tide at all — the panel says it once',
  !/tide (high|low)/.test(turns2127),
  turns2127,
);
check(
  '"Next tide" itself still names tomorrow',
  /tomorrow at \d\d:00/.test(text(W.nextLine(late))),
  text(W.nextLine(late)),
);

/* ---- 6. it lives in the tide panel, not under the verdicts -------------- */
const page = W.html(late);
const panel = page.slice(page.indexOf('class="water__panel tide"'));
check('the line is inside the tide panel', /class="tomorrow"/.test(panel));
const verdicts = page.slice(0, page.indexOf('class="water__panel tide"'));
check('and not under the verdict cards', !/class="tomorrow"/.test(verdicts));
const order = [page.indexOf('class="next-turn"'), page.indexOf('class="tomorrow"'), page.indexOf('class="best-times"')];
check('it reads after "Next tide" and before the dawn/dusk note', order.every((n) => n > 0) && order[0] < order[1] && order[1] < order[2], JSON.stringify(order));
check('the daytime render carries no tomorrow line at all', !/class="tomorrow"/.test(W.html(model({ current: { time: '2026-09-24T12:00' } }))));

/* ---- 7. the markup is escaped and carries no test ids ------------------- */
const raw = W.tomorrowLine(late);
check('no data-testid inside it (it is polish, not contract)', !/data-testid/.test(raw), raw);
check('its label is exactly "Tomorrow"', /<span class="tomorrow__label">Tomorrow<\/span>/.test(raw), raw);
check('the text span is escaped', /<span class="tomorrow__text">[^<]*<\/span>/.test(raw), raw);

console.log(fails ? `\n${fails} FAILURE(S)` : '\nTOMORROW LINE OK');
process.exit(fails ? 1 : 0);
