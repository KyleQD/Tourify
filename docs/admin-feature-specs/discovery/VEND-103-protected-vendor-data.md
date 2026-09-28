# VEND-103 — Protected vendor-data policy

**Date:** 2026-07-20  
**Spec:** `11_Vendors_Procurement_and_Contracts.md`

## Acceptance criteria

Tax/payment/compliance documents and personal contacts have explicit fields/capabilities/retention; operational users receive least data.

## What shipped

### ADR

`docs/admin-feature-specs/adr/VEND-103-protected-vendor-data.md` — capability layers, field classes, retention windows.

### Capability

- `vendor.sensitive` added to `ADMIN_CAPABILITIES`
- Role defaults: owner/admin (all) + finance; not tour_manager/viewer
- DB: `org_role_permissions` append for owner/admin/finance

### Schema

Migration `20260720186000_vend103_protected_vendor_data.sql`

- Protected columns on `vendors` (tax/payment/compliance notes)
- `vendor_documents` with RLS requiring `vendor.sensitive`
- Verify RPC `admin_verify_vendor_protected_data`

### Projection

`lib/admin/vendor-field-projection.ts` — master / tour engagement / document projectors + retention constants.

Wired on `GET/POST/PATCH /api/admin/tours/vendors`.

### Tests

`__tests__/admin/vendor-field-projection.test.ts`

## Follow-ups

- `CONT-101` already accepted; next inventory item after VEND-103
- `VEND-501` master UI using projection
