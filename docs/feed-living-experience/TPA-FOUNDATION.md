# Tourify Protected Audio (TPA) — Foundation and execution plan
Status: PROPOSED ARCHITECTURE + FIRST IMPLEMENTED SECURITY SLICE
Date: 2026-10-18
Branch: `feat/feed-living-experience-20261017` / Draft PR #17
Owner: Tourify music/rights + Arcade workstreams

## 0. Executive decision

**Do not invent a proprietary codec or rely on renaming MP3 files to a `.tpa` extension.**
Artists keep uploading standard WAV/FLAC/MP3/M4A/etc. Internally, TPA names the protected media **package, contracts, processing, rights, and delivery policy** — not a secret audio algorithm.

A proprietary `.tpa` manifest/archive may be useful for versioned server-to-server exchange and chain of custody, but it is **not** an anti-piracy measure and must not become a browser-required custom decoder. Keys must never be embedded in a frontend bundle. Any listener able to hear music can attempt analogue/digital re-recording, so **no anti-piracy mechanism guarantees prevention or perfect tracing**.

### Security goals

1. Preserve immutable, private originals (never serve master file to unauthorised users).
2. Support artist ownership evidence: cryptographic hashes + optional acoustic fingerprints + a signed provenance record and rights declarations. Hashes prove byte identity, **not legal ownership**.
3. Deliver listener-specific authorized media with the smallest practical exposure window.
4. Support server-generated gameplay beatmaps without delivering the original audio to the game.
5. Consent for uses of **both recording and composition**, with provable scope, terms version, territory, revocation and audit history.
6. Maintain reliable and accessible listening across desktop/mobile; avoid DRM assumptions not supported on a device.
7. Make protection observable: signed URL issue logs, anomalous delivery rates, moderation, takedown, deletion, leakage testing.

## 1. Verified existing infrastructure (read-only inspection)

**GitHub feature branch**
- `app/api/music/stream/route.ts`: checks `resolveMusicAccess`, then returns a Supabase Storage signed URL for authorized full or preview file. Existing standard signed URL lifetime: **3,600 seconds**.
- `lib/music/music-access.ts`: considers authenticated owner, rights and visibility, free/paid mode, library entitlement, and previews; owner playback returns full access.
- `scripts/music-preview-worker.ts`: ffmpeg-generated MP3 preview from private storage, uploaded to preview path.
- `scripts/music-origin-worker.ts`: source SHA-256, ffprobe metadata, optional Chromaprint and origin manifest recording; depends on fingerprint/rights-declaration tables.
- `/api/arcade/tracks`: owner-only visible, published, approved and rights-confirmed catalog; no fan-wide consent implied.
- `components/arcade/rhythm-game.tsx`: playable tempo-based chart; no real audio analysis yet.

**Supabase read-only inspection**
- Active project `tourify-staging` (`dlcqfpabbgltgteqtuko`): `artist-music` bucket **private**, common audio MIME allowlist; `artist_music` and preview job tables are present, but several origin/rights tables expected by the current worker were **not** returned in the public schema survey.
- Active project `Tourify Demo` (`auqddrodjezjlypkzfpi`): `artist-music` bucket **private**, large `music_rights_*` and related marketplace rights inventory; no `music_arcade_permissions` table found in either active project.
- Environments are **not schema-identical**. Do not apply proposed SQL until the canonical project/migration baseline is confirmed.
- **No production, staging or demo schema changes have been made as part of this TPA work.**

## 2. Implemented first slice in this feature branch

- `lib/music/stream-policy.ts` provides server-side Arcade/standard issue policy.
- `/api/music/stream?source=arcade&trackId=...` continues to use original entitlement checks, but signs an Arcade URL for **300 seconds**, sets response `Cache-Control: private, no-store` and `Referrer-Policy: no-referrer`, and records an Arcade-specific issue source.
- Beat Deck now requests the Arcade context. Regular music player continues its original 3,600-second issue duration and caching behavior.
- `__tests__/arcade/stream-policy.test.ts` protects those defaults.
- **Limitation:** Supabase signed URLs are bearer links valid for their lifetime, even after consent changes. Revoke stops newly-issued links but not an existing link until it expires. Existing generic non-Arcade route still supports authorized one-hour access. An authorized user can save transmitted audio. No DRM or watermarking is yet installed.

## 3. TPA format contract (proposal, NOT shipped)

The **`TPA v1` package is a versioned server metadata/manifest**, not an audio file codec. No raw storage paths, encryption keys, or signed URLs in publicly shareable manifests.

