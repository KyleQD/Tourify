# Safe Upload and Publication Flow

## Updated artist flow

1. Artist opens `/artist/music`.
2. Existing `EnhancedMusicUploader` collects the current audio, cover, preview, metadata, commerce, and link fields.
3. Add a compact **Rights & Origin** step:
   - rights confirmation
   - AI-use category
   - optional AI tool/details disclosure
   - training-use policy
   - policy version acknowledgements
4. Existing signed upload flow writes audio to private `artist-music` storage.
5. The create route validates both existing publication requirements and the new trust requirements.
6. `artist_music` is inserted using current behavior.
7. An append-only declaration row and origin-processing event are created in the same logical operation.
8. A background job calculates integrity metadata and fingerprints.
9. The artist can share immediately under the correct non-certified label unless moderation or AI policy blocks publication.
10. After upload, the UI offers certification as an upsell.

## Public publish gates

A public track must have:

- current `rights_confirmed = true`
- an allowed AI-use category
- accepted current policy versions
- valid public/preview state under existing rules
- approved/default moderation status

Recommended AI categories:

- `human_created`
- `assistive_ai`
- `materially_generated`
- `unknown`

Default to `unknown`; do not infer `human_created` from omission.

Recommended policy:

| AI category | Private | Public human catalog | Certification |
|---|---:|---:|---:|
| human_created | Yes | Yes | Eligible |
| assistive_ai | Yes | Yes with disclosure | Review required |
| materially_generated | Yes, subject to policy | No | Ineligible |
| unknown | Yes | No until answered | Ineligible |

## Share behavior

Existing `/api/music/share` and feed surfaces may continue to share the track. Add trust metadata to share cards:

- artist-submitted label by default
- certified badge only when certificate status is active
- no badge when certification is pending, rejected, suspended, or revoked

Playback always remains routed through Jukebox and `resolveMusicAccess`.

## Failure handling

If track creation fails, preserve existing storage cleanup behavior. If declaration/origin creation fails after the track exists:

- keep the track private
- mark trust setup incomplete
- enqueue repair/reconciliation
- do not silently publish
- record the failure for operations
