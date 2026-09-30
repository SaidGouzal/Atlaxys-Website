/**
 * Consent manager.
 *
 * Stores the visitor's decision in localStorage (first-party, no cookie) and
 * loads only the vendors whose category was accepted. The decision can be
 * changed any time from "Cookie settings" in the footer.
 */
import { loadVendors, updateGoogleConsent } from './vendors';

export interface ConsentState {
  v: number;
  analytics: boolean;
  marketing: boolean;
  ts: string;
}

const KEY = 'atlaxys-consent';

function config() {
  return window.__atlaxysAnalytics;
}

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentState;
    return parsed.v === config()?.consentVersion ? parsed : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean, marketing: boolean): ConsentState {
  const state: ConsentState = { v: config()?.consentVersion ?? 1, analytics, marketing, ts: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked — consent applies to this page view only */
  }
  return state;
}

function apply(state: ConsentState) {
  updateGoogleConsent(state);
  loadVendors(state);
  document.dispatchEvent(new CustomEvent('atlaxys:consent', { detail: state }));
}

export function initConsent() {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  const form = document.querySelector<HTMLFormElement>('[data-consent-form]');
  const dialog = document.getElementById('consent-settings') as HTMLDialogElement | null;
  if (!banner || !config()) return;

  const showBanner = (show: boolean) => {
    banner.hidden = !show;
    document.body.classList.toggle('has-consent-banner', show);
  };

  const decide = (analytics: boolean, marketing: boolean) => {
    const state = saveConsent(analytics, marketing);
    showBanner(false);
    dialog?.close();
    apply(state);
  };

  const existing = readConsent();
  if (existing) apply(existing);
  else showBanner(true);

  banner.querySelector('[data-consent-action="accept"]')?.addEventListener('click', () => decide(true, true));
  banner.querySelector('[data-consent-action="reject"]')?.addEventListener('click', () => decide(false, false));

  // Pre-fill the settings form with the current choice whenever it opens.
  const syncForm = () => {
    const current = readConsent();
    if (!form) return;
    (form.elements.namedItem('analytics') as HTMLInputElement).checked = current?.analytics ?? false;
    (form.elements.namedItem('marketing') as HTMLInputElement).checked = current?.marketing ?? false;
  };

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const analytics = (form.elements.namedItem('analytics') as HTMLInputElement).checked;
    const marketing = (form.elements.namedItem('marketing') as HTMLInputElement).checked;
    decide(analytics, marketing);
  });

  // Footer "Cookie settings" button.
  document.querySelectorAll<HTMLButtonElement>('[data-consent-open]').forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener('click', () => {
      syncForm();
      dialog?.showModal();
    });
  });
  document.querySelectorAll('[data-modal-open="consent-settings"]').forEach((btn) => btn.addEventListener('click', syncForm));
}
