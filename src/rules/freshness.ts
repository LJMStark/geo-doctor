import type { Rule } from '../types.js';
import { averagePages, bi, getMachineDates, hasVisibleDate, naResult, ratioText, resultFromScore } from './utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const freshnessRules: Rule[] = [
  {
    id: 'fresh.visible-date',
    dimension: 'freshness',
    weight: 2,
    name: bi('Human-visible dates', '人眼可见的日期'),
    why: bi(
      'Both users and extraction models look for a visible date to judge whether content is current.',
      '用户和抽取模型都会寻找可见日期来判断内容是否过时。',
    ),
    evidence: ['citation-absorption'],
    check(site) {
      const stats = averagePages(site, (page) => (hasVisibleDate(page.bodyText) ? 1 : 0));
      return resultFromScore(
        stats.avg,
        bi(
          stats.failing === 0
            ? 'Visible dates found on sampled pages.'
            : `${ratioText(stats.failing, stats.total)} sampled pages show no visible date.`,
          stats.failing === 0
            ? '抽样页面均有可见日期。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面没有可见日期。`,
        ),
        bi(
          'Show "Published / Last updated" dates near the top of each article.',
          '在文章顶部附近展示「发布时间 / 最后更新」日期。',
        ),
      );
    },
  },
  {
    id: 'fresh.modified-recency',
    dimension: 'freshness',
    weight: 3,
    name: bi('Recently updated content', '内容近期有更新'),
    why: bi(
      'Answer engines strongly prefer recently-updated sources when queries have any time sensitivity.',
      '只要查询稍有时效性,答案引擎就会强烈偏向近期更新的来源。',
    ),
    evidence: ['citation-absorption', 'cseo-bench'],
    check(site) {
      let newest: Date | undefined;
      for (const page of site.pages) {
        const dates = getMachineDates(page);
        const candidate = dates.modified ?? dates.published;
        if (candidate && (!newest || candidate > newest)) newest = candidate;
      }
      if (!newest) {
        return resultFromScore(
          0.4,
          bi(
            'No machine-readable dates — recency cannot be verified by engines.',
            '没有机器可读日期——引擎无法核实内容新鲜度。',
          ),
          bi('Expose dateModified in JSON-LD so engines can verify freshness.', '在 JSON-LD 中暴露 dateModified,让引擎可核实新鲜度。'),
        );
      }
      const ageDays = Math.max(0, (site.now.getTime() - newest.getTime()) / DAY_MS);
      const score = ageDays <= 365 ? 1 : ageDays <= 730 ? 0.5 : 0.15;
      return resultFromScore(
        score,
        bi(
          `Newest machine-readable date: ${newest.toISOString().slice(0, 10)} (${Math.round(ageDays)} days ago).`,
          `最新机器可读日期:${newest.toISOString().slice(0, 10)}(${Math.round(ageDays)} 天前)。`,
        ),
        bi(
          'Review and update key pages at least yearly; bump dateModified only with real changes.',
          '至少每年审阅并更新核心页面;dateModified 只随真实修改而更新。',
        ),
      );
    },
  },
  {
    id: 'fresh.recent-year',
    dimension: 'freshness',
    weight: 1,
    name: bi('Mentions the current era', '正文提及近年'),
    why: bi(
      'Pages referencing only old years read as abandoned to engines answering "best X in <year>" queries.',
      '正文只出现陈旧年份的页面,在“<年份>最佳 X”类查询中会被当作弃更内容。',
    ),
    evidence: ['cseo-bench'],
    check(site) {
      const thisYear = site.now.getFullYear();
      const stats = averagePages(site, (page) => {
        const years = [...page.mainText.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
        if (years.length === 0) return 0.5;
        const newestYear = Math.max(...years);
        if (newestYear >= thisYear - 1) return 1;
        return newestYear <= thisYear - 3 ? 0.2 : 0.6;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Content references the current/last year.'
            : 'Content mostly references older years (or none).',
          stats.avg >= 0.85 ? '正文提及今年/去年。' : '正文大多只出现陈旧年份(或没有年份)。',
        ),
        bi(
          `Refresh examples, prices and screenshots; mention ${thisYear} where it is truthful.`,
          `更新示例、价格与截图;在符合事实处自然提及 ${thisYear}。`,
        ),
      );
    },
  },
  {
    id: 'fresh.maintained',
    dimension: 'freshness',
    weight: 1,
    name: bi('Maintenance signal (modified > published)', '维护信号(更新时间晚于发布)'),
    why: bi(
      'A dateModified later than datePublished proves the page is maintained, not fire-and-forget.',
      'dateModified 晚于 datePublished 证明页面在持续维护,而非发完即弃。',
    ),
    evidence: ['citation-absorption'],
    check(site) {
      let sawDates = false;
      let maintained = false;
      for (const page of site.pages) {
        const dates = getMachineDates(page);
        if (dates.published || dates.modified) sawDates = true;
        if (dates.published && dates.modified && dates.modified.getTime() > dates.published.getTime()) {
          maintained = true;
        }
      }
      if (!sawDates) {
        return naResult(bi('No machine-readable dates to compare.', '没有可对比的机器可读日期。'));
      }
      return resultFromScore(
        maintained ? 1 : 0.6,
        bi(
          maintained
            ? 'Pages show dateModified later than datePublished.'
            : 'No page shows an update later than its publish date.',
          maintained ? '存在 dateModified 晚于 datePublished 的页面。' : '没有页面的更新时间晚于发布时间。',
        ),
        bi(
          'When you revise a page, update dateModified in JSON-LD and show it visibly.',
          '修订页面时同步更新 JSON-LD 的 dateModified,并在页面上可见展示。',
        ),
      );
    },
  },
];
