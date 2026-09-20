# Artist domain gaps

Generated from ARTIST-001 audit on 2026-09-09.

## Gap counts by triage

| Triage | Count |
|---|---|
| Missing | 8 |
| Incomplete | 10 |
| Improve | 7 |
| **Total** | **25** |

---

## Missing

### G-M1: No artist-specific test suite
- **Triage**: Missing
- **Location**: `__tests__/artist/` (7 files exist) — but no integration/E2E tests, no API route tests for most endpoints, no RLS test coverage
- **Evidence**: Only 7 unit tests and 2 API tests exist for 67+ pages and 56+ API routes. No test coverage for profile save, EPK publish/unpublish, event CRUD, music upload, or any music rights/royalties flows.
- **Impact**: Cannot verify correctness of artist domain without manual testing.

### G-M2: No artist-specific test for profile save
- **Triage**: Missing
- **Location**: `app/artist/profile/page.tsx` — 909-line form with no corresponding test
- **Evidence**: `useArtist().updateDetailedProfile` call path has zero automated coverage.
- **Impact**: Profile save regressions undetectable.

### G-M3: No artist settings client test
- **Triage**: Missing
- **Location**: `app/artist/settings/artist-settings-client.tsx`
- **Evidence**: No test file exists for artist settings.
- **Impact**: Settings changes untested.

### G-M4: No loading/error states for many artist pages
- **Triage**: Missing
- **Location**: `app/artist/music/page.tsx` (1535 lines, no loading.tsx sibling), `app/artist/events/page.tsx` (453 lines), `app/artist/content/page.tsx`, etc.
- **Evidence**: Most music sub-pages and feature pages have no loading.tsx or error.tsx boundary. Only `app/artist/loading.tsx` and `app/artist/error.tsx` exist at the root level.
- **Impact**: User experience degrades on slow connections or errors; no graceful degradation.

### G-M5: No artist-specific layout for music sub-routes
- **Triage**: Missing
- **Location**: `app/artist/music/` — 12 pages with no shared layout.tsx
- **Evidence**: No `app/artist/music/layout.tsx`. Each music page must independently handle navigation chrome.
- **Impact**: Inconsistent navigation across music surfaces; code duplication.

### G-M6: No artist EPK end-to-end test
- **Triage**: Missing
- **Location**: `app/artist/epk/page.tsx` (783 lines), `lib/services/epk.service.ts`
- **Evidence**: `lib/services/epk.service.test.ts` exists but is a unit test. No E2E test for EPK create → publish → public view → download PDF flow.
- **Impact**: EPK is a premium feature; regressions undetectable.

### G-M7: No artist context test
- **Triage**: Missing
- **Location**: `contexts/artist-context.tsx`
- **Evidence**: No test file for the central artist context. `updateDetailedProfile`, `syncArtistName`, and `refreshPublicProfile` have zero coverage.
- **Impact**: Context regressions break all artist pages silently.

### G-M8: No artist public appearance integration test
- **Triage**: Missing
- **Location**: `app/api/artist/public-appearance/route.ts`
- **Evidence**: `app/api/artist/public-appearance/__tests__/route.test.ts` exists — this is the ONLY artist API with a test.
- **Impact**: Remaining 55+ artist API routes have zero test coverage.

---

## Incomplete

### G-I1: Artist music page is 1535-line monolith
- **Triage**: Incomplete
- **Location**: `app/artist/music/page.tsx` — 1535 lines, "use client", direct `supabase` import
- **Evidence**: Single file handles music listing, upload, editing, trust status, analytics preview, and more. Direct Supabase client import instead of using a service layer. No component extraction.
- **Impact**: Unmaintainable; each music sub-feature change risks regression across the entire page.

### G-I2: Many artist API routes flagged "manual review required" for auth
- **Triage**: Incomplete
- **Location**: 22+ artist API routes in permissions.md flagged "manual review required"
- **Evidence**: EPK, events CRUD, events collaborate/promote/publish/tickets, public-appearance, music analytics, music certification, music rights (claims, recordings, works, contributions, parties, collectibles, finance), music royalties (allocations, imports, matches, statements), payouts, valuation, generate-preview all lack detected auth patterns.
- **Impact**: Security posture unclear; potential for unprotected artist data mutations.

### G-I3: Artist events page has broken file reference
- **Triage**: Incomplete
- **Location**: `app/artist/events/page-simple-broken.tsx`
- **Evidence**: File literally named "broken" — appears to be an abandoned attempt at simplifying the events page. The events page (453 lines) still has significant inline component logic.
- **Impact**: Dead code in the working set; confusing for contributors.

### G-I4: EPK API route uses `any` types
- **Triage**: Incomplete
- **Location**: `app/api/artist/epk/route.ts:37` — `supabase: any` parameter
- **Evidence**: `verifyArtistProfileCandidate` function takes `supabase: any` instead of a typed client.
- **Impact**: Type safety loss; potential for runtime errors.

### G-I5: No artist-specific shared contract validation (Zod schemas)
- **Triage**: Incomplete
- **Location**: `app/api/artist/` routes — no `packages/api-contracts/` coverage
- **Evidence**: Artist API routes use ad-hoc validation (if any). No shared Zod schemas for artist profile, EPK, event, or music payloads.
- **Impact**: Contract drift between API consumers and providers; mobile cannot reliably consume artist APIs.

### G-I6: Artist profile page lacks proper server component optimization
- **Triage**: Incomplete
- **Location**: `app/artist/profile/page.tsx` — entire 909-line form is "use client"
- **Evidence**: No SSR optimization; entire page ships to client as a single chunk. Could benefit from server-rendered shell with client form hydration.
- **Impact**: Poor initial load performance; no SEO for profile editing surfaces (acceptable for private pages but could still benefit from code splitting).

