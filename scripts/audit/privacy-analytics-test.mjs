// Consent, Google Analytics 4, site-search privacy and forms, tested with the
// REAL gtag.js. Every request to Google's collection endpoints is recorded and
// aborted, so no test data reaches the GA property; Web3Forms is mocked.
// Run against a build made with the production configuration:
//   PUBLIC_CONTACT_ENDPOINT=https://api.web3forms.com/submit npx astro build --outDir /tmp/dist-prod
//   (serve /tmp/dist-prod on port 4402, then)
//   node scripts/audit/privacy-analytics-test.mjs http://127.0.0.1:4402
// Needs network access to www.googletagmanager.com. CHROMIUM_PATH is optional.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:4402';
const GA = 'G-9LD8TLNH9K';
let failed = 0, passed = 0;
const check = (name, ok, detail = '') => { ok ? passed++ : failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail && !ok ? ' — ' + String(detail).slice(0, 300) : ''}`); };
const wait = (p, ms) => p.waitForTimeout(ms);

async function context(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, ...opts });
  const log = { external: [], hits: [], web3: [] };
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async (route) => {
    const req = route.request();
    const url = req.url();
    log.external.push(url);
    if (/google-analytics\.com|analytics\.google\.com|www\.google\.com\/g\/collect/.test(url)) {
      const u = new URL(url);
      const lines = (req.postData() || '').split('\n').filter(Boolean);
      for (const line of lines.length ? lines : ['']) {
        const p = new URLSearchParams(u.search);
        new URLSearchParams(line).forEach((v, k) => p.set(k, v));
        log.hits.push({ host: u.host, ...Object.fromEntries(p) });
      }
      return route.abort();
    }
    if (url.includes('googletagmanager.com/gtag/js')) return route.continue();
    if (url.startsWith('https://api.web3forms.com/')) {
      log.web3.push(req.postData());
      return route.fulfill({ status: 200, contentType: 'application/json', body: ctx.__web3Body || '{"success":true,"message":"Email sent"}' });
    }
    return route.abort();
  });
  return { ctx, log };
}
const consentAll = (p) => p.evaluate(() => localStorage.setItem('atlaxys-consent', JSON.stringify({ v: 2, analytics: true, marketing: true, ts: new Date().toISOString() })));

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  console.log('\n# Fresh visitor, accept, navigate, withdraw');
  {
    const { ctx, log } = await context(browser);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const l of ['en', 'fr', 'ar']) {
      await page.goto(`${BASE}/${l}/`);
      await wait(page, 600);
      check(`[${l}] banner visible on first visit`, await page.locator('[data-consent-banner]').isVisible());
    }
    const st = await page.evaluate(() => ({ ls: Object.keys(localStorage), ss: Object.keys(sessionStorage), c: document.cookie }));
    check('Fresh: no cookie, localStorage or sessionStorage', !st.c && !st.ls.length && !st.ss.length, JSON.stringify(st));
    check('Fresh: no request leaves the site', log.external.length === 0, log.external.join(', '));
    const dl = await page.evaluate(() => (window.dataLayer || []).map((e) => Array.from(e)));
    check('Consent Mode v2 defaults all denied', ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'].every((k) => dl[0]?.[2]?.[k] === 'denied'));
    await page.goto(`${BASE}/en/contact/`);
    await wait(page, 400);
    // tracked click before consent
    await page.evaluate(() => { const a = document.querySelector('a[data-track="email_click"]'); a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.click(); });
    await page.click('[data-consent-banner] [data-consent-action="accept"]');
    await wait(page, 7000);
    check('Accept: real gtag.js loaded for ' + GA, log.external.some((u) => u.includes(`gtag/js?id=${GA}`)));
    const ga = log.hits.filter((h) => h.host.includes('google-analytics'));
    check('Accept: page_view sent with analytics granted / ads denied (gcs=G101)', ga.some((h) => h.en === 'page_view' && h.gcs === 'G101'), JSON.stringify(ga.map((h) => [h.en, h.gcs])));
    check('Accept: click made before consent never sent', !ga.some((h) => h.en === 'email_click'));
    check('Accept: _ga cookies present', (await ctx.cookies()).some((c) => c.name === '_ga'));
    // tracked click after consent
    await page.evaluate(() => { const a = document.querySelector('a[data-track="whatsapp_click"]'); a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.click(); });
    await wait(page, 7000);
    check('After consent: whatsapp_click event sent', log.hits.some((h) => h.en === 'whatsapp_click'));
    await page.goto(`${BASE}/fr/services/`);
    await wait(page, 6000);
    check('Next page: banner stays hidden', !(await page.locator('[data-consent-banner]').isVisible()));
    check('Next page: page_view sent', log.hits.filter((h) => h.en === 'page_view' && h.host.includes('google-analytics')).length >= 2);
    // withdraw
    await page.click('footer [data-consent-open]');
    check('Cookie settings: dialog shows current choice (analytics ticked)', await page.isChecked('#consent-settings input[name="analytics"]'));
    await page.uncheck('#consent-settings input[name="analytics"]');
    await page.uncheck('#consent-settings input[name="marketing"]');
    await Promise.all([page.waitForNavigation(), page.click('#consent-settings button[type="submit"]')]);
    await wait(page, 1500);
    const n = log.hits.length;
    check('Withdraw: _ga cookies deleted', !(await ctx.cookies()).some((c) => c.name.startsWith('_ga')));
    check('Withdraw: attribution deleted', (await page.evaluate(() => sessionStorage.getItem('atlaxys-attribution'))) === null);
    await page.goto(`${BASE}/en/about/`);
    await wait(page, 6000);
    check('Withdraw: no GA hit afterwards', log.hits.length === n, JSON.stringify(log.hits.slice(n).map((h) => h.en)));
    check('Withdraw: gtag.js not loaded again', !(await page.evaluate(() => [...document.scripts].some((s) => s.src.includes('gtag/js')))));
    const all = JSON.stringify(log.hits);
    check('No email/phone/name in any hit', !/%40|@|\+212|708006033/.test(all));
    check('No page errors', errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  console.log('\n# Site search privacy (analytics accepted)');
  {
    const { ctx, log } = await context(browser);
    const page = await ctx.newPage();
    let lastReq = '';
    page.on('request', (r) => r.url().startsWith(BASE) && r.resourceType() === 'document' && (lastReq = r.url()));
    await page.goto(`${BASE}/en/`);
    await consentAll(page);
    // legacy ?q= link with phone and email
    await page.goto(`${BASE}/en/search/?q=john.doe%40example.com+0612345678`);
    await wait(page, 1500);
    check('Legacy ?q= link: query moved to the fragment', /\/en\/search\/#q=/.test(page.url()) && !page.url().includes('?q='), page.url());
    check('Legacy ?q= link: search still runs', (await page.inputValue('#search-q')).includes('0612345678'));
    // type a new query
    await page.fill('#search-q', 'automation 0699999999');
    await wait(page, 600);
    check('Typing: address uses #q= only', page.url().includes('#q=automation') && !page.url().includes('?'), page.url());
    await page.fill('#search-q', 'automation');
    await wait(page, 800);
    check('Typing: results listed', (await page.locator('[data-search-results] li').count()) > 0);
    await page.keyboard.press('Enter');
    await wait(page, 500);
    check('Enter: no navigation with the query (no request carries it)', !/0699999999|automation/.test(lastReq), lastReq);
    await wait(page, 6000);
    // click a result -> referrer on next page
    await page.locator('[data-search-results] a').first().click();
    await page.waitForLoadState('load');
    const ref = await page.evaluate(() => document.referrer);
    check('Next page: document.referrer has no query', !/q=|0699|automation/.test(ref), ref);
    await wait(page, 6000);
    const s = JSON.stringify(log.hits);
    check('GA: no search_term / view_search_results', !/view_search_results|search_term/.test(s));
    const typed = log.hits.flatMap((h) => Object.entries(h).filter(([, v]) => /0612345678|0699999999|john|automation|%40|@/i.test(String(v))).map(([k, v]) => `${h.en}:${k}=${v}`));
    console.log('     values containing a typed word:', typed.join(' | ') || 'none');
    check('GA: no typed text in any hit (only page URLs that contain the word may match)', typed.every((t) => /:(dl|dr)=http:\/\/127\.0\.0\.1:\d+\/en\/[a-z-]+\/[a-z-]+\/$|:dt=[^#?]*$/.test(t) && !/#|0612345678|0699999999|john|%40|@/.test(t)), typed.join(' | '));
    check('GA: hits were actually sent during the test', log.hits.some((h) => h.en === 'page_view'));
    await ctx.close();
  }

  console.log('\n# Reject all, customize, GPC');
  {
    const { ctx, log } = await context(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/ar/`);
    await wait(page, 500);
    await page.click('[data-consent-banner] [data-consent-action="reject"]');
    await page.goto(`${BASE}/ar/services/`);
    await page.reload();
    await wait(page, 1500);
    check('Reject: no external request, no cookie, banner gone', log.external.length === 0 && (await ctx.cookies()).length === 0 && !(await page.locator('[data-consent-banner]').isVisible()));
    await ctx.close();
    const b = await context(browser);
    const p2 = await b.ctx.newPage();
    await p2.goto(`${BASE}/fr/?utm_source=newsletter`);
    await wait(p2, 500);
    await p2.click('[data-consent-banner] [data-modal-open="consent-settings"]');
    check('Customize: options not pre-ticked', !(await p2.isChecked('#consent-settings input[name="analytics"]')) && !(await p2.isChecked('#consent-settings input[name="marketing"]')));
    await p2.check('#consent-settings input[name="marketing"]');
    await p2.click('#consent-settings button[type="submit"]');
    await wait(p2, 2000);
    check('Marketing only: no Google request', b.log.external.length === 0);
    check('Marketing only: utm captured in sessionStorage', /newsletter/.test((await p2.evaluate(() => sessionStorage.getItem('atlaxys-attribution'))) || ''));
    await b.ctx.close();
    const g = await context(browser);
    await g.ctx.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }));
    const p3 = await g.ctx.newPage();
    await p3.goto(`${BASE}/en/`);
    await wait(p3, 500);
    await p3.click('[data-consent-banner] [data-consent-action="accept"]');
    await wait(p3, 1000);
    const st = await p3.evaluate(() => JSON.parse(localStorage.getItem('atlaxys-consent')));
    check('GPC: "Accept all" keeps marketing off', st.marketing === false && st.analytics === true);
    await g.ctx.close();
  }

  console.log('\n# Forms (Web3Forms mocked)');
  {
    const { ctx, log } = await context(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/en/contact/`);
    await consentAll(page);
    await page.goto(`${BASE}/en/contact/?utm_source=ads`);
    await wait(page, 4000);
    const fillForm = async () => {
      await page.fill('#lead-form-name', 'Test Person');
      await page.fill('#lead-form-email', 'test.person@example.com');
      await page.fill('#lead-form-message', 'This is a test message of more than twenty characters.');
    };
    // validation
    await page.click('[data-submit]');
    check('Validation: error summary shown and focused', await page.evaluate(() => document.activeElement?.matches('[data-error-summary]')));
    check('Validation: fields marked aria-invalid', (await page.getAttribute('#lead-form-email', 'aria-invalid')) === 'true');
    check('Validation: nothing sent', log.web3.length === 0);
    await fillForm();
    check('Honeypot is Web3Forms "botcheck" checkbox', (await page.locator('input[name="botcheck"][type="checkbox"]').count()) === 1);
    check('No-JS redirect points to localized thank-you page', (await page.getAttribute('input[name="redirect"]', 'value')) === 'https://www.atlaxys.com/en/contact/thank-you/');
    // bot ticks the trap
    await page.evaluate(() => (document.querySelector('input[name="botcheck"]').checked = true));
    await page.click('[data-submit]');
    await page.locator('[data-success]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await wait(page, 500);
    check('Honeypot ticked: confirmation shown, nothing sent', (await page.locator('[data-success]').isVisible()) && log.web3.length === 0);
    // real submission
    await page.reload();
    await wait(page, 3000);
    await fillForm();
    const before = log.hits.length;
    await page.click('[data-submit]');
    await wait(page, 1500);
    check('Submit: success shown and focused', await page.evaluate(() => document.activeElement?.matches('[data-success]')));
    const payload = JSON.parse(log.web3[0] || '{}');
    check('Payload: access_key, name, email, message present', payload.access_key && payload.name && payload.email && payload.message);
    check('Payload: no redirect, no startedAt, no botcheck', !('redirect' in payload) && !('startedAt' in payload) && !('botcheck' in payload), Object.keys(payload).join(','));
    check('Payload: attribution only with marketing consent (present here)', payload.attribution?.landing_page === '/en/contact/');
    await wait(page, 7000);
    const lead = log.hits.slice(before).find((h) => h.en === 'generate_lead');
    check('GA: generate_lead sent', Boolean(lead), JSON.stringify(log.hits.slice(before).map((h) => h.en)));
    check('GA: generate_lead has no PII', lead && !/test|person|%40|@/i.test(JSON.stringify(lead)), JSON.stringify(lead));
    // provider refusal with HTTP 200
    ctx.__web3Body = '{"success":false,"message":"Invalid access key"}';
    await page.reload();
    await wait(page, 1000);
    await fillForm();
    await page.click('[data-submit]');
    await wait(page, 1500);
    check('success:false: error state shown, not success', (await page.locator('[data-failure]').isVisible()) && !(await page.locator('[data-success]').isVisible()));
    // no marketing consent -> no attribution
    ctx.__web3Body = undefined;
    await page.evaluate(() => { localStorage.setItem('atlaxys-consent', JSON.stringify({ v: 2, analytics: false, marketing: false, ts: new Date().toISOString() })); sessionStorage.clear(); });
    await page.goto(`${BASE}/en/landing/ai-automation/?utm_source=x`);
    await wait(page, 1000);
    const n = log.web3.length;
    await page.fill('input[name="name"]', 'Test Person');
    await page.fill('input[name="email"]', 'test.person@example.com');
    await page.click('[data-submit]');
    await wait(page, 1500);
    const p2 = JSON.parse(log.web3[n] || '{}');
    check('Landing form (compact) sends; no attribution without marketing consent', p2.email && !('attribution' in p2), Object.keys(p2).join(','));
    await ctx.close();
  }

  console.log('\n# Thank-you page');
  {
    const { ctx } = await context(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/fr/contact/thank-you/`);
    const href = await page.locator('.thanks__actions a').first().getAttribute('href');
    check('Thank-you: main button no longer points to the empty case-studies page', href === '/fr/services/', href);
    await ctx.close();
  }

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
