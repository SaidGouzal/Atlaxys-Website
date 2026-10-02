// Consent / privacy regression tests against a build made WITH fake tracker IDs
// and PUBLIC_CONTACT_ENDPOINT=https://forms.example.com/submit.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] ?? 'http://127.0.0.1:4401';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const VENDOR = /googletagmanager|google-analytics|facebook|licdn|linkedin/;
async function newCtx(browser, { gpc = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const log = { vendor: [], form: [], csp: [] };
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const url = route.request().url();
    if (url.startsWith('https://forms.example.com/')) {
      log.form.push(JSON.parse(route.request().postData() ?? '{}'));
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' });
    }
    if (VENDOR.test(url)) {
      log.vendor.push(url);
      // Stub vendor script: sets the cookies the real one would.
      const js = url.includes('gtag/js') ? "document.cookie='_ga=GA1.1.123.456; path=/';document.cookie='_ga_TEST=GS1.1; path=/';"
        : url.includes('fbevents') ? "document.cookie='_fbp=fb.1.123.456; path=/';"
        : url.includes('insight') ? "document.cookie='li_fat_id=abc; path=/';" : '';
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: js });
    }
    log.vendor.push('OTHER ' + url);
    return route.abort();
  });
  if (gpc) await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true }));
  await ctx.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP ${e.violatedDirective} ${e.blockedURI}`)));
  return { ctx, log };
}
const state = (page) => page.evaluate(() => ({ cookies: document.cookie, local: { ...localStorage }, session: { ...sessionStorage } }));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

// 1. Before consent: nothing loads, nothing stored, banner first in tab order.
{
  const { ctx, log } = await newCtx(browser);
  const page = await ctx.newPage();
  page.on('console', (m) => /CSP/.test(m.text()) && log.csp.push(m.text()));
  await page.goto(`${BASE}/en/?utm_source=news&gclid=abc123`);
  await page.waitForTimeout(1500);
  const s = await state(page);
  check('No vendor request before consent', log.vendor.length === 0, log.vendor.join(', '));
  check('No cookies before consent', s.cookies === '', s.cookies);
  check('No attribution stored before consent', !('atlaxys-attribution' in s.session), JSON.stringify(s.session));
  check('No consent record before a choice', !('atlaxys-consent' in s.local));
  check('Banner visible', await page.locator('[data-consent-banner]').isVisible());
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
  await page.keyboard.press('Tab');
  const second = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check('Tab order: skip link, then banner', /Skip/.test(first ?? '') && /policy|Cookie/i.test(second ?? ''), `${first} → ${second}`);
  const [rb, ab] = await Promise.all(['reject', 'accept'].map((a) => page.locator(`[data-consent-banner] [data-consent-action="${a}"]`).evaluate((el) => { const cs = getComputedStyle(el); return [el.className, cs.backgroundColor, cs.color, cs.fontSize, el.getBoundingClientRect().height].join('|'); })));
  check('Reject and Accept styled identically', rb === ab, `${rb} vs ${ab}`);
  // Scrolling / navigating is not consent.
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(500);
  await page.goto(`${BASE}/en/services/`);
  await page.waitForTimeout(800);
  check('Browsing does not imply consent', log.vendor.length === 0 && !(await state(page)).local['atlaxys-consent']);
  check('No CSP violations (pre-consent)', log.csp.length === 0, log.csp.join(' | '));
  await ctx.close();
}

// 2. Reject non-essential.
{
  const { ctx, log } = await newCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/?utm_source=x&fbclid=y`);
  await page.focus('[data-consent-banner] [data-consent-action="reject"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  const afterReject = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  await page.reload();
  await page.waitForTimeout(1000);
  const s = await state(page);
  const c = JSON.parse(s.local['atlaxys-consent'] ?? '{}');
  check('Reject: stored as refusal', c.analytics === false && c.marketing === false, s.local['atlaxys-consent']);
  check('Reject: no vendor requests', log.vendor.length === 0, log.vendor.join(', '));
  check('Reject: no cookies', s.cookies === '', s.cookies);
  check('Reject: banner not shown again', !(await page.locator('[data-consent-banner]').isVisible()));
  check('Reject (keyboard): focus moved to main, not lost to <body>', afterReject === 'main', afterReject);
  await ctx.close();
}

