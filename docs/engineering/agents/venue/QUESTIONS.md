# Venue domain questions

Generated: 2026-09-09 from VENUE-001 read-only audit.

Prioritized P1 → P3. Each question ties to one or more gaps from GAPS.md.

---

## P1 — Must answer before security/scale work proceeds

### Q1. Apply the staged venues/RBAC RLS baseline?
**Gap refs:** GAPS #1, #2
**Context:** `20260823210100_venues_rbac_rls_baseline.sql` is staged but not applied. It enables RLS on venues + RBAC family, adds scoped policies, and replaces `has_entity_permission` with a SECURITY DEFINER version to prevent policy recursion. WS-1.1 in the backlog requires this through the gated pipeline.
**Build vs fix:** Fix — this is a security hardening prerequisite for all venue authorization work.
**Sequencing:** Must land before any venue authorization standardization (Q2).

### Q2. Standardize venue API authorization to one pattern?
**Gap refs:** GAPS #2, #3, #4, #10
**Context:** Venue API routes currently use ~8 different authorization idioms (entity permission RPCs, session/auth checks, ownership guards, etc.). The platform-level WS-1.7 sweep found zero unguarded mutations but wants ONE standard wrapper. Venue needs the same treatment.
**Build vs fix:** Fix — adopt a shared `assertVenueAccess` or equivalent wrapper across all `app/api/venue/**` and `app/api/venues/**` routes.
**Sequencing:** Depends on Q1 (RLS baseline landing). Can scope a design pass in parallel.

### Q3. What is the venue booking lifecycle state machine?
**Gap refs:** GAPS #9, #10, #11
**Context:** Booking lifecycle tables and RPCs exist (`venue_booking_lifecycle_history`, `transition_venue_booking_lifecycle`, `venue_reservations`, `venue_booking_slots`), but no formal state machine documentation or test evidence was found. The legacy build noted "manual SQL" and "feature gate" as open items.
**Build vs fix:** Build — document the intended states (e.g., requested → approved → confirmed → completed → archived), the transition rules, and write regression tests for each transition.
**Sequencing:** Can proceed in parallel with Q1/Q2; booking tests will verify both lifecycle correctness and authorization.

---

## P2 — Should answer before public scale / product completion

### Q4. Consolidate venue components into one tree?
**Gap refs:** GAPS #12, #13, #14, #15
**Context:** Venue components exist in two locations: `app/venue/components/` (95+ files, canonical) and `components/venue/` (shared). Legacy work flagged `cmp-venue-tree-dupe` as "deduplicate / pick canonical." Additionally, 29 redirect/debt route files and legacy sidebars still exist.
**Build vs fix:** Fix — consolidate `components/venue/**` imports into `app/venue/components/**` where domain-bound, delete dead redirect pages and legacy sidebars.
**Sequencing:** Low risk, can proceed anytime. Preferrable after Q2 to avoid merge conflicts with auth changes.

### Q5. What testing strategy and coverage targets apply to venue?
**Gap refs:** GAPS #5, #6, #7, #8
**Context:** No `__tests__/venue/` directory exists. No venue-specific API, RLS, or component tests were found. The legacy build had 16 audit acceptance modules but external gates (SQL, persona, accessibility, performance) remain open.
**Build vs fix:** Build — define a venue test plan covering: (a) API contract tests for all `/api/venue/*` routes, (b) RLS tests for venue tables, (c) booking lifecycle state machine tests, (d) component smoke tests for key surfaces (dashboard, public profile, booking form).
**Sequencing:** Can proceed in parallel with all other questions. Test skeleton should land early to catch regressions from Q1/Q2 work.

### Q6. Adopt React Query on venue dashboards?
**Gap refs:** GAPS #16, #17, #18
**Context:** WS-3.1 backlog item. Venue dashboards are likely `'use client'`-saturated with direct Supabase calls. React Query is already installed but unused on venue surfaces.
**Build vs fix:** Fix — migrate venue dashboard data fetching to React Query hooks, reducing client-state complexity and enabling automatic cache/refetch.
**Sequencing:** After Q4 (component consolidation) to avoid double-migration.

