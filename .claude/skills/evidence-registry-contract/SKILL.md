---
name: evidence-registry-contract
description: GEODoctor 证据库（src/evidence/papers.ts）契约——添加、修改、质疑证据引用时使用。全仓库公信力的命根子，收录标准从严。
---

# 证据库契约

## 适用场景

往 `src/evidence/papers.ts` 加条目、改条目、或处理"这条证据站不住"的质疑。

## 为什么这份文件是命根子

项目的差异化定位 = "每条规则有出处"。**一条被拆穿的假引用毁掉的是全部 33 条的公信力**，而不是一条。所以本契约从严，宁可规则暂时挂靠更弱但真实的证据，也不收半真半假的引用。

## 收录标准（全部满足才能进）

1. **公开可访问**：URL 打开即达（论文 arXiv 优先、公开数据集、行业标准、可复现的实测报告）。付费墙、私有 PDF、内部分享一律不收
2. **编号可验证**：arXiv 号 / DOI / 会议名逐字符核对后再写——**编造或"凭印象"写编号是本仓库的死罪**。记不清就只写来源机构+标题，不写编号
3. **finding 双语且具体**：写"这条证据支撑什么结论"（如"主流 AI 爬虫不执行 JS"），不写"关于 AI 爬虫的研究"这类空话——finding 会原样进 HTML 报告展示给最终用户
4. **区分证据强度**（写进 finding 措辞）：实测/论文 → 陈述结论；标准/提案（如 llms.txt）→ 陈述"规范要求"而非"实测有效"；行业指南（如 E-E-A-T）→ 注明是评估标准而非因果证明

## id 稳定性

`id`（如 `geo-kdd24`）被规则的 `evidence` 数组、`tests/version.test.ts` 的注册表校验、`docs/methodology.md` 手工表三方引用。**改 id = 三处全改**；删条目前先 grep 确认无规则引用。

## 质疑与撤下流程

有人（issue/PR）指出某证据错误或过时：

1. 24h 内核实原始来源
2. 证据确实错了 → 撤下条目 + 挂靠它的规则要么换证据、要么降权重、要么临时下线（改 33 数字，走 [rule-change-control](../rule-change-control/SKILL.md)）
3. 在 issue 里公开处理过程——**认错快是公信力的一部分**，比"悄悄修"值钱

## 当前registry 的已知薄弱点（接手人注意）

- `citation-absorption`（arXiv:2604.25707）与 `citation-lab-data`（GitHub 仓库）是同一研究的两个入口——引用时论文优先，数据仓库用于"数据集"语境
- `cseo-bench` 的结论本身是"效果因场景而异"——挂靠它的规则（freshness 两条）措辞必须保持谨慎，不许升级成"实测证明"

## 什么时候不该用这份文档

- 想给规则调阈值（哪怕理由是"证据支持"）→ [rule-change-control](../rule-change-control/SKILL.md)
- 想理解某条证据讲了什么 → 直接读 `docs/methodology.md` 的证据源表
- methodology 手工表与代码不同步 → 那是 [acceptance-gates](../acceptance-gates/SKILL.md) 的新规则 DoD 漏了，去补流程而不是只补表

## 姊妹文档

[rule-change-control](../rule-change-control/SKILL.md)（证据变更几乎总伴随规则变更）· [acceptance-gates](../acceptance-gates/SKILL.md)（新规则必须先过本契约）
