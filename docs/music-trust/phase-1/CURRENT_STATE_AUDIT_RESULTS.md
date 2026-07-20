# Music Trust Phase 1 — Current-State Audit Results

Audit date: 2026-07-17 (America/Los_Angeles)

## Repository baseline

- Root: `/Users/kyledaley/Developer/myproject/tourify-beta-K2`
- Branch: `codex/live-sync-dashboard-news`
- Base/current commit at audit start: `673b82984da5670b94ed68d1efd94130539ea859`
- Worktree: dirty before this work began; unrelated user edits are preserved.
- Package manager/runtime: npm 11.5.2, Node 20.19.0.
- Framework: Next.js 15.5.14, React 18.2.0, TypeScript 5.
- Supabase: CLI 2.22.6, `@supabase/supabase-js` 2.39.3, `@supabase/ssr` 0.6.1, Postgres 15.
- Test runners: Jest 30, Vitest 4, Playwright 1.60.
- Deployment target: Next.js/Vercel-compatible application with Supabase; no remote deployment is authorized by this implementation.

## Canonical music paths

| Concern | Actual path | Finding and reuse decision |
|---|---|---|
| Artist music page | `app/artist/music/page.tsx` | Live catalog, upload orchestration, marketplace/share integration; extend in place. |
| Enhanced uploader | `components/music/enhanced-music-uploader.tsx` | Live uploader; add Rights & Origin controls. It currently requires rights even for private uploads. |
| Music CRUD | `app/api/artist/music/route.ts` | Live owner-scoped route with Zod, preview gates, and marketplace sync; extend in place. |
| Signed upload | `app/api/artist/music/upload-url/route.ts` | Service-role signed upload URLs; private audio paths use `{userId}/{kind}/...`. |
| Stream | `app/api/music/stream/route.ts` | Loads `artist_music`, calls `resolveMusicAccess`, and returns a one-hour signed URL. |
| Access policy | `lib/music/music-access.ts` | Canonical owner/public/entitlement/preview decision; trust work must not fork it. |
| Web player | `contexts/jukebox-context.tsx` | Canonical global web playback; no new audio player will be added. |
| Preview worker | `scripts/music-preview-worker.ts` | Script worker with optimistic job claiming and FFmpeg; reuse its operational pattern. |
| Admin music | `app/admin/dashboard/music/page.tsx`, `app/api/admin/content/music/route.ts` | Existing surface is read-only/basic and uses broad `withAdminAuth`; certification needs a narrower reviewer gate. |
| Mobile player | `apps/mobile/providers/music-player-provider.tsx`, `apps/mobile/lib/api/music.ts` | Separate Expo player consuming the same stream contract; response shape must remain stable. |

Dead/mock/experimental venue uploaders, `hooks/useMusicReleases`, and TAF paths are explicitly excluded.

## Database and storage inventory

- `artist_music.id`, `user_id`, and related music IDs are UUIDs. The table has owner RLS, approved-public read RLS, rights/visibility/moderation checks, access/preview fields, private storage paths, commerce sync state, and updated-at triggers.
- `public.music_tracks` is recreated by the native-player hardening migration and set to `security_invoker = true`; full and preview file URLs are intentionally nulled.
- `music_preview_generation_jobs` is owner-readable and service-writable with queued/processing/ready/failed/canceled lifecycle.
- `user_music_library` is the canonical entitlement source. Paid listings link through `marketplace_listings.music_track_id`.
- Existing moderation uses `content_reports` plus `artist_music.moderation_status/is_visible`.
- No declaration, fingerprint, origin, certification, certificate, or music-trust reviewer objects existed at audit time.
- `artist-music` is private, 100 MB, audio-only, and owner-folder scoped. `artist-photos` is public, 10 MB, and used for cover art.
- Signed upload URLs are created server-side with the service role. Playback is signed only after `resolveMusicAccess`.
- Delete and failed-create paths remove uploaded audio/preview objects; cover cleanup follows the existing client path.

## Existing systems to reuse

- Feature flags: `feature_flags` table and admin routes. Artist-facing reads require a server-side resolver because current RLS only exposes management to organizers.
- Jobs: music preview job table/worker; no general music outbox exists.
- Notifications: `notifications`, `should_send_notification`, delivery log, and optimized notification service.
- Audit: platform audit helpers plus domain-specific append-only event tables.
- Rate limiting: `lib/utils/rate-limit.ts` with a safe in-memory fallback when Upstash is unavailable.
- RBAC: `rbac_permissions`, `rbac_roles`, assignments, overrides, and `has_entity_permission`; add a platform music-review permission without granting it to generic organizers.
- Observability: structured server logs, engagement/telemetry tables, and existing performance metrics APIs. Sensitive values must be excluded.

## Conflicts and risks

1. The uploader blocks all uploads without rights confirmation, while Phase 1 permits incomplete private drafts.
2. The create route currently inserts the requested public state immediately; trust writes need a private-first, publish-last sequence.
3. Existing admin surface access includes organizers and organization operators; that is too broad for private evidence and certification decisions.
4. The canonical typed Supabase client uses `lib/database.types.ts`, which does not currently contain the music tables and is incomplete relative to migrations.
5. The docs package is nested under `docs/music-trust/phase-1/tourify_music_trust_ecosystem`, while generated audit/execution artifacts are required at the Phase 1 root.
6. `fpcalc` was not present at audit time. FFmpeg and FFprobe were available. Fingerprinting must therefore be optional and capability-checked.
7. The worktree contains numerous unrelated modifications. Implementation must avoid broad formatting or generated rewrites.

## Baseline commands

| Command | Result |
|---|---|
| `npm run typecheck` | Passed at audit time. |
| Targeted Jest music suites | 3 suites / 15 tests passed. |
| Vitest feed music preview suite | 7 passed / 1 pre-existing source-text assertion failed (`!musicTrack && post.media_urls`). |
| Full lint/build/test | Deferred until implementation completion; results are recorded in the execution JSON. |
| Remote migration/advisors | Not run; no remote mutation is authorized. |

## Architecture decisions

- Create tracks privately first, insert the immutable declaration and origin work item, then publish only after all trust writes succeed.
- Use a dedicated private `music-certification-evidence` bucket and server-mediated signed access with audit events.
- Use denormalized status fields only for fast catalog policy/display; declarations, evidence, reviews, events, and certificates remain related immutable records.
- Reuse the current RBAC tables but require `music.certification.review` or an existing moderator/super-admin profile; generic organizer access is denied.
- Add a separate origin worker following the preview-worker pattern. SHA-256 and technical metadata are required; acoustic fingerprinting is optional behind worker capability and feature flags.
- Preserve `JukeboxTrack`, `/api/music/stream`, marketplace, library, preview, feed, and mobile contracts.

## Release blockers

- Production migration, flag activation, pilot enrollment, and remote database advisors require separate authorization.
- Public launch remains blocked until Human Music Policy, certification claims, evidence retention, DMCA/counter-notice, appeals, moderation, and incident procedures receive legal/operations approval.
- Certification billing is not defined by Phase 1 and is not implemented.
