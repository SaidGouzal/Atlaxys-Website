# Architecture

## Principles

1. **Static by default.** Every page is prerendered to HTML at build time. There
   is no server runtime; forms POST to an external endpoint.
2. **Content is data.** Pages never hard-code copy, navigation, products,
   posts or SEO. Everything comes from `src/content/` and `src/config/`.
3. **One seam for the CMS.** Templates read content only through
   `src/lib/content/`. Swapping Markdown/JSON for a headless CMS means changing
   that module (or the collection loaders), not the pages.
4. **Progressive enhancement.** Pages work without JavaScript. Motion, WebGL,
   search and form enhancement are layered on top, and respect
   `prefers-reduced-motion`.
5. **Fail at build, not in production.** Content is validated by schemas, and
   so is internal linking (via translation keys) and types (`npm run check`).

## Request flow

```text
Browser ──► DigitalOcean App Platform Static Site (TLS, CDN) ──► dist/** (prerendered HTML, assets)
   └─ forms ──► PUBLIC_CONTACT_ENDPOINT (external service)
```

## Internationalisation

| Concern | Implementation |
|---|---|
| Locales | `src/i18n/config.ts` — `en` (default), `fr`, `ar` with `dir`, hreflang, OG locale, Intl locale |
| URLs | `/{lang}/…` via `src/pages/[lang]/`. Section segments are shared (`/fr/services/`); entry slugs are localised (`/fr/services/ingenierie-logicielle/`) |
| UI strings | `src/i18n/ui/{en,fr,ar}.ts`. `fr` and `ar` are typed against `en`, so a missing key is a compile error. Arabic plurals use `Intl.PluralRules` (six forms) |
| Content | Long-form: one Markdown file per language, linked by `translationKey`. Structured JSON: one file with `{ en, fr, ar }` fields, falling back to English |
| Language switcher | Links to the *same* page in the other language when a translation exists (via `translationKey`), otherwise to the section index, marked as such |
| hreflang | Generated per page from the same alternates map, plus `x-default` → English. Also emitted in `sitemap.xml` |
| RTL | `<html dir="rtl">`, logical CSS properties everywhere, mirrored directional icons, Kufi typography without tracking/uppercase, word-splitting animations disabled in RTL (bidi-safe), WebGL field mirrored; the 3D mark moves to the inline-end side and turns towards the text, but is never mirrored (it is the logo) |
| Root `/` | Picks an explicit earlier choice, then `navigator.languages`, then English; crawlers follow a meta refresh to `/en/` |

## Content model

Defined in `src/content.config.ts` (Astro content layer, Zod 4):

| Collection | Storage | Notes |
|---|---|---|
| `services` | `services/{lang}/*.md` | capabilities, deliverables, approach, FAQ, relations |
| `products` | `products/*.json` | translatable fields, status, platforms, pricing (only real prices produce `Offer` schema), images with required alt |
| `caseStudies` | `case-studies/{lang}/*.md` | challenge → thinking → architecture (layers) → execution → stack → outcome; `demo` flag |
| `blog` | `blog/{lang}/*.md(x)` | category, tags, FAQ, relations; reading time computed |
| `landingPages` | `landing-pages/{lang}/*.json` | section blocks, order, form variant, campaign; `noindex` by default |
| `industries` | `industries/*.json` | taxonomy; page generated only with `publishPage: true` |
| `locations` | `locations/{lang}/*.md` | country/region/city hierarchy → `/locations/morocco/casablanca/`; `publish` flag |
| `legal` | `legal/{lang}/*.md` | privacy, terms, cookies |
| `pages` | `pages/{lang}/*.json` | copy for fixed pages (home, about, contact, index intros), discriminated by `page` |

### Relations and internal linking

`src/lib/content/related.ts` resolves relations **in both directions**. A case
study listing `services: [software-engineering]` appears on the Software
Engineering page without editing the service. Posts relate to services,
products, case studies and locations. Explicit links are shown first,
inferred ones fill the rest.

### Search

`/{lang}/search.json` is a static index (services, products, case studies,
articles, locations) built by `src/lib/content/search.ts`. The client
(`src/scripts/search.ts`, ~2 KB) normalises accents and Arabic letter forms and
ranks by field. Replaceable by Pagefind/Algolia without touching content.

## SEO and structured data

- `components/seo/SEOHead.astro`: title (brand suffix), description, canonical,
  robots, hreflang + x-default, Open Graph (`OpenGraph.astro`), X card
  (`TwitterCard.astro`).
- `lib/seo/schema.ts`: one JSON-LD `@graph` per page. `BaseLayout` always
  emits `Organization`+`ProfessionalService`, `WebSite` (no `SearchAction`: Google
  retired the sitelinks search box, and search keeps queries out of URLs),
  `WebPage` and `BreadcrumbList`; pages add `Service`, `SoftwareApplication`,
  `BlogPosting`/`Article`, `FAQPage` (only when the FAQ is visible) and
  `ItemList`. Unknown values are omitted rather than invented.
- `sitemap.xml` (with hreflang), `robots.txt`, `llms.txt` (AI assistants),
  `manifest.webmanifest` — all generated from content.

## Motion system

