/**
 * Lead delivery channels. Configure one or both with environment variables:
 *
 *   Webhook  LEAD_WEBHOOK_URL (+ optional LEAD_WEBHOOK_SECRET for an HMAC
 *            signature) — n8n, Make, Zapier, a CRM, Slack via a workflow…
 *   Email    RESEND_API_KEY + LEAD_EMAIL_TO + LEAD_EMAIL_FROM (Resend HTTP API,
 *            no SDK dependency). Swap `sendEmail` for another provider if needed.
 *
 * A future Meta Conversions API call belongs here too, fired after a lead is
 * accepted (hash the email with SHA-256 before sending).
 */
import { createHmac } from 'node:crypto';
import { LEAD_EMAIL_FROM, LEAD_EMAIL_TO, LEAD_WEBHOOK_SECRET, LEAD_WEBHOOK_URL, RESEND_API_KEY } from 'astro:env/server';
import type { Lead } from './lead-schema';

const TIMEOUT_MS = 8000;

export interface DeliveryResult {
  delivered: string[];
  failed: string[];
  configured: boolean;
}

type PublicLead = Omit<Lead, 'website' | 'startedAt'> & { receivedAt: string };

function toPublic(lead: Lead): PublicLead {
  const { website: _hp, startedAt: _t, ...rest } = lead;
  return { ...rest, receivedAt: new Date().toISOString() };
}

const singleLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

function textBody(lead: PublicLead): string {
  const rows: [string, string][] = [
    ['Name', lead.name],
    ['Email', lead.email],
    ['Company', lead.company],
    ['Phone / WhatsApp', lead.phone],
    ['Country', lead.country],
    ['Project type', lead.projectType ?? ''],
    ['Budget', lead.budget ?? ''],
    ['Timeline', lead.timeline ?? ''],
    ['Language', lead.locale],
    ['Submitted from', lead.source],
    ['Landing page', lead.landing],
    ['Campaign', lead.campaign],
    ...Object.entries(lead.attribution).map(([k, v]) => [k, v] as [string, string]),
    ['Received', lead.receivedAt],
  ];
  const meta = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${singleLine(v)}`)
    .join('\n');
  return `${meta}\n\n— Message —\n${lead.message || '(no message)'}\n`;
}

async function postWebhook(lead: PublicLead): Promise<void> {
  const body = JSON.stringify({ type: 'lead', data: lead });
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (LEAD_WEBHOOK_SECRET) {
    headers['x-atlaxys-signature'] = createHmac('sha256', LEAD_WEBHOOK_SECRET).update(body).digest('hex');
  }
  const res = await fetch(LEAD_WEBHOOK_URL!, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
}

async function sendEmail(lead: PublicLead): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: LEAD_EMAIL_FROM,
      to: LEAD_EMAIL_TO!.split(',').map((s) => s.trim()),
      reply_to: lead.email,
      subject: singleLine(`New enquiry — ${lead.name}${lead.company ? ` (${lead.company})` : ''}${lead.projectType ? ` · ${lead.projectType}` : ''}`),
      text: textBody(lead),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Email provider responded ${res.status}`);
}

export async function deliverLead(lead: Lead): Promise<DeliveryResult> {
  const data = toPublic(lead);
  const channels: [string, () => Promise<void>][] = [];
  if (LEAD_WEBHOOK_URL) channels.push(['webhook', () => postWebhook(data)]);
  if (RESEND_API_KEY && LEAD_EMAIL_TO && LEAD_EMAIL_FROM) channels.push(['email', () => sendEmail(data)]);

  if (channels.length === 0) {
    // Nothing configured: keep the lead visible in the server logs rather than losing it.
    console.warn('[lead] No delivery channel configured (set LEAD_WEBHOOK_URL or RESEND_API_KEY + LEAD_EMAIL_TO + LEAD_EMAIL_FROM).');
    console.info('[lead]', JSON.stringify(data));
    return { delivered: [], failed: [], configured: false };
  }

  const results = await Promise.allSettled(channels.map(([, send]) => send()));
  const delivered: string[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    const name = channels[i]![0];
    if (r.status === 'fulfilled') delivered.push(name);
    else {
      failed.push(name);
      console.error(`[lead] ${name} delivery failed:`, r.reason instanceof Error ? r.reason.message : r.reason);
    }
  });
  return { delivered, failed, configured: true };
}
