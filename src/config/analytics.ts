import {
  PUBLIC_GA4_ID,
  PUBLIC_GTM_ID,
  PUBLIC_LINKEDIN_PARTNER_ID,
  PUBLIC_META_PIXEL_ID,
} from 'astro:env/client';

/**
 * Central analytics configuration.
 *
 * IDs come from environment variables so staging and production can differ.
 * Nothing is loaded until the visitor gives consent for the matching
 * category ("analytics" or "marketing"), see src/scripts/analytics/.
 */
export const analyticsConfig = {
  ga4: PUBLIC_GA4_ID || '',
  gtm: PUBLIC_GTM_ID || '',
  metaPixel: PUBLIC_META_PIXEL_ID || '',
  linkedIn: PUBLIC_LINKEDIN_PARTNER_ID || '',
} as const;

export type ConsentCategory = 'analytics' | 'marketing';

/** Which consent category each vendor requires. */
export const vendorCategories = {
  ga4: 'analytics',
  gtm: 'analytics',
  metaPixel: 'marketing',
  linkedIn: 'marketing',
} as const satisfies Record<keyof typeof analyticsConfig, ConsentCategory>;

/** True when at least one tracker is configured — otherwise no consent banner is needed. */
export const analyticsEnabled = Object.values(analyticsConfig).some(Boolean);

/** Bump when the consent categories change to re-ask every visitor. */
export const consentVersion = 1;
