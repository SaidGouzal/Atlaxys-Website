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
  legal: ['privacy', 'terms', 'cookies'] as const,
};
