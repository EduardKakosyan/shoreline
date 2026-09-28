# Brief: "Weather Now" — a beautiful, mobile-first city weather app

## What to build and for whom

A fast, friendly, **visually polished** weather app for phone users (also fine on desktop).
Someone types a city, picks it if several places match, and sees the current weather plus a
5-day forecast and a 24-hour strip. No accounts, no signup, no payments. The operator demos it
on a phone-sized screen (390×844).

A previous version passed every behavior check but looked plain and had a real UI bug: on a
phone the page background stopped halfway down, so the "Recent searches" label was white text
on white. **This run's goal is a genuinely beautiful, polished app, and the UI is held to that
standard by automated checks** (overflow, contrast, background coverage, tap targets, themes).
The behavior contract below is carried over unchanged from the previous run — core checks for
it are already written; do not regress it.

Budget note: you have up to 40 hours. The time is meant for **design and refinement**, not
just passing checks. Build the contract first, then spend real, measured time polishing.

## Delivery and how it is served

- Build a static web app (plain HTML/CSS/JS or a small Vite/React app — builder's choice; a
  static build is the simplest way to satisfy everything below).
- The builder serves the app with its `start_demo` tool on **port 3000**. `GET /` returns the
  app page (the full weather UI: search, current weather, forecast). Nothing else needs to be
  served.
- The acceptance checks run against `APP_URL` after completion; the app must work when the two
  Open-Meteo hosts are intercepted and answered with fixture JSON (see "How checks run").
- At runtime the app must also work against the real Open-Meteo API (internet is available).

## Data source (fixed decision)

The browser calls Open-Meteo directly — no backend, no proxy, no API keys:

