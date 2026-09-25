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

## CP-057 — Admin logistics is a portfolio-first control tower

- Date: 2026-09-23
- Status: accepted
- Task: ORCH-003
- Decision: The Admin Logistics surface uses five first-class tabs (`overview`, `travel`, `production`, `communications`, `maps`). Organization-wide Overview is the default; tour and event scopes are explicit and never auto-selected. Comms contains contextual operational communication while the global Communications page remains the direct/group inbox. Maps is an organization library, but creation remains bound to a canonical event or tour. The Overview is served by one organization-authorized aggregate API with explicit partial-source health.
- Reason: The previous page mixed organization and silently selected tour scopes, hid Comms and Maps in one menu, issued a large client request fan-out, and could render failed sources as healthy or empty.
- Consequences: Legacy tab values are compatibility aliases; all logistics requests use selected acting context and stale-response protection; vendor/mock surfaces remain hidden; archived logistics migrations are not promoted by this project; venue and artist map surfaces remain out of scope.

## CP-058 — Interaction and notification reads never rely on service-role access

- Date: 2026-09-25
- Status: accepted
- Task: SOCIAL-007 (`SIM-20260922-SOC-003`)
- Decision: Social interaction and notification read paths must not use a service-role client as their read path. Every interaction and notification read runs on the caller-scoped client returned by `checkAuth` / `parseAuthFromCookies`, so the caller's own RLS applies (bearer and cookie session parity is required; a Bearer-only read model is not acceptable). Because the shipped migration chain gives `post_likes` and `post_comments` a permissive `USING (true)` SELECT policy, the application-layer post-visibility gate (`lib/feed/post-comment-access.ts` → `canViewPostComments`) is the **enforcement boundary** for those two tables, not a nicety: it must run before any interaction read, it must be fail-closed on error, and it must answer with the same 404 for a missing post and a non-entitled post so it is never an existence oracle. Per-user engagement aggregates are self-only — a caller-supplied `userId` that is not the authenticated identity is refused rather than resolved. Where a service-role read is genuinely required (cross-account fanout, admin analytics), the server must verify scope against the authenticated identity first, and the response must not disclose another user's private activity.
- Reason: `GET /api/notifications/social` accepted `?postId=` / `?userId=` and resolved them through the RLS-bypassing service client, so any authenticated bearer user could read likes, comments and shares of a followers-only or private post and any user's engagement counters. The Bearer-only auth model also denied web cookie clients while leaving the unscoped read open. Restoring the RLS-enforced client alone would not have been sufficient for likes/comments, and service role alone would have been insufficient for shares.
- Consequences: `GET /api/notifications/social` and `GET /api/posts/[id]/poll/vote` are gated and no longer service-role reads. `sharesReceived` on the self-stats response is now computed only from share rows the caller may read, so it can never count another actor's share; `posts.shares_count` is the aggregate surface for share totals. Tightening `post_likes` / `post_comments` SELECT policy is a database-lane change with client-side blast radius and is tracked as `HF-DB-006-SOCIAL-007` rather than authored here.

## CP-059 — Storage-owned relations: ask the server, do not re-derive its permission check

