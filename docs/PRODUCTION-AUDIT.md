# Production-readiness audit (2 October 2026)

Scope: the whole repository at `develop` (3f283e6), the static build with the
production configuration (77 pages, EN/FR/AR, `PUBLIC_GA4_ID=G-9LD8TLNH9K`,
`PUBLIC_CONTACT_ENDPOINT=https://api.web3forms.com/submit`) and the live site
at `https://www.atlaxys.com`.

This is an engineering audit, not legal advice. Nothing here states that the
site "complies" with Law 09-08, the GDPR or any other law. Items marked
**[owner]** need an action or a fact from Atlaxys; **[legal]** needs review by
a qualified lawyer.

It builds on the earlier audit in [AUDIT.md](AUDIT.md) (1 October). Every claim
below was re-checked against the code, the build output and the live site;
where the earlier audit was wrong or out of date, this document says so.

Priorities: **P0** must fix before production · **P1** high · **P2**
recommended · **P3** optional.

## How it was checked

| Check | Tool / method |
|---|---|
| Static SEO of every built page (titles, descriptions, canonicals, robots, hreflang reciprocity, headings, image alt/size, internal links, orphans, sitemap) | custom parser over `dist/` |
| Consent and analytics with the **real** `gtag.js` (hits to Google recorded and blocked, so no test data reached the property) | Playwright, Chromium 151 |
| Accessibility, WCAG 2.0/2.1/2.2 A + AA + best practice | axe-core 4.13 on all pages at 1366 px, 375 px and 320 px |
| Performance, accessibility, best practices, SEO | Lighthouse 12, mobile and desktop presets, served with Brotli |
| Live hosting: redirects, status codes, headers, cookies, DNS | `curl`, `nslookup` |
| Social profiles, Web3Forms behaviour | in-app browser, Web3Forms documentation |
| Dependencies, secrets | `npm audit`, `npm outdated`, git-history and `dist/` scans |

## Summary

No P0 issue was found: consent gating, the CSP, the forms and the core SEO
set-up work. Nine P1 issues were found. Six can be fixed in code and are fixed
in this change; three are hosting or DNS settings that only the owner can
change.

| ID | Priority | Area | Issue | Status |
|---|---|---|---|---|
| PRIV-1 | P1 | Privacy / analytics | Site-search text reaches Google Analytics | Fixed in code |
| PRIV-2 | P1 | Privacy / legal | `__cf_bm` cookie missing from the cookie policy | Fixed in code |
| FORM-1 | P1 | Forms / security | Spam honeypot not recognised by Web3Forms; dead anti-spam code | Fixed in code |
| SEO-1 | P1 | SEO / trust | X and LinkedIn profile links are broken (footer, structured data, X card) | Fixed in code (links removed) **[owner]** |
| A11Y-1 | P1 | Accessibility | Services menu button fails WCAG 2.5.8 target size on every page | Fixed in code |
| PERF-1 | P1 | Performance | 3D hero loads Three.js + GSAP on phones: home page mobile score 63, 7.5 s blocking time | Fixed in code |
| INFRA-1 | P1 | Security / SEO | `https://atlaxys.com` redirects to **`http://`**www (insecure hop), via Squarespace | **[owner]** |
| INFRA-2 | P1 | Security | No HTTP security headers (HSTS, frame protection, nosniff, Permissions-Policy) | **[owner]** |
| INFRA-3 | P1 | SEO | `/` answers 200 with a client-side redirect: the 301 in `.do/app.yaml` is not applied to the live app | **[owner]** |
| GA-1 | P2 | Analytics / CSP | Every GA hit also tries `www.google.com/g/collect`; the CSP blocks it (3 console errors per hit) | Kept blocked, documented **[owner]** |
| SEO-2 | P2 | SEO | Sitemap gives static pages a `lastmod` of "build time" | Fixed in code |
| SEO-3 | P2 | SEO | Root page combines `noindex` with a canonical (conflicting signals) | Fixed in code |
| SEO-4 | P2 | Structured data | `WebSite` `SearchAction` (Google retired the sitelinks search box in 2024) | Fixed in code |
| UX-1 | P2 | UX | Thank-you page's main button opens the empty case-studies page | Fixed in code |
| FORM-2 | P2 | Forms / i18n | Without JavaScript, the form ends on Web3Forms' English page | Fixed in code |
| FORM-3 | P2 | Forms | A `{"success": false}` reply with HTTP 200 would be shown as success | Fixed in code |
| LEGAL-1 | P2 | Legal / i18n | Legal form shown in English on French/Arabic pages; policy text out of date after these fixes | Fixed in code **[legal]** |
| PERF-2 | P2 | Performance | Hashed assets served with `max-age=10` (host default) | **[owner]** |
| PERF-3 | P2 | Performance | Live 3D hero still costs main-thread time on desktop | Kept deliberately, documented |
| SEC-1 | P2 | Dependencies | Astro 5.18.2 advisories (one rated critical) | Analysed, not exploitable here; upgrade planned |
| GSC-1 | P2 | Search Console | Nexus Gym `SoftwareApplication` not eligible for rich results without price and reviews | Informational |
| CONT-1 | P3 | Structured data | `areaServed` lists regions not stated on the site | **[owner]** to confirm |
| CONT-2 | P3 | Trust | Company name differs across profiles ("Atlaxys Consulting Ltd" on Facebook, "Consultig" on Instagram) | **[owner]** |

