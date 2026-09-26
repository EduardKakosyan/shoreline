# Shoreline — repository notes

Static, dependency-free app (`index.html` + `styles.css` + `icons.js` + `water.js` +
`app.js`): a companion for a day at the water — beach/fishing verdicts, tides, sea state
and moon for coastal places, and the weather app it was for everywhere else. Served
as-is by `tools/serve.js` on port 3000 (`GET /` returns the app). No build step, no
framework, no runtime CDN. The browser calls Open-Meteo directly.

`checks/` is a copy of the acceptance suite (from `/brief/checks`) kept only so the
suite can run locally — **never tune it to make it pass**. Run it with
`APP_URL=http://localhost:3000 npx playwright test`, or everything at once with
`sh tools/verify.sh` (suite twice + every design harness).

## Non-obvious constraints (learned the hard way)

- **Contrast/coverage math**: `checks/visual.ts` walks up from an element to the first
  opaque background, treating **every CSS gradient colour stop as a candidate** and
  keeping the worst ratio. Complementary trick used here: decorative paint (the
  day-range bars, the icons) is **inline SVG**, invisible to that math, so it can
  never fail contrast or coverage. Never paint a gradient onto a DOM element that
  text sits on — the hero's sky is the one exception, and it pays for it with the
  per-stop contrast ceiling described below.
- **Never dim text with `opacity`/`rgba` text colour.** The checker composites partial
  alpha into the foreground and reads a washed-out ratio (this measured 1.22:1 once).
  Build hierarchy from size/weight only. Entrance animations are transform-only.
- An element **wider than the viewport is an overflow finding even when a parent
  clips it visually** — keep SVG decor inside the `viewBox`.
- Hero `background-color` equals the gradient midpoint (`--hero-solid`) so coverage
  sampling finds an opaque colour that text was measured against. All 12 palettes
  clear 6:1 worst-case: `python3 tools/palette-check.py` reads the tokens straight
  from `styles.css`, so the table cannot drift.
- Hour items must stay **non-interactive** (`div`, not `button`) to be exempt from the
  44px rule; the `hour-label` text must be exactly the `HH:00` slice, so the "Now" /
  "Tomorrow" affordances live in a separate `aria-hidden` slot.
- **Nothing is painted around the hero's weather mark.** No tile, no fill, no
  hairline, no haze bloom, no fog band, no star, no clipped sky texture. Each of
  those was read by a reviewer as a grey smudge, a row of dashes, or a rendering
  glitch above the icon - three review rounds, the same complaint. The sky
  gradient + the mark + the condition text carry the condition between them.
  `audit/hero-marks.js` screenshots each hero and compares every sky pixel near
  the mark against the card's own CSS gradient evaluated analytically (worst
  departure 1/255 clean; an injected 1px hairline reads 126), so a stray mark
  cannot come back unnoticed.
