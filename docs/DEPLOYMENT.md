# Deployment — DigitalOcean App Platform (Static Site)

The project is a pure static build: `npm run build` writes everything to `dist/`.

## Deploy

1. Edit `.do/app.yaml`: set `github.repo`, the domain(s) and `PUBLIC_CONTACT_ENDPOINT`.
2. `doctl apps create --spec .do/app.yaml` (later: `doctl apps update <APP_ID> --spec .do/app.yaml`),
   or Control Panel → Create App → GitHub repo → Static Site, build command `npm ci && npm run build`,
   output directory `dist`, error document `404.html`. Do **not** set a catch-all document: unknown URLs
   must return 404.
3. Apply the HTTP security headers listed in [SECURITY.md](SECURITY.md) where the site is served.
   A Static Site component cannot set them itself (see SECURITY.md for the options).
4. If the app was created in the Control Panel, `.do/app.yaml` is not read automatically: copy its
   `disable_email_obfuscation` and `ingress` blocks into the app's spec (Settings → App Spec → Edit)
   or run `doctl apps update <APP_ID> --spec .do/app.yaml`. They turn off email obfuscation (crawlers
   report its `/cdn-cgi/l/email-protection` links as broken) and answer `/` with a 301 to `/en/`.
5. Read the build log: `[launch-check]` lists legal/privacy information still missing.

## Environment variables (all build-time)

| Variable | Purpose |
|---|---|
| `SITE_URL` | Canonical origin (canonical URLs, hreflang, sitemap, OG). Must be the origin that answers 200 — `https://www.atlaxys.com` — never a host that redirects, or every canonical and hreflang URL is reported as non-indexable. |
| `PUBLIC_CONTACT_ENDPOINT` | `https://` URL the forms POST JSON to (Formspree, Basin, Web3Forms, a DO Function, an n8n webhook…). Unset → the form is replaced by email/WhatsApp/phone links. Name the provider in `src/config/privacy.ts`. |
| `PUBLIC_GA4_ID`, `PUBLIC_GTM_ID`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_LINKEDIN_PARTNER_ID` | Analytics/advertising, loaded only after consent. Setting one also: shows the consent banner, allowlists the vendor in the CSP, and adds it to the cookie and privacy policies. Formats are validated at build time. |

## Notes

- There is no server: validation, spam filtering, rate limiting and delivery of form submissions are the
  form provider's job — see the requirements in [SECURITY.md](SECURITY.md#form-endpoint-third-party-what-to-require-from-the-provider).
- Enabling a tracker is a privacy change: re-read the generated cookie/privacy tables on the legal pages
  and have the policies reviewed (see [AUDIT.md](AUDIT.md)).

## Domain, redirects and Search Console

Checked on the live site on 2 October 2026 (details in [PRODUCTION-AUDIT.md](PRODUCTION-AUDIT.md)):

1. **Apex domain.** `atlaxys.com` is forwarded by Squarespace Domains to `http://www.atlaxys.com`
   (plain HTTP). Change the forwarding destination to `https://www.atlaxys.com` (301), or move DNS
   to a provider that can serve the apex (DigitalOcean DNS, Cloudflare).
2. **Root redirect.** Apply `.do/app.yaml` to the live app (step 4 above): today `/` answers 200
   with a client-side redirect instead of a 301 to `/en/`.
3. **Security headers and asset caching** need a layer in front of the static site (SECURITY.md,
   option 2).
4. **Google Analytics** (property `G-9LD8TLNH9K`): turn Google signals off, check product links,
   keep data retention at 14 months or less, keep data redaction (email, `q`) on. The privacy
   policy describes this configuration.
5. **Google Search Console:** add a *Domain* property for `atlaxys.com` (DNS TXT verification at
   the DNS provider), submit `https://www.atlaxys.com/sitemap.xml`, then use URL Inspection on
   `/en/`, `/fr/`, `/ar/` and one service page. No verification code is stored in this repository
   (`site.verification` in `src/config/site.ts` is where an HTML-tag code would go).
