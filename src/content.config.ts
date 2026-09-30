/**
 * Content model.
 *
 * Two storage patterns, one rule of thumb:
 *   • Long-form, language-specific writing  → Markdown, one file per language:
 *       src/content/<collection>/<locale>/<slug>.md
 *     Files in different languages are linked by `translationKey`.
 *   • Structured, mostly language-neutral data → JSON, one file per item, with
 *     translatable fields written as either a plain string or
 *     { "en": "…", "fr": "…", "ar": "…" }:
 *       src/content/products/<slug>.json
 *
 * The file name is the URL slug. Every schema below is enforced at build time:
 * a missing field or an image without alt text fails the build with a clear
 * message instead of shipping a broken page.
 *
 * Pages never read collections directly — they go through src/lib/content/,
 * which is the seam for swapping in a headless CMS later.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { projectTypes } from './config/forms';

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

/** Keep the locale folder in the id: "fr/ingenierie-logicielle". */
const idFromPath = ({ entry }: { entry: string }) => entry.replace(/\.(mdx?|json)$/i, '');

const perLocale = (collection: string, extensions = '{md,mdx}') =>
  glob({ pattern: `{en,fr,ar}/**/*.${extensions}`, base: `./src/content/${collection}`, generateId: idFromPath });

/** A value that is either shared by every language or translated per language. */
const localized = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.object({ en: schema, fr: schema.optional(), ar: schema.optional() })]);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const seo = z
  .object({
    /** Overrides the <title>; the brand suffix is added automatically. */
    title: z.string().optional(),
    description: z.string().max(200).optional(),
    noindex: z.boolean().default(false),
  })
  .default({});

const faq = z.object({ question: z.string(), answer: z.string() });

const titledText = z.object({ title: z.string(), text: z.string() });

/** Cross-links between content, by translationKey (or file name for products). */
const relations = z
  .object({
    services: z.array(z.string()).default([]),
    products: z.array(z.string()).default([]),
    caseStudies: z.array(z.string()).default([]),
    posts: z.array(z.string()).default([]),
    locations: z.array(z.string()).default([]),
  })
  .default({});

