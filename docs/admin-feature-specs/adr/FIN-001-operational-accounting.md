# FIN-001 — Operational accounting ADR

**Status:** Accepted  
**Date:** 2026-07-20  
**Parent:** [ADR-008](../../architecture/adr/ADR-008-financial-accounting-boundary.md)  
**Spec:** `10_Finance_Budgets_Expenses_and_Settlements.md`

## Decision

Tourify holds an operational subledger for versioned budgets, commitments/POs, invoices/expenses, cash/per diem, append-only postings/payments, versioned show settlements, and governed profitability. Draft/submitted/approved/rejected records become financial evidence only through idempotent posting; posted/paid/final records use linked adjustment or reversal rather than mutation.

Organization thresholds and separation of duties govern approval/payment with explicit audited override policy. ADR-010 minor-unit, currency, FX-evidence and rounding rules apply to every posting; ADR-009 retention/legal hold preserves approvals and corrections. External accounting remains a durable export/reconciliation boundary and does not become Tourify's authorization source.

## Consequences

`FIN-002` inventories policies; `FIN-101`+ harden before commercial UI.
