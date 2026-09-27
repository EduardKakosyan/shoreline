import sys
from PIL import Image

p = sys.argv[1]
im = Image.open(p).convert("RGB")
w, h = im.size
px = im.load()
# page background = the pixel at the very left edge, near the bottom
bg = px[2, h - 40]

def ink_frac(x0, x1, y):
    n = d = 0
    for x in range(x0, x1, 2):
        r, g, b = px[x, y]
        d += 1
        if abs(r-bg[0]) + abs(g-bg[1]) + abs(b-bg[2]) > 24:
            n += 1
    return n / max(d, 1)

def scan(x0, x1, name):
    # a row counts as inked if >=3% of its samples differ from page bg
    rows = [ink_frac(x0, x1, y) >= 0.03 for y in range(h)]
    first = next((i for i, v in enumerate(rows) if v), None)
    last = next((i for i in range(h-1, -1, -1) if rows[i]), None)
    if first is None:
        print(f"{name}: empty")
        return
    runs = []
    y = first
    while y <= last:
        if not rows[y]:
            y0 = y
            while y <= last and not rows[y]:
                y += 1
            runs.append((y0, y - y0))
        else:
            y += 1
    runs.sort(key=lambda r: -r[1])
    worst = runs[:3]
    print(f"{name}: x{x0}-{x1} content y{first}-{last}, longest empty bands: " +
          ", ".join(f"{ln}px starting y{y0}" for y0, ln in worst))

scan(int(0.03*w)+8, int(w*0.46), "left column ")
scan(int(w*0.52), int(w*0.95), "right column")
scan(int(0.03*w)+8, int(w*0.95), "full width  ")
