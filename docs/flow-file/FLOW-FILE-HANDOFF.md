# Flow File (.flow) — separate architecture handoff

**Decision:** Rename the proposed proprietary protected media file/package to **Flow File** and use the `.flow` extension. Product family: **Flow**, usable by Tourify, Beat Deck, DJ Odyssey and future Flow ecosystem applications.

**Workstream boundary:** This conversation's Arcade branch implements games. A separate ChatGPT conversation should own the **Flow File format, ingest, delivery, legal rights, encryption, provenance, auditing and cross-product media infrastructure**. Do not block gameplay polish on the unbuilt format; use existing protected private storage and permission-checked streaming until the independent package has a migration plan.

**Existing baseline (verified 2026-10-18):**
- Artists upload normal audio files; `artist-music` Supabase bucket is private in staging and demo.
- `app/api/music/stream/route.ts` issues entitlement-checked signed URLs. Arcade URL issuance is 300s/no-store; non-Arcade remains 3600s by design.
- Existing preview worker generates clips. An origin worker implements hashes and optional Chromaprint but some referenced origin tables are not present in both active environments.
- The staging/demo music rights schemas diverge; avoid applying new SQL before reconciliation.
- Arcade game fans cannot select arbitrary public tracks; owner-practice-only. Separate master and composition interactive-game permissions will be required.

**Terminology/constraints:**
- `Flow File` means a formally specified, versioned protected media *container/package and metadata contract*, not a renamed MP3, magic encryption scheme or guaranteed piracy prevention.
- Extension `.flow` should be treated as a provisional packaging interface until format interop, MIME designation, stream profiles and real DRM/key-provider feasibility are reviewed.
- Original audio stays protected in separate server-only master storage; consumer playback uses familiar standards such as encrypted HLS/DASH/CMAF where supported. Never expose decryption keys via client JavaScript.
- Preserve owner rights and confidentiality. Fingerprints help detect similarities but do not prove ownership. Watermarks and DRM reduce some risk but cannot prevent all recording/reproduction.
- Additive migration, no reset, no retroactive game grants, all existing music remains OFF for fan game synchronization.

## Dedicated chat: starting brief

**Suggested title:** `Flow File (.flow) — Format, Protected Media Architecture & Engineering Plan`

> This is the canonical Flow File planning thread for the Flow ecosystem. We have decided to call our proposed protected media container/package **Flow File**, using the **.flow** extension. It will provide shared, secure, permission-aware handling of artist-owned uploaded audio across Tourify, Beat Deck, DJ Odyssey and future Flow apps. Design a versioned interoperable .flow package/manifest specification, media ingest/transcoding, immutable masters, encrypted streaming and DRM evaluation, optional forensic watermarking, acoustic provenance, clearance/licensing rules for both master and composition, Supabase storage/schema migration, RLS, workers, API contracts, key management, rights withdrawals, playback/device compatibility, anti-scraping threat model, data retention and cross-product identity. Begin by auditing current GitHub and Supabase read-only, including their schema drift; preserve additive migration safety and artist consent. Work in a separate branch/PR from gameplay work and create complete phase-by-phase implementation docs/tests. Do not claim that file extensions prevent piracy or that .flow parsing/drm is implemented. Existing documents on branch feat/feed-living-experience-20261017: docs/feed-living-experience/TPA-FOUNDATION.md (legacy filename, now Flow File foundation), docs/feed-living-experience/TPA-ARCADE-RIGHTS-PROPOSED.sql (unapplied schema proposal), and this handoff file. The Arcade thread remains focused on gameplay.

## Interfaces the Arcade team needs (proposals, not implemented)

1. `GET /api/arcade/tracks`: server-filtered grant-enabled catalogue; use creator-only current behavior until license grants are signed off.
2. `GET /api/arcade/beatmaps/:trackId?difficulty=...`: beatmap metadata, timing and chart version from reviewed server-side analysis, no master bytes.
3. `POST /api/arcade/sessions`: explicit rights/territory/access check, short-lived authorized playback session, data minimization.
4. `Flow File` reader on the *trusted server/worker*, with master and derivative isolation; don't force every browser game to decode `.flow` itself.
5. Revocation semantics, territorial scopes, error contracts and user-facing artist attribution usable across products.

## Immediate Arcade work that can proceed independently

- Playtest and refine DJ movement/gap reachability/checkpoints/controls.
- Polished stage animation and responsive crowd feedback for Beat Deck.
- Add mobile QA, accessibility, adaptive rendering and performance controls.
- Improve note chart handling as an abstract interface, with deterministic practice mode remaining until rights-reviewed source analysis exists.
- Keep PR #17 draft until tested and integration branch reconciled.

## Reference docs
- [Flow File foundation (historical TPA filename)](../feed-living-experience/TPA-FOUNDATION.md)
- [Rights and beatmap schema proposal — NOT applied](../feed-living-experience/TPA-ARCADE-RIGHTS-PROPOSED.sql)
- [Arcade handoff](../feed-living-experience/ARCADE-HANDOFF.md)
- [Living Feed roadmap](../feed-living-experience/IMPLEMENTATION-ROADMAP.md)

**Status:** Format naming and separate handoff planned. `.flow` writer/reader, DRM, encrypted packaging, forensic watermark, and production migration **not implemented**.
