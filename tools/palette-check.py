"""Hero sky palettes: worst-case text contrast, per theme, per scene.

Reads token values straight out of styles.css so the table can never drift from
what the app renders. The acceptance checker treats every CSS gradient colour
stop as a contrast candidate and keeps the worst one, so a palette is only safe
when its worst stop still clears 4.5:1 for small text and 3:1 for large hero
text. This tool aims higher (6.0) so the design keeps visual room to breathe.

Contrast is a hard gate. How different two skies look is reported but NOT
gated: the icon and the condition text carry the condition, and the operator's
call on this run was to stop optimising palette numbers.

Usage: python3 tools/palette-check.py
"""

import os
import re
import sys

CSS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "styles.css")
FAMILIES = ["clear", "cloudy", "rain", "snow", "fog", "thunder"]
TARGET = 6.0
# reported, never enforced: a sanity signal that skies are not collapsing to one grey
DE_NOTE = 8.0
# CIE76 delta-E between two hero skies that a user must be able to tell apart at
# a glance (the sky is the condition cue behind the icon + condition text).
DE_MIN = 15.0

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


def lab(h):
    """sRGB hex -> CIE L*a*b* (D65)."""
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (1, 3, 5))
    m = [((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92 for c in (r, g, b)]
    x = m[0] * 0.4124 + m[1] * 0.3576 + m[2] * 0.1805
    y = m[0] * 0.2126 + m[1] * 0.7152 + m[2] * 0.0722
    z = m[0] * 0.0193 + m[1] * 0.1192 + m[2] * 0.9505
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x / 0.95047), f(y / 1.0), f(z / 1.08883)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def de76(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def tokens(text=None):
    if text is None:
        text = open(CSS, encoding="utf-8").read()
    return dict(re.findall(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;", text))


def dark_day_scenes(css):
    """Day scenes spelled out for the dark theme (dusk skies)."""
    out = {}
    rule = re.compile(r'html\[data-theme="dark"\] \.hero\[data-scene="([a-z-]+)"\][^{]*\{([^}]*)\}')
    for scene, body in rule.findall(css):
        stops = {}
        for i in (1, 2, 3):
            m = re.search(r"--hero-%d\s*:\s*(#[0-9a-fA-F]{3,8})" % i, body)
            if m:
                stops[i] = m.group(1)
        if len(stops) == 3:
            out[scene] = [stops[1], stops[2], stops[3]]
    return out


def main():
    css = open(CSS, encoding="utf-8").read()
    tk = tokens(css)
    dark_day = dark_day_scenes(css)
    worst_all = 99.0
    bad = []
    mids = {}
    print("%-22s %6s %6s %6s  ink" % ("scene", "text", "muted", "chip"))
    for fam in FAMILIES:
        for part in ("day", "night"):
            for theme in ("light", "dark"):
                scene = fam + "-" + part
                label = scene if theme == "light" else scene + " [dark]"
                if part == "day" and theme == "dark":
                    stops = dark_day.get(scene)
                    if stops is None:
                        print("%-22s  MISSING dark-theme day sky" % label)
                        bad.append(label)
                        continue
                else:
                    stops = [tk.get("--hero-%s-%s-%d" % (fam, part, i)) for i in (1, 2, 3)]
                    if any(v is None for v in stops):
                        print("%-22s  MISSING tokens" % label)
                        bad.append(label)
                        continue
                # deep skies (night; dusk days in the dark theme) take the light ink
                deep = part == "night" or theme == "dark"
                t, m, c = (
                    (NIGHT_TEXT, NIGHT_MUTED, NIGHT_CHIP)
                    if deep
                    else (DAY_TEXT, DAY_MUTED, DAY_CHIP)
                )
                rt = min(cr(t, s) for s in stops)
                rm = min(cr(m, s) for s in stops)
                rc = min(cr(c, s) for s in stops)
                worst = min(rt, rm, rc)
                worst_all = min(worst_all, worst)
                if worst < TARGET:
                    bad.append(label)
                mids[label] = stops[1]
                print("%-22s %6.2f %6.2f %6.2f  %s%s" % (
                    label, rt, rm, rc, "light" if deep else "dark",
                    "" if worst >= TARGET else "   <-- below %s" % TARGET))

    print("\nclosest skies per group (CIE76 delta-E - reported, never enforced):")
    for group in ("day", "night"):
        for theme in ("light", "dark"):
            names = [n for n in mids
                     if n.replace(" [dark]", "").endswith(group)
                     and (theme == "dark") == (" [dark]" in n)]
            pairs = sorted((round(de76(lab(mids[a]), lab(mids[b])), 1),
                            a.replace(" [dark]", "").replace("-" + group, ""),
                            b.replace(" [dark]", "").replace("-" + group, ""))
                           for i, a in enumerate(names) for b in names[i + 1:])
            if pairs:
                note = "   <- near-identical" if pairs[0][0] < DE_NOTE else ""
                print("  %-5s %-5s: closest %5.1f (%s vs %s)%s" % (
                    group, theme, pairs[0][0], pairs[0][1], pairs[0][2], note))

    print("\nworst hero contrast: %.2f  (target %s)" % (worst_all, TARGET))
    if bad:
        print("BELOW TARGET / MISSING:", ", ".join(bad))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
