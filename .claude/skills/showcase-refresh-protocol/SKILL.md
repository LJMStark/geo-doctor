---
name: showcase-refresh-protocol
description: docs/showcase.md 知名网站榜单的更新协议——改了打分逻辑、发新版本、或榜单数据过期时使用。榜单是版本化快照，不是活数据。
---

# showcase 榜单更新协议

## 适用场景

需要重跑或修改 `docs/showcase.md`（11 站体检榜）。

## 核心认知：榜单是版本化快照

榜单同时被三处引用：README 首屏钩子、Release notes、（未来的）发布帖。它的价值在**可复现**：日期 + 工具版本 + 参数固定，任何人同参数复测应得到相近结果。所以：

- **必须重跑的时机**：任何影响打分的合并（规则增删、阈值、权重、维度权重）；每次 minor 版本发布前
- **不许做的事**：手改个别分数"顺手更新"；混用不同版本跑出的行；改参数（页数/超时）却不改全表

## 标准跑法（与 v0.1 首榜一致的参数）

```bash
mkdir -p /tmp/showcase && for site in openai.com anthropic.com vercel.com stripe.com github.com \
  developer.mozilla.org en.wikipedia.org sspai.com ruanyifeng.com juejin.cn news.ycombinator.com; do
  (node dist/cli.js audit "$site" -q -t 8000 --json "/tmp/showcase/$site.json" >/dev/null 2>&1; echo "$site: $?") &
done; wait
```

参数契约：`-t 8000`、默认 3 页、站点清单如上（中英混合是刻意的双社区叙事）。表格生成脚本：读取 JSON 后按 `totalScore` 降序，列 = 站点/总分/等级/五维/最大 fail 项（取 weight 最高的 fail 的 `name.zh`）。

## 呈现惯例

- 表头下方**必须**标注：体检日期 + 工具版本 + "分数会随站点更新变化，欢迎复测"
- 拒绝访问的站（openai.com 首榜实测 exit 2）保留成"— / 拒绝访问"行——这是审计发现不是数据缺失，也是最好的传播梗，别删
- exit code 1（score<50，如 HN 首榜 49 分）**是成功的审计**，别当失败重跑
- "有意思的发现"小节：数据变了叙事要跟着变，不许留着旧结论配新数字

## 更新后的连带动作

1. README 首屏钩子里的具体数字（"Stripe 77 / HN 49"）若已失效 → 同步改
2. 若 Release notes 引用过旧榜 → 新 Release 里注明"榜单已按 vX.Y 重跑"
3. commit message 用 `docs: refresh showcase leaderboard for vX.Y`

## 什么时候不该用这份文档

- 单个站点分数看着不对 → 先 [debug-site-quirks](../debug-site-quirks/SKILL.md) 排查，确认不是 bug 再考虑是否如实入榜
- 想加/换榜单站点 → 可以，但一次换血别超过 1/3（榜单的纵向可比性也是资产），且中英站点比例保持均衡
- 给自己/客户的站跑分 → 直接 `audit`，跟榜单无关

## 姊妹文档

[rule-change-control](../rule-change-control/SKILL.md)（什么改动触发重跑）· [release-versioning-control](../release-versioning-control/SKILL.md)（发版时序里榜单的位置）· [debug-site-quirks](../debug-site-quirks/SKILL.md)（榜单站点行为异常时）
