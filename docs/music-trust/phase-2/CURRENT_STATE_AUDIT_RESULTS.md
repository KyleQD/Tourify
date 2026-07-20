# Phase 2 Current State Audit Results

Audit date: 2026-07-17 (America/Los_Angeles)  
Package: `docs/music-trust/phase-2/tourify_music_rights_passport_phase2/`  
Governing prompt: `22_CODEX_MASTER_IMPLEMENTATION_PROMPT.md`

## Repository

- Repository root: `/Users/kyledaley/Developer/myproject/tourify-beta-K2`
- Branch: `codex/live-sync-dashboard-news`
- Base commit: `673b82984da5670b94ed68d1efd94130539ea859`
- Current commit: `673b82984da5670b94ed68d1efd94130539ea859` (dirty worktree with Phase 1 music-trust and unrelated in-progress edits preserved)
- Package manager: npm 11.5.2
- Node: 20.19.0
- Next.js: 15.5.14
- React: 18.2.0
- TypeScript: 5.x
- Supabase client: `@supabase/supabase-js` 2.39.3, `@supabase/ssr` 0.6.1
- Supabase CLI: 2.22.6 (local)
- Test runners: Jest 30, Vitest 4, Playwright 1.60
- Deployment targets: Next.js / Vercel-compatible app + Supabase; no remote mutation authorized by this audit

## Phase 1 status

| Capability | Actual path/table | Status | Evidence | Gap |
|---|---|---|---|---|
| Rights declaration | `music_upload_declarations`; `persistMusicDeclaration` in `lib/music/music-trust-persistence.ts`; wired from `app/api/artist/music/route.ts` | Implemented, flag-gated | Migration `20260717210540_music_trust_foundation.sql` | Flags default off |
| AI disclosure | `artist_music.ai_use_category`; `components/music/music-ai-disclosure-fields.tsx` | Implemented | Uploader integration | — |
| Origin processing | `music_file_fingerprints`, `music_origin_records`, `scripts/music-origin-worker.ts` | Implemented, flag-gated | `music_origin_processing_enabled` | Acoustic fingerprint optional (`fpcalc` may be absent) |
| Certification case | `music_certification_*` tables; artist/admin APIs | Implemented, flag-gated | Migration `20260717210553_music_certification_foundation.sql` | Upsell card unwired |
| Public verification | `/api/music/origin/[publicId]`, `/api/music/certificate/[publicId]`; pages under `app/music/verify/*` | Implemented, flag-gated | `lib/music/music-public-verification.ts` | No `/rights/music` route yet |
| Feature flags | `feature_flags` + `lib/music/music-trust-flags.ts` | Implemented | Six Phase 1 keys, default disabled | Phase 2 flags not seeded |
| Admin review | `app/api/admin/content/music/certifications/route.ts`; `music.certification.review` RBAC | Implemented, flag-gated | `lib/music/music-certification-access.ts` | No rights-ops queue |

## Canonical music architecture

- `artist_music.id` is **UUID** (`uuid_generate_v4` / `gen_random_uuid` FKs). Source: `supabase/migrations/20250115000000_artist_music_system.sql`.
- Phase 1 columns: `trust_schema_version`, `trust_setup_status`, `active_declaration_id`, `ai_use_category`, `training_use_policy`, `origin_status`, `certification_status`, `certification_level`, `certification_public_id`, `certification_standard_version`, `certification_updated_at`.
- Publication guard: trigger `artist_music_phase1_publication_guard` → `enforce_music_phase1_publication()`.
- `music_tracks` view: `security_invoker = true`; stream URLs nulled; trust columns projected.
- Storage: private `artist-music` (masters/previews); private `music-certification-evidence`.
- Upload: `app/api/artist/music/route.ts`, `upload-url/route.ts`, `components/music/enhanced-music-uploader.tsx`.
- Stream/access: `app/api/music/stream/route.ts` → `lib/music/music-access.ts` `resolveMusicAccess` → signed URL.
- Web player: `contexts/jukebox-context.tsx` (canonical). Mobile: `apps/mobile/providers/music-player-provider.tsx` + `apps/mobile/lib/api/music.ts`.
- Marketplace/share/library/EPK/profile paths remain on `artist_music`; must not be forked.
- Generated types: `lib/database.types.ts` partially covers music trust fields; regenerate after Phase 2 migrations.
- **No `music_rights_*` tables exist** in applied migrations.