Suggested safe metadata:
```json
{
  "schema": "tourify.protected-audio.v1",
  "assetId": "<opaque>",
  "trackId": "<opaque>",
  "masterVersion": 1,
  "playbackProfile": "streaming-cmaf-encrypted",
  "beatmapVersion": 1,
  "rightsStatus": "internal-clearance-required"
}
```
Note: placeholders illustrate the contract; this JSON is not emitted by the app today.

**Storage partitions** (names illustrative; preserve existing bucket/path references and add migrations):
- Private immutable `music-masters` (original source; accessible to trusted processing workers only; cannot be directly requested by clients).
- Private `music-encoded` for HLS/DASH/CMAF renditions and previews; DRM-ready when a licensed key-delivery service has been integrated.
- Private `music-derivatives` for onsets, timing maps, waveforms, fingerprints and embed metadata. Separate privileged access for sensitive fingerprint/ownership evidence.

Migrate from the existing private `artist-music` bucket **additively**. Never revoke existing paths until old recordings are backfilled and all consumers reverified. Do not assume that private buckets + signed URLs equal DRM.

## 4. Protected ingest pipeline

1. Authenticate uploader as owning general account / authorized artist role, and check upload quota.
2. Create an **append-only** upload session with a random object ID; server provides signed TUS upload authorization, not broad Storage insert rights.
3. Enforce a private bucket, allowed MIME/extension/size, validate actual decoded codec and duration with ffprobe, inspect malicious payloads and reject polyglots.
4. Store the master encrypted at rest with environment-managed keys, hash the bytes with SHA-256; deduplicate by hash **for review only**, never automatically transfer ownership rights on a collision.
5. Associate recording and composition rights claims/declarations, uploads, contributors and proof-of-authority. Require moderation before general publication.
6. Queue isolated workers for preview encode, optional acoustic fingerprint, audio analysis/beatmap and encodes; sanitize metadata and sandbox FFmpeg; enforce CPU/memory/timeout limits.
7. Deliver encrypted streaming representations through a supported DRM/CDM path **where feasible**, with server-side authorization and separate license issuance. Non-DRM browser fallback must be explicit and cannot claim to prevent extraction.
8. Keep originals under strict service-only access; let authorized artists export originals from a distinct audited endpoint, not from a listener playback URL.
9. Use playback events for rate limits/anomaly detection. Maintain an appropriate retention/takedown/deletion process for artists, collaborators and rights disputes.

## 5. Beat Deck bridge

**Audio** and **gameplay timing** are independent deliverables:
- Audio player requests a listener-allowed rendition from a service respecting access mode, moderation, territorial limits, explicit Arcade permission and purchases/subscriptions.
- Beatmap API returns only title, artist ID, difficulty, note times, lanes, offsets, chart revision and expiry/consent state. It NEVER returns master bytes, fingerprints, privileged rights declarations or privileged object paths.
- On master upload, a trusted background audio-analysis worker derives onset envelope, tempo, beat grid, silence/offset and potential note markers from a bounded downsampled PCM stream. Human/artist review and chart revision required before publishing. Deterministic fallback practice charts remain when no verified beatmap exists, **clearly labeled** as practice.
- Calibrate client timing against audio's media clock (and optional output calibration); chart times must not be derived from `Date.now()` or wall-clock animation alone.
- If a track becomes revoked, block **new** gameplay sessions and new stream licenses; transition active sessions gracefully, noting already-issued signed URL TTL.
- Do not create claimable rewards or financial incentives from client-supplied scores.

## 6. Artist license and consent (required before fan-wide playback)

For every recording, preserve separately:
- Upload rights statement (already in current pipeline).
- Master sound recording interactive/game sync permission from authorized rights holder(s).
- Underlying musical composition interactive/game sync permission from authorized rights holder(s).
- Scope (rhythm-game/advertising/promo), territory, expiry, consent text version, compensation policy/royalties, attribution and withdrawal notice.
- Moderation and clearance review; co-writers/publishers must be accounted for where relevant.

**Default for all existing recordings: Arcade fan opt-in is OFF**. Creating a general public song page or confirming ownership never auto-grants game rights. Requests from owner-practice mode must not be silently repurposed into global fan playback.

A non-applied **SQL proposal**: `docs/feed-living-experience/TPA-ARCADE-RIGHTS-PROPOSED.sql`.
This is intentionally NOT an executable migration in a live environment until the repo's divergent database baselines and privacy policies are reconciled.

## 7. Threat model and realistic protections

