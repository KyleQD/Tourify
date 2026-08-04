# VEND-102 — Vendor identity / deduplication ADR

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `11_Vendors_Procurement_and_Contracts.md`  
**Related:** VEND-101 (tour access), VEND-103 (protected fields), VEND-501 (master UI)

## Decision

Organization-scoped **vendor master** is the canonical commercial identity. Tour-scoped `tour_vendors` rows are engagements that preferably link to a master vendor (`vendor_id`) but may remain engagement-local until linked.

### Identity fields (required vs optional)

| Field | Required | Notes |
|-------|----------|-------|
| `legal_name` | Yes | Official / contracting name; unique per org after normalize |
| `display_name` | Yes | UI label; defaults to legal_name |
| `normalized_legal_name` | System | Lowercase, stripped punctuation/legal suffixes for matching |
| `category` | Yes | Controlled vocabulary (production, catering, transport, venue, soft_goods, other) |
| `status` | Yes | `prospective` → `invited` → `evaluating` → `approved` / `preferred` / `restricted` / `inactive` |
| Primary location | Optional | `city`, `region`, `country` (ISO-ish free text until geo service) |
| Contacts | Optional | Named contacts; personal PII projected per VEND-103 |
| `external_accounting_id` | Optional | ERP / accounting counterparty key; unique per org when set |
| `tax_id_last4` / payment refs | Protected | Stored only under VEND-103 capabilities — not on operational projections |

### Duplicate detection

Candidates are **same `org_id`** only (never cross-org).

Match signals (any strong signal → candidate; score ≥ 80 → auto-block create without merge/ack):

| Signal | Weight |
|--------|--------|
| Exact `normalized_legal_name` | 100 |
| Exact `external_accounting_id` (when both set) | 100 |
| Normalized legal name + same country | 90 |
| Display-name normalize match + same city | 70 |
| Shared primary contact email | 85 |
| Shared primary contact phone (E.164-ish digits) | 75 |

Soft matches (40–79) surface as **possible duplicates** in create/edit UX; hard matches (≥80) require explicit “acknowledge distinct” reason or merge.

### Merge rules

1. Operator chooses **survivor** (kept master id) and **absorbed** vendor(s).
2. Absorbed row is soft-retired (`status = inactive`, `merged_into_id = survivor`).
3. Absorbed **legal/display names** and prior aliases append to `vendor_aliases` (retained forever for search/history).
4. Engagements (`tour_vendors`, future engagements/POs) re-point `vendor_id` → survivor; no hard-delete of absorbed id.
5. Protected tax/payment fields: survivor wins unless survivor empty and absorbed has value (copy once, audit).
6. Merge requires `vendor.manage` + reason; audited with before/after id sets.

### Alias / history retention

- `vendor_aliases`: `(org_id, vendor_id, alias_normalized, alias_display, source)`  
  Sources: `legal_name`, `display_name`, `merge`, `manual`.
- Search (VEND-501) matches legal/display **and** aliases.
- Aliases are never deleted on merge; inactive vendors remain readable to `vendor.view` for history.

### Relation to tour vendors

- `tour_vendors.vendor_id` (nullable FK) links engagement → master.
- Unlinked tour vendors remain valid; finance vendor-name search (FIN-104) continues to use engagement + tour vendor names until master cutover.
- Creating a tour vendor with a new name may propose master create/link (VEND-501).

## Consequences

- Schema foundation: `vendors` + `vendor_aliases` + optional `tour_vendors.vendor_id` (this task).
- TS contract: `lib/admin/vendor-identity.ts` encodes normalize/score/merge predicates for tests and future APIs.
- `VEND-103` defines field projection/capabilities for tax/payment/contacts.
- `VEND-501` builds master search/create/merge UI against these rules.
