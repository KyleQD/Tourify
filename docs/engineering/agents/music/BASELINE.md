# Music baseline — what the area contains today

Generated: 2026-09-10 by MUSIC-001 reconciliation pass.
Source SHA: `7cf660ad` (working-tree source snapshot; generated maps refreshed at the same SHA).

This is a topology and boundary baseline, not proof that every feature is deployable. Runtime behavior is supported by the focused test evidence and task records cited below; database availability still depends on the active Supabase migration chain.

## 1. Public web routes

| Route | Source |
| --- | --- |
| `/music` | `app/music/page.tsx` |
| `/music/verify/certificate/[publicId]` | `app/music/verify/certificate/[publicId]/page.tsx` |
| `/music/verify/origin/[publicId]` | `app/music/verify/origin/[publicId]/page.tsx` |
| `/music/verify/passport/[publicId]` | `app/music/verify/passport/[publicId]/page.tsx` |

## 2. Artist music pages (12)

| Route | Source | Purpose |
| --- | --- | --- |
| `/artist/music` | `app/artist/music/page.tsx` | Artist music hub |
| `/artist/music/analytics` | `app/artist/music/analytics/page.tsx` | Music analytics |
| `/artist/music/catalog-capital` | `app/artist/music/catalog-capital/page.tsx` | Catalog valuation |
| `/artist/music/certification/[trackId]` | `app/artist/music/certification/[trackId]/page.tsx` | Track certification |
| `/artist/music/intelligence` | `app/artist/music/intelligence/page.tsx` | Music intelligence |
| `/artist/music/licensing` | `app/artist/music/licensing/page.tsx` | Licensing |
| `/artist/music/marketplace` | `app/artist/music/marketplace/page.tsx` | Music marketplace |
| `/artist/music/marketplace/portfolio` | `app/artist/music/marketplace/portfolio/page.tsx` | Marketplace portfolio |
| `/artist/music/rights-admin` | `app/artist/music/rights-admin/page.tsx` | Rights admin |
| `/artist/music/rights/[trackId]` | `app/artist/music/rights/[trackId]/page.tsx` | Rights workspace |
| `/artist/music/royalties` | `app/artist/music/royalties/page.tsx` | Royalties |
| `/artist/music/upload` | `app/artist/music/upload/page.tsx` | Upload |

## 3. Cross-domain music surfaces

| Route | Source | Notes |
| --- | --- | --- |
| `/artist/features/music` | `app/artist/features/music/page.tsx` | Redirect to `/artist/music` |
| `/venue/dashboard/music` | `app/venue/dashboard/music/page.tsx` | Venue music dashboard |
| `/admin/dashboard/music` | `app/admin/dashboard/music/page.tsx` | Admin music dashboard |
| `/rights-admin` | `app/rights-admin/page.tsx` | Enterprise rights admin |
| `/rights-intelligence` | `app/rights-intelligence/page.tsx` | Enterprise rights intelligence |
| `/licensing` | `app/licensing/page.tsx` | Licensing home |
| `/licensing/projects/[id]` | `app/licensing/projects/[id]/page.tsx` | Licensing project |
| `/internal/world/console/ingestion` | `app/internal/world/console/ingestion/page.tsx` | Internal ingestion console |
| `/internal/world/console/radio` | `app/internal/world/console/radio/page.tsx` | Internal radio console |
| `/legal/music-training-reservation` | `app/legal/music-training-reservation/page.tsx` | Legal terms |

## 4. Mobile

| Route | Source |
| --- | --- |
| `/music` | `apps/mobile/app/(tabs)/music.tsx` |

## 5. Core music API routes (`app/api/music/`)

30 route files covering:

- **Catalog**: `library`, `public-item`, `import`
- **Playback**: `stream`, `play`, `playback/resolve`
- **Engagement**: `like`, `favorites`, `comment`, `share`, `share-message`, `report`, `history`, `social-status`
- **Media**: `cover`, `download`
- **Playlists**: `playlists`, `playlists/[playlistId]`, `playlists/[playlistId]/items`
- **Profile**: `profile-featured-track`
- **Trust/Verification**: `certificate/[publicId]`, `certificate/[publicId]/dispute`, `origin/[publicId]`, `rights/passports/[publicId]`, `rights/verify/[publicId]`
- **Audius provider**: `providers/audius/trending`, `providers/audius/search`, `providers/audius/tracks/[trackId]`, `providers/audius/stream`
- **Test**: `app/api/music/library/__tests__/route.test.ts` (inline test)

