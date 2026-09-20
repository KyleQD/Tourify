# Release state

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
- GitHub branch-protection lookup for `main` returned 404. No required-check enforcement evidence exists, and no workflow, deployment, or branch-protection change was made.
- Closure requires fixing the two tests, a successful matching-SHA hosted E2E run, and owner-provisioned branch protection with `e2e.yml` required.

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
