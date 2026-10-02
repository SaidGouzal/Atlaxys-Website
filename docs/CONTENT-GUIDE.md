# Content guide — adding and editing content

Everything on the site comes from files in `src/content/` and `src/config/`.
You never need to edit an `.astro` component to add a product, service, case
study, article, landing page or location.

**Rules that apply everywhere**

- The **file name is the URL slug**: lowercase, words separated by hyphens.
- Files are **validated when the site builds**. If something is missing or
  wrong (for example an image without alt text or a description longer than
  200 characters), `npm run build` stops and names the file and the field.
- Set `draft: true` to keep an item out of production (it still shows in
  `npm run dev`).
- Translations of the same item share a `translationKey`. That is how the
  language switcher and hreflang tags find the other versions.
- In YAML front-matter, wrap long text in `>-` (see existing files) so that
  colons inside sentences don't break parsing.

**Writing guidelines** (applied to every page, in every language)

- Write for a business owner, not an engineer. Say what the software does
  and why it matters; explain a technical term the first time it appears
  ("a private test site (staging)", "connections between tools (APIs)").
- Only claim what can be shown: no invented clients, results, statistics,
  certifications, partnerships or guarantees. Commitments such as "free
  30-minute call" or "reply within one working day" must be ones the team
  actually keeps.
- No em dashes (—), and no spaced en dashes used as a substitute. Use commas,
  colons, full stops or parentheses. Page titles use `|` as the separator.
- Avoid marketing clichés ("cutting-edge", "world-class", "seamless",
  "game-changing"). Prefer a concrete sentence about what happens.
- Keep search terms natural: put the main phrase in the title, first heading
  and description once, and answer questions directly in FAQs.
- Page titles: 60 characters or fewer, brand included. The " | Atlaxys Consulting"
  suffix is added only when it fits, so keep the main phrase first.
- Meta descriptions: 155 characters or fewer (longer ones are cut with "…").
- Terminology: *Software Development* (EN) / *Développement logiciel* (FR) /
  *تطوير البرمجيات* (AR); *AI & Automation*; *Cloud & DevOps*; *Technology
  Consulting*; *Case studies*; *Articles*. Process steps: Understand, Plan,
  Build, Launch, Support.

---

## Products — `src/content/products/<slug>.json`

One JSON file per product, all languages inside it.

```json
{
  "name": "Nexus Gym",
  "tagline": { "en": "Membership, check-in and billing for gyms.", "fr": "…", "ar": "…" },
  "description": { "en": "…", "fr": "…", "ar": "…" },
  "category": { "en": "Business software", "fr": "Logiciel métier", "ar": "برمجيات الأعمال" },
  "status": "available",
  "platforms": ["Windows", "macOS"],
  "features": [{ "title": { "en": "…" }, "description": { "en": "…" } }],
  "technologies": ["Electron", "PostgreSQL"],
  "cover": { "src": "./images/nexus-gym-cover.png", "alt": { "en": "Nexus Gym front-desk screen" } },
  "images": [],
  "pricing": { "model": "quote", "currency": "MAD", "note": { "en": "Ask for a quote." } },
  "demoUrl": "https://…",
  "downloadUrl": "https://…",
  "services": ["software-engineering"],
  "caseStudies": [],
  "posts": ["custom-erp-vs-saas"],
  "featured": true,
  "order": 1,
  "demo": false
}
```

- Any text field can be a plain string (used for every language) or an
  object `{ "en", "fr", "ar" }` (English required; missing languages fall back
  to English).
- `status`: `available` · `beta` · `in-development` · `coming-soon`.
- `pricing.model`: `subscription` · `license` · `one-time` · `quote` · `free`.
  Add `plans` with a numeric `price` to show plans (and emit an `Offer` in
  structured data). Never publish a price that is not real.
- Images: put files in `src/content/products/images/` and reference them
  relatively. They are converted to AVIF/WebP automatically. `alt` is required.
- `title` is accepted as an alias of `name`, and `slug` may override the file name.
- `demo: true` shows a "draft description" notice on the page.

Once saved, the product appears on: the products page, the home page
(first three by `featured`/`order`), the footer, product-related sections of
services/posts/case studies, search, the sitemap and `llms.txt`.

## Services — `src/content/services/<lang>/<slug>.md`

Copy an existing service. Key fields: `translationKey` (same in every
language), `title`, `navLabel` (optional short label), `tagline`, `summary`,
`order` (menu order), `hero`, `capabilities[]`, `deliverables[]`,
`technologies[]`, `approach[]`, `faqs[]`, `related` (products, caseStudies,
posts by key), `keywords[]` (search). The Markdown body is the long-form
section of the page.

A new service automatically appears in the mega-menu, mobile menu, footer,
home page, services index, search, sitemap and `Service` structured data.

## Case studies — `src/content/case-studies/<lang>/<slug>.md`

The structure is the story: `challenge` → `thinking` → `architecture`
(`summary` + `layers[{ name, items[] }]`) → `execution[{ phase, detail }]` →
`stack[]` → `outcome` (`summary` + `results[{ label, detail }]`).

- `industry` = file name of an industry in `src/content/industries/`.
- `services`, `products` = keys; the case study then shows up on those pages.
- `cover` / `gallery` accept real screenshots (with `alt`). Without a cover,
  a diagram of the project's architecture is generated automatically.
- `testimonial` (optional) — **only with the client's written permission**.
- `demo: true` displays an "Illustrative example" notice. Set it to `false`
  only for real, approved engagements, and never invent metrics.
