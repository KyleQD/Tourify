# Canonical Tourify Music Integration Guide — Phase 15 Copy

This package preserves the existing Tourify music architecture.

- `artist_music` remains the canonical music/catalog row.
- Private audio remains in the `artist-music` storage bucket.
- Playback continues through `/api/music/stream`, `resolveMusicAccess`, `JukeboxProvider`, `useJukebox`, and the existing mobile player.
- Rights Passports, licences, royalty ledgers, rights-administration cases, federation records, constitutional compacts, convention records, and external official records remain authoritative within their own domains.
- Phase 15 adds only organization-readiness references, projections, governance, legal-status, membership, budget, oversight, and operational records.
- No second upload, catalog, entitlement, stream, player, marketplace, feed, profile, EPK, analytics, licensing, royalty, or administration pipeline may be created.
- Database changes are additive, reversible, RLS-protected, feature-flagged, audited, and backed by compensating actions.
