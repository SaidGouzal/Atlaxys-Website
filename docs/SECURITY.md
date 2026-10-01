# Security

The site is a pure static build (no server code, no accounts, no database).
Its attack surface is the HTML/JS it ships, the third-party scripts it may
load after consent, and the external form endpoint.

## What the build enforces

| Control | Where | Notes |
|---|---|---|
| Content-Security-Policy (`<meta http-equiv>`) | `integrations/csp.mjs`, injected into every HTML page after the build | Per-page SHA-256 hashes for inline scripts; no `'unsafe-inline'` / `'unsafe-eval'` for scripts |
| Referrer-Policy `strict-origin-when-cross-origin` | `<meta name="referrer">` in `BaseLayout.astro` and `pages/index.astro` | Other sites only see our origin, never full URLs |
| Validated public values | `astro.config.mjs` | Analytics IDs must match strict patterns; `PUBLIC_CONTACT_ENDPOINT` must be an `https://` URL — anything else fails the build |
| Third-party code only after consent | `scripts/analytics/consent.ts` + `vendors.ts` | And only for vendors whose ID is configured (also the only hosts the CSP allows) |
| No secrets in the repository or bundle | — | The only environment values are public IDs and the form URL |
| No source maps in `dist/` | Astro default | Verified in the audit |
| No `generator` meta | `BaseLayout.astro` | Framework version is not advertised |
| Patched image toolchain | `package.json` → `overrides.astro.sharp` | Forces Astro to use the patched `sharp` (libvips/libheif advisories) |

### CSP: the policy and its exceptions

```
default-src 'self';
script-src 'self' 'sha256-…' [vendor hosts, only if configured];
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: [vendor hosts];
font-src 'self';
connect-src 'self' [form endpoint origin] [vendor hosts];
media-src 'self'; manifest-src 'self'; worker-src 'self';
frame-src 'none'; object-src 'none'; base-uri 'self';
form-action 'self' [form endpoint origin];
upgrade-insecure-requests
```

Documented exceptions:

| Exception | Why | Risk |
|---|---|---|
| `style-src 'unsafe-inline'` | Components set CSS custom properties in `style=""` attributes (`--i`, `--w`, `--aspect`…) and Astro inlines small stylesheets. A style hash would disable `'unsafe-inline'` and break them. | Low: CSS cannot run script; script injection is still blocked by the hash-only `script-src`. |
| `img-src data: blob:` | Inline SVG data URIs in CSS; Three.js textures | Low |
| GSAP / Three.js | None needed: both are bundled and served from `'self'`; neither uses `eval`. WebGL needs no CSP exception. | — |
| Fonts | None: self-hosted via `@fontsource-variable` | — |
| Google Analytics 4 / Tag Manager | `https://www.googletagmanager.com`, `https://*.google-analytics.com`, `https://*.analytics.google.com` | Only when `PUBLIC_GA4_ID` / `PUBLIC_GTM_ID` is set. **GTM custom-HTML tags and custom JavaScript variables will be blocked** (they need `'unsafe-inline'`/`'unsafe-eval'`); that is deliberate — prefer GA4 directly, or keep the container to built-in Google tags. |
| Meta Pixel | `https://connect.facebook.net`, `https://www.facebook.com` | Only when `PUBLIC_META_PIXEL_ID` is set |
| LinkedIn Insight Tag | `https://snap.licdn.com`, `https://px.ads.linkedin.com` | Only when `PUBLIC_LINKEDIN_PARTNER_ID` is set |
| Contact form | The origin of `PUBLIC_CONTACT_ENDPOINT` in `connect-src` and `form-action` | Only that origin |

When enabling a vendor, open the browser console on a few pages after
accepting cookies: any blocked request is reported as a CSP violation. Fix it
by adding the specific host in `integrations/csp.mjs` — never a wildcard
scheme such as `https:` or `*`.

## What must be set where the site is served (not possible from HTML)

A `<meta>` CSP cannot carry `frame-ancestors`, and these protections only
exist as HTTP response headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
Cross-Origin-Opener-Policy: same-origin
```

Cache headers (recommended): `/_astro/*` → `public, max-age=31536000, immutable`;
HTML → `public, max-age=0, must-revalidate`.

Options:

1. **App Platform** — check the current DigitalOcean documentation for
   response-header support on Static Sites (it could not be verified from the
   audit environment). If supported, add the headers above to the app spec.
2. **Cloudflare (or another CDN) in front of the app** — add the headers with a
   "Modify response header" / Transform rule on the zone.
3. **Switch the component to a Web Service** (a tiny Node/Caddy/nginx server
   that serves `dist/` with the headers). More moving parts; only if 1 and 2
   are not possible.

Keep the header CSP to `frame-ancestors` only: when a page has both a header
and a meta policy, browsers enforce both, so duplicating `script-src` there
would just create a second list to keep in sync.

Add `preload` to HSTS only after confirming every subdomain of the domain is
served over HTTPS, and submit at hstspreload.org.

Verify after deploying:

```
curl -sI https://atlaxys.com/en/ | grep -iE 'strict-transport|x-content-type|frame|permissions|referrer|content-security'
```

…and run the site through observatory.mozilla.org and securityheaders.com.

## Form endpoint (third-party): what to require from the provider

The static site cannot validate, rate-limit or store submissions itself. The
chosen provider must:

- accept only HTTPS, and only `POST` with JSON;
- validate server-side (required fields, lengths, email format) — the
  client-side checks are only for usability;
- filter spam: reject submissions where the `website` honeypot field is not
  empty, and treat a `startedAt` less than ~2.5 s before submission as a bot;
- rate-limit per IP;
- restrict CORS to the site's origin;
- deliver to the team and let you set a retention period / delete
  submissions;
- offer a data-processing agreement and state where data is stored (needed for
  the privacy policy — name it in `src/config/privacy.ts`).

## Dependencies

- `npm audit` (October 2026): the remaining advisories are in **Astro 5.18.2**
  (the last 5.x release; fixes exist only in Astro ≥ 7.2.8) and in Astro's
  bundled `esbuild` (Windows dev-server only). Most of the Astro advisories
  concern server rendering (SSR), server islands or the dev server, which this
  static build does not use; the image-optimisation one requires a malicious
  image in the repository. They are not exploitable by visitors of the static
  site, but **upgrading to Astro 7 on Node 22 LTS is recommended** — Node 20,
  which the project currently targets, reached end of life in April 2026.
- Run `npm audit` and `npm outdated` before each release.
