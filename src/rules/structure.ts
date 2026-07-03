import type { Rule } from '../types.js';
import {
  averagePages,
  bi,
  getMachineDates,
  jsonLdTypes,
  ratioText,
  resultFromScore,
  stripControlChars,
} from './utils.js';

const CONTENT_SCHEMA_TYPES = new Set([
  'article',
  'blogposting',
  'newsarticle',
  'techarticle',
  'faqpage',
  'qapage',
  'howto',
  'product',
  'softwareapplication',
  'recipe',
  'dataset',
  'review',
]);

const BASE_SCHEMA_TYPES = new Set(['organization', 'website', 'webpage', 'breadcrumblist', 'person', 'localbusiness']);

export const structureRules: Rule[] = [
  {
    id: 'structure.heading-hierarchy',
    dimension: 'structure',
    weight: 2,
    name: bi('Clean heading hierarchy', '标题层级清晰'),
    why: bi(
      'Retrieval chunkers split documents along headings; a broken hierarchy produces incoherent chunks.',
      '检索切片器沿标题切分文档，混乱的层级会切出语义破碎的片段。',
    ),
    evidence: ['citation-absorption'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const h1s = page.headings.filter((h) => h.level === 1).length;
        const h2s = page.headings.filter((h) => h.level === 2).length;
        let jumps = 0;
        for (let i = 1; i < page.headings.length; i++) {
          const prev = page.headings[i - 1]!.level;
          const cur = page.headings[i]!.level;
          if (cur > prev + 1) jumps++;
        }
        return (h1s === 1 ? 0.5 : h1s > 1 ? 0.2 : 0) + (jumps === 0 ? 0.3 : 0.1) + (h2s >= 2 ? 0.2 : 0.05);
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.failing === 0
            ? 'Headings are well-structured on sampled pages.'
            : `${ratioText(stats.failing, stats.total)} sampled pages have heading problems (missing/multiple H1 or skipped levels).`,
          stats.failing === 0
            ? '抽样页面标题结构良好。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面存在标题问题（H1 缺失/多个，或层级跳跃）。`,
        ),
        bi(
          'Use exactly one H1 per page, keep levels sequential (H2 → H3), and organise content under 2+ H2 sections.',
          '每页恰好一个 H1，层级顺序递进（H2 → H3），正文组织在 2 个以上 H2 小节下。',
        ),
      );
    },
  },
  {
    id: 'structure.semantic-html',
    dimension: 'structure',
    weight: 1,
    name: bi('Semantic HTML landmarks', '语义化 HTML 地标'),
    why: bi(
      'main/article landmarks tell extractors where the content is — and where the navigation noise is not.',
      'main/article 等地标让抽取器直接定位正文，剔除导航噪音。',
    ),
    evidence: ['schema-org'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const hasMain = page.$('main, article, [role="main"]').length > 0;
        const hasNav = page.$('nav').length > 0;
        const hasFooter = page.$('footer').length > 0;
        return (hasMain ? 0.6 : 0) + (hasNav ? 0.2 : 0) + (hasFooter ? 0.2 : 0);
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Semantic landmarks (main/article/nav/footer) in place.'
            : `${ratioText(stats.failing, stats.total)} sampled pages lack <main>/<article> landmarks.`,
          stats.avg >= 0.85
            ? '语义地标（main/article/nav/footer）齐备。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面缺少 <main>/<article> 地标。`,
        ),
        bi(
          'Wrap primary content in <main> or <article>; keep navigation inside <nav> and boilerplate inside <footer>.',
          '用 <main> 或 <article> 包裹正文；导航放入 <nav>，模板尾部放入 <footer>。',
        ),
      );
    },
  },
  {
    id: 'structure.schema-jsonld',
    dimension: 'structure',
    weight: 3,
    name: bi('JSON-LD structured data', 'JSON-LD 结构化数据'),
    why: bi(
      'Structured data hands machines your facts (type, author, dates) without prose-guessing — a direct input to retrieval and answer engines.',
      '结构化数据把类型、作者、日期等事实直接交给机器，无需从正文猜测——是检索与答案引擎的直接输入。',
    ),
    evidence: ['schema-org', 'citation-absorption'],
    check(site) {
      const allTypes = new Set<string>();
      for (const page of site.pages) for (const t of jsonLdTypes(page)) allTypes.add(t);
      const hasContent = [...allTypes].some((t) => CONTENT_SCHEMA_TYPES.has(t));
      const hasBase = [...allTypes].some((t) => BASE_SCHEMA_TYPES.has(t));
      const score = hasContent ? 1 : hasBase ? 0.5 : 0;
      const found =
        allTypes.size > 0 ? stripControlChars([...allTypes].slice(0, 8).join(', ')) : 'none';
      return resultFromScore(
        score,
        bi(`JSON-LD types found: ${found}.`, `发现的 JSON-LD 类型:${found === 'none' ? '无' : found}。`),
        bi(
          'Add JSON-LD for your content type (Article / FAQPage / HowTo / Product) with author, datePublished and dateModified.',
          '为内容添加对应类型的 JSON-LD（Article / FAQPage / HowTo / Product），并包含 author、datePublished、dateModified 字段。',
        ),
      );
    },
  },
  {
    id: 'structure.meta-og',
    dimension: 'structure',
    weight: 1,
    name: bi('Title, description and Open Graph', '标题、描述与 Open Graph'),
    why: bi(
      'Meta title/description are the first summary AI systems read; OG fields feed link previews and secondary extractors.',
      'Meta 标题/描述是 AI 读到的第一份摘要;OG 字段供链接预览与二级抽取器使用。',
    ),
    evidence: ['eeat'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const title = page.title.length > 0 ? 0.25 : 0;
        const desc = page.meta['description'] ?? '';
        const descScore = desc.length >= 50 && desc.length <= 170 ? 0.35 : desc.length > 0 ? 0.2 : 0;
        const ogTitle = page.meta['og:title'] ? 0.2 : 0;
        const ogDesc = page.meta['og:description'] ? 0.2 : 0;
        return title + descScore + ogTitle + ogDesc;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Meta title/description and OG tags are complete.'
            : `${ratioText(stats.failing, stats.total)} sampled pages have incomplete meta/OG tags.`,
          stats.avg >= 0.85
            ? 'Meta 标题/描述与 OG 标签齐备。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面的 meta/OG 标签不完整。`,
        ),
        bi(
          'Write a 50–170 char meta description that answers the page\'s core question; add og:title and og:description.',
          '撰写 50–170 字符、直接回答页面核心问题的 meta description，并补充 og:title 与 og:description。',
        ),
      );
    },
  },
  {
    id: 'structure.machine-dates',
    dimension: 'structure',
    weight: 2,
    name: bi('Machine-readable dates', '机器可读日期'),
    why: bi(
      'Engines rank fresh content; without machine-readable dates they must guess — and often guess "stale".',
      '引擎偏好新鲜内容;没有机器可读日期时只能靠猜——常被猜成「过期」。',
    ),
    evidence: ['schema-org', 'citation-absorption'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const dates = getMachineDates(page);
        return dates.published || dates.modified ? 1 : 0;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.failing === 0
            ? 'Machine-readable dates present on all sampled pages.'
            : `${ratioText(stats.failing, stats.total)} sampled pages expose no machine-readable date.`,
          stats.failing === 0
            ? '抽样页面均有机器可读日期。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面没有机器可读日期。`,
        ),
        bi(
          'Expose datePublished/dateModified via JSON-LD, article:published_time meta, or <time datetime="...">.',
          '通过 JSON-LD、article:published_time meta 或 <time datetime="..."> 暴露 datePublished/dateModified。',
        ),
      );
    },
  },
  {
    id: 'structure.lang-charset',
    dimension: 'structure',
    weight: 1,
    name: bi('Language and charset declared', '声明语言与字符集'),
    why: bi(
      'Explicit lang/charset prevents garbled extraction and routes your page to the right query languages.',
      '显式的 lang/charset 避免乱码抽取，并让页面匹配正确语言的查询。',
    ),
    evidence: ['schema-org'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const langOk = page.lang.length > 0 ? 0.6 : 0;
        const charsetOk = page.charset.includes('utf') ? 0.4 : page.charset ? 0.2 : 0;
        return langOk + charsetOk;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85 ? 'lang attribute and UTF charset declared.' : 'Missing html[lang] or UTF charset on some pages.',
          stats.avg >= 0.85 ? 'lang 属性与 UTF 字符集均已声明。' : '部分页面缺少 html[lang] 或 UTF 字符集声明。',
        ),
        bi('Set <html lang="…"> and <meta charset="utf-8">.', '设置 <html lang="…"> 与 <meta charset="utf-8">。'),
      );
    },
  },
  {
    id: 'structure.canonical',
    dimension: 'structure',
    weight: 1,
    name: bi('Canonical URL declared', '声明 Canonical URL'),
    why: bi(
      'Canonical tags consolidate duplicate URLs so citations point at one authoritative address.',
      'Canonical 标签合并重复 URL,让引用集中指向唯一权威地址。',
    ),
    evidence: ['eeat'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const href = page.$('link[rel="canonical"]').attr('href');
        if (!href) return 0.5;
        try {
          const canonical = new URL(href, page.finalUrl);
          return canonical.origin === new URL(page.finalUrl).origin ? 1 : 0.2;
        } catch {
          return 0.3;
        }
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Canonical URLs declared and same-origin.'
            : 'Canonical link missing or pointing off-site on some pages.',
          stats.avg >= 0.85 ? 'Canonical 已声明且同源。' : '部分页面 Canonical 缺失或指向站外。',
        ),
        bi('Add <link rel="canonical" href="…"> pointing to the preferred same-origin URL.', '添加指向本站首选 URL 的 <link rel="canonical">。'),
      );
    },
  },
];
