# Cross-domain decisions

Append decisions; do not rewrite history. Domain-only decisions belong in the owning agent directory.

## CP-001 — Repository memory over agent memory

- Date: 2026-09-08
- Status: accepted
- Decision: Store task progress, boundaries, evidence, and handoffs under `docs/engineering/`.
- Reason: A replacement agent can resume without loading the full repository or conversation history.

## CP-002 — Agent service principals, not shared human logins

- Status: accepted
- Decision: Engineering agents receive durable service principals with explicit scopes, revocable hashed credentials, optional Supabase Auth linkage, and server-written audit attribution. They do not share human passwords or receive implicit Admin/organization membership.
- Reason: Agent actions need independent attribution and lifecycle control while preserving human authorization boundaries and allowing credentials to be rotated or suspended.
- Consequence: The identity directory starts pending. An operator must apply the migration and explicitly provision each non-production identity before any route can accept its credential. Routes must opt into agent authentication and enforce resource-level scope.

## CP-005 — Bounded startup protocol

- Date: 2026-09-08
- Status: accepted
- Decision: Read the index, charter/state, and task first; expand only when evidence requires.
- Reason: Broad audits are expensive and obscure ownership.

## CP-003 — SHA-stamped generated maps

- Date: 2026-09-08
- Status: accepted
- Decision: Generated topology records HEAD, branch, time, and dirty-state summary.
- Reason: Consumers can identify stale or working-tree-dependent output.

## CP-004 — Preserve existing workflow records

- Date: 2026-09-08
- Status: accepted
- Decision: Keep existing work packets, specialist records, audits, and plans; link them from new tasks.
- Reason: Existing evidence should not be silently duplicated or replaced.

## CP-006 — Apply the 4 staged security/money migrations

- Date: 2026-09-09
- Status: accepted
- Task: DB-001, cross-cutting
- Decision: Apply the 4 gated-but-staged migrations: hiring-PII hardening (`20260823210000_harden_hiring_onboarding_pii.sql`), venues/RBAC RLS baseline (`20260823210100_venues_rbac_rls_baseline.sql`), money-path transactional RPCs (`20260823220001_money_path_transactional_rpcs.sql`), event-HQ anon-write closure (`20260823221000_event_hq_rls_tighten.sql`).
- Reason: They block Work (PII), Venue (RBAC), Ticketing (money), and Admin (anon-write) work.
- Consequences: Owner must push them through the gated pipeline (dry-run → staging → prod).

## CP-007 — Full migration reconciliation now

- Date: 2026-09-09
- Status: accepted
- Task: DB-001
- Decision: Reconcile the entire migration tree into one authoritative baseline chain (active + archive + migration-archive + migrations_backup + ad-hoc root .sql), rather than reconcile incrementally.
- Reason: It is the database agent's #1 blocker and every surface agent depends on a trusted deployed schema.

## CP-008 — Refresh generated topology maps now

- Date: 2026-09-09
- Status: accepted
- Task: ORCH-001
- Decision: Regenerate the topology maps (`npm run agents:generate`) at current HEAD so all baselines and follow-up tasks start from current topology.
- Reason: All 17 agents flagged the generated maps as SHA-stale.
- Consequences: Executed 2026-09-09; maps now stamped to `7cf660ad...`; validation warnings for SHA drift cleared.

## CP-009 — Subagents-per-task implementation model

- Date: 2026-09-09
- Status: accepted
- Task: ORCH-001
- Decision: Execute follow-up implementation tasks by dispatching a domain subagent per task, one bounded outcome each.
- Reason: Maintains ownership boundaries and bounded scope.

## CP-010 — CI pipeline exists; QA finding corrected

- Date: 2026-09-09
- Status: accepted
- Task: ORCH-001
- Decision: The `.github/workflows/` directory contains 16 real, git-tracked CI workflows (ci.yml, e2e.yml, security-scans.yml, etc.). The QA-001 audit's "no CI pipeline" finding was a false negative; the release inventory of 16 workflows is accurate. QA GAPS/QUESTIONS must be corrected.
- Consequence: Launch gate G3 is gated on making e2e a required check and driving vitest to green, not on creating a pipeline from scratch.

