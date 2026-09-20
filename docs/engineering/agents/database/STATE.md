# Database Agent State

Owner: Tourify database agent. Charter: `docs/engineering/agents/database/CHARTER.md`.

## Current durable facts (2026-09-10, DB-001 reconciliation)

### Status

- Area status: **partial**. The source chain, local schema baseline, canonical
  generated type path, and staged security/RLS evidence have advanced. Full
  production validation, RLS coverage, ticketing/events contracts, trigger
  inventory, and scale/erasure checks remain open.

### Migration and schema source of truth

- Only numbered SQL files directly in `supabase/migrations/` are active, per
  DB-003 and `supabase/migrations/README.md`. The current source contains 289
  files, ending at `20260910000001_get_active_organizer_account_for_org.sql`.
- Historical SQL remains in `supabase/migrations/archive/` (133), the
  pre-reconciliation archive (274), `supabase/migrations_backup/` (94), and 24
  root-level SQL files. These are evidence only, but `supabase/README.md` still
  documents manual copy/paste application.
- DB-003 proved 281 migrations on its local baseline; DB-007 proved 287/287
  after restoring the post-styles/account-follows family. The current 289-file
  source therefore has a two-file evidence delta and must not be described as
  fully live-reconciled until that delta is covered.
- The current static source maps report 422 migrations, 693 objects, 418 tables,
  259 functions, 13 views, 2 materialized views, 1 type, and 1,287 policies.
  These maps aggregate archived source and are not deployed-catalog proof.
- CP-051 in `docs/engineering/INDEX.md` forbids destructive reset/full-chain
  replay. `supabase/migrations/README.md` and the DB-003 decision still mention
  `supabase db reset`; resolve this documentation conflict before future replay
  guidance is standardized.

### Local schema evidence

- DB-003/DB-007 document the Docker target `supabase_db_tourify-beta` on
  Supabase Postgres 15.14.1.063 with 418 user tables across eight schemas and
  zero application seed rows. World-city rehearsal rows are draft-only and
  require an owner disposition before demo QA.
- DB-007 restored `account_follows`, four post-style/appearance tables, their
  guard/revision/updated-at triggers, policies, disabled feature flags, and the
  real V3 schema-version constraint. The earlier where-false engagement repair
  was superseded by the canonical definition.

### Validation and RLS

- `docs/engineering/migration-validation/` contains 106 migration manifests:
  99 `planned`, 2 `isolated_validated`, 5 `staging_validated`, and 0
  `production_verified`.
- DB-002 records staged apply/postflight claims for hiring PII, venues/RBAC,
  money-path RPCs, event-HQ RLS, and the additive venues identity columns. The
  durable manifests remain at `staging_validated`, so Release/QA must reconcile
  the status rather than infer production verification.
- RLS static detection is 1,287 policies over 418 source-detected tables, but a
  table-by-table coverage/persona matrix does not yet exist. The generated
  permissions map is explicitly only a routing aid.
- No aggregate trigger/data-propagation map exists. This remains required for
  counter repair, deletion/erasure, fanout, and concurrency analysis.

### Generated types and integration

- `lib/database.types.ts` is the sole generated Supabase schema contract under
  DB-004; it currently contains 25,643 lines. `types/supabase.ts` re-exports it,
  while `types/database.types.ts` contains hand-authored application view
  models. DB-004/DB-007 record a successful regeneration, drift check, and
  scoped strict typecheck.
- Independent placeholder client/type files remain under
  `app/admin/dashboard/components/`, so cleanup is still recommended.
- `20260908130000_agent_service_identities.sql` and AUTH-AGENT-001 establish the
  service-principal foundation. Validation/provisioning and first-route wiring
  remain incomplete.

## Focus / next action

1. Reconcile the 289-file source chain with live and production evidence.
2. Complete DB-005 ticketing and DB-006 events strategy decisions.
3. Build RLS, trigger, index, catalog-drift, and erasure regressions.
4. Retire obsolete apply guidance and placeholder client/type copies after the
   contracts stabilize.

## DB-002 production verification checkpoint — 2026-09-13

- Read-only verification against the registered production target confirmed the four staged migration object families, RLS enablement, event-HQ anon-policy removal, hiring PII restrictions, venues identity columns/index, and anonymous venue INSERT rejection.
- DB-002 remains active and release-blocked. `can_view_hiring_pii`, `replace_ticket_revenue_allocations`, `delete_tour_cascade`, and `has_entity_permission` are `SECURITY DEFINER` with pinned `search_path=public` but retain PUBLIC/anon EXECUTE; Supabase security advisor flags all four. The two money-mutating RPCs were callable as anon, making this an authorization release blocker.
- The target migration versions are absent from `supabase_migrations.schema_migrations` because prior application used raw Management API SQL. This is metadata drift, not migration-history parity; DB-003 owns additive reconciliation and the authoritative apply-list decision.
- No migration was applied during this verification lane. A reviewed, explicit CP-051 manual authorization fix and migration-history reconciliation must precede closure, followed by production probes and advisor rerun.

