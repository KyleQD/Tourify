# ADR-005 — Publication model

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `04_Publication_Sharing_and_Work_Mode.md`  
**Aligns with:** `PUB-001`

## Context

Current publish can be a status flip plus best-effort fanout. Sharing often copies private Admin URLs. The program requires durable, versioned distribution.

## Decision

1. **Published means:** an immutable **publication snapshot** was committed with audience, delivery outbox rows, audit, and (when applicable) lifecycle transition — not merely a status string.
2. Snapshots record org, tour/event, source plan version, type, sections, checksum, projection policy, publisher, and superseded/retracted state.
3. **Audiences** are evaluated at send time and snapshotted (roles, departments, assignments, named users, vendors, secure links).
4. **Acknowledgement** is optional per publication/change notice; when required, stores version + timestamp; reminders/escalations are deduplicated.
5. **Retraction/supersede** invalidates access immediately and notifies recipients; does not erase audit history or guarantee deletion of already-downloaded offline packages.
6. **Corrections** publish a new version + structured change notice; never mutate the prior snapshot payload.
7. Private Admin URL copy is **not** a share mechanism (`PUB-208`).

## Consequences

- `PUB-101`–`PUB-204` are required before day sheets, schedules, itineraries, and Work Mode delivery claim success.
- Status-only publish paths are compatibility debt until `PUB-604`.
