# Release state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `RELEASE-002` — blocked/queued_postlaunch; DEFERRED-MUSIC-ADVANCED
- `RELEASE-003` — blocked/waiting_external; CORE-WEB-LAUNCH
- `RELEASE-004` — blocked/waiting_external; CORE-WEB-LAUNCH
- `RELEASE-007` — blocked/waiting_external; CORE-WEB-LAUNCH
- `RELEASE-009` — blocked/queued_postlaunch; POSTLAUNCH-LOGISTICS
- `RELEASE-012` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `RELEASE-013` — active/in_progress; CORE-WEB-LAUNCH
- `RELEASE-014` — blocked/waiting_dependency; CORE-WEB-LAUNCH
- `WFC-022` — blocked/queued_postlaunch; POSTLAUNCH-WORKFORCE
- `WFC-023` — blocked/queued_postlaunch; POSTLAUNCH-WORKFORCE
<!-- generated-agent-state:end -->

- Last reviewed SHA: `7cf660ad8422dbd3adbdb77369d94638cdc2231b` (RELEASE-001 audit HEAD)
- Last reviewed at: 2026-09-09
- Active tasks: RELEASE-002 through RELEASE-008
- Confidence: local readiness implementation is working; runtime evidence remains blocked by missing local configuration and an unstarted stack.

## Durable facts

- Mission: Own CI, deployment, environment validation, observability, cron, and release readiness.
- CI: 16 workflows under `.github/workflows/`; release verification tier in `scripts/verify.mjs`; toolchain contract in `scripts/ci/check-toolchain.mjs`.
- Deployment: Vercel-first (`vercel.json`) + Docker (`docker/production`, `docker/local`) + legacy `scripts/deploy.sh`/`docs/PRODUCTION_DEPLOYMENT_GUIDE.md`.
- Env validation: `lib/config/environment-contract.ts` (contract + `assertProductionEnvironment`) enforced at runtime via `instrumentation.ts` and at build via `scripts/ci/validate-production-env.ts` (`npm run validate:env:production`).
- Local readiness: `npm run verify:local` validates local secrets without printing values, requires explicit Supabase-target confirmation, checks cron inventory and Docker inputs; `npm run smoke:healthz` only calls loopback `/healthz`; `npm run smoke:rate-limit` is explicit opt-in and requires a real Upstash-compatible target.
- Observability: Sentry init exists web (`sentry.*.config.ts` → `lib/observability/sentry.shared.ts`) and mobile (`apps/mobile/lib/observability/sentry.ts` via `EXPO_PUBLIC_SENTRY_DSN`); **DSNs currently unset → observability OFF**. Health/readiness at `app/api/health/route.ts`, `/healthz` rewrite. `lib/observability/route-timing.ts` logs only.
- Cron: `vercel.json` schedules 7 crons; `app/api/cron/event-reminders` is an **unscheduled stub**; `refresh_forum_mviews` pg_cron is **commented out**; **16** music outbox worker scripts shipped (backlog target 21). `refresh_venue_analytics_daily` pg_cron active.
- Launch gates live in `docs/DEVELOPMENT_BACKLOG.md` (G1–G10). Release-relevant open gates: G2 (prod/PITR/drill), G3 (CI green + e2e required), G4 (Sentry/uptime/alerting), G5 (crons/workers scheduled+monitored), G6 (rate limiting active).
- Baseline/gaps/questions recorded in `BASELINE.md` / `GAPS.md` / `QUESTIONS.md` under this domain directory.

## Current focus

- Owner answers to `QUESTIONS.md` (P1: Q1 env/PITR, Q2 observability, Q3 CI/e2e, Q4 cron/workers, Q5 rate limiting) become follow-up release-owned task records.
- No production code, CI config, deployment, or env files were modified by this audit.

## RELEASE-005 preflight checkpoint — 2026-09-14

- RELEASE-005 is blocked, not complete. Full Vitest at candidate SHA `7cf660ad8422dbd3adbdb77369d94638cdc2231b` reported 5017 passed, 8 skipped, and 2 failed tests: the MFA bcrypt timeout and the `PublicSiteMapViewer` site-map contract.
- Hosted E2E has no matching successful run for the candidate SHA; the latest listed runs failed, including run `33990768961` failing both Vitest and Playwright jobs. Candidate check-runs contain no E2E result.
- ~~GitHub branch-protection lookup for `main` returned 404. No required-check enforcement evidence exists, and no workflow, deployment, or branch-protection change was made.~~ **CORRECTED 2026-09-25 (Wave 35, REL-005): this is obsolete.** `GET /repos/KyleQD/Tourify/branches/main/protection` now returns **200, not 404**: `strict: true` over 10 required contexts, `enforce_admins`, `required_linear_history`, no force pushes, no deletions, `required_conversation_resolution`, `required_signatures.enabled: false`. **The 2026-09-25 reading also claimed `required_approving_review_count: 1`, `dismiss_stale_reviews` and `require_last_push_approval`. Re-read 2026-09-28, that claim is false: `required_pull_request_reviews` is absent from the payload, so no human review is required. See the full correction below.** No branch-protection setting has been changed by any agent lane.
- Closure requires fixing the two tests (both since closed locally, 2026-09-21), a successful matching-SHA hosted E2E run, and the owner-executed required-check set (now decided in REL-003, still unapplied).

## Known risks

- Working tree dirty (386 entries) at audit — only release domain dir + task written.
- The recovery plan exists at `docs/audit-remediation/2026-07-27/RECOVERY_AND_CONTINUITY_PLAN.md`, but backup/PITR and isolated restore-drill evidence remain unverified.
- Observability (Sentry DSNs) and rate limiting are not active in production today.
- Music outbox worker count 16-vs-21 discrepancy unresolved.

## Owner direction — 2026-09-10

Observability targets web/mobile Sentry, `/healthz` plus auth/session and checkout
uptime, separate auth/checkout alerts, a 99.9% monthly web/API target, and a named
on-call destination. Worker deployment is hybrid; exact inventory and external
provisioning remain open. Production evidence, PITR, rate-limit credentials, and
required e2e governance remain promotion-scoped.

## Production launch graph — 2026-09-16

- RELEASE-003, RELEASE-004, and RELEASE-005 are P0 launch gates.
- RELEASE-006 owns Node 24.x, dependency and Next.js remediation, clean install, typecheck, and deterministic build.
- RELEASE-007 owns isolated staging/production Vercel and Supabase topology plus protected promotion; production may not auto-deploy around CI.
- RELEASE-008 owns capability gating, production route denial, crawler/canonical metadata, CSP, and truthful public launch surfaces.
- RELEASE-002 is blocked with MUSIC-004 until the core web release is stable; mobile observability is outside the initial launch.

## Next-batch result — 2026-09-16

- RELEASE-006 has Node 24/npm 11.17.0, Next.js 15.5.24, lockfile, CI, and Docker alignment. On 2026-09-18 an isolated clean fixture completed unflagged `npm ci`, the focused peer check passed, and `npm audit --audit-level=high` reported 0 high and 0 critical findings. It remains open because full typecheck did not complete in a six-minute bounded run and `npm run build:vercel` is stopped by the current non-HTTPS `NEXT_PUBLIC_SITE_URL` configuration before compilation.
- RELEASE-007 partially landed exact-SHA/manual staging workflow and evidence-artifact steps. Hosted Vercel/Supabase isolation and credentials remain unverified.

## RELEASE-008 local enforcement checkpoint — 2026-09-18

- `lib/config/launch-capabilities.ts` is the canonical enabled/pilot/disabled launch manifest and production route-deny registry. The existing middleware boundary consumes it through the compatibility adapter; exact-or-child matching avoids accidental lookalike-path denial.
- `npm run check:production-debug` now inventories App Router page/API debug, test, seed, and migration routes. All 40 discovered unsafe routes are covered; previously uncovered `/api/admin/test` and `/api/notifications/test` are production-denied.
- Audit-gated APIs cannot be enabled when their canonical launch capability remains disabled, even if a legacy approval environment variable is present. The manifest classifies marketplace and ticketing as restricted pilots and classifies provider integrations, polls, finance offerings, external event providers, and advanced music webhooks as disabled; remaining non-audit-gate consumers still require wiring.
- Only an explicit production deployment at `https://tourify.live` is indexable. Staging/preview and inconsistent environment declarations fail closed to metadata noindex, robots disallow-all, and no sitemap publication.
- The root publishes `/` as canonical; the shared CSP builder excludes `unsafe-eval` in production; `check:public-surface` verifies canonical/crawler/sitemap/CSP plus `/healthz` and minimal public health metadata wiring.
- Focused evidence passed: both production contract checks, 11 Node contract tests, 25 Vitest capability/route tests, focused ESLint, and the 7-scheduled/1-deferred cron inventory. Full typecheck/build was intentionally not repeated because RELEASE-006 records their current bounded blockers.
- RELEASE-008 remains active: remaining navigation/page/cron/worker consumers, hosted staging/production evidence, and public metrics/legal review still require owner work.

