// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';

/**
 * Pure static build: `npm run build` writes plain HTML/CSS/JS to `dist/`.
 * Deploy as a DigitalOcean App Platform *Static Site* (see .do/app.yaml and
 * docs/DEPLOYMENT.md). Forms POST JSON to PUBLIC_CONTACT_ENDPOINT.
 */

/** Canonical origin used for canonical URLs, hreflang, sitemap and Open Graph. */
const SITE_URL = process.env.SITE_URL || 'https://atlaxys.com';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  output: 'static',
  integrations: [mdx()],

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
