# Artist domain baseline

Generated from ARTIST-001 audit on 2026-09-09.

## Scope

Owns artist identity, private and public profiles, EPKs, dashboards, and artist workflows.

## Web routes (67 pages under `/artist/`)

### Core identity and profile
- `/artist` — Home feed (`app/artist/page.tsx`) using `ArtistHomeFeed`
- `/artist/[username]` — Public profile (`app/artist/[username]/page.tsx`) SSR with `getPublicArtistProfileDTO` → `PublicArtistPage`
- `/artist/profile` — Private profile editor (`app/artist/profile/page.tsx`) 909-line "use client" form with tabs: basic, social, professional, achievements, settings
- `/artist/overview` — Dashboard overview (`app/artist/overview/page.tsx`) → `ArtistPageClient`
- `/artist/settings` — Settings (`app/artist/settings/page.tsx`) → `ArtistSettingsClient`
- `/artist/debug` — Debug page (`app/artist/debug/page.tsx`)

### EPK (Electronic Press Kit)
- `/artist/epk` — EPK editor (`app/artist/epk/page.tsx`) 783-line "use client" with builder mode, editor tabs, publish/unpublish, PDF download, media upload, and telemetry
- Public EPK: `/epk/[slug]` — `app/epk/[slug]/page.tsx` (owned cross-domain)
- EPK components: `components/epk/` — 18 TSX files including builder view, editor tabs, template variants, preview, PDF document, sortable sections, fonts, appearance AI panel

### Events management
- `/artist/events` — Events list (`app/artist/events/page.tsx`) 453-line "use client"
- `/artist/events/create` — Event creation wizard (7-step wizard: step1-3, photos, ticketing, summary, main dialog)
- `/artist/events/[id]` — Event detail
- `/artist/events/[id]/manage` — Event management
- `/artist/events/[id]/site-map` — Event site map
- Sub-pages: budget, countdown, operations, resource-allocation, staff, tasks, ticket-sales
- Components: 13 event-specific TSX files under `app/artist/events/components/`

### Music catalog and rights
- `/artist/music` — Music hub (`app/artist/music/page.tsx`) **1535-line** "use client" — very large single-file page
- Sub-pages: analytics, catalog-capital, certification/[trackId], intelligence, licensing, marketplace, marketplace/portfolio, rights-admin, rights/[trackId], royalties, upload
- API: 46 endpoints under `app/api/artist/music/` covering CRUD, analytics, certification, rights management (agreements, claims, contributions, evidence, invitations, parties, passports, projects, protected-derivatives, recordings, signatures, works), royalties (allocations, imports, matches, statements), payouts, valuation, catalog-imports, generate-preview, pin, upload-url

### Business dashboard
- `/artist/business` — Business hub
- Sub-pages: analytics, collaboration, contracts, education, fans, financial, marketing
- API: `/api/artist/business/overview`, `/api/artist/content/overview`

### Jobs and bookings
- `/artist/jobs` — Jobs listing
- `/artist/jobs/[id]/apply` — Job application
- `/artist/jobs/new` — Create job
- `/artist/bookings` — Bookings management

### Other surfaces
- `/artist/content` — Content hub
- `/artist/community` — Community dashboard
- `/artist/collaborations` — Collaborations page
- `/artist/feed` — Feed redirect
- `/artist/merchandise` — Merchandise redirect
- `/artist/messages` — Messages
- `/artist/network` — Network page
- `/artist/press` — Press management with blog editor, individual posts, and press releases
- `/artist/store` — Store page
- `/artist/tickets` — Tickets
- `/artist/features` — Feature pages: blog, fan-engagement, jobs, licensing, merchandise, music, payments, portfolio, press-kit, promotions, subscriptions

## Public artist components

- `components/public-artist/` — 9 files: `public-artist-page.tsx`, `hero/`, `events/`, `media/`, `music/`, `epk/`, `posts/`, `themed-dialog-content.tsx`
- `components/artist-profile/artist-profile-identity-card.tsx`

## API routes (56+ endpoints under `app/api/artist/`)

