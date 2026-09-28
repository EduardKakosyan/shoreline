# Brief: "Shoreline", a companion for a day at the water

## What to build and for whom

You are continuing an app that already exists: **Weather Now**, a polished, mobile-first city weather app. Its project, with its git history, is your starting point. Read it before you change anything. Today it answers "what is the weather". It passes every behavior and design check below, and the operator has reviewed and accepted how it looks.

**This run changes what the app is for.** The people it serves now plan their day around the water: beach-goers and swimmers, anglers, surfers and small-boat owners. For a coastal place their question isn't "will it rain?" It's **"is today a good day to go to the beach, and is it a good time to fish? When, and why?"** The app becomes **Shoreline**: a companion for a day at the water first, and a weather app second.

- **Coastal places** (anywhere the Open-Meteo Marine API has sea data) get a new **water section**. It shows a Good/Fair/Poor verdict for the beach and for fishing, each with a plain-language reason, plus today's tides with a tide chart, the sea state (waves, swell, sea temperature) and the moon phase. The two verdicts are the headline. On a phone they must be on the **first screen**, above the hourly strip and the forecast.
- **Inland places** stay the weather app they are today, with nothing about the sea: no empty panel and no "not available here".
- Rename the product to **Shoreline** and let the identity follow the water: the brand, the empty state's copy and art (invite people to search a beach, a harbour or a coastal town), and the tone. The weather contract below doesn't change.

The operator's bar is high. The last three runs made this app beautiful, and this run must make it **useful to someone standing at the car park deciding whether to unload the surfboard or the fishing rods**. A verdict nobody trusts is worse than none. Every rating must say *why* in words a person would use, and the tide chart must make "when" obvious at a glance.

Budget: up to 40 hours. Build the contract first and get every check green. Then spend real, measured time on the water experience, on phone and desktop, in both themes.

## Delivery and how it is served

- A static web app (the existing plain HTML/CSS/JS app; keep that stack).
- The builder serves the app with its `start_demo` tool on **port 3000**. `GET /` returns the app page. Nothing else needs to be served.
- The acceptance checks run against `APP_URL` after completion. The app must work when the **three** Open-Meteo hosts (geocoding, forecast, marine) are intercepted and answered with fixture JSON (see "How checks run").
- At runtime the app must also work against the real Open-Meteo APIs (internet is available).

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

### Marine data (new, fixed decision)

After a city opens, the browser also calls the Open-Meteo Marine API. Call it at the same time as the forecast, not after it. No key is needed, and CORS is allowed:

`GET https://marine-api.open-meteo.com/v1/marine?latitude=<lat>&longitude=<lon>` +
`&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period,sea_surface_temperature,sea_level_height_msl` +
`&hourly=wave_height,sea_level_height_msl&forecast_days=5&timezone=auto`

Use exactly this host, path and these variable names; the fixtures answer only the variables the request asks for, like the live API. Units are metres, seconds, degrees (direction the waves come **from**) and °C. `hourly.time` uses the same `YYYY-MM-DDTHH:00` format as the forecast. `sea_level_height_msl` is the sea level against mean sea level, including tides, so it can be negative.

- **Coastal or inland.** A place is coastal when the marine answer's `current.wave_height` is a number. Away from the sea, the live API answers HTTP 200 with `null` values. Treat that as inland: show no water section and no message.
- **Marine failure.** If the marine request fails (network or HTTP error) while the forecast succeeds, show the weather as normal, plus a short, calm note `data-testid="marine-unavailable"` where the water section would be (for example "Sea conditions aren't available right now."). The water section itself stays hidden. This isn't the forecast `error` state: no `try-again` is required, and `error` stays hidden.
- A forecast failure is handled exactly as before (the `error` state). The water section stays hidden while the weather is hidden.

## Required behavior (weather contract, carried over unchanged: checks assert it verbatim)

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

## Water section contract (new: checks assert these verbatim)

Everything in this section lives inside one container, `data-testid="water"`. It is visible only for a coastal place whose forecast and marine data both arrived. It is hidden or absent for inland places, during errors, when marine data failed, and before any city opens. Opening another place replaces all of it.

