import type { APIRoute } from 'astro';
import { absoluteUrl } from '@/lib/seo/urls';

/**
 * Search engines and AI assistants are welcome: being understood by answer
 * engines is part of the strategy. Pages that must stay out of results
 * (search, thank-you, noindex landing pages) carry `noindex` instead of a
 * Disallow rule — a crawler has to fetch a page to see its noindex.
 * Legal pages stay crawlable and indexable on purpose.
 */
export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
