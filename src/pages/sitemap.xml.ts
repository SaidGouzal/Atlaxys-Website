/**
 * XML sitemap with hreflang alternates, generated from the content layer.
 * Only indexable pages are listed (noindex pages, campaign landing pages
 * with noindex, search and thank-you pages are excluded automatically).
 */
import type { APIRoute } from 'astro';
import { localeMeta, locales, type Locale } from '@/i18n/config';
import { mirroredAlternates } from '@/i18n/paths';
import {
  getCaseStudies,
  getCaseStudyAlternates,
  getIndustries,
  getLandingAlternates,
  getLandingPages,
  getLegalAlternates,
  getLegalPages,
  getLocationAlternates,
  getLocations,
  getPostAlternates,
  getPosts,
  getProducts,
  getServiceAlternates,
  getServices,
  type AlternateMap,
} from '@/lib/content';
import { absoluteUrl } from '@/lib/seo/urls';

interface UrlEntry {
  loc: string;
  lastmod?: Date;
  alternates: AlternateMap;
}

const STATIC_PATHS = ['/', '/about/', '/services/', '/products/', '/work/', '/insights/', '/contact/'];

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const GET: APIRoute = async () => {
  const entries: UrlEntry[] = [];

  const hasWork = Object.fromEntries(
    await Promise.all(locales.map(async (l) => [l, (await getCaseStudies(l)).length > 0] as const)),
  ) as Record<Locale, boolean>;

  // No lastmod for these: they have no modification date of their own, and
  // stamping every deploy's date on them teaches crawlers to ignore lastmod.
  for (const path of STATIC_PATHS) {
    const alternates = mirroredAlternates(path);
    for (const l of locales) {
      if (path === '/work/' && !hasWork[l]) continue;
      entries.push({ loc: alternates[l], alternates });
    }
  }

  for (const locale of locales) {
    const [services, products, caseStudies, posts, locations, legal, industries, landings] = await Promise.all([
      getServices(locale),
      getProducts(locale),
      getCaseStudies(locale),
      getPosts(locale),
      getLocations(locale),
      getLegalPages(locale),
      getIndustries(locale),
      getLandingPages(locale),
    ]);

    for (const s of services.filter((s) => !s.data.seo.noindex)) {
      entries.push({ loc: s.url, lastmod: s.data.updatedAt, alternates: await getServiceAlternates(s.key) });
    }
    for (const p of products) {
      entries.push({
        loc: p.url,
        lastmod: p.updatedAt,
        alternates: Object.fromEntries(locales.map((l) => [l, `/${l}/products/${p.slug}/`])) as AlternateMap,
      });
    }
    for (const c of caseStudies.filter((c) => !c.data.seo.noindex)) {
      entries.push({ loc: c.url, lastmod: c.data.publishedAt, alternates: await getCaseStudyAlternates(c.key) });
    }
    for (const p of posts.filter((p) => !p.data.seo.noindex)) {
      entries.push({ loc: p.url, lastmod: p.data.updatedAt ?? p.data.publishedAt, alternates: await getPostAlternates(p.key) });
    }
    for (const l of locations.filter((l) => !l.data.seo.noindex)) {
      entries.push({ loc: l.url, lastmod: l.data.updatedAt, alternates: await getLocationAlternates(l.key) });
    }
    for (const g of legal) {
      entries.push({ loc: g.url, lastmod: g.data.updatedAt, alternates: await getLegalAlternates(g.key) });
    }
    for (const i of industries.filter((i) => i.url)) {
      entries.push({ loc: i.url!, alternates: { [locale]: i.url! } });
    }
    for (const lp of landings.filter((lp) => !lp.data.seo.noindex)) {
      entries.push({ loc: lp.url, alternates: await getLandingAlternates(lp.key) });
    }
  }

  const body = entries
    .map((e) => {
      const alts = Object.entries(e.alternates) as [Locale, string][];
      const links =
        alts.length > 1
          ? [
              ...alts.map(([l, href]) => `    <xhtml:link rel="alternate" hreflang="${localeMeta[l].hreflang}" href="${xmlEscape(absoluteUrl(href))}"/>`),
              ...(e.alternates.en ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(absoluteUrl(e.alternates.en))}"/>`] : []),
            ].join('\n')
          : '';
      return [
        '  <url>',
        `    <loc>${xmlEscape(absoluteUrl(e.loc))}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>` : '',
        links,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
