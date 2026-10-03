/**
 * Structured data (JSON-LD) builders.
 *
 * Every page emits one `@graph` in which nodes reference each other by `@id`:
 *
 *   Organization ◄── WebSite ◄── WebPage ──► BreadcrumbList
 *        ▲                          │
 *        └──── Service / SoftwareApplication / BlogPosting / FAQPage
 *
 * Rules: only describe what is visible on the page, omit unknown values
 * (no invented addresses, ratings or prices), and keep ids stable.
 */
import { site } from '@/config/site';
import { techStack } from '@/config/technology';
import { localeMeta, locales, type Locale } from '@/i18n/config';
import { absoluteUrl, siteOrigin } from './urls';

export type JsonLdNode = Record<string, unknown>;

export const ids = {
  organization: `${siteOrigin}/#organization`,
  website: `${siteOrigin}/#website`,
  logo: `${siteOrigin}/#logo`,
  webpage: (url: string) => `${absoluteUrl(url)}#webpage`,
  breadcrumb: (url: string) => `${absoluteUrl(url)}#breadcrumb`,
  primary: (url: string, kind: string) => `${absoluteUrl(url)}#${kind}`,
};

const ref = (id: string) => ({ '@id': id });

/** Drop undefined / empty values so the output never contains placeholders. */
function clean<T extends JsonLdNode>(node: T): T {
  return Object.fromEntries(
    Object.entries(node).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)),
  ) as T;
}

export function organizationNode(locale: Locale, description: string): JsonLdNode {
  const sameAs = Object.values(site.social).filter(Boolean);
  const langNames = { en: 'English', fr: 'French', ar: 'Arabic' } as const;
  return clean({
    '@type': ['Organization', 'ProfessionalService'],
    '@id': ids.organization,
    name: site.name,
    alternateName: site.shortName,
    legalName: site.legalName,
    url: `${siteOrigin}/`,
    logo: clean({
      '@type': 'ImageObject',
      '@id': ids.logo,
      url: absoluteUrl(site.logoUrl),
      width: 512,
      height: 512,
      caption: site.name,
    }),
    image: ref(ids.logo),
    description,
    email: site.contact.email,
    telephone: site.contact.phone.replace(/\s+/g, ''),
    foundingDate: site.foundingYear ? String(site.foundingYear) : undefined,
    address: clean({
      '@type': 'PostalAddress',
      addressCountry: site.address.countryCode,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      streetAddress: site.address.streetAddress,
      postalCode: site.address.postalCode,
    }),
    areaServed: site.areaServed.map((name) => ({ '@type': 'Place', name })),
    knowsLanguage: locales.map((l) => localeMeta[l].hreflang),
    knowsAbout: [
      'Software development',
      'Custom software development',
      'Web application development',
      'Mobile application development',
      'AI automation',
      'Business process automation',
      'DevOps',
      'Cloud architecture',
      'Technology consulting',
      ...techStack.flatMap((g) => g.items),
    ],
    contactPoint: [
      clean({
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: site.contact.email,
        telephone: site.contact.phone.replace(/\s+/g, ''),
        availableLanguage: locales.map((l) => langNames[l]),
        areaServed: site.areaServed,
      }),
    ],
    sameAs,
    inLanguage: localeMeta[locale].hreflang,
  });
}

/**
 * No SearchAction: Google retired the sitelinks search box in November 2024,
 * and the site search keeps queries out of URLs (scripts/search.ts).
 */
export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': ids.website,
    url: `${siteOrigin}/`,
    name: site.name,
    inLanguage: locales.map((l) => localeMeta[l].hreflang),
    publisher: ref(ids.organization),
  };
}

export type WebPageType = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'SearchResultsPage' | 'ItemPage';

export function webPageNode(opts: {
  url: string;
  title: string;
  description: string;
  locale: Locale;
  type?: WebPageType;
  hasBreadcrumb?: boolean;
  primaryId?: string;
  image?: string;
  datePublished?: Date;
  dateModified?: Date;
}): JsonLdNode {
  return clean({
    '@type': opts.type ?? 'WebPage',
    '@id': ids.webpage(opts.url),
    url: absoluteUrl(opts.url),
    name: opts.title,
    description: opts.description,
    inLanguage: localeMeta[opts.locale].hreflang,
    isPartOf: ref(ids.website),
    about: ref(ids.organization),
    publisher: ref(ids.organization),
    breadcrumb: opts.hasBreadcrumb ? ref(ids.breadcrumb(opts.url)) : undefined,
    mainEntity: opts.primaryId ? ref(opts.primaryId) : undefined,
    primaryImageOfPage: opts.image ? { '@type': 'ImageObject', url: absoluteUrl(opts.image) } : undefined,
    datePublished: opts.datePublished?.toISOString(),
    dateModified: opts.dateModified?.toISOString(),
  });
}

