# PUB-001 — Publication ADR

**Status:** Accepted  
**Date:** 2026-07-20  
**Parent:** [ADR-005](../../architecture/adr/ADR-005-publication.md)  
**Spec:** `04_Publication_Sharing_and_Work_Mode.md`

## Decision

Locks ADR-005 for implementation: snapshot immutability, publication types (tour book, itinerary, advance, day sheet, run of show, schedule, site map, contact sheet, travel brief, change notice, emergency), readiness + authorized overrides, audience evaluation at send time, acknowledgement, corrections via new version, retraction without audit erase, retention per ADR-009.

## Consequences

`PUB-101`+ implement schema, outbox, and commands against this contract.
