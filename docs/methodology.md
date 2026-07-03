# GEODoctor 评分方法论 / Scoring Methodology

> 本文档说明 GEO Score 如何计算、每条规则的依据是什么，以及这套方法的边界在哪里。
> This document explains how the GEO Score is computed, what evidence backs each rule, and where the method's limits are.

## 核心立场：证据驱动

GEODoctor 的每一条规则都必须引用**公开可查**的研究或标准——论文、公开数据集、行业规范。没有证据支撑的"最佳实践"不进入规则库。这与市面上大多数 GEO 检查工具的根本区别在于：你可以不同意我们的权重，但每条规则为什么存在，都有出处可查。

主要证据源：

| 证据 | 类型 | 关键结论 |
|---|---|---|
| [Aggarwal et al., GEO, KDD 2024](https://arxiv.org/abs/2311.09735) | 论文 | 加统计数据、引来源、添引语可提升生成式引擎可见度最高约 40% |
| [From Citation Selection to Citation Absorption (arXiv:2604.25707)](https://arxiv.org/abs/2604.25707) | 论文 + 公开数据集 | 21,143 条真实引用、72 维特征：结构清晰、自包含、事实密集的页面被"深度吸收"而非挂名引用 |
| [GEO Citation Lab 实验数据](https://github.com/yaojingang/geo-citation-lab) | 公开数据集 | 602 条 Prompt、3 平台的搜索触发/信源选择/内容吸收实测 |
| [Lost in the Middle, TACL 2024](https://arxiv.org/abs/2307.03172) | 论文 | LLM 对上下文开头信息的关注度显著更高 |
| [The Rise of the AI Crawler (Vercel + MERJ, 2025)](https://vercel.com/blog/the-rise-of-the-ai-crawler) | 实测研究 | 主流 AI 爬虫抓 HTML 但不执行 JavaScript |
| [llms.txt 规范](https://llmstxt.org) | 标准提案 | LLM 友好的站点内容地图格式 |
| [Google Search Quality Evaluator Guidelines](https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf) | 行业标准 | E-E-A-T：经验、专业、权威、可信 |
| [Schema.org](https://schema.org) | 行业标准 | 结构化数据词表 |
| [Ranking Manipulation for Conversational Search Engines, EMNLP 2024](https://arxiv.org/abs/2406.03589) | 论文 | 对话式引擎的可操纵性——引擎因此日益偏好可核验内容 |
| [C-SEO Bench (arXiv:2506.11097)](https://arxiv.org/abs/2506.11097) | 论文 | 对话式 SEO 手段的跨引擎基准测试 |

## 评分模型

### 五个维度

```
GEO Score = Σ ( 维度分 × 维度权重 )
```

| 维度 | 权重 | 回答的问题 |
|---|---:|---|
| 机器可达性 Machine Access | 20% | AI 爬虫能不能抓到你? |
| 结构与语义 Structure | 20% | 机器能不能无歧义地读懂你? |
| 可切片性 Chunkability | 25% | 检索系统切开你的页面后，每块还有意义吗? |
| 可引用性 Citability | 25% | 你的内容值得被引用吗?可信吗? |
| 新鲜度 Freshness | 10% | 引擎相信你还"活着"吗? |

可切片性与可引用性权重最高（合计 50%），因为 citation-absorption 研究显示这两者是"被深度吸收"与"仅挂名引用"的最强区分特征。

### 规则内聚合

- 每条规则产出 `0..1` 分与状态（pass / warn / fail / na）
- 规则权重 1–3：`3` = 关键信号，`2` = 可靠信号，`1` = 辅助信号
- 维度分 = `Σ(规则分 × 规则权重) / Σ(规则权重)`，**na（不适用）规则不进分母**
- 多页抽样时，页面级规则取各页均值

### 分级

| GEO Score | 等级 |
|---|---|
| ≥ 85 | 优秀 Excellent |
| 70–84 | 良好 Good |
| 50–69 | 一般 Needs work |
| < 50 | 较差 At risk |

## 33 条规则与证据对照

### 机器可达性 / Machine Access

| 规则 | 权重 | 检查内容 | 证据 |
|---|---|---|---|
| `access.ai-crawlers` | 3 | robots.txt 放行 AI 爬虫 | [Vercel + MERJ research, 2025](https://vercel.com/blog/the-rise-of-the-ai-crawler)、[geo-citation-lab](https://github.com/yaojingang/geo-citation-lab) |
| `access.llms-txt` | 2 | llms.txt 存在且格式规范 | [llmstxt.org](https://llmstxt.org) |
| `access.sitemap` | 2 | Sitemap 可发现 | [Vercel + MERJ research, 2025](https://vercel.com/blog/the-rise-of-the-ai-crawler) |
| `access.js-dependency` | 3 | 内容不依赖 JavaScript 渲染 | [Vercel + MERJ research, 2025](https://vercel.com/blog/the-rise-of-the-ai-crawler) |
| `access.response-speed` | 2 | 响应速度对爬虫友好 | [Vercel + MERJ research, 2025](https://vercel.com/blog/the-rise-of-the-ai-crawler) |
| `access.http-hygiene` | 1 | HTTPS 与干净的状态码 | [Google E-E-A-T](https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf) |
| `access.meta-robots` | 2 | 页面级不阻断收录 | [schema.org](https://schema.org) |

### 结构与语义 / Structure & Semantics

| 规则 | 权重 | 检查内容 | 证据 |
|---|---|---|---|
| `structure.heading-hierarchy` | 2 | 标题层级清晰 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |
| `structure.semantic-html` | 1 | 语义化 HTML 地标 | [schema.org](https://schema.org) |
| `structure.schema-jsonld` | 3 | JSON-LD 结构化数据 | [schema.org](https://schema.org)、[arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |
| `structure.meta-og` | 1 | 标题、描述与 Open Graph | [Google E-E-A-T](https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf) |
| `structure.machine-dates` | 2 | 机器可读日期 | [schema.org](https://schema.org)、[arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |
| `structure.lang-charset` | 1 | 声明语言与字符集 | [schema.org](https://schema.org) |
| `structure.canonical` | 1 | 声明 Canonical URL | [Google E-E-A-T](https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf) |

### 可切片性 / Chunkability

| 规则 | 权重 | 检查内容 | 证据 |
|---|---|---|---|
| `chunk.paragraph-size` | 2 | 段落长度适合切片 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |
| `chunk.qa-structure` | 3 | 问答式结构 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707)、[KDD 2024](https://arxiv.org/abs/2311.09735) |
| `chunk.upfront-summary` | 2 | 开头即给答案 | [TACL 2024](https://arxiv.org/abs/2307.03172)、[KDD 2024](https://arxiv.org/abs/2311.09735) |
| `chunk.list-table-density` | 2 | 真实的列表与表格 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707)、[KDD 2024](https://arxiv.org/abs/2311.09735) |
| `chunk.definitions` | 1 | 开头附近有定义句 | [KDD 2024](https://arxiv.org/abs/2311.09735) |
| `chunk.heading-density` | 2 | 小节间隔适中 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707)、[TACL 2024](https://arxiv.org/abs/2307.03172) |
| `chunk.anchor-ids` | 1 | 标题锚点支持深链 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |

### 可引用性 / Citability & Trust

| 规则 | 权重 | 检查内容 | 证据 |
|---|---|---|---|
| `cit.fact-density` | 3 | 统计数据与具体事实 | [KDD 2024](https://arxiv.org/abs/2311.09735)、[arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |
| `cit.source-citations` | 3 | 引用外部来源 | [KDD 2024](https://arxiv.org/abs/2311.09735)、[EMNLP 2024](https://arxiv.org/abs/2406.03589) |
| `cit.quotables` | 1 | 可引用的引语 | [KDD 2024](https://arxiv.org/abs/2311.09735) |
| `cit.author-byline` | 2 | 作者署名 | [Google E-E-A-T](https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf)、[arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |
| `cit.entity-pages` | 2 | 关于/联系页与组织身份 | [Google E-E-A-T](https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf)、[schema.org](https://schema.org) |
| `cit.content-depth` | 2 | 内容有实质厚度 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |
| `cit.brand-consistency` | 1 | 品牌名一致 | [Google E-E-A-T](https://guidelines.raterhub.com/searchqualityevaluatorguidelines.pdf)、[schema.org](https://schema.org) |
| `cit.image-alt` | 1 | 图片 alt 描述 | [schema.org](https://schema.org) |

### 新鲜度 / Freshness

| 规则 | 权重 | 检查内容 | 证据 |
|---|---|---|---|
| `fresh.visible-date` | 2 | 人眼可见的日期 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |
| `fresh.modified-recency` | 3 | 内容近期有更新 | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707)、[arXiv:2506.11097](https://arxiv.org/abs/2506.11097) |
| `fresh.recent-year` | 1 | 正文提及近年 | [arXiv:2506.11097](https://arxiv.org/abs/2506.11097) |
| `fresh.maintained` | 1 | 维护信号（更新时间晚于发布） | [arXiv:2604.25707](https://arxiv.org/abs/2604.25707) |

## 抽样方式

- 默认抓取入口页 + 最多 2 个站内链接页（`--pages` 可调，上限 10）
- 站点级文件单独抓取：`robots.txt`、`llms.txt`、`sitemap.xml`
- 静态抓取（不执行 JavaScript）——这既是限制，也刻意与主流 AI 爬虫的真实行为一致

## 方法边界（我们不假装没有）

1. **静态启发式**：33 条规则均为静态可测信号。它们与"被 AI 引用"强相关（见证据），但不是因果保证。
2. **抽样偏差**：默认 3 页样本反映的是入口页附近的状态，不是全站普查。对大站建议提高 `--pages` 并从内容路径入口审计。
3. **不测真实可见性**：audit 测的是"体质"。你的品牌在 AI 答案里的真实出现率需要 `probe` 命令（v0.2，重复采样法，同样来自 citation-absorption 方法论）。
4. **白帽边界**：本工具只诊断和建议可核验的真实改进。堆砌关键词、伪造评测、生成虚假事实不在建议范围内——操纵型内容的风险见 [EMNLP 2024](https://arxiv.org/abs/2406.03589)。

## 复现与争议

- 每条规则的实现是纯函数，位于 `src/rules/`，可单测复现
- 认为某条规则的权重或阈值不合理？欢迎带着证据开 issue——这套规则库本身就是为"可争论"设计的
