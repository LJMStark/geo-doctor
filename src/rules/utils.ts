import type { Bilingual, Page, RuleResult, RuleStatus, SiteAudit } from '../types.js';

/** Bilingual string shorthand. */
export function bi(en: string, zh: string): Bilingual {
  return { en, zh };
}

const CJK_RE = /[一-鿿぀-ヿ가-힯]/g;

/**
 * Language-fair text size: CJK characters count as 1 unit each,
 * non-CJK words count as 1 unit each.
 */
export function textUnits(text: string): number {
  const cjk = text.match(CJK_RE)?.length ?? 0;
  const latinWords = text
    .replace(CJK_RE, ' ')
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w)).length;
  return cjk + latinWords;
}

const FACT_RE =
  /\d[\d,.]*\s*(?:%|％|percent|万|亿|千万|美元|欧元|元|人|次|倍|款|种|个|项|ms|毫秒|秒|分钟|小时|天|周|GB|MB|TB|KB|kg|km|米|公里|美金|billion|million|thousand|users?|people)?/gi;

/** Count statistic-looking tokens (numbers, percentages, quantities). */
export function countFacts(text: string): number {
  return text.match(FACT_RE)?.length ?? 0;
}

const QUESTION_HEADING_RE =
  /(\?|？)\s*$|^(如何|什么|为什么|为啥|怎么|怎样|哪些|哪个|是否|能否|要不要|该不该)|^(how|what|why|when|where|which|who|can|could|should|is|are|does|do|will)\b/i;

/** Does this heading look like a question a user would ask an AI engine? */
export function isQuestionHeading(text: string): boolean {
  return QUESTION_HEADING_RE.test(text.trim());
}

const DATE_TEXT_RE =
  /\b20\d{2}\s*[-/.年]\s*\d{1,2}(\s*[-/.月]\s*\d{1,2}\s*日?)?|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?,?\s+20\d{2}|\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d{2}/i;

/** Does the text contain a human-visible date? */
export function hasVisibleDate(text: string): boolean {
  return DATE_TEXT_RE.test(text);
}

export interface MachineDates {
  published?: Date;
  modified?: Date;
}

/** Extract machine-readable publish/modify dates from JSON-LD, meta and <time>. */
export function getMachineDates(page: Page): MachineDates {
  const out: MachineDates = {};
  for (const node of page.jsonLd) {
    const published = parseDate(node['datePublished']);
    const modified = parseDate(node['dateModified']);
    if (published && (!out.published || published < out.published)) out.published = published;
    if (modified && (!out.modified || modified > out.modified)) out.modified = modified;
  }
  out.published ??= parseDate(page.meta['article:published_time']) ?? parseDate(page.meta['date']);
  out.modified ??=
    parseDate(page.meta['article:modified_time']) ?? parseDate(page.meta['og:updated_time']);
  if (!out.published && !out.modified) {
    const timeAttr = page.$('time[datetime]').first().attr('datetime');
    const parsed = parseDate(timeAttr);
    if (parsed) out.published = parsed;
  }
  return out;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** All @type values present in a page's JSON-LD, lowercased. */
export function jsonLdTypes(page: Page): Set<string> {
  const types = new Set<string>();
  for (const node of page.jsonLd) {
    const t = node['@type'];
    if (typeof t === 'string') types.add(t.toLowerCase());
    if (Array.isArray(t)) for (const v of t) if (typeof v === 'string') types.add(v.toLowerCase());
  }
  return types;
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export interface PageAverage {
  /** Average of applicable page scores, 0..1. */
  avg: number;
  /** Number of pages the check applied to. */
  applicable: number;
  /** Pages scoring below 0.5 (roughly "failing"). */
  failing: number;
  total: number;
}

/** Score each page (null = not applicable) and aggregate. */
export function averagePages(site: SiteAudit, scoreFn: (page: Page) => number | null): PageAverage {
  const scores: number[] = [];
  for (const page of site.pages) {
    const s = scoreFn(page);
    if (s !== null) scores.push(clamp01(s));
  }
  const applicable = scores.length;
  const avg = applicable === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / applicable;
  return {
    avg,
    applicable,
    failing: scores.filter((s) => s < 0.5).length,
    total: site.pages.length,
  };
}

/** Standard status thresholds: fail < 0.4 ≤ warn < 0.85 ≤ pass. */
export function statusFromScore(score: number, failBelow = 0.4, passFrom = 0.85): RuleStatus {
  if (score >= passFrom) return 'pass';
  if (score >= failBelow) return 'warn';
  return 'fail';
}

export function resultFromScore(
  score: number,
  finding: Bilingual,
  fix?: Bilingual,
  thresholds?: { failBelow?: number; passFrom?: number },
): RuleResult {
  const status = statusFromScore(score, thresholds?.failBelow, thresholds?.passFrom);
  return { status, score: clamp01(score), finding, fix: status === 'pass' ? undefined : fix };
}

export function naResult(finding: Bilingual): RuleResult {
  return { status: 'na', score: 0, finding };
}

/** "2/3 pages" helper for findings. */
export function ratioText(failing: number, total: number): string {
  return `${failing}/${total}`;
}

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = new RegExp("\\x1b\\[[0-9;]*[A-Za-z]|\\x1b(?![[])|[\\x00-\\x08\\x0b-\\x1f\\x7f]", "g");

/**
 * Strip ANSI escape sequences and control characters from site-sourced strings
 * before they enter findings — hostile pages must not inject terminal control codes.
 */
export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS_RE, '').trim();
}