## RELEASE-008 health release identity follow-up — 2026-09-18

- `/api/health` now emits `x-tourify-release-sha` on public GET, authenticated/internal GET, and HEAD responses only when Vercel supplies a valid full 40-character hexadecimal `VERCEL_GIT_COMMIT_SHA`; output is normalized to lowercase.
- Missing, shortened, or non-hex deployment identity omits the header so QA certification fails closed. `RELEASE_SHA`, branch names, package versions, and invented values are not runtime fallbacks; the environment contract documents only the authoritative Vercel source.
- Focused evidence passed: `check:public-surface`, 7 Node public-surface/release-identity tests, 5 Vitest health-route cases, and focused ESLint. Hosted exact-SHA staging verification remains with QA-003 after an approved deployment.

## RELEASE-008 server consumer wiring — 2026-09-18

- The poll analytics API now consumes the canonical disabled polls gate before authentication or data access. External event-provider environment flags and explicit Bandsintown mode consume the disabled `external_event_providers` capability, and the authorized provider-sync cron returns a no-store 503 before queue claims or provider access.
- The marketplace-finance outbox worker consumes `music_finance_offerings` before reading service-role credentials or its queue, so an accidentally scheduled deferred worker fails closed.
- Focused consumer contracts cover direct API, authorized cron, and worker guard ordering. Thirteen Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining consumer families: navigation/direct pages plus institutional, licensing, rights-admin, rights-intelligence, creator, preview, origin, derivative, anchor, and royalty-import workers. Hosted staging/production evidence remains outstanding.

## RELEASE-008 institutional worker family — 2026-09-18

- Institutional provider ingress already consumes the disabled `advanced_music_webhooks` capability; focused coverage now proves it returns 503 without consuming the request body, so provider parsing, secrets, database, and downstream network work cannot begin.
- `scripts/music-institutional-outbox-worker.ts` now consumes disabled `music_finance_offerings` before service-role credentials or its NAV/partner/report queue. An accidental scheduler invocation therefore exits before privileged access.
- Sixteen focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: licensing, rights-admin, rights-intelligence, creator, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 licensing worker family — 2026-09-18

- Licensing provider ingress already consumes disabled `advanced_music_webhooks`; focused coverage proves it returns 503 without consuming the request body, so provider parsing, signature/secret handling, database, and downstream network work cannot begin.
- `scripts/music-licensing-outbox-worker.ts` now consumes the same canonical capability before service-role credentials or its payment-reconciliation and partner queue. Existing webhook signature, idempotency, and persistence semantics are unchanged.
- Eighteen focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: rights-admin, rights-intelligence, creator, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 rights-admin worker family — 2026-09-18

- Rights-admin provider ingress already consumes disabled `advanced_music_webhooks`; focused coverage proves it returns 503 without consuming the request body, so provider parsing, signature/secret handling, database, and downstream network work cannot begin.
- `scripts/music-rights-admin-outbox-worker.ts` now consumes the same canonical capability before service-role credentials or its registration/claim retry queue. Existing webhook signature, idempotency, reconciliation, and persistence semantics are unchanged.
- Twenty-one focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: rights-intelligence, creator, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 rights-intelligence worker family — 2026-09-18

- `music_rights_intelligence` is now a dedicated disabled canonical launch capability covering rights intelligence, benchmarking, and collective-analysis workflows. No rights-intelligence provider ingress route exists; only dormant partner-adapter helpers were found, so there is no request-body entry point to gate in this slice.
- Rights-intelligence feature resolution returns the existing all-disabled flag contract before loading its trusted client or querying `feature_flags`. `scripts/music-rights-intelligence-outbox-worker.ts` checks the same capability before service-role credentials or its consent/opt-out/benchmark queue.
- Twenty-two focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: creator, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-cooperative worker family — 2026-09-18

- The cooperative disclaimer and core contract already define a distinct readiness-only, all-flags-disabled launch policy, so `creator_cooperative` is now a dedicated disabled canonical capability rather than being misclassified as finance offerings or advanced webhooks. No provider ingress route exists for this family.
- Cooperative flag resolution returns the existing all-disabled contract before trusted-client/database access. The shared creator outbox runner now supports an optional canonical capability guard, configured only by `scripts/music-creator-cooperative-outbox-worker.ts`, and rejects before service-role credentials or its membership/contribution/research queue.
- Twenty-eight focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-cooperative creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-digital-commons worker family — 2026-09-18

