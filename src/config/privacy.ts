/**
 * ============================================================================
 *  PRIVACY INVENTORY — what this website stores and who receives data.
 * ============================================================================
 *
 * The cookie policy and the privacy policy render their tables from this file
 * (see src/components/legal/), so the published policies always describe the
 * build that is actually deployed:
 *   • a tracker appears only when its ID is configured (src/config/analytics.ts);
 *   • the form processor appears only when PUBLIC_CONTACT_ENDPOINT is set.
 *
 * If you add a script, storage key, embed or service, add it here first.
 * Vendor cookie names/durations come from each vendor's documentation and can
 * change — re-check them when you enable a vendor.
 */
import { PUBLIC_CONTACT_ENDPOINT } from 'astro:env/client';
import { analyticsConfig, analyticsEnabled } from './analytics';
import type { Locale } from '@/i18n/config';

type Text = Record<Locale, string>;

export type StorageCategory = 'necessary' | 'preferences' | 'analytics' | 'marketing';

export interface StorageItem {
  name: string;
  kind: 'localStorage' | 'sessionStorage' | 'cookie';
  /** Who sets it / who can read it. */
  provider: string;
  firstParty: boolean;
  category: StorageCategory;
  purpose: Text;
  duration: Text;
  /** Present in the current build. */
  active: boolean;
}

export interface ThirdParty {
  id: string;
  name: string;
  /** Legal entity / country, as published by the provider. */
  entity: string;
  purpose: Text;
  data: Text;
  /** When data reaches this provider. */
  when: Text;
  category: StorageCategory | 'service';
  privacyUrl?: string;
  active: boolean;
}

/**
 * The service that receives contact-form submissions (PUBLIC_CONTACT_ENDPOINT).
 * TODO(launch): fill in the provider you choose — it is named in the privacy
 * policy. Until then the policy describes it generically.
 */
export const formProcessor: { name?: string; entity?: string; privacyUrl?: string } = {
  name: 'Web3Forms',
  entity: undefined, // TODO(launch): legal entity and country, as published by Web3Forms
  privacyUrl: 'https://web3forms.com/privacy',
};

/** Consent is asked again after this many days (and whenever consentVersion changes). */
export const consentMaxAgeDays = 180;

const ga = Boolean(analyticsConfig.ga4);
const meta = Boolean(analyticsConfig.metaPixel);
const linkedIn = Boolean(analyticsConfig.linkedIn);

const vendorNote: Text = {
  en: 'Set by the vendor',
  fr: 'Déposé par le fournisseur',
  ar: 'يضعه المزوّد',
};