// 3. Accept all → vendors load; then withdraw via Cookie settings.
{
  const { ctx, log } = await newCtx(browser);
  const page = await ctx.newPage();
  page.on('console', (m) => /CSP/.test(m.text()) && log.csp.push(m.text()));
  await page.goto(`${BASE}/en/?utm_source=launch&gclid=g1`);
  await page.click('[data-consent-banner] [data-consent-action="accept"]');
  await page.waitForTimeout(1500);
  let s = await state(page);
  const active = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  check('Accept: focus moved to main, not lost', active === 'main', active);
  check('Accept: GA4/GTM/Meta/LinkedIn requested', ['gtag/js', 'gtm.js', 'fbevents', 'insight'].every((k) => log.vendor.some((u) => u.includes(k))), log.vendor.map((u) => u.split('?')[0]).join(', '));
  check('Accept: attribution captured', JSON.parse(s.session['atlaxys-attribution'] ?? '{}').gclid === 'g1', s.session['atlaxys-attribution']);
  check('Accept: vendor cookies set', /_ga=/.test(s.cookies) && /_fbp=/.test(s.cookies), s.cookies);
  check('Accept: no CSP violations with vendors', log.csp.length === 0, log.csp.join(' | '));
  // Withdraw marketing + analytics from the footer.
  const before = log.vendor.length;
  await page.click('footer [data-consent-open]');
  await page.waitForTimeout(300);
  check('Settings dialog opens with current choice', await page.locator('#consent-settings input[name="marketing"]').isChecked());
  const focusInDialog = await page.evaluate(() => document.getElementById('consent-settings')?.contains(document.activeElement));
  check('Settings dialog receives focus', focusInDialog === true);
  await page.uncheck('#consent-settings input[name="analytics"]');
  await page.uncheck('#consent-settings input[name="marketing"]');
  await Promise.all([page.waitForNavigation(), page.click('#consent-settings button[type="submit"]')]);
  await page.waitForTimeout(1200);
  s = await state(page);
  check('Withdraw: cookies deleted', !/_ga|_fbp|li_fat_id/.test(s.cookies), s.cookies);
  check('Withdraw: attribution deleted', !('atlaxys-attribution' in s.session));
  check('Withdraw: no vendor requests after reload', log.vendor.length === before, log.vendor.slice(before).join(', '));
  await ctx.close();
}

// 3b. Withdrawal in one tab stops tracking in the other open tabs; search text never reaches GA.
{
  const { ctx, log } = await newCtx(browser);
  const a = await ctx.newPage();
  await a.goto(`${BASE}/en/`);
  await a.click('[data-consent-banner] [data-consent-action="accept"]');
  await a.waitForTimeout(800);
  const b = await ctx.newPage();
  await b.goto(`${BASE}/en/search/?q=jane.doe%40example.com`);
  await b.waitForTimeout(1000);
  const loc = await b.evaluate(() => (window.dataLayer ?? []).map((e) => e && e[0] === 'set' && e[1]?.page_location).filter(Boolean)[0]);
  check('GA page_location drops the search query', typeof loc === 'string' && !/[?&]q=|example\.com|%40/.test(loc), loc);
  const before = log.vendor.length;
  await a.click('footer [data-consent-open]');
  await a.uncheck('#consent-settings input[name="analytics"]');
  await a.uncheck('#consent-settings input[name="marketing"]');
  await Promise.all([a.waitForNavigation(), b.waitForNavigation(), a.click('#consent-settings button[type="submit"]')]);
  await b.waitForTimeout(1000);
  check('Cross-tab: other tab reloaded without vendors', log.vendor.length === before, log.vendor.slice(before).join(', '));
  check('Cross-tab: other tab shows no banner (choice known)', !(await b.locator('[data-consent-banner]').isVisible()));
  await ctx.close();
}

// 4. Analytics only.
{
  const { ctx, log } = await newCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/?gclid=z`);
  await page.click('[data-consent-banner] [data-modal-open="consent-settings"]');
  await page.check('#consent-settings input[name="analytics"]');
  await page.click('#consent-settings button[type="submit"]');
  await page.waitForTimeout(1200);
  const s = await state(page);
  check('Analytics only: Google loaded, no Meta/LinkedIn', log.vendor.some((u) => u.includes('gtag')) && !log.vendor.some((u) => /facebook|licdn/.test(u)), log.vendor.map((u) => u.split('?')[0]).join(', '));
  check('Analytics only: no attribution', !('atlaxys-attribution' in s.session));
  await ctx.close();
}

// 5. Global Privacy Control.
{
  const { ctx, log } = await newCtx(browser, { gpc: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/`);
  await page.click('[data-consent-banner] [data-consent-action="accept"]');
  await page.waitForTimeout(1200);
  const s = await state(page);
  const c = JSON.parse(s.local['atlaxys-consent'] ?? '{}');
  check('GPC: Accept all keeps marketing off', c.marketing === false && c.analytics === true && c.gpc === true, s.local['atlaxys-consent']);
  check('GPC: no Meta/LinkedIn requests', !log.vendor.some((u) => /facebook|licdn/.test(u)));
  await page.click('footer [data-consent-open]');
  check('GPC: marketing switch disabled + note shown', (await page.locator('#consent-settings input[name="marketing"]').isDisabled()) && (await page.locator('[data-gpc-note]').isVisible()));
  await ctx.close();
}

