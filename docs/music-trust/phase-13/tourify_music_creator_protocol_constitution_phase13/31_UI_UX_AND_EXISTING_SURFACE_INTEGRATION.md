# UI/UX and Existing-Surface Integration

## Purpose

Add constitutional readiness without degrading the current Tourify experience.

## Non-negotiable boundary

- Preserve `artist_music` as the canonical upload/catalog row and preserve private `artist-music` storage, the signed stream route, `resolveMusicAccess`, Jukebox, mobile, feed, profile, EPK, marketplace and analytics paths.
- Never reset or destructively rewrite the database; use additive migrations, explicit backfills, versioned records, feature flags, append-only audit events and compensating actions.
- Tourify remains an optional implementation and service provider; the creator protocol commons must remain independently operable if Tourify exits, fails, changes ownership or stops providing services.
- No constitutional authority, identifier, credential, wallet, registry enrollment, data contribution, representation mandate or service authorization may be inferred from a Tourify account or prior-phase participation.
- Identifiers are references and credentials are signed statements; neither creates copyright ownership, administration, licensing, collection, payment or legal-representation authority.
- `artist_music`, Rights Passports, licences, administration cases, royalty ledgers, federation decisions and official external records remain authoritative in their own domains and are referenced rather than rewritten.
- Public registries expose only approved, minimal and non-sensitive data; private identity, contracts, evidence, tax, payment, source files and rights-conflict records remain restricted.
- Every registry and resolver result identifies source, issuer, version, jurisdiction, effective period, freshness, confidence, suspension, revocation and dispute status.
- Local creator and member-organization sovereignty remains protected; no steward, operator, funder, federation, constitutional body or Tourify administrator may override a lawful local decision outside an expressly delegated scope.
- Phase 13 cannot launch from Phase 12 flags; production requires a separate constitutional approval package, ratification, independent stewardship and validated multi-operator continuity.

## Required design decisions

1. Create separate readiness, compact, governance and public-status surfaces.
2. Use role-appropriate language and warnings.
3. Keep music routes and players unchanged.

## Durable records

- `constitutional_ui_preferences`
- `notice_receipts`
- `accessibility_audits`

## Workflow

1. Resolve the current actor, organization, jurisdiction, policy and exact scope.
2. Load the current authoritative source records and immutable evidence manifest.
3. Evaluate stop conditions, conflicts, expiry, suspension, revocation and local reserved powers.
4. Create a versioned proposal using an idempotency key.
5. Obtain the required review, public notice, ratification or dual control.
6. Execute through an outbox-backed worker or approved operator.
7. Reconcile results, publish the permitted projection and preserve compensating rollback.

## Authorization and source-of-truth rules

- Public identifiers, credentials, registry entries and resolver responses are never sufficient by themselves for a high-impact action.
- The applicable current source record must be checked at execution time.
- Public projections are generated from approved projection tables or security-invoker views, never by exposing confidential operational tables.
- Every action records `policy_version`, `schema_version`, `jurisdiction`, `effective_at`, `source_manifest_id` and `audit_event_id`.
- A later rules change does not silently alter the meaning of a historical decision.

## Controls and stop conditions

- No implication that all Tourify users participate.
- No dark patterns.
- Mobile and low-bandwidth alternatives are supported.
- Stop when authority, ratification, source lineage, entity status, jurisdiction, privacy, security, accessibility, funding, provider contract or review evidence is missing or stale.

## Engineering requirements

- Use Next.js App Router route handlers under `app/api/creator-protocol-constitution/**`.
- Use colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and RORO helpers.
- Use additive Supabase migrations, explicit RLS, restricted storage, short-lived signed URLs and append-only audit/outbox records.
- All external writes and webhooks are signed where applicable, idempotent, replay-safe and reconciled.
- Every feature is behind an explicit Phase 13 feature flag and jurisdiction/entity readiness gate.

## Required tests

- visual regression tests
- screen-reader tests
- mobile regression tests
- Default-deny authorization and RLS.
- Idempotent retry, duplicate webhook, outbox replay and compensating-action coverage.
- Regression coverage for upload, streaming, access, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights administration.

## Completion evidence

Codex may mark this area complete only when the exact repository paths, deployed database objects, migrations, generated types, tests, reviews, feature flags, monitoring, operational owner, rollback instructions and unresolved blockers are recorded in `phase-13-execution-plan.json`.
