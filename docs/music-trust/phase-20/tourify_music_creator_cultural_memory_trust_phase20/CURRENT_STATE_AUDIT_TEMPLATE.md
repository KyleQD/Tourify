# Phase 20 current-state audit template

## Audit identity

- Repository:
- Commit:
- Branch:
- Deployment environment:
- Supabase project/reference:
- Auditor:
- Date:

## Canonical Tourify music paths

Record exact paths for `artist_music`, upload, private storage, streaming, `resolveMusicAccess`, Jukebox, mobile, entitlement, marketplace, feed, profile, EPK, analytics, licensing, royalty and rights administration. Note owners, tests and current blockers.

## Phase 1–19 source systems

For every relevant source, record table/view, API, event/outbox, authoritative owner, mutability, retention, dispute behavior and approved Phase 20 projection path. Confirm Phase 20 never writes back to canonical source records.

## Existing archive and preservation capability

- Storage providers and regions:
- Backup and restore evidence:
- Format identification and validation tools:
- Fixity and manifest tooling:
- Key management/HSM:
- Existing retention/legal-hold controls:
- Existing public/private file routes:
- Existing provider contracts and export terms:

## Legal and governance assumptions

- Proposed legal structure:
- Jurisdictions:
- Trust/nonprofit/public-benefit counsel:
- Charitable/tax status:
- Cultural-authority methodology:
- Indigenous/community consultation owners:
- Privacy and archival legal basis:
- Copyright and repatriation review:
- Independent oversight:

## Database and RLS audit

List all proposed and existing objects, RLS policies, grants, security-definer/invoker functions, storage buckets, signed URL paths, service-role workers, audit tables and outbox patterns. Record production differences from migrations.

## Actor and authority matrix

Map creator, depositor, community authority, council member, custodian, archivist, translator, descendant claimant, researcher, public user, reviewer, auditor, operator, administrator and worker permissions. Default deny all unspecified actions.

## Critical stop conditions

Document current blockers for entity formation, charter, participation, cultural authority, privacy, custody, preservation, security, accessibility, funding, provider independence, external review and Tourify-unavailable operation.

## Baseline regression commands

Record exact commands and results for typecheck, lint, unit, integration, route, database, RLS, storage, E2E, mobile and music regression suites before making changes.

## Audit conclusion

- Ready for reference implementation adaptation: yes/no
- Blocking assumptions:
- Named owners:
- Approved first slice:
- Explicitly excluded scope:
