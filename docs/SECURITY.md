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

**One violation is expected and deliberate.** With the real `gtag.js`, each
GA4 hit (sent to `www.google-analytics.com`, allowed) is followed by a request
to `https://www.google.com/g/collect`, which the CSP blocks. The browser logs
three console messages per hit, only for visitors who accepted analytics. That
request belongs to Google's signals/advertising features. No gtag setting stops
it (five configurations tested on 2 October 2026), so it comes from the GA4
property settings. Do **not** add `www.google.com` to the CSP: the privacy
policy says Google signals are off. Instead, in Google Analytics turn off
Admin → Data collection → Google signals, and check Admin → Product links.

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

1. **App Platform Static Site** — not possible. A Static Site component can
   only set CORS headers (`ingress.rules[].cors`); custom response headers
   need a Service component (checked against the App Platform app-spec
   reference, October 2026). This is why crawlers report the headers above
   as missing on every page.
2. **Cloudflare (or another CDN) in front of the app** — add the headers with a
   "Modify response header" / Transform rule on the zone. Moving the domain's
   DNS to your own Cloudflare zone also fixes the apex redirect (see below)
   and lets a Cache Rule give `/_astro/*` a one-year immutable cache. App
   Platform itself already delivers through Cloudflare; test the proxied
   set-up on a staging hostname first, because certificate issuance and
   double proxying need care.
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
curl -sI https://www.atlaxys.com/en/ | grep -iE 'strict-transport|x-content-type|frame|permissions|referrer|content-security'
```

…and run the site through observatory.mozilla.org and securityheaders.com.

### Live state (checked 2 October 2026)

| Check | Result |
|---|---|
| `https://www.atlaxys.com/en/` | 200; CSP meta present; **no** HSTS, X-Content-Type-Options, frame protection or Permissions-Policy header |
| `http://www.atlaxys.com/…` | 301 to `https://` (good) |
| `https://atlaxys.com/` | **301 to `http://www.atlaxys.com`** by Squarespace domain forwarding: an unencrypted hop, plus a Squarespace `crumb` cookie. Fix in Squarespace Domains (forward to `https://www.atlaxys.com`), or move DNS as in option 2 |
| `https://www.atlaxys.com/` | 200 (client-side redirect page): the `ingress` 301 in `.do/app.yaml` is not applied to the live app |
| Cookies set by the host | `__cf_bm` (Cloudflare bot management, 30 min, HttpOnly), listed in the cookie policy via `src/config/privacy.ts` |
| `/_astro/*` caching | `Cache-Control: public,max-age=10` (host default; option 2 fixes it) |

## Form endpoint (third-party): what to require from the provider

The static site cannot validate, rate-limit or store submissions itself. The
chosen provider must:

- accept only HTTPS, and only `POST` with JSON;
- validate server-side (required fields, lengths, email format) — the
  client-side checks are only for usability;
- filter spam: reject submissions where the `botcheck` honeypot checkbox is
  ticked (Web3Forms does this; the browser script also drops them);
- rate-limit per IP;
- restrict CORS to the site's origin;
- deliver to the team and let you set a retention period / delete
  submissions;
- offer a data-processing agreement and state where data is stored (needed for
  the privacy policy — name it in `src/config/privacy.ts`).

### Web3Forms (the provider in use)

- The access key in `src/config/forms.ts` is public by design: it can only
  send to the inbox registered with it. Anyone can still post to it directly,
  so keep Web3Forms' spam filtering on, and use the dashboard's domain
  restriction if your plan offers it.
- The honeypot is Web3Forms' own `botcheck` checkbox. A free-plan
  `redirect` to `https://www.atlaxys.com/<lang>/contact/thank-you/` serves
  visitors without JavaScript (same domain, as the free plan requires).
- Data sent per enquiry: `name`, `email`, optional `company`, `phone`,
  `country`, `projectType`, `budget`, `timeline`, `message`, plus `locale`,
  `source` (page path), `landing`/`campaign` (campaign page slugs), `subject`,
  `access_key` and, only with marketing consent, `attribution` (utm/gclid/
  fbclid, referring site origin, landing path). Nothing else.
- A reply with `"success": false` (even HTTP 200) shows the error state with
  the direct email and WhatsApp links.
- Web3Forms' legal entity, storage location and retention are not confirmed
  yet (`formProcessor.entity` in `src/config/privacy.ts`, **[legal]**).

## Dependencies

- **Dependencies:** upgraded to Astro 7 / `@astrojs/mdx` 8 on Node ≥ 22.12 (October 2026); `npm audit` reports 0 vulnerabilities.
- Run `npm audit` and `npm outdated` before each release.
