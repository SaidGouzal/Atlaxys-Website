# Deployment — DigitalOcean App Platform

## Option A (recommended): one Web Service

Prerendered pages **plus** the `/api/contact/` lead endpoint, served by
`server/start.mjs` with security and cache headers. Cost: the smallest App
Platform instance.

| Setting | Value |
|---|---|
| Component type | Web Service |
| Source | GitHub repository, branch `main`, autodeploy on push |
| Environment | Node.js (buildpack) |
| Node version | from `package.json` → `"engines": { "node": ">=22.12.0" }` |
| Build command | `npm ci && npm run build` |
| Run command | `npm start` |
| HTTP port | `8080` (the server also honours `$PORT`) |
| Health check | HTTP `GET /healthz` |
| Instance | `apps-s-1vcpu-0.5gb` (scale up if needed) |
| Region | `fra` (Frankfurt) — closest to Morocco and Western Europe |

### Steps

1. Push the project to a GitHub repository.
2. Edit `.do/app.yaml`: set `github.repo` and your domain(s).
3. Create the app:
   - **CLI:** `doctl apps create --spec .do/app.yaml`
   - **Control panel:** Apps → Create App → GitHub → pick the repo → on the
     review screen choose *Edit App Spec* and paste `.do/app.yaml`.
4. In the component's **Environment Variables**, fill the secrets
   (`RESEND_API_KEY`, `LEAD_WEBHOOK_URL`, …) and mark them *Encrypted*.
5. **Domains:** add `atlaxys.com` (and `www`), then point DNS to
   DigitalOcean (or add the CNAME/A records App Platform shows). TLS
   certificates are issued automatically.
6. Deploy. Check `https://your-domain/healthz` returns `ok`, submit a test
   lead, and verify it arrives by email/webhook.

### Environment variables

| Variable | Scope | Required | Notes |
|---|---|---|---|
| `SITE_URL` | build + run | yes | `https://atlaxys.com` — canonical URLs, sitemap, hreflang |
| `NODE_ENV` | build + run | yes | `production` |
| `LEAD_EMAIL_TO` | run | one channel | inbox for leads (comma-separate several) |
| `LEAD_EMAIL_FROM` | run | with email | verified sender, e.g. `Atlaxys Website <website@atlaxys.com>` |
| `RESEND_API_KEY` | run, secret | with email | from resend.com (verify your domain there) |
| `LEAD_WEBHOOK_URL` | run, secret | one channel | n8n / Make / Zapier / CRM webhook (JSON POST) |
| `LEAD_WEBHOOK_SECRET` | run, secret | no | adds `x-atlaxys-signature` (HMAC-SHA256 of the body) |
| `PUBLIC_GA4_ID` | build | no | `G-XXXXXXX` |
| `PUBLIC_GTM_ID` | build | no | `GTM-XXXXXXX` |
| `PUBLIC_META_PIXEL_ID` | build | no | numeric ID |
| `PUBLIC_LINKEDIN_PARTNER_ID` | build | no | numeric ID |
| `PUBLIC_CONTACT_ENDPOINT` | build | no | leave empty to use `/api/contact/` |

`PUBLIC_*` values are inlined into the pages at build time — change them,
then redeploy. Secrets never reach the browser.

If no lead channel is configured, the form answers with an error that
invites visitors to email or WhatsApp instead, and the lead is written to the
runtime logs (App → Runtime Logs) so it is not lost.

## Option B: pure static site (no server, no running cost)

1. Choose a form service that accepts JSON POSTs (Formspree, Basin,
   Web3Forms, a DigitalOcean Function, an n8n webhook…).
2. Edit `.do/app.static.yaml` (repo, domain, `PUBLIC_CONTACT_ENDPOINT`).
3. `doctl apps create --spec .do/app.static.yaml`.

| Setting | Value |
|---|---|
| Component type | Static Site |
| Build command | `npm ci && npm run build:static` |
| Output directory | `dist` |
| Error / catch-all document | `404.html` |

Trade-offs: no custom security headers (App Platform static sites don't allow
them), no built-in rate limiting, and lead handling depends on the third-party
endpoint.

## Caching

- `/_astro/*` (hashed JS/CSS/fonts/images): `public, max-age=31536000, immutable`.
- Images/icons in `/public`: 7 days.
- HTML: `max-age=0, must-revalidate` (always fresh after a deploy).
- `/api/*`: `no-store`.

App Platform's CDN handles compression (Brotli/gzip) and TLS.

## Local production test

```bash
npm run build
npm start            # http://localhost:8080
curl -i http://localhost:8080/healthz
```

## Operations

- **Logs:** App → Runtime Logs (lead delivery errors are logged with `[lead]`).
- **Rollback:** App → Deployments → pick a previous deployment → Rollback.
- **Scaling:** more instances are fine for pages; if you run more than one,
  move the rate limiter (`src/server/rate-limit.ts`) to Redis/Valkey.
- **Updates:** `npm outdated`, then update Astro/GSAP/Three and run
  `npm run check && npm run build` before deploying.
