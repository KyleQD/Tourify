# PUB-102 — Publication schema

**Date:** 2026-07-20  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Acceptance criteria

Snapshot, section, audience, recipient, delivery, acknowledgement, share token, access log, and outbox relations have org-scoped RLS.

## Tables

| Table | Role |
|---|---|
| `admin_publication_snapshots` | Immutable publication version (checksum, projection, lifecycle) |
| `admin_publication_sections` | Section payloads + audience class (PUB-002) |
| `admin_publication_audiences` | Snapshotted audience definition + counts |
| `admin_publication_recipients` | Evaluated recipients (or exclusions) |
| `admin_publication_deliveries` | Per recipient×channel state machine; optional `outbox_id` |
| `admin_publication_acknowledgements` | Versioned ack evidence |
| `admin_publication_share_tokens` | Hashed tokens, scope/expiry/passcode/max-use |
| `admin_publication_access_logs` | Append-oriented access audit |
| `admin_publication_outbox` | Existing PUB-101; `snapshot_id` FK added |
| `admin_domain_transactions` | Existing PUB-101 domain markers |

## RLS

- Helper: `can_publication(uid, oid, perm)` → membership + `has_perm`.
- Select: `tour.view` or `tour.manage`.
- Insert/update (mutable tables): `tour.manage`.
- Acknowledgements insert also allowed for `tour.view` (recipient ack path prep).
- Access logs: select + insert for view/manage; no authenticated update/delete.
- `service_role` full access for workers.

## TS contract

`lib/admin/publication-schema.ts` — enum allowlists + classification elevation used by later publish/render tasks.
