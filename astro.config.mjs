// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import csp from './integrations/csp.mjs';
import rehypeTableScroll from './integrations/rehype-table-scroll.mjs';

/**
 * Pure static build: `npm run build` writes plain HTML/CSS/JS to `dist/`.
 * Deploy as a DigitalOcean App Platform *Static Site* (see .do/app.yaml and
 * docs/DEPLOYMENT.md). Forms POST JSON to PUBLIC_CONTACT_ENDPOINT.
 */

// Make values from a local .env file visible here too (Node ≥ 20.12).
try {
  process.loadEnvFile?.();
} catch {
  /* no .env file — rely on the real environment */
}

/**
 * Production Google Analytics 4 measurement ID (public by design). Used when
 * the hosting environment does not set PUBLIC_GA4_ID, so the build does not
 * depend on the App Platform dashboard. Still loaded only after consent.
 */
process.env.PUBLIC_GA4_ID ||= 'G-9LD8TLNH9K';

/**
 * Canonical origin used for canonical URLs, hreflang, sitemap and Open Graph.
 * It must be the exact origin that answers 200: the site is served on
 * www.atlaxys.com (the apex atlaxys.com only redirects), so canonicals and
 * hreflang pointing at the apex would all land on redirects.
 */
const SITE_URL = process.env.SITE_URL || 'https://www.atlaxys.com';

/**
 * Build-time public values. They are inlined into HTML/JS, so each one is
 * validated against a strict pattern: a malformed or hostile value fails the
 * build instead of reaching visitors.
 */
const PUBLIC_PATTERNS = {
  PUBLIC_GA4_ID: /^G-[A-Z0-9]{4,20}$/,
  PUBLIC_GTM_ID: /^GTM-[A-Z0-9]{4,12}$/,
  PUBLIC_META_PIXEL_ID: /^\d{6,20}$/,
  PUBLIC_LINKEDIN_PARTNER_ID: /^\d{3,12}$/,
};
for (const [key, pattern] of Object.entries(PUBLIC_PATTERNS)) {
  const value = process.env[key];
  if (value && !pattern.test(value)) throw new Error(`${key} has an unexpected format: "${value}"`);
}
const CONTACT_ENDPOINT = process.env.PUBLIC_CONTACT_ENDPOINT || '';
if (CONTACT_ENDPOINT) {
  let url;
  try {
    url = new URL(CONTACT_ENDPOINT);
  } catch {
    throw new Error(`PUBLIC_CONTACT_ENDPOINT is not a valid URL: "${CONTACT_ENDPOINT}"`);
  }
  if (url.protocol !== 'https:') throw new Error('PUBLIC_CONTACT_ENDPOINT must use https://');
}

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    mdx(),
    csp({
      contactEndpoint: CONTACT_ENDPOINT,
      vendors: {
        ga4: process.env.PUBLIC_GA4_ID,
        gtm: process.env.PUBLIC_GTM_ID,
        metaPixel: process.env.PUBLIC_META_PIXEL_ID,
        linkedIn: process.env.PUBLIC_LINKEDIN_PARTNER_ID,
      },
    }),
  ],

  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  // Prefetch on hover/focus only — no speculative bandwidth on mobile data.
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },

  image: {
    // Remote images are not used; add domains here if a CMS is introduced.
    domains: [],
  },

  markdown: {
    // Tables scroll inside a focusable region on narrow screens (also applies to MDX).
    processor: unified({ rehypePlugins: [rehypeTableScroll] }),
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: false,
    },
  },

  devToolbar: {
    enabled: false,
  },

  env: {
    schema: {
      // ---- Public (inlined into the client bundle at build time) ----
      PUBLIC_CONTACT_ENDPOINT: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GA4_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GTM_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_META_PIXEL_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_LINKEDIN_PARTNER_ID: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },

  vite: {
    build: {
      // three.js is loaded on demand only; keep the warning meaningful.
      chunkSizeWarningLimit: 700,
    },
  },
});
