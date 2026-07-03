import { describe, expect, test } from 'vitest';
import { safePublicUrl } from '../src/crawler/site';
import { stripControlChars } from '../src/rules/utils';
import { scoreSite } from '../src/scoring/scorer';
import { makePage, makeSite, runRule } from './helpers';

describe('safePublicUrl (SSRF guard for robots.txt Sitemap lines)', () => {
  test('rejects cloud metadata, loopback, private and link-local hosts', () => {
    const blocked = [
      'http://169.254.169.254/latest/meta-data/iam/security-credentials/role',
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://localhost:8080/sitemap.xml',
      'http://127.0.0.1/sitemap.xml',
      'http://10.0.0.5/sitemap.xml',
      'http://192.168.1.1/sitemap.xml',
      'http://172.16.0.1/sitemap.xml',
      'http://172.31.255.255/sitemap.xml',
      'http://0.0.0.0/sitemap.xml',
      'http://[::1]/sitemap.xml',
      'http://[fd00::1]/sitemap.xml',
      'http://[fe80::1]/sitemap.xml',
    ];
    for (const url of blocked) {
      expect(safePublicUrl(url), url).toBeNull();
    }
  });

  test('rejects non-http protocols and credentials in URL', () => {
    expect(safePublicUrl('file:///etc/passwd')).toBeNull();
    expect(safePublicUrl('ftp://example.com/sitemap.xml')).toBeNull();
    expect(safePublicUrl('gopher://example.com/')).toBeNull();
    expect(safePublicUrl('https://user:pass@example.com/sitemap.xml')).toBeNull();
    expect(safePublicUrl('not a url')).toBeNull();
  });

  test('allows and normalizes plain public http(s) URLs', () => {
    expect(safePublicUrl('https://example.com/sitemap.xml')).toBe('https://example.com/sitemap.xml');
    expect(safePublicUrl('  https://cdn.example.com/sitemap-index.xml ')).toBe(
      'https://cdn.example.com/sitemap-index.xml',
    );
    expect(safePublicUrl('http://172.15.0.1/sitemap.xml')).toBe('http://172.15.0.1/sitemap.xml');
  });
});

describe('stripControlChars (terminal injection guard)', () => {
  test('removes ANSI escape sequences and control bytes', () => {
    expect(stripControlChars('Article\x1b[2J\x1b[H')).toBe('Article');
    // eslint-disable-next-line no-control-regex
    expect(stripControlChars('\x1b]0;evil\x07name')).not.toMatch(/[\x00-\x1f\x7f]/);
    expect(stripControlChars('\x1b]0;evil\x07name')).toContain('name');
    expect(stripControlChars('clean name')).toBe('clean name');
    expect(stripControlChars('带中文的名字')).toBe('带中文的名字');
  });

  test('hostile og:site_name cannot inject control codes into findings', () => {
    const evil = makeSite({
      pages: [
        makePage(
          '<html><head><meta property="og:site_name" content="Evil\x1b[2J\x1b[HCorp"></head>' +
            '<body><main><h1>t</h1><p>Some content body text.</p></main></body></html>',
        ),
      ],
    });
    const result = runRule('cit.brand-consistency', evil);
    expect(result.finding.en).not.toContain('\x1b');
    expect(result.finding.en).toContain('evil');

    const report = scoreSite(evil);
    for (const entry of report.results) {
      expect(entry.finding.en).not.toContain('\x1b');
      expect(entry.finding.zh).not.toContain('\x1b');
    }
  });
});
