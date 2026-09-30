# Verified live-event role progression — review handoff

Date: September 30, 2026. Branch: `feat/verified-role-progression-20260930`.
Base: PR #15 workforce-role catalog branch at `7d5eb6810fb9625d05da37f69bcf1a5efee3744a`.
Status: implementation and isolated tests complete; production migration, merge, and full staging acceptance remain for review.

## Audit and integration decisions

The local main development checkout contained substantial unrelated staged, modified, and untracked work. This branch was made in an isolated shallow, sparse clone of the published workforce-role branch, without copying or changing that work. Disk space prevented a full clone. There is no `AGENTS.md` or `docs/engineering/INDEX.md` in the published PR #15 snapshot; this handoff records the audit and implementation checkpoint.

| Existing surface | Finding | Integration |
| --- | --- | --- |
| `lib/services/achievement.service.ts`, `app/api/badges/route.ts`, `app/api/endorsements/route.ts`, `components/achievements/team-badge-endorsement-panel.tsx` | Generic grants and endorsements accept manual recognition. Neither a hire nor successful live execution is mandatory. | Keep existing data and behavior. Do not treat these grants, peer endorsements, metrics, points or rewards as verified work credit. Add a clearly separate verified-work panel and ledger. |
| `supabase/migrations/20260327123000_achievements_engine_catalog.sql`, `20260409170000_work_achievements_rewards_resume.sql` | Existing achievement tiers and reward/resume infrastructure measure activity such as applications, hires, tasks and document uploads. | No changes to points, rewards or resume tables; progression is derived exclusively from the new verified ledger. |
| `lib/services/hiring-eligibility.service.ts`, `applicant-profile-snapshot.service.ts` | Older eligibility reads `endorsements`; applicant snapshots also read `skill_endorsements`. These are separate from event execution. | Preserve compatibility. No new automatic hiring gate or conversion into old endorsements. New recognition API supplies authoritative role experience. |
| `supabase/migrations/20260610000300_credentials.sql`, `lib/credentials/credentials.ts`, `lib/security/employee-credentials-vault.ts`, worker onboarding/profile services | Physical access credentials and onboarding compliance are distinct from professional experience. Sensitive documents must stay in their existing vault. | Badge levels never grant access, change Work Mode permissions, authorize regulated work, or replace an expiring license. Managers attest operational credential checks in completion evidence. No credential contents are copied into public displays. |
| `lib/services/hiring-roster.service.ts`, hiring approval/onboarding and candidate assignment services | Staff records and `employment_assignments` are created by approved onboarding or manual roster hiring. Onboarding completion commonly activates a worker; it does not prove event delivery. | Require a matching active/inactive hired staff record for the same user and employer. Preserve the assignment and roster IDs as provenance. No award at onboarding or application acceptance. |
| `supabase/migrations/20260609000200_employment_assignments.sql`, `20260710195437_employment_assignments_staff_shift_id.sql`, `20260719195500_employment_assignments_tour_id.sql`, `20260930152000_workforce_role_definition_fields.sql` | Assignments carry worker, employer, role, event/tour, work window, shift and snapshots. Legacy worker UPDATE policies are broader than status acceptance. | Add a trigger that permits worker accept/decline of invitations while rejecting worker changes to role, scope, hire provenance, work window, and completion status. Managers and service workflows continue to operate. Successful verification transaction marks an assignment completed. After verification, provenance is protected against employer/worker rewriting or assignment reuse; new work needs a new assignment row. |
| `lib/services/staff-shift-assignment-sync.ts`, workforce people service and roster | Completed shifts can leave the assignment `confirmed`, rather than `active`. Workforce lists are assembled from several sources. | Accept confirmed assignments only with a linked completed shift belonging to the hired staff member. Active/completed assignments remain eligible for manager attestation. The manager panel is mounted on the workforce roster. |
| `app/api/events/_lib/events-v2-admin.ts`, canonical event/tour migrations | `events_v2` uses `settled` for completion. `archived` also represents cancellation, despite UI mapping it to completed. Assignment event FKs still refer to legacy `events`. | Resolve `events.promoted_event_v2_id`, or an identical canonical UUID, explicitly. Require settled status and an elapsed canonical end time. Do not infer identity from title/date. Never award archived/cancelled work. Unpromoted legacy events must be reconciled through the existing event producer flow first. |
| `tour_events`, `tours` | Canonical stops point to `events_v2`; a tour may span many events. | Infer a stop's tour from `tour_events`. Reject mismatching or ambiguous memberships. Require tour-wide assignments to have a completed tour with its final date already passed. Avoid overlapping tour-wide and stop-level family credit. |
| `components/achievements/profile-achievements-section.tsx`, `/achievements` | Existing profile and worker recognition displays share achievement components. | Mount verified badges, endorsements, history and opt-in sharing alongside existing recognition. Private by default. |
| `lib/auth/hiring-permissions.ts`, `public.can_manage_hiring`, entity RBAC | Employer management is scoped to venue/organization/artist. | Database RPC derives verifier from `auth.uid()` and calls the canonical database permission function. No request-supplied actor, service-role shortcut, client metadata or unrestricted admin override. Event/tour scope must additionally match employer context, creator, or entity permission. |

