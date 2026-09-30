import type { APIRoute } from 'astro';
import { site } from '@/config/site';

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: site.name,
      short_name: site.shortName,
      start_url: '/',
      display: 'standalone',
      background_color: site.brand.ink,
      theme_color: site.brand.ink,
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }),
    { headers: { 'content-type': 'application/manifest+json; charset=utf-8' } },
  );