## 6. Artist music API routes (`app/api/artist/music/`)

33 route files covering:

- **Catalog**: root CRUD, `upload-url`, `pin`, `catalog-imports`
- **Analytics**: `analytics`
- **Rights**: `rights/works`, `rights/recordings`, `rights/claims`, `rights/contributions`, `rights/evidence`, `rights/passports`, `rights/projects`, `rights/protected-derivatives`, `rights/agreements`, `rights/invitations`, `rights/parties`, `rights/signatures`
- **Certification**: `certification`, `certification/[caseId]`, `certification/[caseId]/events`, `certification/[caseId]/evidence`
- **Royalties**: `royalties/allocations`, `royalties/imports`, `royalties/imports/[id]`, `royalties/matches`, `royalties/statements`
- **Payouts**: `payouts/onboarding`, `payouts/batches`, `payouts/status`
- **Finance**: `finance/collectibles`, `valuation`
- **Preview**: `preview-jobs`, `generate-preview`

## 7. Music marketplace API routes (`app/api/music-marketplace/`)

13 route files: `orders`, `documents`, `pathway`, `portfolio`, `issuers`, `disclosures`, `subscriptions`, `transfers`, `catalog-links`, `investor-account`, `flags`, `market-data`, `offerings`.

## 8. Music feed and webhooks

| Route | Source | Purpose |
| --- | --- | --- |
| `/api/feed/music` | `app/api/feed/music/route.ts` | Music feed posts |
| `/api/webhooks/music-royalty-payouts` | `app/api/webhooks/music-royalty-payouts/route.ts` | Stripe royalty payout webhook |

## 9. Shared components (`components/music/`)

23 files:

- **Player**: `music-player.tsx`, `taf-music-player.tsx`
- **Display**: `public-music-display.tsx`, `public-music-verification.tsx`, `music-trust-status.tsx`, `music-trust-flag-off-note.tsx`, `provider-badge.tsx`
- **Upload/Edit**: `enhanced-music-uploader.tsx`, `music-ai-disclosure-fields.tsx`
- **Engagement**: `music-comment.tsx`, `music-certification-upsell-card.tsx`
- **Page shell**: `page/music-page-client.tsx`, `page/music-home.tsx`, `page/music-library-section.tsx`, `page/music-playlists-section.tsx`, `page/music-audius-section.tsx`, `page/music-search-results.tsx`, `page/music-discover-section.tsx`, `page/music-primary-nav.tsx`, `page/section-states.tsx`, `page/use-music-url-state.ts`
- **Import**: `audius-import-modal.tsx`
- **Cooperative**: `creator-cooperative/cooperative-education-card.tsx`

## 10. Playback library (`lib/playback/`)

10 files: `registry.ts`, `flags.ts`, `normalize.ts`, `types.ts`, `capabilities.ts`, `client-resolve.ts`, `adapters/jukebox-track.ts`, `resolvers/track.ts`, `resolvers/radio.ts`, `resolvers/world-media.ts`.

## 11. Music library (`lib/music/`)

Core files:
- `music-access.ts` — access resolution, storage helpers, event recording, stat sync
- `music-trust-flags.ts` — trust flag computation
- `music-trust-persistence.ts` — trust flag persistence
- `music-origin-job-policy.ts` — origin job policy
- `preview-jobs.ts` — preview generation logic
- `upload-helpers.ts` — upload path/signing
- `valuation/catalog-valuation.ts` — catalog valuation

Interop/governance subsystems (all under `lib/music/`):
- `creator-cooperative/` — 15 files + tests
- `creator-federation/` — 13 files + tests
- `creator-public-infrastructure/` — 13 files + tests
- `creator-protocol-constitution/` — 12 files + tests
- `creator-interoperability-institution/` — 17 files + tests
- `creator-interoperability-organization/` — multiple files
- `creator-interoperability-convention/` — (referenced by worker)
- `creator-multilateral-treaty-operations/` — (referenced by worker)
- `creator-digital-commons/` — (referenced by worker)
- `creator-treaty-system-legacy/` — (referenced by worker)
- `creator-treaty-system-renewal/` — (referenced by worker)
- `licensing/` — 14 files + tests
- `finance/` — `offerings.ts`, `onchain-instrument.ts`

