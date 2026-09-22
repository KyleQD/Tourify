# Database baseline

Audit task `DB-001` (read-only). This revision reconciles the original audit
with DB-002, DB-003, DB-004, and DB-007 evidence available in the current dirty
worktree. Generated maps are indexes, not authorization or deployment proof.

## 1. Boundary and current posture

The Database domain owns Supabase schema evolution, RLS, RPCs, generated
types, and data integrity. Its declared working set is recorded in
`docs/engineering/agents/database/WORKING_SET.json`: `supabase/**`,
`lib/supabase/**`, `lib/database.types.ts`, migration-validation manifests, and
migration/security tests. The current posture is **partial**: the source chain
and canonical type path are materially improved, but live/staging/production
proof, full RLS coverage, and several schema decisions remain incomplete
(`docs/engineering/agents/database/STATE.md`, `GAPS.md`).

## 2. Source chain and schema evolution

- `supabase/migrations/` is the accepted apply source (DB-003 decision in
  `docs/engineering/agents/database/DECISIONS.md`; operational explanation in
  `supabase/migrations/README.md`). The current source tree contains **289**
  numbered SQL files; the latest is
  `20260910000001_get_active_organizer_account_for_org.sql`.
- Historical evidence remains in `supabase/migrations/archive/` (**133** SQL
  files), `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/`
  (**274**), `supabase/migrations_backup/` (**94**), and 24 root-level
  `supabase/*.sql` files. These are not active apply inputs, but the root
  `supabase/README.md` still contains manual copy/paste instructions, so
  retirement/documentation cleanup remains open.
- The static database map scans active plus archived source and currently
  reports **422 migrations, 693 objects, 418 tables, 259 functions, 13 views,
  2 materialized views, 1 type, and 1,287 detected policies**
  (`docs/engineering/generated/database-schema.md`,
  `docs/engineering/generated/database-objects.md`). The scan intentionally
  includes historical files and must not be read as a deployed catalog.
- DB-003 records a manual Docker-backed local bring-up with **281** migrations
  applied and recorded; DB-007 records the reconciled post-styles/account-follows
  state at **287/287** applied, with 418 user tables across eight schemas and
  zero application seed rows (`docs/engineering/tasks/completed/DB-003.json`,
  `docs/engineering/tasks/completed/DB-007.json`). The source tree has since
  reached 289 files, so the two-file delta is not covered by that live-apply
  evidence.
- DB-003/DB-007 resolved two concrete reconciliation failures: the canonical
  `account_follows` table now supports `private.can_view_post_engagement`, and
  the post-style/post-appearance family plus the real V3 schema-version check
  is present (`docs/engineering/tasks/completed/DB-007.json`,
  `docs/engineering/agents/database/STATE.md`).

## 3. Validation and deployment evidence

`docs/engineering/migration-validation/` currently contains **106 migration
manifests**: **99 planned, 2 isolated_validated, and 5 staging_validated**;
none is `production_verified`. `npm run check:migration-validation` passes and
the checker currently scans 142 source/history inputs. The five staging entries
are the four DB-002 security/money migrations plus
`20260823221100_venues_add_identity_columns.json`; DB-002 contains Management
API apply and postflight claims, but those claims have not been promoted to the
manifest's `production_verified` status (`docs/engineering/tasks/active/DB-002.json`).

The current safe checks are:

- `npm run check:migration-chain` — pass, 289 files, no duplicate policy
  creations.
- `npm run check:migration-validation` — pass, no validation failures.
- `MIGRATION_CHECKSUM_BASE_SHA=7cf660ad8422dbd3adbdb77369d94638cdc2231b npm run check:migration-checksums` — pass, “No changed migration SQL files”.
- `npm run agents:validate` — pass with 0 errors and one pre-existing warning
  for RELEASE-001.
- `npm run check:database-types` was attempted during this audit but the
  Supabase CLI failed before comparison because it could not write
  `~/.supabase/telemetry.json.tmp...` in the sandbox. DB-004 and DB-007 record
  the prior drift-gate pass and scoped strict typecheck (`docs/engineering/tasks/completed/DB-004.json`,
  `docs/engineering/tasks/completed/DB-007.json`).

The repository explicitly forbids destructive resets in
`docs/engineering/INDEX.md`, while `supabase/migrations/README.md` and the
DB-003 decision still mention `supabase db reset` for fresh local replay. That
documentation conflict is recorded as a follow-up rather than acted on.

## 4. Database objects, RLS, RPCs, and integrity

- The generated object map reports **259 functions**, including authorization
  helpers (`has_entity_permission`, `has_global_permission`, `has_perm`,
  `is_org_member`, `can_manage_hiring`, `can_manage_event_hq`), transactional
  functions (`replace_ticket_revenue_allocations`, `delete_tour_cascade`,
  reservation/inventory lifecycle RPCs), ticketing invite/grant functions,
  publication/outbox functions, and counter/notification functions
  (`docs/engineering/generated/database-objects.md`).
