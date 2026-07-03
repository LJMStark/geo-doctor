import type {
  AuditReport,
  DimensionScore,
  Grade,
  Rule,
  RuleReportEntry,
  SiteAudit,
} from '../types.js';
import { allRules, DIMENSION_WEIGHTS, DIMENSIONS } from '../rules/index.js';
import { TOOL_NAME, VERSION } from '../version.js';

/** Run every rule against the audited site. A crashing rule becomes an "na" entry, never a crash. */
export function runRules(site: SiteAudit, rules: Rule[] = allRules): RuleReportEntry[] {
  return rules.map((rule) => {
    try {
      const result = rule.check(site);
      return {
        id: rule.id,
        dimension: rule.dimension,
        weight: rule.weight,
        name: rule.name,
        why: rule.why,
        evidence: rule.evidence,
        ...result,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        id: rule.id,
        dimension: rule.dimension,
        weight: rule.weight,
        name: rule.name,
        why: rule.why,
        evidence: rule.evidence,
        status: 'na' as const,
        score: 0,
        finding: {
          en: `Rule skipped (internal error: ${message}).`,
          zh: `规则已跳过(内部错误:${message})。`,
        },
      };
    }
  });
}

function scoreDimension(entries: RuleReportEntry[]): number {
  const applicable = entries.filter((e) => e.status !== 'na');
  if (applicable.length === 0) return 0;
  const weightSum = applicable.reduce((sum, e) => sum + e.weight, 0);
  const weighted = applicable.reduce((sum, e) => sum + e.score * e.weight, 0);
  return Math.round((weighted / weightSum) * 100);
}

export function gradeFor(score: number): Grade {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/** Aggregate rule results into the final report with the 0–100 GEO Score. */
export function buildReport(site: SiteAudit, entries: RuleReportEntry[]): AuditReport {
  const dimensions: DimensionScore[] = DIMENSIONS.map((dimension) => {
    const dimEntries = entries.filter((e) => e.dimension === dimension);
    return {
      dimension,
      score: scoreDimension(dimEntries),
      weight: DIMENSION_WEIGHTS[dimension],
      passed: dimEntries.filter((e) => e.status === 'pass').length,
      warned: dimEntries.filter((e) => e.status === 'warn').length,
      failed: dimEntries.filter((e) => e.status === 'fail').length,
      na: dimEntries.filter((e) => e.status === 'na').length,
    };
  });

  const scorable = dimensions.filter((d) => d.passed + d.warned + d.failed > 0);
  const weightSum = scorable.reduce((sum, d) => sum + d.weight, 0);
  const totalScore =
    weightSum === 0
      ? 0
      : Math.round(scorable.reduce((sum, d) => sum + d.score * d.weight, 0) / weightSum);

  return {
    tool: TOOL_NAME,
    version: VERSION,
    inputUrl: site.inputUrl,
    finalUrl: site.pages[0]?.finalUrl ?? site.inputUrl,
    generatedAt: site.fetchedAt,
    pagesAudited: site.pages.map((p) => p.finalUrl),
    totalScore,
    grade: gradeFor(totalScore),
    dimensions,
    results: entries,
  };
}

/** Convenience: run rules and build the report in one call. */
export function scoreSite(site: SiteAudit, rules: Rule[] = allRules): AuditReport {
  return buildReport(site, runRules(site, rules));
}
