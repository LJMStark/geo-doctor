/**
 * GEODoctor — open-source GEO (Generative Engine Optimization) agent.
 * Library entry: crawl a site, run evidence-backed rules, produce a report.
 */
export type * from './types.js';
export { crawlSite, CrawlError, normalizeInputUrl } from './crawler/site.js';
export { fetchUrl } from './crawler/fetcher.js';
export { parsePage } from './crawler/page.js';
export { parseRobots, isAllowed } from './crawler/robots.js';
export { allRules, DIMENSION_WEIGHTS, DIMENSION_LABELS, DIMENSIONS } from './rules/index.js';
export { runRules, buildReport, scoreSite, gradeFor } from './scoring/scorer.js';
export { renderTerminal } from './report/terminal.js';
export { renderHtml, escapeHtml } from './report/html.js';
export { renderJson } from './report/json.js';
export { getEvidence, listEvidence } from './evidence/papers.js';
export { VERSION, TOOL_NAME, REPO_URL } from './version.js';

import type { AuditOptions, AuditReport, SiteAudit } from './types.js';
import { crawlSite } from './crawler/site.js';
import { scoreSite } from './scoring/scorer.js';

/** One-call API: crawl + score. */
export async function audit(
  url: string,
  options: AuditOptions = {},
): Promise<{ report: AuditReport; site: SiteAudit }> {
  const site = await crawlSite(url, options);
  return { report: scoreSite(site), site };
}
