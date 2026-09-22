# Institutional memory, records management and archival mandate

## Purpose

Defines official records, archival value, retention authority, legal holds, disposition and independent memory-institution roles.

## Phase boundary

Phase 18 is a future-only handoff. It cannot be activated by a Phase 17 feature flag, background job, administrator setting, credential, conference result or continued software operation. The package does not create legal authority, membership, treaty status, representation, privilege, immunity, ownership, licensing, collection, payment, enforcement or regulatory power.

`artist_music` remains the canonical catalog anchor. Rights Passports, licences, administration cases, royalty ledgers, federation decisions, constitutional compacts, convention instruments, institutional records and official external sources remain authoritative within their domains. Phase 18 stores references, versioned decisions, immutable manifests and approved projections; it never rewrites those sources.

## Design position

Renewal is an affirmative, evidence-backed decision. Authority expires or becomes non-actionable when the governing instrument, delegation, appointment, mandate, budget, host arrangement, privilege schedule, provider contract or approval expires. No historical credential or public projection can silently extend authority.

Phase 18 uses long-horizon stewardship without treating the institution as perpetual. It must be possible to renew, narrow, replace, fork, suspend, terminate or dissolve each service while preserving creator rights, lawful records, local sovereignty, public archives and essential continuity.

## Primary records

- `future_phase18_approval_packages`
- versioned policy and schema records
- immutable source manifests and evidence bundles
- restricted evidence objects
- purpose-specific public projections
- append-only audit and outbox events
- actor-authority and jurisdiction records
- expiry, suspension, appeal and compensating-action records

## State model

`draft → proposed → under_review → adopted → approved → effective → implementation_due → implemented | partially_implemented | non_compliant → suspended | revoked | withdrawn | expired | superseded | terminated | rejected → archived`

Each transition records the acting authority, policy and schema version, jurisdiction, effective and expiry dates, source manifest, idempotency key, decision record, appeal route and audit event. Historical records retain the rules that applied when the action occurred.

## Workflow

1. Resolve the current actor, participant class, organization, jurisdiction and exact requested scope.
2. Load current authoritative instruments, authority records, local reserved powers, suspensions, revocations, conflicts and expiry.
3. Verify the immutable evidence manifest and applicable review, renewal or succession mandate.
4. Evaluate legal, privacy, security, accessibility, archival, competition, funding, procurement and continuity stop conditions.
5. Create a versioned proposal using a unique idempotency key.
6. Obtain required human review, public notice, independent input, governing-body approval or dual control.
7. Execute only through an approved route or outbox-backed worker.
8. Reconcile the result, publish only the permitted projection and preserve rollback or compensating action.

## Authorization rules

- Public identifiers, credentials, registry entries and resolver results support discovery; they do not authorize high-impact action.
- Current authority must be checked at execution time.
- Local creator and organization decisions control outside expressly delegated scope.
- Inherited office, historic membership, institutional custom, silence or operational necessity does not create authority.
- High-impact actions require separation of duties, human review, accessible notice, correction or appeal and a documented remedy.

## Non-destructive integration

- Extend the audited Next.js App Router and Supabase architecture.
- Prefer `app/api/creator-treaty-system-renewal/**` and `lib/music/creator-treaty-system-renewal/**` only after repository audit.
- Use colocated Zod schemas, `requireApiUser`, `jsonError`, named exports, interfaces, lowercase dashed filenames and RORO helpers.
- Use additive migrations, explicit RLS, restricted storage, short-lived signed URLs, immutable manifests and append-only audit/outbox records.
- Public routes read approved projections or security-invoker views, never confidential operational tables.
- Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, licensing, royalty and rights-administration behavior must remain green.

## Stop conditions

Stop rather than degrade when legal character, competence, authority, membership, instrument status, review mandate, renewal authority, source lineage, archive custody, jurisdiction, funding, appropriation, host arrangement, privilege schedule, privacy, security, accessibility, competition, procurement, staffing, provider contract, independent review, public approval or rollback evidence is missing, disputed, expired or stale.

No workflow may produce coordinated pricing, collective bargaining, collective licensing, representation, enforcement, boycott, market allocation, automated legal advice, ownership conclusions or regulatory power.

## Testing and evidence

Required evidence includes repository paths, deployed objects, migration and generated-type output, RLS matrices, route and worker tests, replay and idempotency tests, public-projection leakage tests, archive restoration, authority expiry, renewal denial, local-sovereignty, accessibility, low-bandwidth, provider-replacement, network-partition and Tourify-unavailable regression results.

Codex must record files changed, commands run, test output, external assumptions, approvals, owners, monitoring, rollback instructions and unresolved blockers in `phase-18-execution-plan.json` before marking work complete.

## Implementation decisions

Classify records as operational, evidentiary, legal, fiscal, technical, archival or disposable. Apply approved retention schedules, legal holds, fixity checks, redundant custody, open export formats, provenance metadata and documented destruction. Restricted records remain preservable even when public access is limited.