## CP-011 — Photos webhook idempotency: build ledger + fix

- Date: 2026-09-09
- Status: accepted
- Task: INTG-001
- Decision: Build an idempotency ledger for the photos purchase Stripe webhook (aligned with the `platform_webhook_events` pattern) and fix the route, so Stripe retries cannot double-fulfill purchases.
- Reason: Money integrity — the single highest-severity (P0) gap across all audits.

## CP-012 — MFA hardening: fix both now

- Date: 2026-09-09
- Status: accepted
- Task: INTG-001
- Decision: Fix both MFA issues now: (a) cryptographically hash MFA backup codes (replace djb2), and (b) move in-memory verification-code storage to a DB-backed store so codes survive deploys.
- Reason: An attacker with DB read can brute-force backup codes; in-memory store locks out mid-flow users on every deploy.

## CP-013 — Music commerce ownership: split by concern

- Date: 2026-09-09
- Status: accepted
- Task: MUSIC-001 / MKT-001
- Decision: Split music commerce by concern: the marketplace agent owns orders/checkout/transfers/portfolios; the music agent owns catalog, rights, royalties, and artist-music routes. Establish an interface/handoff between the two domains and verify auth on the ~13 shared financial routes.
- Reason: Resolves the music-vs-marketplace ownership ambiguity and the unverified auth on financial routes.

## CP-014 — Admin gate: implement platform/org split

- Date: 2026-09-09
- Status: accepted
- Task: ADMIN-001
- Decision: Implement the WS-0.8 admin gate split: platform admin = `profiles.is_admin` OR numeric capability; org/tour roles grant org surfaces only; enforce internal `assertAdmin` on every `/api/admin/*` route (incl. the ~15 known gaps).
- Reason: Correct authz separation between platform and org admin surfaces.

## CP-015 — Resolve all 27 vitest failures inline

- Date: 2026-09-09
- Status: accepted
- Task: QA-002
- Decision: Drive all 27 vitest failures to zero, resolving the underlying product/schema decisions inline during implementation rather than quarantining.
- Reason: Launch gate G3 (CI fully green) cannot be met while they fail and they are confirmed not strictly schema-blocked for building.

## CP-016 — Canonical generated types: regen + CI

- Date: 2026-09-09
- Status: accepted
- Task: DB-001
- Decision: Generate types from the reconciled schema into ONE canonical `lib/database.types.ts`, add a CI regen + type-drift check, and drop the divergent duplicate type files.
- Reason: The duplicated/lagging types mislead all type consumers and omit agent-identity tables.

## CP-017 — Versioned ticket settlement now

- Date: 2026-09-09
- Status: accepted
- Task: TICKET-001
- Decision: Make ticket-revenue settlement append-only/versioned (not delete+reinsert on active allocations) before finance handoff.
- Reason: Money-path data integrity; current delete/reinsert risks loss on reallocation.

## CP-018 — Prod/demo DB: plan now, split later

- Date: 2026-09-09
- Status: accepted
- Task: RELEASE-001
- Decision: Author the `RECOVERY_AND_CONTINUITY_PLAN.md` and document PITR/drill on current topology now; defer the actual demo/prod Supabase project split and live restore drill to post-bootstrap.
- Reason: Splitting projects is disruptive pre-reconciliation; the plan can be produced immediately while the split is sequenced later.

## CP-019 — Music workers: build deployment framework first

- Date: 2026-09-09
- Status: accepted
- Task: MUSIC-001 / RELEASE-001
- Decision: Build the worker deployment/scheduling framework (retry/DLQ/health + registration) for the 21 music outbox workers first; gate actual scheduling/count reconciliation (16 shipped vs 21 target) on migration reconciliation.
- Reason: Launch gate G5 needs the framework and monitoring; the exact worker set depends on the reconciled schema.

## CP-020 — Standalone feed

- Date: 2026-09-09
- Status: accepted
- Task: SOCIAL-001
- Decision: Build the feed as its own destination page rather than keeping the /feed → /news redirect.
- Reason: The feed engine is fully built but has no visible consumer page; a standalone feed exposes it.

## CP-021 — Full community groups

