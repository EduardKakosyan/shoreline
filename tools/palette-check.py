"""Worst-case contrast of hero text colours against the hero gradient stops.

Reads token values straight out of styles.css so the table can never drift from
what the app renders. The acceptance checker treats every CSS gradient colour
stop as a contrast candidate and keeps the worst one, so a palette is only safe
when its worst stop still clears 4.5:1 for small text and 3:1 for large hero
text. This tool aims higher (6.0) so the design keeps visual room to breathe.

Usage: python3 tools/palette-check.py
"""

import os
import re
import sys

CSS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "styles.css")
FAMILIES = ["clear", "cloudy", "rain", "snow", "fog", "thunder"]
TARGET = 6.0

DAY_TEXT, DAY_MUTED, DAY_CHIP = "#0e1728", "#17283f", "#16233a"
NIGHT_TEXT, NIGHT_MUTED, NIGHT_CHIP = "#f0f5ff", "#c3d3ec", "#eaf1ff"


def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(h):
    r, g, b = (int(h[i : i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def cr(a, b):
    A, B = lum(a), lum(b)
    return (max(A, B) + 0.05) / (min(A, B) + 0.05)


def tokens():
    text = open(CSS, encoding="utf-8").read()
    return dict(re.findall(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;", text))


def main():
    tk = tokens()
    worst_all = 99.0
    bad = []
    print(f"{'scene':16} {'text':>6} {'muted':>6} {'chip':>6}  note")
    for fam in FAMILIES:
        for part in ("day", "night"):
            scene = f"{fam}-{part}"
            keys = [f"--hero-{fam}-{part}-{i}" for i in (1, 2, 3)]
            stops = [tk.get(k) for k in keys]
            missing = [k for k, v in zip(keys, stops) if v is None]
            if missing:
                print(f"{scene:16}  MISSING {', '.join(missing)}")
                bad.append(scene)
                worst_all = 0.0
                continue
            night = part == "night"
            t, m, c = (
                (NIGHT_TEXT, NIGHT_MUTED, NIGHT_CHIP) if night else (DAY_TEXT, DAY_MUTED, DAY_CHIP)
            )
            rt = min(cr(t, s) for s in stops)
            rm = min(cr(m, s) for s in stops)
            rc = min(cr(c, s) for s in stops)
            worst = min(rt, rm, rc)
            worst_all = min(worst_all, worst)
            if worst < TARGET:
                bad.append(scene)
            print(
                f"{scene:16} {rt:6.2f} {rm:6.2f} {rc:6.2f}"
                + ("" if worst >= TARGET else f"   <-- below {TARGET}")
            )
    print(f"\nworst hero contrast: {worst_all:.2f}  (target {TARGET})")
    if bad:
        print("BELOW TARGET / MISSING:", ", ".join(bad))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
