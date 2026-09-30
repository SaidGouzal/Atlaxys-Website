import { routePath, useTranslations, type Locale, type RouteKey } from '@/i18n';
import type { Crumb } from './schema';

/** Breadcrumb trail starting at the localized home page. */
export function crumbs(locale: Locale, ...rest: (Crumb | RouteKey)[]): Crumb[] {
  const t = useTranslations(locale);
  const sectionName: Partial<Record<RouteKey, string>> = {
    about: t.nav.about,
    services: t.nav.services,
    products: t.nav.products,
    work: t.nav.work,
    insights: t.nav.insights,
    contact: t.nav.contact,
    search: t.nav.search,
  };
  return [
    { name: t.nav.home, url: routePath(locale, 'home') },
    ...rest.map((c) => (typeof c === 'string' ? { name: sectionName[c] ?? c, url: routePath(locale, c) } : c)),
  ];
}