- Date: 2026-09-09
- Status: accepted
- Task: SOCIAL-001
- Decision: Build out groups to full community groups (content feed, members, roles, discovery page), evolving from the current basic CRUD + join/leave.
- Reason: Product scope decision for the social surface.

## CP-022 — Full realtime messaging

- Date: 2026-09-09
- Status: accepted
- Task: SOCIAL-001
- Decision: Add full realtime to messaging (typing indicators, presence, read receipts via Supabase channels / Redis).
- Reason: Product scope decision; the DM system is mature but lacks realtime today.

## CP-023 — Keep separate hiring surfaces

- Date: 2026-09-09
- Status: accepted
- Task: WORK-001
- Decision: Keep the three hiring surfaces separate as documented, owned surfaces — `/api/hiring/**` (work), `/api/admin/staffing+workforce+onboarding/**` (admin), `/api/venue/hiring/**` (venue) — rather than consolidating to one.
- Reason: Different consumers (worker vs admin vs venue) and ownership boundaries; consolidation risks cross-domain coupling.

## CP-024 — Standardize onboarding API, keep paths

- Date: 2026-09-09
- Status: accepted
- Task: USER-001
- Decision: Keep the 4 onboarding surface paths but standardize on ONE canonical API contract and a single submit endpoint, retiring duplicate API routes.
- Reason: Consolidating page paths is disruptive; standardizing the API gives one typed contract while preserving surface flexibility.

## CP-025 — Rewrite unified settings

- Date: 2026-09-09
- Status: accepted
- Task: USER-001
- Decision: Rewrite the settings surface as a single unified surface from both the EnhancedSettingsRouter and legacy account-settings families, rather than choosing one twin.
- Reason: A unified settings surface removes the ~38-file twin-tree ambiguity and gives a consistent interaction model (coordinate with design-system).

## CP-026 — Artist owns artist-facing music surface

- Date: 2026-09-09
- Status: accepted
- Task: ARTIST-001 / MUSIC-001
- Decision: The artist agent owns the artist-facing music surface (`artist_music` table + 34 artist music routes/dashboards); the music agent owns playback, rights, royalties, and the ingest/backend. They coordinate via an interface/handoff.
- Reason: Artist identity/dashboards belong to the artist domain while the music backend stays with music; supersedes any previous ambiguity (extends CP-013).

## CP-027 — Consolidate search to one

- Date: 2026-09-09
- Status: accepted
- Task: DISC-001
- Decision: Collapse the 4+ search implementations into one canonical search endpoint/contract, retaining FTS as the backend, and apply rate limiting to it.
- Reason: WS-2.3 endpoint consolidation; only one endpooint needs rate limiting and a contract.

## CP-028 — Fix webhooks individually (no shared framework yet)

- Date: 2026-09-09
- Status: accepted
- Task: INTG-001
- Decision: Fix the webhook routes individually (align idempotency, signature verification, error handling) rather than building a shared webhook abstraction at this time.
- Reason: A shared framework is a larger investment; per-route fixes unblock correctness now (extend CP-011 for photos).

## CP-029 — Secure all cron routes now

- Date: 2026-09-09
- Status: accepted
- Task: INTG-001 / RELEASE-001
- Decision: Add CRON_SECRET bearer validation to all `/api/cron/*` routes now.
- Reason: Unauthenticated crons let anyone trigger outbox/staffing/workflow operations.

## CP-030 — Full observability now

- Date: 2026-09-09
- Status: accepted
- Task: RELEASE-001
- Decision: Provision web + mobile Sentry DSNs, enable traces, set up uptime monitoring on `/healthz` + key flows, alert routing, and SLOs for auth/checkout/stream.
- Reason: Launch gate G4 (Sentry + uptime + alerting live) and observability is currently OFF because DSNs are unset.

## CP-031 — Ticketing schema: additive migration

- Date: 2026-09-09
- Status: accepted
- Task: DB-001 / TICKET-001
- Decision: Overlay the missing ticketing objects (admin overview tables RPCs reference) via a targeted additive migration within DB reconciliation, rather than a full ticketing-specific reconcile.
- Reason: Unblocks admin ticketing overview RPCs with minimal risk; full reconcile rides CP-007.

