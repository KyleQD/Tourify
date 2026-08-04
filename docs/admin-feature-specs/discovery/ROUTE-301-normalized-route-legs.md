# ROUTE-301 — Normalized route legs

## Discovery

### What the AC requires

> Legs regenerate deterministically from stop ordering while preserving approved overrides/linked bookings; constraints prevent orphan legs.

Three concrete requirements:
1. **Deterministic regeneration** — same stop list → same leg set, every time
2. **Override/booking preservation** — approved overrides (`override_approved_by IS NOT NULL`) and `transport_booking_id` survive regeneration
3. **Orphan prevention** — removing a stop removes its legs (FK CASCADE); duplicate ordinals in the stop list are rejected before leg generation

### Existing state

- `tour_stops` + `tour_versions` exist (PLAN-201 migration `20260720194500_*`)
- `tour_stop_holds` exists (PLAN-205 migration `20260720195000_*`)
- No `tour_route_legs` table existed — this is greenfield

### Design decisions

**Schema** (`tour_route_legs`):
- FK `from_stop_id → tour_stops(id) ON DELETE CASCADE` — removing a stop deletes its legs (orphan prevention at DB level)
- FK `to_stop_id → tour_stops(id) ON DELETE CASCADE` — same
- UNIQUE `(tour_version_id, from_stop_id, to_stop_id)` — one leg per pair per version
- CHECK `to_ordinal > from_ordinal` — prevents inverted/self-referential legs
- Separate columns for `override_*` fields + `override_approved_by` (rather than a JSONB blob) to allow index-based override queries
- `transport_booking_id` nullable column — bridge for ROUTE-309 / travel module

**Pure helper** (`tour-route-legs.ts`):
- `generateRouteLegPairs` — sorts by ordinal, deduplicates (throws on conflict), emits N-1 pairs
- `mergeRouteLegSet` — preserves existing id, override (if `approvedBy` non-null), booking
- `detectOrphanLegs` — pre-persist guard (DB FK cascade is authoritative)
- `applyRouteLegOverride` / `clearRouteLegOverride` — override lifecycle
- `resolveEffectiveLegValues` — approved override > provider > none

**Service** (`tour-route-legs.service.ts`):
- `regenerateRouteLegsByVersion` — loads active stops, loads existing legs, generates pairs, merges, detects orphans, deletes stale, upserts merged
- `loadRouteLegsByVersion` — table-missing-safe read

### Files

- `lib/admin/tour-route-legs.ts` — pure helpers (267 lines)
- `lib/admin/tour-route-legs.service.ts` — server service (220 lines)
- `supabase/migrations/20260720250000_tour_route_legs_route301.sql` — additive schema
- `__tests__/admin/tour-route-legs.test.ts` — 28 cases across 8 describe groups

### Verification

```
✓ 28/28 tests passed
```
