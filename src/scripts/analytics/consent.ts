/**
 * Consent manager.
 *
 * Stores the visitor's decision in localStorage (first-party, no cookie) and
 * loads only the vendors whose category was accepted. Nothing optional runs
 * before an explicit choice: closing, scrolling or browsing never counts as
 * consent.
 *
 *  • The choice expires after `consentMaxAgeDays` and when `consentVersion`
 *    changes; the visitor is then asked again.
 *  • A Global Privacy Control signal (navigator.globalPrivacyControl) is
 *    treated as a refusal of the marketing category, which cannot be switched
 *    on while the signal is sent.
 *  • Withdrawing a category deletes the first-party cookies its vendors set
 *    and reloads the page, so already-loaded vendor code stops running.
 *
 * The decision can be changed at any time from "Cookie settings" in the footer.
 */
import { captureAttribution, clearAttribution } from './attribution';
import { loadVendors, updateGoogleConsent } from './vendors';

export interface ConsentState {
  v: number;
  analytics: boolean;
  marketing: boolean;
  gpc?: boolean;
  ts: string;
}

const KEY = 'atlaxys-consent';
const DAY = 86_400_000;

/** First-party cookies set by each category's vendors (see src/config/privacy.ts). */
const VENDOR_COOKIES: Record<'analytics' | 'marketing', RegExp> = {
  analytics: /^(_ga|_ga_.+|_gid|_gat.*)$/,
  marketing: /^(_fbp|_fbc|_gcl_.+|_gac_.+|li_.+|lms_.+)$/,
};

function config() {
  return window.__atlaxysAnalytics;
}

export const gpcEnabled = () => navigator.globalPrivacyControl === true;

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    const cfg = config();
    const age = Date.now() - Date.parse(parsed.ts ?? '');
    const valid =
      parsed.v === cfg?.consentVersion &&
      typeof parsed.analytics === 'boolean' &&
      typeof parsed.marketing === 'boolean' &&
      Number.isFinite(age) &&
      age >= 0 &&
      age < (cfg?.consentMaxAgeDays ?? 180) * DAY;
    if (!valid) return null;
    const state = parsed as ConsentState;
    // A GPC signal sent now overrides an earlier "yes" to marketing.
    return gpcEnabled() ? { ...state, marketing: false } : state;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean, marketing: boolean): ConsentState {
  const gpc = gpcEnabled();
  const state: ConsentState = {
    v: config()?.consentVersion ?? 1,
    analytics,
    marketing: marketing && !gpc,
    gpc,
    ts: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked — the choice applies to this page view only */
  }
  return state;
}

/** Delete first-party cookies matching `pattern` on this host and its parent domains. */
function deleteCookies(pattern: RegExp) {
  const names = document.cookie
    .split(';')
    .map((c) => c.split('=')[0]?.trim() ?? '')
    .filter((name) => pattern.test(name));
  if (!names.length) return;
  const parts = window.location.hostname.split('.');
  const domains = [''];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join('.')}`);
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain}; SameSite=Lax`;
    }
  }
}

/** The consent last applied in this page (vendors may already be running). */
let applied: ConsentState | null = null;

function apply(state: ConsentState) {
  applied = state;
  updateGoogleConsent(state);
  loadVendors(state);
  if (state.marketing) captureAttribution();
  else clearAttribution();
  document.dispatchEvent(new CustomEvent('atlaxys:consent', { detail: state }));
}

export function initConsent() {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  const form = document.querySelector<HTMLFormElement>('[data-consent-form]');
  const dialog = document.getElementById('consent-settings') as HTMLDialogElement | null;
  if (!banner || !config()) return;
  const root = document.documentElement;
  const gpc = gpcEnabled();

  // While the banner is visible, keep focused elements from scrolling under it.
  const offset = new ResizeObserver(() => {
    root.style.setProperty('--consent-offset', banner.hidden ? '0px' : `${banner.offsetHeight + 16}px`);
  });
  offset.observe(banner);

  const showBanner = (show: boolean) => {
    banner.hidden = !show;
    document.body.classList.toggle('has-consent-banner', show);
    if (!show) root.style.setProperty('--consent-offset', '0px');
  };

  /** After the banner disappears, don't leave keyboard focus on a hidden button. */
  const restoreFocus = () => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body || banner.contains(active) || active.closest('[hidden]')) {
      document.getElementById('main')?.focus({ preventScroll: true });
    }
  };

  const decide = (analytics: boolean, marketing: boolean) => {
    const previous = readConsent();
    const state = saveConsent(analytics, marketing);
    showBanner(false);
    if (dialog?.open) dialog.close();
    restoreFocus();

    const withdrawn = (['analytics', 'marketing'] as const).filter((c) => previous?.[c] && !state[c]);
    if (withdrawn.length) {
      // Official Google opt-out switch: stops any gtag call that runs before the reload completes.
      const ga4 = config()?.ga4;
      if (ga4 && withdrawn.includes('analytics')) (window as unknown as Record<string, boolean>)[`ga-disable-${ga4}`] = true;
      withdrawn.forEach((c) => deleteCookies(VENDOR_COOKIES[c]));
      if (withdrawn.includes('marketing')) clearAttribution();
      // Vendor code already running in this page cannot be unloaded: reload.
      window.location.reload();
      return;
    }
    apply(state);
  };

  const existing = readConsent();
  if (existing) apply(existing);
  else showBanner(true);

  banner.querySelector('[data-consent-action="accept"]')?.addEventListener('click', () => decide(true, true));
  banner.querySelector('[data-consent-action="reject"]')?.addEventListener('click', () => decide(false, false));
  dialog?.querySelector('[data-consent-action="accept"]')?.addEventListener('click', () => decide(true, true));
  dialog?.querySelector('[data-consent-action="reject"]')?.addEventListener('click', () => decide(false, false));

  const analyticsInput = form?.elements.namedItem('analytics') as HTMLInputElement | null;
  const marketingInput = form?.elements.namedItem('marketing') as HTMLInputElement | null;
  if (gpc && marketingInput) {
    marketingInput.disabled = true;
    form?.querySelector<HTMLElement>('[data-gpc-note]')?.removeAttribute('hidden');
  }

  // Pre-fill the settings form with the current choice whenever it opens.
  const syncForm = () => {
    const current = readConsent();
    if (analyticsInput) analyticsInput.checked = current?.analytics ?? false;
    if (marketingInput) marketingInput.checked = !gpc && (current?.marketing ?? false);
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    decide(Boolean(analyticsInput?.checked), Boolean(marketingInput?.checked));
  });

  // A choice changed in another tab applies here too: a withdrawal reloads
  // this page so vendor code already running stops; otherwise hide the banner.
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    const next = readConsent();
    const withdrew = (['analytics', 'marketing'] as const).some((c) => applied?.[c] && !next?.[c]);
    if (withdrew) {
      window.location.reload();
      return;
    }
    if (!next) return;
    showBanner(false);
    apply(next);
  });

  // Footer "Cookie settings" buttons.
  document.querySelectorAll<HTMLButtonElement>('[data-consent-open]').forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener('click', () => {
      syncForm();
      dialog?.showModal();
    });
  });
  document.querySelectorAll('[data-modal-open="consent-settings"]').forEach((btn) => btn.addEventListener('click', syncForm));
}
