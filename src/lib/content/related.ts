/**
 * Internal linking.
 *
 * Every relationship is two-way without being declared twice: a case study
 * that lists `services: ["software-engineering"]` automatically appears on the
 * Software Engineering page, a post that relates to a product shows up on the
 * product page, and so on. Explicit links come first, inferred ones after.
 */
import type { Locale } from '@/i18n/config';
import {
  getCaseStudies,
  getLocations,
  getPosts,
  getProducts,
  getServices,
  type CaseStudy,
  type Location,
  type Post,
  type Product,
  type Service,
} from './index';

export interface RelatedContent {
  services: Service[];
  products: Product[];
  caseStudies: CaseStudy[];
  posts: Post[];
  locations: Location[];
}

interface Refs {
  services?: readonly string[];
  products?: readonly string[];
  caseStudies?: readonly string[];
  posts?: readonly string[];
  locations?: readonly string[];
}

type Subject =
  | { type: 'service'; key: string }
  | { type: 'product'; key: string }
  | { type: 'caseStudy'; key: string }
  | { type: 'post'; key: string }
  | { type: 'location'; key: string }
  | { type: 'none' };

function pick<T extends { key: string }>(all: T[], explicit: readonly string[] = [], inferred: T[] = [], exclude?: string, limit = 3): T[] {
  const ordered = [...explicit.map((k) => all.find((i) => i.key === k)).filter((i): i is T => Boolean(i)), ...inferred];
  const seen = new Set<string>(exclude ? [exclude] : []);
  const out: T[] = [];
  for (const item of ordered) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export async function getRelated(locale: Locale, subject: Subject, refs: Refs = {}, limit = 3): Promise<RelatedContent> {
  const [services, products, caseStudies, posts, locations] = await Promise.all([
    getServices(locale),
    getProducts(locale),
    getCaseStudies(locale),
    getPosts(locale),
    getLocations(locale),
  ]);
  const key = subject.type === 'none' ? '' : subject.key;
  const is = (t: Subject['type']) => subject.type === t;

  const inferredServices = services.filter(
    (s) =>
      (is('product') && s.data.related.products.includes(key)) ||
      (is('caseStudy') && s.data.related.caseStudies.includes(key)) ||
      (is('post') && s.data.related.posts.includes(key)),
  );

  const inferredProducts = products.filter(
    (p) =>
      (is('service') && p.services.includes(key)) ||
      (is('caseStudy') && p.caseStudies.includes(key)) ||
      (is('post') && p.posts.includes(key)),
  );

  const current = is('caseStudy') ? caseStudies.find((c) => c.key === key) : undefined;
  const inferredCases = caseStudies.filter(
    (c) =>
      (is('service') && c.data.services.includes(key)) ||
      (is('product') && c.data.products.includes(key)) ||
      (is('post') && c.data.related.posts.includes(key)) ||
      (current !== undefined && c.key !== key && (c.data.industry === current.data.industry || c.data.services.some((s) => current.data.services.includes(s)))),
  );

  const currentPost = is('post') ? posts.find((p) => p.key === key) : undefined;
  const inferredPosts = posts.filter(
    (p) =>
      (is('service') && p.data.related.services.includes(key)) ||
      (is('product') && p.data.related.products.includes(key)) ||
      (is('caseStudy') && p.data.related.caseStudies.includes(key)) ||
      (is('location') && p.data.related.locations.includes(key)) ||
      (currentPost !== undefined &&
        p.key !== key &&
        (p.data.category === currentPost.data.category || p.data.tags.some((t) => currentPost.data.tags.includes(t)))),
  );

  const inferredLocations = locations.filter((l) => is('service') && l.data.services.includes(key));

  return {
    services: pick(services, refs.services, inferredServices, is('service') ? key : undefined, 4),
    products: pick(products, refs.products, inferredProducts, is('product') ? key : undefined, limit),
    caseStudies: pick(caseStudies, refs.caseStudies, inferredCases, is('caseStudy') ? key : undefined, limit),
    posts: pick(posts, refs.posts, inferredPosts, is('post') ? key : undefined, limit),
    locations: pick(locations, refs.locations, inferredLocations, is('location') ? key : undefined, limit),
  };
}
