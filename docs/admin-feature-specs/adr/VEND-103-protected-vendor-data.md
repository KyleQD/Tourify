# VEND-103 — Protected vendor-data policy

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `11_Vendors_Procurement_and_Contracts.md`  
**Depends on:** VEND-102 identity master

## Decision

### Capability layers

| Capability | Sees |
|------------|------|
| `vendor.view` | Operational identity only: legal/display name, category, status, location (city/region/country), external accounting id **presence** (not value if sensitive-gated — see below), engagement linkage |
| `vendor.manage` | Operational write + contact **role/title**; still not full tax/payment unless also sensitive |
| `vendor.sensitive` | Tax/payment refs, personal contact email/phone/name, compliance document paths and notes |

`vendor.sensitive` is granted to **owner**, **admin**, and **finance** role defaults. Tour managers / production / viewers do **not** receive it by default (least privilege for ops).

### Protected field classes

1. **Personal contacts** — `primary_contact_name`, `primary_contact_email`, `primary_contact_phone` (and tour engagement contact mirrors).
2. **Tax / payment** — `tax_id_last4`, `payment_account_last4`, `payment_method`, `w9_on_file`.
3. **Compliance documents** — `vendor_documents` rows (file path, checksum, verification notes); metadata title/type/expiry may show to `vendor.view` with path redacted.

Operational projections null protected values and may set `__redacted: true` markers for UI.

### Retention

| Class | Retention |
|-------|-----------|
| Active vendor master | While org active + 7 years after `inactive` (commercial record) |
| Merged/absorbed aliases | Indefinite (search/history); inactive master retained |
| Tax/payment fields | 7 years after vendor inactive or merge absorption |
| Compliance documents | Max(expiry + 2 years, 7 years after inactive); legal hold blocks purge |
| Personal contacts on inactive vendors | Soft-clear after 2 years inactive unless `vendor.sensitive` retention hold flag |

Purge is a future ops job (Phase 6); this task defines the policy constants and storage columns only.

### Enforcement

- API/read models use `projectVendor*` helpers (never trust UI).
- RLS: `vendors` readable with `vendor.view|manage`; `vendor_documents` select requires `vendor.sensitive` **or** manage for full row — view-only gets no document table access (metadata via projected RPC later).
- Writes of protected fields require `vendor.sensitive`.

## Consequences

`VEND-501`/`VEND-502` consume projection + document table; CONT document security aligns with same least-data pattern.
