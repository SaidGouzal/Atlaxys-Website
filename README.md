# Atlaxys Consulting — website

The official website of **Atlaxys Consulting**: a technology consultancy and
software engineering studio based in Morocco, working worldwide.

Built with **Astro 7 + TypeScript**, GSAP, and Three.js where it earns its place.
It ships in **English, French and Arabic (RTL)**, and its content is fully
driven by Markdown/JSON files. Deployment targets **DigitalOcean App Platform**.

| | |
|---|---|
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Design system | [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) |
| Adding & editing content | [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md) |
| SEO / AEO strategy | [docs/SEO-STRATEGY.md](docs/SEO-STRATEGY.md) |
| Deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Security (CSP, headers) | [docs/SECURITY.md](docs/SECURITY.md) |
| Accessibility / privacy / security audit | [docs/AUDIT.md](docs/AUDIT.md) |
| Quality audit | [docs/QUALITY-AUDIT.md](docs/QUALITY-AUDIT.md) |

---

## Requirements

- **Node.js 20.3 or newer** (`.nvmrc` pins the version).
  - Windows: install from nodejs.org or use `nvm-windows`, then `nvm use 22`.
  - macOS/Linux: `nvm install && nvm use`.
- npm 10+

## Development

```bash
npm install
npm run dev
```

Open http://localhost:4321 — you are redirected to `/en/` (or `/fr/`, `/ar/`
based on your browser language).

## Build

```bash
npm run build
```

Generates a fully static site in `dist/` (plain HTML/CSS/JS, no server).

## Preview the production build

```bash
npm run preview
```

Serves `dist/` on http://localhost:4321.

Other scripts:

| Command | What it does |
|---|---|
| `npm run check` | Type-checks `.astro` and `.ts` files (0 errors expected) |
| `npm run brand:assets` | Regenerates favicons, PWA icons, transparent logo and OG image from `src/assets/brand/source/` |

---

## Project structure

```text
.do/                      DigitalOcean App Platform spec (Static Site)
integrations/csp.mjs      Build step: Content-Security-Policy meta tag per page
docs/                     Architecture, design system, content guide, SEO, deployment, audit
public/                   Favicons, icons, brand files, default social image
scripts/brand-assets.mjs  Logo → favicon / OG image pipeline
scripts/audit/            Accessibility, consent, CSP and reflow regression tests (see docs/AUDIT.md)
src/
  assets/brand/           Official logo files (source/) + derived transparent versions
  components/
    cards/                CaseCard, ProductCard, PostRow
    forms/                LeadForm (contact + landing variants)
    home/                 Hero, SignalField (SVG + WebGL), Statement, Process
    layout/               Header, MegaMenu, MobileNav, Footer, LanguageSwitcher, Logo,
                          WhatsAppFloat, ConsentBanner, FontFaces, Landing header/footer
    sections/             PageHero, ServiceIndex, TechStack, FAQ, CTABlock, RelatedContent,
                          ArchitectureDiagram, BlueprintCover, IndustryGrid, Principles
    seo/                  SEOHead, OpenGraph, TwitterCard, Schema, Breadcrumbs
    ui/                   Button, Icon, Section, SectionHeader, SignalRule, Tag, Card,
                          Container, Accordion, Modal, MediaFrame, Img, Video,
                          AnimatedText, SpecList, EmptyState, DemoNotice
  config/                 site.ts (company, contact, WhatsApp, social), analytics.ts,
                          navigation.ts, forms.ts, technology.ts
  content/                All content (see "Content" below)
  content.config.ts       Content schemas (validated at build time)
  i18n/                   Locales, URL helpers, UI dictionaries (en/fr/ar)
  layouts/BaseLayout.astro
  lib/
    content/              Content repository (the only code that reads collections),
                          related-content engine, search index builder
    seo/                  JSON-LD graph builders, meta helpers, breadcrumbs
    signal/routing.ts     Circuit-trace generator for the hero visual
  pages/
    [lang]/               Every page, generated per language
    index.astro           Language redirect
    404.astro, sitemap.xml.ts, robots.txt.ts, llms.txt.ts, manifest.webmanifest.ts
  scripts/                Client code: header, motion (reveal + GSAP), hero (Three.js),
                          forms, analytics & consent, search
  styles/                 tokens.css (design tokens), base, layout, typography, motion, prose
```

## Pages (per language)

| Route | Source |
|---|---|
| `/{lang}/` | `src/content/pages/{lang}/home.json` + live content |
| `/{lang}/about/` | `pages/{lang}/about.json` |
| `/{lang}/services/` and `/{lang}/services/{slug}/` | `src/content/services/{lang}/*.md` |
| `/{lang}/products/` and `/{lang}/products/{slug}/` | `src/content/products/*.json` |
| `/{lang}/work/` and `/{lang}/work/{slug}/` | `src/content/case-studies/{lang}/*.md` |
| `/{lang}/insights/` and `/{lang}/insights/{slug}/` | `src/content/blog/{lang}/*.md(x)` |
| `/{lang}/locations/{path}/` | `src/content/locations/{lang}/*.md` (Morocco page) |
| `/{lang}/landing/{slug}/` | `src/content/landing-pages/{lang}/*.json` |
| `/{lang}/contact/` (+ `/thank-you/`) | `pages/{lang}/contact.json` |
| `/{lang}/legal/{slug}/` | `src/content/legal/{lang}/*.md` |
| `/{lang}/search/` | client search over `/{lang}/search.json` |
| `/{lang}/industries/{slug}/` | only for industries with `"publishPage": true` |

