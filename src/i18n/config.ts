/**
 * Internationalisation configuration.
 *
 * To add a language:
 *   1. Add its code to `locales` and an entry to `localeMeta`.
 *   2. Create `src/i18n/ui/<code>.ts` (TypeScript will list every missing key).
 *   3. Add content under `src/content/<collection>/<code>/`.
 * Routes, hreflang, sitemap and the language switcher pick it up automatically.
 */
export const locales = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export interface LocaleMeta {
  /** Name of the language in that language. */
  nativeName: string;
  /** Short label for compact UI (language switcher). */
  short: string;
  dir: 'ltr' | 'rtl';
  /** BCP 47 code for `hreflang` and `<html lang>`. */
  hreflang: string;
  /** Open Graph locale. */
  ogLocale: string;
  /** Locale passed to Intl formatters (dates, numbers, plurals). */
  intl: string;
}

export const localeMeta: Record<Locale, LocaleMeta> = {
  en: { nativeName: 'English', short: 'EN', dir: 'ltr', hreflang: 'en', ogLocale: 'en_US', intl: 'en-GB' },
  fr: { nativeName: 'Français', short: 'FR', dir: 'ltr', hreflang: 'fr', ogLocale: 'fr_FR', intl: 'fr-FR' },
  ar: { nativeName: 'العربية', short: 'ع', dir: 'rtl', hreflang: 'ar', ogLocale: 'ar_AR', intl: 'ar-MA' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** `getStaticPaths` helper for `src/pages/[lang]/...` routes. */
export function localeStaticPaths() {
  return locales.map((lang) => ({ params: { lang } }));
}