## CP-032 — Per-persona storefronts

- Date: 2026-09-09
- Status: accepted
- Task: MKT-001
- Decision: Keep the polymorphic per-persona storefront model (`seller_entity_id`/`seller_entity_type` for venue/artist/organization); update docs to match the code.
- Reason: Supports venue/artist/org storefronts the singular-per-user model cannot; resolves the docs-vs-code drift.

## CP-033 — EPK free

- Date: 2026-09-09
- Status: accepted
- Task: ARTIST-001
- Decision: The artist EPK (electronic press kit) is free/unrestricted, not gated or freemium.
- Reason: Product scope; free EPK supports artist profiles broadly.

## CP-034 — Build contract signing UI

- Date: 2026-09-09
- Status: accepted
- Task: ARTIST-001
- Decision: Build the contract signing UI within the artist pipeline.
- Reason: The pipeline references it; currently missing.

## CP-035 — Unify use-mobile hook now

- Date: 2026-09-09
- Status: accepted
- Task: DESIGN-001
- Decision: Resolve the 4 twin `use-mobile` files (which return DIFFERENT contracts) into one canonical hook.
- Reason: Different return shapes are a real bug risk and block responsive surfaces, QA, and venue.

## CP-036 — Build + adopt shared primitives

- Date: 2026-09-09
- Status: accepted
- Task: DESIGN-001
- Decision: Build shared EmptyState/ErrorState/Skeleton primitives in the design system and adopt them across surfaces (WS-2.6).
- Reason: Removes ad-hoc loading/error twins and standardizes a11y/layout.

## CP-037 — Consolidate venue component trees

- Date: 2026-09-09
- Status: accepted
- Task: VENUE-001 / DESIGN-001
- Decision: Consolidate the dual venue component trees (`app/venue/components/` canonical vs `components/venue/` legacy) and delete the dead `components/venue/ui/**` twin.
- Reason: Removes duplication and the dead ~50-file tree.

## CP-038 — Build venue booking lifecycle

- Date: 2026-09-09
- Status: accepted
- Task: VENUE-001
- Decision: Build/document the venue booking lifecycle state machine (tables/RPCs exist but no doc or tests) and add tests.
- Reason: Booking lifecycle is undefined/untested today.

## CP-039 — Unify org identity model

- Date: 2026-09-09
- Status: accepted
- Task: ORG-001
- Decision: Reconcile organizations / organizer_accounts (ops_org_id bridge) / accounts into one canonical identity model.
- Reason: Three overlapping identity models cause tenant-context and authorization ambiguity.

## CP-040 — Finish atomic org invite accept + revocation

- Date: 2026-09-09
- Status: accepted
- Task: ORG-001
- Decision: Finish WS-0.2: atomic invite accept RPC + revocation column/RPC + hash invite tokens (align with tour invites) + rate limit.
- Reason: Non-atomic plaintext invites are an integrity/security gap; tour invites already hash.

## CP-041 — Extend GDPR erasure map

- Date: 2026-09-09
- Status: accepted
- Task: USER-001
- Decision: Extend the self-service deletion PII scrub to cover portfolio_items, experiences, certifications, skills, layouts, user_active_profiles, and any table verifiably retaining PII without an auth.users FK.
- Reason: Compliance; erasure coverage is currently unverified for several PII-retaining tables.

## CP-042 — Pick one events strategy

- Date: 2026-09-09
- Status: accepted
- Task: DB-001 / DISC-001
- Decision: Choose ONE events table strategy (events vs events_v2) and stop runtime schema probing in hot paths (WS-2.3).
- Reason: Dual-table probing is a correctness and performance risk.

## CP-043 — Platform admin = is_admin + numeric capability

- Date: 2026-09-09
- Status: accepted
- Task: ADMIN-001
- Decision: Define platform admin as `profiles.is_admin` OR a numeric capability bit; org/tour roles never grant platform surfaces (WS-0.8). (Supports CP-014.)
- Reason: Boolean alone is too coarse for the platform/org surface split.

## CP-044 — Codify one standard guard wrapper

