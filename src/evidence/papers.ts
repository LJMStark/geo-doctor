import type { Bilingual } from '../types.js';

/**
 * Evidence registry — every audit rule cites at least one entry here.
 * Only verifiable public sources are allowed. No made-up citations.
 */
export interface Evidence {
  id: string;
  title: string;
  source: string;
  url: string;
  finding: Bilingual;
}

const entries: Evidence[] = [
  {
    id: 'geo-kdd24',
    title: 'GEO: Generative Engine Optimization',
    source: 'Aggarwal et al., KDD 2024 (arXiv:2311.09735)',
    url: 'https://arxiv.org/abs/2311.09735',
    finding: {
      en: 'Adding statistics, citing sources and adding quotations boosted content visibility in generative engines by up to ~40% on GEO-bench.',
      zh: '在 GEO-bench 上，加入统计数据、引用来源与添加引语可将内容在生成式引擎中的可见度提升最高约 40%。',
    },
  },
  {
    id: 'citation-absorption',
    title:
      'From Citation Selection to Citation Absorption: A Measurement Framework for Generative Engine Optimization Across AI Search Platforms',
    source: 'GEO Citation Lab, arXiv:2604.25707',
    url: 'https://arxiv.org/abs/2604.25707',
    finding: {
      en: 'Across ChatGPT / Gemini / Perplexity (21,143 citations, 72 features): well-structured, self-contained, fact-dense pages get deeply absorbed into answers instead of being cited in name only.',
      zh: '对 ChatGPT / Gemini / Perplexity 的 21,143 条引用、72 维特征分析显示：结构清晰、段落自包含、事实密度高的页面会被答案「深度吸收」，而非仅仅挂名引用。',
    },
  },
  {
    id: 'citation-lab-data',
    title: 'GEO Citation Lab — experiment data report (602 prompts, 3 platforms)',
    source: 'github.com/yaojingang/geo-citation-lab',
    url: 'https://github.com/yaojingang/geo-citation-lab',
    finding: {
      en: 'Open dataset behind the citation-absorption paper: which queries trigger AI web search, which domains get selected, and which page traits predict absorption.',
      zh: '引用吸收论文的公开数据集：什么问题会触发 AI 联网搜索、AI 偏好选择哪些站点、哪些页面特征预测内容被吸收。',
    },
  },
  {
    id: 'llmstxt',
    title: 'The /llms.txt file — a proposal to standardise LLM-friendly site guides',
    source: 'Jeremy Howard / Answer.AI, llmstxt.org',
    url: 'https://llmstxt.org',
    finding: {
      en: 'A markdown file at /llms.txt gives LLMs a curated, token-efficient map of your most important content.',
      zh: '站点根目录的 /llms.txt 用 Markdown 为 LLM 提供一份精选、省 token 的重要内容地图。',
    },
  },
  {
    id: 'lost-middle',
    title: 'Lost in the Middle: How Language Models Use Long Contexts',
    source: 'Liu et al., TACL 2024 (arXiv:2307.03172)',
    url: 'https://arxiv.org/abs/2307.03172',
    finding: {
      en: 'LLMs attend most to information at the beginning of context. Key answers buried mid-page are far more likely to be missed.',
      zh: 'LLM 对上下文开头的信息关注度最高，埋在页面中部的关键答案更容易被忽略。',
    },
  },
  {
    id: 'eeat',
    title: 'Search Quality Evaluator Guidelines (E-E-A-T)',
    source: 'Google',
    url: 'https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf',
    finding: {
      en: 'Experience, Expertise, Authoritativeness and Trust signals (authorship, about/contact, provenance) define content quality for search systems — AI answer engines inherit these preferences via their retrieval layers.',
      zh: '经验、专业、权威与可信（作者署名、关于/联系页、内容来源）是搜索系统的质量标准——AI 答案引擎通过其检索层继承了这些偏好。',
    },
  },
  {
    id: 'schema-org',
    title: 'Schema.org structured data vocabulary',
    source: 'schema.org (W3C community)',
    url: 'https://schema.org',
    finding: {
      en: 'JSON-LD structured data lets machines read facts (article, author, dates, organization, FAQ) without guessing from prose.',
      zh: 'JSON-LD 结构化数据让机器无需从正文猜测，即可直接读取文章、作者、日期、组织、FAQ 等事实。',
    },
  },
  {
    id: 'vercel-crawlers',
    title: 'The Rise of the AI Crawler',
    source: 'Vercel + MERJ research, 2025',
    url: 'https://vercel.com/blog/the-rise-of-the-ai-crawler',
    finding: {
      en: 'Measured across real traffic: GPTBot, ClaudeBot and most AI crawlers fetch HTML but do not execute JavaScript — client-rendered content is invisible to them.',
      zh: '基于真实流量测量：GPTBot、ClaudeBot 等绝大多数 AI 爬虫只抓取 HTML、不执行 JavaScript——纯客户端渲染的内容对它们不可见。',
    },
  },
  {
    id: 'rank-manip',
    title: 'Ranking Manipulation for Conversational Search Engines',
    source: 'Pfrommer et al., EMNLP 2024 (arXiv:2406.03589)',
    url: 'https://arxiv.org/abs/2406.03589',
    finding: {
      en: 'Conversational engines can be manipulated by adversarial content — a key reason engines increasingly favour verifiable, well-sourced pages. GEODoctor is white-hat only.',
      zh: '对话式搜索引擎可能被对抗性内容操纵——这正是引擎日益偏好可核验、有来源页面的原因。GEODoctor 仅支持白帽用法。',
    },
  },
  {
    id: 'cseo-bench',
    title: 'C-SEO Bench: Does Conversational SEO Work?',
    source: 'arXiv:2506.11097',
    url: 'https://arxiv.org/abs/2506.11097',
    finding: {
      en: 'Benchmarks conversational-SEO tactics across engines and domains; effect sizes vary — measure, do not assume.',
      zh: '跨引擎、跨领域基准测试对话式 SEO 手段；效果因场景而异——要实测，不要想当然。',
    },
  },
];

const registry = new Map(entries.map((e) => [e.id, e]));

export function getEvidence(id: string): Evidence | undefined {
  return registry.get(id);
}

export function listEvidence(): Evidence[] {
  return [...entries];
}
