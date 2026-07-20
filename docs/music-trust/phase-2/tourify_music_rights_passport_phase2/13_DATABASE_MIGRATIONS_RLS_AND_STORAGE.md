# Database, Migrations, RLS, and Storage

## Non-destructive strategy

- never reset the database;
- use additive migrations;
- keep `artist_music` canonical;
- add foreign keys after type verification;
- backfill in batches;
- use feature flags;
- do not make legacy rows invalid;
- provide compensating rollback procedures;
- regenerate database types;
- run Supabase advisors.

## Suggested schema boundary

Prefer a dedicated schema such as `music_rights` if compatible with the Data API and project conventions. If the application relies only on `public`, use a clear prefix and strict RLS. The audit decides.

## Suggested tables

### Assets and relationships

- `music_rights_projects`
- `music_rights_musical_works`
- `music_rights_sound_recordings`
- `music_rights_releases`
- `music_rights_release_tracks`
- `music_rights_asset_relationships`
- `music_rights_external_catalog_refs`

### Parties

- `music_rights_parties`
- `music_rights_party_profiles`
- `music_rights_party_identifiers`
- `music_rights_party_affiliations`
- `music_rights_authorities`

### Contributions and claims

- `music_rights_contributions`
- `music_rights_credit_preferences`
- `music_rights_claims`
- `music_rights_claim_territories`
- `music_rights_income_participations`

### Agreements

- `music_rights_agreement_templates`
- `music_rights_agreements`
- `music_rights_agreement_versions`
- `music_rights_agreement_parties`
- `music_rights_signature_requests`
- `music_rights_signature_events`

### Evidence and review

- `music_rights_evidence`
- `music_rights_external_registrations`
- `music_rights_verification_checks`
- `music_rights_review_decisions`

### Passport/provenance

- `music_rights_passports`
- `music_rights_passport_versions`
- `music_rights_credentials`
- `music_rights_credential_status`
- `music_rights_derivatives`
- `music_rights_c2pa_manifests`
- `music_rights_watermarks`
- `music_rights_blockchain_anchors`

### Operations

- `music_rights_invitations`
- `music_rights_disputes`
- `music_rights_dispute_events`
- `music_rights_audit_events`
- `music_rights_outbox_events`

## Linking to `artist_music`

Use a verified foreign key type and one-to-one or one-to-many relationship from sound recording to `artist_music` depending on the actual legacy model. Do not assume UUID.

## RLS principals

- artist owner;
- authorized artist team member;
- invited contributor;
- authorized representative;
- rights reviewer;
- legal administrator;
- background worker;
- public verifier.

`TO authenticated` alone is not authorization. UPDATE requires both `USING` and `WITH CHECK`. Do not authorize from user-editable metadata.

## Storage

Potential buckets/prefixes:

- existing `artist-music`: canonical audio and approved derivatives;
- `music-rights-evidence`: private evidence;
- `music-rights-documents`: private agreements;
- `music-rights-exports`: time-limited generated packages.

The audit may choose private prefixes instead of new buckets. Original source files and signed agreements are never public.

## Append-only controls

Audit and signature events should prevent ordinary UPDATE/DELETE. Where database-level enforcement is used, avoid unsafe `SECURITY DEFINER`; use restricted internal schemas and explicit grants only after security review.