- Date: 2026-09-09
- Status: accepted
- Task: ADMIN-001
- Decision: Audit each of the 289 admin API routes, codify ONE standard guard wrapper, migrate the ~8 guard idioms onto it, and close the ~15 known gaps (WS-1.7).
- Reason: Standardizes authorization and closes guard gaps; maintains security, not a rewrite.

## CP-045 — Split Stripe webhook secrets now

- Date: 2026-09-09
- Status: accepted
- Task: INTG-001
- Decision: Split ticketing and subscriptions webhooks onto domain-specific `STRIPE_*_WEBHOOK_SECRET` env vars now.
- Reason: Shared secret weakens the webhook trust boundary; low risk to split.

## CP-046 — Gate/remove music webhook fallback

- Date: 2026-09-09
- Status: accepted
- Task: MUSIC-001
- Decision: Gate the unsigned music/royalty webhook fallback (fail closed in production), removing the unsigned path from prod.
- Reason: Production security; unsigned path is a forgery risk.

## CP-047 — e2e required after vitest green

- Date: 2026-09-09
- Status: accepted
- Task: RELEASE-001 / QA-002
- Decision: Make e2e.yml a required (blocking) check for deploys AFTER the 27 vitest failures are resolved (CP-015).
- Reason: Enforcing e2e before CI is green would block all merges; sequence it after vitest passes.

## CP-048 — Build staffing persona matrix

- Date: 2026-09-09
- Status: accepted
- Task: WORK-001
- Decision: Publish the staffing persona matrix (org + staffing personas) required by WS-1.1 acceptance, owned by the work agent.
- Reason: It is a WS-1.1 acceptance artifact currently missing.

## CP-049 — Build false-zero truthfulness

- Date: 2026-09-09
- Status: accepted
- Task: TICKET-001
- Decision: Build truthfulness into admin/venue/workspace/financials reads so 'unavailable' is not shown as zero (not merely scoped to reporting).
- Reason: False zeros misrepresent operational and financial state.

## CP-050 — Ticket purchase: always-auth GA

- Date: 2026-09-09
- Status: accepted
- Task: TICKET-001
- Decision: Ticket purchase authentication is always-authenticated as the GA contract; pick the canonical gate and plan per-org flag reconciliation away from `isTicketingV2Enabled()`.
- Reason: Defines the GA purchase-auth contract and removes per-org flag ambiguity.

## CP-051 — All SQL migrations are applied manually; never reset the database

- Date: 2026-09-09
- Status: accepted
- Task: ORCH-001 / DB-003 / DB-004 / cross-cutting (all agents)
- Decision: Every SQL migration is applied manually and explicitly — reviewed, one migration (or reviewed batch) at a time, via `supabase migration up`, targeted `db push`, or explicit psql apply — and never through a destructive or automated full-chain replay. `supabase db reset`, `db push --include-all`, forced replays, and any command that drops/recreates the database are forbidden. Local stack boot (`supabase start`) must not be treated as the migration application mechanism when it auto-replays the chain; if the stack applies migrations on boot, migrations must first be confirmed safe to apply in order, and any migration that fails (e.g. `pg_read_file` permission denial on the local stack) is filed as a manual-apply item, not automated around.
- Reason: A local `supabase start` auto-replay failed mid-chain on `20260415210006_signup_profile_and_email_confirmation.sql` (permission denied for function pg_read_file) after partially applying earlier migrations. Destructive replays risk losing live state and mask migration-order defects; manual application keeps every applied migration attributable, reviewable, and additive.
- Consequence: DB-003/DB-004 verification uses live-schema queries (table counts via SQL) instead of reset-based reconciliation; targeted RLS probes run against migrations applied manually; blocks are recorded as manual-apply items instead of being reset around.

## CP-052 — Canonical organization tenant with compatibility projections

- Date: 2026-09-10
- Status: accepted
- Task: ORG-002
- Decision: Use `organizations.id` as the sole organization tenant identity and `org_members` as its authorization boundary. Keep `organizer_accounts` as the public/ops profile linked by `ops_org_id`; keep `accounts` as a compatibility/search projection of that profile. Neither projection can authorize organization scope or define a second organization.
- Reason: Existing creation, RLS, invite, and admin-context code already establishes this bridge; centralizing it removes ambiguity without a migration or a risky data rewrite.
- Consequence: Organization-scoped code must carry the canonical tenant id; unbridged organizer profiles are legacy/unscoped and must be rejected for tenant authorization. Projection repair/retirement can be sequenced separately through the database lane.