- The digital-commons disclaimer and activation contracts define a distinct sandbox-only policy with irreversible transfer, universal mandate, collective action, and tokenization hard-disabled. `creator_digital_commons` is therefore a dedicated disabled canonical capability. No provider ingress route exists for this family.
- Digital-commons flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-digital-commons-outbox-worker.ts` alone now supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its participation/commons queue while other creator workers remain unchanged.
- Twenty-seven focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: other creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-federation worker family — 2026-09-18

- The federation disclaimer and core contract define a distinct readiness sandbox: Tourify accounts do not create membership, local sovereignty is default-deny, and representation, collective licensing, bargaining, finance, public API, and tokenized membership remain unavailable. `creator_federation` is now a dedicated disabled canonical capability.
- Federation flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-federation-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its federation event queue while other creator workers remain unchanged.
- Thirty-two focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-federation creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-interoperability-convention worker family — 2026-09-18

- The convention disclaimer, launch rule, and activation contracts define a distinct readiness sandbox: production launch is out of scope without a separate executed approval package, multi-compact evidence, and independent review, while treaty, universal-representation, state/IO, collective-action, irreversible-transfer, and emergency-authority claims remain hard-disabled. `creator_interoperability_convention` is therefore a dedicated disabled canonical capability.
- Convention flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-interoperability-convention-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its convention event queue while other creator workers remain unchanged.
- Thirty-two focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-convention creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-interoperability-institution worker family — 2026-09-18

- The institution disclaimer, phase-isolation rule, and activation contracts define a distinct readiness sandbox: Phase 15 flags cannot authorize Phase 16, public-law labels are default-deny, and depositary, UN-relationship, privilege, assessed-contribution, collective-action, global-representation, regulatory, and production capabilities remain hard-disabled. `creator_interoperability_institution` is therefore a dedicated disabled canonical capability.
- Institution flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-interoperability-institution-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its institution event queue while other creator workers remain unchanged.
- Thirty-four focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-institution creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-interoperability-organization worker family — 2026-09-18

- The organization disclaimer, phase-isolation rule, and activation contracts define a distinct readiness sandbox: Phase 14 flags cannot authorize Phase 15, membership is never inferred, public-law actions are default-deny, and privilege, member-state/IO/treaty status, depositary, UN-relationship, assessed-contribution, collective-action, regulatory, diplomatic-status, and production capabilities remain hard-disabled. `creator_interoperability_organization` is therefore a dedicated disabled canonical capability.
- Organization flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-interoperability-organization-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its organization event queue while other creator workers remain unchanged.
- Thirty-eight focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-organization creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-protocol-constitution worker family — 2026-09-18

- The protocol-constitution disclaimer and activation contracts define a distinct readiness sandbox: Phase 12 commons participation does not create compact membership, production requires a separate constitutional approval package, ratification, independent stewardship, and multi-operator continuity, while irreversible transfer, universal identifier, global mandate, collective action, tokenized governance, and emergency override remain hard-disabled. `creator_protocol_constitution` is therefore a dedicated disabled canonical capability.
- Constitutional flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-protocol-constitution-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its protocol event queue while other creator workers remain unchanged.
- Thirty-eight focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-constitution creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-public-infrastructure worker family — 2026-09-18

- The public-infrastructure disclaimer, source handoff, and activation contracts define a distinct readiness sandbox: identifiers are references rather than authority, production requires a separate public-interest steward and approval package, Phase 10 flags cannot launch Phase 11, and universal identifier, global mandate, collective action, and tokenized identity remain hard-disabled. `creator_public_infrastructure` is therefore a dedicated disabled canonical capability.
- Public-infrastructure flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-public-infrastructure-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its infrastructure event queue while retaining the existing `attempt_count` retry field and preserving other creator workers.
- Thirty-eight focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-public-infrastructure creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-multilateral-treaty-operations worker family — 2026-09-18

- The treaty-operations disclaimer, phase-isolation rule, and activation contracts define a distinct readiness sandbox: Phase 16 flags cannot authorize Phase 17, multi-year evidence must be real, competence is default-deny, and formal depositary, Article 102, privilege, assessed-contribution, competence-change, universal-identity, collective-authority, and external-public-activation capabilities remain hard-disabled. `creator_multilateral_treaty_operations` is therefore a dedicated disabled canonical capability.
- Treaty-operations flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-multilateral-treaty-operations-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its treaty event queue while preserving other creator workers.
- Forty-two focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-treaty-operations creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-treaty-system-legacy worker family — 2026-09-18

- The treaty-system legacy disclaimer, phase-isolation rule, and activation contracts define a distinct readiness sandbox: Phase 18 flags cannot authorize Phase 19, a separate century-scale approval package is required, authority is time-bounded and local exit preserved, while public activation, perpetual authority, future-person representation, privacy override, universal identity, ownership adjudication, local-exit blocking, sensitive archive public dumps, century-scale launch, and Phase 20 handoff remain hard-disabled. `creator_treaty_system_legacy` is therefore a dedicated disabled canonical capability.
- Legacy flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-treaty-system-legacy-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its legacy event queue while preserving other creator workers.
- Forty-four focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-legacy creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 creator-treaty-system-renewal worker family — 2026-09-18

- The treaty-system renewal disclaimer, phase-isolation rule, and activation contracts define a distinct readiness sandbox: Phase 17 flags cannot authorize Phase 18, silence never renews authority, authority expiry denies new high-impact action, and public activation, privilege revalidation, dissolution, endowment, arrangements review, archive public access, conference, and Phase 19 handoff remain hard-disabled. `creator_treaty_system_renewal` is therefore a dedicated disabled canonical capability.
- Renewal flag resolution returns the existing all-disabled contract before trusted-client/database access. `scripts/music-creator-treaty-system-renewal-outbox-worker.ts` alone supplies the capability to the optional shared-runner guard, rejecting before service-role credentials or its renewal event queue while preserving other creator workers.
- Forty-six focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-renewal creator families, preview, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 music-preview worker family — 2026-09-18

- Preview upload, access resolution, and publication-readiness are existing product behavior and remain unchanged. The automatic processor has a distinct launch boundary because the worker inventory records no scheduler or health contract, so `music_preview_processing` is a dedicated disabled canonical capability rather than disabling general artist operations.
- `scripts/music-preview-worker.ts` checks that capability before reading worker-loop configuration or entering the execution path that loads service-role credentials, claims `music_preview_generation_jobs`, signs/downloads source audio, creates temporary files, invokes ffmpeg, uploads output, or persists state. Other media workers are unchanged.
- Forty-one focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-renewal creator families, origin, derivative, anchor, and royalty import. Navigation/direct pages and hosted verification also remain.

## RELEASE-008 artist music marketplace page/navigation family — 2026-09-18

- The disabled `music_finance_offerings` capability now controls the shared
  issuer/investor music-marketplace flag resolver before trusted-client import
  or `feature_flags` access. Database rollout rows cannot override the canonical
  launch decision.
- A nested server layout returns `notFound()` for
  `/artist/music/marketplace` and its `/portfolio` child before their client
  components hydrate or request issuer, offering, or portfolio data.
- The existing artist-music navigation remains conditional on
  `/api/music-marketplace/flags`; its discoverability value now derives from
  the canonical-backed resolver. General `/marketplace` remains a separate
  restricted pilot and was not changed.
- Thirty-eight focused Vitest cases, focused ESLint,
  `check:public-surface`, `check:production-debug` (40 covered unsafe routes),
  and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed. Other
  direct-page/navigation families and hosted verification remain.

## RELEASE-008 music-origin worker family — 2026-09-18

- Origin processing has its own documented `music_origin_processing_enabled` rollout flag; production schema/flag activation requires separate authorization, the active migration evidence is missing, and the worker inventory has no scheduler or health contract. `music_origin_processing` is therefore a distinct disabled canonical capability rather than sharing preview or general artist-operation policy.
- `scripts/music-origin-worker.ts` checks that capability before worker-loop configuration or the execution path that creates the service-role client, recovers/claims `music_file_fingerprints`, signs/downloads source audio, creates temporary files, invokes ffprobe or optional fpcalc, computes private match signals, or persists versioned origin records/events. Existing enabled retry, dead-letter, evidence, and manifest semantics are unchanged; other workers are untouched.
- Fifty-four focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-renewal creator families, derivative, anchor, and royalty import. Remaining direct pages/navigation and hosted verification also remain.

## RELEASE-008 music protected-derivative worker family — 2026-09-18

- Protected derivatives have their own default-off `music_c2pa_derivatives_enabled` rollout policy and clean-master boundary. The current worker is explicitly a stub, has no integration test or scheduler, and lacks production tooling/key/format evidence, so `music_protected_derivatives` is a distinct disabled canonical capability rather than sharing testnet-anchor or royalty policy.
- `scripts/music-rights-derivative-worker.ts` checks that capability before batch configuration, worker identity generation, service-role client creation, `music_rights_derivatives` claims, content hashing, watermark/C2PA adapter calls, or derivative/manifest/watermark/outbox persistence. It has no temporary-file path. Enabled adversarial-audio prohibition, clean-master isolation, retry, unsupported-C2PA, and deduplicated event semantics are unchanged; other workers are untouched.
- Fifty-six focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-renewal creator families, anchor, and royalty import. Remaining direct pages/navigation and hosted verification also remain.

## RELEASE-008 rights-intelligence page family — 2026-09-18

- The canonical `music_rights_intelligence` resolver was already fail-closed
  before trusted-client or database access. The remaining gap was two client
  page roots that rendered unavailable shells and issued seven discovery API
  requests after direct navigation.
- Server layouts now return `notFound()` for both `/rights-intelligence` and
  `/artist/music/intelligence` while the capability is disabled. This blocks
  both direct URLs before client hydration and also makes the enterprise page's
  internal creator-intelligence link unreachable.
- Page contents, the shared resolver, rights-intelligence APIs, admin routes,
  workers, and unrelated launch capabilities remain unchanged.
- Forty-two focused Vitest cases, focused ESLint, `check:public-surface`,
  `check:production-debug` (40 covered unsafe routes), and
  `check:cron-route-inventory` (7 scheduled, 1 deferred) passed. Other page
  families and hosted verification remain.

## RELEASE-008 music testnet-anchor worker family — 2026-09-18

- Music-rights anchoring has its own default-off `music_testnet_anchor_enabled` policy: Sepolia/local testnets only, mainnet explicitly disabled, and an off-chain passport remains valid while an anchor is pending or failed. The worker is an unscheduled testnet stub with no real broadcast or integration evidence, so `music_testnet_anchoring` is a distinct disabled canonical capability rather than sharing protected-derivative or royalty policy.
- `scripts/music-rights-anchor-worker.ts` checks that capability before batch configuration, worker identity generation, service-role client creation, `music_rights_outbox_events` claims, network selection, Sepolia RPC/signer reads, stub anchor processing, or anchor/outbox persistence. Enabled eight-attempt, mainnet-disabled, credential-absence, idempotent dedupe, stub-confirmation, and passport-valid-on-failure semantics are unchanged; other workers are untouched.
- Fifty-seven focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining worker families: non-renewal creator families and royalty import. Remaining direct pages/navigation and hosted verification also remain.

## RELEASE-008 creator digital commons page family — 2026-09-18

- `/creator-commons` was the smallest unambiguous remaining disabled direct-page family: it has one client page, no discovered navigation link, and seven discovery calls whose API routes already consume the canonical `creator_digital_commons` resolver.
- A server layout now returns `notFound()` before the page can hydrate or request steward, participation, asset, protocol, registry, transition, or gated data while the capability remains disabled.
- Page contents, creator-digital-commons APIs, the canonical-backed resolver, admin surface, worker, and unrelated pilots/navigation remain unchanged.
- Forty-four focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed. Other page families and hosted verification remain.

## RELEASE-008 music royalty-ingestion worker family — 2026-09-18

- Royalty statement ingestion has its own default-off `music_royalties_ingestion_enabled` accounting policy, requires authorized statement sources, and must remain processing until validation, hashing/parsing, normalization, matching, and review are complete. Its schema is absent from the active migration evidence, the worker is unscheduled, and no import-to-payout receipt exists, so `music_royalty_ingestion` is a distinct disabled canonical capability rather than sharing music-finance-offering policy.
- `scripts/music-royalties-import-worker.ts` checks that capability before batch configuration, service-role client creation, `music_royalties_import_batches` claims, private statement download, file text decoding, generic CSV parsing, raw/normalized row writes, total reconciliation, quarantine/review transition, normalization metrics, or normalized outbox persistence. The worker performs no allocation. Enabled minor-unit, idempotency, reconciliation, quarantine, and reviewed-handoff semantics are unchanged; other workers are untouched.
- Seventy focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- All executable music worker and reconciliation entrypoints in the audited inventory now have canonical launch guards. Remaining direct pages/navigation and hosted verification still remain.

## RELEASE-008 creator federation page family — 2026-09-18

- `/federation` was the next smallest unambiguous disabled direct-page family: it has one client page, no discovered external navigation entry, and three discovery calls whose API routes consume the canonical `creator_federation` resolver.
- A server layout now returns `notFound()` before the page can hydrate or request entity, membership, or collective data while the capability remains disabled.
- Page contents, creator-federation APIs, the canonical-backed resolver, admin surface, worker, the internal cooperative link, and unrelated pilots/navigation remain unchanged.
- Forty-seven focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed. Other page families and hosted verification remain.

## RELEASE-008 music trust reconciliation — 2026-09-18

- Private trust reconciliation reuses `music_origin_processing`: its sole rollout input is `music_origin_processing_enabled`, it repairs the same origin/trust state as origin processing, and no direct policy evidence establishes a distinct launch policy.
- `scripts/music-trust-reconcile.ts` checks the capability before Supabase environment credentials, trusted-client construction, `feature_flags` or `artist_music` queries, `music_file_fingerprints` queue upserts, or `artist_music` updates. Enabled repair scanning, unresolved accounting, idempotent enqueue, private-track update, and metric semantics are unchanged; other workers are untouched.
- Fifty-eight focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- The audited executable music-worker inventory is now completely guarded. Remaining direct pages/navigation and hosted verification still remain.

## RELEASE-008 creator cooperative page family — 2026-09-18

- `/cooperative` was the next smallest unambiguous disabled direct-page family: it has one client page and four discovery calls whose API routes consume the canonical `creator_cooperative` resolver.
- A server layout now returns `notFound()` before the page can hydrate or request entity, membership, policy, or collective data while the capability remains disabled.
- Page contents, creator-cooperative APIs, the canonical-backed resolver, admin surface, worker, inbound education/federation links, and unrelated pilots/navigation remain unchanged.
- Fifty focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed. Other page families and hosted verification remain.

## RELEASE-008 creator interoperability convention page family — 2026-09-18

- `/interop-convention` was the next smallest unambiguous disabled direct-page family: it has one client page, no discovered navigation entry, and four discovery calls whose API routes consume the canonical `creator_interoperability_convention` resolver.
- A server layout now returns `notFound()` before the page can hydrate or request network, approval-package, recognition, or gated data while the capability remains disabled.
- Page contents, convention APIs, the canonical-backed resolver, admin surface, worker, and unrelated pilots/navigation remain unchanged.
- Fifty-two focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed. Other page families and hosted verification remain.

## RELEASE-008 creator public infrastructure + treaty operations page families — 2026-09-19

- `/public-infrastructure` and `/treaty-operations` were the next two smallest unambiguous disabled direct-page families, each with one client root, no discovered navigation entry, and four discovery calls whose API routes consume their canonical `creator_public_infrastructure` and `creator_multilateral_treaty_operations` resolvers.
- Server layouts now return `notFound()` before either page can hydrate or request entity/identifier/participation/gated or status/readiness/review/gated data while their capability remains disabled.
- Page contents, APIs, admin surfaces, workers, canonical resolvers, and unrelated pilots/navigation remain unchanged.
- Fifty-six focused Vitest cases, focused ESLint, `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and `check:cron-route-inventory` (7 scheduled, 1 deferred) passed.
- Remaining direct-page families are interop institution/organization, protocol constitution, and treaty legacy/renewal; hosted staging/production evidence remains outstanding with QA-003.

