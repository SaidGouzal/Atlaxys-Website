# Production-readiness audit — accessibility, privacy, security, legal

**Date:** 1 October 2026 · **Scope:** the whole repository and the static build
(89 pages, EN/FR/AR) as deployed to DigitalOcean App Platform (Static Site).

**This is an engineering audit, not legal advice and not a certification.** It
does not claim the site is "GDPR compliant", "CCPA compliant" or compliant with
any law. Everything marked *legal review* must be confirmed by a qualified
Moroccan (and, where relevant, EU/US) lawyer or privacy professional.

Legend: **[Req]** legal requirement (as we understand it) · **[GP]** good
practice · **[Asm]** assumption.

---

## A. Fixed

### Privacy and consent
1. **Campaign attribution stored before consent** — `utm_*`, `gclid`, `fbclid`, the full referrer URL and the landing page were written to sessionStorage on every visit and sent with enquiries. Now captured **only after marketing consent**, the referrer is reduced to its origin, it is deleted on withdrawal, and the form only sends it when present. [Req under ePrivacy-style rules / GP]
2. **Consent never expired** → expires after **180 days** and whenever `consentVersion` changes (bumped to 2). [GP]
3. **Withdrawal didn't stop tracking** — turning a category off left vendor cookies (`_ga`, `_fbp`, `li_fat_id`…) and loaded vendor code in place. Withdrawal now deletes those first-party cookies (all parent domains) and reloads the page. [Req: withdrawal as easy as consent]
4. **No Global Privacy Control support** → GPC is treated as a refusal of marketing; the marketing switch is disabled with an explanation. [GP; Req where CCPA applies]
5. **Accept more prominent than Reject** (filled orange vs outline) → identical styling; the banner and the dialog both offer *Accept all / Reject non-essential / Manage preferences* (save). Nothing is pre-ticked. Scrolling/navigating is never treated as consent (tested). [Req]
6. **Misleading banner text** ("Anonymous traffic measurement" for GA4, which sets identifiers) → accurate descriptions plus the actual vendor names for each category, generated from configuration.
7. GA4 configured with Google signals off and `ads_data_redaction`; removed the no-op `anonymize_ip`.
8. **Single privacy inventory** (`src/config/privacy.ts`) — every storage key and recipient; the cookie and privacy policies render their tables from it, so they always match the deployed build (a tracker appears only when its ID is set).

### Legal pages
9. Rewrote **Privacy policy, Cookie policy, Terms of use** and added a **Legal notice** in English, French and Arabic, based on the actual implementation (see sections H and C). Footer and landing-page footer link to all four; all are indexable and in the sitemap.
10. Terms now clearly separate **website use** from **client contracts** (proposals/SOWs/agreements prevail), and avoid unenforceable clauses (no exclusion of liability for fraud/gross negligence, mandatory consumer protections preserved).
11. Company identifiers are **never invented**: `site.legal` holds RC, ICE, IF, address, etc. as `undefined`; only confirmed values render, and every build prints a `[launch-check]` list of what is missing.

### Forms
12. With the endpoint unset the form posted to `action=""` (i.e. nowhere). It is now replaced by direct email / WhatsApp / phone links in production builds.
13. `PUBLIC_CONTACT_ENDPOINT` must be an **https** URL (build fails otherwise); the client refuses non-https endpoints; `credentials: 'omit'`.
14. Privacy notice under the form states the purpose and the form provider; "All fields are required unless marked optional"; a hint not to send sensitive data; optional CNDP receipt notice once configured.
15. Invalid phone numbers got "This field is required" → a specific, helpful message.
16. Dead code that depended on the removed server (`?form=` error states) removed.