## CP-053 — Owner-approved release and schema sequencing

- Date: 2026-09-10
- Status: accepted
- Task: ORCH-001 / DB-002 / DB-005 / DB-006 / RELEASE-002 through RELEASE-005
- Decision: Require staging and production evidence for release claims; reconcile
  ticketing, events, Marketplace, and Music rights/royalty/trust schema
  additively; make `events_v2` canonical; and keep CP-051's manual, explicit
  migration rule. Do not promote or enable archive-only surfaces from runtime
  code alone.
- Reason: The owner approved a controlled cutover sequence that preserves live
  data and makes schema drift visible before dependent routes or workers run.

## CP-054 — Owner-approved worker and observability direction

- Date: 2026-09-10
- Status: accepted
- Task: MUSIC-004 / INTG-006 / RELEASE-002 / RELEASE-003
- Decision: Build worker framework and observability contracts first. Use a
  hybrid worker deployment (pg_cron for short DB maintenance, durable worker
  runtime for long-running/retry-heavy jobs, Vercel cron as triggers where
  appropriate), with Sentry web/mobile, `/healthz` plus auth/session and
  checkout uptime, separate auth/checkout alerts, and a 99.9% monthly web/API
  target. Keep exact worker count/cadence/DLQ and external provisioning open.
- Reason: The owner approved the recommendation over an all-pg_cron approach;
  workload duration and retry semantics make one scheduler unsuitable for every
  job.

## CP-055 — Owner-approved authorization, flags, and accessibility gates

- Date: 2026-09-10
- Status: accepted
- Task: MKT-002 / MUSIC-001 / DESIGN-004 / ADMUX-0102
- Decision: Entitlements require account type plus acting context/resource
  ownership; Music flags are default-deny with pilot allowlists and never bypass
  authorization; design tokens target a centralized registry with CSS runtime
  truth; and core-flow accessibility requires automated, keyboard/focus, and
  governed VoiceOver/TalkBack evidence with WCAG AA as the durable target.
- Reason: Broad account-type gates and unverified accessibility claims are not
  sufficient for production authorization or launch readiness.

## CP-056 — Single master workspace; divergent lineages preserved as archived branches

- Date: 2026-09-22
- Status: accepted
- Task: ORCH-002 / cross-cutting (all agents)
- Decision: `/Users/kyledaley/Developer/Tourify` on `release/clean-snapshot` is the ONE authoritative master workspace; all agent work happens there. The adjacent folders are not operating workspaces. Divergent lineages from the 2026-09-22 audit are preserved on `origin` as archived branches: `origin/codex/admin-workflow-completion` (salvaged beta-K2 branch, WIP captured at `521a206d`) holds the venue feature family, admin-workflow/lib-admin, and music-trust content; `origin/feature/world-of-music` (merge-base `81448509`) holds the world-geography fork and its 309 unique files; `origin/main` contains nothing that `release/clean-snapshot` lacks (master is 153 ahead, 0 behind). Reconcile best work by ADDITIVE ISLAND PORT ONLY: cherry-pick or vendor a bounded feature behind its owning domain (venue-pages-builder for venue, admin-dashboard-builder for admin/workflow, discover for world data), then let the owning domain run its normal verification.
- Reason: The beta-K2 45-commit / 2,367-file branch existed only locally and was at risk, so it was pushed as a first safety step. A blanket merge of either lineage is unsafe: master and the lineages evolved roughly 8,704 of the same file paths in parallel, so a sweep would overwrite wave-hardened code with older variants and stall the release critical path.
- Consequence: Agents never commit to or operate on the duplicate folders (the three wave snapshot clones, `myproject/tourify-work-impl`, `myproject/tourify-beta-K2`, and the beta zip); those are archival/deletion candidates pending per-island port decisions. Preserve-unrelated-changes still governs the master worktree (e.g. the in-progress ADMVIEW-001 admin work). CP-051 manual migration application and the wave orchestration discipline are unchanged.