| Path prefix | Count | Purpose |
|---|---|---|
| `/api/artist/` | 1 | Artist lookup by name |
| `/api/artist/business/` | 1 | Business overview |
| `/api/artist/content/` | 1 | Content overview |
| `/api/artist/epk` | 1 | EPK CRUD (GET, PUT) |
| `/api/artist/events/` | 6 | Events CRUD + collaborate, promote, publish, tickets |
| `/api/artist/feed-stats` | 1 | Feed statistics |
| `/api/artist/music/` | 34 | Music catalog, certification, rights, royalties, payouts |
| `/api/artist/public-appearance` | 1 | Public appearance (GET, PUT) |

Plus shared APIs: `/api/artist-jobs/` (6), `/api/artists/` (3), `/api/debug/check-artist-profile`.

## Shared library (`lib/artist/`) — 20 files

| File | Purpose |
|---|---|
| `protected-routes.ts` | Route protection helpers |
| `profile-social-validation.ts` | Social link validation |
| `resolve-public-social-url.ts` | Public social URL resolver |
| `build-artist-recommendations.ts` | Artist recommendation builder |
| `build-analytics-from-stats.ts` | Analytics data builder |
| `build-platform-analytics-from-integrations.ts` | Platform analytics |
| `build-action-items.ts` | Action item builder |
| `artist-event-org.ts` | Artist-event organization |
| `artist-event-readiness.ts` | Event readiness checks |
| `artist-event-visibility.ts` | Event visibility logic |
| `artist-event-operations.service.ts` | Event operations service |
| `artist-event-promote.service.ts` | Event promotion service |
| `artist-analytics-data.ts` | Analytics data |
| `contract-templates.ts` | Contract templates |
| `dashboard-upcoming-events.ts` | Dashboard upcoming events |
| `download-content-hub-analytics-csv.ts` | CSV export |
| `event-producer-builder.ts` | Event producer builder |
| `feed-stats.ts` | Feed statistics |
| `normalize-artist-event-date.ts` | Date normalization |

## Shared components

| Directory | Files | Purpose |
|---|---|---|
| `components/artist/` | 6 | Home feed, post card, mobile nav, content panels, org invites |
| `components/artist-profile/` | 1 | Identity card |
| `components/artist-jobs/` | 3 | Job posting modal, card, filters |
| `components/epk/` | 18 | Full EPK builder, editor, templates, preview, PDF |
| `components/public-artist/` | 9 | Public-facing artist page sections |
| `components/music/` | (cross-domain) | Enhanced uploader, trust status, Audius import |

## Contexts

- `contexts/artist-context.tsx` — Central artist context providing profile, user, publicProfile, displayName, syncArtistName, updateDetailedProfile, refreshPublicProfile, isLoading

## Database objects (artist-specific)

