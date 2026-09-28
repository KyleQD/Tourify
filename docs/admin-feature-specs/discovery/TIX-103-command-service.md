# TIX-103 — Canonical ticketing command service

**Date:** 2026-07-20  
**Spec:** `09_Ticketing_Admissions_and_Guest_Lists.md`

## Acceptance criteria

Per-command schemas, capability, parent state, idempotency, inventory transaction, reason, audit, and typed errors are mandatory.

## What shipped

### Schemas

`lib/admin/ticketing-command-schemas.ts`

- Create/update/delete ticket types, campaigns, promo codes, referrals
- `upsert_ticketing_config`, `reserve_inventory`, `release_inventory`, `finalize_inventory`, `refund_sale`
- Reason required for inventory, refund, delete, config
- Per-action capability map (`ticketing.manage` / `ticketing.refund`)

### Service

`lib/admin/ticketing-command.service.ts` — `executeTicketingCommand`

- Capability check via acting admin capabilities
- Parent event via `assertOrgEntityReferences`
- Inventory via `reserve` / `release` / `finalize` RPCs (typed `inventory_transaction_failed`)
- `logAuditEvent` on mutations
- `TicketingCommandError` typed codes/status
- `refund_sale` validates parent/state/reason and audits intent; Stripe/service-role execution remains `/api/admin/ticketing/refund` (SEC-109)

### HTTP

- Canonical: `POST /api/admin/ticketing/commands` (`withOrgCommand`, Idempotency-Key required)
- Compat: enhanced POST/PATCH/DELETE → command service
- Refund route: reason now required (min 3)

### Registry

`/api/admin/ticketing/commands` registered; refund capability `ticketing.refund`.

## Follow-ups

- `TIX-104` feature-flag Admin read model / mismatch dashboard
- Fold Stripe refund execution into command service behind service-role job (optional)
