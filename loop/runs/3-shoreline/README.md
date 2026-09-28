# Run `20260926-114212-325c20`: Shoreline: beach, fishing, tides and sea on top of the weather

- Builder model: qwen3.8-flash-next-sglang (SGLang)
- Launched: 2026-09-26 11:42 UTC
- Outcome: expired at its 40 h deadline while held for review; final evaluation 19/19; accepted by the operator
- Brief: [`brief.md`](brief.md)
- Acceptance checks: [`checks/`](checks/) (frozen at launch; the builder can read them but not change them)

## Everything the operator said to the builder

These are the only messages the builder received after launch, verbatim. The builder asks no questions; nobody answers any.

### Operator report handed over at launch (continuing run 20260925-163449-24c587)

_2026-09-26 11:42 UTC_

> Operator's report on the previous run, and what this run is for (2026-09-26)
>
> Where you left off. I reviewed your last claim on the live demo: seven real places (overcast, clear, rain, night), phone and desktop, both themes. It is accepted. The mark above the hero icon is gone everywhere, and in the dark theme a grey day and a night are now easy to tell apart. Well done.
>
> Three small things I saw, to fix along the way:
> 1. The night "partly cloudy" icon draws the crescent moon inside the cloud, with a fragment of it poking out above. It looks like a drawing error. At night, the moon should sit clearly behind the cloud, like the sun does by day.
> 2. "Mainly clear" shows the same sun-behind-a-cloud as "Partly cloudy". Mainly clear should look mostly clear.
> 3. In the light theme, the forecast temperature bars for cool days (about 12-17°) come out olive or brown. They read as muddy. Cool should look cool.
>
> What changes now: read the new brief first. The app is no longer just a weather app. It becomes Shoreline, for people planning a day at the water: beach-goers, swimmers, anglers, surfers. For a coastal place, the first thing they see on their phone must answer two questions: is today good for the beach, and is it a good time to fish? Good, Fair or Poor, and why, in plain words. Then tides (when is high and low, is it rising now), the sea (waves, swell, water temperature), and the moon. Inland places stay the weather app you built, untouched by any of this.
>
> What matters most to me, in order:
> 1. Trust. The verdicts follow the brief's rules exactly, and every reason says what a local would say ("Big waves and a strong wind; rain likely"). Never a vague score.
> 2. The first screen for a coastal place. Both verdicts are visible without scrolling on a phone. That means rethinking the top of the page for coastal results. Don't just squeeze everything smaller.
> 3. The tide chart. Someone should see at a glance when the tide turns and whether that lands at dawn or dusk. Mark now, the highs and lows, and the dawn and dusk windows.
> 4. The same finish as the weather: both themes, phone and desktop, every automated check green. The new checks add a coastal state to the contrast, overflow, tap-target and background checks.
>
> You have up to 40 hours. Get the contract green early, then use the time on the water experience and on real places against the live APIs (Cascais, Newquay, Honolulu, Sydney, Cape Town, Halifax, and a few inland cities). Look at every screen yourself. I'll review your claim the way a user would.

### Operator feedback #1

_2026-09-26 11:42 UTC_

