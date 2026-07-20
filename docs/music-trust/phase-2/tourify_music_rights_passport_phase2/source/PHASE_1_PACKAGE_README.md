# Tourify Music Trust Ecosystem — Safe Upload + Certification Foundation

This package converts the existing Tourify native music upload and Jukebox system into the foundation for a human-created music ecosystem.

It is intentionally **additive**. It does not replace:

- `artist_music`
- the private `artist-music` storage bucket
- `/api/artist/music`
- `/api/artist/music/upload-url`
- `/api/music/stream`
- `resolveMusicAccess`
- `JukeboxProvider` / `useJukebox`
- the existing marketplace, library, preview, feed, profile, EPK, or mobile paths

## Product model

1. **Basic upload:** artists upload and share music with mandatory rights and AI declarations.
2. **Origin record:** Tourify records file integrity, submission history, and artist attestations.
3. **Human-created certification:** an optional paid review and public credential.
4. **Rights Passport:** a later, deeper contributor/rights/agreement layer.
5. **Tourify Shield:** later provenance, watermarking, monitoring, and training-reservation features.

A non-paying artist is labeled **Artist submitted — not independently certified**, never “suspicious” or “possibly AI.”

## Start here

1. Read `00_CANONICAL_MUSIC_INTEGRATION_GUIDE.md`.
2. Read `01_PRODUCT_SCOPE_AND_ACCOUNT_TIERS.md` through `16_DEFINITION_OF_DONE.md`.
3. Place this directory at `docs/music-trust/phase-1/` in the Tourify repository.
4. Run the prompt in `17_CODEX_MASTER_IMPLEMENTATION_PROMPT.md` from the repository root.
5. Codex must audit the actual repository before creating migrations or editing production paths.
6. Codex must create and continuously update `music-ecosystem-execution-plan.json` using the included schema and template.

## Reference code

The `reference/` directory contains implementation-oriented examples, not blind copy targets. Codex must adapt them to the actual project after checking:

- the current `artist_music.id` type
- Supabase client/helper conventions
- existing admin capability functions
- existing test runner
- current generated database types
- current migration ordering

Migration templates must be converted into real migrations using `supabase migration new ...` after audit. Never apply template SQL directly to production.

## Phase 1 launch boundary

Phase 1 ships safe upload, sharing, attestations, integrity records, certification requests, review operations, public trust labels, and feature-flagged verification pages. It does not ship tokens, royalty payouts, catalog valuation, a crypto wallet, or claims that Tourify legally determines copyright ownership.
