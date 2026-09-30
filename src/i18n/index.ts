import { defaultLocale, localeMeta, type Locale } from './config';
import en, { type UIDictionary } from './ui/en';
import fr from './ui/fr';
import ar from './ui/ar';

const dictionaries: Record<Locale, UIDictionary> = { en, fr, ar };

export * from './config';
export * from './paths';
export type { UIDictionary };

/** UI strings for a locale. */
export function useTranslations(locale: Locale): UIDictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function formatDate(date: Date, locale: Locale, style: 'long' | 'short' = 'long'): string {
  return new Intl.DateTimeFormat(localeMeta[locale].intl, {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeMeta[locale].intl, options).format(value);
}

/** Localised country name from an ISO code, e.g. ('MA', 'fr') → 'Maroc'. */
export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([localeMeta[locale].intl], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
