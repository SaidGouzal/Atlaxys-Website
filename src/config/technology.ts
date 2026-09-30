/**
 * The technology spec sheet shown on the home page and service pages.
 * Group labels are translated in the UI dictionaries (`stack.groups.*`).
 * Only list technologies the team actually ships with.
 */
export const techStack = [
  { group: 'interfaces', items: ['TypeScript', 'React', 'Next.js', 'Astro', 'Vue', 'Tailwind CSS'] },
  { group: 'mobile', items: ['React Native', 'Expo', 'Flutter', 'Electron'] },
  { group: 'backend', items: ['Node.js', 'NestJS', 'Python', 'FastAPI', 'Laravel', 'REST', 'GraphQL'] },
  { group: 'data', items: ['PostgreSQL', 'MySQL', 'Redis', 'MongoDB', 'Elasticsearch'] },
  { group: 'cloud', items: ['AWS', 'DigitalOcean', 'Docker', 'Kubernetes', 'Terraform', 'GitHub Actions', 'Nginx'] },
  { group: 'ai', items: ['OpenAI API', 'Anthropic API', 'LangChain', 'Vector search', 'n8n', 'OCR pipelines'] },
] as const;

export type TechGroup = (typeof techStack)[number]['group'];