// 6. Expiry and version change re-ask.
{
  const { ctx } = await newCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/`);
  const v = await page.evaluate(() => window.__atlaxysAnalytics.consentVersion);
  await page.evaluate((v) => localStorage.setItem('atlaxys-consent', JSON.stringify({ v, analytics: true, marketing: true, ts: new Date(Date.now() - 181 * 86400000).toISOString() })), v);
  await page.reload();
  await page.waitForTimeout(500);
  check('Expired consent (181 days) → banner again', await page.locator('[data-consent-banner]').isVisible());
  await page.evaluate(() => localStorage.setItem('atlaxys-consent', JSON.stringify({ v: 1, analytics: true, marketing: true, ts: new Date().toISOString() })));
  await page.reload();
  await page.waitForTimeout(500);
  check('Old consent version → banner again', await page.locator('[data-consent-banner]').isVisible());
  await ctx.close();
}

// 7. Form: sends to endpoint; attribution only with marketing consent; escape & dialog keyboard.
{
  const { ctx, log } = await newCtx(browser);
  const page = await ctx.newPage();
  page.on('console', (m) => /CSP/.test(m.text()) && log.csp.push(m.text()));
  await page.goto(`${BASE}/en/contact/?utm_source=test`);
  await page.click('[data-consent-banner] [data-consent-action="reject"]');
  await page.click('#lead-form button[type="submit"]');
  await page.waitForTimeout(300);
  const summaryFocused = await page.evaluate(() => document.activeElement?.matches('[data-error-summary]'));
  const invalid = await page.locator('#lead-form [aria-invalid="true"]').count();
  check('Empty submit: error summary focused, fields flagged', summaryFocused && invalid >= 3, `invalid=${invalid}`);
  await page.fill('#lead-form-phone', 'abc');
  await page.fill('#lead-form-name', 'Test Person');
  await page.fill('#lead-form-email', 'test@example.com');
  await page.fill('#lead-form-message', 'Hello, this is a test message for the form.');
  await page.click('#lead-form button[type="submit"]');
  await page.waitForTimeout(300);
  const phoneErr = await page.locator('#lead-form-phone-error').textContent();
  check('Invalid phone gets a phone-specific message', /digits/.test(phoneErr ?? ''), phoneErr);
  await page.fill('#lead-form-phone', '+212 600 000 000');
  await page.waitForTimeout(2600); // honeypot time trap is server-side; just be realistic
  await page.click('#lead-form button[type="submit"]');
  await page.waitForTimeout(1200);
  check('Form posts to configured endpoint', log.form.length === 1, JSON.stringify(log.form[0] ?? {}).slice(0, 160));
  check('Form payload has no attribution without marketing consent', log.form[0] && !('attribution' in log.form[0]));
  check('Success state shown and focused', await page.evaluate(() => document.activeElement?.matches('[data-success]')));
  check('No CSP violations on contact flow', log.csp.length === 0, log.csp.join(' | '));
  await ctx.close();
}

// 8. Mobile nav dialog: focus in, Escape closes, focus restored.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${BASE}/en/about/`);
  await page.evaluate(() => localStorage.setItem('atlaxys-consent', JSON.stringify({ v: window.__atlaxysAnalytics.consentVersion, analytics: false, marketing: false, ts: new Date().toISOString() })));
  await page.reload();
  await page.focus('[data-mobile-nav-open]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const inside = await page.evaluate(() => document.querySelector('[data-mobile-nav]')?.contains(document.activeElement));
  const expanded = await page.getAttribute('[data-mobile-nav-open]', 'aria-expanded');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const back = await page.evaluate(() => document.activeElement?.hasAttribute('data-mobile-nav-open'));
  check('Mobile nav: focus moves in, aria-expanded=true, Esc restores focus', inside && expanded === 'true' && back, `inside=${inside} expanded=${expanded} back=${back}`);
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