**Placement.** For a coastal place on a phone (390×844, page scrolled to the top), `beach-rating` and `fishing-rating` must end within the first 844 px of the page. The `water` container must start above `hourly` and above `forecast-days`. Getting the verdicts onto the first screen will mean rethinking the top of the page for coastal places: the header, the search, and how much room the hero takes. That's the point: for a coastal place the verdicts come first. The hero temperature must stay ≥ 64 px.

In the definitions below, "today" is `daily.time[0]` of the forecast. The "current hour" is the `YYYY-MM-DDTHH:00` slot of the forecast's `current.time`.

### 1. Beach and fishing verdicts

- `beach-rating` and `fishing-rating`: the text is exactly `Good`, `Fair` or `Poor`.
- `beach-reason` and `fishing-reason`: a short plain-language reason, never empty. When a rating isn't `Good`, the reason must use the **keyword** of every factor that held it back, as listed below. Wording around the keywords is yours, for example "Big waves and strong wind; rain likely; cool air". The checks look for the keywords case-insensitively.

Inputs: `W` = marine `current.wave_height` (m), `V` = forecast `current.wind_speed_10m` (km/h), `P` = forecast `daily.precipitation_probability_max[0]` (%), `C` = forecast `current.weather_code`, `T` = forecast `current.temperature_2m` (°C). Thunder means `C` is 95, 96 or 99.

**Beach**
- **Poor** if any of: `W ≥ 2.0` (keyword `waves`), `V ≥ 35` (`wind`), `P ≥ 60` (`rain`), thunder (`thunder`), `T < 16` (`cool`).
- Otherwise **Good** if all of: `W < 1.0`, `V < 20`, `P < 30`, `C` is 0, 1 or 2, and `T ≥ 22`.
- Otherwise **Fair**. The reason names each Good condition that failed: `W ≥ 1.0` (`waves`), `V ≥ 20` (`wind`), `P ≥ 30` (`rain`), `C` not 0/1/2 (`cloud`), `T < 22` (`cool`).

**Fishing.** Anglers look for a tide turning in low light.
- Tide turns are today's highs and lows (§2). The dawn window is `sunrise ± 90 min` and the dusk window is `sunset ± 90 min`, both inclusive, with `sunrise`/`sunset` = the `HH:MM` of `daily.sunrise[0]`/`daily.sunset[0]`. A turn is "at dawn" or "at dusk" when its `HH:00` time falls inside that window.
- **Poor** if any of: `W ≥ 2.5` (`waves`), `V ≥ 40` (`wind`), thunder (`thunder`).
- Otherwise **Good** if `W < 1.5`, `V < 25`, and at least one tide turn is at dawn or at dusk. A Good reason names the window: `dawn`, `dusk`, or both.
- Otherwise **Fair**, naming each failed Good condition: `W ≥ 1.5` (`waves`), `V ≥ 25` (`wind`), no turn at dawn or dusk (`tide`).

It's an outlook, not a promise. Say so gently somewhere near the verdicts.

### 2. Tides (today)

- **Turns.** From marine `hourly.sea_level_height_msl`, a slot on today's date is a **High** if its value is strictly greater than both neighbouring hours, and a **Low** if strictly smaller than both. The very first slot of the series has no earlier neighbour and is never a turn.
- `tide-event`: one element per turn, in time order, each with:
  - `tide-kind`: exactly `High` or `Low`;
  - `tide-time`: the slot's `HH:00`, for example `07:00`;
  - `tide-height`: the sea level to one decimal with `toFixed(1)` plus ` m`, for example `1.4 m` or `-1.3 m`. In Fahrenheit mode it is feet: `(m × 3.28084).toFixed(1)` plus ` ft`, for example `-4.4 ft`.
- `tide-trend`: exactly `Rising` if the sea level at the hour after the current hour is greater than at the current hour, otherwise `Falling`.
- `tide-note`: a visible note containing the word "approximate". The times are hourly and model-based, so say so honestly, for example "Tide times are approximate (hourly model, not a harbour table)".
- `tide-chart`: a visible chart of today's sea level (inline SVG or canvas). A good chart marks now, the highs and lows, and the dawn and dusk windows, so "when" is obvious at a glance. The checks only require that it is visible. The operator judges the rest.

