/**
 * Content repository.
 *
 * The only module that talks to Astro content collections. It returns plain,
 * locale-resolved view models with their URLs, so templates never deal with
 * file paths, translation objects or sorting rules.
 *
 * Moving to a headless CMS later means re-implementing these functions (or
 * pointing the collections at a CMS loader) — templates stay untouched.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { locales, type Locale } from '@/i18n/config';
import { entryPath, localizePath, routes } from '@/i18n/paths';
import { isPublished, splitLocaleId, tr, trOptional } from './localize';

export { tr, trOptional } from './localize';
export type { Localized } from './localize';

// ---------------------------------------------------------------------------
// Memoisation (production builds only — dev must see edits immediately)
// ---------------------------------------------------------------------------
const cache = new Map<string, Promise<unknown>>();
function memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (import.meta.env.DEV) return fn();
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key) as Promise<T>;
}

export type AlternateMap = Partial<Record<Locale, string>>;

/** locale → URL for every language in which an item exists. */
function alternatesOf<T extends { key: string; locale: Locale; url: string }>(all: T[], key: string): AlternateMap {
  const map: AlternateMap = {};
  for (const item of all) if (item.key === key) map[item.locale] = item.url;
  return map;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
export interface Service {
  key: string;
  locale: Locale;
  slug: string;
  url: string;
  /** "01", "02"… from the display order. */
  index: string;
  data: CollectionEntry<'services'>['data'];
  entry: CollectionEntry<'services'>;
}

function allServices(): Promise<Service[]> {
  return memo('services', async () => {
    const entries = await getCollection('services', (e) => isPublished(e.data));
    const items = entries.map((entry) => {
      const { locale, slug } = splitLocaleId(entry.id);
      return { key: entry.data.translationKey, locale, slug, url: entryPath(locale, 'services', slug), index: '', data: entry.data, entry };
    });
    for (const locale of locales) {
      items
        .filter((s) => s.locale === locale)
        .sort((a, b) => a.data.order - b.data.order)
        .forEach((s, i) => (s.index = String(i + 1).padStart(2, '0')));
    }
    return items;
  });
}

export async function getServices(locale: Locale): Promise<Service[]> {
  return (await allServices()).filter((s) => s.locale === locale).sort((a, b) => a.data.order - b.data.order);
}

export async function getServiceAlternates(key: string): Promise<AlternateMap> {
  return alternatesOf(await allServices(), key);
}

export async function getServicePaths() {
  return (await allServices()).map((service) => ({ params: { lang: service.locale, slug: service.slug }, props: { service } }));
}

// ---------------------------------------------------------------------------
// Products (one JSON file per product, translated fields resolved per locale)
// ---------------------------------------------------------------------------
type ProductData = CollectionEntry<'products'>['data'];

export interface Product {
  key: string;
  slug: string;
  url: string;
  locale: Locale;
  name: string;
  tagline: string;
  description: string;
  category: string;
  status: ProductData['status'];
  audience?: string;
  platforms: string[];
  features: { title: string; description: string }[];
  technologies: string[];
  cover?: { src: ImageMetadata; alt: string; caption?: string };
  images: { src: ImageMetadata; alt: string; caption?: string }[];
  pricing?: {
    model: NonNullable<ProductData['pricing']>['model'];
    currency: string;
    note?: string;
    plans: { name: string; price?: number; period?: 'month' | 'year' | 'one-time'; features: string[]; highlighted: boolean }[];
  };
  demoUrl?: string;
  downloadUrl?: string;
  docsUrl?: string;
  services: string[];
  caseStudies: string[];
  posts: string[];
  faqs: { question: string; answer: string }[];
  featured: boolean;
  order: number;
  demo: boolean;
  seo: { title?: string; description?: string };
  updatedAt?: Date;
}

function resolveProduct(entry: CollectionEntry<'products'>, locale: Locale): Product {
  const d = entry.data;
  const slug = d.slug ?? entry.id;
  const media = (m: { src: ImageMetadata; alt: ProductData['images'][number]['alt']; caption?: ProductData['images'][number]['caption'] }) => ({
    src: m.src,
    alt: tr(m.alt, locale),
    caption: trOptional(m.caption, locale),
  });
  return {
    key: entry.id,
    slug,
    url: entryPath(locale, 'products', slug),
    locale,
    name: (d.name ?? d.title) as string,
    tagline: tr(d.tagline, locale),
    description: tr(d.description, locale),
    category: tr(d.category, locale),
    status: d.status,
    audience: trOptional(d.audience, locale),
    platforms: d.platforms,
    features: d.features.map((f) => ({ title: tr(f.title, locale), description: tr(f.description, locale) })),
    technologies: d.technologies,
    cover: d.cover ? media(d.cover) : undefined,
    images: d.images.map(media),
    pricing: d.pricing
      ? {
          model: d.pricing.model,
          currency: d.pricing.currency,
          note: trOptional(d.pricing.note, locale),
          plans: d.pricing.plans.map((p) => ({
            name: tr(p.name, locale),
            price: p.price,
            period: p.period,
            features: p.features.map((f) => tr(f, locale)),
            highlighted: p.highlighted,
          })),
        }
      : undefined,
    demoUrl: d.demoUrl,
    downloadUrl: d.downloadUrl,
    docsUrl: d.docsUrl,
    services: d.services,
    caseStudies: d.caseStudies,
    posts: d.posts,
    faqs: d.faqs.map((f) => ({ question: tr(f.question, locale), answer: tr(f.answer, locale) })),
    featured: d.featured,
    order: d.order,
    demo: d.demo,
    seo: { title: trOptional(d.seo.title, locale), description: trOptional(d.seo.description, locale) },
    updatedAt: d.updatedAt,
  };
}

const productEntries = () => memo('products', () => getCollection('products', (e) => isPublished(e.data)));

export async function getProducts(locale: Locale): Promise<Product[]> {
  return (await productEntries())
    .map((e) => resolveProduct(e, locale))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order || a.name.localeCompare(b.name));
}

