/**
 * Client-side site search over the static index (/<lang>/search.json).
 * Accent- and case-insensitive, Arabic-normalised, weighted by field.
 * Replaceable by Pagefind / Algolia later without touching content.
 *
 * Privacy: the query is kept in the URL fragment (#q=…), never in the query
 * string. Browsers do not send fragments to servers or in the Referer of the
 * next page, and Google Analytics ignores them, so what a visitor types stays
 * in their browser. Older ?q= links still work: the query is moved to the
 * fragment as soon as this script runs.
 */
interface Item {
  type: 'service' | 'product' | 'caseStudy' | 'article' | 'page';
  title: string;
  description: string;
  url: string;
  keywords: string[];
}

/** Lowercase, strip Latin diacritics and Arabic tashkeel, unify alef/yaa/taa marbuta forms. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

function score(item: Item, terms: string[]): number {
  const title = normalise(item.title);
  const desc = normalise(item.description);
  const keys = normalise(item.keywords.join(' '));
  let total = 0;
  for (const term of terms) {
    let s = 0;
    if (title.includes(term)) s += title.startsWith(term) ? 12 : 8;
    if (keys.includes(term)) s += 4;
    if (desc.includes(term)) s += 2;
    if (s === 0) return 0; // every term must match somewhere
    total += s;
  }
  return total;
}

export function initSearch() {
  const form = document.querySelector<HTMLFormElement>('[data-search]');
  if (!form) return;
  const input = form.querySelector<HTMLInputElement>('input[type="search"]')!;
  const status = document.getElementById('search-status')!;
  const list = document.querySelector<HTMLOListElement>('[data-search-results]')!;
  const fallback = document.querySelector<HTMLElement>('[data-search-fallback]')!;
  const types = JSON.parse(form.dataset.types ?? '{}') as Record<Item['type'], string>;
  const strings = JSON.parse(form.dataset.strings ?? '{}') as { results: string[]; noResults: string; loading: string; unavailable: string };
  const plural = new Intl.PluralRules(form.dataset.locale);
  const pluralIndex: Record<string, number> = { zero: 0, one: 1, two: 2, few: 3, many: 4, other: 5 };

  let index: Item[] | null = null;
  let loading: Promise<Item[] | null> | null = null;

  const load = () =>
    (loading ??= fetch(form.dataset.index!)
      .then((r) => (r.ok ? (r.json() as Promise<Item[]>) : null))
      .catch(() => null)
      .then((data) => (index = data)));

  const resultsText = (count: number, q: string) => {
    const category = plural.select(count);
    // English/French only use one/other; Arabic uses all six forms.
    const template = strings.results[pluralIndex[category] ?? 5] ?? strings.results[5]!;
    return template.replace(/\d+/, String(count)).replace('§Q', q);
  };

  const render = async (raw: string) => {
    const q = raw.trim();
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.hash = q ? new URLSearchParams({ q }).toString() : '';
    history.replaceState(null, '', url);

    if (q.length < 2) {
      list.replaceChildren();
      fallback.hidden = true;
      return;
    }
    if (!index) {
      status.textContent = strings.loading;
      await load();
    }
    if (!index) {
      status.textContent = strings.unavailable;
      fallback.hidden = false;
      return;
    }
    const terms = normalise(q).split(/\s+/).filter(Boolean);
    const hits = index
      .map((item) => ({ item, s: score(item, terms) }))
      .filter((h) => h.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30);

    list.replaceChildren(
      ...hits.map(({ item }) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.url;
        const type = document.createElement('span');
        type.className = 'search-hit__type';
        type.textContent = types[item.type] ?? item.type;
        const title = document.createElement('span');
        title.className = 'search-hit__title';
        title.textContent = item.title;
        const desc = document.createElement('span');
        desc.className = 'search-hit__desc';
        desc.textContent = item.description;
        a.append(type, title, desc);
        li.append(a);
        return li;
      }),
    );
    status.textContent = hits.length ? resultsText(hits.length, q) : strings.noResults.replace('§Q', q);
    fallback.hidden = hits.length > 0;
  };

  let timer: number | undefined;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void render(input.value), 160);
  });
  input.addEventListener('focus', () => void load(), { once: true });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void render(input.value);
  });

  const initial =
    new URLSearchParams(window.location.hash.slice(1)).get('q') ?? new URLSearchParams(window.location.search).get('q');
  if (initial !== null) {
    input.value = initial;
    void render(initial);
  }
}