## 12. Music workers (`scripts/music-*.ts`)

24 scripts total (`find scripts -maxdepth 1 -name 'music-*.ts'`):
- **Outbox workers (16)**: creator cooperative/federation/interoperability/treaty subsystems, institutional, licensing, marketplace, rights-admin, and rights-intelligence.
- **Processing workers (5)**: `music-preview-worker.ts`, `music-origin-worker.ts`, `music-royalties-import-worker.ts`, `music-rights-anchor-worker.ts`, and `music-rights-derivative-worker.ts`.
- **Reconciliation (1)**: `music-trust-reconcile.ts`.
- **Smoke checks (2)**: `music-staging-smoke.ts`, `music-commerce-smoke-test.ts`.

No music processing or reconciliation worker is registered in `vercel.json` or under `app/api/cron/`. The two smoke checks are manual scripts, not scheduled workers. `MUSIC-004` is the active follow-up for deployment/scheduling framework work.

## 13. Database objects (music-specific)

### Active-chain objects
- `artist_music`, `music_likes`, and `music_comments` — catalog and engagement, from `supabase/migrations/20250115000000_artist_music_system.sql`.
- `music_plays`, `music_engagement_events`, `user_profile_featured_tracks`, and the `music_tracks` view — playback and engagement, from `supabase/migrations/20260711160518_native_music_player_ecosystem.sql` and its hardening migration.
- `user_music_library`, `music_playlists`, `music_playlist_items`, and `music_playlist_shares` — library and playlists, from `supabase/migrations/20260410183000_music_commerce_expansion.sql`.
- `music_preview_generation_jobs` — preview queue, from `supabase/migrations/20260711173622_music_preview_jobs.sql`.
- Upload validation functions `is_valid_music_type` and `test_music_upload_permissions` — `supabase/migrations/20250115000001_artist_storage_setup.sql`.

### Referenced but not in the active chain
- Rights, certification, trust/origin, royalties, and much of music finance reference tables such as `music_rights_projects`, `music_rights_passports`, `music_rights_derivatives`, `music_upload_declarations`, `music_origin_records`, `music_certification_cases`, and `music_royalties_import_batches` from route and worker code.
- Their DDL is present in `supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/` (for example `20260717210540_music_trust_foundation.sql`, `20260717210553_music_certification_foundation.sql`, `20260717231445_music_rights_domain_foundation.sql`, `20260717232000_music_rights_collaboration_and_agreements.sql`, `20260717233000_music_rights_passports_and_evidence.sql`, `20260717234000_music_rights_protection_and_ops.sql`, and `20260717240000_music_royalties_ingestion_and_ledger.sql`), but not under `supabase/migrations/`.
- This is a deployability/schema-reconciliation gap, not an assertion that those tables are absent from every database. The active migration chain is authoritative per `docs/engineering/INDEX.md`.

### Views
- `music_tracks` — public view (security_invoker)

### Functions (music-specific)
- `is_valid_music_type` — storage type validation
- `test_music_upload_permissions` — upload permission test
- `get_enhanced_artist_stats` — artist stats
- `get_artist_storage_stats` — storage stats
- `cleanup_orphaned_artist_files` — orphan cleanup

### Indexes
- `idx_artist_music_public_visible_access_created`
- `idx_artist_music_user_access_created`
- `idx_artist_music_storage_path`
- `idx_artist_music_preview_storage_path`
- `idx_music_plays_music_created`, `idx_music_plays_artist_created`, `idx_music_plays_user_created`
- `idx_featured_tracks_music_track`

### RLS policies
- `artist_music`: public viewable by everyone, own-music viewable by owner
- `music_plays`: insert anyone, read artist-or-listener
- `music_engagement_events`: insert anyone, read artist-or-actor

## 14. Authorization and boundary evidence

