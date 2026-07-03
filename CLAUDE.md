# GEODoctor — 项目指引

开源 GEO（Generative Engine Optimization）审计 CLI。TypeScript + Node ≥20 + pnpm，Apache-2.0。

## 工程文档体系

`.claude/skills/` 下有 14 份技能文档，覆盖变更管控/调试/事故考古/架构契约/诊断/验收。
**入口：[skill-map](.claude/skills/skill-map/SKILL.md)**——按症状路由，动手前先查。

最常触碰的三条硬约束（详情见对应文档）：

1. 改规则/阈值 → 必读 [rule-change-control](.claude/skills/rule-change-control/SKILL.md)（33 合同、fixture 25 词余量、showcase 快照失效链）
2. 触碰站点数据 → 必读 [security-boundaries](.claude/skills/security-boundaries/SKILL.md)（SSRF/终端注入/XSS 三道防线、UA 不许伪装）
3. 验证命令禁止 `test | tail && commit` 管道写法——退出码会被吞（[failure-archaeology](.claude/skills/failure-archaeology/SKILL.md) 案 1）

## 常用命令

```bash
pnpm typecheck && pnpm test   # 合入前门禁(CI 不跑 coverage,本地 pnpm test:coverage)
pnpm build                    # 调试跑 dist/,改完 src 必须重建
node dist/cli.js audit <url> --json /tmp/r.json   # 现网诊断入口
```

## 语言约定

用户可见文案一律双语（`Bilingual` 类型强制）；代码注释英文；工程文档中文。
