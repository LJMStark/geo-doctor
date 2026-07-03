import { describe, expect, test } from 'vitest';
import { buildReport, gradeFor, runRules, scoreSite } from '../src/scoring/scorer';
import { bi } from '../src/rules/utils';
import type { Rule } from '../src/types';
import { goodSite, poorSite } from './helpers';

function stubRule(id: string, weight: 1 | 2 | 3, score: number, status: 'pass' | 'warn' | 'fail' | 'na'): Rule {
  return {
    id,
    dimension: 'access',
    weight,
    name: bi(id, id),
    why: bi('why', '为何'),
    evidence: ['geo-kdd24'],
    check: () => ({ status, score, finding: bi('found', '所见') }),
  };
}

describe('scorer', () => {
  test('good fixture site scores excellent, poor SPA scores poor', () => {
    const good = scoreSite(goodSite());
    expect(good.totalScore).toBeGreaterThanOrEqual(85);
    expect(good.grade).toBe('excellent');

    const poor = scoreSite(poorSite());
    expect(poor.totalScore).toBeLessThan(50);
    expect(poor.grade).toBe('poor');
  });

  test('dimension score is weight-averaged and excludes n/a', () => {
    const site = goodSite();
    const rules = [
      stubRule('a', 2, 1, 'pass'),
      stubRule('b', 1, 0, 'fail'),
      stubRule('c', 3, 0, 'na'),
    ];
    const report = buildReport(site, runRules(site, rules));
    const access = report.dimensions.find((d) => d.dimension === 'access');
    expect(access?.score).toBe(67); // (1*2 + 0*1) / 3
    expect(access?.na).toBe(1);
  });

  test('a crashing rule degrades to n/a instead of crashing the audit', () => {
    const site = goodSite();
    const boom: Rule = {
      ...stubRule('boom', 2, 1, 'pass'),
      check: () => {
        throw new Error('kaput');
      },
    };
    const entries = runRules(site, [boom]);
    expect(entries[0]?.status).toBe('na');
    expect(entries[0]?.finding.en).toContain('kaput');
  });

  test('grade thresholds', () => {
    expect(gradeFor(85)).toBe('excellent');
    expect(gradeFor(84)).toBe('good');
    expect(gradeFor(70)).toBe('good');
    expect(gradeFor(69)).toBe('fair');
    expect(gradeFor(50)).toBe('fair');
    expect(gradeFor(49)).toBe('poor');
  });

  test('report carries metadata and all 33 rules', () => {
    const report = scoreSite(goodSite());
    expect(report.results).toHaveLength(33);
    expect(report.dimensions).toHaveLength(5);
    expect(report.pagesAudited.length).toBeGreaterThan(0);
    expect(report.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
