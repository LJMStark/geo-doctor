import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { FetchResult, Heading, Page, PageImage, PageLink } from '../types.js';

/** Parse a fetched HTML document into the shape rules consume. */
export function parsePage(fetched: FetchResult, origin: string): Page {
  const $ = cheerio.load(fetched.body);
  const scriptBytes = measureScriptBytes($);
  $('script, style, noscript, template').remove();

  const mainRoot = pickMainRoot($);
  const meta = extractMeta($);
  const jsonLd = extractJsonLd(fetched.body);

  return {
    url: fetched.url,
    finalUrl: fetched.finalUrl,
    status: fetched.status,
    redirected: fetched.redirected,
    responseTimeMs: fetched.responseTimeMs,
    headers: fetched.headers,
    $,
    mainSelector: mainRoot,
    title: $('title').first().text().trim(),
    lang: ($('html').attr('lang') ?? '').trim(),
    charset: detectCharset($, fetched.headers),
    meta,
    jsonLd,
    headings: extractHeadings($),
    paragraphs: extractParagraphs($, mainRoot),
    mainText: normalizeWhitespace($(mainRoot).text()),
    bodyText: normalizeWhitespace($('body').text()),
    links: extractLinks($, mainRoot, origin, fetched.finalUrl),
    images: extractImages($, mainRoot),
    htmlBytes: Buffer.byteLength(fetched.body, 'utf-8'),
    scriptBytes,
  };
}

function measureScriptBytes($: CheerioAPI): number {
  let bytes = 0;
  $('script').each((_, el) => {
    bytes += Buffer.byteLength($(el).html() ?? '', 'utf-8');
    const src = $(el).attr('src');
    if (src) bytes += 256; // external bundle placeholder weight
  });
  return bytes;
}

const MAIN_SELECTORS = ['main', 'article', '[role="main"]', '#content', '.content', '.post'];

function pickMainRoot($: CheerioAPI): string {
  for (const selector of MAIN_SELECTORS) {
    const el = $(selector).first();
    if (el.length && normalizeWhitespace(el.text()).length > 0) return selector;
  }
  return 'body';
}

function extractMeta($: CheerioAPI): Record<string, string> {
  const meta: Record<string, string> = {};
  $('meta').each((_, el) => {
    const key = ($(el).attr('name') ?? $(el).attr('property') ?? $(el).attr('http-equiv') ?? '')
      .trim()
      .toLowerCase();
    const content = ($(el).attr('content') ?? '').trim();
    if (key && content && !(key in meta)) meta[key] = content;
  });
  return meta;
}

function extractJsonLd(html: string): Record<string, unknown>[] {
  const $ = cheerio.load(html);
  const blocks: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      for (const item of flattenJsonLd(parsed)) blocks.push(item);
    } catch {
      // invalid JSON-LD blocks are simply skipped; rules treat them as absent
    }
  });
  return blocks;
}

function flattenJsonLd(node: unknown): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(flattenJsonLd);
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const graph = obj['@graph'];
    if (Array.isArray(graph)) return [obj, ...graph.flatMap(flattenJsonLd)];
    return [obj];
  }
  return [];
}

function extractHeadings($: CheerioAPI): Heading[] {
  const headings: Heading[] = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName?.toLowerCase() ?? 'h6';
    const text = normalizeWhitespace($(el).text());
    if (!text) return;
    headings.push({
      level: Number(tag.slice(1)),
      text,
      id: $(el).attr('id') ?? undefined,
    });
  });
  return headings;
}

function extractParagraphs($: CheerioAPI, mainRoot: string): string[] {
  const paragraphs: string[] = [];
  $(mainRoot)
    .find('p')
    .each((_, el) => {
      const text = normalizeWhitespace($(el).text());
      if (text.length > 0) paragraphs.push(text);
    });
  if (paragraphs.length === 0) {
    // Some sites use bare divs/brs — fall back to line-splitting main text.
    const text = normalizeWhitespace($(mainRoot).text());
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

function extractLinks($: CheerioAPI, mainRoot: string, origin: string, pageUrl: string): PageLink[] {
  const links: PageLink[] = [];
  const mainSet = new Set($(mainRoot).find('a').toArray());
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') ?? '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
      return;
    }
    const resolved = resolveUrl(href, pageUrl);
    if (!resolved) return;
    links.push({
      href: resolved,
      text: normalizeWhitespace($(el).text()),
      internal: resolved.startsWith(origin),
      inMain: mainSet.has(el),
    });
  });
  return links;
}

function extractImages($: CheerioAPI, mainRoot: string): PageImage[] {
  const images: PageImage[] = [];
  const mainSet = new Set($(mainRoot).find('img').toArray());
  $('img').each((_, el) => {
    const src = ($(el).attr('src') ?? $(el).attr('data-src') ?? '').trim();
    if (!src || src.startsWith('data:')) return;
    images.push({
      src,
      alt: ($(el).attr('alt') ?? '').trim(),
      inMain: mainSet.has(el),
    });
  });
  return images;
}

function detectCharset($: CheerioAPI, headers: Record<string, string>): string {
  const metaCharset = $('meta[charset]').attr('charset');
  if (metaCharset) return metaCharset.toLowerCase();
  const httpEquiv = $('meta[http-equiv="Content-Type"]').attr('content') ?? '';
  const fromMeta = /charset=([\w-]+)/i.exec(httpEquiv)?.[1];
  if (fromMeta) return fromMeta.toLowerCase();
  const fromHeader = /charset=([\w-]+)/i.exec(headers['content-type'] ?? '')?.[1];
  return (fromHeader ?? '').toLowerCase();
}

function resolveUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
