# Codex Master Implementation Prompt — Tourify Global Licensing and Clearance Exchange Phase 6

You are implementing Phase 6 inside the existing Tourify repository. Treat every Markdown file in this directory as the approved scope. Treat `CANONICAL_MUSIC_INTEGRATION_GUIDE.md` as the source of truth for the current music upload/play architecture.

## Mandatory first action: audit, do not implement

1. Record the current branch and commit.
2. Read `CURRENT_STATE_AUDIT_TEMPLATE.md` and complete `CURRENT_STATE_AUDIT_RESULTS.md` using the actual repository and deployed Supabase project.
3. Audit Phases 1–5 as actually implemented—not merely documented.
4. Locate the canonical files named in the integration guide, current database columns/types, RLS policies, storage buckets, workers, notifications, marketplace/payment/signature providers, account permissions, feature flags, tests and mobile client.
5. Run the existing baseline tests/build/lint/type checks and record pre-existing failures.
6. Copy `phase-6-execution-plan.template.json` to `phase-6-execution-plan.json`, replace every `AUDIT_REQUIRED` assumption with audited facts, and validate it against the schema.
7. Stop and document blockers when the deployed system, legal role map, provider contracts or required Phase 2 authority data cannot support a task.

## Hard architecture rules

- Never reset the database.
- Do not create a second catalog, upload pipeline, private music bucket, global player, entitlement engine, release table or mobile player.
- Preserve `artist_music`, `/api/artist/music`, `/api/artist/music/upload-url`, `/api/music/stream`, `resolveMusicAccess`, `JukeboxProvider`, mobile MusicPlayerProvider, library/playlists, previews, marketplace listing sync, feed, profile, EPK and analytics.
- Build licensing as additive domain objects that reference canonical music, musical works, sound recordings, Rights Passport versions, parties, claims, authority records and Phase 3 ledger objects.
- Route handlers stay under `app/api/**`; colocate Zod schemas; use `requireApiUser` and `jsonError`; shared pure helpers go under `lib/music/licensing/`; use interfaces, named exports, lowercase-dash filenames and RORO signatures.
- All newly exposed Supabase tables require RLS and tested ownership/role predicates. Never authorize from editable `user_metadata`. Do not expose service-role keys or provider secrets.
- Views must be `security_invoker` where supported. `SECURITY DEFINER` is prohibited unless an audited, isolated, explicitly granted function is approved and tested.
- Every request is classified before search/quote/approval/contract rules are chosen.
- Every licence leg must identify the exact asset, right, controller, authority version, territory, term, media and use.
- Default deny when authority, shares, approvals or territory are incomplete/disputed/expired.
- Search, quote, approval, deposit, delivery preview and blockchain records are not licences.
- Only an executed, effective agreement authorizes use.
- AI training/model/voice licensing is separate explicit opt-in and cannot be bundled.
- Payment status comes from verified provider webhooks and reconciliation, never client redirects.
- Phase 3 remains the immutable royalty ledger source of truth.
- Every task requires feature flags, tests, evidence, files changed, rollout and rollback.

## Implementation order

Follow `phase-6-execution-plan.json` dependency order. Do not skip stages or mark tasks complete in batches.

For every task:

1. Set status `in_progress`.
2. Record exact scope and audited file/schema/provider references.
3. Implement the smallest non-destructive increment.
4. Add unit, route, RLS, integration and regression tests appropriate to the change.
5. Run tests and record commands/results in `tests` and `evidence`.
6. Record exact `filesChanged`.
7. Resolve or record blockers.
8. Set `complete` only after every acceptance criterion is evidenced.
9. Commit at stage gates using descriptive commits if repository policy allows.

## Required stage gates

- S0: audit, legal role map, source-of-truth ADRs and baseline.
- S1: license taxonomy, parties, authority, availability and clearance graph.
- S2: database/RLS/storage and reference types.
- S3: buyer projects, briefs, discovery and shortlists.
- S4: requests, quote versions, negotiation and approvals.
- S5: sync/master, mechanical and derivative workflows.
- S6: UGC, live/event, brand, media and AI modules.
- S7: agreements, signatures, conditions, delivery and amendments.
- S8: cue sheets, usage, invoices, payment reconciliation and Phase 3 handoff.
- S9: DDEX/CISAC/partner adapters and global territory modules.
- S10: artist, buyer, public, EPK, event and mobile-compatible UI integration.
- S11: Licensing Operations, conflicts, security, analytics and runbooks.
- S12: pilot, hardening, rollout, rollback and production gates.
- S13: Phase 7 handoff and final evidence package.

## Required evidence before production

- No unauthorized cross-artist, cross-buyer or cross-project data access.
- No confidential file can be fetched with a durable/public URL.
- No request can become licensed with an incomplete clearance leg.
- A material brief/quote change invalidates affected approvals.
- A signed agreement cannot be edited; amendments are linked versions.
- Delivery is blocked until the agreement is effective.
- Existing Jukebox playback and listener entitlements are unchanged.
- Existing marketplace purchases and mobile streams remain functional.
- Provider webhooks are signed, idempotent and replay-protected.
- Payment/cue/usage reconciliation produces deterministic exceptions.
- Feature flags and kill switches disable Phase 6 without deleting data.
- Restore, incident and legal-hold drills pass.

## Completion output

At the end, produce:

- `CURRENT_STATE_AUDIT_RESULTS.md`
- fully updated `phase-6-execution-plan.json`
- architecture decision records
- migration and RLS validation reports
- test and security reports
- standards conformance report
- pilot results
- rollout/rollback runbook
- known limitations and Phase 7 handoff

Do not claim production completion while any task, blocker, acceptance criterion or launch gate lacks evidence.
