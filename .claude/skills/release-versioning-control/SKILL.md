---
name: release-versioning-control
description: GEODoctor 发版与版本号管控——npm publish、GitHub Release、改 VERSION、发 v0.2 时使用。含 npmmirror 陷阱与文档改回清单。
---

# 发版与版本管控

## 适用场景

改版本号、发 GitHub Release、发布 npm 包、规划 v0.2/v0.3。

## 版本号双源合同

版本号存在于两处且必须一致：`package.json` 的 `version` 和 `src/version.ts` 的 `VERSION` 常量。`tests/version.test.ts` 强制校验。**发版第一步永远是同时改这两处**——只改一处，CI 会替你脸红。

## npm 发布（2026-07-03 起被用户推迟，发布时照此执行）

1. **登录必须带 registry 参数**：`npm login --registry https://registry.npmjs.org`。本机 `~/.npmrc` 指向 npmmirror（淘宝只读镜像），裸 `npm login` 会跳出 CNPM 登录页——它登了也不能发包（真实踩坑见 [failure-archaeology](../failure-archaeology/SKILL.md) 案 4）
2. `package.json` 的 `publishConfig.registry` 已锁定官方源，**不许删**——它保证装包走镜像（快）、发包走官方（对）
3. `pnpm publish`——`prepublishOnly` 自动跑 typecheck + test + build，红了发不出去，这是故意的
4. **文档改回清单**（npm 未发布期间，文档被刻意改成源码安装写法，发布后必须改回）：
   - `README.md`：标题恢复「30 秒开始体检」、快速开始恢复 `npx geo-doctor audit yoursite.com --html`、加回 npm 版本徽章
   - `docs/README.en.md`：quick start 恢复 npx
   - `docs/showcase.md`：复测命令恢复 npx
   - 两个 README 用法段 `geo-doctor` → `npx geo-doctor`
5. 验证：`npx geo-doctor --version`（新终端，避免本地 link 干扰）

## stub 承诺契约

`src/cli.ts:97` 附近注册了 `probe` / `fix` / `watch` 三个 stub 子命令，文案写死"coming in v0.2"。这是对外承诺：

- **版本号跳到 0.2.x 之前，probe 和 fix 至少一个必须真实现**，否则 stub 文案从"预告"变"谎言"
- 若 roadmap 变更（如 watch 提前），stub 文案、README 双语 Roadmap 段、Release notes 三处要一起改

## Release 惯例

- GitHub Release 用 `gh release create vX.Y.Z`，notes 双语（v0.1.0 是格式模板）
- Release notes 里引用 showcase 数据时注意榜单版本要与 Release 版本匹配（见 [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md)）

## 什么时候不该用这份文档

- 日常 commit / PR 的验收 → [acceptance-gates](../acceptance-gates/SKILL.md)
- 社区发布的文案与时序（HN/微信/X）→ `LAUNCH.local.md`（gitignored，只在维护者本机）
- 改规则后要不要发版的判断：patch=修 bug，minor=加规则或加命令——阈值调整属于 minor（会改变所有人的分数，见 [rule-change-control](../rule-change-control/SKILL.md)）

## 姊妹文档

[acceptance-gates](../acceptance-gates/SKILL.md)（发版 DoD）· [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md)（发版前重跑榜单）· [failure-archaeology](../failure-archaeology/SKILL.md)（CNPM 案）· [bilingual-docs-contract](../bilingual-docs-contract/SKILL.md)（Release notes 双语）
