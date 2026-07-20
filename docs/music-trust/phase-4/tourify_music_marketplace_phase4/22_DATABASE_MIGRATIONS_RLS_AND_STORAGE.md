# Database, Migrations, RLS, and Storage

Phase 4 must be additive and isolated from the canonical `artist_music` and Phase 1 playback path. Financial and investor data requires stricter access than ordinary artist content.

## Recommended bounded schema

Prefer a private or tightly exposed `music_marketplace` domain containing:

- issuers and authorized representatives;
- offering pathway decisions and versions;
- offering assets, rights snapshots, disclosures, documents, and status events;
- investor partner accounts and eligibility status;
- subscriptions, allocations, closings, refunds;
- security classes, positions, legends, and transfer requests;
- partner orders, executions, settlements, market data;
- corporate actions and distribution references;
- communication approvals, surveillance alerts, complaints, compliance holds;
- partner webhook receipts, reconciliation breaks, and outbox events.

## Source links

Use foreign keys or stable references to `artist_music`, Phase 2 Rights Passport versions, Phase 3 ledger periods, valuation runs, payout participants, and existing marketplace accounts. Do not copy mutable rights percentages into offerings without an immutable snapshot reference.

## RLS

- artists/issuer representatives access only authorized issuer records;
- investors access only their synchronized account, subscriptions, positions, and documents;
- public users access only approved public disclosure projections;
- operations roles are capability-based and separated by function;
- service workers use narrow server-side credentials and internal schemas;
- views exposed through Supabase use `security_invoker` where supported;
- every update policy includes both `USING` and `WITH CHECK`.

## Storage

Use private buckets for offering documents, investor communications, statements, and compliance evidence. Paths must not contain tax IDs or legal names. Use signed URLs, malware scanning, watermarking, access logs, retention classes, and legal holds.

## Migration controls

Create migrations with the repository's Supabase CLI after auditing actual types and policies. Never reset the database. Include forward migration, validation SQL, compensating rollback, generated-type updates, RLS tests, and feature flags.
