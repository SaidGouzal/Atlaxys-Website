/**
 * ============================================================================
 *  SITE CONFIGURATION — the single place to edit company-wide information.
 * ============================================================================
 *
 * Everything here feeds the header, footer, contact page, WhatsApp buttons,
 * structured data (JSON-LD), llms.txt and Open Graph tags.
 *
 * Values marked `TODO(launch)` are placeholders. Replace them before going
 * live — see "Launch checklist" in README.md.
 */
export const site = {
  name: 'Atlaxys Consulting',
  shortName: 'Atlaxys',
  /** Registered company name, e.g. "Atlaxys Consulting SARL". TODO(launch) */
  legalName: undefined as string | undefined,
  /** Year founded, e.g. 2025. Leave undefined until confirmed. TODO(launch) */
  foundingYear: undefined as number | undefined,

  contact: {
    /** TODO(launch): confirm the public inbox. */
    email: 'hello@atlaxys.com',
    /** Display format. */
    phone: '+212 7 08 00 60 33',
    /**
     * WhatsApp number in international format, digits only (no +, spaces or 0 prefix).
     * Used by every WhatsApp button on the site.
     */
    whatsapp: '212708006033',
    /** Show the floating WhatsApp button (hidden on the contact page and landing pages that already show one). */
    whatsappFloatingButton: true,
  },

  address: {
    /** ISO 3166-1 alpha-2 */
    countryCode: 'MA',
    /** e.g. 'Casablanca'. Leave undefined to show the country only. TODO(launch) */
    locality: undefined as string | undefined,
    region: undefined as string | undefined,
    streetAddress: undefined as string | undefined,
    postalCode: undefined as string | undefined,
  },

  timezone: 'Africa/Casablanca',

  /** Regions Atlaxys actively serves — used in copy and structured data. */
  areaServed: ['Morocco', 'Europe', 'United Kingdom', 'Canada', 'United States', 'Middle East', 'Africa'],

  /** Only filled links are rendered. */
  social: {
    linkedin: '' as string,
    instagram: '' as string,
    facebook: '' as string,
    x: '' as string,
    github: '' as string,
  },

  /** Default social sharing image (1200×630, in /public). */
  defaultOgImage: {
    src: '/og/atlaxys-default.jpg',
    width: 1200,
    height: 630,
  },

  /** Public logo URL used by structured data (must be crawlable, ≥112px). */
  logoUrl: '/brand/atlaxys-logo-512.png',

  /** Brand colours mirrored from src/styles/tokens.css for non-CSS contexts (manifest, meta theme-color). */
  brand: {
    ink: '#08090B',
    signal: '#FF8828',
  },

  /**
   * Content marked `demo: true` (illustrative case studies, placeholder
   * products) shows a visible "Illustrative example" notice. Keep `true`
   * until every demo entry is replaced.
   */
  showDemoNotices: true,
} as const;

export type SocialNetwork = keyof typeof site.social;

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${site.contact.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function mailtoLink(subject?: string): string {
  return subject ? `mailto:${site.contact.email}?subject=${encodeURIComponent(subject)}` : `mailto:${site.contact.email}`;
}

export function telLink(): string {
  return `tel:${site.contact.phone.replace(/[^\d+]/g, '')}`;
}
