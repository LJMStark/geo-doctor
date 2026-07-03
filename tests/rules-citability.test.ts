import { describe, expect, test } from 'vitest';
import { goodSite, makePage, makeSite, runRule } from './helpers';

const FILLER = 'This is a sentence about the topic that goes on for a while. '.repeat(20);

describe('citability rules', () => {
  test('good article passes core citability rules', () => {
    const site = goodSite();
    for (const id of [
      'cit.fact-density',
      'cit.source-citations',
      'cit.quotables',
      'cit.author-byline',
      'cit.entity-pages',
      'cit.brand-consistency',
      'cit.image-alt',
    ]) {
      expect(runRule(id, site).status, id).toBe('pass');
    }
  });

  test('fact-density fails on number-free prose', () => {
    const html = `<html><body><main><h1>t</h1><p>${FILLER}</p></main></body></html>`;
    const result = runRule('cit.fact-density', makeSite({ pages: [makePage(html)] }));
    expect(result.status).toBe('fail');
    expect(result.fix?.zh).toContain('数字');
  });

  test('source-citations ignores nav links and share links', () => {
    const html = `<html><body>
      <nav><a href="https://elsewhere.com/x">nav external</a></nav>
      <main><h1>t</h1><p>${FILLER}</p>
      <a href="https://twitter.com/intent/tweet?url=1">share</a></main>
    </body></html>`;
    const result = runRule('cit.source-citations', makeSite({ pages: [makePage(html)] }));
    expect(result.status).toBe('fail');
  });

  test('author-byline fails without any author signal', () => {
    const html = `<html><body><main><h1>t</h1><p>${FILLER}</p></main></body></html>`;
    expect(runRule('cit.author-byline', makeSite({ pages: [makePage(html)] })).status).toBe('fail');
  });

  test('entity-pages scores half for link-only identity', () => {
    const html = `<html><body><main><p>${FILLER}</p><a href="/about">About us</a></main></body></html>`;
    const result = runRule('cit.entity-pages', makeSite({ pages: [makePage(html)] }));
    expect(result.status).toBe('warn');
    expect(result.score).toBeCloseTo(0.5);
  });

  test('content-depth flags thin pages', () => {
    const html = '<html><body><main><h1>t</h1><p>tiny content.</p></main></body></html>';
    expect(runRule('cit.content-depth', makeSite({ pages: [makePage(html)] })).status).toBe('fail');
  });

  test('brand-consistency flags conflicting names', () => {
    const html = `<html><head>
      <meta property="og:site_name" content="Alpha Corp">
      <script type="application/ld+json">{"@type":"Organization","name":"Totally Different Inc"}</script>
      </head><body><main><p>${FILLER}</p></main></body></html>`;
    const result = runRule('cit.brand-consistency', makeSite({ pages: [makePage(html)] }));
    expect(result.status).toBe('warn');
    expect(result.finding.en).toContain('Conflicting');
  });

  test('image-alt is n/a without content images', () => {
    const html = `<html><body><main><p>${FILLER}</p></main></body></html>`;
    expect(runRule('cit.image-alt', makeSite({ pages: [makePage(html)] })).status).toBe('na');
  });

  test('image-alt fails when alts are missing', () => {
    const html = `<html><body><main><p>${FILLER}</p><img src="/a.png"><img src="/b.png"></main></body></html>`;
    expect(runRule('cit.image-alt', makeSite({ pages: [makePage(html)] })).status).toBe('fail');
  });
});