| Layer | Loaded | Used for |
|---|---|---|
| CSS only | always | hero headline entrance, page transitions (`@view-transition`, zero JS), hover states, trace drawing |
| `scripts/motion/reveal.ts` (IntersectionObserver) | always, < 1 KB | `[data-reveal]`, `[data-draw]`, staggered groups, masked media |
| `scripts/motion/enhance.ts` (GSAP + ScrollTrigger + SplitText) | idle, code-split, not on landing pages, not with reduced motion | heading line reveals, scroll-scrubbed statement, magnetic buttons, parallax, pinned horizontal process, counters |
| `scripts/hero/signal-scene.ts` (Three.js) | idle after load, desktop + fine pointer + ≥4 cores + WebGL, no Data Saver | the 3D signal field; SVG version otherwise |
| `scripts/hero/mark/` (Three.js + GSAP) | placement: always (tiny, eager); 3D: idle after load, slot near the viewport, tablet or wider (≥ 48rem) + motion allowed + WebGL 2 + ≥4 cores/4 GB + no Data Saver or 2G/3G; phones get the still (Lighthouse mobile: 7.5 s TBT with the 3D) | the 3D Atlaxys mark (below); a pre-rendered still of it otherwise |

### The 3D hero mark

The logo's "A" symbol as a real 3D object, built at runtime from vector data
measured off the official logo file (`src/lib/brand/mark.ts`): extrusions
with 45° chamfers, physically based materials lit by a procedural studio
(no model or HDR file to download, ~2,750 triangles).

| Module | Role |
|---|---|
| `mark/index.ts` (eager, ~2 KB) | Measures the hero's text line boxes and fits the mark in the largest free box on the inline-end side (`layout.ts`) — robust to French's longer headline and Arabic's mirrored layout; picks 3D or still |
| `mark/stage.ts` (lazy) | DOM wiring: assembly on entering the viewport, ScrollTrigger scrub, pointer, pause button, theme, visibility, context loss |
| `mark/scene.ts` | Renderer, parts, GSAP assembly timeline, exploded view, signals, adaptive resolution |
| `mark/geometry.ts`, `materials.ts`, `studio.ts` | Extrusions; materials + reveal/signal shader patch; studio environment (PMREM) |

Choreography: the steel A rises from its baseline, the blade cuts through,
the traces route out and close round their rings (each behind a hot signal
edge), then signals travel the traces now and then. The pointer moves the
light and the reflections; touch devices get a slow drift. Scrolling out of
the hero opens the mark into an exploded axonometric view over a dashed
blueprint of itself, then it fades before the next section. Rendering stops
off-screen, in background tabs and (for autonomous motion) when the hero's
pause button is pressed; resolution drops if frames are consistently slow.

Placement: beside the headline from 1024px (measured); below the calls to
action on phones and tablets (an in-flow slot), so the headline and primary
button keep their place. The H1 stays the LCP element.

Fallback: `src/assets/brand/mark-3d-{dark,light}.png`, renders of the same
scene made by `npm run brand:mark-stills`. Shown without JavaScript, on
phones, with reduced motion and on devices that skip WebGL; in the 3D case it stays
`display:none` + lazy, so it is never downloaded.

Safety: hidden start states apply only when `<html class="motion">` is set by
the head script; if the motion code does not boot within 3 s, everything is
shown. Reduced motion disables all animation, transitions and view
transitions.

## Performance budget

| Asset | Size | When |
|---|---|---|
| HTML (home, gzip) | ~24 KB | always |
| Critical JS (header, reveal, tracking) | < 10 KB | deferred modules |
| Fonts | Archivo Latin 90 KB (preloaded), JetBrains Mono 40 KB, Noto Kufi Arabic 124 KB (Arabic pages only via `unicode-range`) | swap + metric-matched fallback |
| GSAP chunk (core + ScrollTrigger) | ~115 KB raw / 45 KB gzip | idle, motion allowed |
| Three.js chunk | ~560 KB raw / 116 KB brotli | idle, capable tablets and desktops only (shared by the field and the mark) |
| 3D mark (`stage` chunk) | ~23 KB raw / 10 KB gzip | idle, slot near the viewport, capable devices only |
| 3D mark still (fallback) | 10–40 KB AVIF | only when the 3D is not used |

Images use AVIF/WebP with responsive `srcset`, intrinsic dimensions and lazy
loading (`components/ui/Img.astro`).

## Security

See [SECURITY.md](SECURITY.md). In short: a build-time Content-Security-Policy
(`integrations/csp.mjs`, per-page script hashes, vendor hosts only when
configured), validated public environment values, no secrets, no third-party
code before consent, and HTTP-only headers (HSTS, frame-ancestors, nosniff)
applied where the site is served.

- JSON-LD is serialised with `<`, `>`, `&` escaped.
- Search results and form errors are rendered with `textContent`, never HTML.

## Analytics, consent and privacy inventory

`src/config/analytics.ts` centralises IDs (env vars). `src/config/privacy.ts`
is the inventory of every storage key and third-party recipient; the cookie
and privacy policies render their tables from it (`components/legal/`), so
the published policies follow the build.

`AnalyticsHead` sets Google Consent Mode v2 to *denied* (the advertising
signals stay denied even after consent: no Google ad tag is used). `ConsentBanner` +
`scripts/analytics/consent.ts` store the choice in localStorage for 180 days
(versioned), honour Global Privacy Control (marketing off), and on withdrawal
delete the vendors' first-party cookies and reload (other open tabs reload
too, via the `storage` event). Only then does
`vendors.ts` load GA4/GTM (analytics) and Meta Pixel/LinkedIn (marketing);
campaign attribution (`attribution.ts`) is captured only with marketing
consent. `track.ts` exposes `track(event, params)` and delegated `data-track`
attributes; events never leave the page unless a vendor was allowed to load.

## Scaling the architecture

- **More languages:** add a locale (see CONTENT-GUIDE) — routes, hreflang,
  sitemap and switcher follow.
- **City / market pages:** add `locations` entries with `parent: morocco`
  (or a new country) — only with unique content.
- **Industry pages:** set `publishPage: true` once an industry has real
  content.
- **CMS:** implement a content-layer loader for Sanity/Strapi/Contentful in
  `content.config.ts`; schemas stay the source of truth.
