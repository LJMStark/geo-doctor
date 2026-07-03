import type { Rule } from '../types.js';
import {
  averagePages,
  bi,
  countFacts,
  isQuestionHeading,
  jsonLdTypes,
  naResult,
  ratioText,
  resultFromScore,
  textUnits,
} from './utils.js';

const SUMMARY_MARKER_RE =
  /(tl;?dr|key takeaways?|in short|in summary|at a glance|quick answer|摘要|要点|太长不看|一句话总结|核心结论|简而言之|先说结论)/i;

const DEFINITION_RE =
  /(是指|是一种|是一款|是一套|是一个|指的是|\b(is|are)\s+(a|an|the)\s+\w|refers to|stands for|is defined as)/i;

const LONG_PARAGRAPH_UNITS = 150;

export const chunkabilityRules: Rule[] = [
  {
    id: 'chunk.paragraph-size',
    dimension: 'chunkability',
    weight: 2,
    name: bi('Paragraphs sized for chunking', '段落长度适合切片'),
    why: bi(
      'Retrieval systems embed pages in chunks; wall-of-text paragraphs blur multiple ideas into one vector and lose retrieval precision.',
      '检索系统按块向量化页面;糊成一团的长段落把多个观点混进一个向量,检索精度骤降。',
    ),
    evidence: ['citation-absorption'],
    check(site) {
      const stats = averagePages(site, (page) => {
        if (page.paragraphs.length < 3) return null;
        const long = page.paragraphs.filter((p) => textUnits(p) > LONG_PARAGRAPH_UNITS).length;
        const ratio = long / page.paragraphs.length;
        return ratio <= 0.1 ? 1 : ratio <= 0.3 ? 0.6 : 0.2;
      });
      if (stats.applicable === 0) {
        return naResult(bi('Too few paragraphs to evaluate.', '段落数量过少,无法评估。'));
      }
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Paragraph lengths are chunk-friendly.'
            : `${ratioText(stats.failing, stats.total)} sampled pages contain many over-long paragraphs (>${LONG_PARAGRAPH_UNITS} words/chars).`,
          stats.avg >= 0.85
            ? '段落长度对切片友好。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面存在大量超长段落(>${LONG_PARAGRAPH_UNITS} 词/字)。`,
        ),
        bi(
          'Split paragraphs so each expresses one idea in 2–4 sentences; move enumerations into lists.',
          '拆分段落,每段 2–4 句只表达一个观点;枚举内容改为列表。',
        ),
      );
    },
  },
  {
    id: 'chunk.qa-structure',
    dimension: 'chunkability',
    weight: 3,
    name: bi('Question-and-answer structure', '问答式结构'),
    why: bi(
      'AI engines answer questions; sections headed by the exact question users ask are the easiest content to lift into an answer.',
      'AI 引擎的任务是回答问题;以用户原话提问作小标题的段落,是最容易被直接搬进答案的内容。',
    ),
    evidence: ['citation-absorption', 'geo-kdd24'],
    check(site) {
      const faqSchema = site.pages.some((p) => jsonLdTypes(p).has('faqpage'));
      const stats = averagePages(site, (page) => {
        const questions = page.headings.filter((h) => h.level >= 2 && isQuestionHeading(h.text)).length;
        return questions >= 2 ? 1 : questions === 1 ? 0.6 : 0;
      });
      const score = Math.max(stats.avg, faqSchema ? 0.8 : 0);
      return resultFromScore(
        score,
        bi(
          score >= 0.85
            ? 'Question-form headings / FAQ structure detected.'
            : faqSchema
              ? 'FAQPage schema found, but page headings are rarely question-shaped.'
              : 'Few or no question-form headings found on sampled pages.',
          score >= 0.85
            ? '检测到问题式小标题 / FAQ 结构。'
            : faqSchema
              ? '发现 FAQPage schema,但页面小标题很少采用问句形式。'
              : '抽样页面几乎没有问题式小标题。',
        ),
        bi(
          'Turn key H2/H3 headings into the questions users actually ask ("How much does X cost?"), answer in the first sentence below, and add FAQPage schema where fitting.',
          '把关键 H2/H3 改写成用户真实提问("X 多少钱?"),标题下第一句直接给答案,合适处补充 FAQPage schema。',
        ),
      );
    },
  },
  {
    id: 'chunk.upfront-summary',
    dimension: 'chunkability',
    weight: 2,
    name: bi('Answer-first summary at the top', '开头即给答案'),
    why: bi(
      'LLMs weight the beginning of a document most heavily; a fact-dense opening summary is the single highest-leverage placement.',
      'LLM 对文档开头的权重最高;开头一段信息密集的摘要是性价比最高的位置。',
    ),
    evidence: ['lost-middle', 'geo-kdd24'],
    check(site) {
      const stats = averagePages(site, (page) => {
        if (page.paragraphs.length === 0) return 0;
        const firstFive = page.paragraphs.slice(0, 5).join(' ');
        if (SUMMARY_MARKER_RE.test(firstFive)) return 1;
        const lead = page.paragraphs.slice(0, 2).join(' ');
        const leadUnits = textUnits(lead);
        if (leadUnits >= 40 && leadUnits <= 600 && countFacts(lead) >= 2) return 0.8;
        if (leadUnits >= 30) return 0.5;
        return 0.2;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Pages open with a summary or fact-dense lead.'
            : `${ratioText(stats.failing, stats.total)} sampled pages bury the answer instead of opening with it.`,
          stats.avg >= 0.85
            ? '页面开头即给出摘要或信息密集的导语。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面把答案埋在后文,开头没有直接给出。`,
        ),
        bi(
          'Open every page with a 2–3 sentence answer/summary block (a "TL;DR" or key-takeaways list works well).',
          '每页开头放 2–3 句话的答案/摘要块("太长不看"或要点列表都很有效)。',
        ),
      );
    },
  },
  {
    id: 'chunk.list-table-density',
    dimension: 'chunkability',
    weight: 2,
    name: bi('Real lists and tables', '真实的列表与表格'),
    why: bi(
      'Lists and tables survive extraction intact and are disproportionately quoted by answer engines.',
      '列表和表格在抽取中保持完整结构,被答案引擎引用的比例远超普通段落。',
    ),
    evidence: ['citation-absorption', 'geo-kdd24'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const units = textUnits(page.mainText);
        if (units < 150) return null;
        const count = page.$(page.mainSelector).find('ul, ol, table').length;
        if (count === 0) return units > 600 ? 0 : 0.5;
        return count >= units / 1500 ? 1 : 0.6;
      });
      if (stats.applicable === 0) {
        return naResult(bi('Pages too short to evaluate list/table usage.', '页面过短,无法评估列表/表格使用。'));
      }
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Healthy use of lists/tables in content.'
            : `${ratioText(stats.failing, stats.total)} sampled pages are prose-only with no lists or tables.`,
          stats.avg >= 0.85
            ? '正文中列表/表格使用充分。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面通篇纯段落,没有列表或表格。`,
        ),
        bi(
          'Convert step sequences to <ol>, feature sets to <ul>, and comparisons to <table> — real HTML tags, not styled <div>s.',
          '步骤用 <ol>、特性用 <ul>、对比用 <table>——用真实 HTML 标签,不要用 <div> 模拟。',
        ),
      );
    },
  },
  {
    id: 'chunk.definitions',
    dimension: 'chunkability',
    weight: 1,
    name: bi('Definition sentences near the top', '开头附近有定义句'),
    why: bi(
      '"X is a …" sentences are the canonical shape engines look for when asked "what is X".',
      '"X 是…"句式是引擎回答"什么是 X"时寻找的标准形态。',
    ),
    evidence: ['geo-kdd24'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const head = [page.headings.find((h) => h.level === 1)?.text ?? '', ...page.paragraphs.slice(0, 5)].join(' ');
        return DEFINITION_RE.test(head) ? 1 : 0.4;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85 ? 'Definition-style sentences found early in pages.' : 'Few pages define their subject in the opening.',
          stats.avg >= 0.85 ? '页面开头附近有定义句。' : '大多数页面开头没有对主题下定义。',
        ),
        bi(
          'Add one crisp definition near the top: "X is a <category> that <differentiator>."',
          '在开头补一句干脆的定义:"X 是一种〈类别〉,用于〈差异点〉。"',
        ),
        { failBelow: 0.3 },
      );
    },
  },
  {
    id: 'chunk.heading-density',
    dimension: 'chunkability',
    weight: 2,
    name: bi('Sections at digestible intervals', '小节间隔适中'),
    why: bi(
      'Long unbroken text between headings forces chunkers to split mid-thought; regular H2/H3 breaks preserve meaning.',
      '标题之间的超长文本迫使切片器从语义中间截断;规律的 H2/H3 能保住语义完整。',
    ),
    evidence: ['citation-absorption', 'lost-middle'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const units = textUnits(page.mainText);
        const sections = page.headings.filter((h) => h.level === 2 || h.level === 3).length;
        if (units < 600) return sections >= 1 ? 1 : 0.6;
        if (sections === 0) return 0;
        const per = units / sections;
        return per <= 500 ? 1 : per <= 900 ? 0.6 : 0.2;
      });
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85
            ? 'Content is broken into digestible sections.'
            : `${ratioText(stats.failing, stats.total)} sampled pages run too long between headings.`,
          stats.avg >= 0.85
            ? '内容按适中间隔分节。'
            : `${ratioText(stats.failing, stats.total)} 个抽样页面的小节间隔过长。`,
        ),
        bi(
          'Add an H2/H3 roughly every 300–500 words (or 500–800 Chinese characters).',
          '大约每 300–500 英文词(或 500–800 汉字)加一个 H2/H3 小标题。',
        ),
      );
    },
  },
  {
    id: 'chunk.anchor-ids',
    dimension: 'chunkability',
    weight: 1,
    name: bi('Heading anchors for deep links', '标题锚点支持深链'),
    why: bi(
      'id-anchored headings let engines and users cite the exact section instead of the whole page.',
      '带 id 的标题让引擎和用户可以精确引用到小节,而不是整页。',
    ),
    evidence: ['citation-absorption'],
    check(site) {
      const stats = averagePages(site, (page) => {
        const sections = page.headings.filter((h) => h.level === 2 || h.level === 3);
        if (sections.length === 0) return null;
        const withId = sections.filter((h) => h.id && h.id.length > 0).length;
        const ratio = withId / sections.length;
        return ratio >= 0.6 ? 1 : ratio >= 0.2 ? 0.5 : 0.2;
      });
      if (stats.applicable === 0) {
        return naResult(bi('No H2/H3 sections found to evaluate.', '没有可评估的 H2/H3 小节。'));
      }
      return resultFromScore(
        stats.avg,
        bi(
          stats.avg >= 0.85 ? 'Section headings carry id anchors.' : 'Most section headings lack id anchors.',
          stats.avg >= 0.85 ? '小节标题带有 id 锚点。' : '多数小节标题缺少 id 锚点。',
        ),
        bi(
          'Generate stable id attributes for H2/H3 (most SSGs support this natively or via a rehype/markdown plugin).',
          '为 H2/H3 生成稳定的 id 属性(多数静态站点框架原生支持或有 rehype/markdown 插件)。',
        ),
      );
    },
  },
];