export async function getProductPaths() {
  const entries = await productEntries();
  return locales.flatMap((locale) =>
    entries.map((e) => {
      const product = resolveProduct(e, locale);
      return { params: { lang: locale, slug: product.slug }, props: { product } };
    }),
  );
}

// ---------------------------------------------------------------------------
// Industries
// ---------------------------------------------------------------------------
export interface Industry {
  key: string;
  name: string;
  summary: string;
  examples: string[];
  services: string[];
  url?: string;
}

export async function getIndustries(locale: Locale): Promise<Industry[]> {
  const entries = await memo('industries', () => getCollection('industries'));
  return entries
    .sort((a, b) => a.data.order - b.data.order)
    .map((e) => ({
      key: e.id,
      name: tr(e.data.name, locale),
      summary: tr(e.data.summary, locale),
      examples: trOptional(e.data.examples, locale) ?? [],
      services: e.data.services,
      url: e.data.publishPage ? entryPath(locale, 'industries', e.id) : undefined,
    }));
}

// ---------------------------------------------------------------------------
// Case studies
// ---------------------------------------------------------------------------
export interface CaseStudy {
  key: string;
  locale: Locale;
  slug: string;
  url: string;
  data: CollectionEntry<'caseStudies'>['data'];
  entry: CollectionEntry<'caseStudies'>;
}

function allCaseStudies(): Promise<CaseStudy[]> {
  return memo('caseStudies', async () => {
    const entries = await getCollection('caseStudies', (e) => isPublished(e.data));
    return entries.map((entry) => {
      const { locale, slug } = splitLocaleId(entry.id);
      return { key: entry.data.translationKey, locale, slug, url: entryPath(locale, 'work', slug), data: entry.data, entry };
    });
  });
}

export async function getCaseStudies(locale: Locale): Promise<CaseStudy[]> {
  return (await allCaseStudies())
    .filter((c) => c.locale === locale)
    .sort(
      (a, b) =>
        Number(b.data.featured) - Number(a.data.featured) ||
        a.data.order - b.data.order ||
        b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
    );
}

export async function getCaseStudyAlternates(key: string): Promise<AlternateMap> {
  return alternatesOf(await allCaseStudies(), key);
}

export async function getCaseStudyPaths() {
  return (await allCaseStudies()).map((caseStudy) => ({
    params: { lang: caseStudy.locale, slug: caseStudy.slug },
    props: { caseStudy },
  }));
}

// ---------------------------------------------------------------------------
// Insights (blog posts)
// ---------------------------------------------------------------------------
export interface Post {
  key: string;
  locale: Locale;
  slug: string;
  url: string;
  readingMinutes: number;
  data: CollectionEntry<'blog'>['data'];
  entry: CollectionEntry<'blog'>;
}