### G-I7: Artist features pages appear to be redirects or stubs
- **Triage**: Incomplete
- **Location**: `app/artist/features/music/page.tsx` (redirects to `/artist/music`), `app/artist/feed/page.tsx` (redirect), `app/artist/merchandise/page.tsx` (redirect)
- **Evidence**: Several feature pages are thin redirects rather than standalone implementations. `features/music/page.tsx` exports `MusicFeaturesRedirectPage`.
- **Impact**: Navigation confusion; users may hit redirect chains.

### G-I8: No artist dashboard layout with sidebar/navigation
- **Triage**: Incomplete
- **Location**: `app/artist/layout.tsx` — only wraps with `AccountsSeed` + `ArtistLayoutClient`; no persistent sidebar/nav
- **Evidence**: The artist layout is minimal compared to `app/venue/dashboard/layout.tsx` which has a full navigation shell. Artist pages must each handle their own navigation context.
- **Impact**: Inconsistent navigation experience; each artist page must re-derive navigation state.

### G-I9: Artist contract signing feature incomplete
- **Triage**: Incomplete
- **Location**: DB functions `send_artist_contract`, `sign_artist_contract` exist; no visible UI page for artists to view/sign contracts
- **Evidence**: `lib/artist/contract-templates.ts` exists but no corresponding page or component under `app/artist/` for contract management. `app/artist/business/contracts/page.tsx` exists but unverified functionality.
- **Impact**: Artists cannot sign contracts through the platform despite the backend being ready.

### G-I10: Artist store page unverified
- **Triage**: Incomplete
- **Location**: `app/artist/store/page.tsx`
- **Evidence**: Page exists but cross-references the marketplace domain. Unclear if fully wired to artist-specific storefront or just a redirect.
- **Impact**: Artist monetization surface may be broken or unconnected.

---

## Improve

### G-U1: Inconsistent auth patterns across artist API routes
- **Triage**: Improve
- **Location**: `app/api/artist/` routes
- **Evidence**: Mix of `session/auth`, `service role`, `artist`, `rate limit`, and `manual review required`. No consistent auth wrapper like the admin domain has (`resolveActingAdminContext`).
- **Impact**: Maintenance burden; each route implements auth differently; audit overhead.

### G-U2: Artist EPK uses `useToast` instead of `toast` (sonner)
- **Triage**: Improve
- **Location**: `app/artist/epk/page.tsx` — imports from `@/components/ui/use-toast`
- **Evidence**: Artist profile page uses `toast` from `sonner`. EPK uses the legacy `useToast` hook. Inconsistent toast behavior.
- **Impact**: Two different toast systems in the same domain; inconsistent UX.

### G-U3: Artist music page directly imports Supabase client
- **Triage**: Improve
- **Location**: `app/artist/music/page.tsx:3` — `import { supabase } from '@/lib/supabase'`
- **Evidence**: Business logic lives in the page component instead of a service layer. `lib/services/epk.service.ts` shows the correct pattern (service abstraction) but music doesn't follow it.
- **Impact**: Untestable business logic; no separation of concerns.

### G-U4: Dead code in artist events
- **Triage**: Improve
- **Location**: `app/artist/events/page-simple-broken.tsx`, `app/artist/events/page-optimized.tsx`, `app/artist/events/debug-auth.tsx`
- **Evidence**: Multiple abandoned/broken/optimized page variants sitting alongside the active `page.tsx`. `page-simple-broken.tsx` is literally named as broken.
- **Impact**: Repository clutter; confusion about which file is authoritative.

### G-U5: No standardized artist domain error boundary strategy
- **Triage**: Improve
- **Location**: `app/artist/error.tsx` exists at root; no error boundaries at sub-route level
- **Evidence**: Only one error boundary for the entire artist tree. Music/events/business sections have no isolated error boundaries.
- **Impact**: A single music tab error crashes the entire artist experience.

### G-U6: Artist EPK route lacks standardized rate limiting
- **Triage**: Improve
- **Location**: `app/api/artist/epk/route.ts`
- **Evidence**: Permissions.md flags EPK as "manual review required" for auth. No Upstash rate limiter detected. EPK publish/unpublish/download are sensitive operations.
- **Impact**: Potential abuse of EPK publish/download; no throttling on expensive operations.

### G-U7: Artist profile form has no server-side validation
- **Triage**: Improve
- **Location**: `app/artist/profile/page.tsx:243` — only checks `stage_name` client-side
- **Evidence**: Profile save only validates `stage_name` is non-empty. All other fields (bio length, URL format, email format) pass through to `updateDetailedProfile` without server-side validation.
- **Impact**: Malformed or oversized data can reach the database.

---

## Cross-domain dependencies

### Blocking questions for other agents
1. **music agent**: Artist music pages (`app/artist/music/`) overlap with music domain ownership. Who owns the `artist_music` table and the music API routes under `/api/artist/music/`?
2. **general-user agent**: Artist profile (`app/artist/profile/page.tsx`) writes to `artist_profiles` and `profiles`. The profile update flow crosses user-identity boundaries.
3. **database agent**: 5+ artist tables live in `archive/` migrations (e.g., `artist_profiles`, `artist_events`, `artist_merchandise`). Need confirmation these are still the active schema or if they've been reconciled.
4. **marketplace agent**: `app/artist/store/page.tsx` and `/artist/features/merchandise/page.tsx` may need marketplace domain integration.
5. **ticketing agent**: `/artist/events/[id]/tickets` and `/artist/events/ticket-sales` interfaces with ticketing domain.
