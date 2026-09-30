// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

/**
 * Deployment modes
 * ----------------
 * default          Every page is prerendered to static HTML. A tiny Node server
 *                  (see /server/start.mjs) serves them and runs one on-demand
 *                  route: POST /api/contact/ (lead capture). Deploy as a
 *                  DigitalOcean App Platform *Web Service*.
 * OUTPUT=static    Pure static build (no server at all). Deploy as an App
 *                  Platform *Static Site*; set PUBLIC_CONTACT_ENDPOINT to an
 *                  external form endpoint. See docs/DEPLOYMENT.md.
 */
const STATIC_ONLY = process.env.OUTPUT === 'static';

/** Canonical origin used for canonical URLs, hreflang, sitemap and Open Graph. */
const SITE_URL = process.env.SITE_URL || 'https://atlaxys.com';

/** Injects the lead-capture endpoint only when a server runtime exists. */
function leadEndpoint() {
  return {
    name: 'atlaxys:lead-endpoint',
    hooks: {
      /** @param {{ injectRoute: (route: { pattern: string; entrypoint: string; prerender?: boolean }) => void }} options */
      'astro:config:setup': ({ injectRoute }) => {
        injectRoute({
          pattern: '/api/contact',
          entrypoint: './src/server/contact-endpoint.ts',
          prerender: false,
        });
      },
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  output: 'static',
  adapter: STATIC_ONLY ? undefined : node({ mode: 'standalone' }),
  integrations: [mdx(), !STATIC_ONLY && leadEndpoint()],

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

  security: {
    checkOrigin: true,
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

      // ---- Server only (never shipped to the browser) ----
      LEAD_EMAIL_TO: envField.string({ context: 'server', access: 'public', optional: true }),
      LEAD_EMAIL_FROM: envField.string({ context: 'server', access: 'public', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      LEAD_WEBHOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      LEAD_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },

  vite: {
    build: {
      // three.js is loaded on demand only; keep the warning meaningful.
      chunkSizeWarningLimit: 700,
    },
  },
});