The detailed open items and owner questions are `GAPS.md` and `QUESTIONS.md`;
the prioritized execution list is `BACKLOG.md`.

## Owner direction — 2026-09-10

Release claims require staging and production evidence. Ticketing and Marketplace
reconciliation must be additive, and `events_v2` is canonical after a verified
cutover. Staged migration work remains under CP-051's explicit manual-apply rule.

## DB-005 / DB-006 checkpoint — 2026-09-11

- The active numbered migration source currently contains 293 SQL files. The
  DB-005 additive migration `20260910230339_ticketing_admin_overview_contract.sql`
  has a planned validation manifest and a captured source SHA-256, but no
  approved running target was available for SQL lint, apply, RPC execution, or
  RLS postflight. It must not be described as staging- or production-validated.
- Static DB-005 review confirmed the four compatibility tables
  (`ticket_shares`, `ticket_referrals`, `ticket_analytics`, and
  `social_media_performance`), `events_v2` foreign keys, RLS enablement,
  invoker RPC definitions, and public/anon execute revocation. The SQL contract
  test remains the runtime postflight gate.
- `events_v2` is canonical for all six bounded DB-006 callers: tour planner,
  dashboard service, analytics, personal calendar, community stats, and event
  reminders. The exact six-caller scan found zero `.from('events')` reads; the
  regression test now covers all six paths. The calendar cutover's stale
  `eventsResponse` reference was corrected.
- Remaining legacy `events`/`artist_events` callers are intentionally not
  cut over by DB-006 because their identifiers or authorization contracts are
  distinct. The exact app/lib inventory is 52 files:
  `app/api/admin/event-claims/route.ts`,
  `app/api/admin/staff-operations/summary/route.ts`,
  `app/api/admin/staffing/shifts/route.ts`,
  `app/api/community/activity/route.ts`,
  `app/api/events/[id]/claim/route.ts`,
  `app/api/events/[id]/share-message/route.ts`,
  `app/api/events/[id]/tour/route.ts`,
  `app/api/events/_lib/event-reference.ts`,
  `app/api/events/discover/route.ts`,
  `app/api/organizers/[slug]/route.ts`,
  `app/api/payment/route.ts`,
  `app/api/posts/share/route.ts`,
  `app/api/tours/[id]/events/[eventId]/route.ts`,
  `app/api/tours/[id]/route.ts`,
  `app/api/venues/[id]/route.ts`,
  `app/artist/business/analytics/page.tsx`,
  `app/artist/events/actions.ts`,
  `app/artist/events/actions/analytics.ts`,
  `app/artist/events/actions/create-event.ts`,
  `app/artist/events/actions/delete-event.ts`,
  `app/artist/events/actions/get-event-analytics.ts`,
  `app/artist/events/actions/update-event.ts`,
  `app/artist/events/components/artist-events-dashboard.tsx`,
  `app/artist/events/components/event-analytics.tsx`,
  `app/artist/events/components/event-export.tsx`,
  `app/artist/events/components/events-calendar.tsx`,
  `app/artist/events/page-simple-broken.tsx`,
  `app/artist/features/analytics/analytics-dashboard.tsx`,
  `app/bookings/page.tsx`,
  `app/events/[slug]/layout.tsx`,
  `app/services/events.service.ts`,
  `app/venue/actions/event-actions.ts`,
  `lib/artist/artist-event-operations.service.ts`,
  `lib/artist/artist-event-promote.service.ts`,
  `lib/events/canonical-event-service.ts`,
  `lib/events/event-matcher.ts`,
  `lib/events/get-upcoming-attending-events.ts`,
  `lib/feed/attending-event-posts.ts`,
  `lib/music/public-track.ts`,
  `lib/news/feed-service.ts`,
  `lib/public-artist/get-public-artist-profile.ts`,
  `lib/public-organization/get-public-organization-profile.ts`,
  `lib/services/achievement.service.ts`,
  `lib/services/artist-business.service.ts`,
  `lib/services/artist-content.service.ts`,
  `lib/services/artist.service.ts`,
  `lib/services/epk.service.ts`,
  `lib/services/hiring-onboarding.service.ts`,
  `lib/services/staff-shift-assignment-sync.ts`,
  `lib/services/venue.service.ts`,
  `lib/workflows/workflow-permissions.ts`, and
  `lib/workflows/workflow-threads.ts`.
- Verification at this checkpoint: active migration chain passed (293 files),
  migration validation passed, agent validation passed (17 agents / 70 tasks / 0
  warnings), DB-006 ESLint and focused Vitest passed (7 tests), and scoped diff
  checks passed. Full TypeScript verification timed out without diagnostics;
  local Supabase lint remained blocked by ECONNREFUSED at 127.0.0.1:54322.

## Production launch graph — 2026-09-16

