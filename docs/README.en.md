<div align="center">

# 🩺 GEODoctor

**Can AI see you? Give your site an AI-search checkup in 30 seconds.**

[简体中文](../README.md) · [Scoring methodology](methodology.md)

</div>

> **GEO = Generative Engine Optimization** — not geospatial tooling.
> When people ask ChatGPT, Perplexity, DeepSeek or Doubao instead of googling, does your site still get seen?

## Quick start

```bash
npx geo-doctor audit yoursite.com --html
```

No install, **no API key**. You get a terminal scorecard (GEO Score 0–100 across 5 dimensions), a shareable HTML report (`--html`) and machine-readable JSON (`--json`).

## Why GEODoctor?

1. **Every rule cites public research.** All 33 checks reference verifiable sources — the KDD 2024 GEO paper, the [citation-absorption study](https://arxiv.org/abs/2604.25707) (21,143 real AI citations, 72 features), Vercel's AI-crawler measurements, and more. Disagree with a weight? The receipts are in [methodology.md](methodology.md).
2. **Bilingual by design.** Reports in English and Chinese (`--lang en|zh`). Crawler checks cover GPTBot / ClaudeBot / PerplexityBot *and* Bytespider; the upcoming `probe` command targets both international (ChatGPT / Perplexity / Gemini) and Chinese (Kimi / Zhipu / Doubao) engines via official APIs only.
3. **An agent loop, not a one-shot linter** (roadmap): `audit` (diagnose) → `probe` (measure real brand visibility inside AI answers) → `fix` (generate llms.txt, JSON-LD, FAQ blocks) → `watch` (CI score gate + badge).

## The scoring model

| Dimension | Weight | Question it answers |
|---|---:|---|
| 🚪 Machine Access | 20% | Can AI crawlers even reach you? (robots.txt, llms.txt, JS rendering…) |
| 🧱 Structure & Semantics | 20% | Can machines read you unambiguously? (headings, JSON-LD, dates…) |
| 🔪 Chunkability | 25% | When retrieval slices your page, do the chunks still make sense? |
| 📌 Citability & Trust | 25% | Is your content worth citing? (facts, sources, authorship, E-E-A-T…) |
| 🌱 Freshness | 10% | Do engines believe you're still alive? |

Chunkability + Citability carry 50% — research shows they are the strongest separators between content that gets *absorbed* into AI answers and content that is merely name-dropped.

## Usage

```bash
npx geo-doctor audit example.com                 # terminal scorecard
npx geo-doctor audit example.com -p 5 --html --json   # sample 5 pages, all reports
```

| Option | Default | Description |
|---|---|---|
| `-p, --pages <n>` | 3 | Pages to sample (entry + internal, max 10) |
| `-t, --timeout <ms>` | 15000 | Per-request timeout |
| `-l, --lang <lang>` | auto | `zh` / `en` (auto follows your locale) |
| `--html [file]` | — | Write shareable HTML report |
| `--json [file]` | — | Write machine-readable JSON |

As a library:

```ts
import { audit } from 'geo-doctor';
const { report } = await audit('https://example.com', { pages: 5 });
```

## Roadmap

- [x] **v0.1 `audit`** — 33 evidence-backed rules, GEO Score, terminal/HTML/JSON reports, bilingual
- [ ] **v0.2 `probe`** — repeat-sampled brand visibility across ChatGPT / Perplexity / Gemini / Kimi / Zhipu / Doubao (BYO keys, official APIs only)
- [ ] **v0.2 `fix`** — agent mode: generate llms.txt, JSON-LD, FAQ blocks and rewrite briefs from audit results
- [ ] **v0.3 `watch`** — GitHub Action: score gate + README badge
- [ ] **v0.3 MCP server** — run audit/probe/fix from Claude Code or any MCP client

## White-hat only

GEODoctor helps genuine, verifiable content get understood and cited by AI. It will never suggest keyword stuffing, fake reviews or fabricated facts — [manipulation of conversational engines is a studied risk](https://arxiv.org/abs/2406.03589) and engines actively counter it.

## Ecosystem

GEODoctor is the **measurement & diagnosis layer** of the GEO open-source ecosystem, complementing [GEOFlow](https://github.com/yaojingang/GEOFlow) (content production), [yao-geo-skills](https://github.com/yaojingang/yao-geo-skills) (methodology skills) and [geo-citation-lab](https://github.com/yaojingang/geo-citation-lab) (research & evidence).

## License

[Apache-2.0](../LICENSE) © GEODoctor contributors
