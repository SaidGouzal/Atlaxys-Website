import type { Locale } from '@/i18n/config';
import type { AlternateMap } from '@/lib/content';

/** Everything a page tells the <head> about itself. */
export interface SeoProps {
  /** Page title. The brand suffix is appended when it fits in 60 characters (see fullTitle). */
  title: string;
  description: string;
  /** Canonical path, e.g. "/en/about/". Defaults to the current path. */
  canonical?: string;
  /** locale → path of the same page in other languages (drives hreflang + language switcher). */
  alternates?: AlternateMap;
  image?: { src: string; width?: number; height?: number; alt?: string };
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  /**
   * Error pages (404) are served at any missing URL, so they have no URL of
   * their own: no canonical, og:url or WebPage node, which would otherwise
   * point crawlers at a path that does not exist.
   */
  errorPage?: boolean;
  publishedTime?: Date;
  modifiedTime?: Date;
  section?: string;
  tags?: string[];
}

/**
 * Search results cut titles at roughly 60 characters (561 px). The brand
 * suffix is only added when it fits, so a long title is never truncated
 * in the middle of its own words.
 */
export function fullTitle(title: string, siteName: string, max = 60): string {
  if (title.includes('Atlaxys')) return title;
  const branded = `${title} | ${siteName}`;
  return branded.length <= max ? branded : title;
}

/** Trim a description to a search-friendly length at a word boundary. */
export function clampDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export type { Locale };
