/**
 * First-touch campaign attribution for the current visit.
 *
 * Reads utm_* / fbclid / gclid from the landing URL and keeps them in
 * sessionStorage (first-party, cleared when the tab closes) so the lead form
 * can send them with the enquiry — even if the visitor browses a few pages
 * before contacting us. No cookies, no cross-site tracking.
 */
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'] as const;
const STORAGE_KEY = 'atlaxys-attribution';

export type Attribution = Partial<Record<(typeof KEYS)[number] | 'landing_page' | 'referrer', string>>;

export function captureAttribution() {
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const data: Attribution = {};
    KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) data[key] = value.slice(0, 200);
    });
    data.landing_page = window.location.pathname;
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
      data.referrer = document.referrer.slice(0, 300);
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}

export function readAttribution(): Attribution {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Attribution;
  } catch {
    return {};
  }
}