- DB-002, DB-005, DB-006, and DB-008 are P0 launch blockers.
- DB-002 includes `20260914090000_revoke_public_execute_db002.sql`; anonymous/PUBLIC execution of the four identified SECURITY DEFINER functions must be denied in staging and production.
- DB-008 owns reconciliation of the 294-file active chain with hosted history, launch/deferred classification, generated types, advisors, and forward-repair evidence under CP-051.
- DB-005 and DB-006 cannot close on static evidence: ticketing schema and canonical `events_v2` behavior require isolated staging and downstream lifecycle certification.

## Next-batch result — 2026-09-16

- DB-002 now explicitly revokes both PUBLIC and anon EXECUTE for all four exposed SECURITY DEFINER functions and has static migration/postflight contract checks; hosted apply and probes remain required.
- DB-008 now owns an honest 294-active-migration hosted-history ledger: 7 launch-required, 287 explicitly unclassified, with staging and production defaulting to unverified until operator evidence is recorded.

## DB-009 ownership boundary — 2026-09-18

- DB-009 now owns `app/api/events/_lib/event-reference.ts` as the shared
  `artist_events` / `events` / `events_v2` identity and access compatibility
  contract. This is a separate bounded follow-on, not an expansion of DB-006's
  six-caller cutover.
- The read-only inventory records 18 direct importers across event
  subresources, payment, and event workflow. Identifier order, source-table
  identity, published-like access, and owner/org/venue/schedule projections
  require explicit cross-domain review before behavior changes.
- DB-009 owns no migration or hosted mutation. It depends on DB-006's canonical
  `events_v2` direction and on artist/discover, ticketing, work, social,
  payment, and QA contract evidence.

## DB-009 local contract implementation — 2026-09-18

- Unqualified UUID and slug resolution now uses one explicit canonical order:
  `events_v2`, then `artist_events`, then `events`. The resolver queries all
  three through the caller-supplied authenticated client so a visible duplicate
  cannot silently bind to whichever table was queried first.
- Query errors, malformed rows, more than one same-table result, and visible
  cross-table matches return no reference. Unique legacy matches remain an
  isolated compatibility path; DB-009 did not perform a schema cutover or use a
  service-role client.
- The returned source identity preserves nullable owner, organization, venue,
  event-date, and event-time fields. Organization metadata is projection only;
  route-specific active-organization and permission checks remain authoritative.
- Anonymous or unrelated viewer access for `events_v2` is limited to the same
  `confirmed`, `advancing`, and `onsite` lifecycle states used by public event
  resolution. Owners retain access; inquiry, hold, offer, settled, archived,
  null, and unknown states fail closed for other viewers.
- The focused test records all 18 direct importers with their domain,
  identifier, source compatibility, and authorization boundary. Local Vitest
  passed 8 tests; focused ESLint and scoped TypeScript diagnostics passed.
- Final closure still requires named artist/discover, ticketing/payment, work,
  and social review plus DB-006's separate hosted cutover evidence. This local
  implementation does not satisfy or replace those dependencies.

## DB-009 consumer-domain review — 2026-09-18

- The focused matrix now checks route evidence for all 18 importers instead of
  only proving that each path imports the resolver. Route parameters accept UUID
  or slug unless separately constrained; checkout is the exception because the
  shared API schema requires a UUID event id. The event workflow helper accepts
  an already-resolved reference.
- Discover: the public event-page route branches on source table and applies the
  viewer helper. Active migration evidence still limits `events_v2` SELECT to
  organization members, so anonymous canonical-event resolution is not proven
  by the local lifecycle helper and requires an approved policy plus hosted
  evidence under DB-006.
- Social: attendance and posts key data with both `event_id` and `event_table`;
  mutations apply viewer/owner rules. Reads depend on RLS after resolution. The
  active attendance policy is legacy-`events` oriented, and this review found no
  active creation/RLS migration for `event_posts`; Social/Database must verify
  deployed isolation before launch.
- Ticketing/payment: finance and deprecated guest-list reads are authenticated
  and permission-gated; legacy guest-list writes are frozen. Checkout accepts a
  UUID, verifies booking ownership, and resolves through the user's client, but
  does not compare the owned booking's `event_id` with the requested/resolved
  event. Ticketing/Payment must bind those identities and certify canonical
  buyer visibility through TICKET-005.
- Work: staff routes require an admin capability, exact active-organization
  projection, and (except the invite route's capability boundary) event
  permission. Incident and vendor collection creation explicitly requires
  `events_v2`. The vendor item route does not carry the collection route's
  `events_v2` gate, while jobs, locations, participants, tasks, and several read
  paths use unqualified `event_id`; Work must approve or source-qualify those
  compatibility contracts.
- All DB-009 local acceptance criteria are met: identifier/source/auth contracts
  are executable, divergences have named handoffs, and focused tests pass. The
  task remains active for the owner decisions above, deployed RLS isolation,
  DB-006 staging/production cutover evidence, TICKET-005 checkout certification,
  and QA-003 denial-path evidence.
