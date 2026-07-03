---
name: architecture-contracts
description: GEODoctor 架构不变量法典——动核心数据流、Rule 接口、评分公式、CLI 退出码、Page 结构前必读。破坏任何一条都是跨模块地震。
---

# 架构契约（不变量法典）

## 适用场景

改动跨越单条规则的任何东西：数据流、接口、评分聚合、CLI 行为、解析结构。

## 契约清单

### C1. 规则是纯函数

`check(site)` 不做 IO、不 `new Date()`（时间从 `site.now` 取）、不随机、**不修改 `SiteAudit`**。这是"规则可单测、可并行、可缓存"的全部基础。爬取归爬取（crawler 层），判断归判断（rules 层）——需要新数据时，把字段加进 `SiteAudit`/`Page`，别在规则里发请求。

### C2. 数据单向流，report 是纯数据

```
fetchUrl → parsePage → SiteAudit → runRules → RuleReportEntry[] → AuditReport → render
```

`AuditReport` 必须可 `JSON.stringify` 往返——不许塞 cheerio 对象、Date 实例、函数。`renderTerminal/renderHtml/renderJson` 只消费 report，**零业务判断**（JSON 对而渲染错才是 report 层 bug，否则去上游）。

### C3. 评分聚合语义

- 维度分 = `Σ(score×weight)/Σ(weight)`，**na 不进分母**；全 na 的维度整体退出总分加权（`buildReport` 里 `scorable` 过滤）——改这里等于重定义所有历史分数
- 全局 status 阈值：`fail < 0.4 ≤ warn < 0.85 ≤ pass`（`resultFromScore`）。单规则特例走 `thresholds` 参数，不许改全局
- 权重域是类型限死的 `1|2|3`——想要 2.5 说明维度划分错了，回去重想
- 等级线 85/70/50（`gradeFor`）与 README、终端、HTML 三处文案强耦合

### C4. 崩溃的规则降级为 na，审计永不整体失败

`runRules` 捕获单条规则异常 → status na + 错误信息进 finding。**不许**让规则异常冒泡杀掉整个审计——用户面对的是"32 条结果 + 1 条内部错误"，不是空报告。

### C5. CLI 退出码是对外 API

`0` = score ≥ 50；`1` = score < 50；`2` = 爬取失败/意外错误。用户的 CI 脚本靠这个做门禁——改语义 = breaking change = major 版本。

### C6. Page 的两个反直觉设计（都是故意的）

- `parsePage` 里 **cheerio 加载两次**：主 `$` 先删了 `script/style/noscript`（保证文本干净），而 JSON-LD 藏在 `<script>` 里，所以 `extractJsonLd` 对原始 HTML 二次解析。合并成一次 = jsonLd 永远为空 = structure/freshness 规则集体失明
- `mainSelector` 是**选择器字符串**存在 Page 上（不是节点引用），规则用 `page.$(page.mainSelector)` 二次查询——因为 cheerio 节点跨函数传引用易碎

### C7. 网络自保三件套

单请求超时（`AbortSignal.timeout`）、body 2MB 截断（`MAX_BODY_BYTES`）、`fetchUrl` **永不 throw**（错误进 `FetchResult.error`）。新增任何 fetch 路径必须继承三件套 + 过 [security-boundaries](../security-boundaries/SKILL.md) 的 SSRF 检查。

## 什么时候不该用这份文档

- 只动一条规则的内部逻辑 → [rule-change-control](../rule-change-control/SKILL.md)
- 只改文案 → [bilingual-docs-contract](../bilingual-docs-contract/SKILL.md)
- 想理解"为什么有这条契约"的历史 → [failure-archaeology](../failure-archaeology/SKILL.md)

## 姊妹文档

[security-boundaries](../security-boundaries/SKILL.md)（C7 的安全面）· [rule-change-control](../rule-change-control/SKILL.md)（C1/C3 的规则侧应用）· [acceptance-gates](../acceptance-gates/SKILL.md)（破坏契约的 PR 如何被拦）
