import type { Page, Rule } from '../types.js';
import { averagePages, bi, countFacts, naResult, ratioText, resultFromScore, textUnits } from './utils.js';

const SHARE_LINK_RE = /(facebook|twitter|x)\.com\/(sharer|share|intent)|linkedin\.com\/share|service\.weibo\.com/i;

const ABOUT_LINK_RE = /\/(about|about-us|company|team|contact|contact-us)(\/|$|\.)|关于|联系/i;

const AUTHOR_SELECTOR = '[rel="author"], .author, .byline, [class*="author" i], [itemprop="author"]';

function externalCitations(page: Page): number {
  return page.links.filter(
    (l) => l.inMain && !l.internal && l.text.length > 0 && !SHARE_LINK_RE.test(l.href),
  ).length;
}

function hasAuthorSignal(page: Page): boolean {
  const jsonLdAuthor = page.jsonLd.some((node) => {
    const author = node['author'];
    return author !== undefined && author !== null && author !== '';
  });
  if (jsonLdAuthor) return true;
  if ((page.meta['author'] ?? '').length > 0) return true;
  return page.$(AUTHOR_SELECTOR).length > 0;
}

function orgName(node: Record<string, unknown>): string | undefined {
  const name = node['name'];
  return typeof name === 'string' && name.trim() ? name.trim() : undefined;
}