## Progression model v1

| Level | Name | Verified credits | Distinct live contexts | Distinct employers |
| --- | --- | ---: | ---: | ---: |
| 1 | Qualified | 1 | 1 | 1 |
| 2 | Experienced | 5 | 3 | 1 |
| 3 | Advanced | 15 | 8 | 2 |
| 4 | Veteran | 30 | 15 | 3 |
| 5 | Expert | 60 | 25 | 4 |

These are experience thresholds, not a claim of statutory qualification or certified expertise. All criteria must be satisfied. Account activity, attendance as a fan, job applications, accepted offers, uploads and generic endorsements contribute zero credit. Responsibility-level weighting is intentionally absent: job titles and self-reported leadership are too easy to inflate. Thresholds are versioned as model 1 in the projection and history and should be reviewed as a product policy before deployment.

One accepted ledger entry is one per-role endorsement and one completion for `role:<role_key>`. A worker can earn different role endorsements at one event, but `family:<role_category>` counts that event only once. Contexts are canonical event UUIDs or whole-tour UUIDs. Multiple shifts, repeated assignments, different employers and legacy aliases of the same event/role cannot earn duplicate role credit. Because v1 caps a role/family at one credit per context, context minimums are redundant safeguards; employer diversity becomes the additional gate at higher levels.

All 74 catalog roles have a role badge, and the eight populated catalog categories have family badges: Bar Service, Creative, Hospitality, Management, Operations, Production, Security, Technical. PR #15's category type also permits `general`, but its 74 definitions currently contain no general-family role. Catalog keys, not labels or custom departments, determine progression. Entity-owned template overrides preserve their hired definition in the snapshot while retaining the platform role/family key. New unknown roles require a reviewed catalog migration; changing a template cannot mint a new progression family.

Endorsement freshness expires after 24 months. Expired endorsements disappear from the current public projection automatically; the underlying completion and provenance remain. Experience badges represent completed historical work and do not expire. A revoked credit stops contributing immediately, removes its current endorsement, and records level regressions without deleting prior advancement history. Revoked credits cannot be restored by retrying verification. Restoration or correction needs a separately reviewed administrative process; no silent delete/re-award path exists.

## Data model

The migration is additive and transactional. It does not alter, delete or backfill existing badges, endorsements, profiles, credentials, assignments or hiring data. It adds a worker-provenance protection trigger and updates only an assignment explicitly verified through the new RPC.

- `workforce_recognition_roles`: immutable v1 seed of 74 platform keys, labels, families and complete catalog definitions. Generated from PR #15, never from user labels.
- `workforce_progression_levels`: reviewed threshold catalog.
- `workforce_role_credits`: durable credit and per-role endorsement, unique by assignment and worker/role/context. Foreign keys retain assignment, original event, canonical event, inferred tour, staff member, shift, worker and verifier. Snapshots retain assignment, hired definition, catalog definition and canonical closeout context. Evidence is private to worker and employer; verification/revocation timestamps, actor and reason persist.
- `workforce_advancement_history`: append-only role/family level transitions, including demotions, with credit, actor, time, reason and model version.
- `workforce_recognition_visibility`: worker-owned opt-in profile sharing, default private.
- `workforce_recognition_private`: unexposed internal implementation schema. Its definer functions are narrowly granted, fully qualified, set an empty search path, derive authenticated identity, and enforce permission/eligibility internally. Other helpers are not callable by clients.

