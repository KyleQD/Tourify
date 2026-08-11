# TIX-001 — Canonical ticketing ADR

**Status:** Accepted  
**Date:** 2026-07-20  
**Parent:** [ADR-007](../../architecture/adr/ADR-007-ticketing.md)  
**Spec:** `09_Ticketing_Admissions_and_Guest_Lists.md`

## Decision

The July 2026 event-ticketing foundation is the sole Admin write destination. Inventory is a transactional, append-only and balanced movement ledger; capacity must be explicitly sourced and is never fabricated. Imported provider state remains distinct, signed/idempotent, freshness-labeled, quarantined when unmatched, and reconciled before it affects availability or settlement. Refund/void/transfer/comp/override commands are capability-gated, reasoned, audited, and represented by linked movements or reversals.

Legacy ticket types, sales, campaigns, promos, routes, and reports become migration/read-only after permissive RLS removal. A persisted organization cutover decision requires approved reconciliation evidence; missing/denied/stale sources block it. Historical ticketing, payment-reference, credential, admission, provider, refund, settlement, and audit evidence follows ADR-009 retention and is not deleted by cutover.

## Consequences

`TIX-002` inventories consumers; `TIX-101`+ harden and migrate.
