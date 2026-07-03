---
name: failure-archaeology
description: GEODoctor 事故档案馆——每次真实踩坑的现象/根因/修复/防复发规矩。新人入职先读；发生新事故时按模板归档。
---

# 失败案例考古

## 适用场景

了解仓库怎么疼过；或刚发生新事故，需要归档。每案格式固定：现象 → 根因 → 修复 → 规矩 → 反事实代价。

## 案 1：管道吞退出码——红着测试完成了 commit（本仓库最贵事故）

- **现象**：改仓库地址后 `tests/reports.test.ts` 挂了，但 commit 照常完成。git reflog 里 `af36f9e → ac31244 (amend)` 是补救现场
- **根因**：验证链写成 `pnpm test 2>&1 | tail -3 && git commit`——bash 管道的退出码取**最后一个命令**（tail 恒 0），`&&` 判断的是被洗白后的 0
- **修复**：输出落文件、显式保存 `$?` 再判断；同时把测试断言从硬编码 URL 改为断言 `REPO_URL` 常量（消掉挂的根源）
- **规矩**：① 任何"验证 && 提交"链禁止管道接 tail；② 测试断言外部可变字面量（URL、版本号）时必须改为断言常量
- **反事实代价**：当时若直接 push，公开首日 GitHub 首页挂红 CI——对一个卖"可验证"的审计工具是形象自杀

## 案 2：阈值-fixture 联动断裂（200 vs 175）

- **现象**：首次全量跑测试，`chunk.list-table-density` 对 good-article fixture 返回 `na`，"good article passes" 断言挂
- **根因**：该规则适用门槛写了 200 units，而 fixture 正文只有 ≈175 units；其他内容规则门槛都是 150。**阈值各自为政，没有统一共识**（注：200 这个状态发生在首个 commit 之前的工作区，git 历史不可考——以本案叙述和测试快照为准）
- **修复**：统一全部内容规则适用门槛为 150
- **规矩**：150 = 全仓库统一的内容规则适用门槛；改任何一处等于改共识，必须全改并按 [rule-change-control](../rule-change-control/SKILL.md) 走
- **反事实代价**：低（测试当场拦截）——这正是"good article 全 pass"这种粗粒度断言的价值：它是阈值漂移的金丝雀

## 案 3：vhs 命令名记错（Hidden vs Hide）

- **现象**：录 demo GIF，`vhs` 解析报 `Invalid command: Hidden`，连挂两次
- **根因**：凭记忆写 tape，vhs 的隐藏块命令是 `Hide`/`Show`，不存在 `Hidden`
- **修复**：`sed` 批量改两个 tape
- **规矩**：写 tape 这类小众 DSL 先 `vhs manual | grep` 确认命令名（已收录进 [diagnostic-commands](../diagnostic-commands/SKILL.md) 发布物验证节）；tape 已入库（`docs/assets/*.tape`），复用别重写
- **反事实代价**：仅几分钟——但若发生在直播演示就难看了

## 案 4：npm login 撞上 CNPM 镜像

- **现象**：用户执行 `npm login` 跳出 "Sign in to CNPM"，困惑"我不是发 GitHub 吗"
- **根因**：本机 `~/.npmrc` 指向 npmmirror（国内加速镜像，**只读**）；`npm login` 默认登配置源
- **修复**：登录带 `--registry https://registry.npmjs.org`；package.json 加 `publishConfig` 锁发布源（装包仍走镜像）
- **规矩**：`publishConfig` 不许删；所有 npm 发布文档必须写全带 registry 的完整命令
- **反事实代价**：登录了 CNPM 也发不了包，最多浪费时间；但若镜像同名包存在还可能装错包

## 案 5：Edit 工具改不动含不可见字节的行

- **现象**：`stripControlChars` 的正则里控制字符写成了**字面字节**（ESC 等不可见），Edit 工具精确匹配失败，改不动
- **根因**：正则用字面控制字符书写，文件里存了不可见字节——工具与人眼都无法可靠匹配
- **修复**：`perl -i -pe 'if ($. == 147) {...}'` 按**行号**替换；重写为 `new RegExp('\\x1b...')` 显式转义形式
- **规矩**：源码中控制字符一律 `\xNN` 转义书写，禁止字面量；遇到含不可见字节的行，用行号定位的 perl/sed 而不是内容匹配
- **反事实代价**：低——但这类字节若进了 git diff，review 时人眼完全不可见，是潜在的供应链隐患形态

## 新事故归档模板

```markdown
## 案 N：<一句话名字>
- **现象**：
- **根因**：
- **修复**：commit <hash>
- **规矩**：<写进哪份姊妹文档了？没有归属的规矩会丢>
- **反事实代价**：
```

归档后：把"规矩"落到对应的 contract/control 文档里——**考古馆存故事，规矩要住进法典**。

## 什么时候不该用这份文档

- 找"现在该怎么做"→ 各 control/contract 文档（本馆只存"为什么会有那条规矩"）
- 正在救火 → [debug-audit-pipeline](../debug-audit-pipeline/SKILL.md) / [debug-test-failures](../debug-test-failures/SKILL.md)，救完再回来归档

## 姊妹文档

每案的"规矩"分别住在：[debug-test-failures](../debug-test-failures/SKILL.md)（案 1）· [rule-change-control](../rule-change-control/SKILL.md)（案 2）· [diagnostic-commands](../diagnostic-commands/SKILL.md)（案 3 的 DSL 确认命令）· [release-versioning-control](../release-versioning-control/SKILL.md)（案 4）· [security-boundaries](../security-boundaries/SKILL.md)（案 5 的字节纪律与行号替换手法）
