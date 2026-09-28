# ADR-002 — Organization ownership invariants

**Status:** Accepted  
**Date:** 2026-07-20  
**Spec:** `docs/admin-feature-specs/00_Master_Roadmap.md`, `01_Platform_Tenancy_RBAC_and_Audit.md`

## Context

Tours and events are increasingly organization-scoped (`org_id`), while older paths still use owner/user scoping. Creator/master invariants must be explicit so capability catalogs and transfers cannot orphan records or escalate privilege.

## Decision

1. **Every tour and every operational event (`events_v2`) must have a non-null `org_id`** belonging to an active organization. Personal/owner-only tours are migration debt, not a supported write path for Admin.
2. **Organization creator/master:** the creating user (or designated `owner` membership) is the master principal. Master can transfer ownership once; transfer requires the current owner capability + acceptance by the new owner membership; there is always exactly one owner role assignment.
3. **`org_members.role = owner`** is the invariant role. Custom roles cannot grant platform scope or override owner transfer rules.
4. **Child records** (stops, logistics, tickets, finance) inherit organization through parent `org_id` (denormalized preferred). They cannot change `org_id` independently of the parent tour/event.
5. **Venue collaboration** does not transfer ownership: venues receive delegated grants (`entity_grants` / SEC-204), not org ownership of the tour.

## Consequences

- Migrations must backfill/quarantine tours/events without resolvable `org_id` (SEC-105).
- Owner-only API paths delegate to org/entity authorization (SEC-201).
- Archive/delete policies (ADR-009) preserve ownership history in audit events.
