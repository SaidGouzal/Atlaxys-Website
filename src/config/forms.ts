/**
 * Lead-form options. Values (left) are what reaches your inbox/CRM and must
 * stay stable; labels live in the UI dictionaries under `form.options`.
 */
export const projectTypes = [
  'web-platform',
  'mobile-app',
  'business-software',
  'ai-automation',
  'devops-cloud',
  'consulting',
  'other',
] as const;
export type ProjectType = (typeof projectTypes)[number];

/** Budget brackets, expressed in `budgetCurrency`. */
export const budgetCurrency = 'EUR';
export const budgetRanges = [
  { value: 'lt-5k', max: 5000 },
  { value: '5k-15k', min: 5000, max: 15000 },
  { value: '15k-50k', min: 15000, max: 50000 },
  { value: 'gt-50k', min: 50000 },
  { value: 'unsure' },
] as const;
export type BudgetRange = (typeof budgetRanges)[number]['value'];

export const timelines = ['asap', '1-3-months', '3-6-months', 'exploring'] as const;
export type Timeline = (typeof timelines)[number];

/**
 * Countries shown first in the country list (the rest follow alphabetically,
 * with names localised by `Intl.DisplayNames`).
 */
export const priorityCountries = ['MA', 'FR', 'BE', 'ES', 'GB', 'DE', 'NL', 'CA', 'US', 'AE', 'SA'];

/** ISO 3166-1 alpha-2 codes offered in the country select. */
export const countryCodes = [
  'AD','AE','AF','AG','AL','AM','AO','AR','AT','AU','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BN','BO','BR','BS','BT','BW','BY','BZ',
  'CA','CD','CF','CG','CH','CI','CL','CM','CN','CO','CR','CU','CV','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','ER','ES','ET',
  'FI','FJ','FM','FR','GA','GB','GD','GE','GH','GM','GN','GQ','GR','GT','GW','GY','HK','HN','HR','HT','HU','ID','IE','IL','IN','IQ','IR',
  'IS','IT','JM','JO','JP','KE','KG','KH','KI','KM','KN','KR','KW','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC',
  'MD','ME','MG','MH','MK','ML','MM','MN','MR','MT','MU','MV','MW','MX','MY','MZ','NA','NE','NG','NI','NL','NO','NP','NR','NZ','OM','PA',
  'PE','PG','PH','PK','PL','PS','PT','PW','PY','QA','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SI','SK','SL','SM','SN','SO','SR',
  'SS','ST','SV','SY','SZ','TD','TG','TH','TJ','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','US','UY','UZ','VA','VC','VE','VN',
  'VU','WS','YE','ZA','ZM','ZW',
];

/** Minimum time (ms) between form render and submit — cheap bot filter. */
export const minFillTimeMs = 2500;
