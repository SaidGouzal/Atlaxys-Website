/**
 * /llms.txt: a plain-language summary of Atlaxys for AI assistants and
 * answer engines (https://llmstxt.org). Generated from the same content and
 * configuration as the website, so it never drifts from what visitors see.
 */
import type { APIRoute } from 'astro';
import { site } from '@/config/site';
import { techStack } from '@/config/technology';
import { useTranslations } from '@/i18n';
import { getCaseStudies, getLocations, getPosts, getProducts, getServices } from '@/lib/content';
import { absoluteUrl } from '@/lib/seo/urls';

export const GET: APIRoute = async () => {
  const t = useTranslations('en');
  const [services, products, caseStudies, posts, locations] = await Promise.all([
    getServices('en'),
    getProducts('en'),
    getCaseStudies('en'),
    getPosts('en'),
    getLocations('en'),
  ]);

  /** A titled list, or nothing at all when the list is empty. */
  const section = (title: string, items: string[]) => (items.length > 0 ? [`## ${title}`, ...items, ''] : []);

  const lines = [
    `# ${site.name}`,
    '',
    `> ${t.meta.orgDescription}`,
    '',
    '## Key facts',
    `- Name: ${site.name}${site.legalName ? ` (${site.legalName})` : ''}`,
    `- Based in: ${[site.address.locality, 'Morocco'].filter(Boolean).join(', ')}`,
    `- Works with: businesses in Morocco and abroad, mostly remotely`,
    '- Working languages: English, French, Arabic',
    `- Contact: ${site.contact.email} · WhatsApp +${site.contact.whatsapp}`,
    `- Website languages: ${absoluteUrl('/en/')} (English), ${absoluteUrl('/fr/')} (French), ${absoluteUrl('/ar/')} (Arabic)`,
    '',
    ...section(
      'Services',
      services.map((s) => `- [${s.data.title}](${absoluteUrl(s.url)}): ${s.data.summary}`),
    ),
    ...section(
      'Products',
      products.map((p) => `- [${p.name}](${absoluteUrl(p.url)}): ${p.tagline}${p.demo ? ' (draft description)' : ''}`),
    ),
    ...section(
      'Technologies',
      techStack.map((g) => `- ${t.stack.groups[g.group]}: ${g.items.join(', ')}`),
    ),
    ...section(
      'Case studies',
      caseStudies.map((c) => `- [${c.data.title}](${absoluteUrl(c.url)}): ${c.data.summary}${c.data.demo ? ' (illustrative example, not a real client)' : ''}`),
    ),
    ...section(
      'Locations',
      locations.map((l) => `- [${l.data.hero.title}](${absoluteUrl(l.url)})`),
    ),
    ...section(
      'Insights',
      posts.map((p) => `- [${p.data.title}](${absoluteUrl(p.url)}): ${p.data.description}`),
    ),
    '## Optional',
    `- [About](${absoluteUrl('/en/about/')})`,
    `- [Contact](${absoluteUrl('/en/contact/')})`,
    `- [Sitemap](${absoluteUrl('/sitemap.xml')})`,
    '',
  ];

  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
