# ADR-008 — Financial accounting boundary

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `10_Finance_Budgets_Expenses_and_Settlements.md`  
**Aligns with:** `FIN-001`

## Context

Admin finance is an operational subledger for tours/events, not a full ERP. Approval and settlement rules must be explicit.

## Decision

1. **Scope:** budgets, commitments, POs, expenses, cash advances, per diems, invoices match, show settlements, and tour profitability inside Tourify.
2. **Not in scope:** general ledger chart of accounts, tax filing, payroll tax remittance, bank reconciliation as system of record.
3. **Approval thresholds:** org-configurable; defaults — expenses ≥ org threshold require `finance.approve`; payments require `finance.pay`; an owner may override a threshold only with an explicit reason and dedicated audit event.
4. **Settlements:** deal templates produce statements; approval/signoff required before tour `settled` lifecycle (`TOUR-501`).
5. **External accounting:** export adapter only (`FIN-602`); Tourify remains operational source until export acknowledged.
6. **Currencies:** see ADR-010; store minor units + currency code; FX snapshots on posting.
7. **Separation of duties:** where an organization rule requires separation, a submitter cannot approve the same record and an approver cannot execute its payment. Ownership does not silently bypass this rule; emergency override must be an explicit organization policy, reasoned, and separately audited.
8. **Immutability:** approved versions, posted transactions, and finalized/paid settlements are not edited in place. Corrections create linked versions, adjustments, or opposite-sign reversal entries.
9. **Authoritative records:** versioned budget headers/lines own planned amounts; commitments and purchase orders own authorized spend; invoices/expenses/cash/per-diem records own claims; append-only postings own recognized operational actuals; versioned show settlements own deal calculations/signoff. Dashboard and profitability totals are governed read models, never independent editable balances.
10. **Lifecycle/posting:** editable records begin `draft`, may move through `submitted` and `approved`/`rejected`, and become financial evidence only through an idempotent `posted` command. Payment records move from authorized to processing/paid/failed/reversed through provider-reconciled commands. A void is allowed only before posting; after posting, correction is an adjustment/reversal linked to the original.
11. **Currency/rounding:** every amount stores an uppercase ISO currency and integer minor units using the currency's supported exponent. Conversion stores rate, source, as-of time, base/quote currency, and rounded reporting amount. Missing/stale FX makes the converted view unavailable and never silently substitutes zero, 1:1, or a two-decimal unknown-currency default.
12. **Retention:** budget approvals, commitments, POs, invoices, expenses, cash/per-diem evidence, postings, payments, settlements, FX snapshots, exports, corrections, and audit events follow ADR-009/legal hold. Archive does not erase financial evidence.
13. **External boundary:** ERP/accounting exports are durable, idempotent packages with schema version, source record/version IDs, checksum, provider reference, state and error evidence. Provider acknowledgement does not transfer internal authorization authority or permit source-history deletion; inbound reconciliation may append a mapped status/evidence record only.

## Consequences

- RLS and command hardening (`FIN-10x`) precede commercial UI.
- Reversals are append-only compensating entries (`FIN-105`), not silent deletes.
