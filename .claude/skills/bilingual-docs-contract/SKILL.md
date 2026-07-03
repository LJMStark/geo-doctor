---
name: bilingual-docs-contract
description: GEODoctor 双语（中英）文案契约——改规则文案、README、终端/HTML 报告 UI 字符串、Release notes 时使用。含镜像文件清单与 CJK 终端对齐陷阱。
---

# 双语文案契约

## 适用场景

改任何用户可见文字：规则的 `name`/`why`/`finding`/`fix`、README、报告 UI 标签、CLI 帮助与错误信息、Release notes。

## 类型层强制 vs 人工守护

- `Bilingual { en, zh }` 类型保证**成对存在**——漏一种语言编译不过，这层不用操心
- 类型**保证不了质量**。三条人工红线：
  1. 中文禁机翻腔（"处方"不是"修复建议书"，"体检"不是"健康检查审计"）——中文社区是首发阵地，文案质量=产品质量
  2. `finding` 里的动态数据两种语言都要有（如 `2/3 sampled pages` ↔ `2/3 个抽样页面`），不许英文有数字中文没有
  3. 语气统一：诊断句陈述事实，处方句祈使给动作

## 手工镜像文件清单（没有自动同步！）

| 中文 | 英文镜像 | 同步纪律 |
|---|---|---|
| `README.md` | `docs/README.en.md` | 结构性改动（章节增删、快速开始变更）必须双改；营销措辞可以不逐句对齐 |
| `docs/methodology.md` | （单文件双语混排） | 表格是中文的，开头立场段双语——改表不用改英文，但改"核心立场"要双语都动 |

改了中文 README 忘了英文镜像是最容易犯的错——PR 自查：`git diff --stat` 里两个 README 要么都在要么都不在（除非改动确属单侧营销文案）。

## 终端对齐陷阱（改中文 label 前必读）

`src/report/terminal.ts` 的 `displayWidth()` 按 **CJK 字符 = 2 列**计算对齐，维度标签列宽取所有标签的最大显示宽度。这意味着：

- 改 `DIMENSION_LABELS` 中任何一个中文标签的**字数**，整个终端 scorecard 的列对齐会重排——改完必须肉眼跑一次 `node dist/cli.js audit <某站> --lang zh` 看对齐
- 新增含中文的行内标签（如 severity 的 `[高]`）时，宽度已在 `severityTag` 处理，但**中英标签长度差**会让 zh/en 两版报告观感不同，两种语言都要看

## 报告 UI 字符串的三个藏身处

1. `src/report/terminal.ts` 顶部 `UI` / `GRADE_LABEL` 常量
2. `src/report/html.ts` 顶部 `UI` / `GRADE_LABEL` / `STATUS_LABEL`（与 terminal 的**重复定义**，改等级文案要改两处——这是已知的 DRY 债，还没到值得抽象的规模）
3. `src/cli.ts` 内联的错误与提示文案（`detectLang` 决定语言）

## 什么时候不该用这份文档

- 代码注释和内部工程文档——**不要求双语**，英文单语即可
- `.claude/skills/` 本目录——中文单语即可（维护者语言）
- 改文案顺带想改规则逻辑 → 先读 [rule-change-control](../rule-change-control/SKILL.md)
- HTML 报告的视觉样式（非文字）→ [architecture-contracts](../architecture-contracts/SKILL.md) 的输出契约

## 姊妹文档

[rule-change-control](../rule-change-control/SKILL.md)（规则文案是双语重灾区）· [release-versioning-control](../release-versioning-control/SKILL.md)（Release notes 双语惯例）· [acceptance-gates](../acceptance-gates/SKILL.md)（文档 DoD：README 命令必须当下可跑）