Badges are a live SQL projection over unrevoked credits, not writable counters or generic `user_badges` rows. This makes the current display consistent with revocation without an asynchronous recomputation job. Advancement and credit creation/revocation are one transaction. Row locking plus per-worker transaction advisory locking serializes overlapping role/family updates. Unique constraints provide a second duplicate guard.

All exposed new tables have RLS and explicit grants. Client roles cannot insert, update or delete credits/history/catalog. Workers can read their own ledger; current authorized managers can read ledger rows only for their employer. History is readable by its worker. Public-profile projection requires a signed-in viewer and sharing opt-in; it exposes only safe badges, endorsement text/freshness, and redacted advancement descriptions. Evidence, snapshots, event/employer/verifier identifiers and internal revocation reasons are not public. `is_public` means visible on the profile to signed-in users, matching the API's auth gate, not anonymous web publishing.

The retention FKs deliberately restrict deletion of source records once credit exists. Before deploying, review account/event deletion retention requirements; a future privacy-compliant archive/anonymization process must preserve audit integrity rather than silently deleting proof.

## Verification and anti-abuse rules

1. The request must be authenticated. Identity is read from the session and again inside the RPC via `auth.uid()`.
2. The verifier cannot be the worker, even if they own the employer. A second authorized manager must attest their work.
3. The verifier must currently manage the assignment's employer through canonical hiring permission. Global admin UI presence alone grants nothing. Scope must also match the event/tour's employer context, creator, or explicit entity permission. SQL nullable scope fields fail closed.
4. The assignment must be active/completed, or confirmed with a matching completed shift. Invited/cancelled work is rejected. Its start/end times must exist, be ordered and end in the past.
5. A matching hired staff record must refer to the same worker/employer and be active/inactive. Pending onboarding does not qualify.
6. The role key must be one of the 74 v1 recognition roles. Legacy/custom assignments need a manager-reviewed catalog mapping before verification.
7. Event closeout must resolve to `events_v2.status='settled'` with a past `end_at`; tour-wide work needs `tours.status='completed'` and an `end_date` before today. Elapsed time alone never awards credit.
8. The manager provides an explicit role endorsement and private completion evidence (10–2000 characters each). They must review successful duties, required credentials, attendance/check-out, handoffs and any relevant incidents from operational records. v1 stores an attestation, not a machine-validated credential-vault/check-in assessment.
9. Per-role/event and per-assignment uniqueness block duplicate shifts/retries. Retrying the same assignment returns its existing credit, including revoked credit. A different overlapping assignment returns conflict. Family progress deduplicates multiple roles at a context.
10. Canonical tour membership prevents a worker accumulating both tour-wide credit and stop-level credit in the same family, even if the event assignment omitted `tour_id`.
11. Revocation requires current permission for the issuing employer, excludes the worker, and needs a substantive reason. Revocation and level demotion/history are atomic. Reopened event status does not automatically revoke historical credit; a manager must review and revoke it.
12. Verified assignment IDs cannot be recycled for a later event or a new role. Some existing roster services reuse a worker/employer assignment; those callers must create a distinct shift/assignment for subsequent live work once the original has verified credit. Their attempted provenance rewrite fails explicitly instead of silently crediting the wrong event.
13. This prevents self-awards and accidental duplication, not collusion between real authorized employers/managers. The ledger retains enough provenance for an investigation. No financial rewards or permission escalation are coupled to role progression.

## API and UI

- `GET /api/workforce/recognition?user_id=<uuid>`: worker or opted-in profile projection, `private, no-store` caching.
- `PATCH /api/workforce/recognition`: `{ "is_public": true|false }`; user is session-derived. Extra identity fields rejected.
- `GET /api/admin/workforce/recognition?entity_type=venue|organization|artist&entity_id=<uuid>`: current employer's latest 200 assignments and latest 200 credit records, after server permission check and RLS filtering.
- `POST /api/admin/workforce/recognition`: `{ "action":"verify", "assignment_id":"...", "endorsement":"...", "evidence":"..." }` or `{ "action":"revoke", "credit_id":"...", "reason":"..." }`. No verifier, level, user or employer supplied by the mutation payload. Strict schemas reject extra fields.
- RPCs: `verify_workforce_assignment`, `revoke_workforce_credit`, `workforce_recognition_profile`. Direct RPC use is equally subject to DB authorization.
- Statuses: 401 unauthenticated, 403 scope/self denial, 404 missing record, 409 duplicate/overlap, 422 incomplete eligibility, 503 unavailable schema/data service.
- `/admin/dashboard/roster`: embedded completion/endorsement and revocation workflow scoped to resolved employer.
- `/admin/dashboard/workforce/recognition`: standalone manager page using existing employer resolver, linked from the team recognition panel.
- Existing venue team panel: embedded verification for its venue plus link to the universal manager page.
- `/achievements` and existing profile-achievements section: verified role/family levels, next thresholds, current endorsements, advancement history, and worker visibility control.