export interface Crumb {
  name: string;
  url: string;
}

export function breadcrumbNode(pageUrl: string, crumbs: Crumb[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': ids.breadcrumb(pageUrl),
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.url),
    })),
  };
}

export function serviceNode(opts: {
  url: string;
  name: string;
  description: string;
  serviceType: string;
  capabilities: string[];
  locale: Locale;
  /** Defaults to every region in site.areaServed. */
  areaServed?: { '@type': 'Country' | 'City' | 'Place'; name: string }[];
}): JsonLdNode {
  return {
    '@type': 'Service',
    '@id': ids.primary(opts.url, 'service'),
    name: opts.name,
    description: opts.description,
    serviceType: opts.serviceType,
    url: absoluteUrl(opts.url),
    provider: ref(ids.organization),
    areaServed: opts.areaServed ?? site.areaServed.map((name) => ({ '@type': 'Place', name })),
    availableLanguage: locales.map((l) => localeMeta[l].hreflang),
    inLanguage: localeMeta[opts.locale].hreflang,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: opts.name,
      itemListElement: opts.capabilities.map((name) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name },
      })),
    },
  };
}

export function softwareApplicationNode(opts: {
  url: string;
  name: string;
  description: string;
  category: string;
  platforms: string[];
  image?: string;
  offer?: { price: number; currency: string };
  locale: Locale;
}): JsonLdNode {
  return clean({
    '@type': 'SoftwareApplication',
    '@id': ids.primary(opts.url, 'software'),
    name: opts.name,
    description: opts.description,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: opts.category,
    operatingSystem: opts.platforms.join(', '),
    url: absoluteUrl(opts.url),
    image: opts.image ? absoluteUrl(opts.image) : undefined,
    author: ref(ids.organization),
    publisher: ref(ids.organization),
    inLanguage: localeMeta[opts.locale].hreflang,
    offers: opts.offer
      ? { '@type': 'Offer', price: opts.offer.price, priceCurrency: opts.offer.currency, seller: ref(ids.organization) }
      : undefined,
  });
}

export function articleNode(opts: {
  url: string;
  type?: 'BlogPosting' | 'Article';
  headline: string;
  description: string;
  datePublished: Date;
  dateModified?: Date;
  author?: { name: string; url?: string };
  section?: string;
  keywords?: string[];
  image?: string;
  locale: Locale;
  about?: string;
}): JsonLdNode {
  return clean({
    '@type': opts.type ?? 'BlogPosting',
    '@id': ids.primary(opts.url, 'article'),
    headline: opts.headline,
    description: opts.description,
    datePublished: opts.datePublished.toISOString(),
    dateModified: (opts.dateModified ?? opts.datePublished).toISOString(),
    author: opts.author
      ? clean({ '@type': 'Person', name: opts.author.name, url: opts.author.url, worksFor: ref(ids.organization) })
      : ref(ids.organization),
    publisher: ref(ids.organization),
    mainEntityOfPage: ref(ids.webpage(opts.url)),
    isPartOf: ref(ids.website),
    inLanguage: localeMeta[opts.locale].hreflang,
    articleSection: opts.section,
    keywords: opts.keywords?.join(', '),
    image: opts.image ? absoluteUrl(opts.image) : undefined,
    about: opts.about,
  });
}

export function faqNode(url: string, items: { question: string; answer: string }[]): JsonLdNode | undefined {
  if (!items.length) return undefined;
  return {
    '@type': 'FAQPage',
    '@id': ids.primary(url, 'faq'),
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function itemListNode(url: string, items: { name: string; url: string }[]): JsonLdNode | undefined {
  if (!items.length) return undefined;
  return {
    '@type': 'ItemList',
    '@id': ids.primary(url, 'list'),
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.url),
    })),
  };
}

/** Serialise a graph for a <script type="application/ld+json"> block (safe against `</script>` injection). */
export function serializeGraph(nodes: (JsonLdNode | undefined)[]): string {
  const graph = { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
  return JSON.stringify(graph).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
