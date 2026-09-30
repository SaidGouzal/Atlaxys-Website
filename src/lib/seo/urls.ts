/** Canonical origin, from `site` in astro.config.mjs (SITE_URL env var). */
export const siteOrigin = (import.meta.env.SITE ?? 'https://atlaxys.com').replace(/\/$/, '');

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}