### 3. Sea state and moon

- `wave-height`: marine `current.wave_height`, `toFixed(1)` + ` m`, or feet as above in Fahrenheit mode.
- `wave-period`: `Math.round(current.wave_period)` + ` s`, never converted.
- `swell-direction`: the 8-point compass direction the swell comes from, exactly one of `N NE E SE S SW W NW`: `COMPASS[Math.round(current.swell_wave_direction / 45) % 8]`.
- `sea-temperature`: `current.sea_surface_temperature`, rounded, + `°C`, or in Fahrenheit mode `Math.round(°C × 9/5 + 32)` + `°F`.
- `moon-phase`: exactly one of `New moon`, `Waxing crescent`, `First quarter`, `Waxing gibbous`, `Full moon`, `Waning gibbous`, `Last quarter`, `Waning crescent`, computed locally for today at 12:00 UTC:
  `days = (Date.parse(today + 'T12:00:00Z') - Date.UTC(2000, 0, 6, 18, 14)) / 86400000; frac = ((days / 29.530588853) % 1 + 1) % 1; name = NAMES[Math.floor(frac * 8 + 0.5) % 8]` (NAMES in the order above).

### 4. Units

The existing `unit-toggle` also converts sea temperature, wave height and tide heights at once. The preference persists across reloads as it does today. Wave period and times never change.

## Design requirements (carried over; 10 and 11 are new)

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
   position and in every state: empty, results, picker, notice, error, coastal. Concretely, the checks
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

10. **The water section is the showpiece now.** It needs the same craft the hero got. Make the verdicts read at a glance (colour and icon per rating, never colour alone). Let the reason read like a local who knows the beach. Make the tide chart good enough to plan by. Show the sea state with small, clear icons. Keep it quiet and trustworthy: no gamified scores and no alarm colours for "Fair". It must pass the same automated bar as everything else (contrast, tap targets, overflow and background, in both themes), and the checks now include a **coastal** state.
11. **Desktop.** On a wide screen, a coastal place should read as a water dashboard: the verdicts and tide chart beside the current weather, not a stretched phone column. Human-judged.

## Constraints

- Node 22 / pnpm available; no GPU, no API keys, no paid services, no runtime CDN dependencies (fonts/icons must be system or bundled).
- The app calls the three Open-Meteo hosts directly from the browser; CORS is allowed by all three.
- All `data-testid`s, the `City` label, the `Theme` accessible name, the formatting rules, the rating rules and keywords, and the persistence behavior above are **contract**: the checks assert them verbatim. `toBeHidden` semantics: hide with the `hidden` attribute or `display:none`, or remove the element from the DOM.
- Keep the initial load free of console errors and of any geolocation prompt.
- Storage keys are the app's own choice (checks never read storage keys; they only reload).
- Don't regress anything that passes today. The previous run's checks are all still here.

## Non-goals

Geolocation ("use my location"), maps, species- or region-specific fishing advice, surf-spot databases, tide tables from other sources, notifications, PWA/offline, a backend of any kind, accounts, paid APIs, or a rating for days other than today (a day-by-day outlook is welcome as extra polish, but it isn't checked and must never contradict today's rules).

## How checks run (so the app can pass them)