## Deployment closeout — 2026-09-19

- The `npm run build:vercel` environment guard is a configuration gate, not a
  code defect: `validate-production-env --phase build` passes with
  `NEXT_PUBLIC_SITE_URL=https://tourify.live`, and the approved deployment env
  files (`deployment/demo.env`, `deployment/production.env`) already carry
  HTTPS origins. Only the local `.env.local` localhost value trips the guard.
- The full build on Next.js 15.5.24 with the approved origin compiles through
  the `type-checking` stage but does not complete within a bounded run in the
  shared dirty worktree; authoritative completion is the curated/CI build.
- `check:migration-validation` passes across the full chain including the MFA
  verification-code store migration. Migration checksums and supabase-target
  gates require hosted inputs (`MIGRATION_CHECKSUM_BASE_SHA`,
  `SUPABASE_PROJECT_ID`, `SUPABASE_TARGET_CONFIRMATION`) that are
  credential-gated.
- Remaining deployment gates: full typecheck/build on a curated checkout or CI,
  hosted Vercel/Supabase provisioning (RELEASE-007), migration application and
  hosted schema evidence (DB-008), and exact-SHA staging certification
  (QA-003). No code or env files were changed in this closeout; evidence lives
  in RELEASE-006 and this state file.

## P0 orchestration wave 26 (RELEASE-008) — 2026-09-20

- Closed the final five launch-disabled direct-page families at canonical server
  layout boundaries before client hydration or API discovery: `/interop-institution`
  (`creator_interoperability_institution`), `/interop-organization`
  (`creator_interoperability_organization`), `/protocol-constitution`
  (`creator_protocol_constitution`), `/treaty-legacy` (`creator_treaty_system_legacy`),
  and `/treaty-renewal` (`creator_treaty_system_renewal`).
- Each layout matches the Wave 24 canonical denial pattern exactly — no new guard
  forms, middleware, or flag semantics — returning `notFound()` while the capability
  is disabled. The five families' 5/5/5/6/5 discovery calls remain behind the denied
  boundary, and every page/API/resolver/admin/worker is unchanged.
- Extended the page-coverage suite with ten focused cases (denial + real discovery
  routes per family) and added confirmatory RELEASE-008 ownership rules for the five
  layout paths; the regenerated ownership manifest at `59971a9e` reports them
  task-record for RELEASE-008.
- Evidence: 66 focused Vitest cases passed, focused ESLint clean,
  `check:public-surface`, `check:production-debug` (40 covered unsafe routes), and
  `check:cron-route-inventory` (7 scheduled, 1 deferred) passed; `agents:generate`
  refreshed all maps at the current SHA and `agents:validate` reported
  **17 agents, 113 tasks, 0 warnings, 0 errors**.
- Remaining RELEASE-008 work: hosted exact-SHA staging verification for QA-003 after
  an approved deployment, and owner review of public metrics/legal findings.

## P0 orchestration wave 26 (RELEASE-006) — 2026-09-20

- Definitive `npm run build:vercel` rerun on the curated clean checkout at SHA
  `59971a9eeba217a635b47d5c667450cd40082f0d` exits 1 at the production
  environment guard before compilation; `.next/BUILD_ID` is not produced.
  Command: `NEXT_PUBLIC_SITE_URL=https://tourify.live npm run build:vercel` on
  node v24.19.0 / npm 11.17.0 with the stale npm user-agent override removed;
  full output captured in `build-2026-09-20.log` (worktree root, uncommitted
  evidence artifact).