export const citabilityRules: Rule[] = [
  {
    id: 'cit.fact-density',
    dimension: 'citability',
    weight: 3,
    name: bi('Statistics and concrete facts', '统计数据与具体事实'),
    why: bi(
      'Adding statistics is one of the strongest measured visibility boosts in generative engines.',
      '加入统计数据是实测中对生成式引擎可见度提升最强的手段之一。',
    ),
    evidence: ['geo-kdd24', 'citation-absorption'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const units = textUnits(page.mainText);
        if (units < 150) return null;
        const density = (countFacts(page.mainText) / units) * 1000;
        return density >= 8 ? 1 : density >= 3 ? 0.6 : density >= 1 ? 0.3 : 0;
      });
      if (stats.applicable === 0) {
        return naResult(bi('Pages too short to evaluate fact density.', '页面过短,无法评估事实密度。'));
      }
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Content is rich in numbers and concrete facts.'
            : `${ratioText(stats.failing, stats.total)} sampled pages are light on statistics and concrete facts.`,
          stats.avg >= 0.85
            ? '内容包含充足的数字与具体事实。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面缺少统计数据与具体事实。`,
        ),
        bi(
          'Replace vague claims with numbers: dates, percentages, benchmarks, prices, versions — each one is a citation hook.',
          '把模糊说法换成数字:日期、百分比、基准值、价格、版本号——每个数字都是引用钩子。',
        ),
      );
    },
  },
  {
    id: 'cit.source-citations',
    dimension: 'citability',
    weight: 3,
    name: bi('Cites external sources', '引用外部来源'),
    why: bi(
      'Citing sources measurably raises visibility — engines trust pages that show their evidence.',
      '引用来源被实测证明能提升可见度——引擎更信任亮出证据的页面。',
    ),
    evidence: ['geo-kdd24', 'rank-manip'],
    check(site) {
      const stats = averagePages(site, (page) => {
        if (textUnits(page.mainText) < 150) return null;
        const cites = externalCitations(page);
        return cites >= 3 ? 1 : cites >= 1 ? 0.6 : 0;
      });
      if (stats.applicable === 0) {
        return naResult(bi('Pages too short to evaluate citations.', '页面过短,无法评估引用。'));
      }
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Pages link out to their sources.'
            : `${ratioText(stats.failing, stats.total)} sampled pages cite no external sources in the content body.`,
          stats.avg >= 0.85
            ? '页面为论点附上了来源链接。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面正文没有引用任何外部来源。`,
        ),
        bi(
          'Link claims to authoritative sources (research, docs, primary data) inside the content body — 3+ per article.',
          '在正文中为论断链接权威来源(研究、文档、一手数据),每篇 3 个以上。',
        ),
      );
    },
  },
  {
    id: 'cit.quotables',
    dimension: 'citability',
    weight: 1,
    name: bi('Quotable statements', '可引用的引语'),
    why: bi(
      'Quotation addition is a measured GEO visibility booster; crisp quoted lines get lifted verbatim into answers.',
      '添加引语是实测有效的 GEO 提升手段;干净利落的引语常被原文搬进答案。',
    ),
    evidence: ['geo-kdd24'],
    check(site) {
      const stats = averagePages(site, (page) => {
        if (textUnits(page.mainText) < 150) return null;
        if (page.$('blockquote, q').length >= 1) return 1;
        const quoted = page.mainText.match(/["“][^"”]{20,200}["”]/g)?.length ?? 0;
        return quoted >= 1 ? 0.8 : 0.4;
      });
      if (stats.applicable === 0) {
        return naResult(bi('Pages too short to evaluate quotables.', '页面过短,无法评估引语。'));
      }
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85 ? 'Quotable lines / blockquotes present.' : 'Little quotable material found.',
          stats.avg >= 0.85 ? '存在引语/blockquote 内容。' : '几乎没有可直接引用的语句。',
        ),
        bi(
          'Add expert quotes or distill key positions into one-sentence pull quotes (<blockquote>).',
          '加入专家引言,或把核心观点提炼成一句话金句并用 <blockquote> 标记。',
        ),
        { failBelow: 0.3 },
      );
    },
  },
  {
    id: 'cit.author-byline',
    dimension: 'citability',
    weight: 2,
    name: bi('Author attribution', '作者署名'),
    why: bi(
      'Authorship is a core E-E-A-T trust signal; anonymous pages are cited less and absorbed less.',
      '作者署名是 E-E-A-T 的核心信任信号;匿名页面更少被引用和吸收。',
    ),
    evidence: ['eeat', 'citation-absorption'],
    check(site) {
      const stats = averagePages(site, (page) => (hasAuthorSignal(page) ? 1 : 0));
      return resultFromScore(
        stats.avg,
        bi(
          stats.failing === 0
            ? 'Author signals present on sampled pages.'
            : `${ratioText(stats.failing, stats.total)} sampled pages have no detectable author.`,
          stats.failing === 0
            ? '抽样页面均带作者信号。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面检测不到作者信息。`,
        ),
        bi(
          'Add a visible byline plus JSON-LD author (name, url); link to an author profile page.',
          '添加可见署名和 JSON-LD author 字段(name、url),并链接到作者主页。',
        ),
      );
    },
  },
  {
    id: 'cit.entity-pages',
    dimension: 'citability',
    weight: 2,
    name: bi('About/Contact and Organization identity', '关于/联系页与组织身份'),
    why: bi(
      'Engines verify who is behind a site; discoverable About/Contact pages and Organization schema anchor your entity.',
      '引擎会核实站点背后是谁;可发现的关于/联系页和 Organization schema 锚定你的实体身份。',
    ),
    evidence: ['eeat', 'schema-org'],
    check(site) {
      const hasAboutLink = site.pages.some((page) =>
        page.links.some((l) => l.internal && (ABOUT_LINK_RE.test(l.href) || ABOUT_LINK_RE.test(l.text))),
      );
      const hasOrgSchema = site.pages.some((page) =>
        page.jsonLd.some((node) => {
          const type = String(node['@type'] ?? '').toLowerCase();
          if (type !== 'organization' && type !== 'localbusiness') return false;
          return Boolean(orgName(node)) && Boolean(node['url'] || node['logo'] || node['sameAs']);
        }),
      );
      const score = (hasAboutLink ? 0.5 : 0) + (hasOrgSchema ? 0.5 : 0);
      return resultFromScore(
        score,
        bi(
          `About/Contact link: ${hasAboutLink ? 'found' : 'not found'}; Organization schema: ${hasOrgSchema ? 'found' : 'not found'}.`,
          `关于/联系链接:${hasAboutLink ? '有' : '无'};Organization schema:${hasOrgSchema ? '有' : '无'}。`,
        ),
        bi(
          'Add About and Contact pages reachable from every page, plus Organization JSON-LD with name, url, logo and sameAs.',
          '添加全站可达的关于/联系页,并补充含 name、url、logo、sameAs 的 Organization JSON-LD。',
        ),
      );
    },
  },
  {
    id: 'cit.content-depth',
    dimension: 'citability',
    weight: 2,
    name: bi('Substantive content depth', '内容有实质厚度'),
    why: bi(
      'Thin pages rarely contain enough unique information to be worth absorbing into an answer.',
      '单薄的页面缺少值得吸收进答案的独特信息量。',
    ),
    evidence: ['citation-absorption'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const units = textUnits(page.mainText);
        return units >= 800 ? 1 : units >= 300 ? 0.5 : 0.15;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Sampled pages carry substantive content.'
            : `${ratioText(stats.failing, stats.total)} sampled pages are thin (<300 words/chars of main content).`,
          stats.avg >= 0.85
            ? '抽样页面内容厚度充足。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面内容单薄(正文不足 300 词/字)。`,
        ),
        bi(
          'Consolidate thin pages into comprehensive ones (800+ words) that fully answer one topic — depth beats page count.',
          '把单薄页面合并成完整回答一个主题的深度页面(800 词/字以上)——深度胜过页面数量。',
        ),
      );
    },
  },
  {
    id: 'cit.brand-consistency',
    dimension: 'citability',
    weight: 1,
    name: bi('Consistent brand naming', '品牌名一致'),
    why: bi(
      'Inconsistent organization names fragment your entity across engines\' knowledge graphs.',
      '组织名不一致会让你的实体在引擎知识图谱中被拆散。',
    ),
    evidence: ['eeat', 'schema-org'],
    check(site) {
      const names = new Set<string>();
      for (const page of site.pages) {
        const siteName = page.meta['og:site_name'];
        if (siteName) names.add(siteName.trim().toLowerCase());
        for (const node of page.jsonLd) {
          const type = String(node['@type'] ?? '').toLowerCase();
          if (type === 'organization' || type === 'website' || type === 'localbusiness') {
            const name = orgName(node);
            if (name) names.add(name.toLowerCase());
          }
        }
      }
      if (names.size === 0) {
        return resultFromScore(
          0.3,
          bi(
            'No machine-readable brand name found (og:site_name or Organization/WebSite schema).',
            '未找到机器可读的品牌名(og:site_name 或 Organization/WebSite schema)。',
          ),
          bi('Declare og:site_name and Organization JSON-LD with one canonical brand name.', '声明 og:site_name 和 Organization JSON-LD,统一使用一个规范品牌名。'),
        );
      }
      const list = [...names];
      const consistent = list.every((n) => n.includes(list[0]!) || list[0]!.includes(n));
      return resultFromScore(
        consistent ? 1 : 0.4,
        bi(
          consistent ? `Brand name consistent: "${list[0]}".` : `Conflicting brand names: ${list.join(' / ')}.`,
          consistent ? `品牌名一致:"${list[0]}"。` : `品牌名不一致:${list.join(' / ')}。`,
        ),
        bi('Use one canonical organization name everywhere.', '全站统一使用同一个规范组织名。'),
      );
    },
  },
  {
    id: 'cit.image-alt',
    dimension: 'citability',
    weight: 1,
    name: bi('Descriptive image alt text', '图片 alt 描述'),
    why: bi(
      'Alt text is the only way multimodal retrieval reads your images — and an accessibility baseline.',
      'alt 文本是多模态检索读取图片的唯一途径,也是无障碍基线。',
    ),
    evidence: ['schema-org'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const imgs = page.images.filter((i) => i.inMain);
        if (imgs.length === 0) return null;
        const withAlt = imgs.filter((i) => i.alt.length > 0).length;
        const ratio = withAlt / imgs.length;
        return ratio >= 0.8 ? 1 : ratio >= 0.4 ? 0.5 : 0.2;
      });
      if (stats.applicable === 0) {
        return naResult(bi('No content images found.', '正文中没有图片。'));
      }
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85 ? 'Content images carry alt text.' : 'Many content images lack alt text.',
          stats.avg >= 0.85 ? '正文图片均有 alt 描述。' : '大量正文图片缺少 alt 描述。',
        ),
        bi('Write descriptive alt text for every content image.', '为每张正文图片撰写描述性 alt 文本。'),
      );
    },
  },
];