---

## Content — adding things without touching code

Full instructions with examples: **[docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md)**.
The short version:

### Add a product
1. Copy `src/content/products/nexus-gym.json` to `src/content/products/<slug>.json`
   (the file name becomes the URL: `/en/products/<slug>/`).
2. Edit the fields. Text can be a plain string (all languages) or
   `{ "en": "…", "fr": "…", "ar": "…" }`.
3. Optional screenshots: put images next to the JSON (e.g. `src/content/products/images/`)
   and reference them: `"cover": { "src": "./images/x.png", "alt": "…" }`.
4. Save. The product appears on the products page, the home page, the footer,
   search, the sitemap, `llms.txt` and in related content automatically.

### Add a blog post
1. Create `src/content/blog/en/<slug>.md` (and optionally `fr/`, `ar/` versions
   with the same `translationKey`).
2. Front-matter: `title`, `description` (≤ 200 chars), `publishedAt`, `category`,
   optional `tags`, `faqs`, `related` (services/products/caseStudies/locations).
3. Write the article in Markdown. `## Headings` build the table of contents.

### Add a case study
Copy `src/content/case-studies/en/multi-site-operations-platform.md`, keep the
structure (challenge → thinking → architecture → execution → stack → outcome)
and set `demo: false` for real, client-approved projects.

### Add a service
Copy a file in `src/content/services/en/`. It appears in the mega-menu, the
services index, the footer, and gets its own page and `Service` structured data.

### Add a landing page (ads)
Copy `src/content/landing-pages/en/software-development.json` to a new file.
It is published at `/en/landing/<file-name>/`. Use `sections` to choose and
order blocks. Landing pages are `noindex` by default. Add
`?utm_source=facebook&utm_campaign=…` to ad URLs — the values are sent with
every lead.

### Add a language
See "Adding a language" in docs/CONTENT-GUIDE.md (4 steps; TypeScript lists
every missing UI string).

### Change brand colours
Edit the **Brand** block at the top of `src/styles/tokens.css` (and
`site.brand` in `src/config/site.ts` for the browser theme colour). Every
component uses semantic tokens derived from those values.

### Change contact information
Edit `contact` in `src/config/site.ts` — email, phone and the WhatsApp number
(digits only, international format). Every button, the footer, structured data
and `llms.txt` update from there.

---

## Environment variables

See `.env.example`. Summary:

| Variable | Where | Purpose |
|---|---|---|
| `SITE_URL` | build + run | Canonical domain (canonical URLs, hreflang, sitemap, OG) |
| `PUBLIC_CONTACT_ENDPOINT` | build | Form endpoint (external service accepting JSON POST) |
| `PUBLIC_GA4_ID`, `PUBLIC_GTM_ID`, `PUBLIC_META_PIXEL_ID`, `PUBLIC_LINKEDIN_PARTNER_ID` | build | Analytics (loaded only after consent) |

---

## Launch checklist

Items marked `TODO(launch)` in the code:

- [ ] `src/config/site.ts` — confirm **email**, legal name, founding year, city (optional), social links, and the **company identifiers** in `site.legal` (RC, ICE, IF, registered office, publication director, CNDP receipt). The build log's `[launch-check]` lists what is missing.
- [ ] `SITE_URL` — set the real domain in `.do/app.yaml` and the App Platform settings.
- [ ] **Contact form** — set `PUBLIC_CONTACT_ENDPOINT` (https) and name the provider in `src/config/privacy.ts` (`formProcessor`). Until then the form is replaced by direct contact links.
- [ ] **Security headers** — apply the header set in `docs/SECURITY.md` where the site is served (App Platform or CDN).
- [ ] **Demo content** — replace the two illustrative case studies and confirm the three product sheets (all flagged `demo: true`), then set `site.showDemoNotices` accordingly.
- [ ] **Technology list** — `src/config/technology.ts` must only list technologies the team actually uses.
- [ ] **Legal pages** — legal notice, privacy, cookies and terms were written from the actual implementation but must be reviewed by qualified counsel (Law 09-08 / CNDP declaration and transfers; GDPR applicability; US state law). Open items: `docs/AUDIT.md` → "Legal TODOs".
- [ ] **Translations** — have a native speaker review the French and Arabic copy. The brand stays in Latin script ("Atlaxys") on Arabic pages; change it if you prefer a transliteration.
- [ ] **Analytics** — add IDs; check the consent banner appears, nothing loads before consent, and the cookie/privacy tables list the new vendor. Prefer GA4 over GTM (see `docs/SECURITY.md`).
- [ ] **Search Console / Bing Webmaster** — verify the domain and submit `/sitemap.xml`.
- [ ] Replace media placeholders with real product screenshots as they become available.
