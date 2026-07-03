---
name: debug-test-failures
description: GEODoctor 测试失败排查——vitest 红了看不懂时使用。含冻结时钟契约、fixture 阈值敏感表、na/fail 语义误判、管道吞退出码防再犯。
---

# 测试失败排查

## 适用场景

`pnpm test` 红了，且失败原因不是一眼能看懂的代码错误。

## 四个高频根因

### 1. 冻结时钟契约被破坏

`tests/helpers.ts` 把 `NOW` 冻结在 **2026-07-01**，fixture 的日期（发布 2026-03-01 / 修改 2026-05-10）与之配套。契约：**所有 freshness 规则必须用 `site.now`，绝不许 `new Date()`**——否则测试结果随真实时间漂移，一年后无人改代码测试自己开始挂。新写规则若涉及时间，测试挂了先查这条。

### 2. fixture 阈值敏感（余量仅 25 units）

`good-article.html` main 正文 ≈ 175 units；多条规则适用门槛 = 150。高危操作及其症状：

| 操作 | 症状 |
|---|---|
| fixture 删句子 | 受 150 适用门槛管的 4 条规则（`cit.fact-density`、`cit.source-citations`、`cit.quotables`、`chunk.list-table-density`）从 pass 变 **na**，"good article passes" 断言挂 |
| 规则门槛调高 | 同上 |
| fixture 加长段落 | `chunk.paragraph-size` 可能从 pass 变 warn |

首日真实案例（门槛 200 vs fixture 175）的完整经过见 [failure-archaeology](../failure-archaeology/SKILL.md) 案 2。改 fixture 前先量体量（命令在 [diagnostic-commands](../diagnostic-commands/SKILL.md)）。

### 3. na 与 fail 的语义混淆

断言 `status` 时记住：**na = 规则不适用**（不进分母），**fail = 适用且不合格**。页面太短触发的是 na 不是 fail。若你预期 fail 却得到 na，几乎总是 fixture 没过适用门槛，而不是判定逻辑错。

### 4. 你根本没看到测试在挂（管道吞退出码）

**本仓库最贵的一次事故**：`pnpm test 2>&1 | tail -3 && git commit` 中管道让失败退出码变成 `tail` 的 0，红着测试完成了 commit（reflog 里 `af36f9e` 那次 amend 就是补救现场）。防再犯写法：

```bash
pnpm test > /tmp/t.txt 2>&1; E=$?; tail -5 /tmp/t.txt; [ $E -eq 0 ] && git commit -m "..."
```

## 排查工具

- 单跑一个文件：`pnpm vitest run tests/rules-access.test.ts`
- 单跑一条规则（不经测试框架）：helpers 的 `runRule(id, site)`，或见 [diagnostic-commands](../diagnostic-commands/SKILL.md)
- 覆盖率细节：`pnpm test:coverage`。**fetcher.ts / site.ts 的网络 IO 主路径没有单测是显式共识**（实测语句覆盖仅 5%/17%，由真实站点冒烟兜底，见 [acceptance-gates](../acceptance-gates/SKILL.md)）——不要为网络路径 mock 单测"修覆盖率"。注意例外：site.ts 里的 `safePublicUrl` 是纯函数**且有直接单测**（tests/security.test.ts），动它必须过测试

## 什么时候不该用这份文档

- 测试绿但现网行为不对 → [debug-audit-pipeline](../debug-audit-pipeline/SKILL.md)
- 想改测试的断言目标（比如硬编码 URL）→ 先想想 `af36f9e`：测试应断言**常量**（如 `REPO_URL`）而非字面量,这是那次事故换来的规矩
- CI 红但本地绿 → 先查 Node 版本矩阵（CI 是 20/22）,再查 lockfile 是否提交

## 姊妹文档

[failure-archaeology](../failure-archaeology/SKILL.md)（案 1 管道、案 2 阈值）· [diagnostic-commands](../diagnostic-commands/SKILL.md) · [rule-change-control](../rule-change-control/SKILL.md)（改阈值的正确流程）· [acceptance-gates](../acceptance-gates/SKILL.md)（覆盖率真相）
