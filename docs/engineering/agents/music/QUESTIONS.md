# Music questions for product owner

Reconciled: 2026-09-10 by MUSIC-001. These questions supersede the initial pass where runtime auth and the unsigned webhook were still unresolved. They are sequencing decisions, not blockers for closing the audit; each answer should become a bounded follow-up task.

## P1 — Answer before implementation or launch claims

### Q1 — Should the archived rights/royalty/trust schema be promoted, repaired, or dropped? [GAP-01]

**Context**: Music route and worker code depends on rights, certification, trust/origin, royalty, and valuation tables whose DDL is currently only in `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/`, not the active migration chain.

**Decision needed**: Promote the needed schema additively through the DB reconciliation process, replace it with a smaller launch schema, or drop the dependent surfaces until a later phase?

**Sequencing**: First dependency for rights, certification, trust, royalties, and worker deployment.

**Owner**: Product owner + Music + Database.

### Q2 — Which Music workers are launch-required, and where should they run? [GAP-02, GAP-03]

**Context**: The repository has 16 outbox workers, 5 processing workers, and 1 trust reconciliation worker, but none is scheduled. No worker integration tests establish retry, DLQ, idempotency, or health behavior.

**Decision needed**: Schedule all processing paths, select a smaller launch subset, or retire/in-line some workers? Confirm cadence, retry/DLQ policy, and acceptable stale-work window.

**Sequencing**: Determines MUSIC-004 scope and the order of worker test coverage.

**Owner**: Product owner + Music + Release/Operations.

### Q3 — What is the Music launch slice? [GAP-04, GAP-05, GAP-07, GAP-10, GAP-11, GAP-12, GAP-15]

**Context**: Music spans catalog/upload, playback, public verification, rights, certification, royalties, licensing, analytics, marketplace, venue, admin, and rights-processing surfaces. Several are feature-gated, redirected, or stubbed.

**Decision needed**: Rank day-one, pilot-only, and future/drop surfaces. Explicitly decide whether rights anchors, protected derivatives, venue Music, and admin Music are launch features.

**Sequencing**: Sets the test, schema, worker, and release order.

**Owner**: Product owner.

## P2 — Answer within the implementation sprint

### Q4 — What is the feature-flag release policy? [GAP-07]

**Context**: Trust, rights-admin, rights-intelligence, licensing, royalties, marketplace, and certification expose named flags and disabled states. Public verification is intended to be reachable only if its launch flag and schema are available.

**Decision needed**: Which flags are enabled for pilot, which remain default-deny, and should disabled surfaces redirect, render an explanation, or be removed from navigation?

**Owner**: Product owner + Music + Release.

### Q5 — Should Music licensing remain Music-owned? [GAP-08, GAP-09]

**Context**: `lib/music/licensing/` contains a domain model, while `app/api/licensing/**` is cross-domain. Creator governance/treaty subsystems also occupy a large part of `lib/music/` but do not implement core catalog/playback/rights/royalty behavior.

**Decision needed**: Keep licensing and creator governance inside Music, extract them to separate owners, or retire the readiness-only subsystems?

**Owner**: Product/architecture owner.

### Q6 — What should venue Music provide? [GAP-10]

**Context**: `/venue/dashboard/music` currently redirects to `/venue/dashboard`.

**Decision needed**: Build playlist/event curation, event playback controls, or no venue Music product surface?

**Owner**: Product owner + Venue + Music.

### Q7 — What should admin Music provide? [GAP-11]

**Context**: An admin Music page and admin Music rights/certification/import routes exist, but there is no verified dashboard workflow.

**Decision needed**: Define moderation, dispute, certification, import, and operational actions, or keep the page out of launch navigation.

**Owner**: Product owner + Admin + Music.

### Q8 — When does Music analytics need aggregation? [GAP-12]

**Context**: Plays and engagement events are recorded per event and current stats can be synchronized, but no aggregation worker or materialized view exists.

**Decision needed**: Set a volume/latency threshold for raw reads versus indexed rollups or scheduled aggregation.

**Owner**: Product owner + Music + Database.

## P3 — Answer before broader expansion

### Q9 — What trust reconciliation freshness is acceptable? [GAP-06]

**Context**: Trust policy coverage exists, but the repair worker is unscheduled and the underlying schema is not in the active chain.

**Decision needed**: Is trust status informational, access-gating, or launch-critical? Choose the expected reconciliation cadence and stale-data tolerance.

**Owner**: Product owner + Music.

### Q10 — Is Audius optional or production-critical? [GAP-14]

**Context**: Audius adapter/error unit tests exist, but route-level resilience and fallback behavior are not defined.

**Decision needed**: Treat Audius as optional discovery, require a fallback/circuit breaker, or replace it through the provider registry before launch?

**Owner**: Product owner + Integrations + Music.

### Q11 — What mobile parity is required? [BASELINE §4]

**Context**: Mobile exposes a Music tab, while web has much broader catalog, rights, royalty, and marketplace surfaces.

**Decision needed**: Define mobile launch requirements and whether mobile consumes the existing APIs or needs dedicated contracts.

**Owner**: Product owner + Mobile + Music.

### Q12 — Which route tests are required for the launch slice? [GAP-04]

**Context**: Focused auth adoption tests now cover all 33 Artist Music and 13 Music Marketplace handlers, but most critical route behavior is still untested. The focused `music-post-preview` test now passes locally; the global Vitest failure count needs a fresh inventory.

**Decision needed**: Choose the minimum route contract matrix for catalog/playback, rights, royalties, certification, public verification, and Marketplace handoff before pilot.

**Owner**: Music + QA + Release.

## Resolved decisions not to reopen

- Marketplace owns checkout, orders, transfers, portfolios, and the financial `/api/music-marketplace/**` operations; Music owns catalog, rights, and royalties. Evidence: `docs/engineering/tasks/completed/MUSIC-003.json` and `docs/engineering/agents/music/INTERFACES.md`.
- Artist Music routes use the artist-profile auth contract, and Music Marketplace routes use Marketplace account/acting-context auth. Evidence: `docs/engineering/tasks/completed/ARTIST-004.json`, `docs/engineering/tasks/completed/MUSIC-005.json`, and their route tests.
- Royalty webhook processing fails closed without the dedicated `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES`; the unsigned and generic-secret fallbacks are retired. Evidence: `docs/engineering/tasks/completed/MUSIC-002.json`.

## Owner decisions — 2026-09-10

- Q1: promote/repair the archived rights, royalty, trust, and certification
  schema additively before scheduling dependent workers.
- Q2: start with the worker framework; use the hybrid deployment direction and
  leave exact worker count, cadence, retry/DLQ, and stale-work targets for the
  reconciliation follow-up.
- Q3: catalog and playback are the launch slice; other Music surfaces remain
  gated by schema and verification evidence.
- Q4: flags are default-deny with pilot allowlists/org flags and never bypass
  authentication or ownership.