- Playwright 1.63 with Chromium, `baseURL = APP_URL`. The files in `checks/` share a `fixtures.ts` that uses `page.route()` to intercept **all three** Open-Meteo hosts:
  - Geocoding answers from a query map, case-insensitive, also matching the text before the first comma (so re-searching a chip's full label works). An unmapped query gets no results.
  - Forecast answers by matching the `latitude`/`longitude` params (±0.01) against the fixture cities. Listed cities answer HTTP 500 to exercise the error path. "Failing once" answers 500 the first time and then succeeds, for the "Try again" test. Unknown coordinates get HTTP 400.
  - Marine answers by the same coordinates. The coastal fixtures (Cascais, Newquay, Lisbon, Sydney) have sea data and an hourly tide series. **Every other location answers HTTP 200 with nulls, like an inland point.** Listed cities answer HTTP 500 to exercise the marine-failure note. The answer carries only the variables the request asked for.
  - Fixture forecast: timezone `GMT`, 5 dates `2026-09-24…28` (Thu–Mon), `current.time` = `2026-09-24T12:00`, hourly series for 5 days (is_day=1 for 07–19), sunrise `07:12`, sunset `19:26`, metric values, `apparent_temperature = round(temperature_2m) − 1`.
  - The coastal fixtures are built so that one place is Good/Good, one is Poor/Poor and one is Fair/Fair under the rules above. You may read `fixtures.ts`, but implement the rules as written, not the fixture values.
- The visual checks drive the app into **six** states (`empty`, `results`, `picker`, `notice`, `error`, and new, `coastal`: Cascais opened) at 390×844, in **both themes via the app's own "Theme" toggle**. They measure contrast, background coverage, tap targets and overflow inside the page. The `error` state is reached by searching `London` and picking `London, Kentucky, United States` (its forecast answers 500). The `results` state is Paris, which is inland.
- So: use the exact hosts, paths and params, derive day names from `daily.time[]`, and never depend on values beyond the fixture fields. The checks are re-runnable and date-independent.

## Plan for the builder: build, test, refine (use the budget on steps 4 and 5)

1. **Read what exists.** Read the project, its git log and its notes. Run today's checks to confirm they're green before you change anything.
2. **Contract first.** Add the marine call, coastal detection, the water section with every test id and rule above, the unit conversions, and the inland and failure behavior. Rename to Shoreline. Get **all** checks in `checks/` green: copy them next to a config with `baseURL = http://localhost:3000`, serve on 3000, and run `APP_URL=http://localhost:3000 npx playwright test`.
3. **Rethink the top of the page for coastal places** so both verdicts fit the first phone screen without cramming. Header, search and hero may all change for coastal results. Keep inland results as good as they are today.
4. **Water design pass. Spend real time here.** Work through calm, choppy and stormy fixtures, day and night, in both themes, on phone and desktop. Make the verdicts, the reasons, the tide chart (now, highs and lows, dawn and dusk windows), the sea-state icons and the moon feel crafted. Extend your own audit scripts (contrast, overflow, tap targets, background) to the coastal state, and look at every screenshot yourself.
5. **Live-data pass.** Try real coastal and inland places against the live APIs, for example Cascais, Newquay, Honolulu, Sydney, Cape Town, Halifax, Madrid and Denver. Make sure real-world data (nulls, odd directions, flat tide curves, negative heights, places in other timezones) never breaks the page or produces nonsense.
6. **Finish.** Re-run the full check suite twice in a row (green and stable), and leave the app startable with `start_demo` on port 3000 serving `GET /`. **Report progress with `report_progress` as you finish each piece** (contract green, coastal first screen, water design pass, live-data pass, final polish).

## Acceptance summary

Everything the previous run accepted is still automated: empty state, current weather, five forecast days, picker, no-results notice and forecast-error recovery with "Try again", the persisted C/F toggle, recent-search chips, extended data, and overflow, contrast, background coverage and tap targets in every state × theme (now including the coastal state), the theme toggle and system theme, and the loading skeleton (reported, non-blocking).

New and automated:
- **Sea conditions:** waves, period, swell, sea temperature, tides (trend, turns with time and height, chart, "approximate" note) and the moon phase, all converted by the unit toggle.
- **Beach and fishing outlook:** Good, Fair or Poor by the rules above, with reasons that name the factors.
- **Water first on phones:** the verdicts are on the first screen, before the hourly strip and forecast.
- **Inland places and sea-data failure.**

Human judgment:
- The app looks polished and pleasant on a phone and on a desktop, in both themes, for coastal and inland places.
- For a coastal place it reads as a companion for a day at the water first. The verdicts, the tide chart and the best times feel crafted, trustworthy and easy to act on.
