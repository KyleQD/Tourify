# Codex Master Implementation Prompt

You are implementing Tourify Music Ecosystem Phase 3. Treat this directory as the scope contract, but audit the repository before editing code.

## Mandatory first actions

1. Read the canonical Music Ecosystem Integration Guide and every Phase 1, Phase 2, and Phase 3 document.
2. Inspect the real repository, migrations, generated Supabase types, deployed schema references, account/capability functions, storage buckets, Stripe/commerce code, jobs, notifications, audit logs, and tests.
3. Complete `CURRENT_STATE_AUDIT_RESULTS.md` from the provided template.
4. Copy `phase-3-execution-plan.template.json` to `phase-3-execution-plan.json`.
5. Replace assumptions, paths, dependencies, and risks with audit findings.
6. Validate the plan against `phase-3-execution-plan.schema.json`.
7. Do not implement production migrations or payment actions before the audit gate passes.

## Hard rules

- Never reset or destructively rewrite the database.
- `artist_music` remains the canonical catalog.
- Do not create a second upload, playback, entitlement, marketplace, or rights stack.
- Rights allocations consume issued historical Rights Passport snapshots only.
- Use integer/rational money arithmetic; never JavaScript floating point for money.
- Preserve source statements and posted journals immutably.
- Do not pay disputed, suspended, unidentified, or non-ready interests.
- Keep valuation separate from accounting and legal rights.
- Do not create investment, exchange, brokerage, custody, or money-transmission functionality without documented counsel and regulated partner approval.
- No open secondary market in Phase 3.
- Keep all new work feature flagged and rollbackable.
- Use route handlers for music/financial APIs, colocated Zod, `requireApiUser`, and `jsonError`.
- Use Supabase RLS on every exposed table; never use user-editable metadata for authorization.
- Never expose service-role keys or provider secrets to clients.

## Execution behavior

- Work in dependency order.
- Update the JSON plan after every task or meaningful blocker.
- A task is not complete without file paths, migrations, tests, commands, and evidence.
- Run focused tests after each stage and full regressions before rollout.
- Stop financial activation when reconciliation, RLS, security, tax, counsel, or partner gates fail.
- Do not replace working features for visual consistency.

## Required outputs

- audit results;
- repository-specific execution plan;
- architecture decision records;
- additive migrations and validation queries;
- parser fixtures and normalization adapters;
- balanced ledger and allocation services;
- payout provider abstraction and verified webhook processing;
- artist/participant/admin UI;
- valuation model documentation, code, validation, and disclaimers;
- pilot reports;
- security and operational runbooks;
- completion report mapping every definition-of-done item to evidence.

## Current authoritative references

- DDEX Digital Sales Reporting Message Suite: https://kb.ddex.net/implementing-each-standard/digital-sales-reporting-message-suite-%28dsr%29/
- DDEX DSR Part 6 Royalty Reporting Profile: https://dsr6.ddex.net/digital-sales-report-message-suite%3A-part-6-royalty-reporting-profile/1-introduction/
- DDEX DSR Part 9 Financial Reporting to Record Companies: https://dsr9.ddex.net/digital-sales-report-message-suite%3A-part-9-financial-reporting-to-record-companies-profile/1-introduction/
- The MLC: https://www.themlc.com/
- SoundExchange: https://www.soundexchange.com/
- U.S. Copyright Office music modernization audits: https://www.copyright.gov/music-modernization/audits/
- SEC 2026 crypto-asset interpretation: https://www.sec.gov/rules-regulations/2026/03/s7-2026-09
- SEC statement on tokenized securities: https://www.sec.gov/newsroom/speeches-statements/corp-fin-statement-tokenized-securities-012826-statement-tokenized-securities
- SEC offering pathways: https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/offering-pathways
- FinCEN virtual-currency guidance: https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-persons-administering
- IRS Form 1099-DA instructions: https://www.irs.gov/instructions/i1099da
- IRS Form 1099-MISC: https://www.irs.gov/forms-pubs/about-form-1099-misc
- OFAC digital-currency compliance FAQ: https://ofac.treasury.gov/faqs/560
- IVS effective January 31, 2025, including IVS 210 Intangible Assets: https://ivsc.org/standards/
- Stripe Connect onboarding and payouts: https://docs.stripe.com/connect/onboarding and https://docs.stripe.com/connect/payouts-connected-accounts
