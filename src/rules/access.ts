import type { Rule } from '../types.js';
import { isAllowed } from '../crawler/robots.js';
import { averagePages, bi, ratioText, resultFromScore, stripControlChars, textUnits } from './utils.js';

/** AI search / browsing crawlers — blocking these removes you from AI answers now. */
const SEARCH_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
];

/** Model-training crawlers — blocking is a legitimate choice, but reduces long-term AI visibility. */
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Bytespider'];

export const accessRules: Rule[] = [
  {
    id: 'access.ai-crawlers',
    dimension: 'access',
    weight: 3,
    name: bi('AI crawlers allowed in robots.txt', 'robots.txt 放行 AI 爬虫'),
    why: bi(
      'If AI search crawlers are blocked, your content cannot appear in AI answers regardless of quality.',
      'AI 搜索爬虫被屏蔽时，内容质量再高也无法进入 AI 答案。',
    ),
    evidence: ['vercel-crawlers', 'citation-lab-data'],
    check(site) {
      if (!site.robots.exists) {
        return resultFromScore(
          0.9,
          bi(
            'No robots.txt found — all crawlers are allowed by default. Consider declaring an explicit policy.',
            '未找到 robots.txt——默认放行所有爬虫。建议显式声明策略。',
          ),
          bi('Add a robots.txt that explicitly allows AI crawlers.', '添加 robots.txt 并显式放行 AI 爬虫。'),
        );
      }
      const blockedSearch = SEARCH_BOTS.filter((bot) => !isAllowed(site.robots, bot));
      const blockedTraining = TRAINING_BOTS.filter((bot) => !isAllowed(site.robots, bot));
      const score =
        1 -
        0.8 * (blockedSearch.length / SEARCH_BOTS.length) -
        0.2 * (blockedTraining.length / TRAINING_BOTS.length);
      const blockedList = [...blockedSearch, ...blockedTraining].join(', ') || 'none';
      return resultFromScore(
        score,
        bi(
          blockedSearch.length + blockedTraining.length === 0
            ? 'All major AI crawlers are allowed.'
            : `Blocked AI crawlers: ${blockedList}.`,
          blockedSearch.length + blockedTraining.length === 0
            ? '主流 AI 爬虫全部放行。'
            : `被屏蔽的 AI 爬虫：${blockedList}。`,
        ),
        bi(
          'Remove Disallow rules for AI search bots (OAI-SearchBot, PerplexityBot, ChatGPT-User, Claude-SearchBot). Blocking training bots (GPTBot, ClaudeBot) is your choice but reduces AI visibility.',
          '移除针对 AI 搜索爬虫（OAI-SearchBot、PerplexityBot、ChatGPT-User、Claude-SearchBot）的 Disallow 规则。屏蔽训练爬虫（GPTBot、ClaudeBot）是站方权利，但会降低 AI 可见度。',
        ),
      );
    },
  },
  {
    id: 'access.llms-txt',
    dimension: 'access',
    weight: 2,
    name: bi('llms.txt present and well-formed', 'llms.txt 存在且格式规范'),
    why: bi(
      'llms.txt gives LLMs a curated, token-efficient map of your most important pages.',
      'llms.txt 为 LLM 提供一份精选、省 token 的重点内容地图。',
    ),
    evidence: ['llmstxt'],
    check(site) {
      if (!site.llmsTxt.exists) {
        return resultFromScore(
          0,
          bi('No llms.txt found at site root.', '站点根目录没有 llms.txt。'),
          bi(
            'Create /llms.txt following llmstxt.org: an H1 title, a one-line "> summary", then H2 sections with markdown links to key pages.',
            '按 llmstxt.org 规范创建 /llms.txt：H1 标题 + 一行 "> 摘要" + H2 分节的重点页面 Markdown 链接。',
          ),
        );
      }
      const content = site.llmsTxt.content;
      const hasH1 = /^#\s+.+/m.test(content);
      const hasSummary = /^>\s+.+/m.test(content);
      const linkCount = content.match(/\[[^\]]+\]\([^)]+\)/g)?.length ?? 0;
      const score = 0.4 + (hasH1 ? 0.2 : 0) + (hasSummary ? 0.1 : 0) + (linkCount >= 3 ? 0.3 : linkCount > 0 ? 0.15 : 0);
      return resultFromScore(
        score,
        bi(
          `llms.txt found (H1: ${hasH1 ? 'yes' : 'no'}, summary: ${hasSummary ? 'yes' : 'no'}, links: ${linkCount}).`,
          `找到 llms.txt（H1：${hasH1 ? '有' : '无'}，摘要行：${hasSummary ? '有' : '无'}，链接数：${linkCount}）。`,
        ),
        bi(
          'Improve llms.txt structure: add an H1 title, a "> summary" line and at least 3 markdown links.',
          '完善 llms.txt 结构：补充 H1 标题、"> 摘要" 行和至少 3 条 Markdown 链接。',
        ),
      );
    },
  },
  {
    id: 'access.sitemap',
    dimension: 'access',
    weight: 2,
    name: bi('Sitemap discoverable', 'Sitemap 可发现'),
    why: bi(
      'AI crawlers use sitemaps to find and refresh your pages efficiently.',
      'AI 爬虫依赖 sitemap 高效发现与更新页面。',
    ),
    evidence: ['vercel-crawlers'],
    check(site) {
      if (site.sitemap.exists) {
        const shown = stripControlChars(site.sitemap.url ?? '');
        return resultFromScore(1, bi(`Sitemap found: ${shown}`, `找到 Sitemap：${shown}`));
      }
      return resultFromScore(
        0,
        bi('No sitemap.xml found (checked robots.txt and /sitemap.xml).', '未找到 sitemap.xml（已检查 robots.txt 声明和 /sitemap.xml）。'),
        bi(
          'Generate a sitemap.xml and declare it in robots.txt with a "Sitemap:" line.',
          '生成 sitemap.xml，并在 robots.txt 中用 "Sitemap:" 行声明。',
        ),
      );
    },
  },
  {
    id: 'access.js-dependency',
    dimension: 'access',
    weight: 3,
    name: bi('Content readable without JavaScript', '内容不依赖 JavaScript 渲染'),
    why: bi(
      'Most AI crawlers fetch HTML but do not execute JavaScript — client-rendered content is invisible to them.',
      '绝大多数 AI 爬虫只抓 HTML、不执行 JavaScript——纯客户端渲染的内容对它们不可见。',
    ),
    evidence: ['vercel-crawlers'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const units = textUnits(page.bodyText);
        const shell = page.$('#root, #app, #__next, #___gatsby, [data-reactroot]').first();
        const emptyShell = shell.length > 0 && textUnits(shell.text()) < 50;
        if (units < 150 && (emptyShell || page.scriptBytes > 100_000)) return 0;
        if (units < 400 && page.scriptBytes > 200_000) return 0.5;
        return 1;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.failing === 0
            ? 'Server-rendered text content detected on all sampled pages.'
            : `${ratioText(stats.failing, stats.total)} sampled pages look client-rendered (near-empty HTML shell).`,
          stats.failing === 0
            ? '抽样页面均能在 HTML 中直接读到正文。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面疑似纯客户端渲染（HTML 壳几乎无正文）。`,
        ),
        bi(
          'Use SSR/SSG (or prerendering) so the full article text is present in the initial HTML response.',
          '改用 SSR/SSG（或预渲染），确保首个 HTML 响应中就包含完整正文。',
        ),
      );
    },
  },
  {
    id: 'access.response-speed',
    dimension: 'access',
    weight: 2,
    name: bi('Fast response for crawlers', '响应速度对爬虫友好'),
    why: bi(
      'AI crawlers operate on tight time budgets; slow pages get truncated or skipped.',
      'AI 爬虫抓取预算很紧，响应慢的页面会被截断或放弃。',
    ),
    evidence: ['vercel-crawlers'],
    check(site) {
      const times = site.pages.map((p) => p.responseTimeMs);
      const avgMs = times.reduce((a, b) => a + b, 0) / Math.max(1, times.length);
      const score = avgMs <= 1500 ? 1 : avgMs <= 4000 ? 0.6 : avgMs <= 8000 ? 0.3 : 0.1;
      return resultFromScore(
        score,
        bi(`Average full-response time: ${Math.round(avgMs)}ms.`, `平均完整响应耗时：${Math.round(avgMs)}ms。`),
        bi(
          'Target < 1.5s full response: cache HTML at the edge/CDN and cut server latency.',
          '目标完整响应 < 1.5 秒：为 HTML 配置 CDN/边缘缓存，压缩服务端耗时。',
        ),
      );
    },
  },
  {
    id: 'access.http-hygiene',
    dimension: 'access',
    weight: 1,
    name: bi('HTTPS and clean status codes', 'HTTPS 与干净的状态码'),
    why: bi(
      'Retrieval layers prefer secure, directly-resolvable URLs; redirect chains waste crawl budget.',
      '检索层偏好安全、可直达的 URL；重定向链会浪费抓取预算。',
    ),
    evidence: ['eeat'],
    check(site) {
      const httpsOk = site.pages.every((p) => p.finalUrl.startsWith('https://'));
      const statusOk = site.pages.every((p) => p.status >= 200 && p.status < 300);
      const redirects = site.pages.filter((p) => p.redirected).length;
      const score = (httpsOk ? 0.6 : 0) + (statusOk ? 0.25 : 0) + (redirects === 0 ? 0.15 : 0.05);
      return resultFromScore(
        score,
        bi(
          `HTTPS: ${httpsOk ? 'yes' : 'no'}; 2xx status: ${statusOk ? 'yes' : 'no'}; redirected pages: ${redirects}.`,
          `HTTPS：${httpsOk ? '是' : '否'}；2xx 状态：${statusOk ? '是' : '否'}；发生重定向的页面：${redirects} 个。`,
        ),
        bi(
          'Serve everything over HTTPS and link to final URLs directly to avoid redirect hops.',
          '全站 HTTPS，并直接链接最终 URL，避免多级重定向。',
        ),
      );
    },
  },
  {
    id: 'access.meta-robots',
    dimension: 'access',
    weight: 2,
    name: bi('No page-level indexing blocks', '页面级不阻断收录'),
    why: bi(
      'noindex / nosnippet meta directives silently remove pages from AI retrieval even when robots.txt allows crawling.',
      '即便 robots.txt 放行，noindex / nosnippet 元指令也会悄悄把页面挡在 AI 检索之外。',
    ),
    evidence: ['schema-org'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const meta = (page.meta['robots'] ?? '').toLowerCase();
        const header = (page.headers['x-robots-tag'] ?? '').toLowerCase();
        const combined = `${meta} ${header}`;
        if (/noindex|\bnone\b/.test(combined)) return 0;
        if (/nosnippet|max-snippet\s*:\s*0/.test(combined)) return 0.4;
        return 1;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.failing === 0
            ? 'No noindex / nosnippet directives found.'
            : `${ratioText(stats.failing, stats.total)} sampled pages carry noindex-type directives.`,
          stats.failing === 0
            ? '未发现 noindex / nosnippet 指令。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面带有 noindex 类指令。`,
        ),
        bi(
          'Remove noindex / nosnippet / max-snippet:0 from pages you want cited by AI engines.',
          '移除希望被 AI 引用页面上的 noindex / nosnippet / max-snippet:0 指令。',
        ),
      );
    },
  },
];