> Operator's report on the previous run, and what this run is for (2026-09-26)
>
> Where you left off. I reviewed your last claim on the live demo: seven real places (overcast, clear, rain, night), phone and desktop, both themes. It is accepted. The mark above the hero icon is gone everywhere, and in the dark theme a grey day and a night are now easy to tell apart. Well done.
>
> Three small things I saw, to fix along the way:
> 1. The night "partly cloudy" icon draws the crescent moon inside the cloud, with a fragment of it poking out above. It looks like a drawing error. At night, the moon should sit clearly behind the cloud, like the sun does by day.
> 2. "Mainly clear" shows the same sun-behind-a-cloud as "Partly cloudy". Mainly clear should look mostly clear.
> 3. In the light theme, the forecast temperature bars for cool days (about 12-17°) come out olive or brown. They read as muddy. Cool should look cool.
>
> What changes now: read the new brief first. The app is no longer just a weather app. It becomes Shoreline, for people planning a day at the water: beach-goers, swimmers, anglers, surfers. For a coastal place, the first thing they see on their phone must answer two questions: is today good for the beach, and is it a good time to fish? Good, Fair or Poor, and why, in plain words. Then tides (when is high and low, is it rising now), the sea (waves, swell, water temperature), and the moon. Inland places stay the weather app you built, untouched by any of this.
>
> What matters most to me, in order:
> 1. Trust. The verdicts follow the brief's rules exactly, and every reason says what a local would say ("Big waves and a strong wind; rain likely"). Never a vague score.
> 2. The first screen for a coastal place. Both verdicts are visible without scrolling on a phone. That means rethinking the top of the page for coastal results. Don't just squeeze everything smaller.
> 3. The tide chart. Someone should see at a glance when the tide turns and whether that lands at dawn or dusk. Mark now, the highs and lows, and the dawn and dusk windows.
> 4. The same finish as the weather: both themes, phone and desktop, every automated check green. The new checks add a coastal state to the contrast, overflow, tap-target and background checks.
>
> You have up to 40 hours. Get the contract green early, then use the time on the water experience and on real places against the live APIs (Cascais, Newquay, Honolulu, Sydney, Cape Town, Halifax, and a few inland cities). Look at every screen yourself. I'll review your claim the way a user would.

### Operator feedback #2

_2026-09-27 20:34 UTC_

> Review of your claim (2026-09-27, 20:40 UTC). I tried Shoreline on live data: Cascais, Newquay, Honolulu, Sydney, Cape Town, Halifax and Madrid, on a phone and a desktop, in both themes.
>
> This is a big step. The first phone screen now answers "beach? fishing?" at once. The reasons read like a local ("worth an hour, not the day", "bracing but swimmable"). The tide chart with its dawn and dusk bands is the best thing in the app. Inland Madrid is left alone, and the empty state sets the scene well. Keep all of that.
>
> Three things to fix, in this order:
>
> 1. Tide turns go missing on real data. (This is a correction to the brief's rule, and the mistake is mine.) Live hourly sea levels often hold the same value for two hours at the top or bottom. Honolulu today reads 0.93 m at both 03:00 and 04:00, and 0.26 m at both 21:00 and 22:00. The strict "greater than both neighbours" rule skips those, so a user sees the curve peak at 3 a.m. while the list shows no High. Sydney's afternoon low is missing the same way. Amended rule: a run of two or more consecutive hours with the same value counts as ONE turn. It is a High if the hours just before and just after the run are both lower, a Low if both are higher. Its time is the first hour of the run. Use it for the list, the chart markers and the fishing verdict alike. Everything else about turns stays as the brief says. The checks' fixtures have no flat runs, so they stay green.
>
> 2. "The next turn" must be the next one after now. Honolulu at 10:27 says "the next low is at 10:00", which has already passed. The next turn is the High at 15:00. Cascais at 21:27 says "the next low is at 21:00". After today's last turn, say when the next turn is, using tomorrow's data (for example "next: High tomorrow at 03:00"), or say plainly that today's tides are done. A person at the car park should never read a time that has already gone as "next".
>
> 3. Desktop balance. On a wide screen the left column has a large empty gap between the hero and the hourly strip, while the water column runs long beside it. The hourly strip is also squeezed into the left column. Rebalance it so it reads as one composed dashboard, with no hole under the hero.
>
> Smaller, only if there is time:
> - A few chart labels sit on top of their dots or on the curve (Sydney's "08:00", Honolulu's "03:00"). Make every label clear of the line.
> - After sunset, "Beach today" is a verdict on a day that's over. A small, quiet "Tomorrow looks …" line is welcome as extra polish, if it never contradicts today's rules. It isn't required.
>
> Keep every check green, look at Honolulu, Sydney and Cascais yourself on live data after fix 1, commit, and finish.