- The two existing case studies are illustrative and currently unpublished
  (`draft: true`). While no case study is published, the "Case studies" link
  is hidden from the header, mobile menu and footer, the home page section is
  skipped, and `/work/` is `noindex` and left out of the sitemap. Publishing
  the first real case study brings all of them back automatically.

## Articles — `src/content/blog/<lang>/<slug>.md` (or `.mdx`)

```yaml
---
translationKey: my-article            # same across languages
title: How to …
description: One or two sentences, ≤ 200 characters (used for SEO).
publishedAt: 2026-10-01
updatedAt: 2026-10-15                 # optional
category: Engineering
tags: [architecture, cost]
author: { name: Jane Doe, role: Lead engineer }   # optional (defaults to the company)
related:
  services: [software-engineering]
  products: []
  caseStudies: []
  locations: [morocco]
faqs:                                 # optional; shown on the page + FAQPage schema
  - question: …
    answer: …
---
Write in Markdown. Use ## for sections (they build the table of contents).
Link internally: [our DevOps practice](/en/services/devops-cloud/).
```

Articles in a language that has no translation simply don't show a link in
the language switcher (it falls back to the section page).

## Campaign landing pages — `src/content/landing-pages/<lang>/<slug>.json`

Published at `/<lang>/landing/<slug>/`, `noindex` by default (set
`"noindex": false` in `seo` if the page should rank).

Blocks (all optional): `hero`, `audience`, `problem`, `solution`,
`benefits`, `proof` (can pull `caseStudies` and `products` by key), `process`,
`faq`, `form`. Choose and order them with:

```json
"sections": ["hero", "problem", "solution", "proof", "faq", "form"]
```

- `form.variant`: `compact` (name, email, phone, need, message) or `full`.
- `form.projectType` preselects the need.
- `hero.whatsappMessage` pre-fills the WhatsApp message.
- `campaign` and `tracking.contentName` are sent with every lead and to Meta.

**Ad links:** use the page URL with UTM parameters, e.g.
`https://www.atlaxys.com/fr/landing/developpement-logiciel/?utm_source=facebook&utm_medium=paid&utm_campaign=dev-logiciel-oct`.
The parameters (and `fbclid`/`gclid`) are stored for the visit and included in
the lead. Landing pages load no GSAP/WebGL, and show a sticky
"quote + WhatsApp" bar on phones.

## Locations — `src/content/locations/<lang>/<slug>.md`

The Morocco page is `morocco.md` (`maroc.md` in French). To add a city:

```yaml
---
translationKey: casablanca
name: Casablanca
kind: city
parent: morocco            # translationKey of the country
countryCode: MA
hero: { title: …, lead: … }
highlights: []
faqs: []
publish: true
---
Unique, genuinely local content only — who you work with there, local
constraints, on-site availability. Do not duplicate another city's text.
```

URL: `/en/locations/morocco/casablanca/`. Set `publish: false` until the page
has real, specific content (avoid doorway pages).

## Industries — `src/content/industries/<slug>.json`

Used on the home page and by case studies. `"publishPage": true` creates
`/<lang>/industries/<slug>/` — enable only when the industry has enough
unique content.

## Page copy — `src/content/pages/<lang>/*.json`

Home, About, Contact and the intros of Services/Products/Work/Insights/Search.
Edit text freely; keep the keys. In the home hero title, wrap the words to
underline with the signal trace in `*asterisks*`.

## Legal pages — `src/content/legal/<lang>/<slug>.md`

`privacy`, `terms`, `cookies` (`translationKey`). Update `updatedAt` when you
change them.

## UI strings — `src/i18n/ui/{en,fr,ar}.ts`

Buttons, labels, form messages, consent banner, 404 copy. English is the
reference; TypeScript flags any key missing in French or Arabic.

---

## Adding a language

1. `src/i18n/config.ts`: add the code to `locales` and an entry in
   `localeMeta` (native name, `dir`, hreflang, OG locale, Intl locale).
2. `src/i18n/ui/<code>.ts`: copy `en.ts`, translate (type-checked).
3. `src/content.config.ts`: add the code to the glob pattern in `perLocale`
   (`{en,fr,ar,<code>}`) and to the `localized()` helper.
4. Add content folders `src/content/<collection>/<code>/` (at least
   `pages/<code>/home.json`); JSON product/industry fields can add `"<code>"`.

Routes, hreflang, sitemap, language switcher, search index and structured
data pick it up automatically. For another RTL language, set `dir: 'rtl'`.

## Changing brand colours

Edit the *Brand* block at the top of `src/styles/tokens.css`:

```css
--brand-ink: #08090b;      /* page background */
--brand-steel: #f2f4f7;    /* primary text */
--brand-signal: #ff8828;   /* accent */
--brand-signal-deep: #fe6e02;
```

Also update `site.brand` in `src/config/site.ts` (browser theme colour and
manifest). Re-check text contrast (≥ 4.5:1) if you change them.

## Changing contact information

`src/config/site.ts` → `contact`:

```ts
contact: {
  email: 'contact@atlaxys.com',
  phone: '+212 7 08 00 60 33',
  whatsapp: '212708006033',          // digits only, country code, no leading 0 or +
  whatsappFloatingButton: true,
}
```

Also `address` (country, optional city), `social` links (only filled ones are
shown), `legalName`, `foundingYear`, `areaServed`. These feed every contact
button, the footer, JSON-LD and `llms.txt`.

## Replacing the logo

Replace the two files in `src/assets/brand/source/` (same names), then run
`npm run brand:assets` to regenerate the transparent lockup, favicons, PWA
icons and the default social image. For best results, supply high-resolution
PNG or SVG masters.
