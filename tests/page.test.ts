import { describe, expect, test } from 'vitest';
import { loadFixture, makePage, ORIGIN } from './helpers';

describe('parsePage', () => {
  const page = makePage(loadFixture('good-article.html'));

  test('extracts title, lang and charset', () => {
    expect(page.title).toContain('What is GEO?');
    expect(page.lang).toBe('en');
    expect(page.charset).toBe('utf-8');
  });

  test('extracts headings with levels and ids', () => {
    const h1 = page.headings.filter((h) => h.level === 1);
    expect(h1).toHaveLength(1);
    const h2 = page.headings.filter((h) => h.level === 2);
    expect(h2.length).toBeGreaterThanOrEqual(2);
    expect(h2.every((h) => h.id)).toBe(true);
  });

  test('flattens JSON-LD @graph into nodes', () => {
    const types = page.jsonLd.map((n) => n['@type']);
    expect(types).toContain('Article');
    expect(types).toContain('Organization');
    expect(types).toContain('FAQPage');
  });

  test('skips invalid JSON-LD without crashing', () => {
    const broken = makePage(
      '<html><head><script type="application/ld+json">{oops</script></head><body><p>hi there friend</p></body></html>',
    );
    expect(broken.jsonLd).toEqual([]);
  });

  test('classifies internal vs external links and main placement', () => {
    const external = page.links.filter((l) => !l.internal);
    expect(external.some((l) => l.href.includes('arxiv.org'))).toBe(true);
    const about = page.links.find((l) => l.href === `${ORIGIN}/about`);
    expect(about?.internal).toBe(true);
  });

  test('collects meta name and property tags', () => {
    expect(page.meta['og:site_name']).toBe('AcmeGEO');
    expect(page.meta['description']).toMatch(/Generative Engine Optimization/);
  });

  test('extracts paragraphs and images from main content', () => {
    expect(page.paragraphs.length).toBeGreaterThanOrEqual(5);
    expect(page.images.filter((i) => i.inMain)).toHaveLength(1);
    expect(page.images[0]?.alt).toContain('Diagram');
  });

  test('strips scripts from text but measures their bytes', () => {
    expect(page.bodyText).not.toContain('@context');
    expect(page.scriptBytes).toBeGreaterThan(100);
  });
});
