# FIN-104 — Remove raw UUID entry UX

**Date:** 2026-07-20  
**Spec:** `10_Finance_Budgets_Expenses_and_Settlements.md`

## Acceptance criteria

Users select authorized tour/event/vendor/PO/category from scoped search; server still validates relation and state.

## What shipped

### Search API

`GET /api/admin/finances/scope-search` (`finance.view`)

- Kinds: `tour`, `event`, `vendor`, `category`, `po`
- Tours/events filtered by acting `org_id` (+ optional `ilike` query)
- Vendors from org `financial_transactions.vendor_name` + `tour_vendors` on org tours
- Categories from canonical finance category lists
- `po` returns `unavailable` until procurement (`FIN-506`) — no fake POs

### UI

`FinanceScopePicker` / `FinanceParentScopePicker` on admin Finances:

- Budget create: event **or** tour search (no UUID fields)
- Settlement create: required event/tour search (+ tour_id supported)
- Transaction create/edit: vendor search; optional event/tour scope on create
- Categories remain select from allowed enums (same allowlist as search)

### Server validation

Unchanged write path (`FIN-103`): `assertOrgEntityReferences` + command schemas reject unauthorized parents.

## Follow-ups

- `FIN-105` audit/reversal rules for posted records
- Wire PO hits when `FIN-506` lands
