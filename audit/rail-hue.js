/* The operator's third note: "in the light theme, the forecast temperature bars for
   cool days (about 12-17 degrees) come out olive or brown. They read as muddy. Cool
   should look cool." Nothing measured that, so this does. It reads the colour each
   temperature bucket actually paints with - the rail segment's computed fill and the
   numbers beside it - in both themes, and asserts:
     - cold/cool/mild land in the cool part of the wheel, never in the olive/brown
       band, which is what made a mild day read as mud;
     - warm/hot stay in the warm band, so the scale still separates hot from cool;
     - every bucket is saturated enough to read as a colour, not a grey;
     - a rail segment is distinguishable from its card and from its own track (>=3:1)
       and the temperature text carrying that colour stays readable (>=4.5:1);
     - every bucket really paints on screen in both themes, not just on a swatch;
     - a day is coloured by the number printed beside it: two days that both print
       "10 degrees" may not be coloured as two different temperatures.
   Run: node audit/rail-hue.js */
const { chromium } = require('@playwright/test');
const { installStub, setTheme, typeCity, searchMapFor, fullLabel } = require('./stub.js');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const BUCKETS = ['cold', 'cool', 'mild', 'warm', 'hot'];
const COOL = new Set(['cold', 'cool', 'mild']);
/* Olive, ochre, brown: the muddy reading the operator objected to. */
const MUD = [25, 110];
const COOL_BAND = [130, 300];
/* No single fixture week spans the scale, so three readings cover it. The patched
   week straddles the cool/mild line with two days that both print 10 degrees:
   9.6 and 10.3 rounded, so a bucket taken from the raw value colours one number
   two ways. */
const WEEKS = [
  { key: 'london_ca', label: 'the 12-18 degree week' },
  { key: 'london_oh', label: 'the mild-to-hot week' },
  {
    key: 'london_gb',
    label: 'the boundary week',
    city: { key: 'london_gb', currentCode: 2, isDay: 1, highs: [-0.4, 5.2, 9.6, 10.3, 30.1], lows: [-6, 1, 6, 7, 22] },
  },
];

const READ = `(() => {
  var rgbOf = function (s) {
    var m = String(s).match(/rgba?\\(([-\\d.]+)[,\\s]+([-\\d.]+)[,\\s]+([-\\d.]+)(?:[,\\s/]+([-\\d.]+))?/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  };
  /* first opaque background at or above this element - the check's own rule */
  var opaqueOver = function (el) {
    var n = el;
    while (n && n.nodeType === 1) {
      var c = rgbOf(getComputedStyle(n).backgroundColor);
      if (c && c.a >= 0.95) return c;
      n = n.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  var out = { vars: {}, rows: [] };
  ['cold','cool','mild','warm','hot'].forEach(function (b) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue('--temp-' + b).trim();
    if (rgbOf(raw)) { out.vars[b] = rgbOf(raw); return; }
    /* a var() only resolves through a property that accepts a colour */
    var probe = document.createElement('div');
    probe.style.color = raw;
    probe.style.display = 'none';
    document.body.appendChild(probe);
    out.vars[b] = rgbOf(getComputedStyle(probe).color);
    probe.remove();
  });
  [].slice.call(document.querySelectorAll('[data-testid="forecast-day"]')).forEach(function (row) {
    var range = row.querySelector('.day__range');
    var fill = row.querySelector('.rail-fill');
    var track = range ? range.querySelector('rect') : null;
    var high = row.querySelector('.day-high');
    var low = row.querySelector('.day-low');
    if (!fill || !high || !range) return;
    var fb = fill.getBoundingClientRect();
    var name = row.querySelector('[data-testid="day-name"]');
    out.rows.push({
      label: name ? name.textContent.trim() : '?',
      high: high.textContent.trim(),
      fillClass: [].slice.call(fill.classList).filter(function (c) { return c.indexOf('rail-fill--') === 0; })[0] || '',
      fill: getComputedStyle(fill).fill,
      track: track ? (getComputedStyle(track).fill || '') : '',
      trackAttr: track ? (track.getAttribute('fill') || '') : '',
      highColor: getComputedStyle(high).color,
      lowColor: low ? getComputedStyle(low).color : '',
      card: opaqueOver(range),
      painted: fb.width > 3 && fb.height > 1 && fb.height < 40,
      box: [Math.round(fb.width), Math.round(fb.height)]
    });
  });
  return out;
})()`;