- Exact failure chain: `build:vercel` -> `validate:env:production`
  (`node --import tsx scripts/ci/validate-production-env.ts --phase build`) ->
  `validateProductionEnvironment("build")` in
  `lib/config/environment-contract.ts` -> issue code `missing` for
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `INTERNAL_API_SECRET`,
  `CRON_SECRET`. The clean checkout carries no `.env*` files (`.env*` is
  gitignored at `.gitignore:24`); the earlier "guard passes with the approved
  HTTPS origin" evidence only held in the dirty shared worktree whose untracked
  env values supplied those six variables. No credential was fabricated or
  copied, and hosted/Vercel/Supabase state was not touched.
- The 04:00Z 2026-09-20 temp-worktree claim (compilation succeeded, type
  validation running) is unverifiable: that worktree and its evidence were
  swept before capture.
- Verdict: **FAIL** for `build:vercel` in a clean (credential-free) checkout.
  Compile/lint/typecheck/prerender completion evidence remains
  hosted/credential-gated (exact-SHA CI/Vercel build with the HTTPS origin plus
  the six required variables). RELEASE-006 stays active, and
  `npm run agents:validate` passes at `59971a9e`.

## RELEASE-005 local Vitest closure — 2026-09-21

- At `ddf3b43d482900c6f7c6d8356e122f59885224c6`, the previously recorded MFA
  backup-code timeout is stale: the isolated integration file passed all 8
  tests, with the slowest backup-code redemption case completing in 5.425
  seconds.
- The `PublicSiteMapViewer` failure reproduced as a stale source-inspection
  path, not a product regression. The 2026-09-19 venue-tree consolidation moved
  the implementation to `app/venue/components/site-map-viewer.tsx` and left
  `components/venue/site-map-viewer.tsx` as a compatibility export. The contract
  test now verifies both the canonical implementation and compatibility export;
  the two historical failure files pass together (2 files, 11 tests).
- Full local Vitest passed on Node v24.19.0/npm 11.17.0: 567 files passed, 2
  skipped; 5,313 tests passed, 8 skipped; exit 0 in 24.45 seconds. This removes
  the local Vitest blocker only.
- Focused ESLint and whitespace checks passed. Agent control-plane validation
  reported 17 agents, 113 tasks, 0 errors, and the expected 8 generated-map SHA
  warnings; maps and `TASK_INDEX.json` were intentionally not refreshed.
- RELEASE-005 remains active. Jest configuration and deterministic
  typecheck/build evidence are not completed by this slice, and hosted exact-SHA
  QA-003, branch protection/required checks, deployment blocking, migration and
  security evidence, approver, deployment IDs, and rollback point remain
  required. No workflow, deployment, branch-protection, credential, generated
  map, or shared task-index change was made.
- After the concurrent SOCIAL-004 regression file landed, the combined suite
  was rerun: 568 files passed, 2 skipped; 5,317 tests passed, 8 skipped; exit 0
  in 23.04 seconds. Fresh read-only GitHub evidence remains blocked: the newest
  ten `e2e.yml` runs are failures from 2026-09-05, none targets `ddf3b43d`, and
  ~~the main-branch protection endpoint still returns 404 `Branch not protected`.~~ **SUPERSEDED 2026-09-25:** it returns **200** with 10 strict required contexts. See REL-005. The surrounding sentence is retained as the 2026-09-21 record; only the protection claim is corrected.

## RELEASE-005 local Jest closure — 2026-09-21

- The reproduced full Jest baseline had 7 failed/107 passed suites and 8
  failed/672 passed tests. Five suites imported Vitest but matched Jest's broad
  `lib/**` patterns; `jest.config.cjs` now explicitly excludes those auth,
  marketplace, and music suites. They pass under their owning Vitest runner: 5
  files and 30 tests.
- The marketplace checkout failures were stale fixtures. The tests now mock the
  existing guest-checkout capability guard and include the route's mandatory
  idempotency keys, allowing the intended pricing, guest, payout-readiness, and
  external-listing contracts to execute. Runtime checkout and idempotency code
  is unchanged.
- The music-royalty webhook's canonical `advanced_music_webhooks` capability is
  intentionally disabled and cannot be overridden by the legacy environment
  approval alone. The suite now proves the 503 denial before database access,
  then uses a test-only approval mock to exercise endpoint-secret, durable
  claim, duplicate, and persistence-failure branches. Runtime webhook and
  capability code is unchanged.
- Focused Jest passed 2 suites/18 tests. Full Jest passed all 109 suites and 681
  tests with no failures or skips in 4.199 seconds. Focused ESLint and
  changed-path whitespace checks passed.
- RELEASE-005 remains active: deterministic production typecheck/build, the
  rest of the local release checks, hosted exact-SHA QA-003, branch protection,
  deployment gating, and the final go/no-go evidence bundle remain outstanding.
  No deployment, credential, workflow, generated-map, or `TASK_INDEX.json`
  mutation was made.

## RELEASE-007 hosted topology inspection — 2026-09-22

- Read-only Vercel inspection maps both `demo.tourify.live` and `tourify.live` to production deployment `dpl_3tW7rRYa6chWxG7U7FDdLi7ZLngK` in project `tourify-beta-k2` (`prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`). Separate staging deployment/project isolation is disproven for the current aliases.
- Both public health endpoints return 200 without release SHA, deployment ID, Supabase-origin, or Stripe-mode headers. Both CSPs advertise `https://auqddrodjezjlypkzfpi.supabase.co`; staging runtime database and test-payment mode remain unproven.
- GitHub staging and production environments have no variables, secrets, or protection rules; ~~main branch protection is absent~~ **CORRECTED 2026-09-25 (REL-005): `main` IS protected** — the endpoint returns 200 with 10 strict required contexts plus review/admin enforcement. The GitHub *environment* claim above is unaffected and still stands. The field-by-field packet and operator checklist are at `docs/audits/flow-notes/release-staging-isolation-packet-2026-09-22.md`. No deployment, database write, actor, or payment action occurred.

## Wave 32 PR #14 release-lane check triage — 2026-09-25

Read-only diagnosis of the three non-passing release-lane checks on PR #14
(`codex/qa004-staging-campaign`, head `d2176904`, 900 changed files). No product
code, workflow, `vercel.json`, manifest, lockfile, branch-protection, or hosted
setting was changed. Full transcript:
`docs/audits/flow-notes/release-pr14-check-triage-2026-09-25.md`.

- **`Vercel` — 45-minute Vercel build-duration ceiling, not a defect.** Deployment
  `dpl_2zPXya6iLnXhdgDPeHu7mX3cbQdY` reports `readyState: ERROR`,
  `errorCode: BUILD_EXCEEDED_MAXIMUM_TIME`, plan `pro`, `buildingAt → ready`
  = 2738.605 s = **45.64 min**. Webpack had already reported
  `Compiled successfully in 4.4min`; the last log line is
  `Linting and checking validity of types ...`. All four candidate causes are ruled
  out with direct evidence: compile succeeded; the GitHub link resolves
  (`link.type github`, `productionBranch main`); the production environment contract
  **passed** in the build (`[env-check] Production build environment contract passed.`)
  and the project env carries all six required variable *names*; and the build ran
  a full 45 min on `pro` with no paywall or permission message.
- **The PR is wired to the PRODUCTION Vercel project, not staging.** `tourify-beta-k2`
  = `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`, and `targets.production.alias` =
  `[tourify.live, demo.tourify.live, www.tourify.live, …]` with
  `link.productionBranch: main`. `d2176904` is a `target: preview` deployment inside
  it. This **supersedes** the earlier "legacy/archival scratch clone"
  characterisation: `demo.tourify.live` is a production alias, so RELEASE-007
  acceptance criterion 1 is still unmet, and the Vercel Git integration is still
  building arbitrary PR branches inside the production project, which
  `docs/DEPLOYMENT_ROUTINE.md` §4 forbids. **Not changed** — hosted mutation needs
  owner authorization (`HF-RELEASE-007-VERCEL-HOSTED`).
