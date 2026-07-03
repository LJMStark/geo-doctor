---
name: diagnostic-commands
description: GEODoctor 诊断命令手册——可直接粘贴的调试命令集合：单规则跑分、fixture 测量、robots 决策、GIF 抽帧验证、CI 状态。查命令来这里，查思路去 debug 文档。
---

# 诊断命令手册

## 适用场景

调试思路已有，需要现成命令。全部命令在仓库根目录执行，前置 `pnpm build`（命令走 `dist/`，改了 src 不重建 = 调试旧代码，这是最常见的自坑）。

## 规则与评分

```bash
# 现网单规则解剖（JSON 里抽一条规则的完整结果）
node dist/cli.js audit <url> --json /tmp/r.json -q && \
  node -e "const r=require('/tmp/r.json');console.log(JSON.stringify(r.results.find(x=>x.id==='chunk.qa-structure'),null,2))"

# 五维分速览
node -e "const r=require('/tmp/r.json');r.dimensions.forEach(d=>console.log(d.dimension,d.score,'p/w/f/na:',d.passed,d.warned,d.failed,d.na))"

# 对任意本地 HTML 字符串跑单规则（不发网络请求）——改判定逻辑时的最快反馈环
node --input-type=module -e "
import * as cheerio from 'cheerio';
import { parsePage, allRules } from './dist/index.js';
const html = '<html><body><main><h1>t</h1><h2>什么是 X?</h2><p>内容</p></main></body></html>';
const page = parsePage({ url:'https://x.com/a', finalUrl:'https://x.com/a', ok:true, status:200,
  redirected:false, responseTimeMs:500, headers:{}, body: html }, 'https://x.com');
const site = { inputUrl:'https://x.com/a', origin:'https://x.com', fetchedAt:new Date().toISOString(),
  now:new Date(), robots:{exists:false,content:'',groups:[],sitemaps:[]},
  llmsTxt:{exists:false,content:''}, sitemap:{exists:false}, pages:[page] };
console.log(allRules.find(r=>r.id==='chunk.qa-structure').check(site));"
```

## fixture 与阈值

```bash
# 量 fixture 正文体量（改 fixture 前必跑；門槛敏感性见 debug-test-failures）
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import * as cheerio from 'cheerio';
const \$ = cheerio.load(readFileSync('tests/fixtures/good-article.html','utf-8'));
\$('script,style').remove();
const t=\$('main').text().replace(/\s+/g,' ').trim();
console.log('units≈', t.split(/\s+/).filter(w=>/[a-z0-9]/i.test(w)).length, '(内容规则适用门槛=150)');"
```

## 爬取层

```bash
# robots 决策单测（某 bot 对某路径能不能爬）
node --input-type=module -e "
import { parseRobots, isAllowed } from './dist/index.js';
const r = parseRobots('User-agent: GPTBot\nDisallow: /\n', true);
console.log('GPTBot /:', isAllowed(r, 'GPTBot', '/'));"

# fetch/parse 单层探针 → 见 debug-audit-pipeline（含 mainSelector 检查）
```

## 发布物验证

```bash
# GIF 最后一帧抽出来人眼验收（vhs 录完必做——中途报错 GIF 也会生成，别只看文件存在）
ffmpeg -y -sseof -0.5 -i docs/assets/demo-zh.gif -frames:v 1 /tmp/last.png && open /tmp/last.png

# 重录 GIF 的前置 wrapper（tape 依赖 /tmp/geo-bin/geo-doctor）
mkdir -p /tmp/geo-bin && printf '#!/bin/sh\nexec node %s/dist/cli.js "$@"\n' "$PWD" > /tmp/geo-bin/geo-doctor && chmod +x /tmp/geo-bin/geo-doctor
```

## CI 与仓库

```bash
gh run list --repo LJMStark/geo-doctor --limit 5        # CI 状态
pnpm test:coverage                                       # 覆盖率真相在本地(CI 不跑 coverage)
```

## 退出码速查

`0` score≥50 · `1` score<50 · `2` 爬取失败/意外错误（对外 API，勿改——见 [architecture-contracts](../architecture-contracts/SKILL.md) C5）

## 什么时候不该用这份文档

- 不知道该查哪层 → [debug-audit-pipeline](../debug-audit-pipeline/SKILL.md)（思路在那,命令在这）
- 命令输出看不懂 → 对应 debug 文档；本手册不解释语义

## 姊妹文档

[debug-audit-pipeline](../debug-audit-pipeline/SKILL.md) · [debug-test-failures](../debug-test-failures/SKILL.md) · [showcase-refresh-protocol](../showcase-refresh-protocol/SKILL.md)（批量跑分命令在那份）
