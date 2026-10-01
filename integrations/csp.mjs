/**
 * Content-Security-Policy for the static build.
 *
 * App Platform Static Sites serve files as they are, so the policy is
 * delivered as a <meta http-equiv="Content-Security-Policy"> tag injected
 * into every built HTML page, right after <meta charset>. For each page:
 *
 *   • script-src lists 'self' plus the SHA-256 hash of every inline script on
 *     that page (no 'unsafe-inline', no 'unsafe-eval');
 *   • third-party hosts are added ONLY for analytics/marketing vendors whose ID
 *     is configured at build time — an unconfigured vendor is not allowlisted;
 *   • the contact form may only post to this origin and the configured
 *     PUBLIC_CONTACT_ENDPOINT origin.
 *
 * Header-only directives (frame-ancestors, HSTS, X-Content-Type-Options,
 * Permissions-Policy) cannot be set from a meta tag — see docs/SECURITY.md.
 *
 * Keep VENDOR_SOURCES in sync with src/scripts/analytics/vendors.ts.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Hosts each vendor needs, from the vendors' published CSP guidance. */
const GOOGLE = {
  script: ['https://www.googletagmanager.com'],
  connect: ['https://www.googletagmanager.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com'],
  img: ['https://www.googletagmanager.com', 'https://*.google-analytics.com'],
};
export const VENDOR_SOURCES = {
  ga4: GOOGLE,
  gtm: GOOGLE,
  metaPixel: {
    script: ['https://connect.facebook.net'],
    connect: ['https://connect.facebook.net', 'https://www.facebook.com'],
    img: ['https://www.facebook.com'],
  },
  linkedIn: {
    script: ['https://snap.licdn.com'],
    connect: ['https://px.ads.linkedin.com'],
    img: ['https://px.ads.linkedin.com'],
  },
};

const INLINE_SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const DATA_BLOCK = /\btype\s*=\s*["']?application\/(ld\+)?json/i;

function hashesOf(html) {
  const hashes = new Set();
  for (const [, attrs, body] of html.matchAll(INLINE_SCRIPT)) {
    if (/\bsrc\s*=/i.test(attrs) || DATA_BLOCK.test(attrs) || !body) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  return [...hashes];
}

function originOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.origin : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ vendors: Record<string, string | undefined>, contactEndpoint?: string }} options
 */
export function buildPolicy({ vendors, contactEndpoint }, scriptHashes = []) {
  const active = Object.entries(VENDOR_SOURCES)
    .filter(([key]) => Boolean(vendors[key]))
    .map(([, sources]) => sources);
  const pick = (kind) => [...new Set(active.flatMap((s) => s[kind] ?? []))];
  const formOrigin = contactEndpoint ? originOf(contactEndpoint) : null;

  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...scriptHashes, ...pick('script')],
    // Inline style attributes (custom properties such as --i) and Astro's
    // scoped styles need 'unsafe-inline'; CSS cannot execute script.
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', ...pick('img')],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(formOrigin ? [formOrigin] : []), ...pick('connect')],
    'media-src': ["'self'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'", ...(formOrigin ? [formOrigin] : [])],
    'upgrade-insecure-requests': [],
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(' '))
    .join('; ');
}

async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return htmlFiles(full);
      return e.name.endsWith('.html') ? [full] : [];
    }),
  );
  return nested.flat();
}

const escapeAttr = (value) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * @param {{ vendors: Record<string, string | undefined>, contactEndpoint?: string }} options
 * @returns {import('astro').AstroIntegration}
 */
export default function csp(options) {
  return {
    name: 'atlaxys:csp',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const files = await htmlFiles(fileURLToPath(dir));
        let count = 0;
        for (const file of files) {
          const html = await readFile(file, 'utf8');
          if (html.includes('http-equiv="Content-Security-Policy"')) continue;
          const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttr(buildPolicy(options, hashesOf(html)))}">`;
          const charset = html.match(/<meta charset="?utf-8"?\s*\/?>/i);
          const next = charset
            ? html.replace(charset[0], `${charset[0]}${meta}`)
            : html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}${meta}`);
          if (next === html) {
            logger.warn(`No <head> found, CSP not injected: ${path.relative(process.cwd(), file)}`);
            continue;
          }
          await writeFile(file, next);
          count++;
        }
        logger.info(`Content-Security-Policy injected into ${count} pages.`);
      },
    },
  };
}
