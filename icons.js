/* Inline SVG icon library — bundled, no CDN. All icons are 24x24 viewBox,
   stroke = currentColor, optional accent fills via var(--icon-accent). */
(function () {
  const S = (d, extra) => `<path d="${d}"${extra ? ` ${extra}` : ""} />`;

  const rays = (cx, cy, r) => {
    const spokes = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i - Math.PI / 2;
      const x1 = cx + Math.cos(a) * (r + 2.4);
      const y1 = cy + Math.sin(a) * (r + 2.4);
      const x2 = cx + Math.cos(a) * (r + 4.9);
      const y2 = cy + Math.sin(a) * (r + 4.9);
      spokes.push(`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`);
    }
    return spokes.join("");
  };

  const cloudPath =
    "M7.6 18.5h9.1a3.4 3.4 0 0 0 .4-6.8 5.1 5.1 0 0 0-9.8-1.2 3.9 3.9 0 0 0 .3 8z";
  const smallCloudPath =
    "M8.4 17.6h7.4a2.9 2.9 0 0 0 .3-5.8 4.4 4.4 0 0 0-8.4-1 3.4 3.4 0 0 0 .7 6.8z";

  const sun = (cx, cy, r) =>
    `<g class="ic-sun"><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--icon-accent, currentColor)" stroke="none" />` +
    `<path d="${rays(cx, cy, r)}" stroke="var(--icon-accent, currentColor)" stroke-width="1.7" stroke-linecap="round" fill="none" /></g>`;

  const moon = (cx, cy, r) =>
    `<path d="M${cx + r * 0.55} ${cy - r * 0.95}a${r} ${r} 0 1 0 ${r * 0.72} ${r * 1.62} ` +
    `a${r * 0.82} ${r * 0.82} 0 1 1 ${-r * 0.72} ${-r * 0.62}z" fill="var(--icon-accent, currentColor)" stroke="none" />`;

  const drops = (n, y0, spread) => {
    const xs = n === 2 ? [9.8, 14.6] : n === 3 ? [8.6, 12, 15.4] : [7.6, 10.5, 13.5, 16.4];
    return xs
      .map((x, i) => `M${x} ${y0 + (i % 2) * 1.1}l-1.1 3`)
      .join("");
  };

  const flakes = (n) => {
    const xs = n === 2 ? [9.9, 14.5] : [8.6, 12, 15.4];
    return xs
      .map((x) => {
        const y = 19.4;
        const r = 1.5;
        return `M${x - r} ${y}h${r * 2}M${x} ${y - r}v${r * 2}M${x - r * 0.7} ${y - r * 0.7}l${r * 1.4} ${r * 1.4}M${x + r * 0.7} ${y - r * 0.7}l${-r * 1.4} ${r * 1.4}`;
      })
      .join("");
  };

  /** kind: 'day' | 'night' */
  const ICONS = {
    "clear-day": () => sun(12, 12, 4.6),
    "clear-night": () => moon(13.2, 12, 5.4),

    "partly-day": () =>
      sun(8.4, 7.6, 3.1) +
      `<path d="${cloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />`,
    "partly-night": () =>
      moon(8.9, 7.4, 3.4) +
      `<path d="${cloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />`,

    cloudy: () =>
      `<path d="${cloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />`,
    cloudyAlt: () =>
      `<path d="M6.2 15.8h6.9a2.7 2.7 0 0 0 .3-5.4 4.1 4.1 0 0 0-7.8-.9 3.2 3.2 0 0 0 .6 6.3z" fill="var(--ic-fill, currentColor)" fill-opacity="0.1" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />` +
      `<path d="M13.2 19.6h4.9a2.2 2.2 0 0 0 .2-4.4 3.3 3.3 0 0 0-6.3-.7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.65" />`,

    drizzle: () =>
      `<path d="${smallCloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />` +
      `<path d="${drops(3, 18.6, 6)}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none" />`,
    rain: () =>
      `<path d="${smallCloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />` +
      `<path d="${drops(3, 18.2, 6)}M7.4 20.2l-1.2 2.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none" />`,
    heavyRain: () =>
      `<path d="${smallCloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />` +
      `<path d="${drops(4, 18, 6)}M6.4 20.4l-1.3 2.8M18 20.4l-1.3 2.8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" fill="none" />`,
    sleet: () =>
      `<path d="${smallCloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />` +
      `<path d="${drops(2, 18.6, 6)}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none" />` +
      `<path d="${flakes(1)}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />`,
    snow: () =>
      `<path d="${smallCloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />` +
      `<path d="${flakes(3)}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />`,
    fog: () =>
      `<path d="M7.4 11.6h9.4a3.1 3.1 0 0 0 .3-6.2 4.7 4.7 0 0 0-9-1.1 3.6 3.6 0 0 0-.7 7.3z" fill="var(--ic-fill, currentColor)" fill-opacity="0.12" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />` +
      `<path d="M4 15.6h16M6.4 19h11.2M8.8 22.2h6.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none" opacity="0.85" />`,
    thunder: () =>
      `<path d="${smallCloudPath}" fill="var(--ic-fill, currentColor)" fill-opacity="0.14" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" />` +
      `<path d="M13.1 18.1l-3.4 4.2h2.5l-1 3.6 3.6-4.6h-2.4z" transform="translate(0 -3.1)" fill="var(--icon-accent, currentColor)" stroke="none" />`,
  };

  const UI = {
    search: `<path d="M11 4.3a6.7 6.7 0 1 1-4.8 11.4A6.7 6.7 0 0 1 11 4.3z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M16.1 16.1 20 20" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`,
    themeSun: `<circle cx="12" cy="12" r="4.4" fill="currentColor"/><path d="${rays(12, 12, 4.4)}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
    themeMoon: `<path d="M13.6 3.4a8.8 8.8 0 1 0 7 12.7A7.2 7.2 0 0 1 13.6 3.4z" fill="currentColor"/>`,
    pin: `<path d="M12 21s6.4-6 6.4-10.4A6.4 6.4 0 0 0 5.6 10.6C5.6 15 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="10.4" r="2.3" fill="currentColor"/>`,
    droplet: `<path d="M12 3.4c3.2 3.8 5.2 6.2 5.2 8.9a5.2 5.2 0 0 1-10.4 0c0-2.7 2-5.1 5.2-8.9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`,
    wind: `<path d="M3.5 8.5h9.2a2.6 2.6 0 1 0-2.6-2.6M3.5 15.5h12.2a2.6 2.6 0 1 1-2.6 2.6M3.5 12h16.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    thermometer: `<path d="M14.2 13.6V5.4a2.2 2.2 0 1 0-4.4 0v8.2a4.2 4.2 0 1 0 4.4 0z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>`,
    sunrise: `<path d="M12 3.2v3.4M5.4 9.6 7.6 11M18.6 9.6 16.4 11M3 18h18M8 21h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.4 15.4A3.6 3.6 0 0 1 15.6 15.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    sunset: `<path d="M12 8.4V5M5.4 9.6 7.6 11M18.6 9.6 16.4 11M3 18h18M8 21h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8.4 15.4A3.6 3.6 0 0 1 15.6 15.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    compass: `<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15.4 8.6 10.6 10.6 8.6 15.4l4.8-2z" fill="currentColor"/>`,
    refresh: `<path d="M20 7.5A8.2 8.2 0 1 0 21 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20.4 3.4v4.4H16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    trash: `<path d="M4.8 7.4h14.4M9.4 4.2h5.2M6.6 7.4l.9 12.2a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
    alert: `<path d="M12 3.6 21 19.4H3L12 3.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v4.6M12 16.6h.02" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>`,
    globe: `<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3.6 12h16.8M12 3.4c2.4 2.6 3.5 5.5 3.5 8.6s-1.1 6-3.5 8.6c-2.4-2.6-3.5-5.5-3.5-8.6s1.1-6 3.5-8.6z" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    star: `<path d="M12 3.8l2.4 5 5.5.8-4 3.9 1 5.5-4.9-2.6-4.9 2.6 1-5.5-4-3.9 5.5-.8 2.4-5z" fill="currentColor"/>`,
    clock: `<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.2V12l3.4 2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    chevron: `<path d="M9.4 5.6 15.8 12l-6.4 6.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    empty: `<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>`,
  };

  function svg(inner, opts) {
    const o = opts || {};
    const size = o.size ? ` width="${o.size}" height="${o.size}"` : "";
    const cls = o.cls ? ` class="${o.cls}"` : "";
    return `<svg${size}${cls} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">${inner}</svg>`;
  }

  /** Map a WMO code + is_day flag to an icon markup string. */
  function weatherIcon(code, isDay, opts) {
    const day = isDay !== 0;
    let fn;
    if (code === 0) fn = day ? ICONS["clear-day"] : ICONS["clear-night"];
    else if (code === 1) fn = day ? ICONS["partly-day"] : ICONS["partly-night"];
    else if (code === 2) fn = day ? ICONS["partly-day"] : ICONS["partly-night"];
    else if (code === 3) fn = ICONS.cloudy;
    else if (code === 45 || code === 48) fn = ICONS.fog;
    else if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) fn = ICONS.drizzle;
    else if (code === 61 || code === 63 || code === 66 || code === 80 || code === 81) fn = ICONS.rain;
    else if (code === 65 || code === 67 || code === 82) fn = ICONS.heavyRain;
    else if (code === 71 || code === 73 || code === 77 || code === 85 || code === 86) fn = ICONS.snow;
    else if (code === 75) fn = ICONS.snow;
    else if (code === 95 || code === 96 || code === 99) fn = ICONS.thunder;
    else fn = ICONS.cloudyAlt;
    return svg(fn(), opts);
  }

  function uiIcon(name, opts) {
    return svg(UI[name] || UI.globe, opts);
  }

  window.Icons = { weatherIcon, uiIcon, svg };
})();