- Date: 2026-09-25
- Status: accepted
- Task: DB-008 (Wave 32)
- Decision: A migration that manages a relation owned by another role (the Supabase `storage` service owns `storage.objects` and `storage.buckets`) must not pre-check that permission by re-deriving it. It must attempt the privileged statement and let the server decide, absorbing the refusal so a fresh replay cannot be aborted by a boundary that has nothing to do with the migration's own subject. Each `CREATE POLICY` is attempted in its own subtransaction with a local `exception when others` handler, plus an outer backstop for the `pg_policies` existence reads. Skips are reported as `raise warning` carrying `sqlstate` and `sqlerrm`, never `raise notice`, because these migrations set `client_min_messages = warning` and a NOTICE-only guard fails invisibly. `create policy` remains inside a DO block, so the static duplicate-policy chain check does not attribute the name to a version, and the `pg_policies` existence check keeps the block idempotent.
- Reason: `CREATE POLICY` enforces `pg_class_ownercheck`, which the server satisfies for the exact owner, **a superuser, or any member of the owning role**. The obvious guard, `pg_get_userbyid(c.relowner) = current_user`, is a strict subset: executed against PostgreSQL 16 it returns false for a superuser and for a member of the owning role, both of which the server accepts. That guard therefore converts a chain abort into a *silent* loss of the policies in the standard Supabase layout (superuser replay, `storage.objects` owned by `supabase_storage_admin`) — a security regression that is worse than the failure it fixes, and it reports nothing because the NOTICE is suppressed. Delegating to the server cannot diverge from the server.
- Consequences: The unguarded `do $app_docs_storage$` block in `20260701021033_job_application_profile_snapshot.sql` (PR #14 `Database Types`, SQLSTATE 42501 `must be owner of table objects`) is corrected in place, because a forward-only migration cannot repair an earlier statement that aborts the chain; the change is replay-safety only and alters no schema object, and `history-baseline.json` records the previous SHA-256 with the reason. A target can now legitimately end up without these policies, so `supabase/tests/db008_app_docs_storage_policy_contract.sql` fails closed on their absence and the operator creates them once as the relation owner. **Ten sibling migrations still create `storage.objects` policies with no equivalent guard and eight remain unguarded at HEAD; under a non-owner replay role the chain aborts at the first of them, so this decision does not by itself turn `Database Types` green and the siblings need an orchestrator ownership decision.** Separately, retiring a relation is not a database-lane decision: the venue crew/contractor surface (`venue_crew_members`, `venue_team_contractors`, `get_staff_dashboard_stats`, archive-only) is resolved by handoff `HF-DB-008-VENUE-CREW-CONTRACTOR-SURFACE` because the repository's own identity map already names `organization_people` and `staff_members` as the canonical destinations.

## CP-060 — Security findings are disposed with evidence, never dismissed to satisfy a gate

- Date: 2026-09-25
- Status: accepted
- Task: INTG-006 (Wave 33, integrations section) — response to `HF-RELEASE-SEC-CODEQL`
- Decision: An open code-scanning alert is resolved by exactly one of three routes: fix a real defect inside the owning lane's file set; register a time-bounded entry in `security/security-scan-exceptions.json` with a named owner, rationale, issue, mitigation, and an explicit `productionExploitability` decision; or route it to the owning lane with the file, line, and rule id. Setting `dismissed_reason` on GitHub, adding a source-scanning suppression comment, or making a behavioural change to code that is not defective are all prohibited, because each destroys the signal without removing the risk. A false positive is recorded, not "fixed": on the integrations surface this wave triaged the only 2 owned alerts of 96 and both were recorded as `not_exploitable` after reading the executable source, and no code changed. **The GitHub Advanced Security `CodeQL` check is not a merge signal until `refs/heads/main` has a recorded analysis.** While main has zero analyses, the platform attributes the entire tree to any large pull request — 94 of the 96 alerts on PR #14 sit in files that PR never touched, and the check's own summary says so ("alerts not introduced by this pull request might have been detected because the code changes were too large"). Volume from that gate is an attribution artifact; each individual finding still requires real triage, and the baseline, not the alert count, is the actionable item.
- Reason: A gate that reports the whole repository on every large PR trains reviewers to bulk-dismiss, which is how real findings survive. The registry already exists precisely so that a disposition is auditable (`REL-104`: "Unknown exploitability cannot waive a finding"), and it was empty — the correct state when no finding has actually been triaged. The missing `main` baseline is a release/observability gap, not a per-PR code problem, so it is escalated rather than absorbed by an owning engineer.
- Consequences: The two integrations entries expire 2026-11-24 and must be re-triaged, not inherited. The discover-owned critical `js/request-forgery` at `app/api/discover/route.ts:351` remains open and undismissed, owned by the discover lane. Release owns establishing the main baseline, GHAS alert policy, and the remaining 94 dispositions; integrations owns 2 and has no authority over any of the rest. See `HF-INTG-033-CODEQL-TRIAGE-RESULT` for the per-alert routing table.

## CP-061 — Marketplace money writes must read back their own guard, and a claim only settles settled money

- Date: 2026-09-25
- Status: accepted
- Task: MKT-004 (Wave 33, marketplace section)
- Decision: A marketplace money or entitlement write that relies on a filter clause for its correctness must read the affected row back and treat an empty result as a failure, not as success. A `.update(...).eq(...).eq(...)` whose error is the only signal reports a successful mutation for a statement that changed zero rows, which turns a compare-and-swap guard into a guard that silently does nothing. Three sites now follow this: the seller refund lifecycle-audit write (`app/api/marketplace/orders/[id]/refund/route.ts`), which is the local idempotency ledger for the Stripe refund key, and the guest order-claim link (`app/api/marketplace/order/[token]/claim/route.ts`), which is the race arbiter for `buyer_user_id`. Separately, a guest order claim requires `payment_status` to be `paid` or `refunded` before it will link an order to an account or resolve that order's digital entitlements. A capability token proves *which* order the caller may claim; it is not evidence that money settled, and the order-confirmation page's `isPaid` check is a client-side affordance, not an authorization boundary.
- Reason: The refund audit write was the only record that a given `idempotencyKey` had been submitted. A concurrent transition that moved the order off `paid` made the update match zero rows, `error` stayed null, and the route answered `202` with a refund id — so the next retry with the same key took the non-short-circuit path. The Stripe idempotency key still prevented a double refund, but the audit trail lied and the route's own `retryable: true` contract pointed the caller at a retry that would re-enter the provider call. The claim route had the same shape: two concurrent claimants both read `buyer_user_id = null`, both passed the ownership check, one won the `.is('buyer_user_id', null)` update and the loser updated zero rows, reported `claimed: true`, and then backfilled the order's digital entitlements to **its own** user id. The loser was told it owned an order it did not own.
- Consequences: `app/api/marketplace/order/[token]/claim/route.ts` returns 409 and issues no entitlement update when the claim write does not land, and refuses unsettled orders with 409 before any write. `app/api/marketplace/orders/[id]/refund/route.ts` returns `refund_audit_failed` when the audit write matches no row. Both paths stay fail-closed on provider and database error. The residual shape is deliberate and now recorded: a refund still does not itself flip `payment_status` to `refunded`, because the provider is authoritative for that transition and the Stripe webhook settles it — which means the final state is webhook-dependent and cannot be certified without a hosted run. The same read-back rule is requested, but not authored, as a buyer-scoped increment RPC in `HF-DB-009-MARKETPLACE-TYPE-AND-RPC-SURFACE`, because `supabase/**` is not marketplace's to change.

## CP-062 — SEC-109 debt is relocated with the code, never deleted to satisfy the gate

- Date: 2026-09-25
- Status: accepted
- Task: MKT-004 (Wave 33, marketplace section)
- Decision: When a bare `createServiceRoleClient` import moves out of a file and into a sibling module, the reviewed-debt entry moves with it. The stale entry for the original file is removed, and a new entry is registered against the module that now owns the privileged read, with the disposition, owner, workflow id, finding id, and review date that the debt actually has. Removing the entry without registering its successor is prohibited even when the gate goes green, because it converts tracked remediation debt into an unclassified new import — the exact condition the rule exists to catch. A disposition is never chosen to silence a check: `replace_with_rpc` is recorded only when the active schema genuinely has no policy or function that can express the operation, and the rationale must name the missing primitive.
- Reason: `check:service-role-allowlist` fails on stale entries *before* it fails on unexpected ones, so a stale entry masks everything behind it. The marketplace stale entry pointed at `app/marketplace/order/[token]/page.tsx`, whose import had already moved to `app/marketplace/order/order-access.ts`. Deleting the entry alone would have turned a stale-entry failure into a new-import failure for that same file — the debt had not gone anywhere, it had been renamed out of the registry's view.
- Consequences: `app/marketplace/order/[token]/page.tsx` and `app/marketplace/order/order-access.ts` and `app/api/marketplace/delivery/[orderItemId]/route.ts` are all classified with real dispositions. The guest capability-token read is `replace_with_rpc` because no RLS policy can express an opaque token; the marketplace_entitlements download write is `replace_with_rpc` because that table has no buyer update policy and no increment function. No marketplace path now fails SEC-109. The gate still exits 1, on `app/api/venue/availability/route.ts` and `app/api/venue/reservations/route.ts` — two untracked files from a concurrent venue lane, routed as `HF-VENUE-SERVICE-ROLE-IMPORTS` rather than edited, since `app/api/venue/**` is not marketplace's working set. **The gate cannot be made green in a shared worktree by whichever lane happens to run last; it goes green when the owner of each unclassified import classifies it.**

## CP-063 — An SSRF fix is an exact-origin allowlist plus a transport that cannot follow a redirect

- Date: 2026-09-25
- Status: accepted
- Task: DISC-002 (Wave 33, discover section)
- Decision: A server route that fans out over HTTP to other routes of the same application resolves its base origin from operator configuration only (`INTERNAL_API_ORIGIN`, then `NEXT_PUBLIC_APP_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`) and matches it as an **exact origin**; the inbound `Host` / `X-Forwarded-Host` / `request.url` is never a source for the destination, and there is no localhost fallback — an unconfigured environment makes no outbound request. Callers select destinations by key from a frozen route map, so no caller-supplied value can become a host, port, scheme, or path segment. The transport resolves all DNS records, range-checks **every** one of them after normalizing alternate IPv4 encodings and IPv4-embedded IPv6 forms, then pins the connection to the validated address. Redirects are not merely disabled: the transport does not follow them and treats any 3xx as a denial. Timeouts and response-size caps are mandatory so the endpoint cannot be used as a traffic amplifier. IP-literal and loopback origins are permitted only with a non-production `NODE_ENV` and an explicit opt-in.
- Reason: Alert #16 (`js/request-forgery`, critical, CWE-918) at `app/api/discover/route.ts:351` was a real vulnerability: the base was `new URL(request.url).origin`, which reflects the inbound host header, so a caller who could set `Host: 169.254.169.254` or an octal/decimal-encoded address reached internal services through the app's own egress. A single-hop allowlist checked *before* the request is not sufficient on its own — validate-then-resolve leaves a DNS-rebinding window between the check and the connect, and a default-following client makes an allowlist on hop 1 meaningless once hop 2 is an open redirect. Both gaps are closed by resolving first, pinning the connect, and making redirect-following structurally impossible rather than configuring it off.
- Consequences: `/api/discover` now returns empty sections and logs one warning in an environment with no allowlisted origin, which is a deliberate availability trade for fail-closed behaviour; release/infra must set `INTERNAL_API_ORIGIN`. Because the same defect class exists in `app/api/hub/route.ts:82` and `lib/news/feed-service.ts:673` and **CodeQL flagged neither** — the query treats `request.url` as a remote-flow source but not `request.nextUrl.origin` — a green CodeQL run is not evidence that a self-fetch is safe. Those two are routed in `HF-DISC-002-HUB-SELF-FETCH-SSRF` and `HF-DISC-002-NEWSELF-FETCH-SSRF` with the reference implementation. The older `lib/marketplace/external-import.ts` guard is validate-then-resolve with regex-only hostname checks and no IPv4/IPv6 normalization; it is out of discover's ownership and is named here as the next consumer to migrate.

## CP-064 — The generated contract is authoritative for what exists; the migration chain is authoritative for how to get there, and neither may be reconciled by editing the other by hand

- Date: 2026-09-25
- Status: accepted
- Task: DB-008 (Wave 33)
- Decision: When product code and the generated Supabase contract disagree, the disagreement is classified into exactly one of four buckets and recorded in a machine-readable inventory before anything is changed. `stale-types`: the active chain creates the object and `lib/database.types.ts` does not declare it, so the fix is regeneration against a reconciled target. `schema-missing`: neither the chain nor the types have it and no archived definition exists, so the product code is right and an additive forward-only migration is required. `code-drift`: the object exists only in archived or out-of-chain SQL, or the repository names a different canonical replacement, so the consumer is repointed or removed. `unknown`: genuinely undecidable from the repository, recorded explicitly rather than guessed. A migration is authored only for a `schema-missing` object whose column contract is derivable from the repository, and a generated type file is never hand-edited to make a diagnostic disappear.
- Reason: The 1,384-diagnostic `tsc --noEmit` failure on d2176904 was reported by three lanes as "the generated types lack roughly 110 relations and 35 RPCs", which reads as a stale-file problem and invites the one action that cannot work. An ordered CREATE/DROP/RENAME replay of the active chain shows that only **2** of the 107 object literals `tsc` rejects are created by the chain at all; the other 105 are absent from the chain and from the types, so no regeneration can ever satisfy them. The defect is two-sided: the types are stale forward (9 relations, 16 callables), and the types are simultaneously stale backward, because `public.venue_profiles` declares 42 columns in the generated contract while the active chain creates 19. Regenerating from a chain-only target would therefore *delete* real columns from the contract. A stale-file framing hides both halves.
- Consequences: `docs/engineering/database-type-inventory-2026-09-25.json` is the durable artifact: 128 objects (107 relations/RPCs, 21 table-column pairs) classified as 107 `code-drift` / 9 `schema-missing` / 10 `unknown` / 2 `stale-types`, each with its evidence, its consumer files, whether a consumer is entry-reachable, and the canonical replacement where the repository records one. It is validated against every diagnostic in the preserved CI log. 23 handoffs route the `code-drift` and `unknown` shares to their owning domains. One migration is authored, `20260925210000_venue_profile_presentation_columns.sql`, for the only two column pairs whose contract is unambiguous (`profiles.social_links` and `tours.cover_image_url` already exist on sibling relations), and it was applied twice against a throwaway PostgreSQL 16.15 instance with its contract test returning zero violations. **Regeneration of `lib/database.types.ts` stays blocked** until the out-of-band DDL is reconciled, and CP-016 requires an applied target, which this lane did not have. A typecheck result is not claimed: a full `npm run typecheck` takes 68m18s on CI, OOMs locally, and four lanes share one 8GB machine.

## CP-065 — CP-059 applies to every storage-owned statement, and the idempotency guard is not a permission guard

- Date: 2026-09-25
- Status: accepted
- Task: DB-008 (Wave 33)
- Decision: CP-059 is the required form for **all** storage-owned DDL in the active chain, not a fix applied to whichever migration the chain happens to abort on. That means every top-level `CREATE POLICY`/`DROP POLICY` on `storage.objects`, every top-level `insert into`/`update` on `storage.buckets`, and every `pg_policies` existence check that precedes a `CREATE POLICY`. A `pg_policies` existence check is an **idempotency** guard, never a permission guard: the `CREATE POLICY` inside it must still be attempted in its own subtransaction, because a role that cannot create the policy can also reach the check and take the branch that has no handler. A migration is replay-safe only when the whole storage statement set is, so the migrations that carried a silent-loss `relowner = current_user` guard are corrected in place.
- Reason: Wave 32 fixed `20260701021033` and reported ten migrations still unguarded, but the ten do not fail the same way. Three (`20260413300002`, `20260625020000`, `20260717194541`) were recorded as "guarded" when they only had a `pg_policies` existence check around an unhandled `CREATE POLICY`, so they still abort. Four more (`20260625020000`, `20260630211500`, `20260717194541`, `20260825130000`) used the CP-059-antipattern in full: `pg_get_userbyid(relowner) = current_user` followed by `raise notice`. Measured on PostgreSQL 16.15, that combination creates **zero** policies under an owner while reporting nothing, because the guard is a strict subset of the server's `pg_class_ownercheck` and `client_min_messages = warning` suppresses the NOTICE. That is a silent security regression in the exact files that exist to close one, and it is invisible in review because the migration still exits 0.
- Consequences: Ten migrations are now guarded and proved on a throwaway PostgreSQL 16.15 cluster (`supabase/tests/db008_storage_replay_guard.harness.sh`, 10/10 pass): every original form aborts under a non-owner replay role, every guarded form completes with a `sqlstate`/`sqlerrm` warning, the owner-applied policy set is identical to the original wherever the original worked (75 policies across the ten), the form is idempotent over three applies, and **5 policies are recovered** from the four files that had silently created none. `supabase/tests/db008_storage_replay_guard_contract.sql` fails closed on the absence of any of those policies, so a target that skipped them cannot pass. The changes to already-applied migrations are replay-safety only: no policy name, expression, grant or bucket is added, removed or altered, and the transform is purely a move of statements into `do $tag$ ... $tag$` blocks. A drop/create pair always shares one subtransaction, so a refusal cannot leave a bucket's write policy removed. Bucket seeds are guarded too, which closes the `insert into storage.buckets` residual Wave 32 recorded. The harness asserts its own post-reset state, because an earlier revision passed 7/7 while the emulation had failed to rebuild and every assertion was vacuous.

## CP-066 — A consumer liveness claim in the type inventory is a hypothesis until an import-graph walk re-derives it

- Date: 2026-09-25
- Status: accepted
- Task: WORK-005, WORK-006, WORK-007, WORK-008, WORK-009 (Wave 34, work section)
- Decision: A consumer file is LIVE only when a Next entry point (route/page/layout/loading/error/not-found/template/default, middleware, instrumentation) reaches it through resolved `@/` and relative import specifiers. A route handler is an entry by definition, so "no importer" never makes a route dead. A claim is only actionable after that walk re-derives it, and a name match in a comment is not a consumer. A wave's file grant overrides the owning domain's `WORKING_SET.json`: a defect in a path the grant withholds is handed off with an exact `file:line` and a proven recipe, never edited.
- Reason: The DB-008 inventory attributes `marketplace_post_attachments` to two LIVE consumers, `lib/events/canonical-event-service.ts` and `lib/logistics/plans.ts`, carrying the whole 18-hit logistics cluster. Neither file contains the object name anywhere in the working tree, and `git status` shows both unmodified from the CI SHA the log was produced at, so those hits are downstream type noise from a relation that resolves to an error type — not references. Following the inventory literally would have sent three lanes to edit files with nothing to fix. The same pass cleared one false positive of the opposite kind: `lib/services/hiring-onboarding.service.ts` matches `staff_applications` at line 345, but only inside a comment, on a LIVE module that makes no query to the retired table, so it must not be deleted or repointed. And the work lane's own drift cluster turned out to contain **zero** consumers inside its file grant, which is precisely the situation the grant rule exists for.
- Consequences: The work lane deleted nothing and repointed nothing in the cluster, and says so rather than claiming credit for files it does not own: `HF-WORK-034-VERIFIED-DEAD-STAFF-MODULES` carries the re-derived zero-importer evidence for the retired workforce modules so their deletion does not rest on one lane's static analysis, `HF-WORK-034-MARKETPLACE-POST-ATTACHMENTS` corrects the logistics reference set and names the one live route and one verifiably dead module that remain, and `HF-WORK-034-HIRING-JOB-POSTING-TEMPLATES-COLUMN` hands the last `application_form_template` reference to whoever owns `app/api/hiring/**` with a one-line embed repoint already proven twice elsewhere in the repo. The only fix the work lane applied this wave was to its own file, `GET /api/jobs` merge mode, where a second truncation sat under the first: the per-source window was offset-derived but ordered by `sort_by`/`sort_order` while the unified list is `created_at DESC`, so `?merge=1&sort_by=title` fetched a window that could omit the newest listing. Merge mode now pins both sources to the merge key with a deterministic `id` tiebreak, and 2 of the 3 new tests fail when that is reverted.

## CP-067 — A privileged client that a route genuinely needs is registered as classified debt with its rationale recorded, not refactored onto a helper whose scope key the route does not have

- Date: 2026-09-25
- Status: accepted
- Task: VENUE-004, VENUE-005 (Wave 34, venue section)
- Decision: CP-062 governs how SEC-109 debt is *relocated*. This entry governs when the
  refactor CP-062 prefers is actually available. `executeServiceRoleJob({ orgId, reason,
  moduleId })` is adopted only when the call site can supply all three truthfully: a
  verified organization that exists in `organizations`, an allowlisted module id, and an
  operation that the org/RLS boundary is designed to express. A route that is scoped by a
  different key — a `venue_profiles.id` here — keeps its bare client and is registered in
  `lib/supabase/service-role-legacy-imports.json`, the registry the SEC-109 check names in
  its own failure message. "A helper exists" is not a fit; the scope key is the fit test.
- Reason: `executeServiceRoleJob` throws `org_not_found` unless the supplied `orgId`
  resolves in `organizations`. `venue_profiles` has no `organization_id` column; the only
  link is `settings.operational_org_id`, which `ensureVenueOperationalContext` lazily
  *provisions* on first call. Adopting the helper would therefore have 500'd the entire
  availability editor for any venue account that had not yet run that provisioning — a
  security-shaped refactor that introduces an availability regression — while its `target`
  block (eventId/tourId/saleId only) could not re-assert venue scope even in the success
  case. Meanwhile the client role genuinely cannot do the work: VENUE-005's authored
  migration revokes client SELECT on both raw tables. The import is load-bearing.
- Consequences: SEC-109 exits 0 across the tree
  (`195 production files: 182 historical, 31 reviewed remediation debt, 1 low-level
  factories`), satisfying CP-062's rule that debt is classified, never deleted to satisfy
  a gate. Because `service-role-legacy-imports.json` is a flat path array with no field for
  a disposition, the owner, rationale, and review date are recorded in
  `docs/engineering/agents/venue/DECISIONS.md` (VENUE-D05) and the VENUE-004/005 task
  records rather than in the file; moving them into
  `lib/supabase/service-role-import-review.json` is routed to that registry's owner in
  `HF-VENUE-SEC109-DISPOSITION-REGISTRY`, because the file carries a concurrent lane's
  uncommitted edits and is outside the venue grant. A route adopting this helper in future
  must first establish that every caller of the boundary has a real, existing `orgId` — for
  venue surfaces that is a database-owned provisioning question, not an app refactor.

## CP-068 — A code-drift cluster is cleared by repointing to a chain-created object or by deleting an unreachable consumer; the inventory's canonical replacement is a starting hypothesis, and "no replacement" is not evidence that none exists

- Date: 2026-09-25
- Status: accepted
- Task: VENUE-005 (Wave 34, venue section)
- Decision: Extends CP-064 and CP-066 for the consumer side of a `code-drift` object. Three
  dispositions, in order: (1) if the active chain creates an object whose columns can carry
  the call, repoint and record the column mapping; (2) otherwise, if the consumer is not
  entry-reachable, delete it — a repointed dead module still has to be kept correct forever
  and still ships its diagnostics; (3) otherwise hand off with exact `file:line` evidence.
  A migration is never authored to resurrect an archived object, and a name in the
  inventory's `tscFiles` list is never treated as a consumer without re-deriving it.
- Reason: The DB-008 `venue` cluster carried seven objects and 135 diagnostic hits. Four
  were labelled live; re-derivation from the current bytes found `app/api/ticketing/webhook/route.ts`
  does not reference `track_venue_profile_view` and that `app/setup/page.tsx` and
  `app/services/events.service.ts` do not reference `event_team_messages`, so the real live
  set was one file. `venue_shift_templates` was recorded with `canonicalReplacement: null`,
  but `20260413200000_port_missing_tables.sql` does create `venue_recurring_shifts` with a
  column superset of the archived table, and the repo's own scheduling service already
  targets it in the adjacent method — so the correct action was a repoint, not a handoff.
  Conversely `event_team_messages` had to be deleted rather than repointed onto
  `event_group_messages`: that table's only policy is `service_role` full access, so
  repointing a **user-session** server action would have converted a missing-relation error
  into an RLS denial while looking like a fix.
- Consequences: 104 of the 135 cluster hits were removed with one zero-importer deletion
  (`lib/venue/staff-management.service.ts`, 0 importers proven by a whole-tree import and
  symbol scan, not asserted), 10 with the dead venue event-chat subtree, and 7 with one
  repoint — measured 2 `tsc` errors before, 0 after. The remaining 14 hits sit in files the
  venue grant withholds: `lib/services/**` to the design-system lane
  (`HF-DB008-TYPECHECK-VENUE-SHARED-LIB-SURFACE`) and `app/api/venues/[id]/route.ts` to the
  next venue task with that path grant
  (`HF-DB008-TYPECHECK-VENUE-PUBLIC-PROFILE-VIEWS`). That last one exposes a standing gap:
  the venue `WORKING_SET.json` lists `app/venues/**` and `app/api/venue/**` but not
  `app/api/venues/**`, so a public venue profile route is unowned by path even though the
  charter names public profiles as venue work. `__tests__/venue/venue-code-drift-cluster.test.ts`
  locks the outcome: object absence is asserted with a **DDL-shaped** regex, not a
  substring, because `20260414223233` lists `event_team_messages` as a bare string in a
  `to_regclass`-guarded lint array and a substring assertion would have been satisfied by
  nothing. No regeneration is claimed: the database lane still owns the type surface, and
  no hosted evidence is claimed anywhere — all 718 QA-004 coverage rows remain `not_run`.

## CP-069 — A clean scanner run is not evidence of absence: a defect class found by one sink is re-grepped for its unflagged siblings, and a green gate never substitutes for the grep

- Date: 2026-09-25
- Status: accepted
- Task: DISC-002 (Wave 34, discover section)
- Decision: When a security defect class is identified in one sink, the same class is treated as present until every sibling sink has been read and either fixed or recorded as a blocker — regardless of whether the scanner flagged it. CP-063 recorded the discovery; this entry makes acting on it the rule. Concretely: `js/request-forgery` treats `request.url` as a remote-flow source but not `request.nextUrl.origin`, so a scan reported exactly one `js/request-forgery` alert on the PR while the identical defect existed at `app/api/hub/route.ts` and `lib/news/feed-service.ts`, neither flagged. The same pattern applies to a sanitizer class: a fix landed for one call site of a shared ordering defect is not a fix for the class. In both cases the correct act is to port the one guard, not to author a second approach, and to keep the deny-log discipline (route key and reason only, never a parameter value and never a resolved URL).
- Reason: Alert #16 was found because a human read the route, not because the scanner found everything. The scan reported one clean-for-this-class file that was in fact the third-worst instance of the defect. A rule that has a known blind spot is a tool for finding what it can see, and the gap has to be closed by search, not by the absence of a finding. The same reasoning applies in reverse: a *registry disposition* is not a dismissal and a *local code fix* is not a re-scan, so neither may be reported as a closed alert.
- Consequences: Both unflagged siblings are now fixed in place by porting the CP-063 guard unmodified, with the frozen route map extended rather than a second guard written (25 new tests; every rejection path asserts zero sockets were opened). Both handoffs moved from `pending/` to `completed/` as consumed, and the news one split the residual code-sanitization cluster into a new routing handoff instead of leaving it silently inherited. The reusable rule for future waves: after fixing a security defect class, grep for its other sources before reporting the lane done — and state the scanner's blind spot explicitly in the decision record so the next lane does not re-derive it.

## CP-070 — A drift measurement is a claim about an instrument, so the instrument is pinned before the claim is believed

- Date: 2026-09-26
- Status: accepted
- Task: DB-008 / DB-011 (Wave 34, database lane)
- Decision: When a database lane reports schema drift between the active chain and a generated contract, the report is a claim about the *measuring instrument* as much as about the schema, and the instrument is validated before the finding is acted on. Three requirements, all runnable:
  1. **Positive controls.** The instrument must be pinned on cases that MUST be detected, chosen to cover each defect class it has ever exhibited. The Wave 33 column replay is pinned on an upper-case multi-clause `ALTER`, a lower-case multi-clause `ALTER`, a column added beside `alter column ... drop not null`, a single-clause upper-case `ALTER`, and the newest migration in the chain.
  2. **Negative controls on the gate, shaped to the property being tested.** A superset check ("is the chain a superset of the contract?") can only be broken by an *addition* to the contract. A control that removes contract entries proves nothing, because a removal makes the contract a smaller subset and the gate still passes. Controls for this gate add a column, a relation, a callable and a view column; a fifth control asserts that a removal is *tolerated*, so an over-strict gate is also caught.
  3. **Cross-implementation agreement.** Where two independent scanners reconstruct the same quantity, they must agree, and the harness runs both. Where an attribution is produced, an independent audit re-reads the cited file and requires it to mention both the relation and the column.
- Reason: Wave 33 reported, as the decisive launch-blocking finding of the effort, that `public.venue_profiles` declares 42 columns in the generated contract and only 19 are created by the active chain, so a chain-only regeneration would *delete* real coverage. The correct instrument says 44 chain columns, every one attributed to a named active migration, and **zero** contract columns anywhere in the repository without chain provenance. Four separate defects in one 138-line script produced the false finding: `add column` was matched case-sensitively inside `matchAll()` so every upper-case-DDL migration contributed nothing, the keyword `constraint` was recorded as a column name, `alter table if exists` before a relation's `CREATE` was treated as having created it, and DROP/CREATE events were applied in per-kind loop order rather than file order, so `drop view; create view` in one migration inverted. The number was confidently wrong in the direction that mattered most, and nothing in the pipeline could have told me. The same wave also produced a harness that passed 7/7 while its emulation had silently failed to rebuild — the Wave 33 method note about asserting post-state is the general form of this decision.
- Consequences: `supabase/tests/db008_chain_contract_replay.mjs` replaces the Wave 33 column replay and is gated by `supabase/tests/db008_contract_reproducibility.harness.sh` (33 checks: 13 instrument self-assertions, 5 negative controls including the tolerated removal, 6 post-state re-assertions), with `supabase/tests/db008_contract_attribution_audit.mjs` independently re-verifying 5170 attributions with 0 unsupported. The Wave 33 blocker is retracted in `docs/engineering/database-type-inventory-2026-09-25.json` with the defect list attached, and the *inverse* finding is recorded: 54 chain columns, 13 relations and 42 callables exist in the chain and not in the contract, which regeneration would add. Two defects in the Wave 33 surface replay were also corrected (contract callable count 125 → 100, because it only counted functions with a literal `Args: {` block). The residual weakness is stated rather than hidden: 13 view relations are proven by column-name occurrence in their defining migration, not by replaying the SELECT list, and that is the one surface where a regeneration could still remove coverage.

## CP-071 — A table that no migration creates but every route reads is a P0, and reconciling it means capturing the archive plus the caller's own writes, never a plausible column list

- Date: 2026-09-26
- Status: accepted
- Task: DB-011 (Wave 34, database lane)
- Decision: When product code reads or writes a relation that no active migration creates, the reconciliation takes its column contract from exactly two sources and no others: (a) the archived, reviewed migration the repository already classifies as real-but-unapplied work, and (b) the columns the calling code demonstrably writes. When the two disagree, the CALLER wins and the difference is recorded as an explicit, named departure in the migration header and the validation manifest. A column that neither source names is never added. Separately: a reproduction is authorized only where the archived design's stated intent is not achieved by the archived DDL — a comment asserting a column is excluded from a policy that cannot exclude columns is treated as a defect to fix, not as intent to reproduce, and the fix must narrow rather than widen access.
- Reason: `marketplace_checkout_attempts` is recorded `local_only_unapplied` in the pre-reconciliation archive, so the archived DDL looks like the answer. It is not the whole answer: `app/api/marketplace/checkout/route.ts:467` writes `guest_email` in the same upsert that claims the idempotency key, and the archived table has no such column. Reproducing the archive verbatim would have produced a table that still fails checkout, one step later than the failure the marketplace lane had already proved. The symmetric error is the one this lane refused in Wave 33: inventing a column contract to silence a type error. Both are avoided by the same rule — the contract comes from a caller or from a reviewed archive, and the provenance of every column is one of those two. The narrowing rule has the same shape: the archived `marketplace_external_listings` public-read policy carried a comment claiming `canonical_url` was excluded from it, which a `USING` predicate cannot do, so reproducing it would have exposed the destination URL to anonymous callers. It was replaced with a column-limited view.
- Consequences: Three migrations authored and **executed** on a throwaway PostgreSQL 16.15 cluster with the real chain migration `20260410120000_marketplace_core.sql` applied verbatim, each applied twice for idempotence, 33/33 harness checks passing with 5 negative controls and a post-state re-assertion. `marketplace_checkout_attempts` (10 columns), six P6 guest-checkout columns on `marketplace_orders`, `marketplace_external_listings` and `marketplace_external_clicks` are now in the chain; `public.record_marketplace_entitlement_download` replaces the service-role compare-and-swap with one `UPDATE` whose `WHERE` carries `buyer_user_id = auth.uid()`, `status = 'active'` and `download_count < max_downloads`, with `search_path` pinned and `EXECUTE` revoked from PUBLIC and anon — the DB-002 lesson applied at author time rather than after an advisor finding. Two decisions are routed to the marketplace lane rather than guessed: whether `max_downloads = 0` means unlimited (the route says yes, the function says no), and the switch to the authenticated client (a service-role JWT has no `sub`, so `auth.uid()` would be null). The remaining 61 marketplace surface items are inventoried by `supabase/tests/db011_marketplace_local_only_disposition.mjs` and left explicitly open. No hosted apply, no regeneration and no typecheck is claimed.

## CP-072 — A column-drift repair repoints the reader, and a guard that stops working is a decision, not a diff

- Date: 2026-09-25
- Status: accepted
- Task: ADMIN-003 (Wave 34, admin lane)
- Decision: Two rules govern a database column-drift repair on an admin surface. **(1) Repoint, do not reconstruct.** When a code-drift object is absent from both the active chain and the generated contract, the fix is to point the reader at a column or relation the repository already uses, and the repair is only correct if the destination is proven rather than plausible. `profiles.display_name` was repointed to `profiles.full_name` (the column the signup triggers actually write) and `profiles.primary_genres` to `artist_profiles.genres`, using the two-query shape `app/api/admin/artists/route.ts` already uses, rather than adding a column. **(2) Distinguish a broken guard from a bypassed one, and never let a typecheck decide.** A repair that changes which resource a guard is evaluated against is not a drift repair, it is an authorization change, and it escalates to an owner decision even when the typechecker is pointing straight at it. The Wave 34 rule is: fix the reader, fail closed on the reader, escalate the guard.
- Reason: Both halves were forced by real evidence in one cluster. `profiles.phone` does not exist — `profiles` has `show_phone`, a boolean privacy flag, which is exactly the shape that makes a naive repoint dangerous, since `show_phone` would typecheck and return garbage. The genuine home of a user's phone is `auth.users.raw_user_meta_data`, unreadable from the cookie-scoped client the route used, so the honest repair was to stop claiming to read it and take the phone from the request, plus to fail closed: the route previously discarded the read error, so `existingUser` was always null and it wrote a fabricated `Existing User` name and an empty email into `staff_onboarding_candidates` — a staffing record that was silently wrong, not absent. That is the same class of defect as a bypassed guard, and it needed a test asserting *nothing is written*, not one asserting a 4xx. On the other side, `site-maps/import` calls `has_entity_permission(user_id, entity_type, entity_id, permission)` where the chain declares `p_user_id, p_entity_type, p_entity_id, p_permission_name`. The typechecker names the fix in its own message. Applying it would convert an unconditional 403 into a real permission evaluation on a route ADMIN-003 has already recorded as deferred for having no acting-org resolution, and would leave the no-scope branch — omit both `eventId` and `tourId` and the handler writes a site map with `event_id` null for any authenticated user — still unguarded. That is a visibly broken route becoming a subtly unowned one, which is strictly worse than the current state and worse than the honest 403. The same reasoning covers `task-messages`, which reads `eventId` from `pathname.split('/')[5]` (the literal `task-messages`) instead of index 4, so its ownership gate never matches a real event and the route denies every legitimate assignment.
- Consequences: Three repairs, all with the guard untouched: `add-existing-user` now fails closed with 502 on a read error and 404 on a missing profile and writes nothing in either case; `tours/artists` keeps `tour.view` and its response shape while reading only real columns and resolving genres from `artist_profiles`; `task-messages` keeps `withAuth` and its fallback chain, now `full_name → username → 'Admin'`, so task messages stop being attributed to the literal string `Admin`. 13 tests, including a hard-coded copy of the `profiles` column list used to assert that no future select can name a column that does not exist — the necessary belt-and-braces, because `withAdminCapability` hands handlers an `any` client and `createClient` is called without a `Database` generic, which is precisely why `display_name` and `primary_genres` produced **zero** tsc diagnostics while breaking the routes at runtime. The two guard defects are escalated in `HF-ADMIN-034-EXTERNAL-CODE-DRIFT-BLOCKERS` as OB-1 and OB-2 rather than fixed, and the `task-messages` index defect is pinned by a named regression test so it cannot be silently changed without the decision. Also recorded there: `bookings` has at least 5 live consumers including a payment route, not the 2 the inventory claims.

## CP-073 — Artist surfaces read only in-chain relations, and a "live consumer" claim is verified by the import graph, not by the inventory

- Date: 2026-09-25
- Status: accepted
- Task: ARTIST-005 (Wave 34, artist lane)
- Decision: Three rules govern the artist lane's share of the DB-008 code-drift work. **(1) The canonical artist media store is the EPK document.** Public artist and band galleries read `artist_epk_settings.settings.photoItems` — the same document `app/artist/epk/page.tsx` writes and `lib/services/epk.service.ts` reads back — instead of `artist_photos` / `artist_videos`, which the active chain never creates. **(2) Artist stats are derived, never fetched by a missing RPC.** The `get_enhanced_artist_stats` call is gone from both the public profile and the artist dashboard; the numbers are computed from the canonical rows already loaded (`artist_music.stats`, `events.revenue`, `profiles.followers_count`, `artist_financial_transactions`, `collaboration_projects`, `marketplace_listings`), and `engagementRate` is a follower-normalized like percentage rather than a stored value. **(3) Crew is `staff_members` linked by `event_participants`, and a liveness claim is proven by the import graph before a file is deleted or a call is repointed.** `event_staff` and `event_crew_assignments` both resolve to a `staff_members` person record plus the chain's own event roster `event_participants` (`event_id -> events.id`), with the artist/venue crew destination `organization_people` (WORK-102) recorded as the long-term target. Every delete in this wave was preceded by an import-graph resolution that returned zero importers, and the inventory's own `consumerVerdict` was overruled in two places where the graph disagreed.
- Reason: Each rule was forced by evidence rather than preference. The gallery repoint is not a rename: the previous read failed at the data boundary on every request, and `lib/services/epk.service.ts:482-503` already treats `artist_photos` as an optional table with an `isMissingTableError` fallback to `settings.photoItems` — the repository had already recorded the canonical destination and the public page had simply never been repointed. The stats rule exists because the RPC is defined only in `supabase/migrations/archive/fix_artist_music_upload.sql` and `supabase/optimize-artist-backend.sql`; the dashboard's own fallback counted three more non-existent tables, so both paths returned zeros and the "artist has no content" symptom was indistinguishable from an empty artist. The liveness rule exists because the inventory attributed `events.cover_image_url` to `app/artist/events/actions/marketing.ts`, which contains no such reference, and attributed `profiles.custom_url` to `lib/public-artist/get-public-artist-profile.ts`, which contains no such reference at HEAD or in the worktree; the same file attributed `bookings` to `app/api/artist-jobs/[id]/applications/route.ts`, which reads `artist_jobs`. For column objects the inventory's `tscFiles` is a file-level attribution, not a line-level one, so acting on it without a scoped typecheck would have produced three wrong "fixes". `event_tasks` was deliberately NOT repointed to the near-identical `logistics_tasks` even though the same lane reads that table on the event detail page: `logistics_tasks.type` is `NOT NULL` with a seven-value check that has no general-task value, and `assigned_to_user_id` references `auth.users` while the operations UI supplies a `staff_members` id, so the repoint would have typechecked and then failed every insert.
- Consequences: Eleven artist objects are repointed, one is retired with a loud error, and three verified-dead files are deleted. `contexts/artist-context.tsx` `createContent('video')` now throws instead of writing to a table that does not exist, and `'photo'` / `'merchandise'` write to the EPK document and `marketplace_listings` through the same field mapping `app/api/marketplace/migrations/backfill-artist-merch/route.ts` already uses. `app/artist/events/[id]/page.tsx` now reads `logistics_tasks.status`, `artist_financial_transactions.type` + `occurred_at` (scoped by `user_id` and `source_id`, so authorization happens at the boundary), `venue_profiles` and a `booking_requests` row without `venue_id`. The artist event crew actions gained a server-side `assertEventScope` ownership check they never had. Two artist objects are explicitly NOT fixed: `event_tasks` and `event_equipment` are schema-missing, and their exact column contracts are delivered in `HF-DB008-SCHEMA-MISSING-ARTIST-CONTRACT` rather than guessed. The `artist_videos` gallery is gone with no replacement, because no in-chain relation stores artist video; that is a product-visible change and is escalated rather than papered over. The events cluster and `bookings` are routed out in `HF-ARTIST-DB008-UNREACHABLE-CONSUMERS` because no lane owns `app/api/events/**`, `lib/events/**`, `app/api/analytics/**` or `app/api/calendar/**`.

## CP-074 — A dead-code sweep is bounded by path ownership, not by the import graph alone, and a module with a zero-importer count can still be undeletable

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-034 / DESIGN-037 (Wave 34, design-system lane)
- Decision: When one lane owns an orphaned subtree for a wave, the sweep is decided by **three** tests, not one. **(1) Deletion requires zero importers, re-proven by a second, different extraction path** and an exhaustive repository-wide reference sweep for both filename and bare stem across every file type — a count handed to a lane, including a peer lane's count in the same wave, is a hypothesis, not evidence. **(2) Zero importers is necessary but not sufficient:** a test in another lane's path may assert on the module's *source text* rather than import it, and a module whose only importers are themselves unreachable but owned by another lane must not be deleted, because that trades its diagnostics for a new `TS2307` in a file this lane does not own. **(3) A module that is zero-importer and type-clean and domain-owned by a concurrently running lane is deferred, not taken** — collision risk for zero diagnostic gain is a bad trade in either direction. Every surviving module then carries exactly one disposition and a per-file reason, and a regression test guards the sweep.
- Reason: The `library` code-drift cluster named in `HF-DB008-TYPECHECK-LIBRARY` as 48 orphaned objects (712 diagnostic hits) turned out to be reachable only through `lib/services/**`. The sweep removed **15 zero-importer modules / 5,554 lines and repointed 1**, eliminating **211 measured primary tsc diagnostics** (209 with the deletions, 2 from the repoint) and 23 database objects' last on-disk reference. It would have gone wrong in three specific ways without rules 1–3. The brief's own count ("60 objects, 28 live") disagreed with the artifact of record (48 objects, 16 live) and was discarded. Two zero-importer modules are pinned by `readFileSync` assertions in other lanes' test paths (`__tests__/admin/content-hub.test.ts:216`, `__tests__/social/profile-follow-route.test.ts:151`), which an import-graph-only sweep breaks silently. And the single largest remaining item, `lib/services/mfa.service.ts` at 40 measured diagnostics, is blocked solely by `__tests__/integrations/mfa.service.test.ts` — deleting the service without retiring the test would have converted 40 object diagnostics into a module-resolution failure.
- Consequences: The durable inventory is `docs/engineering/agents/design-system/lib-services-inventory-2026-09-25.json` (92 rows, one disposition each, with importer evidence and per-file measured diagnostics). The guard is `__tests__/design-system/lib-services-orphaned-pile.test.ts` (5 tests), and **its negative control was run**: injecting a file that imports a deleted module makes it fail, and removing the probe returns it to 5/5. Twelve dead-but-imported modules are handed off per owner in `HF-DESIGN-034-DEAD-IMPORTER-OWNERS` — with `hooks/use-mfa.ts` and the MFA test flagged as *unowned generic `hooks/` and `__tests__/integrations/` paths that need an owner assigned*, since the unlock for 41 diagnostics currently belongs to nobody. The regression test's missing-import check is the general guard for every future sweep in this repository, not only this one.

## CP-075 — A type-drift lane repoints only onto a named object; where the repository records no destination, the handoff is the deliverable

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-034 / DESIGN-037 (Wave 34, design-system lane)
- Decision: A code-drift fix is a repoint **only** where the repository already names the canonical destination and that destination exists in the active chain or the generated contract. A lane that owns shared services but not the type surface does not author schema, does not edit `lib/database.types.ts` or any `types/**` file, does not resurrect an archived object, and **does not choose a new home for an object that has none**. For those, the deliverable is a handoff naming the object, the classification, and the consumer `file:line`.
- Reason: Of the objects still referencing `lib/services` after the sweep, **50 remain and 28 have `canonicalReplacement: null`** in the database lane's artifact — including `user_skills`, `artist_merchandise`, `artist_works`, `collaborations`, `tracks`, `skill_categories`, `job_board_postings`, `organization_job_postings`, `admin_roles`, `create_post_with_context`, `artist_photos`, `artist_videos`, `content` and `post_templates`. Inventing a destination for any of them would have converted a visible, attributable drift diagnostic into a silent wrong-table read, which is strictly worse than a compile error. Two objects were independently confirmed to be genuinely undecidable rather than merely unrecorded: `hiring_candidates` and the three `user_mfa_*` tables have **no `CREATE TABLE` in the active chain, in `supabase/migrations/archive/`, in `supabase/migrations_backup/`, in `supabase/migration-archive/`, or in `scripts/`**. The one repoint that was made — `venue_profiles.name` → `venue_profiles.venue_name` in `lib/services/staff-onboarding.service.ts` — was verified three ways: the database lane's recorded replacement, `lib/database.types.ts` (`venue_profiles.Row` carries `venue_name` and no `name`), and `supabase/migrations/20260721120000_venue_profiles_url_slug.sql:5`, which names `venue_name` as the correct column and `name` as wrong. It needed no schema change.
- Consequences: One repoint, 28 explicit non-decisions. `HF-DESIGN-034-SCHEMA-NO-HOME` carries `hiring_candidates` and the MFA cluster to the database lane with the exact verification command, and the colliding objects (`staff_applications`, `staff_jobs`, `user_skills`, `artist_merchandise`) are handled by each lane repointing only its own files. Two **stale attributions in the database lane's artifact** were found and reported without editing that read-only file: `pending_password_resets` was attributed to `optimized-notification-service.ts` and `submit_verification_request` to `venue.service.ts`, but `git show HEAD` shows neither reference and both files are clean at HEAD. The artifact is derived from a CI log of a different tree revision, so per-object file attributions must be re-verified against the working tree before being acted on. Deleting `password-management.service.ts` incidentally removed the only on-disk consumer of `pending_password_resets`, so that `schema-missing` object now needs no schema decision at all.

## CP-076 — In a multi-lane wave, a drift reduction is measured with scoped tsc and is always labelled as scoped

- Date: 2026-09-25
- Status: accepted
- Task: DESIGN-034 / DESIGN-037 (Wave 34, design-system lane)
- Decision: When a full `npm run typecheck` is prohibited (CI 68m18s, 1,384 primary diagnostics across 197 files, OOMs on an 8GB box shared by six lanes), the sanctioned measurement is a **scoped** tsc: a generated per-run tsconfig whose `include` is exactly the named roots and which inherits the repository's own `compilerOptions`. Each run records `tsFilesParsed` so a short-circuiting invocation cannot be mistaken for a clean one, and a scoped figure is never presented as a whole-repo total. A peer lane's per-object `tscDiagnosticHits` is never summed — tsc repeats the rejected literal inside the printed overload union, so those figures overlap by construction.
- Reason: Without a real instrument the lane would have had to report an estimate, and an estimate is indistinguishable from a measurement in a handoff. Scoped tsc produced the 211-diagnostic figure per file, and — more usefully — proved that **no diagnostic migrated into surviving code**: `venue.service.ts`, `artist.service.ts` and `account-management.service.ts` measured 29 primary diagnostics before the deletion and 29 after, with an identical `byCode` distribution, which also confirms the work lane's report of 29 pre-existing errors at HEAD. It also caught a false clean: one early run returned 0 diagnostics in 3.2s and would have been believed had `tsFilesParsed` not exposed it as a short circuit.
- Consequences: The 1,384-diagnostic whole-repo baseline is **still unmeasured** and must be re-measured by a lane that can afford a full run; every task record and handoff from this wave says so explicitly. `npm run check:migration-validation` was observed **red (exit 1)** at the start of the wave — all four failures belonging to the marketplace lane's three brand-new untracked migrations and their three missing manifests — and went green on its own when that lane wrote the manifests at 14:30–14:32. It is recorded as a transient concurrent-lane condition rather than a defect, and the task record was corrected rather than left claiming a failure that no longer reproduces.