// ---------------------------------------------------------------------------
// Services — what Atlaxys does for clients
// ---------------------------------------------------------------------------
const services = defineCollection({
  loader: perLocale('services'),
  schema: z.object({
    translationKey: z.string(),
    title: z.string(),
    /** Shorter label for menus; defaults to `title`. */
    navLabel: z.string().optional(),
    /** One line under the title in menus and lists. */
    tagline: z.string(),
    /** Two sentences for cards, search and meta description fallback. */
    summary: z.string(),
    order: z.number().int().default(100),
    seo,
    hero: z.object({ eyebrow: z.string().optional(), title: z.string(), lead: z.string() }),
    capabilities: z
      .array(z.object({ title: z.string(), description: z.string(), items: z.array(z.string()).default([]) }))
      .min(1),
    deliverables: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    approach: z.array(titledText).default([]),
    faqs: z.array(faq).default([]),
    related: relations,
    keywords: z.array(z.string()).default([]),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// Products — software Atlaxys builds and licenses (one JSON file per product)
// ---------------------------------------------------------------------------
const products = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/products', generateId: idFromPath }),
  schema: ({ image }) => {
    const media = z.object({
      src: image(),
      alt: localized(z.string().min(1)),
      caption: localized(z.string()).optional(),
    });
    return z
      .object({
        /** Optional — defaults to the file name. */
        slug: z.string().regex(slugPattern).optional(),
        name: z.string().optional(),
        /** Alias of `name`, accepted for convenience. */
        title: z.string().optional(),
        tagline: localized(z.string()),
        description: localized(z.string()),
        category: localized(z.string()),
        status: z.enum(['available', 'beta', 'in-development', 'coming-soon']).default('available'),
        audience: localized(z.string()).optional(),
        platforms: z.array(z.string()).default([]),
        features: z.array(z.object({ title: localized(z.string()), description: localized(z.string()) })).default([]),
        technologies: z.array(z.string()).default([]),
        cover: media.optional(),
        images: z.array(media).default([]),
        pricing: z
          .object({
            model: z.enum(['subscription', 'license', 'one-time', 'quote', 'free']),
            currency: z.string().length(3).default('MAD'),
            note: localized(z.string()).optional(),
            plans: z
              .array(
                z.object({
                  name: localized(z.string()),
                  price: z.number().nonnegative().optional(),
                  period: z.enum(['month', 'year', 'one-time']).optional(),
                  features: z.array(localized(z.string())).default([]),
                  highlighted: z.boolean().default(false),
                }),
              )
              .default([]),
          })
          .optional(),
        demoUrl: z.string().url().optional(),
        downloadUrl: z.string().url().optional(),
        docsUrl: z.string().url().optional(),
        services: z.array(z.string()).default([]),
        caseStudies: z.array(z.string()).default([]),
        posts: z.array(z.string()).default([]),
        faqs: z.array(z.object({ question: localized(z.string()), answer: localized(z.string()) })).default([]),
        featured: z.boolean().default(false),
        order: z.number().default(100),
        /** Placeholder product — shows a visible "working title" notice. */
        demo: z.boolean().default(false),
        seo: z
          .object({ title: localized(z.string()).optional(), description: localized(z.string()).optional() })
          .default({}),
        updatedAt: z.coerce.date().optional(),
        draft: z.boolean().default(false),
      })
      .refine((p) => Boolean(p.name ?? p.title), { message: 'A product needs a "name".' });
  },
});

// ---------------------------------------------------------------------------
// Case studies — challenge → thinking → architecture → execution → outcome
// ---------------------------------------------------------------------------
const caseStudies = defineCollection({
  loader: perLocale('case-studies'),
  schema: ({ image }) => {
    const media = z.object({ src: image(), alt: z.string().min(1), caption: z.string().optional() });
    return z.object({
      translationKey: z.string(),
      title: z.string(),
      summary: z.string(),
      client: z.object({
        name: z.string(),
        descriptor: z.string(),
        location: z.string().optional(),
        url: z.string().url().optional(),
      }),
      /** Industry id (file name in src/content/industries). */
      industry: z.string(),
      services: z.array(z.string()).default([]),
      products: z.array(z.string()).default([]),
      year: z.number().int().optional(),
      duration: z.string().optional(),
      role: z.string().optional(),
      cover: media.optional(),
      gallery: z.array(media).default([]),
      challenge: z.string(),
      thinking: z.string(),
      architecture: z.object({
        summary: z.string(),
        layers: z.array(z.object({ name: z.string(), items: z.array(z.string()).min(1) })).min(1),
      }),
      execution: z.array(z.object({ phase: z.string(), detail: z.string() })).default([]),
      stack: z.array(z.string()).default([]),
      outcome: z.object({
        summary: z.string(),
        results: z.array(z.object({ label: z.string(), detail: z.string() })).default([]),
      }),
      testimonial: z.object({ quote: z.string(), author: z.string(), role: z.string().optional() }).optional(),
      related: relations,
      featured: z.boolean().default(false),
      order: z.number().default(100),
      /** Illustrative content — shows a visible notice and never claims real results. */
      demo: z.boolean().default(false),
      seo,
      publishedAt: z.coerce.date(),
      draft: z.boolean().default(false),
    });
  },
});

// ---------------------------------------------------------------------------
// Insights (blog)
// ---------------------------------------------------------------------------
const blog = defineCollection({
  loader: perLocale('blog'),
  schema: ({ image }) =>
    z.object({
      /** Links translations of the same article; defaults to the file name. */
      translationKey: z.string().optional(),
      title: z.string(),
      description: z.string().max(200),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      author: z.object({ name: z.string(), role: z.string().optional(), url: z.string().url().optional() }).optional(),
      category: z.string(),
      tags: z.array(z.string()).default([]),
      cover: z.object({ src: image(), alt: z.string().min(1) }).optional(),
      featured: z.boolean().default(false),
      related: relations,
      faqs: z.array(faq).default([]),
      seo,
      demo: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

// ---------------------------------------------------------------------------
// Campaign landing pages (Meta / Google Ads) — one JSON file per page
// ---------------------------------------------------------------------------
const landingSections = [
  'hero',
  'audience',
  'problem',
  'solution',
  'benefits',
  'proof',
  'process',
  'faq',
  'form',
] as const;

const landingPages = defineCollection({
  loader: perLocale('landing-pages', 'json'),
  schema: z.object({
    translationKey: z.string().optional(),
    /** Internal campaign name, sent with the lead for attribution. */
    campaign: z.string().optional(),
    seo: z.object({
      title: z.string(),
      description: z.string().max(200),
      /** Ad landing pages are excluded from search by default. */
      noindex: z.boolean().default(true),
    }),
    hero: z.object({
      eyebrow: z.string().optional(),
      title: z.string(),
      lead: z.string(),
      bullets: z.array(z.string()).default([]),
      primaryCta: z.string().optional(),
      whatsappCta: z.string().optional(),
      whatsappMessage: z.string().optional(),
    }),
    audience: z.object({ title: z.string(), items: z.array(z.string()) }).optional(),
    problem: z.object({ title: z.string(), intro: z.string().optional(), points: z.array(z.string()) }).optional(),
    solution: z
      .object({ title: z.string(), text: z.string(), points: z.array(titledText).default([]) })
      .optional(),
    benefits: z.object({ title: z.string(), items: z.array(titledText) }).optional(),
    proof: z
      .object({
        title: z.string(),
        text: z.string().optional(),
        items: z.array(titledText).default([]),
        caseStudies: z.array(z.string()).default([]),
        products: z.array(z.string()).default([]),
      })
      .optional(),
    process: z.object({ title: z.string(), steps: z.array(titledText) }).optional(),
    faq: z.object({ title: z.string(), items: z.array(faq) }).optional(),
    form: z
      .object({
        title: z.string().optional(),
        text: z.string().optional(),
        projectType: z.enum(projectTypes).optional(),
        variant: z.enum(['compact', 'full']).default('compact'),
      })
      .default({}),
    /** Section order; omit to use the default order. Unlisted sections are hidden. */
    sections: z.array(z.enum(landingSections)).optional(),
    services: z.array(z.string()).default([]),
    tracking: z
      .object({
        /** Sent as `content_name` with the Meta Lead event. */
        contentName: z.string().optional(),
      })
      .default({}),
    draft: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// Industries — taxonomy (pages only when there is real content to publish)
// ---------------------------------------------------------------------------
const industries = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/industries', generateId: idFromPath }),
  schema: z.object({
    name: localized(z.string()),
    summary: localized(z.string()),
    examples: localized(z.array(z.string())).optional(),
    services: z.array(z.string()).default([]),
    order: z.number().default(100),
    /** Generate /industries/<slug>/ — only enable once the entry has substantial, unique content. */
    publishPage: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// Locations — country / city pages (no doorway pages: publish only unique content)
// ---------------------------------------------------------------------------
const locations = defineCollection({
  loader: perLocale('locations'),
  schema: z.object({
    translationKey: z.string(),
    name: z.string(),
    kind: z.enum(['country', 'region', 'city']),
    /** translationKey of the parent location (e.g. a city's country). */
    parent: z.string().optional(),
    countryCode: z.string().length(2),
    seo,
    hero: z.object({ eyebrow: z.string().optional(), title: z.string(), lead: z.string() }),
    highlights: z.array(titledText).default([]),
    services: z.array(z.string()).default([]),
    faqs: z.array(faq).default([]),
    related: relations,
    geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
    publish: z.boolean().default(true),
    updatedAt: z.coerce.date().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Legal pages
// ---------------------------------------------------------------------------
const legal = defineCollection({
  loader: perLocale('legal'),
  schema: z.object({
    translationKey: z.enum(['privacy', 'terms', 'cookies']),
    title: z.string(),
    description: z.string(),
    updatedAt: z.coerce.date(),
  }),
});

// ---------------------------------------------------------------------------
// Page copy for fixed pages (home, about, contact, section intros)
// ---------------------------------------------------------------------------
const pageSeo = z.object({ title: z.string(), description: z.string().max(200) });
const heroBlock = z.object({ eyebrow: z.string().optional(), title: z.string(), lead: z.string().optional() });
const sectionIntro = z.object({ eyebrow: z.string().optional(), title: z.string(), intro: z.string().optional() });
const ctaBlock = z.object({ title: z.string(), text: z.string() });

const homePage = z.object({
  page: z.literal('home'),
  seo: pageSeo,
  hero: z.object({
    eyebrow: z.string(),
    /** Wrap words in *asterisks* to give them the signal-trace underline. */
    title: z.string(),
    lead: z.string(),
    primaryCta: z.string(),
    secondaryCta: z.string(),
    capabilities: z.array(z.string()),
  }),
  statement: z.object({ eyebrow: z.string(), text: z.string() }),
  services: sectionIntro,
  process: sectionIntro.extend({
    steps: z.array(z.object({ title: z.string(), text: z.string(), outputs: z.array(z.string()) })).min(1),
  }),
  work: sectionIntro,
  products: sectionIntro,
  stack: sectionIntro,
  industries: sectionIntro,
  principles: sectionIntro.extend({ items: z.array(titledText) }),
  insights: sectionIntro,
  faq: sectionIntro.extend({ items: z.array(faq) }),
  cta: ctaBlock,
});

const aboutPage = z.object({
  page: z.literal('about'),
  seo: pageSeo,
  hero: heroBlock,
  story: sectionIntro.extend({ paragraphs: z.array(z.string()) }),
  facts: z.object({ title: z.string(), items: z.array(z.object({ label: z.string(), value: z.string() })) }),
  engagement: sectionIntro.extend({
    items: z.array(z.object({ title: z.string(), text: z.string(), bestFor: z.string() })),
  }),
  refusals: sectionIntro.extend({ items: z.array(z.string()) }),
  cta: ctaBlock,
});

const contactPage = z.object({
  page: z.literal('contact'),
  seo: pageSeo,
  hero: heroBlock,
  channels: z.object({ title: z.string(), emailText: z.string(), whatsappText: z.string() }),
  next: z.object({ title: z.string(), steps: z.array(z.string()) }),
  thankYou: z.object({ seoTitle: z.string(), title: z.string(), text: z.string() }),
});

const indexPage = z.object({
  page: z.enum(['services', 'products', 'work', 'insights', 'search']),
  seo: pageSeo,
  hero: heroBlock,
});

const pages = defineCollection({
  loader: perLocale('pages', 'json'),
  schema: z.discriminatedUnion('page', [homePage, aboutPage, contactPage, indexPage]),
});

export const collections = {
  services,
  products,
  caseStudies,
  blog,
  landingPages,
  industries,
  locations,
  legal,
  pages,
};
