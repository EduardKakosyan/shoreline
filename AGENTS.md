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
  keeping the worst ratio. Complementary trick used here: all decorative paint (hero
  skies, stars, rain/snow/fog bands, spark/range bars) is **inline SVG**, invisible to
  that math, so decoration can never fail contrast or coverage. Never paint a
  gradient onto a DOM element that text sits on.
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
| `pixel-review.py` | objective screenshot review: unthemed strip at the bottom, hero separates from the page, night skies differ from day |
| `design-lint.js` | type-scale dominance, corner-radius scale, spacing rhythm, line measure, clipped text |
| `widths.js` | overflow/contrast/tap at 320–1440px, plus pathological unbroken labels |
| `keyboard.js` | tab order, visible focus indicator on everything focusable, keyboard-only search |
| `hourly.js` | 24 items, contiguous `HH:00` labels from the current hour, never interactive, one "Now", "Tomorrow" on the day crossing |
| `order-stress.js` | recents newest-first/dedup/cap-5 under out-of-order geocoder responses |
| `live-check.js` | the **real** Open-Meteo API, no interception |
| `geometry.js`, `polish.js` | element geometry/type scale; contrast headroom (not just pass/fail) |
| `look.js` | **what a person sees on first load**: viewport-only screenshots at 390x844 and 1280x800 per scene x theme; fails if the hour strip is not fully visible on a laptop's first screen, or if the hero's reading row leaves >24px unused on the right |
