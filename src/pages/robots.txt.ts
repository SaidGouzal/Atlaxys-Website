import type { APIRoute } from 'astro';
import { absoluteUrl } from '@/lib/seo/urls';

/**
 * Search engines and AI assistants are welcome: being understood by answer
 * engines is part of the strategy. Only technical endpoints are excluded.
 */
export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /*/contact/thank-you/
Disallow: /*/search/

Sitemap: ${absoluteUrl('/sitemap.xml')}
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
