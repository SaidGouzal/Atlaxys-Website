# Deployment — DigitalOcean App Platform (Static Site)

The project is a pure static build: `npm run build` writes everything to `dist/`.

## Deploy

1. Edit `.do/app.yaml`: set `github.repo`, the domain(s) and `PUBLIC_CONTACT_ENDPOINT`.
2. `doctl apps create --spec .do/app.yaml` (later: `doctl apps update <APP_ID> --spec .do/app.yaml`),
   or Control Panel → Create App → GitHub repo → Static Site, build command `npm ci && npm run build`,
   output directory `dist`, error document `404.html`.

## Environment variables (all build-time)

| Variable | Purpose |
|---|---|
| `SITE_URL` | Canonical origin (canonical URLs, hreflang, sitemap, OG) |
| `PUBLIC_CONTACT_ENDPOINT` | URL the forms POST JSON to (Formspree, Basin, Web3Forms, a DO Function, an n8n webhook…) |
| `PUBLIC_GA4_ID`, `PUBLIC_GTM_ID`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_LINKEDIN_PARTNER_ID` | Analytics, loaded only after consent |

## Notes

- There is no server: lead capture, rate limiting and delivery must be handled by the external endpoint.
- Static Sites cannot set custom security headers; put a CDN/proxy (e.g. Cloudflare) in front if you need CSP/HSTS.
