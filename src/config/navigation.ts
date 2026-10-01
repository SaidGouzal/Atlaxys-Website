import type { RouteKey } from '@/i18n/paths';

/**
 * Navigation structure. Labels come from the UI dictionaries (`nav.*`), URLs
 * from `src/i18n/paths.ts`. The services mega-menu is generated from the
 * services content collection, so a new service appears automatically.
 */
export interface NavItem {
  key: 'services' | 'products' | 'work' | 'insights' | 'about';
  route: RouteKey;
  /** Opens the services mega-menu on desktop. */
  mega?: 'services';
}

export const primaryNav: NavItem[] = [
  { key: 'services', route: 'services', mega: 'services' },
  { key: 'products', route: 'products' },
  { key: 'work', route: 'work' },
  { key: 'insights', route: 'insights' },
  { key: 'about', route: 'about' },
];

/** Footer columns. `services` and `products` are filled from content. */
export const footerNav = {
  company: ['about', 'work', 'insights', 'contact'] as const satisfies readonly RouteKey[],
  legal: ['legalNotice', 'privacy', 'cookies', 'terms'] as const,
};

/**
 * "Work" is only linked once at least one case study is published, so the
 * menus never point visitors to an empty page.
 */
export function withoutEmptyWork<T extends string | { key: string }>(items: readonly T[], hasWork: boolean): T[] {
  return items.filter((item) => hasWork || (typeof item === 'string' ? item : item.key) !== 'work');
}
