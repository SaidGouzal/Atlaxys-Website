/// <reference types="astro/client" />

interface AtlaxysAnalyticsConfig {
  ga4: string;
  gtm: string;
  metaPixel: string;
  linkedIn: string;
  consentVersion: number;
  consentMaxAgeDays: number;
}

interface Navigator {
  /** Global Privacy Control signal (https://globalprivacycontrol.org). */
  globalPrivacyControl?: boolean;
}

interface Window {
  __atlaxysAnalytics?: AtlaxysAnalyticsConfig;
  __atlaxysMotion?: boolean;
  __atlaxysEnhanced?: boolean;
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: ((...args: unknown[]) => void) & Record<string, unknown>;
  _fbq?: unknown;
  lintrk?: (...args: unknown[]) => void;
  _linkedin_partner_id?: string;
  _linkedin_data_partner_ids?: string[];
}

declare module '*.woff2?url' {
  const src: string;
  export default src;
}
