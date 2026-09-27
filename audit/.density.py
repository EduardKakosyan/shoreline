import sys
from PIL import Image
p = sys.argv[1]
step = int(sys.argv[2]) if len(sys.argv) > 2 else 14
im = Image.open(p).convert("L")
w, h = im.size
px = im.load()
chars = " .:-=+*#%@"
print(f"{p}  {w}x{h}")
for y in range(0, h, step):
    row = []
    for x in range(0, w, step):
        tot = n = 0
        for yy in range(y, min(y+step, h)):
            for xx in range(x, min(x+step, w)):
                tot += px[xx, yy]; n += 1
        v = tot / max(n,1)
        row.append(chars[min(9, int((255 - v) / 25.6))])
    print(f"{y:5d} |{''.join(row)}|")
