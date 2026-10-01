# Quality audit

Audit of the production build (`npm run build` + `npm start`), run on
29 September 2026. Tools: axe-core 4 (WCAG 2.0/2.1/2.2 A+AA + best
practices), Lighthouse (mobile: simulated slow 4G + 4× CPU; desktop preset),
headless Chrome scripted checks, `astro check`.

> Lighthouse warned that the test machine's CPU is slower than its reference
> device, so performance numbers are pessimistic. Several desktop runs failed
> with Lighthouse's `NO_NAVSTART` trace error (a known Windows/headless flake,
> not a page error). Re-run on your own machine or with PageSpeed Insights
> after deployment.

## Results

### Automated accessibility (axe-core) — 0 violations on every page tested

`/en/`, `/en/contact/`, `/en/services/software-engineering/`,
`/en/work/multi-site-operations-platform/`, `/en/products/nexus-gym/`,
`/en/insights/cost-of-custom-software-morocco/`,
`/en/landing/software-development/`, `/ar/`,
`/ar/services/software-engineering/`, `/fr/about/`,
`/fr/landing/developpement-logiciel/`, `/en/search/`, `/en/legal/privacy/`,
`/en/locations/morocco/`, 404.

Issues found during the audit and fixed: unlabelled decorative SVGs in
cards, the services-menu toggle's target size (WCAG 2.2 2.5.8), the floating
WhatsApp button outside a landmark, duplicate section names on product pages,
`aria-label` on a paragraph (SplitText), and scroll-dimmed text below the
contrast minimum (the statement's dim state and the inactive process steps
now use colours that pass AA).

### Lighthouse (mobile, throttled)

| Page | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Home (EN) | 89 | 100 | 100 | 100 | 2.4 s | 3.3 s | 0 ms | 0 |
| Home (AR) | 88 | 100 | 100 | 100 | 2.2 s | 3.6 s | 0 ms | 0 |
| Case study | 95 | 100 | 100 | 100 | 2.0 s | 2.7 s | 0 ms | 0 |
| Article (FR) | 89 | 100 | 100 | 100 | 2.5 s | 3.2 s | 0 ms | 0.022 |
| Contact | 88 | 100 | 100 | 100 | 2.6 s | 3.3 s | 0 ms | 0 |
| Service | 91 | 100 | 100 | 100 | 2.2 s | 3.0 s | 130 ms | 0 |
| Landing page | 93 | 100 | 100 | 69* | 2.1 s | 2.9 s | 0 ms | 0 |

\* Campaign landing pages are intentionally `noindex` (ads traffic, avoids
thin/duplicate pages competing with service pages). Set `"noindex": false`
per page to index one.

Desktop home (before the final fixes): Performance 85, FCP 0.7 s,
LCP 0.8 s, CLS 0; Accessibility 100 after the contrast fix.

The biggest improvement came from measurement. Mobile TBT on the home page
fell from **1,190 ms to 0 ms** once GSAP was limited to ≥ 768px screens and
the SVG hero became static on small screens (it keeps a compositor-only
drift).

### Behavioural checks (scripted)

| Check | Result |
|---|---|
| `astro check` (TypeScript + Astro) | 0 errors, 0 warnings, 0 hints |
| Build | 89 pages (EN/FR/AR, incl. 4 legal pages per language) + sitemap, robots, llms.txt, manifest, search indexes |
| Keyboard: skip link → main; tab order; mega-menu open (Enter), traverse, close (Esc) with focus return | ✔ |
| Mobile menu `<dialog>`: focus moves in, Esc closes, focus returns to the Menu button | ✔ |
| Reduced motion: no hidden content, no WebGL, no GSAP, 0 running animations | ✔ |
| Consent: see docs/AUDIT.md (38 scripted checks, October 2026) | ✔ |
| Pinned process (desktop): track translates, counter 01→05, nodes light in order | ✔ |
| WebGL hero: loads on capable desktops, SVG fallback elsewhere, RTL mirrored | ✔ |

## Checklist review

### UX
- Value proposition in the first screen: *"We build the software your
  business runs on."* + what/where/who in the lead + two clear CTAs.
- Navigation: 5 items + mega-menu (services generated from content),
  search, language, persistent "Let's talk".
- Every page ends in a next step (CTA block, related content, form).

### Design
- Original visual language derived from the logo: extended display type,
  cool ink/steel palette, single signal orange, trace-and-node motif,
  chamfered corners, engineering spec sheets, generated architecture
  blueprints instead of stock imagery.
- No glassmorphism cards, stock photos, purple gradients, fake dashboards.

### Accessibility
- WCAG 2.2 AA: see axe results. Semantic landmarks, one `h1`, visible focus,
  44px targets, labelled forms with an error summary, native dialogs and
  disclosures, `lang`/`dir` per page, reduced motion respected.

### SEO / AEO
- Unique titles and descriptions (validated lengths), canonical, hreflang +
  x-default, sitemap with alternates, robots, JSON-LD graph (Organization,
  WebSite, WebPage, Breadcrumb, Service, SoftwareApplication, Article, FAQ,
  ItemList), `llms.txt`, FAQs with direct answers, "at a glance" facts.

### Performance
- Static HTML, critical JS < 10 KB, idle-loaded GSAP (≥ 768px only),
  WebGL only on capable desktops, self-hosted fonts with preload and metric
  fallback, AVIF/WebP images, `content-visibility` on phones.

### Internationalisation
- EN/FR/AR with localised slugs, typed dictionaries, RTL layout, Kufi
  typography, bidi-safe animations, localised dates/numbers/plurals, language
  switcher that preserves the page.

### Conversion
- Contact form (full) and landing form (compact), WhatsApp everywhere
  (floating, footer, CTA blocks, landing sticky bar), email, UTM/fbclid
  attribution sent with leads, `generate_lead` → GA4/Meta `Lead`.

### Content
- No invented clients, figures, awards or testimonials. Illustrative case
  studies and draft product sheets are visibly labelled (`demo: true`).

### Code
- TypeScript strict, schema-validated content, one content repository,
  reusable components, no hard-coded copy/navigation/SEO/products/posts.

## Known limitations and follow-ups

1. **Real proof**: replace the two illustrative case studies with published,
   client-approved projects; add real product screenshots.
2. **Native review** of French and Arabic copy; **legal review** of policies.
3. **Lead delivery** must be configured before launch (Resend or webhook).
4. **Three.js chunk** (~540 KB raw) loads only on capable desktops at idle;
   if desktop TBT matters more than the effect, lower `capable()` thresholds
   or disable it in `src/scripts/hero/index.ts`.
5. **Per-page Open Graph images** use a branded default; generating
   title-specific images (e.g. with Satori at build time) is a possible
   enhancement.
6. **Header over light sections**: the header turns solid ink when scrolled, so
   the white logo stays legible. A dark-on-light logo variant would need an
   official asset.