- **Mitigation already in place:** the controlled promotion path is immune to the
  ceiling. `.github/workflows/deploy-demo.yml` runs `vercel build --prod` (line 105)
  in GitHub Actions and `vercel deploy --prebuilt --prod` (line 115), which uploads an
  artifact and performs no Vercel-side build. Only the uncontrolled auto-preview path
  is wall-clock bounded.
- **`Lint And Build` — genuine typecheck failure, correct pipeline.** Step 11
  `Typecheck` ran 17:38:34Z→18:46:52Z (**68m18s** of a 70m40s job) and emitted
  **1,384 primary diagnostics across 407 files** (TS2339 ×495, TS2769 ×265,
  TS2322 ×180, TS2589 ×163, TS2345 ×161, TS18047 ×26). The invocation
  `NODE_OPTIONS='--max-old-space-size=8192' tsc --noEmit` on a 4-core/16 GB
  `ubuntu-latest` runner is correct; the log has **zero** heap-out-of-memory /
  `FATAL ERROR` / `ENOMEM` / `Killed` / `SIGKILL` matches; no job sets
  `timeout-minutes`, so the 360-minute default applied and nothing timed out. The
  1h10m40s is real single-pass `tsc` work, matching the known slow-typecheck profile
  in RELEASE-006. **No timeout and no memory value was changed** — see `REL-001`.
- **Root cause is upstream and owned by `database`.** TS2345 on `venue_crew_members`,
  `venue_team_contractors`, and `get_staff_dashboard_stats` — objects in no migration
  and no generated type — plus a TS2339/TS2345/TS2322 flood across
  `lib/services/**` + `lib/venue/**` (132 files), `app/**` (148), `components/**`
  (74), `hooks/**` (18), `contexts/**` (10). The `Database Types` job failed earlier
  in the same run at `supabase start`. **The release gate is correctly failing and must
  not be bypassed** (`HF-RELEASE-DB-TYPECHECK`).
- **Consequence worth carrying forward:** steps 12–27 (15 release-gate steps plus
  `Build`) were all `skipped` behind the `Typecheck` failure, so **PR #14 has no
  production-build evidence at all** and RELEASE-006's deterministic typecheck/build
  criterion cannot be observed on this SHA.
- **`CodeQL` is NOT a workflow job and is NOT dismissible.** Check-run `106862973938`
  is a **GitHub Advanced Security code-scanning gate** (app slug
  `github-advanced-security`, app id 57789, check suite 96831076767, no workflow run
  behind it) — which is exactly why `gh run view --job 106862973938` returns
  `HTTP 404: Not Found`. It reports **96 open, undismissed, unfixed alerts** (0
  dismissed, 0 fixed, `dismissed_reason` null on all 96) including **1 critical**:
  alert #16, `js/request-forgery`, `app/api/discover/route.ts:351` (SSRF — outbound URL
  depends on a user-provided value; `discover`-owned). The repository's own
  `CodeQL (JavaScript/TypeScript)` job in `security-scans.yml` uses the same
  `security-extended` suite and **passed** — that job asserts the analysis uploaded,
  the platform check asserts no new alerts. Routed to `integrations` as
  `HF-RELEASE-SEC-CODEQL`.
