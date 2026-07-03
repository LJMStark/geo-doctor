---
name: security-boundaries
description: GEODoctor 安全边界契约——处理任何来自被审计站点的数据、新增 fetch 路径、改报告渲染时必读。三道防线+UA 伦理红线。
---

# 安全边界契约

## 适用场景

代码将要触碰**被审计站点提供的任何字节**（HTML、robots.txt、JSON-LD、header），或新增网络请求路径，或改报告渲染。

## 威胁模型一句话

被审计的站点是**潜在敌对输入源**：我们主动去抓一个陌生网站，它返回什么我们无法控制。v0.1 的三次真实加固都源于此（代码评审发现，`tests/security.test.ts` 全程锚定）。

## 三道防线（改动必须保持，新路径必须接入）

### D1. SSRF 守卫 — `safePublicUrl`（src/crawler/site.ts）

robots.txt 的 `Sitemap:` 行是站点可控的任意字符串。真实攻击场景：CI 里审计恶意站，其 robots 声明 `Sitemap: http://169.254.169.254/latest/meta-data/...`（AWS 元数据）→ 我们的进程就去 GET 内网。守卫拒绝：非 http(s)、带凭据的 URL、loopback/私网段/link-local/`metadata.*` 主机。
**新增任何"从站点数据里取 URL 再 fetch"的路径（v0.2 probe 的 API 返回里也算！）必须过这个函数**——内部页面链接除外（`pickInternalLinks` 已限同源）。

### D2. 终端注入守卫 — `stripControlChars`（src/rules/utils.ts）

站点的 JSON-LD `@type`、`og:site_name`、sitemap URL 会进规则 finding → 原样写终端。不过滤则恶意站可用 `\x1b[2J` 清屏、改标题、伪造输出。**任何新规则若把站点字符串拼进 finding，必须先过 `stripControlChars`**。当前已接入的三处：schema 类型列表、品牌名列表、sitemap URL——新增第四处时照做。

### D3. XSS 守卫 — `escapeHtml`（src/report/html.ts）

HTML 报告会被用户转发给老板/客户——存储型 XSS 的完美投递链。**报告模板里每一个动态插值都必须包 `escapeHtml`**，包括你以为"肯定安全"的字段（URL、规则 id）。评审时的检查法：在模板字符串里搜 `${`，逐个确认要么是常量要么被转义。`tests/reports.test.ts` 有注入回归测试，新增动态字段要加进去。

## UA 伦理红线

UA 是真实身份并带仓库链接（`src/crawler/fetcher.ts:4`）。**被拒绝（openai.com 实测 403）就接受结果，绝不伪装浏览器 UA 绕过**。这不是技术限制而是产品底线：一个教人"对 AI 爬虫友好"的工具自己伪装爬虫，定位即崩塌。PR 出现 UA 伪装/轮换直接拒。同理：不加重试轰炸、不绕 robots 明确的 Disallow 抓内容页。

## 源码字节纪律

控制字符在源码中一律 `\xNN` 转义书写（`CONTROL_CHARS_RE` 用 `new RegExp('\\x1b...')` 形式的由来见 [failure-archaeology](../failure-archaeology/SKILL.md) 案 5）。字面不可见字节 diff 里人眼看不见，是 review 盲区。

## 自保参数（DoS 防护，双向的）

2MB body 截断 + 单请求超时保护**我们**；串行抓取、页数上限 10 保护**对方**。放宽任何一个都要同时想两边。

## 什么时候不该用这份文档

- 依赖漏洞 → 常规 `pnpm audit`，不在本契约范围
- 白帽产品定位的对外表述 → `CONTRIBUTING.md` 已写（"帮操纵引擎的功能不收"）；本文档只管工程执行面
- 用户自己输入的 URL 打到内网 → 不设防是**有意的**（本地 CLI，用户 curl 自己的内网天经地义）；只有"站点数据衍生的 URL"才过 D1

## 姊妹文档

[architecture-contracts](../architecture-contracts/SKILL.md)（C7 网络自保三件套）· [failure-archaeology](../failure-archaeology/SKILL.md)（案 5）· [debug-site-quirks](../debug-site-quirks/SKILL.md)（403 处置与 UA 立场的运维侧）
