/**
 * Search index builder.
 *
 * Produces a compact, CMS-agnostic JSON document per locale
 * (served at /<lang>/search.json). The client-side search reads it; it can be
 * swapped for Pagefind, Algolia or Meilisearch later without changing content.
 */
import type { Locale } from '@/i18n/config';
import { getCaseStudies, getLocations, getPosts, getProducts, getServices } from './index';

export type SearchType = 'service' | 'product' | 'caseStudy' | 'article' | 'page';

export interface SearchItem {
  type: SearchType;
  title: string;
  description: string;
  url: string;
  /** Extra terms: technologies, tags, categories. */
  keywords: string[];
}

export async function buildSearchIndex(locale: Locale): Promise<SearchItem[]> {
  const [services, products, caseStudies, posts, locations] = await Promise.all([
    getServices(locale),
    getProducts(locale),
    getCaseStudies(locale),
    getPosts(locale),
    getLocations(locale),
  ]);

  return [
    ...services.map<SearchItem>((s) => ({
      type: 'service',
      title: s.data.title,
      description: s.data.summary,
      url: s.url,
      keywords: [...s.data.keywords, ...s.data.technologies, ...s.data.capabilities.map((c) => c.title)],
    })),
    ...products.map<SearchItem>((p) => ({
      type: 'product',
      title: p.name,
      description: p.tagline,
      url: p.url,
      keywords: [p.category, ...p.technologies, ...p.features.map((f) => f.title)],
    })),
    ...caseStudies.map<SearchItem>((c) => ({
      type: 'caseStudy',
      title: c.data.title,
      description: c.data.summary,
      url: c.url,
      keywords: [c.data.client.descriptor, ...c.data.stack],
    })),
    ...posts.map<SearchItem>((p) => ({
      type: 'article',
      title: p.data.title,
      description: p.data.description,
      url: p.url,
      keywords: [p.data.category, ...p.data.tags],
    })),
    ...locations.map<SearchItem>((l) => ({
      type: 'page',
      title: l.data.hero.title,
      description: l.data.hero.lead,
      url: l.url,
      keywords: [l.data.name],
    })),
  ];
}