## Findings

### PRIV-1 · Site-search text reaches Google Analytics · P1

- **Files:** `src/scripts/search.ts`, `src/scripts/analytics/vendors.ts`
- **Problem:** search writes the query into `?q=` with `history.replaceState`
  on every keystroke. After analytics consent, GA4's enhanced measurement
  reads the *real* address, not the cleaned `page_location`, and sent:
  - `view_search_results` with `search_term`. In the test, an email address
    was redacted by the GA property, but **a phone number typed into the
    search box was sent in full**;
  - extra history `page_view`s carrying `?q=`;
  - the query again as the referrer (`dr`) of the next page, because
    same-origin navigations send the full URL.
- **Why it matters:** visitors' free text is personal data. The privacy policy
  says analytics collects "pages viewed (without what you type in the site
  search)". The earlier audit tested with a stubbed `gtag.js`, so it could not
  see this.
- **Fix:** the query lives in the URL fragment (`#q=`). Fragments are never
  sent to servers or in referrers, and tests with the real `gtag.js` show GA4
  ignores them. Old `?q=` links are moved to the fragment on load. `vendors.ts`
  also cleans `page_referrer`.

### PRIV-2 · Cookie set by the host is missing from the cookie policy · P1

- **Files:** `src/config/privacy.ts`, `src/content/legal/*/cookies.mdx`, `src/content/legal/*/privacy.mdx` (and FR/AR equivalents)
- **Problem:** every response from `www.atlaxys.com` sets `__cf_bm`
  (Cloudflare bot management, 30 minutes, HttpOnly). DigitalOcean App
  Platform delivers the site through Cloudflare. The cookie policy does not
  list it, and says strictly necessary cookies "are never shared with third
  parties".
- **Why it matters:** the cookie policy must describe what the site actually
  stores.
- **Fix:** added to the inventory as strictly necessary, set by the hosting
  provider's network; corrected the category text; named Cloudflare as
  DigitalOcean's delivery network in the hosting row.
- **Also noted:** visiting the apex `atlaxys.com` sets a Squarespace `crumb`
  cookie during the redirect (see INFRA-1). Fixing INFRA-1 removes it.

### FORM-1 · Spam protection not effective · P1

- **Files:** `src/components/forms/LeadForm.astro`, `src/scripts/forms/lead-form.ts`, `src/config/forms.ts`
- **Problem:** the hidden honeypot field is named `website`. Web3Forms only
  recognises a checkbox named `botcheck`, so it forwarded bot submissions
  with `website` filled. The script never checked the honeypot either,
  `minFillTimeMs` was never used, and `startedAt` (a raw timestamp) was sent
  to the inbox for nothing.
