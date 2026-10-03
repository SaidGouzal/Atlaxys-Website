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
import type { Locale } from '@/i18n/config';

export const site = {
  name: 'Atlaxys Consulting',
  shortName: 'Atlaxys',
  /** Registered company name, e.g. "Atlaxys Consulting SARL". TODO(launch) */
  legalName: undefined as string | undefined,
  /** Year founded, e.g. 2025. Leave undefined until confirmed. TODO(launch) */
  foundingYear: undefined as number | undefined,

  contact: {
    /** Public inbox shown on every contact button, the footer and structured data. */
    email: 'contact@atlaxys.com',
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

  /**
   * Company identification for the Legal notice and the privacy policy.
   * Every value must be copied from official registration documents
   * (statuts, RC extract, ICE certificate, CNDP receipt). Leave `undefined`
   * until confirmed — never guess. Missing values are listed as a warning at
   * build time (see src/lib/launch-check.ts) and simply not displayed.
   */
  legal: {
    /** Legal form per language; the official Moroccan form (SARL AU) stays in each. */
    legalForm: {
      en: 'SARL AU (single-member limited liability company)',
      fr: 'SARL AU (société à responsabilité limitée à associé unique)',
      ar: 'شركة ذات مسؤولية محدودة بشريك وحيد (SARL AU)',
    } as Record<Locale, string> | undefined,
    /** Share capital, e.g. "100 000 MAD". TODO(launch) */
    shareCapital: '10 000 MAD' as string | undefined,
    /** Registre du Commerce number and court, e.g. "RC Casablanca 000000". TODO(launch) */
    rc: '14119' as string | undefined,
    /** Identifiant Commun de l'Entreprise (15 digits). TODO(launch) */
    ice: '004004253000011' as string | undefined,
    /** Identifiant Fiscal. TODO(launch) */
    taxId: '73349584' as string | undefined,
    /**
     * Registered office (siège social), postal address without the country:
     * the country (address.countryCode) is added in the page's language.
     */
    registeredAddress: 'N° 2740 Douar Tiguemi Lajdid, Tarmigt Ouarzazate' as string | undefined,
    /** Legal representative / person responsible for the website's content. TODO(launch) */
    publicationDirector: undefined as string | undefined,
    /** Inbox for data-protection requests. Falls back to contact.email. */
    privacyEmail: 'contact@atlaxys.com' as string | undefined,
    /**
     * CNDP receipt or authorisation number covering the processing done through
     * this website (contact enquiries, analytics). TODO(legal review)
     */
    cndpReceipt: undefined as string | undefined,
    /**
     * Representative in the EU (GDPR art. 27), only if counsel confirms one is
     * required. Name + address. TODO(legal review)
     */
    euRepresentative: undefined as string | undefined,
  },

  timezone: 'Africa/Casablanca',

  /** Regions Atlaxys actively serves — used in copy and structured data. */
  areaServed: ['Morocco', 'Europe', 'United Kingdom', 'Canada', 'United States', 'Middle East', 'Africa'],

  /**
   * Only filled links are rendered (footer, Organization `sameAs`, X card).
   * Every URL must open the company's own, existing profile: a dead link here
   * is a broken link on every page and misleading structured data.
   * TODO(owner): LinkedIn and X were removed on 2026-10-02 because
   * linkedin.com/company/atlaxys-consulting/ and x.com/Atlaxys did not exist.
   * Add the correct URLs once confirmed.
   */
  social: {
    linkedin: '' as string,
    instagram: 'https://www.instagram.com/atlaxys.consulting/' as string,
    facebook: 'https://www.facebook.com/p/Atlaxys-Consulting-Ltd-61595056014279/' as string,
    x: '' as string,
    github: 'https://github.com/Atlaxys' as string,
  },

  /**
   * Site-ownership verification for SEO tools, rendered as
   * <meta name="…" content="…"> on every page (including the root redirect).
   */
  verification: {
    'sitecheckerpro-site-verification': 'af4565f71516fcbfadc624c2cd92c729',
  } as Record<string, string>,

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
    /** --paper-100: page background in light mode (browser theme colour). */
    paper: '#EEF1F5',
    signal: '#FF8828',
  },

  /**
   * Colour theme for a first visit, before the visitor uses the toggle:
   * 'light' or 'dark' forces one whatever the device setting; 'system'
   * follows the device. Once the visitor clicks the toggle, their choice is
   * stored and always wins, until they clear the site's data.
   */
  theme: {
    default: 'light' as 'system' | 'dark' | 'light',
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

/** Where privacy / data-subject requests go. */
export const privacyEmail = site.legal.privacyEmail ?? site.contact.email;

export function telLink(): string {
  return `tel:${site.contact.phone.replace(/[^\d+]/g, '')}`;
}
