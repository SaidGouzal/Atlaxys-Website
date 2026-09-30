import type { APIRoute } from 'astro';
import { localeStaticPaths, type Locale } from '@/i18n';
import { buildSearchIndex } from '@/lib/content/search';

export const getStaticPaths = localeStaticPaths;

/** Static search index per language: /en/search.json, /fr/search.json, /ar/search.json */
export const GET: APIRoute = async ({ params }) => {
  const items = await buildSearchIndex(params.lang as Locale);
  return new Response(JSON.stringify(items), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
