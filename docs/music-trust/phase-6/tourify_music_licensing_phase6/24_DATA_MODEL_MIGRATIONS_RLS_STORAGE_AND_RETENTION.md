# Data Model, Migrations, RLS, Storage, and Retention

Phase 6 uses a dedicated additive domain linked to canonical music and Phase 2–5 records.

## Non-negotiable controls

- Preserve `artist_music` as the canonical upload/catalog row and keep the existing private `artist-music` storage, `/api/music/stream`, `resolveMusicAccess`, Jukebox, mobile player, marketplace, feed, profile, EPK, and analytics paths intact.
- Never reset the database. Use additive migrations, reversible feature flags, explicit backfills, RLS, restricted storage, audit events, and compensating records.
- A Rights Passport claim is evidence, not automatic licensing authority. The exact right, asset, territory, media, term, use, exclusivity, approval requirement, and contractual mandate must be verified before Tourify can show a work as licensable.
- Default to `inquiry_only`, `manual_clearance`, or `unavailable` when authority is incomplete, disputed, expired, territory-limited, approval-dependent, or controlled by a third party.
- Tourify must not grant a license on behalf of a publisher, label, CMO, performer, union, estate, administrator, or other controller unless an active written mandate authorizes Tourify to do so.
- Composition, sound recording, performer/neighbouring rights, name/likeness, lyrics, artwork, trademark, union/reuse, and privacy rights remain separate clearance objects.
- No buyer-facing price, availability, or approval status may be inferred from valuation, popularity, streams, or AI recommendations alone.
- AI-training and synthetic-output licensing is a separate, explicit opt-in product. It may never be bundled into ordinary hosting, promotion, distribution, sync, or certification terms.
- Confidential buyer briefs, unreleased media, stems, contracts, tax forms, and identities must remain in restricted storage with short-lived access and audit logging.
- All external partner records, signatures, payment confirmations, CMO results, and legal documents are versioned and reconciled; no silent overwrite is allowed.

## Recommended tables

`licensing_projects`, `licensing_project_members`, `licensing_briefs`, `licensing_brief_versions`, `license_requests`, `license_request_assets`, `license_clearance_legs`, `license_availability`, `license_availability_rules`, `license_quotes`, `license_quote_versions`, `license_approvals`, `license_agreements`, `license_agreement_versions`, `license_deliveries`, `cue_sheets`, `cue_sheet_cues`, `license_usage_reports`, `license_invoices`, `license_payments`, `license_conflicts`, `licensing_partner_events`, and `licensing_audit_events`.

## Links

Reference `artist_music`, musical works, sound recordings, parties, rights claims, passport versions, authority records, royalty allocations, institutional organizations and existing users. Do not duplicate canonical assets or rights ownership.

## RLS

Rights holders see requests for controlled assets; buyer project members see their projects; approvers see scoped legs; Operations sees authorized queues; public users see only published discovery fields. Service roles remain server-only. Every update policy has `USING` and `WITH CHECK`. Views use `security_invoker` where supported.

## Storage

Create private buckets/folders for buyer briefs, rough cuts, scripts, stems, agreements, delivery masters, cue sheets, tax/insurance evidence and disputes. Use path-scoped signed URLs, malware scanning, content allowlists, encryption, lifecycle rules and download audit.

## Retention

Contracts, approvals, invoices, payment and audit evidence follow legal/financial retention. Optional creative materials follow project-defined deletion. Legal holds suspend deletion. Blockchain or public records contain hashes/status only, never confidential content.

## Migrations

Create migrations with the installed Supabase CLI after auditing deployed types and policies. Backfills are resumable and do not publish availability. Include validation queries and compensating rollback steps.

## Completion evidence

This area is not complete until:

1. The implementation is mapped to audited repository paths, deployed database objects, current provider contracts, and approved legal/operations decisions.
2. RLS and API authorization tests prove that artists, representatives, buyers, reviewers, administrators, and background workers receive only the access required for their role.
3. Every state transition is idempotent, versioned, auditable, and recoverable through a documented compensating action.
4. Existing upload, playback, entitlement, marketplace, feed, profile, EPK, analytics, and mobile regression tests remain green.
5. Feature flags, stop conditions, operational ownership, monitoring, and rollback instructions are documented.
