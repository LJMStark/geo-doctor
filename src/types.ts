import type { CheerioAPI } from 'cheerio';

/** GEO here means Generative Engine Optimization — not geospatial. */
export type Dimension = 'access' | 'structure' | 'chunkability' | 'citability' | 'freshness';

export type RuleStatus = 'pass' | 'warn' | 'fail' | 'na';

export type Lang = 'en' | 'zh';

export interface Bilingual {
  en: string;
  zh: string;
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  ok: boolean;
  status: number;
  redirected: boolean;
  responseTimeMs: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
}

export interface Heading {
  level: number;
  text: string;
  id?: string;
}

export interface PageLink {
  href: string;
  text: string;
  internal: boolean;
  inMain: boolean;
}

export interface PageImage {
  src: string;
  alt: string;
  inMain: boolean;
}

/** A fetched + parsed page, ready for rules to inspect. */
export interface Page {
  url: string;
  finalUrl: string;
  status: number;
  redirected: boolean;
  responseTimeMs: number;
  headers: Record<string, string>;
  $: CheerioAPI;
  /** CSS selector chosen as the main content root (e.g. "main", "article", "body"). */
  mainSelector: string;
  title: string;
  lang: string;
  charset: string;
  meta: Record<string, string>;
  jsonLd: Record<string, unknown>[];
  headings: Heading[];
  paragraphs: string[];
  mainText: string;
  bodyText: string;
  links: PageLink[];
  images: PageImage[];
  htmlBytes: number;
  scriptBytes: number;
}

export interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

export interface RobotsInfo {
  exists: boolean;
  content: string;
  groups: RobotsGroup[];
  sitemaps: string[];
}

export interface LlmsTxtInfo {
  exists: boolean;
  content: string;
}

export interface SitemapInfo {
  exists: boolean;
  url?: string;
}

/** Everything the audit gathered about one site. */
export interface SiteAudit {
  inputUrl: string;
  origin: string;
  fetchedAt: string;
  now: Date;
  robots: RobotsInfo;
  llmsTxt: LlmsTxtInfo;
  sitemap: SitemapInfo;
  pages: Page[];
}

export interface RuleResult {
  status: RuleStatus;
  /** 0..1 — contribution to the dimension score. */
  score: number;
  finding: Bilingual;
  fix?: Bilingual;
}

export interface Rule {
  /** e.g. "access.ai-crawlers" */
  id: string;
  dimension: Dimension;
  /** 1 = minor signal, 2 = solid signal, 3 = critical signal */
  weight: 1 | 2 | 3;
  name: Bilingual;
  why: Bilingual;
  /** Evidence ids — see src/evidence/papers.ts */
  evidence: string[];
  check(site: SiteAudit): RuleResult;
}

export interface RuleReportEntry {
  id: string;
  dimension: Dimension;
  weight: number;
  name: Bilingual;
  why: Bilingual;
  evidence: string[];
  status: RuleStatus;
  score: number;
  finding: Bilingual;
  fix?: Bilingual;
}

export interface DimensionScore {
  dimension: Dimension;
  /** 0..100, na rules excluded */
  score: number;
  weight: number;
  passed: number;
  warned: number;
  failed: number;
  na: number;
}

export type Grade = 'excellent' | 'good' | 'fair' | 'poor';

export interface AuditReport {
  tool: string;
  version: string;
  inputUrl: string;
  finalUrl: string;
  generatedAt: string;
  pagesAudited: string[];
  totalScore: number;
  grade: Grade;
  dimensions: DimensionScore[];
  results: RuleReportEntry[];
}

export interface AuditOptions {
  /** Max pages to sample (entry page + internal pages). Default 3. */
  pages?: number;
  /** Per-request timeout in ms. Default 15000. */
  timeoutMs?: number;
  /** Progress callback (crawl steps). */
  onProgress?: (message: string) => void;
}