function readingMinutes(body: string | undefined): number {
  const words = (body ?? '').replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function allPosts(): Promise<Post[]> {
  return memo('posts', async () => {
    const entries = await getCollection('blog', (e) => isPublished(e.data));
    return entries.map((entry) => {
      const { locale, slug } = splitLocaleId(entry.id);
      return {
        key: entry.data.translationKey ?? slug,
        locale,
        slug,
        url: entryPath(locale, 'insights', slug),
        readingMinutes: readingMinutes(entry.body),
        data: entry.data,
        entry,
      };
    });
  });
}

export async function getPosts(locale: Locale): Promise<Post[]> {
  return (await allPosts())
    .filter((p) => p.locale === locale)
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export async function getPostAlternates(key: string): Promise<AlternateMap> {
  return alternatesOf(await allPosts(), key);
}

export async function getPostPaths() {
  return (await allPosts()).map((post) => ({ params: { lang: post.locale, slug: post.slug }, props: { post } }));
}

// ---------------------------------------------------------------------------
// Landing pages
// ---------------------------------------------------------------------------
export interface LandingPage {
  key: string;
  locale: Locale;
  slug: string;
  url: string;
  data: CollectionEntry<'landingPages'>['data'];
}

function allLandingPages(): Promise<LandingPage[]> {
  return memo('landing', async () => {
    const entries = await getCollection('landingPages', (e) => isPublished(e.data));
    return entries.map((entry) => {
      const { locale, slug } = splitLocaleId(entry.id);
      return { key: entry.data.translationKey ?? `${locale}/${slug}`, locale, slug, url: entryPath(locale, 'landing', slug), data: entry.data };
    });
  });
}

export async function getLandingPages(locale?: Locale): Promise<LandingPage[]> {
  const all = await allLandingPages();
  return locale ? all.filter((l) => l.locale === locale) : all;
}

export async function getLandingAlternates(key: string): Promise<AlternateMap> {
  return alternatesOf(await allLandingPages(), key);
}

export async function getLandingPaths() {
  return (await allLandingPages()).map((landing) => ({ params: { lang: landing.locale, slug: landing.slug }, props: { landing } }));
}

// ---------------------------------------------------------------------------
// Locations (country → region → city, URL follows the hierarchy)
// ---------------------------------------------------------------------------
export interface Location {
  key: string;
  locale: Locale;
  slug: string;
  /** "morocco/casablanca" */
  path: string;
  url: string;
  data: CollectionEntry<'locations'>['data'];
  entry: CollectionEntry<'locations'>;
}

function allLocations(): Promise<Location[]> {
  return memo('locations', async () => {
    const entries = await getCollection('locations', (e) => e.data.publish || import.meta.env.DEV);
    const base = entries.map((entry) => {
      const { locale, slug } = splitLocaleId(entry.id);
      return { key: entry.data.translationKey, locale, slug, path: slug, url: '', data: entry.data, entry };
    });
    for (const loc of base) {
      const segments = [loc.slug];
      let parentKey = loc.data.parent;
      const guard = new Set<string>();
      while (parentKey && !guard.has(parentKey)) {
        guard.add(parentKey);
        const parent = base.find((p) => p.locale === loc.locale && p.key === parentKey);
        if (!parent) break;
        segments.unshift(parent.slug);
        parentKey = parent.data.parent;
      }
      loc.path = segments.join('/');
      loc.url = localizePath(loc.locale, `${routes.locations}${loc.path}/`);
    }
    return base;
  });
}

export async function getLocations(locale: Locale): Promise<Location[]> {
  return (await allLocations()).filter((l) => l.locale === locale);
}

export async function getLocationAlternates(key: string): Promise<AlternateMap> {
  return alternatesOf(await allLocations(), key);
}

export async function getLocationPaths() {
  return (await allLocations()).map((location) => ({ params: { lang: location.locale, path: location.path }, props: { location } }));
}

// ---------------------------------------------------------------------------
// Legal pages
// ---------------------------------------------------------------------------
export interface LegalPage {
  key: string;
  locale: Locale;
  slug: string;
  url: string;
  data: CollectionEntry<'legal'>['data'];
  entry: CollectionEntry<'legal'>;
}

function allLegal(): Promise<LegalPage[]> {
  return memo('legal', async () => {
    const entries = await getCollection('legal');
    return entries.map((entry) => {
      const { locale, slug } = splitLocaleId(entry.id);
      return { key: entry.data.translationKey, locale, slug, url: entryPath(locale, 'legal', slug), data: entry.data, entry };
    });
  });
}

export async function getLegalPages(locale: Locale): Promise<LegalPage[]> {
  return (await allLegal()).filter((l) => l.locale === locale);
}

/** URL of a legal page in a locale, falling back to English. */
export async function getLegalUrl(locale: Locale, key: LegalPage['data']['translationKey']): Promise<string> {
  const all = await allLegal();
  return (all.find((l) => l.key === key && l.locale === locale) ?? all.find((l) => l.key === key && l.locale === 'en'))?.url ?? '#';
}

export async function getLegalAlternates(key: string): Promise<AlternateMap> {
  return alternatesOf(await allLegal(), key);
}

export async function getLegalPaths() {
  return (await allLegal()).map((page) => ({ params: { lang: page.locale, slug: page.slug }, props: { page } }));
}

// ---------------------------------------------------------------------------
// Fixed-page copy (home, about, contact, section intros)
// ---------------------------------------------------------------------------
type PageData = CollectionEntry<'pages'>['data'];
export type PageName = PageData['page'];
export type PageCopy<P extends PageName> = P extends 'home' | 'about' | 'contact'
  ? Extract<PageData, { page: P }>
  : Extract<PageData, { page: 'services' | 'products' | 'work' | 'insights' | 'search' }>;

export async function getPageCopy<P extends PageName>(locale: Locale, page: P): Promise<PageCopy<P>> {
  const entries = await memo('pages', () => getCollection('pages'));
  const match = entries.find((e) => e.id === `${locale}/${page}`) ?? entries.find((e) => e.id === `en/${page}`);
  if (!match || match.data.page !== page) {
    throw new Error(`Missing page copy: src/content/pages/${locale}/${page}.json (with "page": "${page}")`);
  }
  return match.data as PageCopy<P>;
}