export const storageItems: StorageItem[] = [
  {
    name: 'atlaxys-consent',
    kind: 'localStorage',
    provider: 'Atlaxys',
    firstParty: true,
    category: 'necessary',
    purpose: {
      en: 'Remembers your cookie choices (categories accepted, date, policy version) so the banner is not shown on every page.',
      fr: 'Mémorise vos choix en matière de cookies (catégories acceptées, date, version) pour ne pas réafficher le bandeau à chaque page.',
      ar: 'يحفظ اختياراتك بشأن ملفات الارتباط (الفئات المقبولة، التاريخ، الإصدار) حتى لا تظهر اللافتة في كل صفحة.',
    },
    duration: {
      en: `${consentMaxAgeDays} days, then you are asked again`,
      fr: `${consentMaxAgeDays} jours, puis votre choix vous est redemandé`,
      ar: `${consentMaxAgeDays} يومًا، ثم يُطلب منك الاختيار من جديد`,
    },
    active: analyticsEnabled,
  },
  {
    name: 'atlaxys-lang',
    kind: 'localStorage',
    provider: 'Atlaxys',
    firstParty: true,
    category: 'preferences',
    purpose: {
      en: 'Remembers the language you picked with the language switcher, so the home address opens in that language. Only written when you click a language.',
      fr: 'Mémorise la langue choisie via le sélecteur de langue, pour ouvrir l’adresse d’accueil dans cette langue. Écrit uniquement si vous cliquez sur une langue.',
      ar: 'يحفظ اللغة التي اخترتها من مبدّل اللغة لفتح الصفحة الرئيسية بها. لا يُكتب إلا عند النقر على لغة.',
    },
    duration: { en: 'Until you clear site data', fr: 'Jusqu’à suppression des données du site', ar: 'إلى أن تحذف بيانات الموقع' },
    active: true,
  },
  {
    name: 'atlaxys-theme',
    kind: 'localStorage',
    provider: 'Atlaxys',
    firstParty: true,
    category: 'preferences',
    purpose: {
      en: 'Remembers whether you picked the light or dark theme with the theme button, so every page opens in that theme. Only written when you click it.',
      fr: 'Mémorise le thème clair ou sombre choisi avec le bouton de thème, pour ouvrir chaque page dans ce thème. Écrit uniquement si vous cliquez dessus.',
      ar: 'يحفظ اختيارك بين المظهر الفاتح والداكن عبر زر المظهر، لتُفتح كل الصفحات به. لا يُكتب إلا عند النقر عليه.',
    },
    duration: { en: 'Until you clear site data', fr: 'Jusqu’à suppression des données du site', ar: 'إلى أن تحذف بيانات الموقع' },
    active: true,
  },
  {
    name: 'atlaxys-attribution',
    kind: 'sessionStorage',
    provider: 'Atlaxys',
    firstParty: true,
    category: 'marketing',
    purpose: {
      en: 'Only after you accept marketing: keeps the campaign that brought you here (utm_* parameters, ad click identifiers gclid/fbclid, referring site, landing page) so it can be attached to an enquiry you send.',
      fr: 'Uniquement après acceptation du marketing : conserve la campagne qui vous a amené ici (paramètres utm_*, identifiants de clic publicitaire gclid/fbclid, site référent, page d’arrivée) pour l’associer à une demande que vous envoyez.',
      ar: 'فقط بعد قبولك لفئة التسويق: يحتفظ بالحملة التي أوصلتك إلى الموقع (معاملات utm_*، معرّفات النقر الإعلاني gclid/fbclid، الموقع المُحيل، صفحة الوصول) لإرفاقها بطلب ترسله.',
    },
    duration: { en: 'Until the browser tab is closed', fr: 'Jusqu’à la fermeture de l’onglet', ar: 'إلى أن تُغلق علامة التبويب' },
    active: analyticsEnabled,
  },
  {
    name: '_ga',
    kind: 'cookie',
    provider: 'Google Analytics',
    firstParty: true,
    category: 'analytics',
    purpose: {
      en: `${vendorNote.en}: distinguishes browsers with a random identifier to count visits.`,
      fr: `${vendorNote.fr} : distingue les navigateurs par un identifiant aléatoire pour compter les visites.`,
      ar: `${vendorNote.ar}: يميّز المتصفحات بمعرّف عشوائي لإحصاء الزيارات.`,
    },
    duration: { en: '2 years', fr: '2 ans', ar: 'سنتان' },
    active: ga,
  },
  {
    name: '_ga_<ID>',
    kind: 'cookie',
    provider: 'Google Analytics',
    firstParty: true,
    category: 'analytics',
    purpose: {
      en: `${vendorNote.en}: keeps the state of the current analytics session.`,
      fr: `${vendorNote.fr} : conserve l’état de la session de mesure en cours.`,
      ar: `${vendorNote.ar}: يحفظ حالة جلسة القياس الحالية.`,
    },
    duration: { en: '2 years', fr: '2 ans', ar: 'سنتان' },
    active: ga,
  },
  {
    name: '_fbp',
    kind: 'cookie',
    provider: 'Meta Pixel',
    firstParty: true,
    category: 'marketing',
    purpose: {
      en: `${vendorNote.en}: identifies the browser to measure the results of Meta (Facebook, Instagram) ads.`,
      fr: `${vendorNote.fr} : identifie le navigateur pour mesurer les résultats des publicités Meta (Facebook, Instagram).`,
      ar: `${vendorNote.ar}: يعرّف المتصفح لقياس نتائج إعلانات Meta (فيسبوك، إنستغرام).`,
    },
    duration: { en: '90 days', fr: '90 jours', ar: '90 يومًا' },
    active: meta,
  },
  {
    name: '_fbc',
    kind: 'cookie',
    provider: 'Meta Pixel',
    firstParty: true,
    category: 'marketing',
    purpose: {
      en: `${vendorNote.en} when you arrive from a Meta ad: stores the ad click identifier.`,
      fr: `${vendorNote.fr} si vous arrivez depuis une publicité Meta : conserve l’identifiant du clic.`,
      ar: `${vendorNote.ar} عند وصولك من إعلان على Meta: يحفظ معرّف النقر.`,
    },
    duration: { en: '90 days', fr: '90 jours', ar: '90 يومًا' },
    active: meta,
  },
  {
    name: 'li_fat_id, li_sugr',
    kind: 'cookie',
    provider: 'LinkedIn Insight Tag',
    firstParty: true,
    category: 'marketing',
    purpose: {
      en: `${vendorNote.en}: member/browser identifiers used to attribute conversions to LinkedIn ads.`,
      fr: `${vendorNote.fr} : identifiants de membre/navigateur servant à attribuer les conversions aux publicités LinkedIn.`,
      ar: `${vendorNote.ar}: معرّفات للعضو/المتصفح تُستخدم لنسب التحويلات إلى إعلانات LinkedIn.`,
    },
    duration: { en: '30 to 90 days', fr: '30 à 90 jours', ar: 'من 30 إلى 90 يومًا' },
    active: linkedIn,
  },
  {
    name: 'bcookie, lidc, UserMatchHistory, AnalyticsSyncHistory',
    kind: 'cookie',
    provider: 'LinkedIn (linkedin.com)',
    firstParty: false,
    category: 'marketing',
    purpose: {
      en: 'Third-party cookies on LinkedIn’s own domain: browser identification, routing and ad-measurement sync.',
      fr: 'Cookies tiers sur le domaine de LinkedIn : identification du navigateur, routage et synchronisation de la mesure publicitaire.',
      ar: 'ملفات ارتباط تابعة لنطاق LinkedIn: تعريف المتصفح والتوجيه ومزامنة قياس الإعلانات.',
    },
    duration: { en: '24 hours to 1 year', fr: '24 heures à 1 an', ar: 'من 24 ساعة إلى سنة' },
    active: linkedIn,
  },
];

