import { defaultLocale, isLocale, type Locale } from '@/i18n/config';

/** A value shared by all languages, or translated per language (English required). */
export type Localized<T> = T | ({ en: T } & Partial<Record<Exclude<Locale, 'en'>, T>>);

function isLocalizedObject<T>(value: Localized<T>): value is { en: T } & Partial<Record<Locale, T>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'en' in value;
}

/** Resolve a translatable value, falling back to English. */
export function tr<T>(value: Localized<T>, locale: Locale): T {
  if (isLocalizedObject(value)) return (value[locale] ?? value[defaultLocale]) as T;
  return value as T;
}

export function trOptional<T>(value: Localized<T> | undefined, locale: Locale): T | undefined {
  return value === undefined ? undefined : tr(value, locale);
}

/** "fr/ingenierie-logicielle" → { locale: 'fr', slug: 'ingenierie-logicielle' } */
export function splitLocaleId(id: string): { locale: Locale; slug: string } {
  const [first, ...rest] = id.split('/');
  if (!isLocale(first) || rest.length === 0) {
    throw new Error(`Content id "${id}" must live in a locale folder (en/, fr/ or ar/).`);
  }
  return { locale: first, slug: rest.join('/') };
}

/** Drafts are visible while developing and excluded from production builds. */
export function isPublished(data: { draft?: boolean }): boolean {
  return import.meta.env.DEV || !data.draft;
}