- **CodeQL attribution caveat, stated precisely:** `main` has **0 alerts in any
  state** and **0 recorded analyses**; every recorded analysis is against a
  `refs/pull/*/merge` ref. With no baseline and 900 changed files, the platform check
  attributes the whole tree to the PR, as its own summary admits. Only
  `__tests__/qa/campaign-actor-provisioner.test.ts` (#93) is actually in the diff; the
  critical is not. This explains volume only — **no individual finding is dismissed.**
- **`main` IS now branch-protected — the recorded 404 is retired.**
  `GET /repos/KyleQD/Tourify/branches/main/protection` returns **200** with
  `required_status_checks.strict: true` over 10 contexts
  (`Production Debug Scan`, `Vitest`, `Database Types`, `Lint And Build`,
  `Unit Tests (Vitest)`, `E2E Tests (Playwright)`,
  `Security exception governance`, `Secret scan`,
  `CodeQL (JavaScript/TypeScript)`, `Generate SBOM`), plus
  `enforce_admins: true`, `required_linear_history`, no force pushes, no
  deletions, `required_conversation_resolution: true`.
  `required_signatures` is **false**.

  **NO HUMAN REVIEW IS REQUIRED, AND BOTH PRIOR RECORDS OF IT ARE WRONG.**
  The 2026-09-25 REL-005 correction in this file, and the matching claim in the
  2026-09-25 checkpoint above, state `required_approving_review_count: 1`,
  `dismiss_stale_reviews`, and `require_last_push_approval`. Re-read
  2026-09-28 against the live API, that is not what the endpoint returns. The
  field is `required_pull_request_reviews` (plural) and it is **absent from the
  response entirely** — `GET /repos/KyleQD/Tourify/branches/main/protection`
  returns the keys `allow_deletions`, `allow_force_pushes`, `allow_fork_syncing`,
  `block_creations`, `enforce_admins`, `lock_branch`,
  `required_conversation_resolution`, `required_linear_history`,
  `required_pull_request_reviews`, `required_signatures`,
  `required_status_checks`, `url`, and `required_pull_request_reviews` is empty.
  The earlier reading appears to have queried `required_approving_review_count`,
  which is not a top-level key on this payload, and recorded the resulting
  `null` as a value. A `null` read that way is absence, not `1`.

  **What this means operationally, and it is not a small thing:** `main` gates
  merges on the ten status contexts and on nothing else. `enforce_admins: true`
  means an admin cannot bypass a failing required check, but once those ten are
  green the merge is self-service — no second approver is asked for by
  GitHub. Any plan that assumes "PR approved" is enforced is wrong, and the
  launch gates in `docs/DEPLOYMENT_ROUTINE.md` §4 that rely on explicit approval
  are relying on the protected `production` *environment* reviewers, not on
  branch protection. Whether to close this is an owner decision (REL-003 owns the
  required-check set); no agent lane changed any protection setting and this
  entry changes none.
  ~~STATE.md and RELEASE-005 both still record `404 Branch not protected`; that baseline
  is obsolete.~~ **ACTED ON 2026-09-25 (Wave 35, REL-005):** the correction has been
  applied. The live-claim sites in this file and in RELEASE-005 were corrected in
  place; the dated evidence entries were **superseded by append** rather than
  rewritten, because rewriting a dated measurement falsifies the record.
- **Merge blockers on PR #14 are exactly three required checks:** `Database Types`
  (FAILURE), `Lint And Build` (FAILURE), `E2E Tests (Playwright)` (CANCELLED).
  `mergeStateStatus: BLOCKED`. The `Vercel` and Advanced Security `CodeQL` failures
  **do not block the merge** — neither is a required check.
- **Newly recorded RELEASE-006 determinism defects (none changed):** the repo tracks
  **both** `package-lock.json` (npm, lockfile v3, the enforced contract) and a stale
  332 KB `pnpm-lock.yaml`, and the hosted build warned
  `Detected pnpm-lock.yaml 9 … Using pnpm@10.x based on project creation date`; the
  hosted project setting is `nodeVersion: 22.x` while `engines.node` is `24.x` and
  `.nvmrc` is `24`; and three declared heap ceilings cover one workload
  (`vercel.json build.env` 4096, `build:vercel` 6144, `typecheck` 8192) on a
  4-core/8 GB Vercel build machine.
- **New fact that reframes a prior blocker:** the hosted build environment is
  **correctly provisioned** — the production env contract and the
  Node 24.19.0 / npm 11.17.0 / lockfile v3 toolchain contract both pass on Vercel. The
  previously recorded local `build:vercel` failure is therefore local
  **credential availability**, not a build-contract defect.

### Wave 32 open items

1. Owner: move PR preview builds off the production Vercel project and remove
   `demo.tourify.live` from its production aliases (`HF-RELEASE-007-VERCEL-HOSTED`).
2. Owner: decide required-check additions — the Advanced Security `CodeQL` gate,
   `Dependency review`, `Migrations And RLS Matrix` — and whether to split production
   build / migration checks / service-role audit into independent required jobs
   (`HF-RELEASE-005-REQUIRED-CHECKS`).
3. `database`: resolve the generated-type drift and the three missing objects, then
   re-run `Lint And Build` (`HF-RELEASE-DB-TYPECHECK`).
4. `integrations` (+ `discover` for the critical): triage 96 code-scanning alerts
   (`HF-RELEASE-SEC-CODEQL`).
5. RELEASE-006: remove or pin the stale tracked `pnpm-lock.yaml`; align the hosted
   `nodeVersion`; collapse the heap ceilings only after a green-run duration is
   measured.

## Wave 35 governance lane — 2026-09-25

Full evidence: `docs/audits/flow-notes/release-wave35-governance-2026-09-25.md`.
Decisions: `REL-002` … `REL-006` (domain) and `CP-077` … `CP-079` (cross-domain).
**One code file changed: `.github/workflows/ci.yml`.** No product file, hosted
environment, branch-protection setting, code-scanning analysis or alert, lockfile,
or `e2e.yml` was touched. No git history operation was performed. No credential,
token, DSN, or hosted value was read, printed, or fabricated; the only environment
data inspected was the set of variable **names** in `deployment/*.env`.

### The release gate is now eleven independent jobs

`ci.yml` went from one composite job to eleven, with **no `needs:` edges**. The
production build, the migration gates and the service-role audit were steps
sequenced after `Typecheck` and were therefore `skipped` on run `35761777731`,
which is why head `d2176904` has no production-build evidence at all. They now
report their own conclusions. `Lint And Build` keeps only clean install, lint, the
ESLint warning budget, the critical dependency audit and the typecheck — exactly
the evidence that was already running when the gate failed. `npm audit
--audit-level=critical` **moved up** ahead of `Typecheck`, so it stops being
maskable: strictly more coverage than before.

Coverage preservation is **proven, not asserted**: a set difference of every `npm
run …` / `npm test` / `npm ci` / `npm audit` invocation before and after returns
**0 removed and 0 added**, and the file contains zero occurrences of
`continue-on-error`, `if: always()`, `|| true`, `|| echo`, or
`ignoreDuringBuilds`.

### The four `ci.yml` required context names are contract

GitHub matches a required status check by its reported **name**, so renaming the
job that emits one changes branch protection without touching a protection file.
`Production Debug Scan`, `Vitest`, `Database Types` and `Lint And Build` are
reproduced byte-for-byte and their presence is asserted mechanically (`CP-077`).
The six other required contexts come from `e2e.yml` and `security-scans.yml`,
neither of which was modified.

### Nine of eleven job caps are provisional, and say so in the file

Measured against a green whole-job run: `Production Debug Scan` 56 s,
`Vitest` 119 s, `Mobile Typecheck And Lint` 85 s (green `mobile-checks`).
Everything else is annotated `PROVISIONAL` in `ci.yml` with the single green run
that would replace it. The `Typecheck` step cap of 115 min is 1.69× the only
observation (68 m 18 s, on a *failing* tree). The `Production Build` cap rests on
a cost model whose **static-generation phase has never once been measured**,
because the `Build` step has never completed on this repository; 45 min is
budgeted for it deliberately over-generously. No claim is made that any job
completes inside its budget.

The duplicate full-repo `tsc` inside `next build` is **not** removed. The only
switch is `typescript.ignoreBuildErrors` in `next.config.ts`, which is not
release-owned and whose relaxation would weaken a gate. The honest outcome is a
correctly-budgeted long build, not a fast one — see `HF-QA-035-E2E-BUILD-HEADROOM`
for the E2E-job headroom arithmetic, raised as a coordination item rather than
applied to QA's file.

### The `refs/heads/main` code-scanning baseline: root cause found, and it is a merge-ordering fact

`GET /code-scanning/analyses?ref=refs/heads/main` → **0**.
`?branch=main&state=open|dismissed|fixed` → **0 / 0 / 0**. All **19** recorded
analyses are `refs/pull/{14,6,5,4}/merge`.

**Both candidate causes in the earlier hypothesis were wrong.** `main` *was*
pushed (`76d8389e…`, 2026-07-19, `protected: true`), and the SARIF upload *is*
landing (19 PR analyses, CodeQL 2.27.0, `/language:javascript-typescript`). The
real cause is a third thing: **`.github/workflows/security-scans.yml` has never
been on `main`.** `git ls-tree --name-only origin/main .github/workflows/` returns
13 files and it is not among them; it was introduced in `be313ca2` (2026-08-04) on
an unmerged feature branch. GitHub Actions runs only workflow files present in
the pushed commit, so `on: push: branches: [main]` **has never existed on the
default branch and has never had the opportunity to fire** — and the
`schedule: cron "23 9 * * 1"` trigger is equally inert, with zero `push` and zero
`schedule` events in 19 recorded runs.

**A sharper coupling surfaced and matters more than the baseline itself:** four of
the ten required contexts — `Security exception governance`, `Secret scan`,
`CodeQL (JavaScript/TypeScript)`, `Generate SBOM` — are emitted **only** by that
file, which is **not on `main`**. They are satisfiable only because a pull request
carries it; there is **zero evidence their `push: main` path has ever run**; and
removing the file from `main` would make four required contexts unproducible and
block every future merge.

Until `analyses?ref=refs/heads/main` is non-empty, the Advanced Security `CodeQL`
gate **cannot function as a regression gate** for this repository and its alert
count measures pull-request size, not risk. That is a pipeline fact, not a
statement about any finding: 94 of 96 alerts sit in files the PR never touched and
the single critical is not in the diff, yet **nothing was dismissed** (CP-060). The
Wave 33/34 fixes to `app/api/discover`, `app/api/hub` and `lib/news/feed-service.ts`
are **not** confirmed closed — GHAS has no local engine. Five-step owner procedure
in the evidence record §3.4; the single check that proves the defect closed is a
non-empty `analyses?ref=refs/heads/main`.

### Required-check posture: decided, recorded, NOT applied

Seven questions answered with rationale in `REL-003` / `CP-077`:

| Candidate | Decision |
| - | - |
| `Dependency review` | **Require** — unconditional on PRs, already green, already `fail-on-severity: critical` |
| Advanced Security `CodeQL` | **Defer** — no `main` baseline, so it would enforce a PR-size artefact |
| `Migrations And RLS Matrix`, `mobile-checks`, `redirect-safety`, `Mobile Typecheck And Lint` | **Do not require as configured** — all four are **path-filtered**, and a required context that does not report for a head SHA **blocks the merge**. Requiring any of them would brick `main` on the first unrelated PR |
| `Production Build`, `Migration Gates`, `Service-Role Audit`, `Jest Unit Tests`, `Route And Registry Gates`, `Regression Safeguards` | **Require** — one atomic `PUT` |
| `required_signatures` | Leave `false`; recommend the owner enable it |

GitHub **replaces** `required_status_checks.contexts` wholesale rather than
appending, so the change is a single atomic operation with **no window in which
enforcement is weaker than today's**. The exact owner procedure — read the current
set programmatically, build current+6, `PUT` once, read back — is in the evidence
record §2.3. **No `PUT` was issued and no protection state was changed by this
lane.** One hard sequencing constraint: the six new contexts only start reporting
once a pull request runs the restructured `ci.yml`, so the `PUT` must land in the
same window as the merge carrying the restructure, or immediately after it.

### Two operator-gated preconditions, recorded as blocking

1. **Type regeneration** — `HF-RELEASE-035-TYPE-REGEN-OPERATOR`. Credential-gated,
   not permission-gated: `supabase/.temp/linked-project.json` exists but
   `supabase/.temp/pooler-url` is 92 bytes with **no embedded password**, and
   Docker is unavailable, so all three modes of
   `scripts/ci/database-types-source.mjs` are blocked. Regeneration is now *safe*:
   the database lane withdrew its blocker with evidence that the active chain is a
   strict **superset** of the contract (+13 relations, +54 columns, +42 callables,
   **zero** contract-only), so it would add coverage and delete none.
   `lib/database.types.ts` is byte-unchanged. This 8 GB machine cannot measure the
   type surface at all — CI's 16 GB runner is the only place the 1 384-diagnostic
   count can be re-measured.
2. **`INTERNAL_API_ORIGIN`** — `HF-RELEASE-035-INTERNAL-API-ORIGIN-OPERATOR`. The
   guard reads `INTERNAL_API_ORIGIN` → `NEXT_PUBLIC_APP_URL` →
   `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL`, with no fallback and no
   localhost default, so an unset environment silently returns empty sections by
   design. **New finding:** `deployment/demo.env` (31 keys) and
   `deployment/production.env` (25 keys) contain **none** of the four names, and
   neither carries `ENCRYPTION_KEY`, `INTERNAL_API_SECRET` or `CRON_SECRET`. An
   operator who loads either template and deploys gets the fail-closed response.
   **No key was added and no value was written** — a guessed origin would either be
   refused or allowlist something that should not be reachable.

**Three claims stay unprovable without a live target**, recorded so they are not
mistaken for covered: PostgREST schema-cache behaviour after a migration (a stale
cache yields zero rows and *no* error — the same shape as the Wave 34 search
drift); real RLS against real rows, since `Migrations And RLS Matrix` proves the
matrix against a freshly built *ephemeral* stack; and the **13 view relations
whose columns are proven by name occurrence** rather than by replaying the
`SELECT` list.

### Stale records retired

`main` is protected. Corrected in place as live claims: this file's lines 29, 403,
436 and the 521–522 note, plus `RELEASE-005.json` `progress.blockers[2]` and the
`RELEASE-007.json` audit baseline. Superseded **by append** as dated observations:
the RELEASE-005 evidence lines dated 2026-09-09 and 2026-09-20, and the
RELEASE-007 evidence dated 2026-09-22 — each was true on its date, and rewriting a
dated measurement would falsify the record (`REL-005`). **Verified to carry no
stale claim and therefore untouched:** `CHARTER.md` and `BASELINE.md`, `GAPS.md`,
`QUESTIONS.md`, `VERIFICATION.md`, `INTERFACES.md`, `ARCHITECTURE.md`, `BACKLOG.md`.

The two Vercel facts are reconciled: `tourify-beta-k2` (`prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`)
**is the production project**, and `targets.production.alias` contains
`tourify.live`, `www.tourify.live` **and `demo.tourify.live`** — so **RELEASE-007
criterion 1 is unmet** and PR previews build inside the production project, which
`docs/DEPLOYMENT_ROUTINE.md` §4 forbids. Any "legacy/archival scratch clone"
description of that project is superseded. Note the trap:
`docs/engineering/PROJECT_STATE.md:43-44` mentions `myproject/tourify-beta-K2`, a
**local directory**, which is a different object; that reference document was not
edited. Remediation is owner-executed in `HF-RELEASE-007-VERCEL-HOSTED`, with the
ordering constraint that the Git integration must be disabled **before**
`demo.tourify.live` is removed from the production aliases.

### New known risk

Four of ten required contexts depend on a workflow file that is not on `main`, and
`actionlint` is unavailable here, so the restructured `ci.yml` has had YAML parse,
structural, script-existence and expression-balance checks but **no schema-level
lint**. The first CI run is the first real lint of the new file.

## RECOVERY NOTE — 2026-09-27, RELEASE-011

- This file was **truncated to zero bytes by a write error in RELEASE-011** and restored from `HEAD` (`16fb834f`) in the same session. The restore is byte-exact for everything that was committed.
- **What is lost:** the uncommitted sections this domain's STATE.md carried above the committed baseline, including RELEASE-010's dated sections about the scoped `feature` typecheck (CP-106/CP-111). That lane never committed, and git therefore holds no copy. **RELEASE-010's own task record is intact and is the surviving record of that work** — `docs/engineering/tasks/active/RELEASE-010.json`, whose `progress.summary` and `verification.evidence` carry the measured before/after, the negative controls, the coverage figures and the two routed findings in full. Nothing in RELEASE-010's implementation was lost: `scripts/verify.mjs`, `package.json`, `ci.yml` and `docs/DEVELOPMENT_WORKFLOW.md` are all intact and were edited further, not replaced.
- **Why it is recorded here rather than quietly rewritten:** an agent that reads this file must know that its history has a gap, and must not read the absence of RELEASE-010's sections as a statement that the work never happened. A restored file that looks untouched is worse than a visibly restored one.
- **The lesson, in the lane's own terms:** RELEASE-011's third self-caught defect was a confident claim in the direction the evidence was easiest to produce (a `ls` in the wrong worktree), and its fourth was writing a file without checking the write landed. Both are the same failure this task exists to remove: a statement that was never verified, made by the agent whose job is to verify things. The check that would have caught it is one `wc -c` after the write, which costs nothing.

## RELEASE-011 credential-gated steps and the three-verdict tier — 2026-09-27

- The `feature` tier now has **three** verdicts, not two: `pass` (exit 0), `incomplete` (exit 3, nothing that ran failed but N step(s) could not run), and `fail` (the failing step's own exit status). The last line of every run is `[verify:feature] RESULT: <verdict>`, and **exit 0 is reserved for a real pass**, so a run with a skipped step cannot be recorded green by a lane that only reads `$?`.
- `check:supabase-target` declares its environment (`SUPABASE_PROJECT_ID`, `EXPECTED_SUPABASE_PROJECT_ID`, `SUPABASE_TARGET_CONFIRMATION`) in `scripts/verify.mjs`, and the declaration is **printed on every run including green ones**, so the gate cannot be dropped without leaving a trace. Absent variables means skipped and named; present variables means the step runs and any failure is a real failure, including a target mismatch. Fail-closed.
- A skip no longer stops the tier, so the steps behind a credential-gated step now actually run. The first run after the change failed at `check:admin-audit` with its 3 pre-existing findings: that is the gate working, not masked, and it is the expected consequence of unmasking.
- A step that did not run is a skip **wherever** the reason is environmental, including the pre-existing `--changed`-with-no-changed-TypeScript-source case, which used to exit 0 while type-checking nothing. A documentation-only change is now `incomplete`; `verify:fast` is the tier for work that cannot affect these checks.
- The `fast` and `release` tier blocks are byte-identical to the pre-change file (both blocks extracted and diffed against `git show HEAD:scripts/verify.mjs`). `verify:release` deliberately keeps failing loudly on its credential-gated step: a release that cannot be built in a configured environment must not pass.
- The guarantee is per **applicable** step and is not overclaimed: a docs-only change in an unprovisioned environment can still be `pass`, because `check:supabase-target` does not apply to it.
- The scoped typecheck now prints the **reverse dependents** of each changed root (textual importers, one `--untracked` `git grep`, measured 0.54s for 17 roots). CP-111's `--typecheck-scope` was not sufficient alone, because the manual step is the part that gets skipped; the printed list is the copy-paste source. It is a pointer, never a gate, and every error it can make is in the safe direction. See CP-122.
- **A CP-111 correction issued by this lane was WITHDRAWN.** I recorded that the two scope projects CP-111 cites (`tsconfig.ds-scope.json`, `tsconfig.wfc003-slice.json`) do not exist; they do. They are untracked working-tree files created 2026-09-26 by the DESIGN-034 and WFC-003 lanes, with exactly the cited shape, and `tsconfig.wfc003-slice.json` lists a `__tests__` root, which is the precise claim CP-111 makes. The claim came from a `ls` inside a temp detached worktree, which contains only committed content, and was generalised to "at any SHA". Withdrawn in `DECISIONS.md` with the lesson: a claim of absence must be established in the environment where the thing is supposed to be. The surviving refinement is that both files are untracked, so the committed precedents are `tsconfig.admin003-slice.json` and five others.
- DB-015's never-executed-migration-block detector is **wired**: two `package.json` scripts and two steps in `ci.yml` job `migration-gates`, appended after the DB-014 steps with no job added, renamed or removed, so no required status-check name changed. It exits 0 today (567 sites, 53/53 dispositions, 36/36 fixtures); both of its legitimate reds were demonstrated on an isolated copy of the chain, with a control run on the same copy to license the demonstration.
- CP-123: the two pre-existing `account-management.service.ts` type errors are ONE defect and the stale side is the **code** — `create_post_with_context` is in neither the active chain nor the generated contract, its only DDL is in `archive/` and is `SECURITY DEFINER` with no `set search_path` and no ownership check on the caller-supplied `profile_id`, and the calling method has zero callers. Routed to `general-user` (cc `social`, `database`) with deletion recommended.
- A control-plane finding routed, not applied: `verification.result` in a task record is an enum of `not-run | pass | fail` and has no word for a partially-covered run, which is the mechanism by which a lane records a false pass. `HF-RELEASE-011-TASK-SCHEMA-HAS-NO-PARTIAL-RESULT`.
