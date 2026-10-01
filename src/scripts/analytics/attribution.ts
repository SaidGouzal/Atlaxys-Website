/**
 * First-touch campaign attribution for the current visit.
 *
 * Runs ONLY after the visitor accepts the marketing category (see consent.ts):
 * reads utm_* / fbclid / gclid from the landing URL and keeps them, with the
 * referring site and landing page, in sessionStorage (first-party, cleared
 * when the tab closes) so the lead form can send them with an enquiry. It is
 * deleted as soon as marketing consent is withdrawn.
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
      // Origin only: a full referrer URL can carry personal data in its path or query.
      try {
        data.referrer = new URL(document.referrer).origin;
      } catch {
        /* malformed referrer — skip */
      }
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}

export function clearAttribution() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
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
