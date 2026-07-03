import type { AuditOptions, Page, SiteAudit, SitemapInfo } from '../types.js';
import { DEFAULT_TIMEOUT_MS, fetchUrl } from './fetcher.js';
import { parsePage } from './page.js';
import { parseRobots } from './robots.js';

const DEFAULT_PAGES = 3;

const SKIP_EXTENSIONS =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|json|xml|pdf|zip|gz|tar|mp3|mp4|webm|woff2?|ttf|eot)(\?|$)/i;

const SKIP_PATH_HINTS = /(\/(login|signin|signup|register|cart|checkout|account|admin|wp-admin)\b)/i;

export class CrawlError extends Error {
  constructor(
    message: string,
    readonly url: string,
  ) {
    super(message);
    this.name = 'CrawlError';
  }
}

/** Crawl the entry page, site-level files and a small sample of internal pages. */
export async function crawlSite(inputUrl: string, options: AuditOptions = {}): Promise<SiteAudit> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxPages = Math.max(1, options.pages ?? DEFAULT_PAGES);
  const progress = options.onProgress ?? (() => {});

  const normalized = normalizeInputUrl(inputUrl);
  const origin = new URL(normalized).origin;

  progress(normalized);
  const entryFetch = await fetchUrl(normalized, timeoutMs);
  if (!entryFetch.ok) {
    const reason = entryFetch.error ?? `HTTP ${entryFetch.status}`;
    throw new CrawlError(`Could not fetch ${normalized} (${reason})`, normalized);
  }
  const entryPage = parsePage(entryFetch, origin);

  progress(`${origin}/robots.txt`);
  const robotsFetch = await fetchUrl(`${origin}/robots.txt`, timeoutMs);
  const robotsExists = robotsFetch.ok && looksLikeRobots(robotsFetch.body);
  const robots = parseRobots(robotsExists ? robotsFetch.body : '', robotsExists);

  progress(`${origin}/llms.txt`);
  const llmsFetch = await fetchUrl(`${origin}/llms.txt`, timeoutMs);
  const llmsExists = llmsFetch.ok && looksLikeText(llmsFetch);
  const llmsTxt = { exists: llmsExists, content: llmsExists ? llmsFetch.body : '' };

  const sitemap = await resolveSitemap(origin, robots.sitemaps, timeoutMs, progress);

  const pages: Page[] = [entryPage];
  for (const link of pickInternalLinks(entryPage, origin, maxPages - 1)) {
    progress(link);
    const fetched = await fetchUrl(link, timeoutMs);
    if (fetched.ok && isHtml(fetched.headers['content-type'])) {
      pages.push(parsePage(fetched, origin));
    }
  }

  return {
    inputUrl: normalized,
    origin,
    fetchedAt: new Date().toISOString(),
    now: new Date(),
    robots,
    llmsTxt,
    sitemap,
    pages,
  };
}

export function normalizeInputUrl(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  return url.toString();
}

async function resolveSitemap(
  origin: string,
  declared: string[],
  timeoutMs: number,
  progress: (msg: string) => void,
): Promise<SitemapInfo> {
  const candidates = declared.length > 0 ? declared.slice(0, 2) : [`${origin}/sitemap.xml`];
  for (const candidate of candidates) {
    progress(candidate);
    const res = await fetchUrl(candidate, timeoutMs);
    if (res.ok && /<(urlset|sitemapindex)\b/i.test(res.body)) {
      return { exists: true, url: candidate };
    }
  }
  return { exists: false };
}

function pickInternalLinks(entry: Page, origin: string, limit: number): string[] {
  if (limit <= 0) return [];
  const entryPath = safePath(entry.finalUrl);
  const seen = new Set<string>([entryPath]);
  const picked: string[] = [];

  const candidates = [...entry.links.filter((l) => l.inMain), ...entry.links.filter((l) => !l.inMain)];
  for (const link of candidates) {
    if (picked.length >= limit) break;
    if (!link.internal) continue;
    if (SKIP_EXTENSIONS.test(link.href) || SKIP_PATH_HINTS.test(link.href)) continue;
    const path = safePath(link.href);
    if (path === '/' || seen.has(path)) continue;
    seen.add(path);
    picked.push(`${origin}${path}`);
  }
  return picked;
}

function safePath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function looksLikeRobots(body: string): boolean {
  return /^\s*(user-agent|sitemap|disallow|allow)\s*:/im.test(body) && !/<html/i.test(body);
}

function looksLikeText(fetched: { headers: Record<string, string>; body: string }): boolean {
  if (/<html|<!doctype html/i.test(fetched.body.slice(0, 500))) return false;
  return fetched.body.trim().length > 0;
}

function isHtml(contentType: string | undefined): boolean {
  return !contentType || /text\/html|application\/xhtml/i.test(contentType);
}
