# Deployment — DigitalOcean App Platform (Static Site)

The project is a pure static build: `npm run build` writes everything to `dist/`.

## Deploy

1. Edit `.do/app.yaml`: set `github.repo`, the domain(s) and `PUBLIC_CONTACT_ENDPOINT`.
2. `doctl apps create --spec .do/app.yaml` (later: `doctl apps update <APP_ID> --spec .do/app.yaml`),
   or Control Panel → Create App → GitHub repo → Static Site, build command `npm ci && npm run build`,
   output directory `dist`, error document `404.html`. Do **not** set a catch-all document: unknown URLs
   must return 404.
3. Apply the HTTP security headers listed in [SECURITY.md](SECURITY.md) where the site is served.
4. Read the build log: `[launch-check]` lists legal/privacy information still missing.

## Environment variables (all build-time)

| Variable | Purpose |
|---|---|
| `SITE_URL` | Canonical origin (canonical URLs, hreflang, sitemap, OG) |
| `PUBLIC_CONTACT_ENDPOINT` | `https://` URL the forms POST JSON to (Formspree, Basin, Web3Forms, a DO Function, an n8n webhook…). Unset → the form is replaced by email/WhatsApp/phone links. Name the provider in `src/config/privacy.ts`. |
| `PUBLIC_GA4_ID`, `PUBLIC_GTM_ID`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_LINKEDIN_PARTNER_ID` | Analytics/advertising, loaded only after consent. Setting one also: shows the consent banner, allowlists the vendor in the CSP, and adds it to the cookie and privacy policies. Formats are validated at build time. |

## Notes

- There is no server: validation, spam filtering, rate limiting and delivery of form submissions are the
  form provider's job — see the requirements in [SECURITY.md](SECURITY.md#form-endpoint-third-party-what-to-require-from-the-provider).
- Enabling a tracker is a privacy change: re-read the generated cookie/privacy tables on the legal pages
  and have the policies reviewed (see [AUDIT.md](AUDIT.md)).