- DB-002 records staging-verified hiring PII, venues/RBAC, money-path RPC, and
  event-HQ RLS behavior: protected hiring reads, `SECURITY DEFINER` functions
  with pinned search paths, RLS on venues/RBAC tables, and anonymous venue
  inserts rejected while published reads remain available
  (`docs/engineering/tasks/active/DB-002.json`).
- Static source detection reports **1,287 policies** across 418 tables, but no
  generated table-by-table RLS coverage matrix exists. The permissions map
  explicitly warns that it is a routing aid, not an authorization audit
  (`docs/engineering/generated/permissions.md`).
- No dedicated trigger/data-propagation inventory exists. Trigger bodies are
  embedded in migration SQL and appear in the function/object map, including
  updated-at, engagement-count, roster-sync, notification-fanout, and
  post-appearance guard/revision triggers (`docs/engineering/generated/database-objects.md`,
  `docs/engineering/agents/database/GAPS.md`).
- SQL integrity/security fixtures exist under `supabase/tests/`, and focused
  migration/security tests include the migration-source helper, quarantined
  history, admin migration contracts, post-styles contracts, and calendar/
  guard tests (`supabase/tests/`, `__tests__/admin/`, `__tests__/post-styles/`,
  `__tests__/security/`). They are useful contract evidence but do not replace
  deployed-catalog, persona-matrix, restore, load, or production RLS proof.

## 5. Generated types and consumers

- `lib/database.types.ts` is the canonical generated Supabase contract under
  the DB-004 decision and currently contains 25,643 lines. `types/supabase.ts`
  is a three-line compatibility re-export; `types/database.types.ts` is
  explicitly hand-authored application view models, not a second generated
  schema. This resolves the original “canonical generated type missing” gap.
- Two local component files still contain an independent placeholder client/type
  shape (`app/admin/dashboard/components/types/supabase.ts` and
  `app/admin/dashboard/components/lib/supabase.ts`), so copy cleanup remains an
  improvement item. DB-007 records regenerated types after the restored tables
  were applied (`docs/engineering/tasks/completed/DB-004.json`,
  `docs/engineering/tasks/completed/DB-007.json`).

## 6. Routes, components, services, and integration surfaces

The database is consumed broadly rather than through one database UI:

- The generated route map indexes **369 web pages** (`docs/engineering/generated/routes.md`),
  including admin, artist, ticketing, venue, and migration/debug surfaces.
- The generated API map indexes **939 route handlers**
  (`docs/engineering/generated/api-routes.md`). The permissions map records
  session, organization/venue/RBAC, service-role, and manual-review markers for
  these consumers; those markers still require route-level review
  (`docs/engineering/generated/permissions.md`).
- The generated component map indexes **1,939 TSX/JSX files**
  (`docs/engineering/generated/components.md`). Database-facing service/client
  entry points include `lib/supabase/**`, `services/supabase.ts`, and the
  admin/venue/ticketing service modules listed by the API and permissions maps.
- Supabase Edge Functions are present under `supabase/functions/`; integration
  inventory and environment names are documented in
  `docs/engineering/generated/integrations.md`.
- `.agents/organization-ticketing/INVENTORY.md` remains important legacy
  evidence: it records customer false-zero fallbacks, Admin endpoints with
  undeployed/incompatible ticketing columns, live-only promotion infrastructure,
  and overlapping ticketing grants/policies.

## 7. Intended direction

The intended direction is data-integrity-first hardening, not another parallel
schema. `docs/DEVELOPMENT_BACKLOG.md` WS-1.1/WS-1.2 call for one authoritative
chain, gated migration evidence, server-side authorization, transactional
money/data mutation, and eventual credential issuance inside an RPC. WS-2.3
requires one `events`/`events_v2` strategy; WS-2.4 requires erasure coverage;
WS-3.2 requires trigger/counter, FK-index, telemetry-retention, and hot-policy
scale work. These are cross-referenced by `.agents/plans/phase-0-data-integrity.md`,
`.agents/plans/phase-6-finance-commerce.md`, the database backlog, and the
current DB-005/DB-006 task records.

The near-term order is: finish current source-vs-live and production evidence,
then close RLS/ticketing/events decisions, then build trigger/index/erasure
regressions and retire legacy apply/type artifacts. Owner answers are captured
as follow-up tasks; DB-001 is not blocked by them.

## 8. Resolved since the initial DB-001 draft

- DB-003 established the active migration root and reconciled the local chain.
- DB-004 established the canonical generated type path and CI drift check.
- DB-007 restored the missing post-styles/account-follows family and verified
  the live local schema.
- DB-002 advanced the four staged security/money migrations to
  `staging_validated` and recorded RLS/RPC postflight evidence.

The remaining findings are in `GAPS.md`; the owner decisions requested to turn
them into bounded follow-up tasks are in `QUESTIONS.md`.
