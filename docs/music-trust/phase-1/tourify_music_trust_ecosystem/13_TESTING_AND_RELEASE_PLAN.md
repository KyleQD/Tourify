# Testing and Release Plan

## Unit tests

- AI-category publication policy
- rights/AI declaration validation
- public trust-label derivation
- certification state transitions
- certificate badge eligibility
- manifest deterministic serialization
- supersession behavior

## Route tests

- create remains compatible with existing payloads where safe
- public upload without declarations is rejected
- private draft may remain incomplete
- generated/unknown public upload is rejected under policy
- certification case ownership prevents IDOR
- public verification exposes only approved fields
- admin review requires existing capability

## Database/RLS tests

- artist can read/write own declarations and cases
- artist cannot read another artist's evidence
- authenticated role alone grants no cross-user access
- UPDATE cannot transfer ownership
- public users cannot read private tables
- service/operations paths are explicit and tested

## Integration/E2E

1. human-created free track upload → share → Jukebox play
2. paid track upload → marketplace sync → entitlement play
3. clip preview upload/generation → publication gate preserved
4. private track → certification request → evidence → approval → public badge
5. needs-information loop
6. certificate suspension removes badge without deleting track/history
7. legacy track remains uncategorized/private until declaration migration is completed
8. mobile stream semantics remain unchanged

## Rollout

Feature flags:

- `music_trust_upload_fields_enabled`
- `music_origin_processing_enabled`
- `music_certification_requests_enabled`
- `music_certification_admin_review_enabled`
- `music_public_verification_enabled`
- `music_human_only_public_gate_enabled`

Roll out to internal staff, pilot artists, staged percentage, then general availability.