- Geocoding: `GET https://geocoding-api.open-meteo.com/v1/search?name=<query>&count=5&language=en&format=json`
- Forecast (extended; exactly these parameter names and values):
  `GET https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>` +
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day` +
  `&hourly=temperature_2m,weather_code,is_day,precipitation_probability` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
  `&forecast_days=5&timezone=auto`

Use exactly these hosts, paths and parameter names. Always request metric (no unit params):
temperatures in °C, wind in km/h, probabilities in %. A geocoding miss answers JSON **without**
a `results` key — treat missing/empty `results` as "no matches". The fixtures answer every
field above: `current.{temperature_2m, relative_humidity_2m, apparent_temperature, weather_code,
wind_speed_10m, is_day, time}`; `hourly.{time[], temperature_2m[], weather_code[], is_day[],
precipitation_probability[]}` (hourly time format `YYYY-MM-DDTHH:00`); `daily.{time[],
weather_code[], temperature_2m_max[], temperature_2m_min[], precipitation_probability_max[],
sunrise[], sunset[]}` (sunrise/sunset format `YYYY-MM-DDTHH:MM`, timezone `GMT`, so the display
text is exactly the `HH:MM` slice); units tables in `current_units`/`hourly_units`/`daily_units`.

## Required behavior (contract — carried over, checks assert verbatim)

1. **Search (submit-only)** — one visible `<label>` with the exact text `City` for the text
   input; a visible placeholder containing the word "Search"; exactly one button whose
   accessible name matches /search/i (text `Search`), and no other button text may contain
   "search". Submitting the form (click or Enter) runs the geocoding call. No type-ahead.
   The search must be usable with the keyboard alone, and keyboard focus must always be visible
   (a visible focus ring on every interactive element; do not remove outlines without a
   replacement).
2. **First load / empty state** — empty input, no default city, no auto-search. A block with
   `data-testid="empty-state"` invites the user to search — make it friendly (icon/illustration,
   warm copy). `current-weather` and `forecast-days` are hidden (hidden or absent) until a city
   opens. After a city opens, `empty-state` is hidden.
3. **Geocoding results** — join fields as `"City, Region, Country"` = `[name, admin1, country]`
   filtered to non-empty segments, joined with `", "`.
   - Exactly 1 match → open it directly (no picker step).
   - 2–5 matches → show up to 5 buttons with `data-testid="match-option"`, each text is that
     full label, inside a container `data-testid="match-list"`, and hide the empty state.
   - 0 matches → show `data-testid="notice"` containing the typed query (e.g. `No results
     found for "Atlantis". Try another place name.`); weather blocks stay hidden; later
     searches clear the notice.
   - Picking an option (or any later successful search) hides `match-list` and replaces any
     previous results/picker.
4. **Current weather** — container `data-testid="current-weather"` (the hero card, see design)
   with children:
   - `location-name`: the full "City, Region, Country" label;
   - `current-temperature`: integer + `°C` or `°F`, no space (e.g. `28°C`, `82°F`);
   - `current-condition`: condition text from the WMO code table below;
   - `feels-like`: apparent temperature (`current.apparent_temperature`), same format as
     `current-temperature` (`20°C` / `68°F`, converted in Fahrenheit mode);
   - `sunrise` / `sunset`: the `HH:MM` slice of `daily.sunrise[0]` / `daily.sunset[0]` (e.g.
     `07:12`) — never converted;
   - `humidity`: integer + `%` (e.g. `41%`) — never converted;
   - `wind`: integer + ` km/h` (Celsius mode) or ` mph` (Fahrenheit mode), e.g. `12 km/h`,
     `7 mph`.
5. **Hourly strip** — a horizontally scrollable strip of **exactly 24** items
   `data-testid="hour-item"` covering `current.time` through `current.time + 23h`, taken from
   the hourly arrays. Each item has `data-testid="hour-label"` (the `HH:00` slice of the hourly
   time string, e.g. `12:00`) and `data-testid="hour-temperature"` (integer + `°`, e.g. `21°`,
   converted in Fahrenheit mode). Hour items are **display-only**: they must not be `<button>`s
   or `role="button"` elements (they are exempt from the 44px rule only while non-interactive).
6. **Forecast** — container `data-testid="forecast-days"` holding exactly five rows
   `data-testid="forecast-day"`, each with `day-name`, `day-high`, `day-low`, `day-condition`,
   `day-precip`:
   - `day-name`: English short weekday (`Mon`…`Sun`) derived from the `daily.time[]` string
     (e.g. parse `YYYY-MM-DD` as `YYYY-MM-DDT12:00:00Z` and format weekday `en-US`, UTC),
     never from "today";
   - `day-high` / `day-low`: rounded integer + `°` only, e.g. `29°` / `83°`;
   - `day-condition`: condition text from the code table;
   - `day-precip`: integer + `%` from `daily.precipitation_probability_max[]` (e.g. `30%`).
7. **Units** — a single `data-testid="unit-toggle"` button switching C↔F. Always fetch metric
   and convert in JS: `°F = °C × 9/5 + 32`, `mph = km/h ÷ 1.609344`; round to integer with
   `Math.round` at display time. Toggle updates all open views instantly (current, feels-like,
   hourly strip, forecast) and persists in `localStorage`; after reload the app is still in the
   saved unit (a search afterwards renders in it). Two toggles return to Celsius.
8. **Recent searches** — every opened city is stored (label + latitude + longitude) in
   `localStorage`: newest first, deduplicated by label, max 5. Render chips
   `data-testid="recent-chip"` whose full label is the chip text, plus one button
   `data-testid="clear-recents"` that empties the list immediately and persists the empty list.
   Clicking a chip opens that city directly (reuse stored coordinates or re-geocode — either is
   fine). A "no recent searches yet" hint is OK; hidden chips do not count (they must be absent
   or hidden after clearing).
9. **Forecast failure** — if the forecast request fails (network/HTTP), show a visible
   `data-testid="error"` message that includes a button `data-testid="try-again"` which re-runs
   the failed request for the same city; when it succeeds the error clears and results render.
   Keep weather blocks hidden during the error. A subsequent successful search must clear the
   error and render normally.
10. **Mobile** — good at 390×844 (see design requirements; several are automated now).

### WMO weather code → condition text

`0` Clear sky · `1` Mainly clear · `2` Partly cloudy · `3` Overcast · `45` Fog ·
`48` Depositing rime fog · `51` Light drizzle · `53` Moderate drizzle · `55` Dense drizzle ·
`56` Light freezing drizzle · `57` Dense freezing drizzle · `61` Light rain · `63` Moderate
rain · `65` Heavy rain · `66` Light freezing rain · `67` Heavy freezing rain · `71` Light
snow · `73` Moderate snow · `75` Heavy snow · `77` Snow grains · `80` Light rain showers ·
`81` Moderate rain showers · `82` Violent rain showers · `85` Light snow showers ·
`86` Heavy snow showers · `95` Thunderstorm · `96` Thunderstorm with hail ·
`99` Thunderstorm with heavy hail. Unknown code → `Unknown`.

## Design requirements (automated or human-judged — this is the point of this run)

1. **Distinctive, modern look.** A hero card for the current weather whose background reflects
   the weather condition **and day/night** (`current.is_day`: 1 day / 0 night — pick palettes
   per condition family: clear-day, clear-night, cloudy, rain, snow, fog, thunderstorm; night
   variants must be visibly night). A clear type scale with a **very large** temperature
   (hero temperature ≥ 64px). Weather-condition icons as **inline SVG or bundled assets — no
   CDN at runtime** (icon in the hero, per hour item, and per forecast row). Forecast days as
   cards. Cohesive palette, generous spacing, consistent corner radii.
2. **Light and dark themes.** Follow the system preference (`prefers-color-scheme`) on a first
   visit. A toggle button with `data-testid="theme-toggle"` whose accessible name is exactly
   `Theme` (`aria-label="Theme"`) switches themes instantly, **overrides the system preference**, and the choice persists in
   `localStorage` across reloads (including after results are shown). The theme must be applied
   before first paint (no white flash on a dark visit).
3. **Full-bleed background.** The page background covers the whole viewport at every scroll
   position and in every state: empty, results, picker, notice, error. Concretely, the checks
   walk up from the element under the point at the bottom of the viewport to find the first
   **opaque (alpha ≥ 0.95)** background, falling back to white — so: set an opaque `background`
   on `html` (and/or `body`) that matches the theme and spans the full document
   (e.g. `min-height: 100dvh` + body `margin: 0`; do not let the themed background end while
   the document continues). Text sampled near the bottom of the viewport must keep contrast
   against it — in particular section labels like "Recent searches".
4. **Contrast (automated).** Every visible text element — including the input's placeholder —
   has contrast ≥ **4.5:1** against its effective background (≥ **3:1** for large text: ≥24px,
   or ≥18.66px at weight ≥700). The effective background is computed by walking up through
   transparent ancestors to the first opaque background, with white as the ultimate fallback;
   gradients contribute **every color stop as a candidate** and the worst ratio wins. A solid
   `#fff` text on a light hero gradient stop will fail — verify your palette per theme with a
   real contrast measurement, not by eye.
