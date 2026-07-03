---
name: skill-map
description: GEODoctor 工程技能总地图——不知道该读哪份文档、想总览本仓库有哪些规范时使用。若问题已能对号入座（调规则、发版、调试、文案等），直接用对应技能，勿经本图。
---

# 文档地图（先读我）

除本地图外的全部工程技能文档按症状路由如下。**本文档自身不含任何操作知识**——只负责把你送到对的地方。

## 症状 → 文档

| 你现在的处境 | 去读 |
|---|---|
| 想改某条规则的阈值/权重/文案，或加删规则 | [rule-change-control](../rule-change-control/SKILL.md) |
| 要发版、发 npm、改版本号 | [release-versioning-control](../release-versioning-control/SKILL.md) |
| 要改任何用户可见的中英文案 | [bilingual-docs-contract](../bilingual-docs-contract/SKILL.md) |
| audit 输出不对，不知道断在哪一层 | [debug-audit-pipeline](../debug-audit-pipeline/SKILL.md) |
| 某个真实网站的审计结果很怪（403/空壳/乱码/超时） | [debug-site-quirks](../debug-site-quirks/SKILL.md) |
| 测试挂了，看不懂为什么 | [debug-test-failures](../debug-test-failures/SKILL.md) |
| 想知道这仓库以前踩过什么坑（或要归档新事故） | [failure-archaeology](../failure-archaeology/SKILL.md) |
| 想动核心数据流/接口/退出码/评分公式 | [architecture-contracts](../architecture-contracts/SKILL.md) |
| 要添加/修改/质疑一条证据引用 | [evidence-registry-contract](../evidence-registry-contract/SKILL.md) |
| 代码要处理来自被审计站点的数据 / 新增 fetch 路径 / 改报告渲染 | [security-boundaries](../security-boundaries/SKILL.md) |
| 需要一条现成的诊断命令（单规则跑分、抽帧、查 CI） | [diagnostic-commands](../diagnostic-commands/SKILL.md) |
| 不确定手头的改动"做到什么程度才算完" | [acceptance-gates](../acceptance-gates/SKILL.md) |
| 要更新 docs/showcase.md 榜单 | [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md) |

## 新人建议阅读顺序

1. [failure-archaeology](../failure-archaeology/SKILL.md) —— 5 分钟了解这仓库怎么疼过
2. [architecture-contracts](../architecture-contracts/SKILL.md) —— 不变量清单
3. 其余按需查阅，不必通读

## 什么时候不该用这份文档

- 想了解项目是什么、怎么安装 → 根目录 `README.md`
- 想了解评分原理和论文依据 → `docs/methodology.md`
- 想贡献规则的流程性要求 → `CONTRIBUTING.md`
- 找社区发布文案 → `LAUNCH.local.md`（已 gitignore，只在本机存在）

## 姊妹文档

其余全部技能都是本文档的姊妹。若一个问题同时命中多份，优先级：**contracts 类 > control 类 > debug 类**（先确认不变量，再走流程，最后调试）；不在三类里的四份定位固定——[failure-archaeology](../failure-archaeology/SKILL.md) 是历史馆（事前读）、[diagnostic-commands](../diagnostic-commands/SKILL.md) 是工具箱（随取随用）、[acceptance-gates](../acceptance-gates/SKILL.md) 是收尾门禁（合入前）、[showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md) 是打分变更的连带义务（改完必查）。
