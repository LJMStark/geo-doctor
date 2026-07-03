---
name: debug-audit-pipeline
description: GEODoctor audit 全链路分层调试——审计输出与预期不符、某站某维度分数不知道为什么高/低、或多数站点都异常时使用。fetch→parse→crawl→rules→report 每层独立探针，先读 JSON finding 再定位层。
---

# audit 链路分层调试

## 适用场景

审计结果与预期不符，且还不能定位是哪一层的问题。

## 链路与每层的独立探针

数据单向流经五层，**从下游往上游查通常更快**（先看 JSON 报告缩小到规则,再决定是否查爬取层）：

```
fetchUrl → parsePage → crawlSite(SiteAudit) → runRules(entries) → buildReport → render*
```

### 第 0 步：先要 JSON，不要肉眼看终端

```bash
node dist/cli.js audit <url> --json /tmp/r.json -q
node -e "const r=require('/tmp/r.json'); console.log(r.results.filter(x=>x.id==='<规则id>')[0])"
```

`finding` 字段几乎总是包含"规则看到了什么"（如 `2/3 sampled pages…`）——大多数"分数不对"读完 finding 就破案了。

### 第 1 层：fetch（网络与响应）

```bash
node --input-type=module -e "
import { fetchUrl } from './dist/index.js';
const r = await fetchUrl('https://example.com');
console.log(r.status, r.finalUrl, r.responseTimeMs+'ms', 'redirected:'+r.redirected, 'bytes:'+r.body.length, r.error??'');"
```

注意：body 有 **2MB 截断**（`MAX_BODY_BYTES`）——超大页面规则只看到前 2MB。

### 第 2 层：parse（页面解剖）

```bash
node --input-type=module -e "
import { fetchUrl, parsePage } from './dist/index.js';
const f = await fetchUrl('https://example.com');
const p = parsePage(f, new URL(f.finalUrl).origin);
console.log({ mainSelector: p.mainSelector, headings: p.headings.length, paragraphs: p.paragraphs.length,
  jsonLdTypes: p.jsonLd.map(n=>n['@type']), links: p.links.length, scriptKB: Math.round(p.scriptBytes/1024) });"
```

**最常见的断层在这里**：`mainSelector` 选错。`MAIN_SELECTORS` 按 `main → article → [role=main] → #content → .content → .post` 顺序取**第一个有文本的**——若站点的 `.content` 是侧栏，正文规则全部失真。确认方法：看 `p.mainText.slice(0, 200)` 是不是真正文。

### 第 3 层：crawl（站点级采样）

被审计页面数不对时查这里。`pickInternalLinks` 有两个静默过滤器：`SKIP_EXTENSIONS`（静态资源）和 `SKIP_PATH_HINTS`（login/cart/admin 等）；且按 **pathname+query 去重**（同路径不同参数不会被去重）。加 `-p 5` 不生效通常是首页内链本来就少或全被过滤。用不带 `-q` 的运行看实际抓了哪些 URL。

### 第 4/5 层：rules 与 report

单条规则对现网跑分见 [diagnostic-commands](../diagnostic-commands/SKILL.md)。report 层只做纯数据渲染，若 JSON 对而 HTML/终端错，才是 `src/report/` 的问题（罕见——它们无业务逻辑）。

## 什么时候不该用这份文档

- 已知是某个网站的特殊行为（403、SPA、乱码）→ [debug-site-quirks](../debug-site-quirks/SKILL.md)
- 挂的是测试而不是现网审计 → [debug-test-failures](../debug-test-failures/SKILL.md)
- 想改规则判定而不是排查 → [rule-change-control](../rule-change-control/SKILL.md)

## 姊妹文档

[debug-site-quirks](../debug-site-quirks/SKILL.md) · [diagnostic-commands](../diagnostic-commands/SKILL.md) · [architecture-contracts](../architecture-contracts/SKILL.md)（各层数据结构的不变量）
