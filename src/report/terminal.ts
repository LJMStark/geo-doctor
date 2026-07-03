import chalk from 'chalk';
import type { AuditReport, Grade, Lang, RuleReportEntry } from '../types.js';
import { DIMENSION_LABELS } from '../rules/index.js';
import { getEvidence } from '../evidence/papers.js';
import { REPO_URL } from '../version.js';

const BAR_FULL = '█';
const BAR_EMPTY = '░';

const GRADE_LABEL: Record<Grade, { en: string; zh: string }> = {
  excellent: { en: 'Excellent', zh: '优秀' },
  good: { en: 'Good', zh: '良好' },
  fair: { en: 'Needs work', zh: '一般' },
  poor: { en: 'At risk', zh: '较差' },
};

const UI = {
  title: { en: 'AI Search Health Report', zh: 'AI 搜索体检报告' },
  score: { en: 'GEO Score', zh: 'GEO 总分' },
  dimensions: { en: 'Dimensions', zh: '维度得分' },
  diagnoses: { en: 'Diagnoses', zh: '确诊问题' },
  prescription: { en: 'Rx', zh: '处方' },
  evidence: { en: 'Evidence', zh: '证据' },
  pages: { en: 'Pages sampled', zh: '抽样页面' },
  clean: { en: 'No critical issues found. This site is in great GEO shape!', zh: '未发现严重问题,站点 GEO 状态很好!' },
  more: (n: number) => ({ en: `… and ${n} more warnings (see HTML report)`, zh: `… 另有 ${n} 条警告(详见 HTML 报告)` }),
};

function scoreColor(score: number): (s: string) => string {
  if (score >= 85) return chalk.green;
  if (score >= 70) return chalk.cyan;
  if (score >= 50) return chalk.yellow;
  return chalk.red;
}

function bar(score: number, width: number): string {
  const filled = Math.round((score / 100) * width);
  return scoreColor(score)(BAR_FULL.repeat(filled)) + chalk.gray(BAR_EMPTY.repeat(width - filled));
}

/** Display width: CJK chars count as 2 columns. */
function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) width += /[一-鿿぀-ヿ가-힯()（）:：、,，。]/.test(ch) ? 2 : 1;
  return width;
}

function padDisplay(text: string, target: number): string {
  const gap = target - displayWidth(text);
  return text + ' '.repeat(Math.max(0, gap));
}

function severity(entry: RuleReportEntry): number {
  return (entry.status === 'fail' ? 100 : 0) + entry.weight;
}

function severityTag(entry: RuleReportEntry, lang: Lang): string {
  if (entry.weight === 3) return lang === 'zh' ? '高' : 'HIGH';
  if (entry.weight === 2) return lang === 'zh' ? '中' : 'MED';
  return lang === 'zh' ? '低' : 'LOW';
}

/** Render the shareable terminal scorecard. */
export function renderTerminal(report: AuditReport, lang: Lang): string {
  const lines: string[] = [];
  const grade = GRADE_LABEL[report.grade][lang];
  const color = scoreColor(report.totalScore);

  lines.push('');
  lines.push(`  ${chalk.bold('🩺 GEODoctor')} ${chalk.dim('·')} ${chalk.bold(UI.title[lang])}`);
  lines.push(`  ${chalk.dim(report.finalUrl)}`);
  lines.push('');
  lines.push(`  ${chalk.bold(UI.score[lang])}`);
  lines.push(`  ${bar(report.totalScore, 24)}  ${color(chalk.bold(`${report.totalScore} / 100`))}  ${color(grade)}`);
  lines.push('');

  lines.push(`  ${chalk.bold(UI.dimensions[lang])}`);
  const labelWidth = Math.max(...report.dimensions.map((d) => displayWidth(DIMENSION_LABELS[d.dimension][lang])));
  for (const dim of report.dimensions) {
    const label = padDisplay(DIMENSION_LABELS[dim.dimension][lang], labelWidth);
    const pct = String(dim.score).padStart(3);
    lines.push(`  ${scoreColor(dim.score)('●')} ${label}  ${bar(dim.score, 12)} ${scoreColor(dim.score)(pct)}`);
  }
  lines.push('');

  const issues = report.results
    .filter((r) => r.status === 'fail' || r.status === 'warn')
    .sort((a, b) => severity(b) - severity(a));
  const shown = issues.slice(0, 8);

  if (issues.length === 0) {
    lines.push(`  ${chalk.green('✔')} ${UI.clean[lang]}`);
  } else {
    lines.push(`  ${chalk.bold(UI.diagnoses[lang])} (${issues.length})`);
    for (const issue of shown) {
      const symbol = issue.status === 'fail' ? chalk.red('✖') : chalk.yellow('⚠');
      const tag = issue.status === 'fail' ? chalk.red(`[${severityTag(issue, lang)}]`) : chalk.yellow(`[${severityTag(issue, lang)}]`);
      lines.push(`  ${symbol} ${tag} ${chalk.bold(issue.name[lang])} ${chalk.dim('· ' + issue.finding[lang])}`);
      if (issue.fix) {
        lines.push(`     ${chalk.dim('↳')} ${chalk.cyan(UI.prescription[lang] + ':')} ${issue.fix[lang]}`);
      }
      const evidence = issue.evidence
        .map((id) => getEvidence(id)?.source)
        .filter(Boolean)
        .slice(0, 2)
        .join(' · ');
      if (evidence) lines.push(`     ${chalk.dim(`${UI.evidence[lang]}: ${evidence}`)}`);
    }
    if (issues.length > shown.length) {
      lines.push(`  ${chalk.dim(UI.more(issues.length - shown.length)[lang])}`);
    }
  }

  lines.push('');
  lines.push(`  ${chalk.dim(`${UI.pages[lang]}: ${report.pagesAudited.length} · ${report.generatedAt.slice(0, 10)} · v${report.version}`)}`);
  lines.push(`  ${chalk.dim(`⭐ ${REPO_URL}`)}`);
  lines.push('');
  return lines.join('\n');
}
