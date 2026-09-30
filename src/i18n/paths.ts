import { defaultLocale, isLocale, locales, type Locale } from './config';

/**
 * Section roots. Keeping every URL in one map means a section can be renamed
 * (or given a localised segment later) without touching templates.
 */
export const routes = {
  home: '/',
  about: '/about/',
  services: '/services/',
  products: '/products/',
  work: '/work/',
  insights: '/insights/',
  industries: '/industries/',
  locations: '/locations/',
  landing: '/landing/',
  contact: '/contact/',
  contactThanks: '/contact/thank-you/',
  legal: '/legal/',
  search: '/search/',
} as const;

export type RouteKey = keyof typeof routes;

function ensureSlashes(path: string): string {
  let p = path.startsWith('/') ? path : `/${path}`;
  const hasExtension = /\.[a-z0-9]+$/i.test(p.split('?')[0] ?? '');
  if (!hasExtension && !p.includes('?') && !p.includes('#') && !p.endsWith('/')) p += '/';
  return p;
}

/** `/en/about/` from (`en`, `/about/`). */
export function localizePath(locale: Locale, path: string = '/'): string {
  const clean = ensureSlashes(path);
  return clean === '/' ? `/${locale}/` : `/${locale}${clean}`;
}

/** Localised URL for a named route. */
export function routePath(locale: Locale, key: RouteKey): string {
  return localizePath(locale, routes[key]);
}

/** Localised URL for an entry inside a section, e.g. a product page. */
export function entryPath(locale: Locale, key: RouteKey, slug: string): string {
  return localizePath(locale, `${routes[key]}${slug}/`);
}

export function getLocaleFromPath(pathname: string): Locale {
  const segment = pathname.split('/').filter(Boolean)[0];
  return isLocale(segment) ? segment : defaultLocale;
}

/** Map of locale → path for pages whose structure is identical in every language. */
export function mirroredAlternates(path: string): Record<Locale, string> {
  return Object.fromEntries(locales.map((l) => [l, localizePath(l, path)])) as Record<Locale, string>;
}
