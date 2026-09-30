/**
 * Conversion tracking API used across the site.
 *
 *   track('generate_lead', { form: 'contact' })
 *
 * Events always go to the dataLayer (read by GTM only if it was allowed to
 * load). Vendor calls happen only when the vendor script exists, i.e. after
 * consent. Standard event names map to each vendor's own vocabulary.
 */

type Params = Record<string, string | number | boolean | undefined>;

const META_EVENTS: Record<string, string> = {
  generate_lead: 'Lead',
  whatsapp_click: 'Contact',
  email_click: 'Contact',
  phone_click: 'Contact',
};

export function track(event: string, params: Params = {}) {
  window.dataLayer?.push({ event, ...params });
  window.gtag?.('event', event, params);
  const metaEvent = META_EVENTS[event];
  if (metaEvent && typeof window.fbq === 'function') {
    window.fbq('track', metaEvent, { content_name: params.content_name ?? params.form ?? event });
  }
  if (event === 'generate_lead' && typeof window.lintrk === 'function') {
    window.lintrk('track');
  }
}

/** Delegated tracking for any element with data-track="event_name". */
export function initClickTracking() {
  document.addEventListener('click', (event) => {
    const el = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-track]');
    if (!el?.dataset.track) return;
    track(el.dataset.track, {
      location: el.dataset.trackLocation ?? document.body.dataset.page ?? undefined,
      page_path: window.location.pathname,
    });
  });
}
