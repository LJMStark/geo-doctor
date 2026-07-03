import { describe, expect, test } from 'vitest';
import { goodSite, makePage, makeSite, runRule } from './helpers';

function proseOnlyPage(paragraph: string, count: number) {
  const body = Array.from({ length: count }, () => `<p>${paragraph}</p>`).join('');
  return makePage(`<html><body><main><h1>t</h1>${body}</main></body></html>`);
}

describe('chunkability rules', () => {
  test('good article passes core chunkability rules', () => {
    const site = goodSite();
    for (const id of [
      'chunk.paragraph-size',
      'chunk.qa-structure',
      'chunk.upfront-summary',
      'chunk.list-table-density',
      'chunk.definitions',
      'chunk.heading-density',
      'chunk.anchor-ids',
    ]) {
      expect(runRule(id, site).status, id).toBe('pass');
    }
  });

  test('paragraph-size fails on walls of text', () => {
    const wall = 'word '.repeat(200).trim();
    const site = makeSite({ pages: [proseOnlyPage(wall, 5)] });
    expect(runRule('chunk.paragraph-size', site).status).toBe('fail');
  });

  test('paragraph-size is n/a with too few paragraphs', () => {
    const site = makeSite({ pages: [proseOnlyPage('short one.', 1)] });
    expect(runRule('chunk.paragraph-size', site).status).toBe('na');
  });

  test('qa-structure fails without question headings, passes with FAQ schema', () => {
    const noQ = makeSite({ pages: [proseOnlyPage('plain sentence here.', 4)] });
    expect(runRule('chunk.qa-structure', noQ).status).toBe('fail');

    const faq =
      '<html><head><script type="application/ld+json">{"@type":"FAQPage"}</script></head><body><main><h1>t</h1><p>a</p><p>b</p><p>c</p></main></body></html>';
    const withSchema = makeSite({ pages: [makePage(faq)] });
    expect(runRule('chunk.qa-structure', withSchema).status).not.toBe('fail');
  });

  test('qa-structure recognizes Chinese question headings', () => {
    const html =
      '<html><body><main><h1>指南</h1><h2>什么是生成式引擎优化</h2><p>内容内容内容</p><h2>如何开始第一步</h2><p>更多内容</p></main></body></html>';
    const site = makeSite({ pages: [makePage(html)] });
    expect(runRule('chunk.qa-structure', site).status).toBe('pass');
  });

  test('heading-density fails on long text without sections', () => {
    const wall = 'word '.repeat(900).trim();
    const site = makeSite({ pages: [proseOnlyPage(wall, 1)] });
    expect(runRule('chunk.heading-density', site).status).toBe('fail');
  });

  test('anchor-ids is n/a without sections and fails without ids', () => {
    const noSections = makeSite({ pages: [proseOnlyPage('text here now.', 3)] });
    expect(runRule('chunk.anchor-ids', noSections).status).toBe('na');

    const noIds =
      '<html><body><main><h1>t</h1><h2>one</h2><p>a</p><h2>two</h2><p>b</p></main></body></html>';
    expect(runRule('chunk.anchor-ids', makeSite({ pages: [makePage(noIds)] })).status).toBe('fail');
  });
});