## Existing reusable systems

- team/organization authority: `lib/auth/acting-context.ts`, `org_members`, `account_relationships`. Artist music APIs today are **owner-scoped** (`user_id`); Phase 2 must add contributor/rep access.
- invitations: `staff_invitations`, `collaboration_invitations`, feed collaborators (`lib/feed/post-collaborators.ts`). Reuse notification patterns; rights invites need dedicated tables.
- document storage: private Supabase storage + signed URLs.
- e-signatures: first-party clickwrap via `lib/services/agreement.service.ts` → `agreement_acceptances`. No DocuSign/HelloSign.
- notifications: `lib/services/optimized-notification-service.ts`.
- audit events: domain append-only event tables (cert/origin); platform `lib/audit.ts`.
- outbox/jobs: **no general outbox**. Table-backed workers: `music_preview_generation_jobs`, fingerprint rows + `scripts/music-origin-worker.ts`.
- feature flags: `feature_flags` table; server-side resolver pattern in `music-trust-flags.ts`.
- admin capabilities: `music.certification.review` + moderator/super admin levels.
- disputes/DMCA: `content_reports`, `content_report_events`, `app/api/music/report/route.ts`, cert dispute route, Phase 1 runbooks.
- public IDs: UUID `public_id` / `certification_public_id` separate from PKs.
- KMS/secrets: env-based; service role server-only.
- blockchain code: none.
- C2PA/watermark code: none.

## Database and RLS

Relevant Phase 1 objects (see migrations `20260717210540_*` and `20260717210553_*`):

- Tables: `music_upload_declarations`, `music_file_fingerprints`, `music_origin_records`, `music_origin_events`, `music_certification_cases`, `music_certification_evidence`, `music_certification_reviews`, `music_certification_events`, `music_certificates`, `content_report_events`.
- RLS: owner-scoped artist policies; reviewer capability for admin cert routes; public verify via route projection (not raw evidence).
- Functions/triggers: `enforce_music_phase1_publication`.
- Storage policies: owner-folder on `artist-music`; evidence bucket private.
- SECURITY DEFINER: avoid adding new definer bypasses; audit existing grants before any new helper functions.

## Baseline commands

| Command | Result | Existing failure? | Phase 2 impact |
|---|---|---|---|
| install | Assumed present (node_modules available) | No | — |
| lint | Not re-run full suite at audit (dirty worktree) | Unknown pre-existing | Record after each phase |
| typecheck | Deferred full run; Phase 1 audit previously passed | Possible unrelated dirties | Gate before release |
| unit tests | `jest lib/music/__tests__/music-trust-phase1.test.ts lib/music/__tests__/music-public-verification.test.ts` → **13 passed** | No | Baseline green |
| integration tests | Not run | — | Add rights route tests |
| build | Not run (expensive; dirty worktree) | — | Run before pilot |
| migration status | Local files present for Phase 1; Phase 2 none | — | Additive only |
| database advisors | Not run remotely (no remote mutation) | — | Run when authorized |

## Architecture decisions required

Decided for Phase 2 execution (recorded also in `phase-2-execution-plan.json`):