5. **Tap targets (automated).** Every `<button>`, `[role="button"]`, `input[type=submit]`,
   `recent-chip`, `match-option`, `unit-toggle`, `theme-toggle`, `try-again` renders at least
   **44×44 px** (checks allow 43.5) in every state and theme.
6. **Motion & feedback.** Subtle transitions (theme cross-fade, hover/press states) that are
   disabled or reduced under `prefers-reduced-motion: reduce`. Loading skeletons while any
   request is in flight: a block `data-testid="loading"` visible during the forecast request
   (hidden when results or error appear) — shape the skeleton like the hero/cards.
7. **Empty and error states with personality.** Friendly empty state (`empty-state`), friendly
   notice and error blocks, error carries the `try-again` button (contract #9).
8. **Overflow (automated).** At 390×844: no horizontal scrolling on the document and no element
   wider than the viewport, in every state and theme. The hourly strip may scroll **inside** its
   own container (`overflow-x: auto`), but the document must not scroll sideways.
9. **Desktop.** Also looks composed and polished at desktop widths (centered column or wider
   layout, no stretched-out cards). Human-judged.

## Constraints

- Node 22 / pnpm available; no GPU, no API keys, no paid services, no runtime CDN dependencies
  (fonts/icons must be system or bundled).
- The app calls Open-Meteo directly from the browser; CORS is allowed by the API.
- All `data-testid`s, the `City` label, the `Theme` accessible name, formatting rules and
  persistence behavior above are **contract**: checks assert them verbatim. `toBeHidden`
  semantics: hide via `hidden` attribute / `display:none`, or remove from the DOM.
- Keep the initial load free of console errors and of any geolocation prompt.
- Storage keys are the app's own choice (checks never read storage keys; they only reload).

## Non-goals

Geolocation ("use my location"), weather maps, PWA/offline, backend of any kind, live-data
caching layers, favorites, paid APIs.

## How checks run (so the app can pass them)

- Playwright 1.63 + Chromium, `baseURL = APP_URL`; files in `checks/` use a shared
  `fixtures.ts` that `page.route()`-intercepts **both** Open-Meteo hosts:
  - Geocoding answers from a query map, case-insensitive, also matching the text before the
    first comma (so re-searching a chip's full label works). Unmapped query → no results.
  - Forecast answers by matching `latitude`/`longitude` params (±0.01) against fixture cities;
    listed cities answer HTTP 500 to exercise the error path ("failing once" answers 500 the
    first time, then succeeds, for the "Try again" test); unknown coords → 400.
  - Fixture forecast: timezone `GMT`, 5 dates `2026-09-24…28` (Thu–Mon), `current.time` =
    `2026-09-24T12:00`, hourly series for 5 days (is_day=1 for 07–19), sunrise `07:12`,
    sunset `19:26`, metric values, `apparent_temperature = round(temperature_2m) − 1`.
- Visual checks drive the app into five states (`empty`, `results`, `picker`, `notice`,
  `error`) at 390×844, in **both themes via the app's own "Theme" toggle**, and measure
  contrast / background coverage / tap targets / overflow inside the page. The `error` state
  is reached by searching `London`, picking `London, Kentucky, United States` (its forecast
  answers 500), so the picker must work for London and opening any option must attempt a
  forecast.
- So: use the exact hosts/paths/params, derive day names from `daily.time[]`, and never depend
  on values beyond the fixture fields. Checks are re-runnable and date-independent.

## Plan for the builder — build, test, refine (use the budget on step 4)

1. **Contract first.** Scaffold the app; implement behavior contract §1–§10 and the design
   skeleton against the live Open-Meteo API.
2. **Run the checks yourself.** You may read `checks/`. `npm init -y`,
   `npm i -D @playwright/test@1.63`, `npx playwright install chromium`, copy `checks/` next to
   a config with `baseURL = http://localhost:3000`, serve your app on 3000, and
   `APP_URL=http://localhost:3000 npx playwright test`. All automated tests must pass. (They
   intercept Open-Meteo themselves; your app needs no special mock mode.)
3. **Instrument your own design.** Install Playwright in your project and write your own
   scripts (separate from `checks/`) that walk all five states × both themes × scroll positions
   and measure: horizontal overflow, per-text contrast against the effective background, tap
   target sizes, background coverage at the viewport bottom. Add `data-testid="loading"` and
   skeleton visuals; verify `prefers-reduced-motion` disables transitions.
4. **Design pass — spend real time here.** Iterate on the hero per condition/day-night with the
   real fixtures (clear day, cloudy, rain, fog, night variants…), tune the type scale so the
   temperature reads dominant, make forecast cards and the hourly strip feel crafted
   (icons, subtle depth, consistent spacing rhythm), polish the empty/notice/error states,
   verify both themes and desktop. Re-run your measurement scripts after every change; fix
   every contrast/overflow/tap finding rather than adjusting the check. Judge the app with your
   own eyes in the browser at 390×844 and at ~1280px, both themes — the human criterion is
   real.
5. **Finish.** Re-run the full check suite twice in a row (must be green and stable), leave the
   app startable with `start_demo` on port 3000 serving `GET /`.
   **Report progress with `report_progress` as you finish each piece** (contract complete,
   checks green, design pass per area, final polish).

## Acceptance summary

Automated: empty state on first load; current weather after a single-match search; exactly five
forecast days with day name/high/low/condition/precip; multi-match picker; no-results notice and
forecast-error recovery incl. "Try again"; persisted C/F toggle with correct conversions;
recent-search chips (newest first, deduped, capped at 5, persisted, tappable, clearable);
extended data (feels-like, sunrise/sunset, hourly strip of 24); no horizontal overflow in every
state × theme; text contrast ≥4.5:1 (3:1 large) in every state × theme; background covers the
viewport at every scroll position in every state × theme; tap targets ≥44×44; "Theme" toggle
switches, overrides system, persists; first visit follows the system preference; loading
skeleton (reported, non-blocking). Human judgment: the app looks polished and pleasant on a
phone (390×844) and on a desktop, in both light and dark themes.