| Type | Name | Migration |
|---|---|---|
| table | `artist_profiles` | archive/missing_auth_tables.sql |
| table | `artist_music` | archive/fix_artist_music_upload.sql |
| table | `artist_blog_posts` | archive/03_artist_content_tables.sql |
| table | `artist_contracts` | 20250814120000_artist_business_core.sql |
| table | `artist_documents` | archive/03_artist_content_tables.sql |
| table | `artist_epk_settings` | 20260327150000_artist_epk_settings_active.sql |
| table | `artist_events` | archive/critical_missing_tables.sql |
| table | `artist_financial_transactions` | 20250814120000_artist_business_core.sql |
| table | `artist_job_applications` | 20250120000000_extend_artist_jobs_for_collaborations.sql |
| table | `artist_job_categories` | 20250120000000_extend_artist_jobs_for_collaborations.sql |
| table | `artist_job_saves` | 20250120000000_extend_artist_jobs_for_collaborations.sql |
| table | `artist_job_views` | 20250120000000_extend_artist_jobs_for_collaborations.sql |
| table | `artist_jobs` | 20250120000000_extend_artist_jobs_for_collaborations.sql |
| table | `artist_marketing_campaigns` | 20250814120000_artist_business_core.sql |
| table | `artist_merchandise` | archive/03_artist_content_tables.sql |
| table | `artist_social_integration_secrets` | 20260825040000_integrations_manage_and_audit.sql |
| table | `artist_social_integrations` | 20250904090000_artist_social_integrations.sql |
| table | `artist_social_posts` | 20250814120000_artist_business_core.sql |
| table | `artist_subscription_tiers` | 20260413400000_stripe_connect_and_subscriptions.sql |
| table | `artist_works` | archive/critical_missing_tables.sql |
| table | `artist_dashboard_layouts` | 20250325120000_artist_dashboard_layouts.sql |
| table | `epk_telemetry` | 20260327153000_epk_telemetry.sql |
| function | `cleanup_orphaned_artist_files` | 20250115000001_artist_storage_setup.sql |
| function | `get_artist_storage_stats` | 20250115000001_artist_storage_setup.sql |
| function | `get_collaboration_stats` | 20250120000000_extend_artist_jobs_for_collaborations.sql |
| function | `is_valid_image_type` | 20250115000001_artist_storage_setup.sql |
| function | `is_valid_music_type` | 20250115000001_artist_storage_setup.sql |
| function | `lookup_profile_id_by_username` | 20260328120000_artist_contracts_signing.sql |
| function | `send_artist_contract` | 20260328120000_artist_contracts_signing.sql |
| function | `sign_artist_contract` | 20260328120000_artist_contracts_signing.sql |
| function | `set_artist_epk_settings_updated_at` | 20260327150000_artist_epk_settings_active.sql |
| function | `test_music_upload_permissions` | 20250115000001_artist_storage_setup.sql |
| function | `update_artist_jobs_updated_at` | 20241220000000_artist_jobs_system.sql |
| function | `update_job_application_count` | 20241220000000_artist_jobs_system.sql |
| function | `update_job_view_count` | 20241220000000_artist_jobs_system.sql |
| function | `get_enhanced_artist_stats` | archive/fix_artist_music_upload.sql |
| function | `create_artist_account` | archive/setup_signup_flow.sql |

## Tests

| Test file | Purpose |
|---|---|
| `__tests__/artist/event-producer-builder.test.ts` | Event producer builder |
| `__tests__/artist/dashboard-upcoming-events.test.ts` | Dashboard upcoming events |
| `__tests__/artist/resolve-public-social-url.test.ts` | Public social URL |
| `__tests__/artist/feed-stats.test.ts` | Feed statistics |
| `__tests__/artist/event-producer-hardening.test.ts` | Event producer hardening |
| `__tests__/artist/feed-analytics-scope.test.ts` | Feed analytics scope |
| `__tests__/artist/content-hub-social-analytics.test.ts` | Content hub analytics |
| `lib/artist/__tests__/protected-routes.test.ts` | Protected routes |
| `app/api/artist/public-appearance/__tests__/route.test.ts` | Public appearance API |

## Permissions / auth

Artist API routes use a mix of auth patterns (from permissions.md):
- `session/auth` — Most artist routes
- `artist` — Music, listings, posts, integrations routes
- `rate limit` — Music, rights, certification, upload routes
- `service role` — Upload URL, artist-jobs routes
- **Many routes flagged "manual review required"** — EPK, events, public-appearance, music rights, royalties, payouts, certification, analytics, collectibles

## Intended direction (from DEVELOPMENT_BACKLOG.md)

No artist-specific backlog items exist yet. Relevant cross-domain items that affect the artist area:
- WS-0.9: Private storage for sensitive docs (EPK photos, profile images)
- WS-1.1: Database foundation (migration reconciliation)
- WS-2.1: Nav/link/API contract sweep (dead links in artist nav)
- WS-2.3: Endpoint consolidation (search ×4, profile-update ×3)
- WS-2.4: GDPR/trust basics (account deletion)
- WS-3.1: Data-access layer modernization (React Query adoption)
- WS-3.4: Caching/CDN for public artist profiles
- Phase 4: Dead code cleanup (twin component trees, deprecated shims)
