# Codex Master Implementation Prompt

Place this package under `docs/music-trust/phase-1/`, then paste the prompt below into Codex from the Tourify repository root.

---

You are implementing **Tourify Music Trust Ecosystem — Phase 1: Safe Upload + Certification Foundation** inside the existing Tourify repository.

The attached `docs/music-trust/phase-1/00_CANONICAL_MUSIC_INTEGRATION_GUIDE.md` is the canonical architecture guide. Extend the existing native music system. Do not create a second upload, storage, access, player, or catalog stack.

## Product objective

Allow artists to upload and share music through the current `artist_music` and Jukebox ecosystem while:

- requiring rights and AI-use declarations for public publication
- preserving private original audio
- recording source integrity and origin history
- clearly labeling non-certified uploads as artist submitted
- offering Human-Created Certification as an optional upsell
- creating review, suspension, revocation, appeal, and public verification flows
- preserving extension points for the later Rights Passport and protection systems

## Mandatory source order

Read all files in `docs/music-trust/phase-1/` in numeric order, then read:

- `music-ecosystem-execution-plan.schema.json`
- `music-ecosystem-execution-plan.template.json`
- the SQL/code references under `reference/`

The repository and active database are the source of truth for actual paths, helpers, types, capabilities, and migration order. Reference files are not blind-copy targets.

## Hard architecture rules

1. Never reset the database.
2. Keep `artist_music` as the canonical track row.
3. Keep audio in private `artist-music` storage.
4. Keep playback through `/api/music/stream` → `resolveMusicAccess` → server-signed URL.
5. Keep all web listening UI on `JukeboxProvider` / `useJukebox`.
6. Do not extend venue mocks, `useMusicReleases`, TAF, or stale setup paths.
7. External platform URLs remain outbound links.
8. Keep route handlers under `app/api/**`; colocate Zod schemas.
9. Reuse `requireApiUser` / `jsonError` and current Supabase helpers.
10. Prefer interfaces, named exports, function declarations, lowercase dash filenames, and RORO helpers.
11. Do not initialize service clients at module scope if that can break `next build`; use established lazy/runtime patterns.
12. Never expose service-role keys or private evidence URLs to the client.

## Phase 0 — mandatory repository audit

Do not edit production code or create migrations until this audit is complete.

Audit and record:

- current branch/base commit and repository structure
- package manager, Next.js/React/Supabase versions, test runner, and scripts
- all canonical music files listed in the integration guide
- current `artist_music` schema, ID types, constraints, indexes, views, RLS, triggers, and generated types
- current upload/preview/storage/stream/library/marketplace/share/moderation/mobile behavior
- existing job/outbox infrastructure
- existing feature-flag system
- existing admin capability functions
- existing DMCA/report/dispute systems
- existing baseline lint, typecheck, test, build, and migration failures

Create:

```text
docs/music-trust/phase-1/CURRENT_STATE_AUDIT_RESULTS.md
```

The report must include exact paths, reused components, conflicts, risks, baseline failures, and a non-destructive integration map.

## Execution JSON

After the audit and before implementation, create:

```text
docs/music-trust/phase-1/music-ecosystem-execution-plan.json
```

It must validate against `music-ecosystem-execution-plan.schema.json`. Replace every template assumption with repository-specific findings.

Update it after every task status change. Never mark a task complete without acceptance evidence and test results. When blocked, record the exact reason, impact, safe state, and unblocking condition.

## Implementation sequence

### Phase A — Upload trust foundation

- Add versioned rights/AI/training declarations to the current upload flow.
- Keep current upload/preview/commerce behavior unchanged.
- Add only minimal denormalized trust fields to `artist_music` after verifying current types.
- Add related append-only declaration, fingerprint, origin record, and event tables with RLS.
- Public uploads must satisfy rights and Human Music Policy gates.
- Private tracks may remain incomplete.

### Phase B — Origin processing

- Reuse the current worker/outbox pattern.
- Calculate source SHA-256, technical metadata, and an acoustic fingerprint asynchronously.
- Freeze a deterministic origin manifest.
- Store processing status/errors and make retries idempotent.
- Do not perform expensive audio processing in request handlers.

### Phase C — Artist trust UI

- Extend `EnhancedMusicUploader`; do not create a new uploader.
- Add rights/AI/training controls and plain-language policy explanations.
- Add status labels to current artist catalog cards.
- Add post-upload certification upsell.
- Map all playback UI to existing `JukeboxTrack`/Jukebox behavior.

### Phase D — Certification cases

- Add owner-scoped certification case/evidence/event APIs and UI.
- Implement a strict state machine.
- Preserve evidence privacy.
- Add needs-information, withdrawal, rejection, approval, suspension, reactivation, and revocation behavior.
- Material changes require a new case/certificate version.

### Phase E — Operations and public verification

- Extend current admin music moderation with existing capability checks.
- Add review queue and structured decisions.
- Add narrow public origin/certificate endpoints and verification page behind flags.
- Never expose private evidence, storage paths, signatures, IPs, or internal detector scores.

### Phase F — Regression, rollout, and legacy handling

- Add unit, route, database/RLS, integration, E2E, and mobile-semantic tests.
- Provide an explicit legacy declaration workflow; do not auto-certify old tracks.
- Test flags off/on and rollback behavior.
- Record database advisors and migration verification.
- Produce operations, support, appeal, and incident runbooks.

## Supabase requirements

- Discover CLI commands with `--help`; do not guess.
- Create actual migration files using `supabase migration new <name>` after audit.
- Use additive migrations only.
- Enable RLS on every new exposed table.
- `TO authenticated` alone is not authorization; include ownership/capability predicates.
- UPDATE policies require `USING` and `WITH CHECK`.
- Do not use user-editable metadata for authorization.
- Do not add `SECURITY DEFINER` to bypass permissions.
- Confirm Data API grants if the project configuration requires them.
- Regenerate database types and run advisors.

## Completion discipline

For each task, record:

- files changed
- database objects changed
- feature flag
- acceptance criteria
- commands run
- test results
- migration/rollback evidence
- screenshots or route responses where useful
- remaining risks

Do not claim the ecosystem is finished merely because scaffolding exists. Continue through the execution plan until all P0/P1 tasks satisfy their gates or are honestly marked blocked with evidence.

## Prohibited implementation

Do not add:

- a second web player or raw `<audio>` playback surface
- public original-audio storage
- tokens or crypto financial logic
- royalty payouts or catalog valuation
- automatic legal ownership determinations
- a public AI accusation based only on detector output
- production Nightshade/HarmonyCloak-style perturbation
- automatic certification of legacy tracks

Begin with the read-only audit and execution-plan creation.
