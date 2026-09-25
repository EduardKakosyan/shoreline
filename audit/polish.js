/* Polish metrics: how much headroom the design has, not just pass/fail.
   Reports worst contrast per state x theme, tap minima, clipped text,
   spacing rhythm and hero palette headroom. Run: node audit/polish.js */
const fs = require('fs');
const { chromium } = require('@playwright/test');
const { installStub, setTheme, searchMapFor, MATCHES } = require('./stub.js');
const LONDONS = ['london_gb', 'london_ca', 'london_oh', 'london_ky', 'london_ar'];
const SEARCH = Object.assign(searchMapFor(Object.keys(MATCHES)), { london: LONDONS, atlantis: [] });

const BASE = process.env.APP_URL || 'http://localhost:3000';

const IN_PAGE = `(() => {
  const clamp8=(v)=>Math.max(0,Math.min(255,Math.round(v)));
  const lin=(c)=>{c=c/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
  const lum=(r)=>0.2126*lin(r[0])+0.7152*lin(r[1])+0.0722*lin(r[2]);
  const contrast=(f,b)=>{const a=lum(f),c=lum(b);return (Math.max(a,c)+0.05)/(Math.min(a,c)+0.05)};
  const hex=(r)=>'#'+r.map(v=>clamp8(v).toString(16).padStart(2,'0')).join('');
  const hexRgb=(h)=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
  const parse=(v)=>{const m=(v||'').match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(/[\\s,/]+/).filter(Boolean).map(Number);if(p.length<3||p.slice(0,3).some(Number.isNaN))return null;return [p[0],p[1],p[2],p.length>3?p[3]:1]};
  const over=(f,b)=>[clamp8(f[0]*f[3]+b[0]*(1-f[3])),clamp8(f[1]*f[3]+b[1]*(1-f[3])),clamp8(f[2]*f[3]+b[2]*(1-f[3]))];
  const stopsOf=(img)=>{if(!img||img==='none')return[];const o=[];const re=/rgba?\\(([^)]*)\\)/g;let m;while((m=re.exec(img))){const p=m[1].split(/[\\s,/]+/).filter(Boolean).map(Number);if(p.length>=3&&!p.slice(0,3).some(Number.isNaN))o.push([p[0],p[1],p[2]])}return o};
  const chainOf=(el)=>{const c=[];let n=el;while(n){c.unshift(n);n=n.parentElement}return c};
  const chainOp=(el)=>{let o=1;for(const a of chainOf(el)){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden')return 0;o*=parseFloat(cs.opacity)}return o};
  const bgOf=(el)=>{let base=[255,255,255],cands=null;for(const a of chainOf(el)){const cs=getComputedStyle(a);const c=parse(cs.backgroundColor);const st=stopsOf(cs.backgroundImage);if(c&&c[3]>=0.99){base=[c[0],c[1],c[2]];cands=st.length?st.map(s=>over([s[0],s[1],s[2],1],base)):null}else{if(c&&c[3]>0)base=over(c,base);if(st.length)cands=st.map(s=>over(s,base))}}const list=cands&&cands.length?cands:[base];return {base:hex(base),candidates:list.map(hex)}};
  const req=(cs)=>{const px=parseFloat(cs.fontSize),w=parseFloat(cs.fontWeight);return px>=24||(w>=700&&px>=18.66)?3:4.5};
  const sel=(el)=>{const t=el.getAttribute('data-testid');if(t)return '[tid='+t+']';let s=el.tagName.toLowerCase();const c=(typeof el.className==='string'?el.className:'').split(/\\s+/).filter(Boolean).slice(0,2);if(c.length)s+='.'+c.join('.');return s};
  const rows=[];
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){const el=n.parentElement;const txt=(n.textContent||'').trim();if(!txt||!el)continue;
    if(/SCRIPT|STYLE|NOSCRIPT/.test(el.tagName))continue;
    const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;if(chainOp(el)<0.05)continue;
    let clipped=false;let p=el.parentElement;while(p){const ox=getComputedStyle(p).overflowX;if(ox==='auto'||ox==='scroll'){const pr=p.getBoundingClientRect();if(r.right>pr.right+1.5||r.left<pr.left-1.5)clipped=true}p=p.parentElement}
    if(clipped)continue;
    const cs=getComputedStyle(el);const fg=parse(cs.color);if(!fg)continue;
    const bg=bgOf(el);let worst=Infinity;
    for(const cand of bg.candidates){worst=Math.min(worst,contrast([fg[0],fg[1],fg[2]],hexRgb(cand)))}
    const need=req(cs);
    rows.push({sel:sel(el),txt:txt.slice(0,34),fs:parseFloat(cs.fontSize),fw:cs.fontWeight,ratio:Math.round(worst*100)/100,need,head:Math.round((worst-need)*100)/100});
  }
  const tap=[];
  document.querySelectorAll('button,[role=button],input[type=submit],[data-testid=recent-chip],[data-testid=match-option],[data-testid=unit-toggle],[data-testid=theme-toggle],[data-testid=try-again]').forEach((el)=>{
    const r=el.getBoundingClientRect();if(r.width<2||r.height<2||chainOp(el)<0.05)return;
    tap.push({sel:sel(el),w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10});
  });
  const clippedText=[];
  document.querySelectorAll('body *').forEach((el)=>{
    if(!el.children.length && !(el.textContent||'').trim())return;
    const cs=getComputedStyle(el);
    if(cs.clipPath!=='none')return;
    if(cs.overflowX==='visible'||el.scrollWidth<=el.clientWidth+1)return;
    const r=el.getBoundingClientRect();
    if(r.width<=2||chainOp(el)<0.05)return;
    clippedText.push({sel:sel(el),txt:(el.textContent||'').trim().slice(0,30),sw:el.scrollWidth,cw:el.clientWidth,clip:cs.textOverflow});
  });
  return {text:rows.sort((a,b)=>a.head-b.head).slice(0,8),tapMin:tap.sort((a,b)=>Math.min(a.w,a.h)-Math.min(b.w,b.h)).slice(0,4),clipped:clippedText.slice(0,8)};
})()`;

