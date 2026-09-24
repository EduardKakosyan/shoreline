import sys

def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(rgb):
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])

def hx(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]

def ratio(f, b):
    a, bb = lum(hx(f)), lum(hx(b))
    return (max(a, bb) + 0.05) / (min(a, bb) + 0.05)

def L(h):
    return lum(hx(h))

def mix(a, b, t):
    ca, cb = hx(a), hx(b)
    return '#' + ''.join(f'{round(ca[i] + (cb[i] - ca[i]) * t):02x}' for i in range(3))

tests = {
    'light-page-text': ('#121828', ['#f4f7fc', '#e7ecf5', '#ffffff']),
    'light-muted':     ('#4c5a72', ['#f4f7fc', '#e7ecf5', '#ffffff']),
    'dark-page-text':  ('#e9eefb', ['#0c1322', '#070b14', '#141d31']),
    'dark-muted':      ('#9fb0c9', ['#0c1322', '#070b14', '#141d31']),
    'dark-soft':       ('#c3d0e6', ['#0c1322', '#141d31']),
    'white-on-blue':   ('#ffffff', ['#2f6fed', '#1f5fd6', '#1e4fbf', '#1b3f99']),
    'day-hero-darktext': ('#101a2b', ['#9ed4ff', '#ffe3ad', '#cfe9ff', '#a9bedb', '#7f97bb',
                                      '#cfd8e6', '#aebdd2', '#dbe7f5', '#b9cfe8', '#dfe5ec',
                                      '#c3ccd8', '#b7aede', '#8f86c9']),
    'night-hero-lighttext': ('#f0f5ff', ['#0b1533', '#1c2b57', '#1a2137', '#2b3450', '#101c2f',
                                         '#24354f', '#16233a', '#2d3f5c', '#1b2130', '#2a3143',
                                         '#191333', '#33255c']),
}

for k, (fg, bgs) in tests.items():
    print(f"{k:24s} fg={fg} " + "  ".join(f"{bg}:{ratio(fg, bg):.2f}" for bg in bgs))

print()
print('lums:', {h: round(L(h), 3) for h in ['#9ed4ff', '#ffe3ad', '#a9bedb', '#7f97bb', '#cfd8e6',
                                            '#aebdd2', '#b7aede', '#8f86c9', '#2b3450', '#33255c', '#2f6fed']})
