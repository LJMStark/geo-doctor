import { describe, expect, test } from 'vitest';
import { isAllowed, parseRobots } from '../src/crawler/robots';

describe('parseRobots', () => {
  test('parses groups, multi-agent blocks and sitemaps', () => {
    const robots = parseRobots(
      [
        'User-agent: GPTBot',
        'User-agent: ClaudeBot',
        'Disallow: /',
        '',
        'User-agent: *',
        'Disallow: /private',
        'Allow: /private/public',
        '',
        'Sitemap: https://example.com/sitemap.xml',
      ].join('\n'),
      true,
    );
    expect(robots.groups).toHaveLength(2);
    expect(robots.groups[0]?.agents).toEqual(['gptbot', 'claudebot']);
    expect(robots.sitemaps).toEqual(['https://example.com/sitemap.xml']);
  });

  test('ignores comments and blank lines', () => {
    const robots = parseRobots('# hello\n\nUser-agent: * # star\nDisallow: /tmp # temp\n', true);
    expect(robots.groups[0]?.disallow).toEqual(['/tmp']);
  });
});

describe('isAllowed', () => {
  const robots = parseRobots(
    ['User-agent: GPTBot', 'Disallow: /', '', 'User-agent: *', 'Disallow: /private', 'Allow: /private/open'].join(
      '\n',
    ),
    true,
  );

  test('blocks agent with Disallow /', () => {
    expect(isAllowed(robots, 'GPTBot', '/')).toBe(false);
  });

  test('falls back to star group for unknown agents', () => {
    expect(isAllowed(robots, 'PerplexityBot', '/')).toBe(true);
    expect(isAllowed(robots, 'PerplexityBot', '/private/data')).toBe(false);
  });

  test('Allow overrides longer than Disallow wins', () => {
    expect(isAllowed(robots, 'PerplexityBot', '/private/open')).toBe(true);
  });

  test('missing robots.txt allows everyone', () => {
    expect(isAllowed(parseRobots('', false), 'GPTBot', '/')).toBe(true);
  });

  test('empty Disallow value allows crawling', () => {
    const open = parseRobots('User-agent: *\nDisallow:\n', true);
    expect(isAllowed(open, 'GPTBot', '/')).toBe(true);
  });

  test('wildcard patterns match', () => {
    const wild = parseRobots('User-agent: *\nDisallow: /*.pdf', true);
    expect(isAllowed(wild, 'GPTBot', '/whitepaper.pdf')).toBe(false);
    expect(isAllowed(wild, 'GPTBot', '/whitepaper')).toBe(true);
  });
});
