import { describe, expect, test } from 'vitest';
import { renderHtml, escapeHtml } from '../src/report/html';
import { renderTerminal } from '../src/report/terminal';
import { renderJson } from '../src/report/json';
import { scoreSite } from '../src/scoring/scorer';
import { goodSite, makePage, makeSite } from './helpers';

describe('reports', () => {
  const report = scoreSite(goodSite());

  test('terminal report shows score, dimensions and repo link', () => {
    const zh = renderTerminal(report, 'zh');
    expect(zh).toContain('GEO 总分');
    expect(zh).toContain(`${report.totalScore} / 100`);
    expect(zh).toContain('机器可达性');

    const en = renderTerminal(report, 'en');
    expect(en).toContain('GEO Score');
    expect(en).toContain('github.com/geo-doctor');
  });

  test('html report contains score ring, rules and evidence links', () => {
    const html = renderHtml(report, 'en');
    expect(html).toContain(`>${report.totalScore}<`);
    expect(html).toContain('access.ai-crawlers');
    expect(html).toContain('arxiv.org/abs/2311.09735');
    expect(html).toContain('lang="en"');
    expect(renderHtml(report, 'zh')).toContain('AI 搜索体检报告');
  });

  test('html report escapes attacker-controlled page content (XSS)', () => {
    const evil = makeSite({
      pages: [
        makePage(
          '<html><head><meta property="og:site_name" content="<img src=x onerror=alert(1)>"></head>' +
            '<body><main><h1>t</h1><p>Content body text here.</p></main></body></html>',
        ),
      ],
    });
    const html = renderHtml(scoreSite(evil), 'en');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  test('escapeHtml covers all dangerous characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  test('json report round-trips', () => {
    const parsed = JSON.parse(renderJson(report));
    expect(parsed.totalScore).toBe(report.totalScore);
    expect(parsed.results).toHaveLength(33);
  });
});
