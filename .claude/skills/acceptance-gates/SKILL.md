---
name: acceptance-gates
description: GEODoctor 各类变更的完成定义（DoD）——不确定"做到什么程度才算完"时使用。新规则、bug 修复、文档、发版四类门禁+覆盖率真相。
---

# 验收门禁（Definition of Done）

## 适用场景

自查或评审：这个改动可以合入了吗？

## 门禁 A：新增/修改规则

- [ ] 证据先行：evidence id 已按 [evidence-registry-contract](../evidence-registry-contract/SKILL.md) 入册（这是硬门，无证据的规则直接拒——CONTRIBUTING 对外也这么承诺的）
- [ ] `tests/version.test.ts` 的规则总数断言已同步（当前 33）
- [ ] 正反测试齐：pass 路径 + fail 路径 +（若有适用门槛）na 路径
- [ ] 双语文案过 [bilingual-docs-contract](../bilingual-docs-contract/SKILL.md) 三条红线
- [ ] 站点来源字符串进 finding 前已过 `stripControlChars`（[security-boundaries](../security-boundaries/SKILL.md) D2）
- [ ] `docs/methodology.md` 手工规则表已同步（**没有自动同步，全靠这条清单**）
- [ ] 若影响打分：showcase 榜单已按 [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md) 重跑
- [ ] `pnpm typecheck && pnpm test` 且**退出码亲眼确认**（管道吞码事故后的铁律，见 [failure-archaeology](../failure-archaeology/SKILL.md) 案 1）
- [ ] `pnpm test:coverage` 本地过门槛（绿 CI ≠ 覆盖率达标，见下方"覆盖率真相"）

## 门禁 B：bug 修复

- [ ] 先有失败测试复现，后有修复让它变绿——顺序不能反（本仓库 TDD 规矩的最低执行线）
- [ ] 若 bug 属于"站点敌对输入"类：回归测试写进 `tests/security.test.ts` 并对照 [security-boundaries](../security-boundaries/SKILL.md) 三道防线归位
- [ ] 值得后人记住的坑 → 按模板归档进 [failure-archaeology](../failure-archaeology/SKILL.md)

## 门禁 C：文档

- [ ] **快速开始/安装区块的命令当下可跑**——npm 未发布期间该区块不许出现 `npx geo-doctor`；用法示例段允许按发布后形态书写、"即将发布"预告句除外（此刻的临时状态；发布后按 [release-versioning-control](../release-versioning-control/SKILL.md) 改回）。检验法：把快速开始命令粘进新终端跑一遍
- [ ] 中英镜像文件同步检查（[bilingual-docs-contract](../bilingual-docs-contract/SKILL.md) 的镜像清单）
- [ ] 徽章不许 404（npm 徽章在包发布前不挂）

## 门禁 D：发版

全套见 [release-versioning-control](../release-versioning-control/SKILL.md)；本门只留一句：**版本号双源（package.json + src/version.ts）+ stub 承诺（v0.2 必须先有 probe/fix 之一）**。

## 覆盖率真相（自查时别被骗）

- CI 跑的是 `pnpm test`，**不含 coverage**——绿 CI ≠ 覆盖率达标
- 本地 `pnpm test:coverage` 的门槛：lines/functions/statements 80%、branches 70%
- `fetcher.ts` 与 `site.ts` 的**网络 IO 主路径**不写单测是**显式共识**（实测语句覆盖 5%/17%，由真实站点冒烟兜底）：不要为网络路径凑 mock 单测，也不要引用这两个文件的低覆盖给自己的新代码免测——豁免仅限网络 IO 路径。其中的纯函数不在豁免内（先例：site.ts 的 `safePublicUrl` 有直接单测）
- 冒烟标准：`node dist/cli.js audit <真实站点>` 三种输出（终端/HTML/JSON）各验一次

## 什么时候不该用这份文档

- 想知道**怎么做**改动 → 各 control/debug 文档；本门只管**何时算完**
- 架构级不变量是否被破坏 → [architecture-contracts](../architecture-contracts/SKILL.md)（那是设计约束，不是完成度清单）
- 社区发布（发帖）的检查清单 → `LAUNCH.local.md`

## 姊妹文档

[rule-change-control](../rule-change-control/SKILL.md)（门禁 A 的过程版）· [release-versioning-control](../release-versioning-control/SKILL.md)（门禁 D 全文）· [failure-archaeology](../failure-archaeology/SKILL.md)（门禁 B 的归档出口）
