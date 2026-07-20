# Model Periodic Review Conference and Implementation Package

## Model documents

1. Convening authority and legal mandate.
2. Scope questions and exclusions.
3. Baseline date and immutable evidence manifest.
4. Methodology, data-quality and conflict policy.
5. Creator, civil-society, state, IO and expert participation plan.
6. Structured expert dialogue terms.
7. Public consultation notice and response matrix.
8. Draft findings with uncertainty and dissent.
9. Competence and amendment classification for each recommendation.
10. Final outcome instrument.
11. Implementation assignments, owners, funding and deadlines.
12. Monitoring indicators and public reporting schedule.
13. Appeal, correction and complaint routes.
14. Next-review trigger and sunset.

## Decision outcomes

- `continue_unchanged`
- `continue_with_operational_corrections`
- `narrow_service_scope`
- `recommend_formal_amendment`
- `recommend_new_protocol`
- `consolidate_or_supersede_protocols`
- `suspend_service`
- `terminate_service_or_protocol`
- `commission_further_evidence`

A conference outcome never becomes effective beyond the authority and process established by the current instrument.


## Non-negotiable integration boundary

- `artist_music` remains the canonical upload and catalog anchor. Phase 17 records reference canonical music, rights, licence, royalty, administration, federation, commons, constitutional, convention and institutional sources; they never replace them.
- Private audio remains in the existing `artist-music` bucket. Playback continues through `/api/music/stream`, `resolveMusicAccess`, the current `JukeboxProvider`/`useJukebox` flow and existing mobile playback paths.
- Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, licensing, royalty and rights-administration behavior must remain green.
- Use additive migrations, explicit backfills, default-deny RLS, restricted storage, short-lived signed URLs, versioned records, feature and jurisdiction gates, append-only audit/outbox events and documented compensating actions. Never reset the database.
- Tourify remains an optional implementation and service provider. Treaty operations, review conferences, registries, public services, archives and institutional continuity must remain operable if Tourify exits, fails, changes ownership or stops providing services.
- No account, identifier, credential, observer role, advisory seat, prior-phase participation or public projection creates membership, treaty status, representation, ownership, licensing, collection, enforcement, payment, privilege, immunity, diplomatic or public regulatory authority.
- Public identifiers, credentials, registries and resolver responses may support discovery and verification but are never sufficient alone for a high-impact action. The current authoritative instrument, participant authority, governing-body decision, mandate, jurisdiction and source record must be checked at execution time.

## Mandatory stop conditions

Stop rather than degrade when legal character, competence, participant authority, membership, instrument status, source lineage, review mandate, amendment authority, host arrangement, privilege schedule, funding, appropriation, jurisdiction, privacy, security, accessibility, competition, procurement, staffing, relationship agreement, provider contract, independent review or public approval is missing, disputed, expired or stale. A review conference cannot enlarge institutional competence by ordinary software configuration, administrative guidance or implementation practice.

## Required verification

- Default-deny RLS and API authorization for states, international organizations, creator bodies, observers, delegates, secretariat staff, experts, reviewers, auditors, operators and workers.
- Idempotent retry, duplicate webhook, outbox replay, external reconciliation, expiry, suspension, revocation, withdrawal, supersession and compensating-action tests.
- Cross-organization isolation, local-sovereignty, jurisdiction, competence, protocol-version, reservation, host-country and privilege non-activation tests.
- Public-projection minimization, stale-source, disputed-source, re-identification, multilingual, accessibility, assisted-service and low-bandwidth tests.
- Key rotation, compromised operator, registry poisoning, malicious resolver, funder capture, provider failure, archive loss, network partition and Tourify-unavailable continuity exercises.
- Complete regression coverage for upload, streaming, access, Jukebox, mobile, marketplace, feed, profile, EPK, analytics, licensing, royalties and rights administration.
