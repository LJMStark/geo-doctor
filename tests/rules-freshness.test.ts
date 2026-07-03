import { describe, expect, test } from 'vitest';
import { goodSite, makePage, makeSite, runRule } from './helpers';

function pageWithDates(published: string, modified?: string) {
  const ld = modified
    ? `{"@type":"Article","datePublished":"${published}","dateModified":"${modified}"}`
    : `{"@type":"Article","datePublished":"${published}"}`;
  return makePage(
    `<html><head><script type="application/ld+json">${ld}</script></head><body><main><h1>t</h1><p>Content about things.</p></main></body></html>`,
  );
}

describe('freshness rules', () => {
  test('good article passes all freshness rules', () => {
    const site = goodSite();
    for (const id of ['fresh.visible-date', 'fresh.modified-recency', 'fresh.recent-year', 'fresh.maintained']) {
      expect(runRule(id, site).status, id).toBe('pass');
    }
  });

  test('visible-date fails when no date is shown', () => {
    const html = '<html><body><main><p>No dates here at all.</p></main></body></html>';
    expect(runRule('fresh.visible-date', makeSite({ pages: [makePage(html)] })).status).toBe('fail');
  });

  test('modified-recency fails for stale content and warns without dates', () => {
    const stale = makeSite({ pages: [pageWithDates('2022-01-01', '2022-06-01')] });
    expect(runRule('fresh.modified-recency', stale).status).toBe('fail');

    const dateless = makeSite({
      pages: [makePage('<html><body><main><p>hello world</p></main></body></html>')],
    });
    const result = runRule('fresh.modified-recency', dateless);
    expect(result.status).toBe('warn');
    expect(result.score).toBeCloseTo(0.4);
  });

  test('recent-year penalizes old-year-only content', () => {
    const html = '<html><body><main><p>Back in 2019 we launched. In 2020 we grew.</p></main></body></html>';
    const result = runRule('fresh.recent-year', makeSite({ pages: [makePage(html)] }));
    expect(result.status).toBe('fail');
  });

  test('maintained is n/a without machine dates and warns without updates', () => {
    const dateless = makeSite({
      pages: [makePage('<html><body><main><p>hello</p></main></body></html>')],
    });
    expect(runRule('fresh.maintained', dateless).status).toBe('na');

    const publishedOnly = makeSite({ pages: [pageWithDates('2026-05-01')] });
    expect(runRule('fresh.maintained', publishedOnly).status).toBe('warn');
  });
});
