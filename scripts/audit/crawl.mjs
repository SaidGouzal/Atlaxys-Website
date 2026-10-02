// axe-core (WCAG 2.2 A/AA + best practice), console/CSP errors and overflow on every built page.
// Usage: node crawl.mjs <base> <dist> <desktop|tablet|mobile|reflow> [filter]
// Env: REDUCED=1 reduced motion · NOAXE=1 skip axe and keep the CSP enforced (axe is injected inline, so
// axe runs use bypassCSP) · SLOW=1 wait longer (lets WebGL/GSAP load)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const [base, dist, vp = 'desktop', filter = ''] = process.argv.slice(2);
const sizes = { desktop: { width: 1366, height: 900 }, tablet: { width: 820, height: 1180 }, mobile: { width: 375, height: 812 }, reflow: { width: 320, height: 640 } };
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
const pages = walk(dist).map((f) => '/' + path.relative(dist, f).replace(/index\.html$/, '')).filter((p) => p.includes(filter));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ bypassCSP: !process.env.NOAXE, viewport: sizes[vp], reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
// Block any request leaving localhost and record it.
const external = new Set();
await ctx.route(/^(?!http:\/\/127\.0\.0\.1).*/, (route) => { external.add(route.request().url()); route.abort(); });
const summary = {};
const add = (id, impact, help, p, node) => { summary[id] ??= { impact, help, pages: new Set(), nodes: new Set() }; summary[id].pages.add(p); if (node) summary[id].nodes.add(node); };
for (const p of pages) {
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || /Content Security Policy|Refused to/.test(m.text())) add('console', '-', 'console errors / CSP', p, m.text().slice(0, 220)); });
  page.on('pageerror', (e) => add('pageerror', '-', 'uncaught exception', p, String(e).slice(0, 200)));
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`)));
  await page.goto(base + p, { waitUntil: 'load' });
  await page.waitForTimeout(process.env.SLOW ? 2500 : 500);
  if (vp === 'reflow' || vp === 'mobile') {
    const over = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const bad = [...document.querySelectorAll('body *')].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.right > w + 1 && cs.position !== 'fixed' && !el.closest('.table-scroll, pre, [data-hscroll-track], .signal-field, .site-footer__lockup, .hero, svg'); }).slice(0, 3).map((el) => el.tagName + '.' + [...el.classList].join('.') + ' right=' + Math.round(el.getBoundingClientRect().right));
      return { scroll: document.documentElement.scrollWidth > w + 1, bad };
    });
    if (over.scroll || over.bad.length) add('reflow-overflow', 'serious', `horizontal overflow at ${vp}`, p, over.bad.join(' ; '));
  }
  if (!process.env.NOAXE) {
    await page.addScriptTag({ content: axeSource }).catch(() => {});
    const res = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).catch((e) => ({ violations: [], err: String(e) }));
    if (res.err) add('axe-error', '-', 'axe could not run (CSP?)', p, res.err.slice(0, 160));
    for (const v of res.violations) v.nodes.slice(0, 3).forEach((n) => add(v.id, v.impact, v.help, p, n.target.join(' ') + ' :: ' + (n.failureSummary || '').replace(/\n/g, ' | ').slice(0, 200)));
  }
  await page.close();
}
await browser.close();
console.log(`Viewport ${vp}${process.env.REDUCED ? ' (reduced motion)' : ''}: ${pages.length} pages`);
if (!Object.keys(summary).length) console.log('  no issues');
for (const [id, s] of Object.entries(summary)) {
  console.log(`\n[${s.impact}] ${id} — ${s.help} — ${s.pages.size} pages (e.g. ${[...s.pages].slice(0, 4).join(', ')})`);
  [...s.nodes].slice(0, 6).forEach((n) => console.log('   ', n));
}
console.log('\nExternal requests attempted:', external.size ? [...external].slice(0, 10) : 'none');
