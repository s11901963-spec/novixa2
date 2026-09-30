# Novixa (نوفسكا)

B2C platform: consumers describe a product (photo, link, name, description, or natural-language request) and Novixa uses AI + multi-source search to find it at factories/suppliers, compare options, show a landed final price, and handle purchase and delivery. **From Factory to Person.**

Full founder brief: [`docs/NOVIXA_BRIEF.md`](docs/NOVIXA_BRIEF.md). Current state vs. the brief, open issues, and roadmap: [`docs/MVP_AUDIT.md`](docs/MVP_AUDIT.md).

## Repo layout

- `novixa-mvp/` — Next.js 16 / React 19 / Tailwind v4 app (Arabic, RTL). Has its own `CLAUDE.md` → `AGENTS.md`: read `novixa-mvp/node_modules/next/dist/docs/` before writing Next.js code.
- `docs/` — product brief and audit.
- Root `package.json` / `node_modules/` — legacy; see audit item on dependencies.

Checks (run from `novixa-mvp/`): `npx eslint src`, `npx next build`.

## Integrations (status)

- **HIOBuy Product API** (1688/Taobao search by keyword, image, link; product detail): code in `novixa-mvp/src/lib/hiobuy.ts`, key in `HIOBUY_API_KEY`. The live connection is **not verified yet**. The header badge turns green only after a real 1688 search succeeds. HIOBuy's claimed official Alibaba/1688 partnership is unverified.
- Separate repo `s11901963-spec/novixa` (Python/FastAPI, Apify-based sourcing) is the larger backend and was built independently of this app.

## Non-negotiable rules

1. **B2C, not B2B.** The end consumer is the customer. Factories, suppliers and platforms (1688, Taobao, Weidian, …) sit in the backend; the user only ever deals with Novixa.
2. **Never invent data.** No made-up numbers, supplier counts, product counts, ratings, reviews, partners, customers, or "verified" badges, whether in UI copy, mock data shown to users, pitches, or docs.
3. **Label provenance.** Any supplier/product fact shown to users is one of: *Verified* / *Source-derived* / *AI inference* / *Unknown*. If data is insufficient, say so.
4. **Separate current from planned.** No API, integration or partnership is live unless it is confirmed. Mock/demo data must be visibly labelled as such.
5. **Final price means landed cost:** product + shipping + customs + VAT/taxes + service fees + Novixa margin. Don't call a partial sum "الإجمالي" / total.
6. **No unproven superiority claims** ("best prices", "guaranteed quality") and no financial projections presented as fact.
7. **MVP ≠ full product.** When planning, state what is MVP, what is deferred, and what needs market validation, a partnership, or an API.
8. **Challenge weak ideas.** Flag feasibility, cost, legal, and operational risks with a concrete alternative; don't agree by default.
9. China is a possible starting source, not the limit. First market: Saudi Arabia and the GCC.

## Writing style

- Consumer-facing copy: simple Arabic, minimal jargon.
- Technical docs: architecture, APIs, search/AI, data model.
- Investor material: problem, solution, market, business model, technology, with sources for any figures.
- Never commit secrets (API keys go in `novixa-mvp/.env.local`, which is gitignored).
