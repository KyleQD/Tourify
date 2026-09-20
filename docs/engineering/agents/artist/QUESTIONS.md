# Artist domain questions for product owner

Generated from ARTIST-001 audit on 2026-09-09.

These questions are prioritized P1 (blockers for the artist domain) through P3 (nice-to-have improvements). Please answer in order of priority.

---

## P1 — Must answer before any follow-up work

### Q1: Music domain ownership overlap
The artist music pages (`app/artist/music/`, 1535-line page + 12 sub-pages) and the 34 music API routes under `app/api/artist/music/` overlap with the music domain agent. Who owns the `artist_music` table and the music API routes? Should these be consolidated under one domain or kept as cross-domain surfaces?

**Options:**
- A) Keep music routes under the artist domain; music agent is read-only for artist-owned data
- B) Move music API and pages to the music domain; artist domain only references music via shared contracts
- C) Split: artist domain owns the music *management* UI, music domain owns the music *service layer*

### Q2: Artist API auth patterns need standardization
22+ artist API routes are flagged "manual review required" for auth in the permissions audit. The backend functions exist (EPK, events, music, royalties, payouts) but auth patterns are inconsistent. Which auth wrapper should artist routes use?

**Options:**
- A) Adopt `requireApiUser` (current pattern) consistently — already used in EPK route
- B) Create `requireArtistProfile` wrapper that validates `artist_profiles.user_id = auth.uid()` and attaches the profile
- C) Use the admin pattern (`resolveActingAdminContext`) as inspiration for an artist-specific resolver

### Q3: Five artist tables live in `archive/` migrations
`artist_profiles`, `artist_events`, `artist_merchandise`, `artist_merchandise_orders`, and `artist_merchandise_variants` are defined in `archive/` migration files (e.g., `archive/critical_missing_tables.sql`, `archive/03_artist_content_tables.sql`). Are these still the active schema, or have they been reconciled to `supabase/migrations/`?

**Action needed:** Database agent should audit whether `archive/` tables are active in the running schema.

### Q4: Contract signing feature — build or defer?
`send_artist_contract` and `sign_artist_contract` database functions exist, but no visible UI under `app/artist/` for artists to view or sign contracts. The business contracts page exists (`app/artist/business/contracts/page.tsx`) but is unverified. Should this be built now or deferred?

**Options:**
- A) Build: Add artist contract viewing/signing UI using the existing DB functions
- B) Defer: Mark as a follow-up task after the audit phase
- C) Drop: Contracts are handled outside Tourify (e.g., DocuSign)

### Q5: EPK is a premium feature — what's the gating strategy?
The EPK builder is fully implemented (783-line page, 18 components, service layer, PDF export, telemetry). No subscription check was detected in the EPK route or page. Should EPK be gated behind a subscription tier?

**Options:**
- A) Free: All artists get EPK (current behavior)
- B) Gated: Require artist subscription tier (link to `artist_subscription_tiers` table)
- C) Freemium: Basic EPK free, premium templates/PDF gated

---

## P2 — Should answer before implementing fixes

### Q6: Artist music page refactoring priority
The 1535-line `app/artist/music/page.tsx` is a monolith with direct Supabase imports, inline components, and no service abstraction. How should this be refactored?

**Options:**
- A) Extract into 6-8 focused components (upload, catalog, analytics, trust, etc.) — medium effort
- B) Split into separate pages per sub-feature (already partially done with sub-routes) — high effort
- C) Leave as-is, prioritize other gaps first — defer

### Q7: Artist features pages — keep or remove?
Several pages under `app/artist/features/` are thin redirects (e.g., `features/music/page.tsx` → `/artist/music`, `features/merchandise/page.tsx` → redirect). Should these be:
- A) Removed (dead code)
- B) Kept as navigation aliases (intentional UX)
- C) Expanded into standalone feature surfaces

### Q8: Artist dashboard layout consistency
The venue domain has a full dashboard layout with sidebar navigation (`app/venue/dashboard/layout.tsx`). The artist domain only has a minimal root layout. Should the artist domain get a matching dashboard layout?

**Options:**
- A) Build: Create `app/artist/dashboard/layout.tsx` with sidebar nav (matching venue pattern)
- B) Enhance: Upgrade `app/artist/layout.tsx` to include persistent navigation
- C) Defer: Current layout is sufficient for now

### Q9: Artist profile server-side validation
The profile form only validates `stage_name` client-side. All other fields (bio length, URL format, social links) pass through unchecked. Should server-side validation be added?

**Options:**
- A) Add Zod schemas for profile update (align with music agent's patterns)
- B) Add basic checks only (max length, URL format)
- C) Defer — client-side validation is sufficient for now

### Q10: Toast system consistency
Artist profile uses `sonner` toast; EPK uses the legacy `useToast` hook. Which toast system should the artist domain standardize on?

**Options:**
- A) `sonner` (already used in profile and events)
- B) `@/components/ui/use-toast` (used in EPK)
- C) Migrate EPK to `sonner` as part of the next artist task

---

## P3 — Nice to have / can address in future sprints

### Q11: Artist EPK rate limiting
EPK publish/unpublish/download are sensitive operations with no detected rate limiting. Should Upstash rate limiting be added?

### Q12: Dead code cleanup
Multiple abandoned files exist: `page-simple-broken.tsx`, `page-optimized.tsx`, `debug-auth.tsx` under events. Should these be removed now or cleaned up in a future pass?

### Q13: Artist error boundary strategy
Only one error boundary exists for the entire artist tree. Should per-section error boundaries be added for music, events, and business?

### Q14: Artist-specific test coverage
Only 9 tests exist for 67+ pages and 56+ API routes. What's the testing priority?
- A) Focus on EPK (premium feature)
- B) Focus on profile save (identity-critical)
- C) Focus on events CRUD (highest usage)
- D) Spread coverage evenly

### Q15: Artist store page
`app/artist/store/page.tsx` exists but its integration with the marketplace domain is unclear. Is this a real feature or a placeholder?

### Q16: Artist context hardening
`contexts/artist-context.tsx` is the central context for all artist pages but has zero test coverage. Should this be hardened before other work?
