# VEND-102 — Define vendor identity / deduplication

**Date:** 2026-07-20  
**Spec:** `11_Vendors_Procurement_and_Contracts.md`

## Acceptance criteria

Legal/display name, locations, contacts, category, external accounting ID, duplicate detection, merge and retained alias/history rules are approved.

## What shipped

### ADR

`docs/admin-feature-specs/adr/VEND-102-vendor-identity-deduplication.md` — Accepted rules for identity fields, scoring thresholds, merge, aliases, and tour engagement link.

### Executable contract

`lib/admin/vendor-identity.ts`

- Normalize legal/display names (suffix/punctuation strip)
- Zod identity input schema
- Duplicate scoring (hard ≥80 / soft ≥40) + acknowledge-distinct gate
- Merge plan with retained aliases (org-scoped)

### Schema (additive)

Migration `20260720185000_vend102_vendor_identity_master.sql`

- `vendors` org master + unique active normalized legal name / accounting id
- `vendor_aliases` history
- `tour_vendors.vendor_id` nullable FK
- `can_vendor` + RLS (`vendor.view` / `vendor.manage`)
- `admin_verify_vendor_identity_schema()`

### Tests

`__tests__/admin/vendor-identity.test.ts`

## Follow-ups

- `VEND-103` protected field projection (tax/payment/personal contacts)
- `VEND-501` master search/create/merge UI