- Dark-theme **daytime** skies are lifted as far as the hero ink allows, and the
  night tokens sit well below them. The ceiling is `--hero-muted-night`
  (`#c3d3ec`) at 6:1, i.e. luminance <= 0.0620 (~#404755) - a lighter stop is a
  contrast finding, not a design choice. Day-vs-night went from dL* +0.1..+3.3
  (only the small "NIGHT" label told them apart) to +8..+14.
- Night hour cards are a **tint** (`--night-card` sits one step off the surface in
  each theme, same ink in light), never a solid navy tile - a saturated block in a
  row reads as selection. `.hour--now` wins the row: accent border + top band +
  accented "Now" (`--accent-strong` in light, 6.1:1 on `--surface-3`; `--accent`
  in dark, 5.2:1).
- Empty-state hint pills are real 44px buttons but `aria-hidden` **and** `tabIndex = -1`
  (the contract allows exactly one button whose accessible name matches `/search/i`).
- Recents record a **sequence number taken at submit time**, and a single-match city is
  recorded *before* the staleness check returns — the suite fires searches back-to-back,
  so response order is not submission order.
- Theme is applied by an inline script in `<head>` before first paint; the toggle
  overrides `prefers-color-scheme` and persists.
- Live Open-Meteo reports `current.time` at 15-minute marks while the hourly series
  steps on the hour; the strip snaps to the hour the reading belongs to. Fixtures always
  align exactly, so the suite cannot catch this — `node audit/live-check.js` covers it.
- **`checks/` must stay byte-identical to `/brief/checks`.** Check with
  `diff -rq /brief/checks checks` before believing any green run — a softened local copy
  proves nothing.
- **Coastal vs inland is decided by the marine answer**, not by the place name: coastal
  only when `current.wave_height` is a number. Inland answers HTTP 200 with nulls, and
  the water section is then absent with no message. A marine failure while the forecast
  succeeds shows only the `marine-unavailable` note.
- The coastal phone layout is **CSS only**, keyed on `body.is-coastal` inside
  `@media (max-width: 619.98px)`. JS once picked the layout by measuring the viewport, so
  a unit/theme re-render could disagree with the actual width. One markup path means it
  can't.
- **The first-screen budget on a 390x844 coastal phone** is a real constraint, not a
  preference: both verdict words must end above 844px, and the tide chart's bottom edge —
  where the hour labels and the "now" pill live — must too, or the chart loses the part
  that answers "when". `audit/water-lint.js` asserts both. The room came from control
  heights (54→46px, still above the 44px tap floor), paddings and gaps — **not** from
  squeezing the search field: a 149px field truncates "Search a beach, harbour or city"
  (it needs 303px), and that placeholder is the app's invitation. Measured in the browser,
  not estimated: `audit/water-lint.js` prints chart cut/fold share.
- The verdict **reasons are re-derived per render, in the active unit**, because a
  Fahrenheit reader otherwise gets metres and km/h inside the sentence while every number
  beside it converts. Ratings and contract keywords are unaffected by units, and
  `audit/water-rules.js` asserts the keyword rule in **both** units.
- The tide chart is painted in a second pass into a viewBox equal to its **own client
  box** and repainted via `ResizeObserver`: `preserveAspectRatio="none"` on a fixed
  viewBox stretched the text and the stroke weight. Repaint only on a real width change,
  or text selection breaks. A dead-flat series (real at some model points) is centred
  rather than auto-scaled, or the line pins to the floor of the box and "flat" looks like
  a wall.
- The `tide-trend` text must be exactly `Rising`/`Falling`, so the pill reads
  "Tide" outside the test id and the value inside it.
- Do **not** hide the `City` label to buy vertical space on a coastal phone: the contract
  asks for one visible label. Space came from paddings, control heights and dropping the
  brand tag / kicker instead.
- The weather contract's checks measure text by walking up to the first opaque
  background, so keep the label visible and never dim text with `opacity`.
- When two first-screen invariants contradict (inland: whole hour strip on a laptop;
  coastal: both verdicts), assert them **per reading** rather than deleting the older
  one. `audit/stub.js` grew an `inland` option that answers the marine API with 200 +
  nulls for a coastal fixture key, so `look.js` can drive both readings of one city.

- An `svg` `fill` is **not** sampled for contrast by the acceptance checks, but the
  moment that same colour paints DOM text it is. `--tide-kind` (#6b7d92) had lived for
  two runs at 3.96:1 on the light water panel as a pure chart fill — legal while it only
  painted SVG shapes, and an immediate coastal-state contrast failure the day the tide
  legend made it real text. Measure a token against the panel it will actually sit on
  before reusing it for text; `--water-muted` is the one that clears 4.5:1 in both
  themes (6.85 light / 9.02 dark).
- Words are the scarce resource inside the ~366x128 tide chart. Four turns a day plus a
  "High"/"Low" beside each is fifteen words, and they land on `dawn`/`dusk`, on the
  "now" pill and on each other — Sydney does it with live data. The chart prints the
  **time only**: a filled disc is a high, a hollow ring a low, and the legend and tiles
  below say it in words (shape is never the only cue). Positions are computed before
  painting, since the viewBox is 1:1 with the measured box.
- A fixture that passes does not mean the rule passes. Every fixed fixture but Sydney
  hid the collision above, so `chart-collide.js` sweeps the tide *phase*
  (`MARINE[key].tide.highAt`) across the day instead of trusting one arrangement.

## Habits this repo has paid for

- `node --check app.js water.js icons.js` before trusting a browser run. A `continue`
  inside `forEach` is a SyntaxError that killed app.js once and dropped the suite to 6
  passing tests while everything "looked" fine.
- Verify a stub patch before believing a screenshot: grep for the route and assert a
  fixture value comes back. A python string replace that silently no-opped once sent the
  audit's marine requests to the real internet, so inland Paris appeared coastal.
- Gate "is it visible" on `width > 0`: a `display:none` element measures 0x0 and once
  reported a false problem for inland Paris.
- Judge a shape claim by measurement of the right thing (cloud-only ink), not a proxy
  (total ink share).
- The demo is served with `start_demo` on port 3000 (`node tools/serve.js`); check
  `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` before starting another.

## My harnesses (`audit/`, scaffolding, not part of the app)

| script | what it proves |
| --- | --- |
| `run-audit.js` | overflow / contrast / coverage-at-3-scroll-positions / tap across 5 states × 2 themes × 12 hero palettes × long labels × desktop; drives hero scenes through **real fixture weather**, not a DOM override. Screenshots land in `audit/shot-*.png` and `audit/scene-*.png` (git-ignored) |
| `pixel-review.py` | objective screenshot review: unthemed strip at the bottom, hero separates from the page, day skies differ from night in **both** themes |
| `design-lint.js` | type-scale dominance, corner-radius scale, spacing rhythm, line measure, clipped text |
| `widths.js` | overflow/contrast/tap at 320–1440px, plus pathological unbroken labels |
| `keyboard.js` | tab order, visible focus indicator on everything focusable, keyboard-only search |
| `hourly.js` | 24 items, contiguous `HH:00` labels from the current hour, never interactive, one "Now", "Tomorrow" on the day crossing |
| `order-stress.js` | recents newest-first/dedup/cap-5 under out-of-order geocoder responses |
| `live-check.js` | the **real** Open-Meteo API, no interception |
| `geometry.js`, `polish.js` | element geometry/type scale; contrast headroom (not just pass/fail) |
| `hero-marks.js` | nothing painted above/around the hero mark, per pixel, both themes x 12 skies |
| `look.js` | **what a person sees on first load**, per scene x theme x **inland/coastal** reading: inland must show no water section and keep the whole hour strip on a laptop; coastal must show both verdicts whole inside the first screen. Verdict boxes are measured unrounded — rounding y and bottom separately reads a 3% fold cut on a 32px word that does not exist |
| `water-rules.js` | every rule in the brief (turns, trend, ratings, keyword-bearing reasons in **both units**, sea-state formats, moon, inland/no-marine/flat-sea) driven straight against the fixture data. The fastest loop here — run it before the browser |
| `water-look.js` | first-screen budget + chart fidelity + console errors per coastal fixture x theme x viewport; writes `audit/water-*.png` and `water.json` |
| `water-lint.js` | composition inside the water section: twin verdict cards, tidy tiles, no clipped text, curve spans/rises, radii scale, **and that the fold does not cut the tide chart** |
| `first-load.js` | a first visit is clean: no console output, no network calls, no geolocation, empty state showing, both themes |
| `icon-check.js`, `icon-see.js` | the marks themselves: "mainly clear" is mostly clear, the night moon sits behind the cloud. Ink share is confounded by sun rays — compare **cloud-only** ink, and use `icon-see.js`'s ASCII density maps to see it |
| `live-check.js` | 10 real places (coastal and inland, other timezones) x 2 viewports against the **live** APIs: never NaN/undefined/null text, water section only where it belongs, verdicts inside the budget; prints the reasons so the copy can be read, not just asserted |
| `chart-collide.js` | no two words in the tide chart overlap, no label leaves the box, and **every turn the app lists keeps its time on the chart** — sweeps the tide phase over the day x 2 themes, since one fixed fixture hides the collisions (Sydney's arrangement collides) |
| `rail-hue.js` | the temperature rail reads cool when it is cool: cool buckets never in the olive/brown hue band, warm stays warm, all five buckets actually paint, rail >=3:1 on card and track, numbers >=4.5:1, and a day is coloured by the **printed** temperature |
| `first-screen-read.js` | reads the above-the-fold text of a place in visual order, both themes, so the coastal copy and reading order can be reviewed like a screenshot |
