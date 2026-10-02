// Consent checks against a build made with the PRODUCTION configuration
// (PUBLIC_GA4_ID=G-9LD8TLNH9K only, no GTM / Meta / LinkedIn). Google is
// stubbed: no request leaves the machine.
//   npx astro build --outDir /tmp/dist-live && npx http-server /tmp/dist-live -p 4402 -s &
//   node scripts/audit/consent-live-config-test.mjs http://127.0.0.1:4402
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] ?? 'http://127.0.0.1:4402';
const GA_ID = 'G-9LD8TLNH9K';
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const external = [];
await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => {
  const url = route.request().url();
  external.push(url);
  if (url.includes('googletagmanager.com/gtag/js')) {
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: "document.cookie='_ga=GA1.1.1.1; path=/';document.cookie='_ga_9LD8TLNH9K=GS1.1; path=/';" });
  }
  return route.abort();
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

for (const lang of ['en', 'fr', 'ar']) {
  await page.goto(`${BASE}/${lang}/`);
  await page.waitForTimeout(600);
  check(`[${lang}] banner shown on first visit (mobile)`, await page.locator('[data-consent-banner]').isVisible());
}
check('No external request before consent (3 pages)', external.length === 0, external.join(', '));
check('No cookies before consent', (await page.evaluate(() => document.cookie)) === '');
const dl = await page.evaluate(() => (window.dataLayer ?? []).map((e) => Array.from(e)));
check('Consent Mode v2 defaults are all denied', JSON.stringify(dl[0]).includes('"analytics_storage":"denied"') && JSON.stringify(dl[0]).includes('"ad_user_data":"denied"') && JSON.stringify(dl[0]).includes('"ad_personalization":"denied"'), JSON.stringify(dl[0]));
check('No gtag config before consent', !dl.some((e) => e[0] === 'config'));
const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
check('CSP allowlists Google only (no Meta/LinkedIn hosts)', /googletagmanager/.test(csp) && !/facebook|licdn|linkedin/.test(csp));

await page.goto(`${BASE}/en/`);
await page.click('[data-consent-banner] [data-modal-open="consent-settings"]');
const marketingText = await page.locator('#consent-settings label:has(input[name="marketing"])').innerText();
check('Marketing description does not claim ad platforms', /no advertising platform/i.test(marketingText) && !/Providers:/.test(marketingText), marketingText.replace(/\s+/g, ' '));
check('Optional switches are not pre-ticked', !(await page.isChecked('#consent-settings input[name="analytics"]')) && !(await page.isChecked('#consent-settings input[name="marketing"]')));
await page.keyboard.press('Escape');
check('Escape closes the dialog without recording a choice', !(await page.evaluate(() => localStorage.getItem('atlaxys-consent'))));

await page.click('[data-consent-banner] [data-consent-action="accept"]');
await page.waitForTimeout(1000);
check('Accept: gtag.js requested with the real ID', external.some((u) => u.includes(`gtag/js?id=${GA_ID}`)), external.join(', '));
const after = await page.evaluate(() => (window.dataLayer ?? []).map((e) => Array.from(e)));
const update = after.find((e) => e[0] === 'consent' && e[1] === 'update');
check('Accept: consent update grants analytics_storage only', update?.[2]?.analytics_storage === 'granted' && ['ad_storage', 'ad_user_data', 'ad_personalization'].every((k) => update?.[2]?.[k] === 'denied'), JSON.stringify(update));
check('Accept: gtag config for the real ID, Google signals off', after.some((e) => e[0] === 'config' && e[1] === GA_ID && e[2]?.allow_google_signals === false));
check('Accept: only Google contacted', external.every((u) => u.includes('googletagmanager.com')), external.join(', '));

const n = external.length;
await page.click('footer [data-consent-open]');
await page.uncheck('#consent-settings input[name="analytics"]');
await Promise.all([page.waitForNavigation(), page.click('#consent-settings button[type="submit"]')]);
await page.waitForTimeout(800);
check('Withdraw: GA cookies deleted', !/_ga/.test(await page.evaluate(() => document.cookie)));
await page.goto(`${BASE}/en/services/`);
await page.waitForTimeout(800);
check('Withdraw: no Google request after reload and navigation', external.length === n, external.slice(n).join(', '));
check('No page errors', pageErrors.length === 0, pageErrors.join(' | '));

await browser.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
