/**
 * Build-time launch checklist for legal / privacy configuration.
 *
 * Logs one warning per missing item while pages are generated, so an
 * incomplete legal setup is visible in every build log (local and on
 * DigitalOcean) without inventing values or failing the build.
 */
import { PUBLIC_CONTACT_ENDPOINT } from 'astro:env/client';
import { formProcessor } from '@/config/privacy';
import { site } from '@/config/site';

let reported = false;

export function reportLaunchGaps() {
  if (reported || import.meta.env.DEV) return;
  reported = true;
  const missing: string[] = [];
  if (!site.legalName) missing.push('site.legalName (registered company name)');
  const legal = site.legal;
  if (!legal.legalForm) missing.push('site.legal.legalForm');
  if (!legal.rc) missing.push('site.legal.rc (Registre du Commerce)');
  if (!legal.ice) missing.push('site.legal.ice');
  if (!legal.taxId) missing.push('site.legal.taxId (IF)');
  if (!legal.registeredAddress) missing.push('site.legal.registeredAddress');
  if (!legal.publicationDirector) missing.push('site.legal.publicationDirector');
  if (!legal.cndpReceipt) missing.push('site.legal.cndpReceipt (CNDP declaration/authorisation — legal review)');
  if (!PUBLIC_CONTACT_ENDPOINT) missing.push('PUBLIC_CONTACT_ENDPOINT (contact form replaced by direct links)');
  else if (!formProcessor.name) missing.push('formProcessor.name in src/config/privacy.ts (form provider named in the privacy policy)');
  if (missing.length) {
    console.warn(`\n[launch-check] Legal/privacy information still missing — see docs/AUDIT.md "Legal TODOs":\n  - ${missing.join('\n  - ')}\n`);
  }
}
