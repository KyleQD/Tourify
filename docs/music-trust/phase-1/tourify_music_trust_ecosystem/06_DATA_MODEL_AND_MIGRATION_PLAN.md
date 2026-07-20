# Data Model and Migration Plan

## Design principle

Keep `artist_music` canonical and add a bounded trust/certification layer.

## Minimal `artist_music` additions

After audit, consider additive columns for fast policy checks and display:

- `ai_use_category`
- `training_use_policy`
- `origin_status`
- `certification_status`
- `certification_level`
- `certification_public_id`
- `certification_standard_version`
- `certification_updated_at`

Do not store the full declaration or evidence in `artist_music`.

## Related tables

### `music_upload_declarations`

Versioned rights, AI, training, and policy attestations.

### `music_file_fingerprints`

Hashes, acoustic fingerprints, technical metadata, and processing status by track/file role.

### `music_origin_records`

Frozen origin manifests and public locator/status.

### `music_origin_events`

Append-only lifecycle and processing history.

### `music_certification_cases`

Certification request, standard version, state, level, owner, and review timestamps.

### `music_certification_evidence`

Private evidence references and metadata.

### `music_certification_reviews`

Structured reviewer decisions and findings.

### `music_certification_events`

Append-only case event history.

### `music_certificates`

Issued credential record, public ID, manifest hash, status, and supersession.

## Migration rules

1. Audit exact ID and enum types first.
2. Create real migrations with `supabase migration new`.
3. Use additive changes only.
4. Enable RLS on every new table.
5. Use explicit ownership predicates, not `TO authenticated` alone.
6. UPDATE policies require both `USING` and `WITH CHECK`.
7. Do not add broad admin access; reuse existing reviewed capability functions.
8. Do not put `SECURITY DEFINER` helpers in exposed schemas as a shortcut.
9. Regenerate database types.
10. Run database advisors, RLS tests, and rollback validation.

The SQL files under `reference/supabase/migration-templates/` are design templates only.
