# SEO, AEO & GEO strategy

## Positioning to search engines and answer engines

The site must answer, unambiguously and in three languages:

| Question | Where it is answered |
|---|---|
| Who is Atlaxys? | Home hero + FAQ, About ("Atlaxys at a glance"), `Organization` JSON-LD, `llms.txt` |
| What does it do? | Services index + 4 service pages (`Service` schema with offer catalog) |
| Where does it operate? | Morocco location page, `areaServed`, FAQ, footer |
| Who does it serve? | Industries section, landing pages, case studies |
| What technologies? | Tech spec sheet, service technologies, `knowsAbout` |
| What products? | Products pages (`SoftwareApplication` schema) |
| How to contact? | Contact page, `ContactPoint`, WhatsApp/email on every page |

Answer engines (Google AI Overviews, ChatGPT, Perplexity, Copilot) extract
from **clearly structured, factual text**. That is why the site uses spec
lists, FAQs with direct answers, consistent entity names ("Atlaxys
Consulting"), and a `/llms.txt` summary generated from the same content.

## Technical foundation (implemented)

- Unique `<title>` and meta description per page and language; canonical URLs.
- `hreflang` (en, fr, ar + `x-default`) in `<head>` and in `sitemap.xml`.
- Clean, localised slugs (`/fr/services/ingenierie-logicielle/`).
- Semantic HTML, one `h1` per page, logical heading order, breadcrumbs.
- JSON-LD `@graph`: Organization/ProfessionalService, WebSite + SearchAction,
  WebPage, BreadcrumbList, Service, SoftwareApplication, BlogPosting/Article,
  FAQPage (only where FAQs are visible), ItemList.
- Open Graph + X cards with a branded default image (1200×630).
- `robots.txt` allowing search engines and AI crawlers; `/api/`, search and
  thank-you pages excluded; campaign landing pages `noindex` by default.
- Core Web Vitals: static HTML, preloaded display font with metric-matched
  fallback, deferred/idle JS, responsive AVIF/WebP images, no layout shift
  from the hero (SVG first, WebGL cross-fades in).

## Keyword map

| Intent | EN target | FR target | AR target | Page |
|---|---|---|---|---|
| Brand | Atlaxys, Atlaxys Consulting | idem | idem | Home, About |
| Local, broad | software development company Morocco, software company Morocco, IT consulting Morocco | agence développement logiciel Maroc, agence informatique Maroc, consulting informatique Maroc | شركة تطوير برمجيات المغرب | Morocco page, Home |
| Software | software development Morocco, web development Morocco, mobile app development Morocco | développement logiciel Maroc, développement web Maroc, développement application Maroc | تطوير البرمجيات في المغرب، تطبيقات الهاتف | Software Engineering |
| AI | AI automation Morocco, business process automation | automatisation IA Maroc | الأتمتة بالذكاء الاصطناعي | AI & Automation + article |
| DevOps | DevOps consulting Morocco, cloud architecture AWS DigitalOcean | DevOps Maroc | DevOps والسحابة | DevOps & Cloud |
| Consulting | technology consulting Morocco, fractional CTO, technical audit | conseil technologique, CTO à temps partagé | الاستشارات التقنية | Technology Consulting |
| Informational | how much does custom software cost in Morocco | combien coûte un logiciel sur mesure au Maroc | — | Article |
| Informational | how to choose a software development company | choisir une société de développement logiciel | كيف تختار شركة تطوير برمجيات | Article |
| Product | gym management software | logiciel de gestion de salle de sport | برنامج إدارة القاعات الرياضية | Nexus Gym page + landing |

## Content plan (quality over volume)

Published (6 EN, 3 FR, 2 AR):
1. How much does custom software development cost in Morocco? (EN, FR)
2. How to choose a software development company (EN, FR, AR)
3. AI automation for Moroccan businesses — where to start (EN, FR, AR)
4. Custom ERP vs SaaS — a decision framework (EN)
5. A pragmatic DevOps baseline for small teams (EN)
6. Building internal business software people actually use (EN)

Next, in this order (each one linked to a service, a product or case study and
the Morocco page):
- Digital transformation for SMEs in Morocco — a practical roadmap (FR first)
- DevOps consulting in Morocco — what to expect (FR/EN)
- Gym management in Morocco — what software should handle (FR/AR, links Nexus Gym)
- Document management and e-archiving for Moroccan firms (FR, links Atlaxys Docs)
- Technical due diligence checklist for investors (EN)
- Translations of articles 4–6 into French; articles 1 and 4 into Arabic.

One genuinely useful article per month beats ten thin ones. Each article
should include: a direct answer in the first paragraph, specific steps or
tables, an FAQ block (2–3 real questions), internal links, and an updated date
when revised.

## Internal linking (automatic)

`src/lib/content/related.ts` links in both directions:

- Article → services, products, case studies, Morocco page (from `related`).
- Service → case studies, products and articles that reference it.
- Product → services, case studies, articles.
- Case study → services, products, similar case studies (industry/services).
- Location → posts and case studies linked to it.

Plus the mega-menu, footer (all services + products + Morocco), breadcrumbs
and in-text links in articles.

## Local SEO (Morocco) — actions outside the website

1. Create/verify a **Google Business Profile** once there is a public
   address (service-area business if not). Keep name, phone and website
   identical to `src/config/site.ts`.
2. Register in credible directories (Clutch, GoodFirms, DesignRush, local
   chambers of commerce, LinkedIn company page) with the same NAP details.
3. Add LinkedIn/Instagram/Facebook URLs to `site.social` so `sameAs` links
   the entity.
4. Collect **real** client reviews/testimonials (with permission) and publish
   real case studies — the strongest trust and ranking signal available.

## City and market expansion (without doorway pages)

- Add a city page (`locations/<lang>/casablanca.md` with `parent: morocco`)
  only when there is something specific to say: clients or projects there,
  on-site availability, local partners, sector focus.
- For new countries (France, Belgium, Canada, UK, UAE…), add a `country`
  location entry with market-specific content (time-zone overlap, language,
  compliance such as GDPR, case studies from that market).
- Consider `fr-MA` / `fr-FR` variants only if content genuinely differs.

## Measurement

- Google Search Console + Bing Webmaster Tools: submit `/sitemap.xml`,
  monitor coverage, queries and hreflang errors per language.
- GA4 (after consent): `generate_lead` is the key event, with
  `form`, `project_type`, `content_name`; `whatsapp_click`, `email_click`,
  `phone_click` as secondary conversions.
- Landing pages: compare `view_landing` → `generate_lead` by `utm_campaign`
  (UTM values are also stored with each lead).
