/**
 * POST /api/contact/ — lead capture (the only on-demand route of the site).
 *
 * Accepts JSON (enhanced form) or form-urlencoded (no-JavaScript fallback).
 * Spam defences: honeypot field, minimum fill time, per-IP rate limit, and
 * Astro's built-in Origin check for form submissions.
 */
import type { APIRoute } from 'astro';
import { minFillTimeMs } from '@/config/forms';
import { defaultLocale, isLocale } from '@/i18n/config';
import { localizePath, routes } from '@/i18n/paths';
import { deliverLead } from './lead-delivery';
import { leadSchema } from './lead-schema';
import { rateLimit } from './rate-limit';

export const prerender = false;

const json = (status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

function formToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const attribution: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string') continue;
    if (key.startsWith('attribution.')) attribution[key.slice(12)] = value;
    else out[key] = value;
  }
  out.attribution = attribution;
  return out;
}

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  const contentType = request.headers.get('content-type') ?? '';
  const wantsJson = contentType.includes('application/json');

  let raw: Record<string, unknown>;
  try {
    raw = wantsJson ? ((await request.json()) as Record<string, unknown>) : formToObject(await request.formData());
  } catch {
    return json(400, { ok: false, error: 'bad_request' });
  }

  const locale = isLocale(raw.locale) ? raw.locale : defaultLocale;
  const thanks = localizePath(locale, routes.contactThanks);
  const back = (code: string) => {
    const referer = request.headers.get('referer');
    const target = referer ? new URL(referer) : new URL(localizePath(locale, routes.contact), request.url);
    target.searchParams.set('form', code);
    return redirect(`${target.pathname}${target.search}#lead-form`, 303);
  };

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || 'unknown';
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return wantsJson ? json(429, { ok: false, error: 'rate_limited' }, { 'retry-after': String(limit.retryAfter) }) : back('rate_limited');
  }

  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), i.code]));
    return wantsJson ? json(422, { ok: false, error: 'validation', fields }) : back('invalid');
  }
  const lead = parsed.data;

  // Bots: answer as if everything went fine, deliver nothing.
  const tooFast = lead.startedAt !== undefined && Date.now() - lead.startedAt < minFillTimeMs;
  if (lead.website || tooFast) {
    return wantsJson ? json(200, { ok: true }) : redirect(thanks, 303);
  }

  const result = await deliverLead(lead);
  const accepted = result.delivered.length > 0 || (!result.configured && import.meta.env.DEV);

  if (!accepted) {
    return wantsJson ? json(503, { ok: false, error: result.configured ? 'delivery_failed' : 'not_configured' }) : back('failed');
  }
  return wantsJson ? json(200, { ok: true }) : redirect(thanks, 303);
};

export const ALL: APIRoute = () => json(405, { ok: false, error: 'method_not_allowed' }, { allow: 'POST' });
