import { describe, expect, test } from 'vitest';
import { parseRobots } from '../src/crawler/robots';
import { goodSite, makePage, makeSite, poorSite, runRule } from './helpers';

describe('access rules', () => {
  test('ai-crawlers passes when robots allows everyone', () => {
    const result = runRule('access.ai-crawlers', goodSite());
    expect(result.status).toBe('pass');
    expect(result.score).toBe(1);
  });

  test('ai-crawlers penalizes blocked AI search bots', () => {
    const site = makeSite({
      robots: parseRobots(
        'User-agent: PerplexityBot\nDisallow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:\n',
        true,
      ),
    });
    const result = runRule('access.ai-crawlers', site);
    expect(result.status).not.toBe('pass');
    expect(result.finding.en).toContain('PerplexityBot');
    expect(result.finding.en).toContain('GPTBot');
    expect(result.fix).toBeDefined();
  });

  test('ai-crawlers treats missing robots.txt as open with advice', () => {
    const result = runRule('access.ai-crawlers', poorSite());
    expect(result.status).toBe('pass');
    expect(result.score).toBeCloseTo(0.9);
  });

  test('llms-txt rewards well-formed file and fails when missing', () => {
    expect(runRule('access.llms-txt', goodSite()).status).toBe('pass');
    const missing = runRule('access.llms-txt', poorSite());
    expect(missing.status).toBe('fail');
    expect(missing.fix?.en).toContain('llmstxt.org');
  });

  test('llms-txt warns on thin file', () => {
    const site = makeSite({ llmsTxt: { exists: true, content: 'just some words' } });
    const result = runRule('access.llms-txt', site);
    expect(result.status).toBe('warn');
  });

  test('sitemap pass/fail follows discovery', () => {
    expect(runRule('access.sitemap', goodSite()).status).toBe('pass');
    expect(runRule('access.sitemap', poorSite()).status).toBe('fail');
  });

  test('js-dependency fails on empty SPA shells', () => {
    expect(runRule('access.js-dependency', goodSite()).status).toBe('pass');
    const result = runRule('access.js-dependency', poorSite());
    expect(result.status).toBe('fail');
    expect(result.finding.en).toContain('client-rendered');
  });

  test('response-speed grades by average latency', () => {
    expect(runRule('access.response-speed', goodSite()).status).toBe('pass');
    expect(runRule('access.response-speed', poorSite()).status).toBe('fail');
  });

  test('http-hygiene passes for clean https 200', () => {
    expect(runRule('access.http-hygiene', goodSite()).status).toBe('pass');
  });

  test('meta-robots fails on noindex', () => {
    const html = '<html><head><meta name="robots" content="noindex, nofollow"></head><body><p>x</p></body></html>';
    const site = makeSite({ pages: [makePage(html)] });
    expect(runRule('access.meta-robots', site).status).toBe('fail');
  });
});
