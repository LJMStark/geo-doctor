import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { listEvidence, getEvidence } from '../src/evidence/papers';
import { allRules } from '../src/rules/index';
import { VERSION } from '../src/version';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('project invariants', () => {
  test('VERSION matches package.json', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as { version: string };
    expect(VERSION).toBe(pkg.version);
  });

  test('there are exactly 33 rules with unique ids', () => {
    expect(allRules).toHaveLength(33);
    expect(new Set(allRules.map((r) => r.id)).size).toBe(33);
  });

  test('every rule cites at least one registered evidence entry', () => {
    for (const rule of allRules) {
      expect(rule.evidence.length, rule.id).toBeGreaterThan(0);
      for (const id of rule.evidence) {
        expect(getEvidence(id), `${rule.id} cites unknown evidence "${id}"`).toBeDefined();
      }
    }
  });

  test('evidence registry has bilingual findings and valid URLs', () => {
    for (const ev of listEvidence()) {
      expect(ev.finding.en.length).toBeGreaterThan(10);
      expect(ev.finding.zh.length).toBeGreaterThan(5);
      expect(() => new URL(ev.url)).not.toThrow();
    }
  });
});
