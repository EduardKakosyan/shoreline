#!/bin/sh
# Runs everything: the acceptance suite twice, then every design harness.
# The app must already be served on APP_URL (default http://localhost:3000).
set -u
: "${APP_URL:=http://localhost:3000}"
export APP_URL
fail=0

run() {
  printf '\n=== %s ===\n' "$1"
  shift
  if "$@"; then
    printf 'PASS: %s\n' "$1"
  else
    printf 'FAIL: %s\n' "$1"
    fail=1
  fi
}

run "playwright suite (run 1)" npx playwright test
run "playwright suite (run 2)" npx playwright test
run "design audit" node audit/run-audit.js
run "pixel review" python3 audit/pixel-review.py
run "design lint" node audit/design-lint.js
run "width sweep" node audit/widths.js
run "keyboard audit" node audit/keyboard.js
run "clean initial load" node audit/first-load.js
run "recents order stress" node audit/order-stress.js
run "hourly strip invariants" node audit/hourly.js
run "hero mark carries no stray paint" node audit/hero-marks.js
run "first-screen look (mobile + laptop, inland + coastal)" node audit/look.js
run "hero palette contrast" python3 tools/palette-check.py
run "water rules vs the fixture verdicts" node audit/water-rules.js
run "water first screen + chart fidelity" node audit/water-look.js
run "water composition lint" node audit/water-lint.js
run "weather marks (mainly clear, night moon)" node audit/icon-check.js

printf '\n'
if [ "$fail" -eq 0 ]; then
  echo "ALL VERIFIERS PASS"
else
  echo "SOME VERIFIERS FAILED"
fi
exit "$fail"