| ID | Decision |
|---|---|
| ADR-P2-001 | Use `public` schema with `music_rights_*` table prefix (matches Phase 1 `music_*`; Data API stays on `public`). |
| ADR-P2-002 | One primary `music_rights_sound_recordings` row per `artist_music` (`artist_music_id uuid unique`); covers/remixes/samples via `music_rights_asset_relationships`. |
| ADR-P2-003 | First-party Tourify e-sign ceremony extending clickwrap/`agreement.service` patterns with reauthentication, claim snapshots, and sealed private document copies. No third-party e-sign vendor for Phase 2. |
| ADR-P2-004 | W3C VC Data Model 2.0-compatible JSON credential envelope; Ed25519 issuer key from server env; credential status rows for active/suspended/revoked/superseded. |
| ADR-P2-005 | C2PA adapter + async worker; initial format matrix WAV (embedded) + MP3 (sidecar); lazy SDK init; failure must not touch clean master. |
| ADR-P2-006 | Watermark adapter interface with `noop` + opt-in `beta_stub`; monitoring match intake requires human review. |
| ADR-P2-007 | EVM Sepolia testnet; immutable V1 registry with OpenZeppelin AccessControl + pause; mainnet disabled; off-chain passport valid while anchor pending. |
| ADR-P2-008 | Dev/test: env secrets. Prod: KMS/HSM runbook path. Separate issuer / C2PA / chain keys. Never client-exposed. |
| ADR-P2-009 | Private buckets `music-rights-evidence`, `music-rights-documents`, `music-rights-exports` (or prefixes); evidence/agreements retained until owner delete subject to legal hold; audit/signature events append-only. |
| ADR-P2-010 | Store DDEX-aligned identifiers (ISRC/ISWC/UPC concepts); no full ERN/MWDR export automation in Phase 2. |

## Non-destructive integration map

| Capability | Extend | New | Flag | Legacy preserved | Disable/rollback |
|---|---|---|---|---|---|
| Rights workspace | `app/artist/music/page.tsx` | `music_rights_*` graph + APIs | `music_rights_workspace_enabled` | Catalog/upload/play | Flag off |
| Catalog import | existing track link | `external_catalog_refs` + job | `music_catalog_import_enabled` | DSP distribution untouched | Flag off |
| Contributors | invitations/notifications | `music_rights_invitations` | `music_contributor_workflows_enabled` | Owner CRUD | Flag off |
| Agreements | agreement clickwrap pattern | rights agreement tables + docs bucket | `music_agreements_enabled` | Hiring TOS unchanged | Flag off |
| Human-Origin v2 | Phase 1 certification | evidence/review extensions | `music_human_origin_v2_enabled` | Phase 1 cases still work | Flag off |
| Passport | public verify pattern | passport/credential tables + pages | `music_rights_passport_enabled` / `music_public_passport_verification_enabled` | Origin/cert verify remain | Flag off |
| C2PA/Shield | stream access | derivatives + adapters | `music_c2pa_*` / watermark / training flags | Clean master private | Flag off |
| Testnet anchor | outbox worker pattern | contract + anchors table | `music_testnet_anchor_enabled` | Passport valid without chain | Flag off |
| Ops/disputes | admin music + content_reports | rights disputes queues | `music_rights_ops_enabled` | DMCA separate | Flag off |

## Blockers

| Blocker | Impact | Safe state | Owner | Unblocking condition |
|---|---|---|---|---|
| Remote DB advisors / production migration not authorized | Cannot claim live advisor evidence | Local migrations only; flags off | Platform ops | Explicit remote apply authorization |
| Live Sepolia deployer keys may be absent | P2-H live deploy may block | Contract + tests + flag off; passport valid without anchor | Platform eng | Provide testnet keys / CI secrets |
| External legal counsel sign-off | Public claim language / agreement templates | Conservative disclaimers; flags off for public passport | Legal | Counsel approval recorded |
| Pilot artists not enrolled | P2-K pilot gate | Synthetic/fixture end-to-end tests | Product | Pilot cohort enrolled |
| Full lint/build deferred on dirty worktree | Incomplete baseline | Targeted music tests green | Eng | Clean CI run before rollout |

## Phase 1 dependency verification

All Phase 1 dependencies required by `00_PHASE_2_SCOPE_AND_DEPENDENCIES.md` are present in code/migrations and flag-gated. Compatible to proceed with P2-B under `music_rights_workspace_enabled` default disabled.
