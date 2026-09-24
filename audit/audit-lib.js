/* In-page auditor: mirrors checks/visual.ts rules (kept independent on purpose)
   and reports contrast / coverage / tap / overflow findings. */
function auditPage(opts) {
  const MIN_TEXT = 4.5, MIN_LARGE = 3, MIN_TAP = 43.5;
  const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const lin = (c8) => { const c = c8 / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const contrast = (f, b) => { const a = lum(f), c = lum(b); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05); };
  const hex = (rgb) => '#' + rgb.map((v) => clamp8(v).toString(16).padStart(2, '0')).join('');
  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const parse = (v) => {
    const m = (v || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.length < 3 || p.slice(0, 3).some(Number.isNaN)) return null;
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const over = (fg, bg) => [clamp8(fg[0] * fg[3] + bg[0] * (1 - fg[3])), clamp8(fg[1] * fg[3] + bg[1] * (1 - fg[3])), clamp8(fg[2] * fg[3] + bg[2] * (1 - fg[3]))];
  const stopsOf = (img) => {
    if (!img || img === 'none') return [];
    const out = []; const re = /rgba?\(([^)]*)\)/g; let m;
    while ((m = re.exec(img))) {
      const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (p.length >= 3 && !p.slice(0, 3).some(Number.isNaN)) out.push([p[0], p[1], p[2]]);
    }
    return out;
  };
  const selectorOf = (el) => {
    const tid = el.getAttribute('data-testid');
    if (tid) return `[data-testid="${tid}"]`;
    let s = el.tagName.toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    const txt = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
    return txt ? `${s} "${txt.slice(0, 46)}"` : s;
  };
  const chainOf = (el) => { const c = []; let n = el; while (n) { c.unshift(n); n = n.parentElement; } return c; };
  const chainOpacity = (el) => { let op = 1; for (const a of chainOf(el)) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; op *= parseFloat(cs.opacity); } return op; };
  const bgOf = (el) => {
    let base = [255, 255, 255], candidates = null, bitmap = false;
    for (const a of chainOf(el)) {
      const cs = getComputedStyle(a);
      const c = parse(cs.backgroundColor);
      const stops = stopsOf(cs.backgroundImage);
      if (cs.backgroundImage && cs.backgroundImage.includes('url(')) bitmap = true;
      if (c && c[3] >= 0.99) { base = [c[0], c[1], c[2]]; candidates = stops.length ? stops.map((s) => over(s, base)) : null; }
      else { if (c && c[3] > 0) base = over(c, base); if (stops.length) candidates = stops.map((s) => over(s, base)); }
    }
    const list = candidates && candidates.length ? candidates : [base];
    return { base: hex(base), candidates: list.map(hex), bitmap };
  };
  const insideScroller = (el) => { let p = el.parentElement; while (p) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll') return true; p = p.parentElement; } return false; };
  const clippedByScroller = (el, r) => {
    let p = el.parentElement;
    while (p) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') { const pr = p.getBoundingClientRect(); if (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) return true; }
      p = p.parentElement;
    }
    return false;
  };
  const requiredFor = (cs) => { const px = parseFloat(cs.fontSize); const w = parseFloat(cs.fontWeight); return px >= 24 || (w >= 700 && px >= 18.66) ? MIN_LARGE : MIN_TEXT; };

  const out = { text: [], coverage: [], tap: [], overflow: [], doc: {}, hero: null };
  const iw = window.innerWidth, ih = window.innerHeight;
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - ih);

  if (opts.text) {
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'META', 'LINK']);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement; const text = (node.textContent ?? '').trim();
      if (!text || !el || skip.has(el.tagName) || seen.has(el)) continue;
      seen.add(el);
      if (el.closest('svg')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const alpha = chainOpacity(el);
      if (alpha < 0.05) continue;
      if (clippedByScroller(el, r)) continue;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color); if (!fg) continue;
      const bg = bgOf(el); const req = requiredFor(cs);
      let worst = Infinity, worstBg = bg.base;
      for (const cand of bg.candidates) {
        const bgRgb = hexRgb(cand);
        const fgRgb = alpha >= 0.999 ? [fg[0], fg[1], fg[2]] : over([fg[0], fg[1], fg[2], alpha], bgRgb);
        const ratio = contrast(fgRgb, bgRgb);
        if (ratio < worst) { worst = ratio; worstBg = cand; }
      }
      if (bg.bitmap && worst < req) { worst = 0; worstBg = 'bitmap'; }
      if (worst < req) out.text.push({ sel: selectorOf(el), text: text.slice(0, 50), fg: hex([fg[0], fg[1], fg[2]]), bg: worstBg, ratio: +worst.toFixed(2), req: req, size: parseFloat(cs.fontSize) });
    }
    for (const inputEl of Array.from(document.querySelectorAll('input, textarea'))) {
      const input = inputEl;
      if (input.type === 'hidden' || !input.placeholder) continue;
      if ((input.value ?? '') !== '') continue;
      const r = input.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (chainOpacity(input) < 0.05) continue;
      const cs = getComputedStyle(input, '::placeholder');
      const ph = parse(cs.color); if (!ph) continue;
      const bg = bgOf(input);
      let worst = Infinity, worstBg = bg.base;
      for (const cand of bg.candidates) { const ratio = contrast([ph[0], ph[1], ph[2]], hexRgb(cand)); if (ratio < worst) { worst = ratio; worstBg = cand; } }
      if (worst < MIN_TEXT) out.text.push({ sel: selectorOf(input) + '::placeholder', text: input.placeholder.slice(0, 50), fg: hex([ph[0], ph[1], ph[2]]), bg: worstBg, ratio: +worst.toFixed(2), req: MIN_TEXT, size: parseFloat(cs.fontSize) });
    }
  }

  if (opts.coverage) {
    document.documentElement.style.setProperty('scroll-behavior', 'auto');
    const modes = { top: 0, middle: Math.round(maxScroll / 2), bottom: maxScroll };
    for (const key of Object.keys(modes)) {
      window.scrollTo(0, modes[key]);
      for (const y of [ih - 2, ih - 10]) {
        for (const x of [Math.round(iw * 0.5), 8, iw - 8]) {
          const at = document.elementFromPoint(x, y);
          const bg = bgOf(at);
          let textEl = at, hops = 0;
          while (textEl && hops < 5) {
            const direct = Array.from(textEl.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 0);
            if (direct) break;
            textEl = textEl.parentElement; hops++;
          }
          const cs = textEl ? getComputedStyle(textEl) : getComputedStyle(document.body);
          const fg = textEl ? parse(cs.color) : parse(getComputedStyle(document.body).color);
          const fgRgb = fg ? [fg[0], fg[1], fg[2]] : [17, 17, 17];
          const req = requiredFor(cs);
          let worst = Infinity, worstBg = bg.base;
          for (const cand of bg.candidates) { const ratio = contrast(fgRgb, hexRgb(cand)); if (ratio < worst) { worst = ratio; worstBg = cand; } }
          if (bg.bitmap && worst < req) { worst = 0; worstBg = 'bitmap'; }
          if (worst < req) out.coverage.push({ where: `${key} under ${at ? selectorOf(at) : 'html'}`, fg: hex(fgRgb), bg: worstBg, ratio: +worst.toFixed(2), req: req });
        }
      }
    }
    window.scrollTo(0, 0);
  }

  if (opts.tap) {
    const sel = ['button', '[role="button"]', 'input[type="submit"]', '[data-testid="recent-chip"]', '[data-testid="match-option"]', '[data-testid="unit-toggle"]', '[data-testid="theme-toggle"]', '[data-testid="try-again"]'].join(', ');
    for (const el of Array.from(document.querySelectorAll(sel))) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (chainOpacity(el) < 0.05) continue;
      if (r.width < MIN_TAP || r.height < MIN_TAP) out.tap.push({ sel: selectorOf(el), text: (el.textContent ?? '').trim().slice(0, 40), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    }
  }

  if (opts.overflow) {
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (chainOpacity(el) < 0.05) continue;
      if (insideScroller(el)) continue;
      if (r.width > iw + 1) out.overflow.push({ sel: selectorOf(el), w: +r.width.toFixed(1), iw: iw });
      if (out.overflow.length > 8) break;
    }
    if (document.documentElement.scrollWidth > iw + 1 || document.body.scrollWidth > iw + 1) out.overflow.push({ sel: 'html/body scrollWidth', w: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), iw: iw });
  }

  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    const cs = getComputedStyle(heroEl);
    const temp = document.querySelector('.current-temperature');
    out.hero = {
      scene: heroEl.dataset.scene || null,
      bgImage: cs.backgroundImage.slice(0, 160),
      fontSize: temp ? parseFloat(getComputedStyle(temp).fontSize) : null,
    };
  }
  out.doc = { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, iw: iw, ih: ih };
  return out;
}
