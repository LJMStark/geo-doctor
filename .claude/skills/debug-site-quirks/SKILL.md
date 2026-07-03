---
name: debug-site-quirks
description: 真实网站审计怪象排查手册——403 拒绝、SPA 空壳误判、乱码、超时、sitemap 找不到时使用。含 openai.com 案例与不许伪装 UA 的红线。
---

# 真实站点怪象排查

## 适用场景

某个具体网站的审计结果反常，且已确认不是本工具代码 bug。

## 怪象速查

### 403 / 直接拒绝（openai.com 现象）

我们的 UA 是真实身份：`Mozilla/5.0 (compatible; GEODoctor/0.1; +repo链接)`。反爬严格的站（openai.com 实测）会直接拒绝。处置：

- **这是有效的审计发现，不是 bug**——用与 AI 爬虫同类的方式访问被拒，说明该站对 AI 爬虫大概率同样不友好。showcase 榜单对此的呈现惯例是"拒绝访问"行（见 [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md)）
- **红线：不许改 UA 伪装成浏览器绕过**。这是白帽定位的工程体现，PR 里出现伪装 UA 直接拒（[security-boundaries](../security-boundaries/SKILL.md) 有完整边界）

### SPA 空壳的误判两侧

`access.js-dependency` 的判定是启发式：`bodyText < 150 units 且（存在近空的 #root/#app/#__next/#___gatsby 容器 或 scriptBytes > 100KB）→ 0 分`。两个已知误差方向：

- **漏报**：SSR 首屏 + 客户端补水的站判 pass——正确，AI 爬虫确实读得到首屏
- **误报**：极简落地页（正文本来就 < 150 词）+ 大 bundle 会被当空壳。核对方法：`curl -s <url> | grep -c "关键正文词"`，HTML 里真有正文就是误报，考虑给该规则提 issue 而不是现场改阈值（改阈值走 [rule-change-control](../rule-change-control/SKILL.md)）

### 中文站乱码 / charset 怪象

解码固定 `TextDecoder('utf-8', { fatal: false })`——GBK 站点会解出乱码但**不会崩**，随后 `structure.lang-charset` 会警告。这是接受的行为：主流 AI 爬虫同样默认 UTF-8。若乱码导致正文规则全失真，在报告里体现为多条规则 finding 异常，不要单独"修"某一条。

### 超时与慢站

`-t`（默认 15000ms）是**单请求**超时，不是总预算——3 页 + robots + llms + sitemap 最多 6+ 次请求，慢站总耗时可到分钟级。批量跑榜单用 `-t 8000` 截断长尾（showcase 的既定参数）。`timeout` 错误在 `FetchResult.error` 里是字符串 `'timeout'`（`describeFetchError` 归一）。

### sitemap 明明有却报没有

`resolveSitemap` 只查两处：robots.txt 声明的**前 2 条** Sitemap 行、`/sitemap.xml`。**不递归 sitemapindex、不猜 /sitemap_index.xml**——这是 v0.1 已知局限。另外 robots 声明的 sitemap URL 要过 `safePublicUrl` SSRF 过滤，指向内网/元数据地址的声明会被静默丢弃（安全设计，见 [security-boundaries](../security-boundaries/SKILL.md)）。

## 什么时候不该用这份文档

- 所有站都不对（不是个别站）→ [debug-audit-pipeline](../debug-audit-pipeline/SKILL.md)，那是代码问题
- 本地 fixture/测试问题 → [debug-test-failures](../debug-test-failures/SKILL.md)
- 想为怪象改规则阈值 → [rule-change-control](../rule-change-control/SKILL.md)（有 fixture 余量和榜单失效链约束）

## 姊妹文档

[debug-audit-pipeline](../debug-audit-pipeline/SKILL.md)（分层探针）· [security-boundaries](../security-boundaries/SKILL.md)（UA 伦理与 SSRF 过滤）· [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md)（榜单如何呈现拒绝访问）
