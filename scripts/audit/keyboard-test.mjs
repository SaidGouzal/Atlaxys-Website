// Keyboard, focus and motion checks. Usage: node keyboard-test.mjs <base-url of a build with fake tracker IDs>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] ?? 'http://127.0.0.1:4401';
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const browser = await chromium.launch();
const seeded = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, ...opts });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('atlaxys-consent', JSON.stringify({ v: 2, analytics: false, marketing: false, ts: new Date().toISOString() })); } catch {} });
  return ctx;
};
const outline = (page) => page.evaluate(() => { const el = document.activeElement; const has = (cs) => cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2; return { tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40), outline: has(getComputedStyle(el)) || has(getComputedStyle(el, '::after')) || has(getComputedStyle(el, '::before')) }; });

// Skip link + focus visibility on the first 60 tab stops of the home page.
{
  const ctx = await seeded(); const page = await ctx.newPage();
  await page.goto(`${BASE}/en/`); await page.waitForTimeout(500);
  await page.keyboard.press('Tab');
  const skip = await outline(page);
  await page.keyboard.press('Enter');
  const main = await page.evaluate(() => document.activeElement?.id);
  check('Skip link is first and moves focus to <main>', /Skip/.test(skip.text) && main === 'main', `${skip.text} → ${main}`);
  await page.goto(`${BASE}/en/`); await page.waitForTimeout(500);
  const stops = [];
  for (let i = 0; i < 60; i++) { await page.keyboard.press('Tab'); stops.push(await outline(page)); }
  const noOutline = stops.filter((s) => !s.outline);
  check('Visible focus indicator on first 60 tab stops', noOutline.length === 0, noOutline.map((s) => `${s.tag}:${s.text}`).join(', '));
  const visibleFocus = await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  check('Focused element is rendered (not hidden)', visibleFocus);
  await ctx.close();
}

// Mega menu: toggle with keyboard, Escape closes and returns focus.
{
  const ctx = await seeded(); const page = await ctx.newPage();
  await page.goto(`${BASE}/en/about/`); await page.waitForTimeout(400);
  await page.focus('[data-mega-toggle]');
  await page.keyboard.press('Enter');
  const open = await page.getAttribute('[data-mega-toggle]', 'aria-expanded');
  await page.keyboard.press('Tab');
  const inPanel = await page.evaluate(() => document.getElementById('mega-services')?.contains(document.activeElement));
  await page.keyboard.press('Escape');
  const closed = await page.getAttribute('[data-mega-toggle]', 'aria-expanded');
  const back = await page.evaluate(() => document.activeElement?.hasAttribute('data-mega-toggle'));
  check('Mega menu: Enter opens, Tab enters panel, Esc closes + restores focus', open === 'true' && inPanel && closed === 'false' && back, `open=${open} inPanel=${inPanel} closed=${closed} back=${back}`);
  // Language menu
  await page.focus('.lang--menu [data-disclosure-toggle]');
  await page.keyboard.press('Enter');
  const langOpen = await page.isVisible('#lang-menu');
  await page.keyboard.press('Escape');
  const langClosed = !(await page.isVisible('#lang-menu'));
  check('Language menu: opens with Enter, closes with Esc', langOpen && langClosed);
  await ctx.close();
}

// Consent dialog: Esc closes and focus returns to the footer button.
{
  const ctx = await seeded(); const page = await ctx.newPage();
  await page.goto(`${BASE}/en/about/`); await page.waitForTimeout(400);
  await page.focus('footer [data-consent-open]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const modal = await page.evaluate(() => document.getElementById('consent-settings')?.open);
  // Background is inert while the modal is open.
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  const trapped = await page.evaluate(() => document.getElementById('consent-settings')?.contains(document.activeElement));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => document.activeElement?.hasAttribute('data-consent-open'));
  check('Consent dialog: modal, focus trapped, Esc closes, focus restored', modal && trapped && back, `modal=${modal} trapped=${trapped} back=${back}`);
  await ctx.close();
}

// Hero pause control.
{
  const ctx = await seeded(); const page = await ctx.newPage();
  await page.goto(`${BASE}/en/`); await page.waitForTimeout(800);
  const btn = page.locator('[data-motion-toggle]');
  const visible = await btn.isVisible();
  await btn.focus(); await page.keyboard.press('Enter');
  const paused = await page.evaluate(() => document.querySelector('[data-hero]').classList.contains('is-motion-paused'));
  const label = (await btn.textContent())?.trim();
  const playState = await page.evaluate(() => getComputedStyle(document.querySelector('.hero__pulse'), '::after').animationPlayState);
  const svgState = await page.evaluate(() => getComputedStyle(document.querySelector('.sf-trace__pulse') ?? document.querySelector('.signal-field svg')).animationPlayState);
  const textState = await page.evaluate(() => getComputedStyle(document.querySelector('.hero__lead')).animationPlayState);
  check('Hero pause button: visible, pauses decorative loops (not text entrance), label switches', visible && paused && /Play/.test(label ?? '') && playState === 'paused' && svgState === 'paused' && textState === 'running', `label=${label} pulse=${playState} svg=${svgState} text=${textState}`);
  await ctx.close();
}

// Reduced motion: headings visible immediately, no pause button needed, no WebGL.
{
  const ctx = await seeded({ reducedMotion: 'reduce' }); const page = await ctx.newPage();
  await page.goto(`${BASE}/ar/`); await page.waitForTimeout(600);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')].filter((h) => { const cs = getComputedStyle(h); return cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0; }).length);
  const btn = await page.locator('[data-motion-toggle]').isVisible();
  const gl = await page.evaluate(() => !!document.querySelector('[data-signal-gl] canvas'));
  check('Reduced motion: all headings visible, no pause button, no WebGL', hidden === 0 && !btn && !gl, `hidden=${hidden} btn=${btn} gl=${gl}`);
  await ctx.close();
}

// Motion on, Arabic desktop: headings never visibility:hidden (stay in a11y tree).
{
  const ctx = await seeded(); const page = await ctx.newPage();
  await page.goto(`${BASE}/ar/`); await page.waitForTimeout(2500);
  const hiddenVis = await page.evaluate(() => [...document.querySelectorAll('h1,h2,h3')].filter((h) => getComputedStyle(h).visibility === 'hidden').length);
  check('Motion on (AR): no heading uses visibility:hidden', hiddenVis === 0, `count=${hiddenVis}`);
  await ctx.close();
}

// 200% / 400% zoom approximation: 1280 CSS px at 400% ≈ 320px viewport (covered by reflow crawl). Text spacing override:
{
  const ctx = await seeded(); const page = await ctx.newPage();
  await page.goto(`${BASE}/en/contact/`); await page.waitForTimeout(400);
  await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });
  const clipped = await page.evaluate(() => [...document.querySelectorAll('label, button, a, p, h1, h2, h3')].filter((el) => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === 'hidden' && el.clientWidth > 0).length);
  check('Text spacing (WCAG 1.4.12): no clipped text on contact page', clipped === 0, `clipped=${clipped}`);
  await ctx.close();
}
await browser.close();
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
