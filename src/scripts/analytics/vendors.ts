/**
 * Third-party tag loaders. Each vendor is injected at most once and only
 * after consent for its category. IDs come from the central config
 * (src/config/analytics.ts → window.__atlaxysAnalytics).
 *
 * Every host used here must also be allowlisted in integrations/csp.mjs.
 */
import type { ConsentState } from './consent';

const loaded = new Set<string>();

function inject(src: string, id: string) {
  if (loaded.has(id)) return;
  loaded.add(id);
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/**
 * Google Consent Mode v2. Only analytics_storage follows the visitor's choice.
 * The three advertising signals stay denied whatever they accept: this site
 * runs no Google advertising tag, and the consent dialog does not ask for
 * Google advertising use. If Google Ads is ever added, declare it as a
 * marketing vendor (config, privacy inventory, dialog) and tie these signals
 * to `state.marketing` at the same time.
 */
export function updateGoogleConsent(state: ConsentState) {
  window.gtag?.('consent', 'update', {
    analytics_storage: state.analytics ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
}

/**
 * A URL without free text a visitor typed (the on-site search query `q`) or
 * anything that looks like an email address, so neither can reach Google
 * Analytics as part of a page or referrer URL.
 */
function sanitizedUrl(href: string) {
  const url = new URL(href);
  url.searchParams.delete('q');
  for (const [key, value] of [...url.searchParams]) if (value.includes('@')) url.searchParams.delete(key);
  url.hash = '';
  return url.toString();
}

/**
 * GA4's automatic measurement (site search, history page views) reads the
 * real address bar, not the page_location set below. Before Google's script
 * loads, a search query still in the query string (an old ?q= link, or the
 * search form submitted without JavaScript) is moved to the fragment, which
 * GA4 ignores and browsers never send onwards. See scripts/search.ts.
 */
function moveSearchQueryToFragment() {
  const url = new URL(window.location.href);
  const q = url.searchParams.get('q');
  if (q === null) return;
  url.searchParams.delete('q');
  if (!url.hash) url.hash = new URLSearchParams({ q }).toString();
  history.replaceState(history.state, '', url);
}

function loadGa4(id: string) {
  moveSearchQueryToFragment();
  inject(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`, 'ga4');
  window.gtag?.('js', new Date());
  window.gtag?.('set', {
    page_location: sanitizedUrl(window.location.href),
    ...(document.referrer ? { page_referrer: sanitizedUrl(document.referrer) } : {}),
  });
  // GA4 does not log or store IP addresses. Google signals (cross-device
  // linking with signed-in Google accounts) and ad personalisation stay off;
  // the advertising consent signals are always denied (see above).
  window.gtag?.('config', id, { allow_google_signals: false, allow_ad_personalization_signals: false });
}

function loadGtm(id: string) {
  window.dataLayer?.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  inject(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`, 'gtm');
}

function loadMetaPixel(id: string) {
  if (loaded.has('meta')) return;
  // Standard Meta Pixel queue stub: calls are buffered until fbevents.js loads.
  type Fbq = NonNullable<Window['fbq']> & { queue: unknown[]; callMethod?: (...a: unknown[]) => void };
  const stub = function (...args: unknown[]) {
    if (stub.callMethod) stub.callMethod(...args);
    else stub.queue.push(args);
  } as Fbq;
  stub.queue = [];
  stub.loaded = true;
  stub.version = '2.0';
  stub.push = stub;
  const fbq = window.fbq ?? stub;
  window.fbq = fbq;
  window._fbq = window._fbq ?? fbq;
  inject('https://connect.facebook.net/en_US/fbevents.js', 'meta');
  fbq('init', id);
  fbq('track', 'PageView');
}

function loadLinkedIn(id: string) {
  window._linkedin_partner_id = id;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids ?? [];
  window._linkedin_data_partner_ids.push(id);
  inject('https://snap.licdn.com/li.lms-analytics/insight.min.js', 'linkedin');
}

export function loadVendors(state: ConsentState) {
  const ids = window.__atlaxysAnalytics;
  if (!ids) return;
  if (state.analytics) {
    if (ids.gtm) loadGtm(ids.gtm);
    if (ids.ga4) loadGa4(ids.ga4);
  }
  if (state.marketing) {
    if (ids.metaPixel) loadMetaPixel(ids.metaPixel);
    if (ids.linkedIn) loadLinkedIn(ids.linkedIn);
  }
}
