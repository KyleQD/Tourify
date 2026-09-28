# TIX-102 — Harden foundation ticketing RLS/functions

**Date:** 2026-07-20  
**Spec:** `09_Ticketing_Admissions_and_Guest_Lists.md`

## Acceptance criteria

Event/org/grant checks cover config, inventory, customer/order protected data, ticket, credential, transfer, check-in, allocation, reservation, webhook, and analytics records.

## What shipped

### Migration

`20260720181000_tix102_harden_foundation_rls.sql`

- `can_ticketing(uid, oid, perm)` — membership + `has_perm` (mirrors `can_finance`)
- `can_ticketing_on_event(event_id, perm)` — resolves `events_v2.org_id`
- **`has_event_ticketing_grant` fixed** — grant row only (no longer `OR is_event_v2_org_member`)
- Replaced membership `*_all` / foundation policies with `tix102_*` capability + grant policies
- `reserve_ticket_inventory` requires manage/view, box-office/manage grants, or self-checkout (`created_by = auth.uid()`)
- Webhook table remains deny-for-authenticated
- `admin_verify_tix102_foundation_rls()` — must return zero rows after apply

### Customer/order

`ticket_sales` already capability-gated in `20260719230353_admin_ticketing_security.sql` (buyer + `ticketing.*`); listed in the contract as covered without re-blanket.

### Contract + tests

- `lib/admin/tix102-foundation-rls-contract.ts`
- `__tests__/admin/tix102-foundation-rls-contract.test.ts`

## Follow-ups

- `TIX-103` canonical ticketing command service (schemas, capability, idempotency, inventory txn, audit)
- Apply migration via additive push (never `db reset`)