const googleEntity = 'Google Ireland Ltd (EEA/UK) / Google LLC (USA)';

export const thirdParties: ThirdParty[] = [
  {
    id: 'hosting',
    name: 'DigitalOcean App Platform',
    entity: 'DigitalOcean, LLC (USA)',
    purpose: {
      en: 'Hosts and delivers the website (including through its content-delivery network).',
      fr: 'Héberge et diffuse le site (y compris via son réseau de diffusion de contenu).',
      ar: 'استضافة الموقع وتقديمه (بما في ذلك عبر شبكة توزيع المحتوى الخاصة به).',
    },
    data: {
      en: 'Technical request data: IP address, browser user agent, requested page, date and time.',
      fr: 'Données techniques de requête : adresse IP, agent utilisateur du navigateur, page demandée, date et heure.',
      ar: 'بيانات تقنية للطلب: عنوان IP، وكيل المستخدم للمتصفح، الصفحة المطلوبة، التاريخ والوقت.',
    },
    when: { en: 'Every visit', fr: 'À chaque visite', ar: 'عند كل زيارة' },
    category: 'service',
    privacyUrl: 'https://www.digitalocean.com/legal/privacy-policy',
    active: true,
  },
  {
    id: 'forms',
    name: formProcessor.name ?? 'Form-processing provider',
    entity: formProcessor.entity ?? '',
    purpose: {
      en: 'Receives the contact and campaign forms and forwards your enquiry to our team.',
      fr: 'Reçoit les formulaires de contact et de campagne et transmet votre demande à notre équipe.',
      ar: 'يستقبل نماذج التواصل والحملات ويحوّل طلبك إلى فريقنا.',
    },
    data: {
      en: 'What you type in the form, the page it was sent from, your IP address and, only if you accepted marketing, campaign attribution.',
      fr: 'Ce que vous saisissez dans le formulaire, la page d’envoi, votre adresse IP et, seulement si vous avez accepté le marketing, l’attribution de campagne.',
      ar: 'ما تكتبه في النموذج، والصفحة التي أُرسل منها، وعنوان IP الخاص بك، وفقط إذا قبلت التسويق: بيانات نسب الحملة.',
    },
    when: { en: 'When you submit a form', fr: 'Lorsque vous envoyez un formulaire', ar: 'عند إرسال نموذج' },
    category: 'service',
    privacyUrl: formProcessor.privacyUrl,
    active: Boolean(PUBLIC_CONTACT_ENDPOINT),
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    entity: 'WhatsApp Ireland Ltd / WhatsApp LLC (Meta)',
    purpose: {
      en: 'Chat with us if you choose to click a WhatsApp link. Nothing is sent to WhatsApp before you click.',
      fr: 'Échanger avec nous si vous cliquez sur un lien WhatsApp. Rien n’est transmis à WhatsApp avant le clic.',
      ar: 'التواصل معنا إذا اخترت النقر على رابط واتساب. لا يُرسل أي شيء إلى واتساب قبل النقر.',
    },
    data: {
      en: 'Your phone number, profile and the messages you exchange with us, under WhatsApp’s own terms.',
      fr: 'Votre numéro, votre profil et les messages échangés avec nous, selon les conditions de WhatsApp.',
      ar: 'رقم هاتفك وملفك الشخصي والرسائل المتبادلة معنا، وفق شروط واتساب.',
    },
    when: { en: 'Only when you open a WhatsApp link', fr: 'Uniquement si vous ouvrez un lien WhatsApp', ar: 'فقط عند فتح رابط واتساب' },
    category: 'service',
    privacyUrl: 'https://www.whatsapp.com/legal/privacy-policy',
    active: true,
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    entity: googleEntity,
    purpose: {
      en: 'Audience measurement: pages viewed, traffic sources, device type, approximate location.',
      fr: 'Mesure d’audience : pages vues, sources de trafic, type d’appareil, localisation approximative.',
      ar: 'قياس الجمهور: الصفحات المعروضة، مصادر الزيارات، نوع الجهاز، الموقع التقريبي.',
    },
    data: {
      en: 'Random browser identifier, pages and events, IP address (used to derive location; not stored by Google Analytics 4), device and browser data.',
      fr: 'Identifiant aléatoire du navigateur, pages et événements, adresse IP (sert à déduire la localisation ; non stockée par Google Analytics 4), données d’appareil et de navigateur.',
      ar: 'معرّف عشوائي للمتصفح، الصفحات والأحداث، عنوان IP (لاستنتاج الموقع؛ لا يخزّنه Google Analytics 4)، بيانات الجهاز والمتصفح.',
    },
    when: { en: 'Only after you accept analytics', fr: 'Uniquement après acceptation de la mesure d’audience', ar: 'فقط بعد قبولك لفئة القياس' },
    category: 'analytics',
    privacyUrl: 'https://policies.google.com/privacy',
    active: ga,
  },
  {
    id: 'gtm',
    name: 'Google Tag Manager',
    entity: googleEntity,
    purpose: {
      en: 'Loads measurement tags configured by Atlaxys.',
      fr: 'Charge les balises de mesure configurées par Atlaxys.',
      ar: 'يحمّل وسوم القياس التي تضبطها Atlaxys.',
    },
    data: {
      en: 'IP address and browser data when the container is downloaded; further data depends on the tags it contains.',
      fr: 'Adresse IP et données du navigateur lors du téléchargement du conteneur ; les autres données dépendent des balises qu’il contient.',
      ar: 'عنوان IP وبيانات المتصفح عند تنزيل الحاوية؛ وتتوقف البيانات الأخرى على الوسوم التي تتضمنها.',
    },
    when: { en: 'Only after you accept analytics', fr: 'Uniquement après acceptation de la mesure d’audience', ar: 'فقط بعد قبولك لفئة القياس' },
    category: 'analytics',
    privacyUrl: 'https://policies.google.com/privacy',
    active: Boolean(analyticsConfig.gtm),
  },
  {
    id: 'meta',
    name: 'Meta Pixel',
    entity: 'Meta Platforms Ireland Ltd / Meta Platforms, Inc. (USA)',
    purpose: {
      en: 'Measures the results of our Meta (Facebook, Instagram) ads and builds ad audiences.',
      fr: 'Mesure les résultats de nos publicités Meta (Facebook, Instagram) et constitue des audiences publicitaires.',
      ar: 'قياس نتائج إعلاناتنا على Meta (فيسبوك، إنستغرام) وبناء جماهير إعلانية.',
    },
    data: {
      en: 'Browser identifiers, pages viewed, conversion events (such as “form sent”), IP address, device data; Meta may link this to a Meta account.',
      fr: 'Identifiants du navigateur, pages vues, événements de conversion (comme « formulaire envoyé »), adresse IP, données d’appareil ; Meta peut les rapprocher d’un compte Meta.',
      ar: 'معرّفات المتصفح، الصفحات المعروضة، أحداث التحويل (مثل «إرسال نموذج»)، عنوان IP، بيانات الجهاز؛ وقد تربطها Meta بحساب على Meta.',
    },
    when: { en: 'Only after you accept marketing', fr: 'Uniquement après acceptation du marketing', ar: 'فقط بعد قبولك لفئة التسويق' },
    category: 'marketing',
    privacyUrl: 'https://www.facebook.com/privacy/policy/',
    active: meta,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Insight Tag',
    entity: 'LinkedIn Ireland Unlimited Company / LinkedIn Corporation (USA)',
    purpose: {
      en: 'Measures the results of our LinkedIn ads and builds ad audiences.',
      fr: 'Mesure les résultats de nos publicités LinkedIn et constitue des audiences publicitaires.',
      ar: 'قياس نتائج إعلاناتنا على LinkedIn وبناء جماهير إعلانية.',
    },
    data: {
      en: 'Browser and member identifiers, pages viewed, conversion events, IP address, device data; LinkedIn may link this to a LinkedIn account.',
      fr: 'Identifiants de navigateur et de membre, pages vues, événements de conversion, adresse IP, données d’appareil ; LinkedIn peut les rapprocher d’un compte LinkedIn.',
      ar: 'معرّفات المتصفح والعضو، الصفحات المعروضة، أحداث التحويل، عنوان IP، بيانات الجهاز؛ وقد تربطها LinkedIn بحساب على LinkedIn.',
    },
    when: { en: 'Only after you accept marketing', fr: 'Uniquement après acceptation du marketing', ar: 'فقط بعد قبولك لفئة التسويق' },
    category: 'marketing',
    privacyUrl: 'https://www.linkedin.com/legal/privacy-policy',
    active: linkedIn,
  },
];

export const activeStorage = storageItems.filter((s) => s.active);
export const activeThirdParties = thirdParties.filter((p) => p.active);

/** Vendors per consent category, for the consent dialog descriptions. */
export function vendorsFor(category: 'analytics' | 'marketing'): string[] {
  return activeThirdParties.filter((p) => p.category === category).map((p) => p.name);
}