### Q7. What venue API contract strategy to adopt?
**Gap refs:** GAPS #19, #20, #21
**Context:** WS-2.3 says "adopt `packages/api-contracts` for all new/edited routes." Venue routes have no Zod contracts. Additionally, venue search exists in two places (`/api/planning/venues/search` and `search_public_venues` RPC).
**Build vs fix:** Build — define Zod contracts for venue API payloads, collapse duplicate search paths.
**Sequencing:** After Q2 (authorization standardization) so contracts include auth headers/scopes.

### Q8. How should venue kit work end-to-end?
**Gap refs:** GAPS #25
**Context:** `venue_kit_settings` table, `GET /api/venues/[id]/venue-kit` route, and `/venue/kit` page all exist. No mutation evidence (POST/PUT) was detected. The kit appears to be a read-only display surface today.
**Build vs fix:** Build or drop — define what venue kit should contain (venue info package for artists/promoters?), whether it needs mutation endpoints, or whether it's a static read-only export.
**Sequencing:** Independent; can proceed anytime.

### Q9. How should public venue profiles handle caching?
**Gap refs:** GAPS #17
**Context:** WS-3.4 targets ISR/cache-headers for public `/venues/[slug]` profiles. Currently no caching strategy detected.
**Build vs fix:** Fix — add ISR with appropriate revalidation and auth-aware variant strategy.
**Sequencing:** After Q7 (contracts) so cache invalidation can hook into mutation contracts.

---

## P3 — Can address during scale / cleanup phase

### Q10. What mobile venue surfaces are needed?
**Gap refs:** GAPS #28
**Context:** Expo mobile app has zero venue-prefixed screens. The mobile app focuses on feed, events, music, messages, and profile.
**Build vs fix:** Build or drop — decide if venue operations belong on mobile (e.g., venue check-in, shift management) or if venue is web-only for operators.
**Sequencing:** After P2 questions; depends on product priority.

### Q11. What notification routing do venues need?
**Gap refs:** GAPS #26, #27
**Context:** `venue_workflow_subscriptions` table exists for notification routing. `GET/PATCH /api/venue/notification-routing` endpoint exists. But real-time delivery pipeline and subscription triggers not verified.
**Build vs fix:** Fix — verify end-to-end notification delivery for venue events (booking requests, shift assignments, event updates).
**Sequencing:** After Q3 (booking lifecycle) so notifications can fire on lifecycle transitions.

### Q12. Should venue identity bridge be consolidated with profile system?
**Gap refs:** GAPS #22, #23
**Context:** `venue_identity_bridges` exists for cross-account resolution. `venue_slug_history` tracks slug renames. Both add complexity. Whether they're needed depends on multi-account UX decisions.
**Build vs fix:** Fix or drop — verify if identity bridge is actively used or can be replaced by profile resolution.
**Sequencing:** Low priority; can proceed anytime after Q5 (testing to verify current usage).

### Q13. Add rate limiting to venue API routes?
**Gap refs:** GAPS #21
**Context:** Venue API routes don't show rate limiting in the permissions map. WS-1.3 targeted auth/money/upload surfaces; venue read routes may not need explicit rate limiting if RLS is tight.
**Build vs fix:** Fix — evaluate whether venue public read routes (`/api/venues`, `/api/venues/[id]`) need rate limiting for abuse resistance.
**Sequencing:** After Q1 (RLS baseline) since RLS may provide sufficient protection.

---

## Cross-domain blocking questions

| Question | Blocks who | Dependency |
|----------|-----------|------------|
| Q1 (RLS baseline) | venue, admin (venue admin routes share `has_entity_permission`) | Must land before venue auth standardization |
| Q2 (auth standardization) | venue, admin (admin venue CRUD routes) | Shared auth wrapper pattern |
| Q5 (test strategy) | venue, qa (test fixtures and CI coverage) | Venue test skeleton needed for qa regression |
| Q7 (API contracts) | venue, design-system (shared Zod patterns) | Contract pattern should be shared |
