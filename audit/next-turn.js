/* "Next tide" must always point forward.
   The operator's complaint: at 10:27 Honolulu said "the next low is at 10:00", and at
   21:27 Cascais said "the next low is at 21:00". A person at the car park must never be
   handed a time that has already gone. Nothing in checks/ reads this line, so it is
   pinned here: for every hour of the day the answer is either strictly later today, or
   the first of tomorrow's turns, or genuinely absent.
   Run: node audit/next-turn.js */
require('../water.js');
const W = globalThis.Water;

let fails = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    fails++;
    console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
  } else console.log(`ok   ${name}`);
};

const DAY_DATES = ['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
const TIMES = DAY_DATES.flatMap((d) =>
  Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`),
);

const forecast = (hour) => ({
  current: {
    time: `2026-09-24T${String(hour).padStart(2, '0')}:00`,
    temperature_2m: 24,
    weather_code: 0,
    wind_speed_10m: 10,
  },
  daily: {
    time: DAY_DATES,
    weather_code: [0, 0, 1, 2, 1],
    precipitation_probability_max: [10, 10, 10, 10, 10],
    sunrise: DAY_DATES.map((d) => `${d}T07:12`),
    sunset: DAY_DATES.map((d) => `${d}T19:26`),
  },
});

const marine = (levels) => ({
  current: { wave_height: 0.6, wave_period: 9, swell_wave_direction: 290, sea_surface_temperature: 20 },
  hourly: { time: TIMES, sea_level_height_msl: levels },
});

/* The operator's Honolulu, shaped as they described it: a plateau high at 03:00-04:00,
 * a low at 09:00, a High at 15:00, a plateau low at 21:00-22:00, and tomorrow's first
 * turn (a High) at 03:00. */
const HONOLULU = [
  0.5, 0.7, 0.85, 0.93, 0.93, 0.8, 0.6, 0.45, 0.3, 0.26, 0.26, 0.3,
  0.5, 0.68, 0.8, 0.95, 0.9, 0.8, 0.6, 0.45, 0.35, 0.26, 0.26, 0.35,
  0.55, 0.72, 0.88, 0.96, 0.96, 0.9, 0.75, 0.6, 0.44, 0.3, 0.24, 0.24,
  0.3, 0.46, 0.62, 0.78, 0.9, 0.95, 0.9, 0.8, 0.64, 0.5, 0.38, 0.3,
];
const noTomorrow = HONOLULU.slice(0, 24).concat(Array(TIMES.length - 24).fill(null));

const pad = (h) => String(h).padStart(2, '0');
/* The visible answer, as a reader sees it: "High at 15:00" or "High tomorrow at 03:00". */
const nextLineText = (m) => {
  const html = W.nextLine(m);
  const now = /<span class="next-turn__now">([^<]*)<\/span>/.exec(html);
  return now ? now[1] : '';
};

const checkSeries = (label, levels) => {
  for (let hour = 0; hour < 24; hour++) {
    const m = W.model(forecast(hour), marine(levels));
    const answer = W.nextTurn(m);
    const text = nextLineText(m);
    const todays = m.turns.filter((t) => t.hour > hour);
    const want = todays.length
      ? { kind: todays[0].kind, time: todays[0].time, day: 'today' }
      : m.laterTurns.length
        ? { kind: m.laterTurns[0].kind, time: m.laterTurns[0].time, day: 'tomorrow' }
        : null;
    check(`${label} @${pad(hour)}:30 next turn`, answer ? { kind: answer.kind, time: answer.time, day: answer.day } : null, want);
    // the printed words, never a time that has gone
    if (!want) {
      check(`${label} @${pad(hour)}:30 prints no stale time`, /at \d{2}:00/.test(text), false);
      continue;
    }
    check(`${label} @${pad(hour)}:30 prints "${want.kind} ${want.day === 'tomorrow' ? 'tomorrow ' : ''}at ${want.time}"`, text, want.day === 'tomorrow' ? `${want.kind} tomorrow at ${want.time}` : `${want.kind} at ${want.time}`);
    if (want.day === 'today') {
      const printed = Number(/at (\d{2}):00/.exec(text)[1]);
      check(`${label} @${pad(hour)}:30 printed hour is in the future`, printed > hour, true);
    } else {
      check(`${label} @${pad(hour)}:30 says tomorrow`, text.includes('tomorrow'), true);
    }
  }
};

checkSeries('honolulu', HONOLULU);

/* The two examples the operator named. */
{
  const m10 = W.model(forecast(10), marine(HONOLULU));
  check('Honolulu at 10:27 names the 15:00 High', nextLineText(m10), 'High at 15:00');
  const m21 = W.model(forecast(21), marine(HONOLULU));
  check('at 21:27 the 21:00 low is not called next', nextLineText(m21).includes('at 21:00'), false);
  check('at 21:27 the answer is tomorrow', /^High tomorrow at 03:00$/.test(nextLineText(m21)), true);
  const m23 = W.model(forecast(23), marine(HONOLULU));
  check('at 23:30 still future', nextLineText(m23), 'High tomorrow at 03:00');
  // after today's last turn with no tomorrow data at all, say plainly the day is done
  const mFlat = W.model(forecast(23), marine(noTomorrow));
  check('today-only series at 23:30 says the tides are done', nextLineText(mFlat), "Today's tides are done.");
  const mNoTomorrowLate = W.model(forecast(21), marine(noTomorrow));
  check('today-only series at 21:30 is honest that they are done', nextLineText(mNoTomorrowLate), "Today's tides are done.");
  check('and never a stale time', /\d{2}:00/.test(nextLineText(mNoTomorrowLate)), false);
  // a flat day with no turns at all stays silent rather than claiming anything
  const noTurns = TIMES.map(() => 0.4);
  check('flat day prints no next-tide line', W.nextLine(W.model(forecast(12), marine(noTurns))), '');
}

/* The acceptance suite's Cascais fixture, late in the evening. */
{
  const T = 12.42;
  const levels = TIMES.map((_, h) => Math.round((1.33 * Math.cos((2 * Math.PI * (h - 13.3)) / T) + 0.12 * Math.cos((2 * Math.PI * (h - 13.3)) / (2 * T))) * 100) / 100);
  checkSeries('cascais-fixture', levels);
  const m = W.model(forecast(21), marine(levels));
  check('Cascais at 21:27 never quotes 21:00', nextLineText(m).includes('at 21:00'), false);
  console.log(`     cascais 21:27 -> ${nextLineText(m)}`);
  console.log(`     cascais 12:00 -> ${nextLineText(W.model(forecast(12), marine(levels)))}`);
  console.log(`     honolulu 10:27 -> ${nextLineText(W.model(forecast(10), marine(HONOLULU)))}`);
}

process.exit(fails ? 1 : 0);
