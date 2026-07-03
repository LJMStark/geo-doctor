#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import type { Lang } from './types.js';
import { crawlSite, CrawlError } from './crawler/site.js';
import { scoreSite } from './scoring/scorer.js';
import { renderTerminal } from './report/terminal.js';
import { renderHtml } from './report/html.js';
import { renderJson } from './report/json.js';
import { REPO_URL, VERSION } from './version.js';

function detectLang(flag: string): Lang {
  if (flag === 'zh' || flag === 'en') return flag;
  const env = `${process.env.LANG ?? ''}${process.env.LC_ALL ?? ''}${process.env.LC_MESSAGES ?? ''}`;
  return /zh/i.test(env) ? 'zh' : 'en';
}

const program = new Command();

program
  .name('geo-doctor')
  .description(
    'Can AI see you? Open-source GEO agent — audit your site for AI search visibility.\n' +
      'GEO = Generative Engine Optimization (not geospatial).',
  )
  .version(VERSION);

program
  .command('audit')
  .description('Run an AI-search health checkup on a site (no API key needed)')
  .argument('<url>', 'site or page URL, e.g. example.com')
  .option('-p, --pages <n>', 'max pages to sample (entry + internal)', '3')
  .option('-t, --timeout <ms>', 'per-request timeout in ms', '15000')
  .option('-l, --lang <lang>', 'report language: en | zh | auto', 'auto')
  .option('--html [file]', 'write shareable HTML report (default: geo-report.html)')
  .option('--json [file]', 'write machine-readable JSON report')
  .option('-q, --quiet', 'suppress progress output', false)
  .action(async (url: string, opts: Record<string, unknown>) => {
    const lang = detectLang(String(opts.lang));
    const pages = clampInt(String(opts.pages), 1, 10, 3);
    const timeoutMs = clampInt(String(opts.timeout), 1000, 120_000, 15_000);
    const quiet = Boolean(opts.quiet);

    const checking = lang === 'zh' ? '检查' : 'checking';
    try {
      const site = await crawlSite(url, {
        pages,
        timeoutMs,
        onProgress: quiet ? undefined : (target) => process.stderr.write(chalk.dim(`  → ${checking} ${target}\n`)),
      });
      const report = scoreSite(site);

      process.stdout.write(renderTerminal(report, lang));

      if (opts.html !== undefined) {
        const htmlPath = resolve(typeof opts.html === 'string' ? opts.html : 'geo-report.html');
        await writeFile(htmlPath, renderHtml(report, lang), 'utf-8');
        process.stdout.write(chalk.dim(`  📄 HTML → ${htmlPath}\n`));
      }
      if (opts.json !== undefined) {
        const jsonPath = resolve(typeof opts.json === 'string' ? opts.json : 'geo-report.json');
        await writeFile(jsonPath, renderJson(report), 'utf-8');
        process.stdout.write(chalk.dim(`  📄 JSON → ${jsonPath}\n`));
      }
      if (opts.html === undefined && opts.json === undefined) {
        const hint =
          lang === 'zh'
            ? '提示: 加 --html 生成可分享的体检报告网页'
            : 'tip: add --html for a shareable report page';
        process.stdout.write(chalk.dim(`  ${hint}\n\n`));
      }

      process.exitCode = report.totalScore >= 50 ? 0 : 1;
    } catch (err) {
      if (err instanceof CrawlError) {
        const msg =
          lang === 'zh'
            ? `无法访问 ${err.url}\n  原因: ${err.message}\n  可尝试: 检查 URL 拼写,或用 --timeout 加大超时`
            : `Could not reach ${err.url}\n  ${err.message}\n  Try checking the URL, or raise --timeout`;
        process.stderr.write(chalk.red(`\n  ✖ ${msg}\n\n`));
        process.exitCode = 2;
        return;
      }
      throw err;
    }
  });

// Keep these version promises in sync with the README Roadmap (zh + en).
for (const [name, plannedVersion, blurb] of [
  ['probe', 'v0.2', 'measure your brand visibility inside AI answers (ChatGPT / Perplexity / Gemini / Kimi / …)'],
  ['fix', 'v0.2', 'agent mode: generate llms.txt, JSON-LD, FAQ blocks and rewrite briefs from audit results'],
  ['watch', 'v0.3', 'CI mode: score gate + README badge via GitHub Action'],
] as const) {
  program
    .command(name)
    .description(`${blurb} — coming in ${plannedVersion}`)
    .allowUnknownOption(true)
    .action(() => {
      process.stdout.write(
        `\n  🚧 ${chalk.bold(`geo-doctor ${name}`)} is coming in ${plannedVersion}.\n` +
          `  Star the repo to follow along: ${chalk.cyan(REPO_URL)}\n\n`,
      );
    });
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(chalk.red(`\n  ✖ Unexpected error: ${message}\n`));
  process.exitCode = 2;
});
