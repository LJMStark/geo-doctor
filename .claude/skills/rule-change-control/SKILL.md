---
name: rule-change-control
description: 修改 GEODoctor 审计规则前必读的变更管控——加规则、删规则、调阈值、调权重、改判定逻辑时使用。核心是三重合同与快照失效链。
---

# 规则变更管控

## 适用场景

对 `src/rules/{access,structure,chunkability,citability,freshness}.ts` 的任何改动：新增、删除、调阈值、调权重、改 check 逻辑。

## 动手前必知的三条锁链

### 1. 三重合同（tests/version.test.ts 强制执行）

- 规则总数断言为**恰好 33**——加删规则必须同步改这个数字，否则 CI 红
- 每条规则的 `evidence` 数组**至少一个 id**，且必须存在于 `src/evidence/papers.ts` 注册表——先去读 [evidence-registry-contract](../evidence-registry-contract/SKILL.md)
- 规则 id 全局唯一

### 2. fixture 余量只有 25 个词

`tests/fixtures/good-article.html` 的 main 正文 ≈ **175 units**，而 `cit.fact-density`、`cit.source-citations`、`cit.quotables`、`chunk.list-table-density` 的适用门槛都是 **150 units**。这意味着：

- 把任何适用门槛调高到 176+，这些规则对 fixture 判 `na`，"good article passes" 系列测试雪崩
- 往 fixture **删一句话**同样会雪崩
- 首日真实案例：`list-table-density` 曾设 200 被 fixture 卡成 `na`（详见 [failure-archaeology](../failure-archaeology/SKILL.md) 案 2），修复决策是**统一所有内容规则门槛为 150**——这个"150 = 全仓库统一内容适用门槛"的共识没有写在任何代码注释里，改一处必须改全部

测量 fixture 当前体量的命令在 [diagnostic-commands](../diagnostic-commands/SKILL.md)。

### 3. showcase 快照失效链

任何影响打分的改动（阈值、权重、判定、维度权重 `DIMENSION_WEIGHTS`）都会让 `docs/showcase.md` 里 11 个站点的公开分数变成谎言。**改分数逻辑 = 必须按 [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md) 重跑榜单**，没有例外。

## 变更检查清单

1. 阈值/权重的新值有依据吗？"感觉更合理"不算——要么引证据，要么在 PR 里写清工程权衡
2. `resultFromScore` 的全局 status 阈值（fail < 0.4 ≤ warn < 0.85 ≤ pass）**不许为单条规则改**——单规则需要特殊阈值走第四参数 `thresholds`（`chunk.definitions` 有先例：`{ failBelow: 0.3 }`）
3. 正反测试都有：pass 路径 + fail 路径 +（若有）na 路径
4. `docs/methodology.md` 的规则表是**手工维护**的，与代码没有自动同步——改规则名/权重/证据必须手动同步该表（生成表格的一次性脚本见 [diagnostic-commands](../diagnostic-commands/SKILL.md)）
5. 双语文案按 [bilingual-docs-contract](../bilingual-docs-contract/SKILL.md) 检查
6. 跑 `pnpm test:coverage`（CI 不守覆盖率门，见 [acceptance-gates](../acceptance-gates/SKILL.md)）

## 什么时候不该用这份文档

- 改的是爬虫层（fetcher/page/site）→ [architecture-contracts](../architecture-contracts/SKILL.md)（那里没有 33 合同，但有更硬的数据流不变量）
- 规则输出正确但报告显示不对 → [debug-audit-pipeline](../debug-audit-pipeline/SKILL.md)
- 只是想理解某条规则为什么存在 → `docs/methodology.md`
- 想给规则找新证据 → [evidence-registry-contract](../evidence-registry-contract/SKILL.md)

## 姊妹文档

[evidence-registry-contract](../evidence-registry-contract/SKILL.md)（证据先行）· [acceptance-gates](../acceptance-gates/SKILL.md)（新规则 DoD）· [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md)（改完必做）· [debug-test-failures](../debug-test-failures/SKILL.md)（改完测试挂了）
