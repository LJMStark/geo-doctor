# Contributing to GEODoctor

[English](#english) | [中文](#中文)

## 中文

最有价值的贡献是**带证据的新规则**。

### 添加一条规则

1. 在 `src/rules/<维度>.ts` 中添加规则对象：一个纯函数 `check(site)` + 双语文案 + 权重（1–3）
2. **必须**在 `src/evidence/papers.ts` 中有对应证据条目（论文 / 公开数据集 / 行业标准，可公开访问）——没有证据的规则不会被合并
3. 在 `tests/rules-<维度>.test.ts` 中添加正反用例
4. 运行 `pnpm typecheck && pnpm test`
5. 提交 PR，说明：规则检查什么、证据是什么、为什么给这个权重

### 其他贡献

- 修 bug：请附带能复现问题的测试
- 阈值/权重争议：开 issue，带上你的证据
- 翻译改进：中英文案位于各规则的 `name` / `why` / `finding` / `fix` 字段

### 约定

- Conventional Commits（`feat:` / `fix:` / `docs:` …）
- 不引入运行时依赖需先讨论
- 白帽底线：任何"帮助操纵引擎"而非"帮助内容更可信"的规则或功能不会被接受

## English

The most valued contribution is a **new rule with evidence**.

### Adding a rule

1. Add a rule object in `src/rules/<dimension>.ts`: a pure `check(site)` function + bilingual copy + weight (1–3)
2. It **must** cite an entry in `src/evidence/papers.ts` (paper / public dataset / industry standard, publicly accessible) — rules without evidence will not be merged
3. Add positive & negative cases in `tests/rules-<dimension>.test.ts`
4. Run `pnpm typecheck && pnpm test`
5. Open a PR explaining: what it checks, what the evidence is, why this weight

### Ground rules

- Conventional Commits (`feat:` / `fix:` / `docs:` …)
- New runtime dependencies need prior discussion
- White-hat line: rules or features that help *manipulate* engines rather than make content more *trustworthy* will be rejected
