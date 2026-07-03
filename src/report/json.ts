import type { AuditReport } from '../types.js';

/** Serialize the audit report as stable, pretty-printed JSON. */
export function renderJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2) + '\n';
}
