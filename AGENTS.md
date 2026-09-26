# Weather Now — repository notes

Static, dependency-free app: `index.html` + `styles.css` + `icons.js` + `app.js`,
served as-is by `tools/serve.js` on port 3000 (`GET /` returns the app). No build
step, no framework, no runtime CDN. The browser calls Open-Meteo directly.

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
| `look.js` | **what a person sees on first load**: viewport-only screenshots at 390x844 and 1280x800 per scene x theme; fails if the hour strip is not fully visible on a laptop's first screen, or if the hero's reading row leaves >24px unused on the right |
