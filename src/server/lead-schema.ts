import { z } from 'astro/zod';
import { budgetRanges, projectTypes, timelines } from '@/config/forms';
import { locales } from '@/i18n/config';

const budgetValues = budgetRanges.map((b) => b.value) as [string, ...string[]];

/** Server-side contract for a lead. The client validates the same rules natively. */
export const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().pipe(z.string().email()).pipe(z.string().max(200)),
  company: z.string().trim().max(160).default(''),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[+\d\s().-]*$/, 'Invalid phone number')
    .default(''),
  country: z
    .string()
    .trim()
    .regex(/^([A-Z]{2})?$/)
    .default(''),
  projectType: z.enum(projectTypes).optional().or(z.literal('').transform(() => undefined)),
  budget: z.enum(budgetValues).optional().or(z.literal('').transform(() => undefined)),
  timeline: z.enum(timelines).optional().or(z.literal('').transform(() => undefined)),
  message: z.string().trim().max(5000).default(''),
  locale: z.enum(locales).default('en'),
  /** Page the form was submitted from. */
  source: z.string().max(300).default(''),
  /** Landing page slug / campaign, when submitted from a campaign page. */
  landing: z.string().max(160).default(''),
  campaign: z.string().max(160).default(''),
  attribution: z.record(z.string(), z.string().max(300)).default({}),
  /** Honeypot: humans never fill it. */
  website: z.string().max(500).default(''),
  /** Epoch ms when the form was rendered (time trap). */
  startedAt: z.coerce.number().optional(),
});

export type LeadInput = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;