- **Fix:** Web3Forms' `botcheck` checkbox, also checked in the browser
  (silently dropped). A checkbox is never auto-filled, so real people are not
  caught. `startedAt` and the unused constant are removed (data
  minimisation). Captcha was not added: it would bring a new third party into
  the privacy and cookie policies.

### SEO-1 · Broken social profiles · P1

- **Files:** `src/config/site.ts` (footer links, Organization `sameAs`, `twitter:site`)
- **Problem:** `x.com/Atlaxys` shows "This account doesn't exist".
  `linkedin.com/company/atlaxys-consulting/` shows "Page not found".
  Instagram, Facebook and GitHub resolve.
- **Why it matters:** broken links on every page, and structured data
  pointing search engines to profiles that don't exist.
- **Fix:** both removed (the footer and schema only render filled values).
  **[owner]** Send the correct URLs. `linkedin.com/company/atlaxys/` leads to
  a LinkedIn login wall, which suggests a page exists there, but it could not
  be confirmed as yours.

### A11Y-1 · Services menu button too small · P1

- **File:** `src/components/layout/Header.astro`
- **Problem:** axe `target-size` (WCAG 2.2 SC 2.5.8, AA) fails on 70 pages.
  The 24 px arrow button sits 8 px under the "Services" link, which paints
  above it, leaving 16 px clickable. This was introduced by commit 0f4e7a8.
- **Fix:** the button is stacked above the link. It is the same visual
  design, now with a full 24×44 px target.

### PERF-1 · 3D hero on phones · P1

- **Files:** `src/scripts/hero/mark/index.ts`
- **Measured (Lighthouse mobile, home):** performance **63** (EN) / 64 (AR),
  Total Blocking Time **7.5 s** / 4.7 s, while every other page scores 97–98
  with 0 ms. LCP (2.4 s) and CLS (0) are fine. The blocking comes from loading
  and starting Three.js (116 KB compressed) and GSAP/ScrollTrigger (41 KB),
  plus a WebGL capability probe. The test laptop is slow, which roughly
  doubles the throttled numbers, but the cost on mid-range phones is still
  large, and it lands while visitors start to scroll and tap (INP).
- **Fix:** below 48rem (phones) the hero shows the pre-rendered still of the
  same 3D mark (already built for no-JS and reduced motion), and no WebGL
  context is created. Tablets and desktops keep the live, interactive mark.
  This matches the site's existing rule ("GSAP flourishes are for tablets and
  desktops", `src/scripts/main.ts`). It is reversible by removing one
  condition.
- **Result (Lighthouse mobile, median of 3 runs, same machine):**

  | Page | Score before → after | Total Blocking Time | Page weight |
  |---|---|---|---|
  | `/en/` | 65 → **97** | 4,788 → **0 ms** | 353 → 209 KiB |
  | `/ar/` | 63 → **94** | 5,344 → **28 ms** | 435 → 292 KiB |
  | `/fr/` | 62 → 71 (0 ms TBT in two re-runs; the median run was noise) | 8,364 → 755 ms | 354 → 210 KiB |

  LCP (2.4–2.8 s) and CLS (0) are unchanged.

### PERF-3 · Live 3D cost on desktop · P2 (kept deliberately)

Desktop keeps the live 3D hero (the WebGL signal field and the 3D mark).
Lighthouse desktop on the test laptop shows about 2.7 s Total Blocking Time
after load (LCP 0.7 s, CLS 0, score about 65). The laptop's CPU benchmark is
about 800, where a typical modern desktop scores 1,500 or more, so real
desktops see much less. The work starts only after `load`, when the browser
is idle, and pauses off-screen. It is the site's creative centerpiece, so it
was not removed. If desktop INP turns out poor in Search Console's Core Web
Vitals report, options are: start the 3D on first pointer movement instead of
on idle, or drop the background WebGL field and keep only the mark.

