import type { Bilingual, Dimension, Rule } from '../types.js';
import { accessRules } from './access.js';
import { structureRules } from './structure.js';
import { chunkabilityRules } from './chunkability.js';
import { citabilityRules } from './citability.js';
import { freshnessRules } from './freshness.js';

/** All built-in rules — 33 evidence-backed checks across 5 dimensions. */
export const allRules: Rule[] = [
  ...accessRules,
  ...structureRules,
  ...chunkabilityRules,
  ...citabilityRules,
  ...freshnessRules,
];

/** Relative weight of each dimension in the total GEO Score. */
export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  access: 0.2,
  structure: 0.2,
  chunkability: 0.25,
  citability: 0.25,
  freshness: 0.1,
};

export const DIMENSION_LABELS: Record<Dimension, Bilingual> = {
  access: { en: 'Machine Access', zh: '机器可达性' },
  structure: { en: 'Structure & Semantics', zh: '结构与语义' },
  chunkability: { en: 'Chunkability', zh: '可切片性' },
  citability: { en: 'Citability & Trust', zh: '可引用性' },
  freshness: { en: 'Freshness', zh: '新鲜度' },
};

export const DIMENSIONS: Dimension[] = ['access', 'structure', 'chunkability', 'citability', 'freshness'];
