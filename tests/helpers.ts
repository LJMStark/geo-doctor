import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePage } from '../src/crawler/page';
import { parseRobots } from '../src/crawler/robots';
import { allRules } from '../src/rules/index';
import type { FetchResult, Page, RuleResult, SiteAudit } from '../src/types';

/** Run a single built-in rule by id. */
export function runRule(id: string, site: SiteAudit): RuleResult {
  const rule = allRules.find((r) => r.id === id);
  if (!rule) throw new Error(`unknown rule: ${id}`);
  return rule.check(site);
}

export const ORIGIN = 'https://example.com';
export const NOW = new Date('2026-07-01T00:00:00Z');

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

export function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

export function makeFetch(body: string, overrides: Partial<FetchResult> = {}): FetchResult {
  return {
    url: `${ORIGIN}/guide/what-is-geo`,
    finalUrl: `${ORIGIN}/guide/what-is-geo`,
    ok: true,
    status: 200,
    redirected: false,
    responseTimeMs: 800,
    headers: { 'content-type': 'text/html; charset=utf-8' },
    body,
    ...overrides,
  };
}

export function makePage(html: string, overrides: Partial<FetchResult> = {}): Page {
  return parsePage(makeFetch(html, overrides), ORIGIN);
}

const GOOD_ROBOTS = `User-agent: *\nDisallow:\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;

const GOOD_LLMS = `# AcmeGEO\n\n> Open-source GEO knowledge base.\n\n## Guides\n- [What is GEO](${ORIGIN}/guide/what-is-geo)\n- [GEO vs SEO](${ORIGIN}/guide/geo-vs-seo)\n- [llms.txt guide](${ORIGIN}/guide/llms-txt)\n`;

export function makeSite(overrides: Partial<SiteAudit> = {}): SiteAudit {
  return {
    inputUrl: `${ORIGIN}/guide/what-is-geo`,
    origin: ORIGIN,
    fetchedAt: NOW.toISOString(),
    now: NOW,
    robots: parseRobots(GOOD_ROBOTS, true),
    llmsTxt: { exists: true, content: GOOD_LLMS },
    sitemap: { exists: true, url: `${ORIGIN}/sitemap.xml` },
    pages: [makePage(loadFixture('good-article.html'))],
    ...overrides,
  };
}

export function goodSite(): SiteAudit {
  return makeSite();
}

/** Client-rendered shell: near-empty HTML, heavy inline script, no metadata. */
export function poorSpaHtml(): string {
  const bundle = 'var x="' + 'a'.repeat(120_000) + '";';
  return `<!doctype html><html><head><title>app</title><script>${bundle}</script></head><body><div id="root"></div></body></html>`;
}

export function poorSite(): SiteAudit {
  return makeSite({
    robots: parseRobots('', false),
    llmsTxt: { exists: false, content: '' },
    sitemap: { exists: false },
    pages: [makePage(poorSpaHtml(), { responseTimeMs: 6000 })],
  });
}
