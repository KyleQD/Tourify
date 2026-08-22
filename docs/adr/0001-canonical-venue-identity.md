# ADR 0001 — Canonical Venue Identity & Migration Plan

- **Status:** Accepted (program-level decision, Tourify Venue handoff non-negotiables)
- **Date:** 2026-08-22
- **Tasks:** VEN-001 (primary), inputs to VEN-002, VEN-004, VEN-087, VEN-088
- **Supersedes:** implicit "settings JSON carries identity" behavior

## 1. Context

Three identity surfaces exist for a Venue:

| Surface | Table | Role today |
|---|---|---|
| Public/account identity | `venue_profiles` | The Venue **account**: owner (`user_id`, `main_profile_id`), branding, slugs, settings, all Phase-A domain tables (`venue_booking_requests`, `venue_documents`, `venue_team_members`, analytics, availability, pricing — FKs via `20250814123000_venue_core.sql` and 4 further migration files) |
| Operational venue mirror | `venues_v2` | Referenced by operational engine: `events_v2.venue_id`, `calendars.venue_id` (both `on delete set null`, `20250816133000_event_core.sql`) and admin staffing joins |
| Operational organization | `organizations` | Org container for `calendars.org_id`, `holds`, `audit_log` |

**Current linkage is broken/dangerous:**
1. `events.venue_id → venue_profiles.id` while `events_v2.venue_id → venues_v2.id` — two incompatible ID domains for "the same" concept (VEN-002).
2. The profile↔ops↔org mapping lives in `venue_profiles.settings` JSON (`venues_id`, `venues_v2_id`, `operational_org_id`), written at runtime by `ensureVenueOperationalContext` with **no FK integrity**, **no uniqueness**, and **first-caller-becomes-org-owner escalation** (VEN-087).
3. `auth.uid()` identifies the human actor; nothing above distinguishes actor from acting Venue account (VEN-004 contract requirement).

## 2. Decision

**D1 — Canonical ID:** `venue_profiles.id` is *the* canonical Venue identifier at every service boundary and public contract. Legacy IDs (`venues_v2.id`, `organizations.id`) are translated only through an explicit relational adapter — never guessed, never JSON-scraped, in new code.

**D2 — Relational bridge:** a dedicated mapping table owns the identity triangle:

```
venue_identity_bridges
  venue_profile_id   uuid PK → venue_profiles(id)      -- canonical side
  venues_v2_id       uuid UNIQUE → venues_v2(id)        -- nullable until provisioned
  operational_org_id uuid UNIQUE → organizations(id)    -- nullable until provisioned
  provenance         text ('backfill' | 'runtime' | 'manual')
  created_at / updated_at
```

UNIQUE constraints guarantee 1:1:1 (no shadow duplicates). FK integrity makes orphaning impossible. Replaces settings JSON as the source of truth; settings keys become derived cache during a bounded dual-read window.

**D3 — Server-owned resolution:** only server code resolves the bridge (service client). Browser DTOs receive resolved IDs they need; they never supply authoritative mappings.

**D4 — Actor vs acting account:** every resolver return must carry both `actorUserId` (human) and `venueProfileId` (acting account) plus role/permission source. `auth.uid()` alone never grants Venue authority (enforced fully by RBAC wave, declared here as contract).

**D5 — Provisioning de-escalation (input to VEN-087):** runtime provisioning may create mirrors/orgs, but org membership role must derive from verified Venue authority — first caller is not granted `owner` by side effect.

## 3. FK exception inventory (documented per acceptance gate)

| Relation | Domain | Disposition |
|---|---|---|
| `events.venue_id` → `venue_profiles.id` | legacy events (20240416000000_create_events.sql) | Read-only legacy; VEN-002 converges reads onto `events_v2`; no new writers |
| `events_v2.venue_id` → `venues_v2.id` | event_core | Kept; becomes reachable via bridge translation layer (VEN-089 API) |
| `calendars.venue_id` → `venues_v2.id` | event_core | Same as above |
| `venue_booking_requests`, `venue_documents`, `venue_team_members`, `venue_analytics*`, `venue_availability`, pricing/recurring tables → `venue_profiles.id` | venue_core + recurring | Already canonical; unchanged |
| `employment_assignments.employer_entity_*` | polymorphic | Canonical entity = `('venue', venue_profiles.id)`; enforced by workforce wave |
| settings JSON `venues_v2_id` / `operational_org_id` | venue_profiles.settings | Backfilled into bridge; dual-read then deprecated (VEN-088) |

## 4. Migration plan (additive, per doc-13 method)

Implemented now in `20260823010000_venue_identity_bridge.sql`:

1. ✅ Create `venue_identity_bridges` (nullable UNIQUE FKs, provenance, timestamps).
2. ✅ Idempotent backfill from `venue_profiles.settings` JSON (only where valid UUIDs present).
3. ✅ Enable RLS with owner-read/service-write policies (deny-by-default).
4. ✅ Reconciliation audit view `venue_identity_bridge_audit` (source counts, mapped, ambiguous, failed).
5. Dual-read: resolvers prefer bridge row, fall back to settings JSON (**this commit**, `lib/venue/identity-bridge.ts`).
6. Single write path: runtime provisioning writes bridge + settings cache together (this commit); later commits stop reading settings.
7. Require NOT NULL canonical refs only after zero unresolved legacy rows (later migration, gated on audit view).
8. Retire JSON keys + old-column readers in retirement wave (VEN-146/VEN-308) with rollback notes.

Rollback: drop-table-safe (no dependent objects besides audit view); resolvers fall back to settings JSON automatically when bridge absent.

## 5. Consequences

- Positive: FK-enforced 1:1:1 identity; escalation-free provisioning path; unblocks VEN-002 convergence, VEN-004 server context, VEN-089 event API translation, workforce/equipment/site-map entity scoping.
- Cost: one extra join per resolution (indexed PK lookups); bounded dual-read window adds temporary write amplification (two small writes during provisioning only).
- Risk: drift between settings JSON and bridge during window → mitigated by write-through + audit view freshness check.
