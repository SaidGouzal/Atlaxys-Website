// Reflow check (WCAG 1.4.10): reports content wider than the viewport that is not inside a scroll container.
// Usage: node overflow.mjs <base-url> <dist-dir> [width=375]
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [base, dist, width = '375'] = process.argv.slice(2);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
const pages = walk(dist).map((f) => '/' + path.relative(dist, f).replace(/index\.html$/, ''));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(width), height: 800 } });
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await ctx.addInitScript(() => { try { localStorage.setItem('atlaxys-consent', JSON.stringify({ v: 2, analytics: false, marketing: false, ts: new Date().toISOString() })); } catch {} });
let bad = 0;
for (const p of pages) {
  const page = await ctx.newPage();
  await page.goto(base + p); await page.waitForTimeout(300);
  const out = await page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const res = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || r.right <= W + 1 && r.left >= -1) continue;
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"], dialog:not([open]), [hidden]')) continue;
      // Contained by a scrolling/clipping ancestor that itself fits the viewport?
      let a = el.parentElement, contained = false;
      while (a && a !== document.body) {
        const as = getComputedStyle(a); const ar = a.getBoundingClientRect();
        if (as.overflowX !== 'visible' && ar.right <= W + 1 && ar.left >= -1) { contained = true; break; }
        a = a.parentElement;
      }
      if (contained) continue;
      if (el.children.length && [...el.children].some((c) => { const cr = c.getBoundingClientRect(); return cr.right > W + 1 || cr.left < -1; })) continue; // report deepest only
      res.push(`${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')} [${Math.round(r.left)}→${Math.round(r.right)}] "${(el.textContent || '').trim().slice(0, 40)}"`);
    }
    return res.slice(0, 4);
  });
  if (out.length) { bad++; console.log(p, '\n   ', out.join('\n    ')); }
  await page.close();
}
await browser.close();
console.log(`${bad} pages with uncontained overflow at ${width}px`);