### INFRA-1 · Apex domain redirects through HTTP · P1 · [owner]

- **Live:** `https://atlaxys.com/` → `301 http://www.atlaxys.com` (Server:
  Squarespace) → `301 https://www.atlaxys.com/`. The apex DNS points to
  Squarespace's forwarding service.
- **Why it matters:** one hop is unencrypted (it can be intercepted or
  rewritten), it adds a redirect for search engines, and it sets a Squarespace
  cookie.
- **Fix (owner):** in Squarespace Domains, change the forwarding destination
  to **`https://www.atlaxys.com`** (permanent, 301). Better long term: move
  DNS to DigitalOcean DNS or Cloudflare, which can serve the apex directly.

### INFRA-2 · No HTTP security headers · P1 · [owner]

- **Live:** no `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options` / `frame-ancestors`, or `Permissions-Policy`. The meta
  CSP is present and works.
- **Why it matters:** no clickjacking protection, no HSTS (first visits can
  be downgraded), MIME sniffing allowed.
- **Constraint:** an App Platform *Static Site* cannot set response headers
  (see [SECURITY.md](SECURITY.md)).
- **Fix (owner):** pick one. (a) Put the domain behind your own Cloudflare
  zone and add the headers with a Response Header Transform Rule (this also
  fixes INFRA-1 and PERF-2). (b) Switch the component to a small Web Service
  that serves `dist/` with headers. The exact header set is in SECURITY.md.

### INFRA-3 · `/` is not a real redirect · P1 · [owner]

- **Live:** `https://www.atlaxys.com/` → **200** (a page that redirects with
  JavaScript and meta refresh). The `ingress` rule in `.do/app.yaml` (301 to
  `/en/`) is not active, because the live app was created in the dashboard.
- The same spec's `disable_email_obfuscation` is not active either: the live
  HTML has every `mailto:` link rewritten to `/cdn-cgi/l/email-protection#…`
  and decoded by a Cloudflare script. In a browser with JavaScript the address
  works (checked). Crawlers, and visitors without JavaScript, see an
  obfuscated link instead of `contact@atlaxys.com`.
- **Fix (owner):** apply the spec: `doctl apps update <APP_ID> --spec .do/app.yaml`,
  or paste its `ingress` and `disable_email_obfuscation` blocks into
  Settings → App Spec. Until then the fallback page now sends consistent
  signals (SEO-3).

### GA-1 · GA4 also calls `www.google.com/g/collect` · P2 · [owner]

- **Observed with the real `gtag.js`:** each GA4 hit (to
  `www.google-analytics.com`, which works) is followed by a request to
  `www.google.com/g/collect`. The CSP blocks it, with three console errors
  per hit, only for visitors who accepted analytics.
- Five gtag configurations were tested (`allow_google_signals: false` in
  `config` and in `set`, ad redaction, and others). None stops it, so it comes
  from the GA4 property's settings (Google signals or advertising features).
- **Decision:** keep it blocked. Allowing it would send more data to Google
  than the privacy policy describes.
- **Owner:** in Google Analytics, open Admin → Data collection, turn **Google
  signals off**, and check Admin → Product links (no Google Ads link).

### SEO-2 · Sitemap `lastmod` · P2

- **File:** `src/pages/sitemap.xml.ts`
- **Problem:** home, about, services, products, insights and contact always
  get the build date, so each deploy claims they all changed, and Google learns
  to ignore the site's `lastmod`.
- **Fix:** `lastmod` only where a real date exists (content `updatedAt` /
  `publishedAt`).

### SEO-3 · Root page signals · P2

- **File:** `src/pages/index.astro`
- **Problem:** `noindex` plus a canonical to `/en/` send contradictory signals.
- **Fix:** keep the canonical and the instant meta refresh (Google treats it as
  a permanent redirect), and drop `noindex`.

### SEO-4 · Retired `SearchAction` · P2

