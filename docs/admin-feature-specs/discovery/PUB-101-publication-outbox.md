# PUB-101 — Publication outbox infrastructure

**Date:** 2026-07-20  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Acceptance criteria

Domain transaction and outbox write are atomic; workers are idempotent; retry/backoff/dead letter/replay and correlation are implemented.

## What shipped

| Piece | Location |
|---|---|
| Tables | `admin_domain_transactions`, `admin_publication_outbox` |
| Atomic commit RPC | `admin_commit_domain_with_outbox` (idempotent on `(org_id, idempotency_key)`) |
| Claim / deliver / fail / replay RPCs | `admin_publication_outbox_*` (service_role) |
| Pure helpers | `lib/admin/publication-outbox.ts` |
| Service | `lib/admin/publication-outbox.service.ts` |
| Cron worker | `GET/POST /api/cron/admin-publication-outbox` |
| Admin enqueue/list | `GET/POST /api/admin/publication/outbox` |
| Admin replay | `POST /api/admin/publication/outbox/replay` |

## Semantics

- **Atomicity:** domain transaction row + outbox row inserted in one Postgres function.
- **Idempotency:** duplicate enqueue returns `already_existed=true` with original ids; handlers must key on `idempotency_key`.
- **Backoff:** `5 * 2^(attempts-1)` seconds, capped at 3600s (SQL + TS helpers aligned).
- **Dead letter:** `fatal` error class or `attempts >= max_attempts` → `dead`.
- **Replay:** dead → `pending` with optional new correlation id.
- **Correlation:** required on enqueue; stored on both domain tx and outbox; echoed in API responses.

## Follow-ups

- `PUB-102` adds publication snapshot/audience/delivery schema that will enqueue through this outbox.
- `PUB-204` uses `commitDomainWithOutbox` inside the transactional publish command.