Manager workflow: select employer and ended assignment; review operational execution records and closeout; enter public endorsement and private evidence; submit verification; inspect persisted verifier/evidence records. Worker workflow: complete the assignment; employer verifies; view progression in Achievements; optionally share verified experience on the profile. Revocation shows the reason to employer/worker and recalculates display immediately.

Current queue intentionally advertises its 200-record bound. Older assignments remain verifiable by ID through the API, but bulk historical review/pagination and manager-friendly worker names are follow-up improvements. The panel identifies workers by UUID prefix and verification records retain full verifier UUID. No silent historical auto-award or batch backfill is included.

## Validation evidence

- Migration created with Supabase CLI. Applied successfully to an isolated local PostgreSQL database using a minimal PR #15 schema-contract fixture, not a remote database.
- `supabase/tests/workforce_recognition.contract.sql`: passed real SQL/RLS/RPC assertions covering worker self-award, forged assignment fields/status, outsider access, direct ledger writes/private helper denial, retries, duplicate event/role, cancellation/archival, future work, missing/mismatched hire, unknown role, verified-assignment rewrite, employer-diversity gates, every tier boundary, all five role/family advancements, cross-employer revocation, demotion history, revoked retry, expiry, private/opt-in redacted profiles, same-family multi-role deduplication, tour overlap, event scope and anonymous denial. Transaction rolls back its fixtures.
- `supabase/tests/workforce_recognition.concurrency.py`: 16 simultaneous authenticated verification requests produce one credit and exactly two advancement records (role/family). Passed on isolated localhost database; test cleans only its own fixture UUIDs.
- `vitest.workforce-recognition.config.ts`: 4 suites, 25 tests passed (service, request boundary, UI behavior, existing 74-role catalog regression).
- `tsconfig.workforce-recognition.json`: targeted new component/service/API types passed. No machine-specific fallback paths in committed config.
- Targeted lint passed after correcting one JSX punctuation warning.
- `git diff --check`: completed before handoff.

The schema-contract database emulates canonical permission helpers with explicit test manager fixtures; it does not replace a full staging test of the production RBAC helper, legacy event bridge, organization/venue UUID compatibility, all existing migrations or a full Next build. Disk constraints prevented a full checkout/build in this session. No production migration, deployment, merge, notification or user award was performed. An exploratory broad test run hit omitted sparse-checkout dependencies; focused feature tests pass and no unrelated code was changed to address missing files.

Reproduce in a disposable PostgreSQL cluster: apply `workforce_recognition.bootstrap.sql`, then the migration, then `workforce_recognition.contract.sql` using `psql -v ON_ERROR_STOP=1`. Run the concurrency script against that same local test server. Bootstrap creates global test roles and is ONLY for disposable clusters. Run `npx vitest run --config vitest.workforce-recognition.config.ts` and `npx tsc --noEmit -p tsconfig.workforce-recognition.json` with repository dependencies installed. The SQL seed can be regenerated with `npx tsx scripts/workforce/role-seed.ts` for comparison; never rewrite an applied migration.

## Review/deployment checklist

Before merge: review thresholds/names and employer-diversity policy; verify PR #15 dependency order; test real venue, organization and artist manager scopes and unrelated-admin denial in staging; exercise hired/confirmed shift, event producer bridge, multi-stop tour and credential-attestation flows; run full application verification; assess profile privacy and source-record retention. Explicitly resolve legacy assignments with missing role keys/work windows and legacy event identity rather than guessing or auto-crediting them.

Before production migration: obtain review; snapshot/backup the database; test migration against a staging clone; check RLS/advisors and schema exposure/explicit grants; confirm private implementation schema is not exposed in PostgREST; validate canonical RBAC and identifiers. SQL fail-closed behavior can reject otherwise valid legacy employers until canonical scopes are reconciled. New code reports unavailable migrations as errors, not successful empty recognition. Deploy migration and feature together only after these checks. Keep existing generic badge/endorsement system available during rollout.

