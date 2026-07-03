<div align="center">

# 🩺 GEODoctor

**AI 能看见你吗？——给你的网站做一次 AI 搜索体检**

*Can AI see you? Give your site an AI-search checkup in 30 seconds.*

[English](docs/README.en.md) · [评分方法论](docs/methodology.md) · [Roadmap](#-roadmap)

[![npm](https://img.shields.io/npm/v/geo-doctor?color=0f766e)](https://www.npmjs.com/package/geo-doctor)
[![License](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%E2%89%A520-339933)](package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-0f766e.svg)](CONTRIBUTING.md)

</div>

> **GEO = Generative Engine Optimization（生成式引擎优化）**，不是地理信息工具。
> 当用户改用 ChatGPT、Perplexity、DeepSeek、豆包找答案时，你的网站还能被"看见"吗？

---

## 30 秒开始体检

```bash
npx geo-doctor audit yoursite.com --html
```

无需安装、**无需任何 API Key**。你会得到：

```
  🩺 GEODoctor · AI 搜索体检报告
  https://yoursite.com/

  GEO 总分
  ██████████████░░░░░░░░░░  59 / 100  一般

  维度得分
  ● 机器可达性  ██████████░░  87
  ● 结构与语义  █████████░░░  74
  ● 可切片性    ██████░░░░░░  50
  ● 可引用性    ██████░░░░░░  46
  ● 新鲜度      ███░░░░░░░░░  28

  确诊问题 (18)
  ✖ [高] 内容不依赖 JavaScript 渲染 · 1/3 个抽样页面疑似纯客户端渲染
     ↳ 处方: 改用 SSR/SSG（或预渲染），确保首个 HTML 响应中就包含完整正文
     证据: Vercel + MERJ research, 2025
  ✖ [高] 问答式结构 · 抽样页面几乎没有问题式小标题
     ↳ 处方: 把关键 H2/H3 改写成用户真实提问，标题下第一句直接给答案
     证据: GEO Citation Lab, arXiv:2604.25707 · Aggarwal et al., KDD 2024
  ...
```

外加一份可以直接发给老板/客户的 **HTML 体检报告**（`--html`）和机器可读的 **JSON**（`--json`）。

## 为什么是 GEODoctor？

市面上的 GEO 检查工具不少，GEODoctor 有三件事不一样：

### 1. 每条规则都有论文撑腰

33 条检查规则，**每一条都引用公开可查的研究**：KDD 2024 的 GEO 原始论文、覆盖 21,143 条真实 AI 引用与 72 维特征的 [citation-absorption 研究](https://arxiv.org/abs/2604.25707)、Vercel 的 AI 爬虫实测……你可以不同意权重，但每条规则为什么存在，全部有出处。完整对照表见 [评分方法论](docs/methodology.md)。

### 2. 中英双引擎视角

规则与报告原生双语（`--lang zh|en`）。检查的爬虫清单同时覆盖 GPTBot / ClaudeBot / PerplexityBot 与 Bytespider（豆包）；v0.2 的可见性探测将同时接入国际引擎（ChatGPT / Perplexity / Gemini）与国内引擎（Kimi / 智谱 / 豆包）的**官方 API**。

### 3. 不止诊断，是 Agent 闭环（Roadmap）

`audit`（诊断）→ `probe`（化验：你的品牌在 AI 答案里的真实出现率）→ `fix`（治疗：生成 llms.txt、JSON-LD、FAQ 块）→ `watch`（复诊：CI 分数门禁 + 徽章）。医生看完病是要开药的。

## 五维评分模型

| 维度 | 权重 | 回答的问题 |
|---|---:|---|
| 🚪 机器可达性 | 20% | AI 爬虫能不能抓到你？（robots.txt、llms.txt、JS 渲染依赖…） |
| 🧱 结构与语义 | 20% | 机器能不能无歧义地读懂你？（标题层级、JSON-LD、日期标注…） |
| 🔪 可切片性 | 25% | 检索系统切开页面后，每块还有意义吗？（问答结构、开头即答案…） |
| 📌 可引用性 | 25% | 内容值得被引用吗？（事实密度、来源引用、作者署名、E-E-A-T…） |
| 🌱 新鲜度 | 10% | 引擎相信你还"活着"吗？（更新时间、维护信号…） |

> 可切片性 + 可引用性占 50%——研究显示这两者是内容被 AI 答案"深度吸收"与"仅挂名引用"的最强区分特征。

## 用法

```bash
# 基础体检（终端报告）
npx geo-doctor audit example.com

# 多抽几页 + 中文 + 输出 HTML 与 JSON
npx geo-doctor audit example.com -p 5 --lang zh --html report.html --json report.json

# 所有选项
npx geo-doctor audit --help
```

| 选项 | 默认 | 说明 |
|---|---|---|
| `-p, --pages <n>` | 3 | 抽样页数（入口页 + 站内页，上限 10） |
| `-t, --timeout <ms>` | 15000 | 单请求超时 |
| `-l, --lang <lang>` | auto | 报告语言 `zh` / `en`（auto 跟随系统） |
| `--html [file]` | — | 输出可分享的 HTML 体检报告 |
| `--json [file]` | — | 输出机器可读 JSON |
| `-q, --quiet` | false | 隐藏抓取进度 |

也可以作为库使用：

```ts
import { audit } from 'geo-doctor';

const { report } = await audit('https://example.com', { pages: 5 });
console.log(report.totalScore, report.grade);
```

## 🗺 Roadmap

- [x] **v0.1 `audit`** — 33 条证据驱动规则、GEO Score、终端/HTML/JSON 三报告、双语
- [ ] **v0.2 `probe`** — AI 可见性化验：重复采样测品牌在 ChatGPT / Perplexity / Gemini / Kimi / 智谱 / 豆包答案中的出现率与引用率（BYO Key，只走官方 API）
- [ ] **v0.2 `fix`** — Agent 治疗模式：按诊断结果生成 llms.txt、JSON-LD、FAQ 块、品牌事实卡与改写简报
- [ ] **v0.3 `watch`** — GitHub Action：PR 分数门禁 + README 徽章
- [ ] **v0.3 MCP Server** — 在 Claude Code / 任意 MCP 客户端里直接调用 audit/probe/fix

## 白帽声明

GEODoctor 只做一件事：帮真实、可信的内容更好地被 AI 理解和引用。它**不会**建议堆砌关键词、伪造评测、批量生成虚假内容——[操纵型内容的风险已有专门研究](https://arxiv.org/abs/2406.03589)，而且引擎正在针对性反制。如果你的内容本身没有价值，任何 GEO 工具都救不了它。

## 生态与致谢

GEODoctor 是 GEO 开源生态中的**测量与诊断层**，与以下项目互补：

- [GEOFlow](https://github.com/yaojingang/GEOFlow) — GEO 内容工程与多站分发系统（生产层）
- [yao-geo-skills](https://github.com/yaojingang/yao-geo-skills) — GEO 工作流 Skill 合集（方法论层）
- [geo-citation-lab](https://github.com/yaojingang/geo-citation-lab) — 本项目多条规则的证据来源（研究层）

## 贡献

最欢迎的贡献：**带证据的新规则**。一条规则 = 一个纯函数 + 一条公开证据引用，见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[Apache-2.0](LICENSE) © GEODoctor contributors
