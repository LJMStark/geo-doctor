import { describe, expect, test } from 'vitest';
import { goodSite, makePage, makeSite, poorSite, runRule } from './helpers';

describe('structure rules', () => {
  test('good article passes every structure rule', () => {
    const site = goodSite();
    for (const id of [
      'structure.heading-hierarchy',
      'structure.semantic-html',
      'structure.schema-jsonld',
      'structure.meta-og',
      'structure.machine-dates',
      'structure.lang-charset',
      'structure.canonical',
    ]) {
      expect(runRule(id, site).status, id).toBe('pass');
    }
  });

  test('heading-hierarchy flags multiple H1 and level jumps', () => {
    const html =
      '<html><body><h1>a</h1><h1>b</h1><h4>jump</h4><p>text text text</p></body></html>';
    const result = runRule('structure.heading-hierarchy', makeSite({ pages: [makePage(html)] }));
    expect(result.status).not.toBe('pass');
  });

  test('schema-jsonld distinguishes content types from base-only', () => {
    const orgOnly =
      '<html><head><script type="application/ld+json">{"@type":"Organization","name":"X"}</script></head><body><p>x</p></body></html>';
    const result = runRule('structure.schema-jsonld', makeSite({ pages: [makePage(orgOnly)] }));
    expect(result.status).toBe('warn');
    expect(runRule('structure.schema-jsonld', poorSite()).status).toBe('fail');
  });

  test('machine-dates fails when nothing is machine-readable', () => {
    expect(runRule('structure.machine-dates', poorSite()).status).toBe('fail');
  });

  test('canonical warns when missing and fails cross-origin', () => {
    const missing = runRule('structure.canonical', poorSite());
    expect(missing.status).toBe('warn');
    const cross =
      '<html><head><link rel="canonical" href="https://other.com/page"></head><body><p>x</p></body></html>';
    expect(runRule('structure.canonical', makeSite({ pages: [makePage(cross)] })).status).toBe('fail');
  });

  test('lang-charset warns when lang is missing', () => {
    expect(runRule('structure.lang-charset', poorSite()).status).not.toBe('pass');
  });
});