const rgb = (s) => {
  const m = String(s).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
};
const lum = ({ r, g, b }) => {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const hsl = ({ r, g, b }) => {
  const [R, G, B] = [r, g, b].map((v) => v / 255);
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
};

(async () => {
  const problems = [];
  const lines = [];
  const browser = await chromium.launch();

  for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await installStub(page, { search: searchMapFor(WEEKS.map((w) => w.key)) });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await setTheme(page, theme);

    const rows = [];
    let vars = null;
    for (const week of WEEKS) {
      await installStub(page, {
        search: searchMapFor(WEEKS.map((w) => w.key)),
        city: week.city || { key: week.key, currentCode: 2, isDay: 1 },
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await typeCity(page, fullLabel(week.key));
      await page.waitForSelector('[data-testid="forecast-days"]:not([hidden])');
      const read = await page.evaluate(READ);
      if (!read.rows.length) problems.push(`${theme}: ${week.label} rendered no forecast rows`);
      rows.push(...read.rows.map((r) => ({ ...r, week: week.label })));
      if (!vars) vars = read.vars;
    }

    for (const b of BUCKETS) {
      const c = vars && vars[b];
      if (!c) {
        problems.push(`${theme}: --temp-${b} did not resolve to a colour`);
        continue;
      }
      const { h, s } = hsl(c);
      if (COOL.has(b)) {
        if (h >= MUD[0] && h <= MUD[1]) problems.push(`${theme}: ${b} bucket is hue ${h.toFixed(0)} - olive/brown, the muddy reading`);
        if (h < COOL_BAND[0] || h > COOL_BAND[1]) problems.push(`${theme}: ${b} bucket hue ${h.toFixed(0)} is outside the cool band ${COOL_BAND.join('-')}`);
      } else if (h > 55 && h < 320) {
        problems.push(`${theme}: ${b} bucket hue ${h.toFixed(0)} is not warm - the scale cannot separate hot from cool`);
      }
      if (s < 0.15) problems.push(`${theme}: ${b} bucket saturation ${(s * 100).toFixed(0)}% reads as grey, not a colour`);
      lines.push(`${theme}  var   ${b.padEnd(5)} hsl(${h.toFixed(0).padStart(3)} ${(s * 100).toFixed(0)}%)`);
    }

    const seen = new Set();
    const printed = new Map();
    for (const r of rows) {
      if (!r.painted) problems.push(`${theme}: ${r.week} ${r.label} rail segment not painted (${r.box})`);
      const fill = rgb(r.fill);
      const high = rgb(r.highColor);
      const track = rgb(r.track && r.track !== 'none' ? r.track : r.trackAttr);
      const bucket = r.fillClass.replace('rail-fill--', '');
      if (!fill || !high) {
        problems.push(`${theme}: ${r.week} ${r.label} rail/number colour unparseable (${r.fill} / ${r.highColor})`);
        continue;
      }
      seen.add(bucket);
      if (printed.has(r.high) && printed.get(r.high) !== bucket) {
        problems.push(`${theme}: days printing ${r.high} are coloured ${printed.get(r.high)} and ${bucket} - the rail contradicts the number`);
      }
      if (!printed.has(r.high)) printed.set(r.high, bucket);

      const fh = hsl(fill);
      const vsCard = contrast(fill, r.card);
      const vsTrack = track ? contrast(fill, track) : 1;
      const highRatio = contrast(high, r.card);
      const low = rgb(r.lowColor);
      const lowRatio = low ? contrast(low, r.card) : highRatio;
      if (COOL.has(bucket) && fh.h >= MUD[0] && fh.h <= MUD[1]) {
        problems.push(`${theme}: ${r.week} ${r.label} (${r.high}) rail paints hue ${fh.h.toFixed(0)} on screen - muddy`);
      }
      if (vsCard < 3) problems.push(`${theme}: ${r.label} rail vs card ${vsCard.toFixed(2)}:1 < 3:1 - the segment disappears`);
      if (track && vsTrack < 3) problems.push(`${theme}: ${r.label} rail vs track ${vsTrack.toFixed(2)}:1 < 3:1 - the span is unreadable`);
      if (highRatio < 4.5) problems.push(`${theme}: ${r.label} day-high text ${highRatio.toFixed(2)}:1 < 4.5:1`);
      if (lowRatio < 4.5) problems.push(`${theme}: ${r.label} day-low text ${lowRatio.toFixed(2)}:1 < 4.5:1`);
      lines.push(
        `${theme}  row   ${r.label} ${r.high.padStart(4)} ${bucket.padEnd(5)} hsl(${fh.h.toFixed(0).padStart(3)} ${(fh.s * 100).toFixed(0)}%)` +
          ` vsCard ${vsCard.toFixed(2)} vsTrack ${vsTrack.toFixed(2)} high ${highRatio.toFixed(2)} low ${lowRatio.toFixed(2)}`,
      );
    }
    for (const b of BUCKETS) {
      if (!seen.has(b)) problems.push(`${theme}: no ${b} day rendered, so that part of the scale was never measured on screen`);
    }
    await page.close();
  }

  await browser.close();
  for (const l of lines) console.log('  ' + l);
  console.log('');
  if (problems.length) {
    problems.forEach((p) => console.log('FAIL ' + p));
    console.log(`RAIL HUE: ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log('RAIL HUE CLEAN');
})();