async function state(page, name) {
  if (name === 'empty') return;
  if (name === 'picker') {
    await page.fill('#city-input', 'London');
    await page.press('#city-input', 'Enter');
    await page.getByTestId('match-option').first().waitFor();
    return;
  }
  if (name === 'notice') {
    await page.fill('#city-input', 'Atlantis');
    await page.press('#city-input', 'Enter');
    await page.getByTestId('notice').waitFor();
    return;
  }
  if (name === 'error') {
    await page.fill('#city-input', 'London');
    await page.press('#city-input', 'Enter');
    await page.getByTestId('match-option').filter({ hasText: 'Kentucky' }).click();
    await page.getByTestId('error').waitFor();
    return;
  }
  await page.fill('#city-input', 'Paris');
  await page.press('#city-input', 'Enter');
  await page.getByTestId('current-weather').waitFor();
}

const SCENES = [
  'clear-day', 'clear-night', 'cloudy-day', 'cloudy-night', 'rain-day', 'rain-night',
  'snow-day', 'snow-night', 'fog-day', 'fog-night', 'thunder-day', 'thunder-night',
];

(async () => {
  const browser = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    for (const name of ['empty', 'results', 'picker', 'notice', 'error']) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await installStub(page, { search: SEARCH, failing: name === 'error' ? ['london_ky'] : [] });
      await page.goto(BASE + '/');
      await setTheme(page, theme);
      await state(page, name);
      await page.waitForTimeout(700);
      const res = await page.evaluate(IN_PAGE);
      console.log(`\n### ${theme}/${name}`);
      for (const r of res.text) console.log(`   head ${String(r.head).padStart(6)}  ${r.sel} "${r.txt}" ${r.fs}px/${r.fw} ratio ${r.ratio} need ${r.need}`);
      console.log('   tap min: ' + res.tapMin.map((t) => `${t.sel} ${t.w}x${t.h}`).join(' | '));
      if (res.clipped.length) console.log('   CLIPPED: ' + JSON.stringify(res.clipped));
      await ctx.close();
    }

    /* hero palette headroom: worst contrast of every hero text element */
    for (const scene of SCENES) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      await installStub(page, { search: SEARCH });
      await page.goto(BASE + '/');
      await setTheme(page, theme);
      await state(page, 'results');
      await page.evaluate((s) => { const st = document.createElement('style'); st.textContent = '*,*::before,*::after{transition:none !important;animation:none !important}'; document.head.appendChild(st); document.querySelector('.hero').dataset.scene = s; }, scene);
      await page.waitForTimeout(120);
      const res = await page.evaluate(IN_PAGE);
      const heroRows = res.text.filter((r) => /hero|temperature|condition|location|metric|feels/.test(r.sel));
      const worst = heroRows.length ? heroRows[0] : null;
      console.log(`\n### ${theme}/hero=${scene}  worst hero text head: ${worst ? worst.head : 'n/a'} ${worst ? worst.sel : ''}`);
      await ctx.close();
    }
  }
  await browser.close();
})();