- **File:** `src/lib/seo/schema.ts`
- **Problem:** Google retired the sitelinks search box (November 2024), and
  the template advertised `?q=` URLs (see PRIV-1).
- **Fix:** removed. The `WebSite` node stays.

### UX-1 · Thank-you page leads to an empty page · P2

- **File:** `src/pages/[lang]/contact/thank-you.astro`
- **Fix:** link to case studies only when some are published, otherwise to
  the services page (the same rule as the home page and navigation).

### FORM-2 · No-JavaScript submissions · P2

- **Files:** `LeadForm.astro`, `lead-form.ts`
- **Fix:** Web3Forms' `redirect` field (same domain, so it works on the free
  plan) points to the localized thank-you page. It is removed from the JSON
  payload, which handles success inline.

### FORM-3 · Provider error reported in the body · P2

- **File:** `lead-form.ts`
- **Fix:** a reply with `"success": false` is treated as a failure, so the
  visitor sees the error state with the direct email and WhatsApp links.

### LEGAL-1 · Legal texts · P2 · [legal]

- The legal form `SARL AU | Single-Owner LLC` was shown in English on French
  and Arabic pages. It is now localized (the official form "SARL AU" stays).
- The privacy policies (EN/FR/AR) described the old anti-spam fields and did
  not mention the site-search fix or the CDN cookie. They have been updated.
- **[owner]** Still missing: registered company name (`site.legalName`),
  court/city of the RC number, publication director, CNDP receipt. See the
  build's `[launch-check]` output.

### PERF-2 · Asset caching · P2 · [owner]

- **Live:** `/_astro/*` files have content hashes in their names but are
  served with `Cache-Control: public,max-age=10`, so returning visitors
  re-validate them every time. App Platform static sites cannot change this.
  Option (a) in INFRA-2 fixes it with a Cache Rule
  (`/_astro/*` → 1 year, immutable).

### SEC-1 · Astro 5 advisories · P2

`npm audit`: 1 critical and 2 low, all in Astro ≤ 7.2.7 and its esbuild.
Reviewed one by one:

- `define:vars` XSS: inputs here are build-time constants validated by regex
  (`astro.config.mjs`).
- Server islands, SSR error page, base-path checks and reflected XSS (slot
  names, View Transition values): need server rendering or request data, and
  this build is static.
- AVIF RCE: needs a malicious image in the repository.
- esbuild: Windows dev server only.

They are not exploitable by visitors of this static site. The fix is the
Astro 7 / Node 22 / Zod 4 migration, which was deliberately postponed (see
[SECURITY.md](SECURITY.md)). Not changed here, per "do not blindly upgrade".

### GSC-1 · Nexus Gym rich result · P2 (informational)

Google's software-app rich result needs a public price and real reviews or
ratings. Nexus Gym is quote-based with no reviews, so Search Console's "Software
apps" report will list the page as not eligible. That does not affect
indexing. Nothing is invented to "fix" it.

### CONT-1, CONT-2 · Facts to confirm · P3 · [owner]

- `site.areaServed` lists Morocco, Europe, United Kingdom, Canada, United
  States, Middle East and Africa (Organization and Service structured data),
  while the visible copy says "Morocco and abroad". Confirm the list, or reduce
  it to what the site states.
- The Facebook page is named "Atlaxys Consulting Ltd" (the company is an SARL
  AU), and the Instagram name reads "Atlaxys Consultig". Consistent names
  help search engines tie the profiles to the company.

## Verified as working (no change needed)

- **Consent:** nothing optional before a choice (no third-party request,
  cookie or storage). Accept, reject, customize and withdraw all work,
  including across tabs. GPC is honoured. Nothing is pre-ticked; Accept and
  Reject look the same. Consent Mode v2 defaults are all denied, and only
  `analytics_storage` is ever granted. Clicks tracked before consent are
  never sent.
- **GA4 hits** carry no email, phone or name. Form events (`generate_lead`,
  `form_start`) carry no field values.