- All 33 `app/api/artist/music/**` route handlers use `requireArtistMusicUser`; a scoped legacy-auth scan found zero `requireApiUser` or `auth.getUser` references. Evidence: `docs/engineering/tasks/completed/ARTIST-004.json` and `__tests__/artist/music/route-auth-adoption.test.ts`.
- All 13 `app/api/music-marketplace/**` handlers use `requireMarketplaceAccount`; native `/api/marketplace/orders` uses the same contract, while native checkout retains its explicit optional-auth guest path. Evidence: `docs/engineering/tasks/completed/MUSIC-005.json` and `__tests__/music-commerce/route-auth-adoption.test.ts`.
- The generated permissions map still labels the 13 Music Marketplace routes `manual review required` because its static detector does not recognize the adopted Marketplace contract. Treat the route tests and source as behavioral evidence; treat `docs/engineering/generated/permissions.md` as an inventory limitation.
- `app/api/webhooks/music-royalty-payouts/route.ts` requires `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES` and local HMAC verification; the unsigned and generic-secret fallbacks were removed. Evidence: `docs/engineering/tasks/completed/MUSIC-002.json` and `app/api/webhooks/music-royalty-payouts/__tests__/route.test.ts`.

## 15. Tests

| File | Status |
| --- | --- |
| `__tests__/feed/music-post-preview.test.ts` | Focused run passes locally: 1 file, 8 tests; the backlog's global “27 failures” count is stale/unreconciled |
| `app/api/music/library/__tests__/route.test.ts` | Present (inline) |
| `__tests__/artist/music/route-auth-adoption.test.ts` | Covers all 33 Artist Music route files |
| `__tests__/music-commerce/route-auth-adoption.test.ts` | Covers all 13 Music Marketplace route files plus checkout exception |
| `app/api/webhooks/music-royalty-payouts/__tests__/route.test.ts` | Dedicated signed/unsigned webhook contract tests |
| `lib/music/__tests__/music-trust-phase1.test.ts` | Trust policy/phase-1 unit coverage; not worker or end-to-end coverage |
| `lib/music/providers/audius/__tests__/` | Audius mapper/error unit coverage |
| `__tests__/playback/` | Track, radio, world-media, capability, client-resolve, and persistence coverage |
| `lib/music/creator-interoperability-institution/__tests__/` | Multiple test files |
| `lib/music/creator-cooperative/__tests__/` | Test file |
| `lib/music/creator-federation/__tests__/` | Test file |
| `lib/music/creator-public-infrastructure/__tests__/` | Test file |
| `lib/music/creator-protocol-constitution/__tests__/` | Test file |
| `lib/music/licensing/__tests__/` | Test file |
| `lib/music/royalties/__tests__/royalties-core.test.ts` | Royalty domain unit coverage |
| `lib/music/rights-admin/__tests__/rights-admin-core.test.ts` | Rights-admin domain unit coverage |
| `lib/music/rights-intelligence/__tests__/rights-intelligence-core.test.ts` | Rights-intelligence domain unit coverage |

**Still missing or incomplete**: route-level behavior tests for stream/play/playlists/certificate/rights/royalty/certification surfaces; worker integration tests for preview/origin/royalty/trust/rights processing; and end-to-end royalty payout coverage.

## 16. Integrations

- **Supabase**: Postgres + Storage for catalog, plays, engagement, playlists, royalties
- **Stripe Connect**: royalty payouts via webhook (`STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES`)
- **Audius**: provider integration (trending, search, tracks, stream)
- **OpenAI/AI SDK**: music preview generation (preview-jobs)
- **AWS S3**: referenced in package.json (`@aws-sdk/client-s3`)

## 17. Intended direction (from backlog)

From `docs/DEVELOPMENT_BACKLOG.md`, `docs/engineering/agents/music/BACKLOG.md`, `docs/work-packets/MUSIC-003.md`, and the completed route-adoption task records:
- **WS-1.5 / MUSIC-004**: reconcile the worker set, then deploy processing/outbox workers with retry, DLQ, and health evidence.
- **WS-1.6**: refresh the global Vitest failure inventory; the focused `music-post-preview` test now passes locally.
- **WS-2.1**: decide feature-flag reality — ship or hide gated music rights, royalty, licensing, marketplace, and public verification surfaces.
- **MUSIC-003 / MUSIC-005 / ARTIST-004**: keep the accepted Music↔Marketplace ownership split and adopted route auth contracts intact.
- **WS-0.6 / MUSIC-002**: provision `STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES` before enabling royalty webhook forwarding.

Music is classified as the "Music" row in `SYSTEM_MAP.md`: "Media, rights, royalties, outboxes".
