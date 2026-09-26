"""Screenshot review: objective checks over the rendered PNGs.

Catches the failure classes an eye pass would catch - an unthemed strip at the
bottom of a dark page, a hero that does not separate from the page, night skies
that do not read as night, scenes that look identical - without needing eyes.

Usage: python3 audit/pixel-review.py [png ...]
"""

import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))


def load(p):
    return Image.open(p).convert("RGB")


def region(img, x0, y0, x1, y1):
    """Average colour of a box, coordinates as fractions when < 1."""
    w, h = img.size
    x0 = int(x0 * w if x0 < 1 else x0)
    x1 = int(x1 * w if x1 < 1 else x1)
    y0 = int(y0 * h if y0 < 1 else y0)
    y1 = int(y1 * h if y1 < 1 else y1)
    box = img.crop((x0, y0, x1, y1)).resize((1, 1), Image.Resampling.BOX)
    return box.getpixel((0, 0))


def lum(rgb):
    def lin(c):
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def dist(a, b):
    return round(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5, 1)


def near_white_frac(img, y0, y1, thresh=242):
    w, h = img.size
    box = img.crop((0, int(y0 * h), w, int(y1 * h)))
    px = list(box.getdata())
    if not px:
        return 0.0
    n = sum(1 for p in px if min(p) >= thresh)
    return round(n / len(px), 4)


def main():
    files = sys.argv[1:]
    if not files:
        files = sorted(
            os.path.join(HERE, f)
            for f in os.listdir(HERE)
            if (f.startswith("shot-") or f.startswith("scene-")) and f.endswith(".png")
        )
    issues = []
    imgs = {os.path.basename(f): load(f) for f in files}
    print(f"{'file':34} {'size':11} {'top':9} {'mid':9} {'bottom':9}")
    for name, img in imgs.items():
        top = region(img, 0, 0.01, 1, 0.05)
        mid = region(img, 0, 0.45, 1, 0.5)
        bot = region(img, 0, 0.95, 1, 0.995)
        print(f"{name:34} {str(img.size):11} {str(top):9} {str(mid):9} {str(bot):9}")

    for name, img in imgs.items():
        if not name.startswith("shot-"):
            continue
        dark = name.endswith("dark.png") or "dark" in name.split("-")
        # an unthemed strip: near-white band across the bottom of a dark page
        if dark:
            frac = near_white_frac(img, 0.9, 1.0)
            if frac > 0.02:
                issues.append(f"{name}: {frac*100:.1f}% near-white pixels at the bottom (unthemed strip?)")
            bl = lum(region(img, 0, 0.95, 1, 0.995))
            if bl > 0.45:
                issues.append(f"{name}: dark theme bottom is bright (lum {bl:.2f})")
        else:
            bl = lum(region(img, 0, 0.95, 1, 0.995))
            if bl < 0.25:
                issues.append(f"{name}: light theme bottom is dark (lum {bl:.2f})")

    # a results hero must separate from the surface it sits on: compare the hero
    # card against the page background directly above it, same viewport shot
    for theme in ("light", "dark"):
        vp = imgs.get(f"shot-{theme}-viewport.png")
        if vp:
            page_strip = region(vp, 0, 0.02, 1, 0.06)
            hero = region(vp, 0.15, 0.42, 0.85, 0.5)
            d = dist(page_strip, hero)
            print(f"{theme}: hero-vs-page distance in the live viewport {d}")
            if d < 30:
                issues.append(f"{theme}: hero does not separate from the page in the viewport (distance {d})")

    # day and night skies must look different, in both themes: the dark theme's
    # daytime skies are lifted only as far as its ink contrast allows, and a
    # reviewer could not tell an overcast day from a night there by lightness
    # alone until the two groups were pulled apart.
    for fam in ("clear", "cloudy", "rain", "snow", "fog", "thunder"):
        for suffix, label, floor in (("", "", 30), ("-dark", " [dark]", 20)):
            ia = imgs.get(f"scene-{fam}-day{suffix}.png")
            ib = imgs.get(f"scene-{fam}-night{suffix}.png")
            if not (ia and ib):
                issues.append(f"missing scene-{fam}-day{suffix}.png / scene-{fam}-night{suffix}.png")
                continue
            d = dist(region(ia, 0.1, 0.25, 0.9, 0.4), region(ib, 0.1, 0.25, 0.9, 0.4))
            print(f"scene {fam}-day vs {fam}-night{label}: distance {d} (floor {floor})")
            if d < floor:
                issues.append(f"night {fam}-night{label} does not differ from its day (distance {d})")

    if issues:
        print("\nISSUES:")
        for i in issues:
            print("  " + i)
        return 1
    print("\nPIXEL REVIEW CLEAN")
    return 0


if __name__ == "__main__":
    sys.exit(main())
