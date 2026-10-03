// Static SEO / structure audit of a built dist folder: titles, descriptions,
// canonicals, robots, hreflang reciprocity, headings, image alt/size, internal
// links, orphans and sitemap consistency. No browser needed.
//   npm i --no-save node-html-parser
//   node scripts/audit/seo-check.mjs dist [https://www.atlaxys.com]   (DUMP=1 lists every page)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { parse } = require('node-html-parser');
const dist = path.resolve(process.argv[2]);
const origin = process.argv[3] || 'https://www.atlaxys.com';

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []));
const files = walk(dist);
const urlOf = (f) => '/' + path.relative(dist, f).replace(/\\/g, '/').replace(/index\.html$/, '');
const exists = (p) => {
  const clean = p.split('#')[0].split('?')[0];
  if (!clean.startsWith('/')) return true;
  const f = path.join(dist, clean);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return true;
  return fs.existsSync(path.join(f, 'index.html'));
};
const issues = {};
const add = (k, msg) => ((issues[k] ??= []).push(msg));
const pages = {};
const titles = {}, descs = {};
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(origin, ''));
const inbound = {};

for (const f of files) {
  const url = urlOf(f);
  const html = fs.readFileSync(f, 'utf8');
  const root = parse(html);
  const page = { url };
  pages[url] = page;
  const htmlEl = root.querySelector('html');
  page.lang = htmlEl?.getAttribute('lang');
  page.dir = htmlEl?.getAttribute('dir');
  page.title = root.querySelector('title')?.text.trim() ?? '';
  page.desc = root.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
  page.robots = root.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '';
  page.canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '';
  page.noindex = /noindex/.test(page.robots);
  page.hreflang = Object.fromEntries(root.querySelectorAll('link[rel="alternate"][hreflang]').map((l) => [l.getAttribute('hreflang'), l.getAttribute('href').replace(origin, '')]));
  page.h1 = root.querySelectorAll('h1').map((h) => h.text.trim());
  page.og = Object.fromEntries(root.querySelectorAll('meta[property^="og:"]').map((m) => [m.getAttribute('property'), m.getAttribute('content')]));
  page.tw = Object.fromEntries(root.querySelectorAll('meta[name^="twitter:"]').map((m) => [m.getAttribute('name'), m.getAttribute('content')]));
  if (url === '/404.html' || url === '/') { page.special = true; }
  if (!page.special) {
    if (!page.title) add('missing-title', url);
    if (page.title.length > 65) add('long-title', `${url} (${page.title.length}) ${page.title}`);
    if (page.title.length < 15) add('short-title', `${url} ${page.title}`);
    if (!page.desc) add('missing-desc', url);
    if (page.desc.length > 160) add('long-desc', `${url} (${page.desc.length})`);
    if (page.desc.length < 70) add('short-desc', `${url} (${page.desc.length}) ${page.desc}`);
    if (!page.noindex) {
      (titles[page.title] ??= []).push(url);
      (descs[page.desc] ??= []).push(url);
      if (page.canonical !== origin + url) add('canonical-mismatch', `${url} -> ${page.canonical}`);
      if (!sitemapUrls.includes(url)) add('indexable-not-in-sitemap', url);
      if (!page.og['og:image'] || !page.og['og:title'] || !page.og['og:url']) add('og-missing', url);
      if (!page.tw['twitter:card']) add('twitter-missing', url);
    } else if (sitemapUrls.includes(url)) add('noindex-in-sitemap', url);
    if (page.h1.length !== 1) add('h1-count', `${url} (${page.h1.length}) ${page.h1.join(' | ')}`);
    if (!page.lang) add('no-lang', url);
    // heading order
    let last = 0;
    for (const h of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const lvl = Number(h.tagName[1]);
      if (last && lvl > last + 1) { add('heading-skip', `${url}: h${last} -> h${lvl} "${h.text.trim().slice(0, 50)}"`); }
      last = lvl;
    }
  }
  // images
  for (const img of root.querySelectorAll('img')) {
    const src = img.getAttribute('src') ?? '';
    if (img.getAttribute('alt') === undefined || img.getAttribute('alt') === null) add('img-no-alt', `${url} ${src}`);
    if (!img.getAttribute('width') || !img.getAttribute('height')) add('img-no-dimensions', `${url} ${src}`);
    if (src.startsWith('/') && !exists(src)) add('img-broken', `${url} ${src}`);
  }
  // links
  for (const a of root.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href');
    if (/^(mailto:|tel:|https?:|#|javascript:)/.test(href)) {
      if (/^javascript:/.test(href)) add('js-link', `${url} ${href}`);
      if (/^https?:/.test(href) && a.getAttribute('target') === '_blank' && !/noopener/.test(a.getAttribute('rel') ?? '')) add('blank-no-noopener', `${url} ${href}`);
      if (href.startsWith(origin)) add('absolute-internal-link', `${url} ${href}`);
      continue;
    }
    const abs = href.startsWith('/') ? href : path.posix.join(url.endsWith('/') ? url : path.posix.dirname(url) + '/', href);
    if (!exists(abs)) add('broken-internal-link', `${url} -> ${href}`);
    const clean = abs.split('#')[0].split('?')[0];
    if (clean && !clean.endsWith('/') && !/\.[a-z0-9]+$/i.test(clean)) add('no-trailing-slash-link', `${url} -> ${href}`);
    (inbound[clean] ??= new Set()).add(url);
    const text = (a.text.trim() || a.getAttribute('aria-label') || a.querySelector('img')?.getAttribute('alt') || '').trim();
    if (!text) add('empty-link-text', `${url} -> ${href}`);
  }
  // JSON-LD
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const j = JSON.parse(s.text);
      page.ld = j;
      const types = (j['@graph'] ?? [j]).map((n) => [].concat(n['@type']).join('+'));
      page.ldTypes = types;
    } catch (e) { add('jsonld-invalid', `${url} ${e.message}`); }
  }
}
for (const [t, urls] of Object.entries(titles)) if (urls.length > 1) add('duplicate-title', `"${t}" x${urls.length}: ${urls.join(', ')}`);
for (const [d, urls] of Object.entries(descs)) if (urls.length > 1) add('duplicate-desc', `"${d.slice(0, 60)}…" x${urls.length}: ${urls.join(', ')}`);
// hreflang reciprocity
for (const p of Object.values(pages)) {
  if (p.noindex || p.special) continue;
  for (const [lang, href] of Object.entries(p.hreflang)) {
    if (lang === 'x-default') continue;
    const target = pages[href];
    if (!target) { add('hreflang-target-missing', `${p.url} [${lang}] -> ${href}`); continue; }
    if (target.noindex) add('hreflang-to-noindex', `${p.url} [${lang}] -> ${href}`);
    if (target.hreflang[p.lang] !== p.url) add('hreflang-not-reciprocal', `${p.url} [${lang}] -> ${href} (back: ${target.hreflang[p.lang]})`);
    if (target.lang !== lang) add('hreflang-lang-mismatch', `${p.url} [${lang}] -> ${href} has lang=${target.lang}`);
  }
}
// sitemap urls exist
for (const u of sitemapUrls) {
  if (!pages[u]) add('sitemap-url-missing', u);
  else if (pages[u].noindex) add('sitemap-url-noindex', u);
}
// orphans: indexable pages with no inbound links from other pages
for (const p of Object.values(pages)) {
  if (p.special || p.noindex) continue;
  const inb = [...(inbound[p.url] ?? [])].filter((u) => u !== p.url);
  if (!inb.length) add('orphan', p.url);
}
console.log(`Pages: ${files.length} · sitemap URLs: ${sitemapUrls.length} · indexable: ${Object.values(pages).filter((p) => !p.noindex && !p.special).length}`);
for (const [k, v] of Object.entries(issues)) {
  console.log(`\n## ${k} (${v.length})`);
  v.slice(0, 25).forEach((m) => console.log('  ' + m));
}
if (process.env.DUMP) {
  for (const p of Object.values(pages)) console.log(`${p.noindex ? 'NOINDEX ' : ''}${p.url} | ${p.title} | ${(p.ldTypes || []).join(',')}`);
}