- **CSP:** hash-based scripts, vendor hosts only when configured.
- **SEO:** 59 indexable pages, each with a unique title and description,
  a self-canonical, reciprocal hreflang and one H1. No broken internal
  links, no orphans, and the sitemap matches the indexable set. 404 returns
  status 404.
- **Accessibility:** axe finds 0 violations other than A11Y-1 at desktop,
  mobile and 320 px. Lighthouse accessibility scores 100 on the pages
  tested.
- **Fonts:** self-hosted, preloaded, with a metric-matched fallback (CLS 0).
- **Images:** all have alt text and dimensions; AVIF/WebP with `srcset`.
- **Secrets:** none in the git history or `dist/`; no source maps; no
  `innerHTML` / `eval` sinks.

## Tests after the fixes

Run on 3–4 October 2026 against a build with the production configuration,
served locally with Brotli compression and real 404s.

| Test | Scope | Result |
|---|---|---|
| `npx tsc --noEmit` (after `astro sync`) | whole project | 0 errors |
| `astro build` | 77 pages | OK; CSP injected into 77 pages |
| `seo-check.mjs` | 77 pages, 59 in the sitemap | No missing or duplicate titles/descriptions, canonical mismatches, hreflang errors, broken links, orphans or missing alt text. Only remark: short descriptions on the two noindex search pages |
| `privacy-analytics-test.mjs` (real `gtag.js`) | fresh visit EN/FR/AR, accept, navigate, withdraw, reject, customize, GPC, site search, forms, thank-you page | **49 / 49** |
| `consent-live-config-test.mjs` | production consent set-up (stubbed Google) | 18 / 18 |
| `keyboard-test.mjs` | skip link, focus visibility, mega menu, language menu, consent dialog, pause button, reduced motion, Arabic headings, text spacing | 10 / 10 |
| axe-core, WCAG 2.0–2.2 A/AA + best practice | 77 pages at desktop 1366 px, mobile 375 px, tablet 820 px with reduced motion | **0 violations** (before: `target-size` on 70 pages) |
| Reflow (WCAG 1.4.10) | 77 pages at 320 px | No horizontal overflow |
| Lighthouse mobile (median of 3) | `/en/`, `/ar/`, `/fr/`, `/en/contact/` | see PERF-1; accessibility, best practices and SEO 100 |
| Visual check | header (desktop), home hero (390 px phone) | Header identical to before; phone hero shows the theme-matched still of the 3D mark |

Not covered: real screen readers (NVDA, VoiceOver, TalkBack), real phones,
Firefox and Safari, and the live HTTP headers after the owner's changes.

## Re-running the tests

The scripts in `scripts/audit/` need tools that are not project dependencies;
install them without saving:

```bash
npm i --no-save playwright axe-core node-html-parser lighthouse && npx playwright install chromium
PUBLIC_CONTACT_ENDPOINT=https://api.web3forms.com/submit npx astro build --outDir /tmp/dist-prod
npx http-server /tmp/dist-prod -p 4402 -s &   # any static server that returns 404.html with status 404
node scripts/audit/seo-check.mjs /tmp/dist-prod
node scripts/audit/privacy-analytics-test.mjs http://127.0.0.1:4402   # real gtag.js, hits blocked
node scripts/audit/consent-live-config-test.mjs http://127.0.0.1:4402
node scripts/audit/keyboard-test.mjs http://127.0.0.1:4402
node scripts/audit/crawl.mjs http://127.0.0.1:4402 /tmp/dist-prod desktop   # also: mobile, tablet, reflow; REDUCED=1
npx lighthouse http://127.0.0.1:4402/en/ --only-categories=performance   # serve with compression for realistic numbers
```

Note: builds made on this Windows machine keep some whitespace between inline
tags that the App Platform (Linux) build removes, for example a visible space
in "runs on ." in the English home headline. The live HTML is correct. The
cause was not identified: same Astro (5.18.2) and compiler (2.13.1) versions,
and an LF copy of the source gives the same result. For exact whitespace,
check the live page rather than a local build.