### Security
17. **No Content-Security-Policy at all** on the static build → per-page CSP `<meta>` generated at build time: hash-based `script-src` (no `unsafe-inline`/`unsafe-eval`), vendor hosts allowlisted only when configured, `form-action`/`connect-src` limited to the form endpoint, `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'`.
18. `Referrer-Policy: strict-origin-when-cross-origin` (meta).
19. Public IDs validated against strict patterns at build time (prevents script injection through the inline analytics bootstrap — relevant because Astro 5's `define:vars` has a known sanitisation advisory).
20. **High-severity `sharp` advisories** (libvips/libheif) in Astro's nested copy → npm override to the patched version.
21. Removed the `generator` meta (advertised the Astro version).
22. `robots.txt` disallowed `noindex` pages (crawlers could never see their `noindex`) and a non-existent `/api/` → now relies on `noindex`.
23. App spec set both `error_document` and `catchall_document` (the latter answers unknown URLs with 200 — soft 404s). Removed; placeholder form URL removed from the spec.

### Accessibility (WCAG 2.2 AA)
24. **Headings hidden from screen readers** — pre-animation state used `visibility:hidden` (and GSAP `autoAlpha` on Arabic pages), removing headings from the accessibility tree until scrolled to (axe `heading-order` on Arabic pages). Now `opacity` only. [1.3.1, 2.4.6]
25. **Continuous hero animation without pause** (WebGL field, SVG pulses, CSS loops) → visible *Pause background animation* button, which freezes the WebGL render loop and all CSS animations. [2.2.2]
26. 404 page cursor blinked forever → stops after ~5 s. [2.2.2]
27. Video component: looping autoplay without controls → native controls always, autoplay never overrides a user's pause. (Component currently unused.) [2.2.2]
28. **Focus could land on invisible elements** — revealed content still at opacity 0, and the floating WhatsApp button while the consent banner hid it → focused content is always shown; the button leaves the tab order when hidden. [2.4.7, 2.4.11]
29. **Consent banner** moved first in the tab order (after the skip link); while visible, `scroll-padding-bottom` keeps focused elements from being hidden behind it; after a choice, focus moves to `<main>` instead of being lost. [2.4.3, 2.4.11]
30. **Reflow at 320 CSS px** — 15 pages cut content off (long French/Arabic words in large headings, non-wrapping CTA buttons, breadcrumb current item, search row, and my own new French pause-button label). Fixed with `overflow-wrap: anywhere`, hyphenation on very small screens, wrapping buttons, shrinkable grid items. Now 0 pages. [1.4.10]
31. Contact page form states used `<h3>` directly under `<h1>` → heading level is now configurable (h2 there). [1.3.1]
32. `prefers-contrast: more` support (stronger secondary text, hairlines, control borders) and forced-colors styling for the consent switches. [GP]
33. "Opens in a new tab" notice added to WhatsApp links that lacked it. [3.2.5 GP]
34. **Wide Markdown tables** (articles, privacy policy) became horizontally scrollable on phones but could not be reached by keyboard (axe `scrollable-region-focusable`), and were styled `display:block` (which can drop table semantics). A build-time rehype plugin now wraps every Markdown/MDX table in a focusable, labelled scroll region; tables keep native table semantics. [2.1.1, 1.4.10]
35. Consent switches stay visible in Windows High Contrast (forced colours). [1.4.11]

---

## B. Remaining risks (need human / legal / security review)

| Risk | Why it remains | Recommended action |
|---|---|---|
| **HTTP-only security headers not applied** (HSTS, `frame-ancestors`/X-Frame-Options, `X-Content-Type-Options`, Permissions-Policy) | Cannot be set from HTML; App Platform header support for Static Sites could not be verified from the audit environment | Apply the set in [SECURITY.md](SECURITY.md) at App Platform or a CDN; verify with `curl -I` / Mozilla Observatory |
| **Astro 5.18.2 advisories** (incl. one rated critical) and **Node 20 end-of-life** (April 2026) | Fixes exist only in Astro ≥ 7.2.8 (Node 22). Most concern SSR/dev server, not this static output; the image one needs a malicious image in the repo | Plan the upgrade to Node 22 LTS + Astro 7 |
| **Form provider not chosen** | Server-side validation, spam filtering, rate limiting, CORS and retention all depend on it | Choose one meeting the checklist in SECURITY.md; sign its DPA; name it in `src/config/privacy.ts` |
| **Google Tag Manager** | Whoever controls the container can add tags; CSP blocks custom-HTML tags by design | Prefer GA4 directly; if GTM is used, keep it to built-in Google tags and configure consent checks |
| Vendor cookie names/durations | Taken from vendor documentation; vendors change them | Re-check when enabling a vendor |
| Third-party cookies on vendor domains (linkedin.com, facebook.com) | We cannot read or delete them | Documented in the cookie policy |
| Hosting logs | DigitalOcean's retention of request logs (IP addresses) for Static Sites is not documented in the repo | Confirm and, if needed, state the period in the privacy policy |
| No manual screen-reader pass | No NVDA/JAWS/VoiceOver/TalkBack available in the audit environment | Do a short pass on home, contact (form errors), consent dialog, mobile menu, Arabic pages |
| FAQ accordions put headings inside `<summary>` | Some screen readers flatten headings inside `summary`; content remains reachable | Acceptable; revisit if a screen-reader pass shows problems |
| FR/AR legal translations | Written carefully but not by a native legal translator | Native-speaker and legal review |

---

## C. Legal TODOs (Atlaxys must provide, decide, register or confirm)

The build prints the open configuration items as `[launch-check]` warnings.

1. **Company identification** in `src/config/site.ts` → `site.legalName` and `site.legal`: legal form, share capital, **RC** (number + court), **ICE**, **IF**, registered office address, publication director. *Not invented — currently missing.*
2. **CNDP formalities** *(legal review)*: declaration (or authorisation where required) for the processing done through the site — enquiries/prospects, and analytics/advertising if enabled — and add the receipt number to `site.legal.cndpReceipt` (it then appears under every form).
3. **Transfers outside Morocco** *(legal review)*: hosting (DigitalOcean, USA), the form provider, the email provider and any analytics/ad vendor may involve transfers to countries without CNDP-recognised adequacy (Law 09-08, arts. 43–44). Confirm the authorisation/exception relied on.
4. **Form provider**: choose it, sign its DPA, set its retention, then fill `formProcessor` in `src/config/privacy.ts`.
5. **Email provider** for `hello@atlaxys.com` (Google Workspace, Microsoft 365…): confirm; add to the inventory if counsel wants it named.
6. **Retention periods** to confirm: enquiries 24 months after last exchange (carried over from the original policy draft); client records "generally 10 years" for accounting (confirm with your accountant); GA4 event-data retention setting (≤ 14 months).
7. **GDPR applicability** *(legal review)*: the site targets EU clients (French language, EUR budgets, "Europe" in markets) and may monitor EU visitors if analytics are enabled (GDPR art. 3(2)). Decide whether an **EU representative (art. 27)** is required; if so fill `site.legal.euRepresentative`.
8. **US state laws**: we assumed Atlaxys is below CCPA/CPRA and other state-law thresholds. If that changes (or Meta/LinkedIn tags are enabled at scale), add a "Do Not Sell or Share / Your Privacy Choices" link (the "Cookie settings" dialog already provides the opt-out and GPC is honoured).
9. **Terms**: confirm the competent court (city of the registered office), whether a language-precedence clause is wanted (EN/FR/AR), and whether Moroccan consumer law (Law 31-08) or electronic-commerce rules (Law 53-05) impose extra information for this B2B site.
10. **Trademark**: the terms do not claim "Atlaxys" is a registered mark. If registered with OMPIC, say so.
11. **Illustrative content**: demo case studies/products are labelled; keep the labels until real ones replace them (misleading-advertising risk).
12. **Decide which trackers to enable**, if any. The current `.do/app.yaml` ships none — so no consent banner and no optional cookies at all.

---

## D. Third-party services

| Service | Purpose | Data | Storage | Necessary? | Consent before loading? | Loaded |
|---|---|---|---|---|---|---|
| DigitalOcean App Platform (DigitalOcean, LLC, USA) | Hosting/CDN | IP, user agent, URL, time | — | Yes | No (needed to serve the site) | Always |
| Form provider *(to be chosen)* | Receives enquiries | Form fields, page, IP; attribution only with marketing consent | Provider's | Yes, for the form | No (user-initiated) | On submit, only if `PUBLIC_CONTACT_ENDPOINT` set |
| WhatsApp (Meta) | Chat | Whatever the user sends in WhatsApp | WhatsApp's | User-initiated | No (link only — nothing sent before click) | On click |
| Email / phone | Contact | Message content | Mail provider *(TBC)* | User-initiated | No | On click |
| Google Analytics 4 | Audience measurement | `_ga` identifiers, pages, events, IP (not stored by GA4) | `_ga`, `_ga_<ID>` | No | **Yes — analytics** | Only if `PUBLIC_GA4_ID` set (not set today) |
| Google Tag Manager | Tag loader | IP, browser data; then depends on tags | depends | No | **Yes — analytics** | Only if `PUBLIC_GTM_ID` set (not set today) |
| Meta Pixel | Ad measurement/audiences | `_fbp`/`_fbc`, pages, Lead/Contact events | `_fbp`, `_fbc` + facebook.com cookies | No | **Yes — marketing** | Only if `PUBLIC_META_PIXEL_ID` set (not set today) |
| LinkedIn Insight Tag | Ad measurement/audiences | identifiers, pages, conversions | `li_fat_id`, `li_sugr` + linkedin.com cookies | No | **Yes — marketing** | Only if `PUBLIC_LINKEDIN_PARTNER_ID` set (not set today) |

**Not used (verified in code and in the built HTML):** Google Fonts (fonts are self-hosted via `@fontsource-variable`), maps, video embeds, social plugins, CAPTCHA, CRM scripts, chat widgets, AI APIs, error tracking/monitoring, CDN-hosted libraries. GSAP and Three.js are bundled and served from the site's own origin. GitHub hosts the source code only (no visitor data).

---

## E. Cookies and browser storage

| Name | Type | Category | Set when | Duration |
|---|---|---|---|---|
| `atlaxys-consent` | localStorage | Strictly necessary | A consent choice is made (only exists when a tracker is configured) | 180 days, then re-asked |
| `atlaxys-lang` | localStorage | Preferences (user-requested) | The visitor clicks a language in the switcher | Until cleared |
| `atlaxys-attribution` | sessionStorage | Marketing (consent) | After marketing consent | Until the tab closes; deleted on withdrawal |
| `_ga`, `_ga_<ID>` | Cookie (first-party, set by Google) | Analytics (consent) | After analytics consent, if GA4 configured | 2 years (vendor) |
| `_fbp`, `_fbc` | Cookie (first-party, set by Meta) | Marketing (consent) | After marketing consent, if Meta configured | 90 days (vendor) |
| `li_fat_id`, `li_sugr` | Cookie (first-party, set by LinkedIn) | Marketing (consent) | After marketing consent, if LinkedIn configured | 30–90 days (vendor) |
| `bcookie`, `lidc`, `UserMatchHistory`, `AnalyticsSyncHistory` | Cookie (third-party, linkedin.com) | Marketing (consent) | Same | 24 h – 1 year (vendor) |

**With the current production configuration (no tracker IDs) the site sets no cookies at all**; the only possible storage is `atlaxys-lang`, after an explicit language click. *[Asm] treated as a user-requested preference that does not require consent — legal review.*

---

## F. Security — findings and remediation

| Finding | Severity | Status |
|---|---|---|
| No CSP on the static build | High | **Fixed** (hash-based meta CSP, vendor allowlist per configuration) |
| HSTS / frame-ancestors / nosniff / Permissions-Policy absent | Medium | **Open** — header-only; documented in SECURITY.md |
| Nested `sharp` with high-severity libvips/libheif CVEs | High (build-time) | **Fixed** (override) |
| Astro 5 advisories (SSR/dev-server/image) & Node 20 EOL | Critical (as rated) / low exploitability for static output | **Open** — upgrade recommended |
| esbuild dev-server file read (Windows only) | Low | Open (dev only) |
| Inline analytics bootstrap built from env values (`define:vars`) | Medium | **Fixed** (strict ID validation) |
| Form could post to an empty/insecure endpoint | Medium | **Fixed** (https enforced at build and runtime; fallback without endpoint) |
| Client-only validation | Medium | **Open by design** — server-side validation is the provider's job (requirements listed) |
| Framework version disclosed (`generator`) | Info | **Fixed** |
| robots.txt referencing `/api/` and hiding `noindex` pages | Info | **Fixed** |
| Soft-404 via `catchall_document` | Low | **Fixed** |
| Secrets / `.env` / keys in repo or history | — | **None found** (history grep; only `.env.example` with empty values) |
| Source maps / debug output in `dist/` | — | **None** (no `.map`; no debug endpoints; GSAP's internal warnings only) |
| XSS sinks | — | **None found**: no `innerHTML`/`eval`/`new Function` in app code or bundles; search and form errors use `textContent`; JSON-LD escaped; `set:html` used only for icons, fonts CSS and generated JSON |
| Open redirects / unsafe URL handling | — | **None**: no redirect parameters; `?product=` is pattern-checked; external links use `rel="noopener noreferrer"` |
| CSRF / auth / file upload / CORS | — | Not applicable (no server, no accounts, no uploads); CORS is the form provider's configuration |
| Clickjacking | Low | Mitigated only once `frame-ancestors` header is applied (no state-changing actions on the site) |

---

## G. Accessibility — findings and remediation

See A.24–A.33. Already in good shape before the audit (verified): skip link, landmarks, one `<h1>` per page, native `<dialog>` modals with focus trap/restore, disclosure menus with Esc and focus return, real `<label>`s, error summary with focus, `aria-live` status, `autocomplete` tokens, 44 px touch targets, reduced-motion handling (no GSAP/WebGL, no transitions), RTL support, visible `:focus-visible` outlines (including stretched-link cards), token contrast ratios ≥ 4.5:1 for text (computed: muted text 6.7:1, signal 8.4:1, light-theme muted 7.2:1).

---

## H. Privacy — what the website actually collects

| Flow | User → website → service | Data | Purpose | Retention | Recipients |
|---|---|---|---|---|---|
| Page view | Browser → App Platform | IP, user agent, URL, time | Deliver/secure the site | DigitalOcean's log policy *(TBC)* | DigitalOcean (+ its CDN subprocessors) |
| Contact / landing form | Browser → HTTPS JSON POST → form provider → Atlaxys inbox | name, email; optional company, phone, country, project type, budget, timeline, message; locale; source page; landing/campaign slugs (from page, not tracking); honeypot + `startedAt`; attribution **only with marketing consent**; IP (seen by provider) | Answer the enquiry / proposal | 24 months after last exchange *(TBC)* | Form provider *(TBC)*, Atlaxys |
| Email / phone / WhatsApp | Browser → user's own app | What the user sends | Answer | Same as above | Mail provider *(TBC)*, WhatsApp/Meta |
| Consent choice | Browser only | categories, date, version, GPC flag | Remember the choice | 180 days | None |
| Language choice | Browser only | language code | Open site in that language | Until cleared | None |
| Attribution | Browser (session) → with form | utm_*, gclid/fbclid, referrer origin, landing page | Campaign measurement | Tab session / with enquiry | Form provider, Atlaxys |
| Analytics (if enabled + consent) | Browser → Google | identifiers, pages, events, IP | Audience measurement | ≤ 14 months event data | Google |
| Advertising (if enabled + consent) | Browser → Meta / LinkedIn | identifiers, pages, Lead/Contact events | Ad measurement/audiences | Vendor policies | Meta, LinkedIn |
| Site search | Browser only (index fetched from own origin) | query text (in `?q=` on the site's own URL) | Find pages | Not stored by Atlaxys; may appear in hosting logs if a `?q=` URL is loaded | DigitalOcean (logs) |

Click tracking (`data-track`) only pushes events to an in-page `dataLayer`; nothing leaves the browser unless a vendor was allowed to load.

---

## I. Compliance assumptions

1. Atlaxys Consulting is established in Morocco and is the controller; Law 09-08 applies. [Asm]
2. The site is B2B and not directed at children. [Asm]
3. GDPR may apply under art. 3(2) (targeting EU clients; monitoring if analytics enabled). We applied GDPR principles and rights as good practice without asserting full applicability. [Asm — legal review]
4. Atlaxys is below CCPA/CPRA and other US state-law thresholds. [Asm — confirm]
5. Production ships **no trackers** unless IDs are added to `.do/app.yaml`. [Fact, from the spec]
6. The language preference in localStorage is user-requested and exempt from consent. [Asm — legal review]
7. 180-day consent lifetime is good practice (aligned with common EU regulator guidance), not a Moroccan statutory value. [GP]
8. Accounting records: "generally 10 years" under Moroccan law. [Asm — confirm with accountant]
9. Vendors' DPF certification / SCCs are as published by them. [Asm — verify]
10. DigitalOcean App Platform header support for Static Sites is unverified. [Asm]
11. GA4 event-data retention maximum of 14 months (standard property). [Vendor documentation]

---

## J. Files changed or created

**Created:** `integrations/csp.mjs` · `integrations/rehype-table-scroll.mjs` · `src/config/privacy.ts` · `src/lib/launch-check.ts` · `src/components/legal/{StorageTable,ServiceTable,CompanyDetails}.astro` · `src/content/legal/en/{privacy,cookies,terms,legal-notice}.mdx` · `src/content/legal/fr/{confidentialite,cookies,conditions-utilisation,mentions-legales}.mdx` · `src/content/legal/ar/{privacy,cookies,terms,legal-notice}.mdx` · `docs/SECURITY.md` · `docs/AUDIT.md` · `scripts/audit/*` (regression tests)

**Deleted:** the nine template `src/content/legal/*/*.md` files (replaced by the `.mdx` versions above, same URLs).

**Modified:** `.do/app.yaml` · `astro.config.mjs` · `package.json` · `package-lock.json` · `README.md` · `docs/{ARCHITECTURE,DEPLOYMENT,QUALITY-AUDIT}.md` · `src/content.config.ts` · `src/env.d.ts` · `src/config/{site,analytics,navigation}.ts` · `src/i18n/ui/{en,fr,ar}.ts` · `src/layouts/BaseLayout.astro` · `src/components/layout/{AnalyticsHead,ConsentBanner,MobileNav,WhatsAppFloat}.astro` · `src/components/forms/LeadForm.astro` · `src/components/home/Hero.astro` · `src/components/seo/Breadcrumbs.astro` · `src/components/ui/{Button,Icon,Video}.astro` · `src/pages/{index.astro,404.astro,robots.txt.ts}` · `src/pages/[lang]/{contact/index,legal/[slug],search/index}.astro` · `src/scripts/main.ts` · `src/scripts/analytics/{attribution,consent,vendors}.ts` · `src/scripts/forms/lead-form.ts` · `src/scripts/hero/{index,signal-scene}.ts` · `src/scripts/motion/enhance.ts` · `src/styles/{base,motion,prose,tokens}.css`

---

## K. Testing

All runs against the production build served statically (two builds: the
real configuration with no trackers, and a test build with fake IDs for
GA4/GTM/Meta/LinkedIn and a fake https form endpoint, all third-party hosts
intercepted). Scripts are in `scripts/audit/`.

| Tool / check | Scope | Result |
|---|---|---|
| `astro check` | TypeScript + Astro | 0 errors, 0 warnings |
| `npm run build` | 89 pages | OK; CSP injected into all 89 |
| axe-core 4.13 (WCAG 2.0/2.1/2.2 A+AA + best practice) | all 89 pages × desktop 1366, tablet 820 (with banner), mobile 375 (with banner), desktop with reduced motion | Before: `heading-order` on Arabic pages (hidden headings). After: **0 violations** on every page and viewport (the one mobile finding during the audit, `scrollable-region-focusable` on 2 articles, was fixed — A.34) |
| Lighthouse 12 (accessibility, best practices, SEO) | /en/, /en/contact/, /ar/legal/privacy/, /fr/legal/cookies/ | 100 / 100 / 100 on each |
| CSP violation crawl (`securitypolicyviolation` + console) | all 89 pages, with and without vendors, WebGL + GSAP running | **0 violations** (with all four vendors enabled after consent, and with none) |
| Reflow: content cut off or page wider than viewport | all 89 pages at 320 px (with and without banner) and 375 px | Before: 15 pages cut content at 320 px. After: **0 pages** at 320 px and 375 px |
| Text-spacing override (WCAG 1.4.12) | contact page | No clipped text |
| Consent & privacy regression | 38 scripted checks: no request/cookie/storage before consent; browsing ≠ consent; banner first in tab order; Accept/Reject identical; reject; accept; per-category; withdrawal deletes cookies + attribution and stops vendors; GPC; expiry; version change; form payload without attribution; form endpoint; error summary; phone error; success focus; mobile menu dialog | **38 / 38 pass** |
| Keyboard & motion | skip link; visible focus on the first 60 tab stops; mega-menu and language menu (Enter/Esc/focus return); consent dialog (modal, trapped, Esc, focus return); hero pause; reduced motion; Arabic headings never `visibility:hidden` | **10 / 10 pass** |
| `npm audit` | dependencies | 3 remaining (1 critical, 2 low) — all in Astro 5 / its esbuild; see F |
| Secrets scan (git history + `dist/`) | repository | none found |
| Manual review | every component, script, page template, config and legal text | see sections A–G |

Not performed: real screen readers, real mobile devices, browsers other than
Chromium (Firefox/Safari), deployed HTTP headers (no deployment from this
environment).

### Re-running the tests

```bash
npm run build && npx http-server dist -p 4400 -s &            # real configuration
PUBLIC_GA4_ID=G-TEST12345 PUBLIC_GTM_ID=GTM-TEST123 PUBLIC_META_PIXEL_ID=1234567890123 \
PUBLIC_LINKEDIN_PARTNER_ID=1234567 PUBLIC_CONTACT_ENDPOINT=https://forms.example.com/submit \
  npx astro build --outDir /tmp/dist-consent && npx http-server /tmp/dist-consent -p 4401 -s &
npm i --no-save playwright axe-core && npx playwright install chromium
node scripts/audit/consent-test.mjs http://127.0.0.1:4401
node scripts/audit/keyboard-test.mjs http://127.0.0.1:4401
node scripts/audit/crawl.mjs http://127.0.0.1:4400 dist desktop      # axe + CSP + console
node scripts/audit/overflow.mjs http://127.0.0.1:4400 dist 320       # reflow
```