Rollback: revert feature UI/API integrations to hide verified progression. Do not drop the new ledger/history or remove recorded proof. Review the assignment-protection trigger separately before reverting it, as the older worker update path was unsafe for verified provenance. Threshold/catalog policy changes after issuance require a new migration and audited model-version transition, not edits to history.

## Role-to-family catalog coverage
| Role key | Role | Family |
| --- | --- | --- |
| ada-accessibility-team | ADA Accessibility Team | hospitality |
| artist-hospitality | Artist Hospitality | hospitality |
| artist-relations-manager | Artist Relations Manager | management |
| audio-engineer | Audio Engineer | technical |
| backstage-coordinator | Backstage Coordinator | production |
| bartender | Bartender | bar_service |
| booking-agent | Booking Agent | management |
| box-office-staff | Box Office Staff | operations |
| brand-activations-team | Brand Activations Team | creative |
| camping-operations | Camping Operations | operations |
| catering-team | Catering Team | hospitality |
| cleaning-crew | Cleaning Crew | operations |
| content-creators | Content Creators | creative |
| creative-director | Creative Director | management |
| crowd-control-staff | Crowd Control Staff | security |
| credentialing-staff | Credentialing Staff | operations |
| data-analytics-team | Data + Analytics Team | technical |
| drone-operator | Drone Operator | technical |
| emergency-response-team | Emergency Response Team | operations |
| entertainment-lawyer | Entertainment Lawyer | management |
| fence-barricade-crew | Fence + Barricade Crew | operations |
| festival-founder | Festival Founder | management |
| finance-payroll-team | Finance + Payroll Team | operations |
| food-vendor | Food Vendor | hospitality |
| generator-power-crew | Generator + Power Crew | technical |
| golf-cart-driver | Golf Cart Driver | operations |
| graphic-designer | Graphic Designer | creative |
| grounds-crew | Grounds Crew | operations |
| hair-makeup | Hair + Makeup | creative |
| hospitality-manager | Hospitality Manager | management |
| influencer-creator-relations | Influencer + Creator Relations | creative |
| internet-wifi-team | Internet + WiFi Team | technical |
| id-check-staff | ID Check Staff | security |
| led-visual-operator | LED Visual Operator | technical |
| lighting-designer | Lighting Designer | creative |
| livestream-team | Livestream Team | technical |
| logistics-coordinator | Logistics Coordinator | operations |
| lost-found-staff | Lost + Found Staff | hospitality |
| marketing-director | Marketing Director | management |
| medic-team | Medic Team | operations |
| merch-team | Merch Team | operations |
| mobile-app-team | Mobile App Team | technical |
| paid-ads-team | Paid Ads Team | creative |
| parking-staff | Parking Staff | operations |
| partnerships-sponsors-team | Partnerships + Sponsors Team | management |
| permits-coordinator | Permits Coordinator | operations |
| photographer | Photographer | creative |
| production-manager | Production Manager | management |
| public-relations-team | Public Relations Team | creative |
| pyro-technician | Pyro Technician | technical |
| rigging-crew | Rigging Crew | technical |
| runner-team | Runner Team | operations |
| security-director | Security Director | management |
| security-guard | Security Guard | security |
| set-designer | Set Designer | creative |
| shuttle-driver | Shuttle Driver | operations |
| site-operations-manager | Site Operations Manager | management |
| social-media-team | Social Media Team | creative |
| stage-manager | Stage Manager | production |
| stagehand | Stagehand | technical |
| sustainability-team | Sustainability Team | operations |
| talent-buyer | Talent Buyer | management |
| ticketing-manager | Ticketing Manager | management |
| traffic-control-team | Traffic Control Team | operations |
| tour-manager | Tour Manager | management |
| transportation-coordinator | Transportation Coordinator | operations |
| trash-recycling-team | Trash + Recycling Team | operations |
| vendor-coordinator | Vendor Coordinator | operations |
| videographer | Videographer | creative |
| vip-experience-team | VIP Experience Team | hospitality |
| volunteer-coordinator | Volunteer Coordinator | management |
| water-station-staff | Water Station Staff | hospitality |
| weather-monitoring-team | Weather Monitoring Team | technical |
| wristband-credential-printing | Wristband + Credential Printing | operations |