| Threat | Useful mitigation | Residual limitation |
|---|---|---|
| Public scraper enumerates URLs | Private Storage, authenticated catalog, scoped signed issuance, short TTL, anomaly detection | An authorized user can copy valid URLs/stream bytes while valid |
| Someone downloads the original master | Separate service-only master store; never disclose path via listener stream | Misconfiguration/service key leak remains high-impact |
| Paid preview reveals full song | Entitlement checks + pre-generated independent clipped asset | A preview can always be captured |
| User reproduces stream | Encrypted segmented delivery + real DRM licensing where supported | Browser/device capture, analogue recording, compromised devices |
| Leaked audio posted elsewhere | Test robust forensic watermarking and acoustic fingerprint matching | Watermarks can be stripped or distorted; matching is not proof of ownership |
| Uploader lacks rights | Two-part master/composition attestation and rights review | An attestation is not legal proof |
| Artist revokes permission | Stop NEW catalog/game grants and licenses; enforce short TTL | Already-issued signed links valid until expiry |
| Embedded custom key in `.tpa` JavaScript decoder | **Do not do it**; use established cryptography/DRM and server-managed keys | No DRM is universally supported |
| Fake score/achievement | Server-side gameplay event verification and abuse controls | Score verification is an anti-cheat challenge; no trusted leaderboard yet |

Watermarking should be evaluated in a controlled pilot (quality testing, device survivability, privacy/legal review). **Nightshade is designed for images, not to prevent music scraping.**

## 8. Execution phases and release gates

### Phase A — repo-safe security first (under way)
- [x] Verify private `artist-music` Storage buckets in staging and demo.
- [x] Inspect streaming entitlement API, owner catalogue, preview and source fingerprint workers.
- [x] Limit newly-issued Arcade signed URL exposure to five minutes and no caching, preserving other player behavior.
- [x] Create a test asserting lifetime and source defaults.
- [ ] Verify Arcade CI and the newest Vercel deployment for the final branch tip.
- [ ] Review whether baseline generic `/api/music/stream` `private,max-age=3000` is acceptable under revocation; schedule a safe cross-player cache policy review.

### Phase B — canonical rights and DB migration (blocked pending baseline)
- [ ] Designate canonical Supabase project and reconcile staging/demo music-rights migrations.
- [ ] Run tested additive migration and RLS policies for permission grants, audit, and versioned beatmaps.
- [ ] Create owner API `POST /api/arcade/permissions` with authenticated owner verification and immutable consent events; no client-supplied owner ID.
- [ ] Gate discovery and game use behind explicit verified rights + server-side entitlement.
- [ ] Run Supabase RLS positive and negative tests (artist A/B, fan, anon, revoked and expired rights), and review security advisors.
- [ ] Publish reviewed artist-facing license text and opt-in UI; default all existing tracks OFF.

### Phase C — encodes and anti-scrape operations
- [ ] Isolate original masters from streaming bucket using audited service-only ingest/backfill.
- [ ] Validate codec, quarantine malicious files, transcode with sandboxed/limited workers.
- [ ] Select DRM/key broker and media packaging supported across browser/device matrix; use CMAF/HLS/DASH standards rather than proprietary codec.
- [ ] Build per-listener expiring license/token service and global abuse limits with carefully reviewed music player fallback.
- [ ] Pilot inaudible watermark service (if effective, permitted and cost-effective), correlate leaks with trusted server logs and protect data subject privacy.
- [ ] Log meaningful security metadata without logging signed URLs or decrypted content.

### Phase D — rhythm analysis and game rollout
- [ ] Create independent music analysis worker and verified beatmap storage.
- [ ] Add QA editor for artist/designer to correct BPM, first beat, tempo changes and note maps.
- [ ] Deploy permission-checked chart API and Beat Deck audio-clock sync; preserve practice fallback.
- [ ] Add original concert stages, difficulty calibration, artist challenge cards, social events, accessible reduced-motion options.
- [ ] Only then add opted-in fan play, server-validated challenges and potential meaningful rewards.

## 9. Release acceptance criteria

- Private originals cannot be accessed from anon, unrelated artist, and fan sessions.
- Fan may not list or launch a track without **both** verified licensing grant and listener playback rights.
- Expired or revoked grant blocks *new* session/stream issuance immediately at the server.
- Preview-only fan cannot fetch full recording or master by editing a URL.
- Shareable catalog metadata never includes object path, original fingerprint, origin document, signed URL, or DRM key.
- Automatic charts explicitly marked unverified until review.
- Existing general music player + purchases still work.
- Browser tests: iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari, slow network, expired session, interrupted segment/seek, paused tab and accessibility.
- Team approves retention policies, legal grant scope, DRM vendor cost and security threat model.
