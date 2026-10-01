import type { Locale } from '@/i18n/config';
import type { AlternateMap } from '@/lib/content';

/** Everything a page tells the <head> about itself. */
export interface SeoProps {
  /** Page title. The brand suffix is appended unless the title already contains it. */
  title: string;
  description: string;
  /** Canonical path, e.g. "/en/about/". Defaults to the current path. */
  canonical?: string;
  /** locale → path of the same page in other languages (drives hreflang + language switcher). */
  alternates?: AlternateMap;
  image?: { src: string; width?: number; height?: number; alt?: string };
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  publishedTime?: Date;
  modifiedTime?: Date;
  section?: string;
  tags?: string[];
}

export function fullTitle(title: string, siteName: string): string {
  return title.includes('Atlaxys') ? title : `${title} | ${siteName}`;
}

/** Trim a description to a search-friendly length at a word boundary. */
export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

export type { Locale };
