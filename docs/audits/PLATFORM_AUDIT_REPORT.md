# Tourify Full Platform Audit Report

**Generated:** 2026-07-18T04:57:52.429Z  
**Method:** Hybrid — exhaustive static inventory (338 pages, 680 APIs) + nav/API matrices + 7 persona code-path agents + anonymous live HTTP crawl on `http://localhost:3000` + demo probe  
**Artifacts:** `docs/audits/*.json`, interactive canvas `platform-audit-report.canvas.tsx`

---

## Executive summary

| Metric | Count |
|--------|------:|
| App pages | 338 |
| API routes | 680 |
| Unique dead nav hrefs (product) | 61 |
| Dead nav confirmed 404 (live) | 31 |
| Client→missing API | 6 (+ validate-invitation) |
| APIs with 501 signals | 12 |
| APIs with feature_disabled signals | 144 |
| Coming-soon source files | 29 |
| Music-trust flags (default off) | 180 |
| Total findings logged | 114 |
| P0 / P1 / P2 / P3 | 68 / 44 / 1 / 1 |

**Verdict:** Core multi-account platform (General / Artist / Venue ops shell / Admin hiring+events) is substantially wired. The largest gaps are (1) legacy venue/artist nav dead ends, (2) missing client APIs, (3) admin event HQ migration/501 stubs, and (4) the entire music-trust/investor suite scaffolded but flag-off and poorly navigable. Public music verification is not anonymously reachable.


## What is working

### Auth and account model
- Login/signup portal at `/login` (signup tab); post-login lands on `/dashboard` for General
- Multi-account switcher routes Artist → `/artist`, Venue → `/venue/dashboard`, Organization → `/admin/dashboard`
- `/create` can create artist / venue / organizer entities
- Middleware protects role surfaces; public share routes work for artist/events/venues/jobs/profile/org/epk

### General (Personal)
- Dashboard, Discover, Jobs browse/apply, Settings, Notifications, Profile, Friends search, Contracts card
- In-dashboard post compose / like / comment

### Artist
- Home feed, music library + upload, rights/certification workspaces, EPK, Press, Store, Events, Bookings
- Public `/artist/[username]`

### Venue (live ops shell)
- Dashboard, bookings, calendar, events, tickets, finances (overview), analytics, staff, jobs, scheduling, roles, documents, equipment, site-maps, settings, messages

### Organization / Admin
- Tours/Events list+detail, Hiring Hub + templates + roster (when employer scoped), Org team/Band Hub, RBAC, Finances, Logistics metrics, Music ops console composition

### Hiring
- Public job detail apply, `/onboarding/hire/[token]`, admin templates, venue hiring APIs + kanban page, hiring permissions model

### Public anonymous (local)
- `/`, `/login`, `/faq`, `/terms`, `/privacy`, `/discover*`, `/search`, music-trust readiness pages render (flag-off content)
- Live crawl: **0 server errors** across 259 static pages

### Demo (`demo.tourify.live`)
- `/`, `/login`, `/faq`, `/discover`, `/search` return 200
- Note: `/licensing`, `/institutional`, `/cooperative` return **404 on demo** (deploy lag vs local) — see P2/deploy findings


---

## Persona scorecards

### General / Personal — home `/dashboard`
| Area | Status |
|------|--------|
| Auth → dashboard | Working |
| Create personas | Working |
| Jobs apply | Working |
| Settings / discover / news / notifications / profile | Working |
| Social feed share → `/posts/[id]` | Dead end |
| `/tickets` hub | Dead end |
| `/feed` | Redirects to `/news` (not social) |
| Collaboration CTAs `/collaboration/projects/new` | Dead end |
| Dashboard "Write for Press" | Dead end (artist-gated) |
| Search unified API | Not connected (`/api/search/unified` 404) |

### Artist — home `/artist`
| Area | Status |
|------|--------|
| Music catalog/upload/rights/cert | Working |
| EPK / Press / Store / Events / Bookings | Working |
| Marketplace / licensing / catalog-capital | Not connected (flags + nav) |
| Press-kit builder / analytics page / website / gigs | Dead end |
| Protected segments (overview/messages/jobs) | Needs improvement |
| Service persona middleware | Needs improvement |

### Venue — home `/venue/dashboard`
| Area | Status |
|------|--------|
| Live ops shell routes | Working |
| Legacy nav trees (`/(main)/*`, `/music/*`, `/content/*`, etc.) | Dead ends (31 live 404s) |
| Feed / social / promotions pages | Redirect dead ends |
| Hiring kanban | Not connected (orphaned) |
| Finances reports/settings tabs | Needs improvement |
| Staff onboarding API | Not connected |

### Organization / Admin — home `/admin/dashboard`
| Area | Status |
|------|--------|
| Events / tours / hiring / RBAC / finances | Working |
| Contracts | Dead end (coming soon) |
| Event Work Mode / comms APIs | 501 if migrations missing |
| Music ops panels | Needs improvement (flag-gated backends) |

### Hiring / Work Mode
| Area | Status |
|------|--------|
| Jobs + hire token flow | Working |
| Admin templates | Working |
| `/api/venue/staff-onboarding` | Not connected (404) |
| `/api/onboarding/validate-invitation` | Not connected (404) |

### Music-trust / Investor
| Area | Status |
|------|--------|
| Page + API scaffolding | Present |
| Default flags | All off (180 flags) |
| Product journeys | Not connected |
| Public verify | Dead end for anonymous |

### Public anonymous
| Area | Status |
|------|--------|
| Marketing / legal / discover / search | Working |
| Artist / event / venue / job share routes | Working (matcher) |
| Music verify | Dead end |
| Demo deploy | Missing newer music-trust pages (404) |

---

## Complete dead nav hrefs (product)

- `/(main)/dashboard` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/(main)/documents` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/(main)/events` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/(main)/gallery` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/(main)/messages` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/(main)/music` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/(main)/network` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/(main)/team` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/analytics/attendance` ← `components/venue/venue/venue-navigation.tsx`
- `/analytics/audience` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/analytics/content` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/analytics/financial` ← `components/venue/venue/venue-navigation.tsx`
- `/analytics/revenue` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/artist/features/analytics` ← `components/sidebar.tsx`
- `/artists` ← `components/layout/navigation-sidebar.tsx`
- `/billing` ← `components/venue/main-nav.tsx`
- `/browse` ← `components/layout/navigation-sidebar.tsx`
- `/collaborations` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/content/blog` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/content/photos` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/content/podcasts` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/content/posts` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/content/posts/new` ← `components/venue/navigation/quick-access-panel.tsx`
- `/content/videos` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/dashboard/jobs` ← `components/nav-links.tsx`
- `/dashboard/profile` ← `components/nav-links.tsx`
- `/dashboard/profile/portfolio` ← `components/nav-links.tsx`
- `/docs` ← `components/venue/navigation/main-sidebar.tsx`
- `/epk` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/equipment` ← `components/venue/venue/venue-navigation.tsx`
- `/fans` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/features` ← `components/venue/layouts/main-layout.tsx`
- `/feedback` ← `components/venue/navigation/enhanced-sidebar.tsx`
- `/finances` ← `components/venue/venue/venue-navigation.tsx`
- `/gallery` ← `components/venue/navigation/main-sidebar.tsx`
- `/groups` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/help` ← `components/venue/navigation/sidebar-navigation.tsx`
- `/integrations` ← `components/venue/venue/venue-navigation.tsx`
- `/integrations/export` ← `components/venue/venue/venue-navigation.tsx`
- `/integrations/ticketing` ← `components/venue/venue/venue-navigation.tsx`
- `/music/analytics` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/music/distribution` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/music/library` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/music/playlists` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/music/promotion` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/music/upload` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/network` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/payments` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/promotions` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/promotions/new` ← `components/venue/navigation/quick-access-panel.tsx`
- `/subscriptions` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/teams` ← `components/venue/venue/venue-navigation.tsx`
- `/teams?tab=communication` ← `components/venue/navigation/enhanced-sidebar.tsx`
- `/teams?tab=shifts` ← `components/venue/navigation/enhanced-sidebar.tsx`
- `/teams?tab=tasks` ← `components/venue/navigation/enhanced-sidebar.tsx`
- `/teams/crew-profiles` ← `components/venue/teams/team-member-card.tsx`
- `/tickets` ← `components/venue/navigation/tabbed-navigation.tsx`
- `/tickets/create` ← `components/venue/navigation/quick-access.tsx`
- `/venue/analytics/audience` ← `components/venue/venue/venue-sidebar.tsx`
- `/venue/analytics/events` ← `components/venue/venue/venue-sidebar.tsx`
- `/venue/analytics/finances` ← `components/venue/venue/venue-sidebar.tsx`

### Live-confirmed 404 (anonymous)
- `/(main)/dashboard`
- `/(main)/documents`
- `/(main)/events`
- `/(main)/gallery`
- `/(main)/messages`
- `/(main)/music`
- `/(main)/network`
- `/(main)/team`
- `/billing`
- `/browse`
- `/content/blog`
- `/content/photos`
- `/content/podcasts`
- `/content/posts`
- `/content/posts/new`
- `/content/videos`
- `/docs`
- `/equipment`
- `/fans`
- `/features`
- `/finances`
- `/gallery`
- `/help`
- `/integrations`
- `/integrations/export`
- `/integrations/ticketing`
- `/network`
- `/payments`
- `/promotions`
- `/promotions/new`
- `/subscriptions`

---

## Missing / broken API connections

| API | Called from | Live status |
|-----|-------------|-------------|
| `/api/business/settings` | `app/business/settings/page.tsx` | 404 |
| `/api/demo-accounts` | `lib/services/social-interactions.service.ts` | 404 |
| `/api/demo-accounts/posts` | `lib/services/social-interactions.service.ts` | 404 |
| `/api/posts` | `lib/venue/service-worker.ts` | 404 |
| `/api/search/unified` | `hooks/use-account-search.ts` | 404 |
| `/api/venue/staff-onboarding` | `lib/services/staff-onboarding.service.ts` | 404 |
| `/api/onboarding/validate-invitation` | `components/onboarding/invitation-onboarding.tsx` | 404 |

### Admin / event APIs returning 501 when tables missing
- `app/api/admin/events/[id]/communications/route.ts`
- `app/api/admin/events/[id]/day-sheet/acknowledge/route.ts`
- `app/api/admin/events/[id]/documents/route.ts`
- `app/api/admin/events/[id]/group-chats/route.ts`
- `app/api/admin/events/[id]/secure-uploads/route.ts`
- `app/api/admin/events/[id]/task-messages/route.ts`
- `app/api/admin/events/[id]/work-mode/route.ts`
- `app/api/admin/logistics/site-maps/[id]/publish-work-mode/route.ts`
- `app/api/events/[id]/hq/calendar/route.ts`
- `app/api/events/[id]/hq/resources/route.ts`
- `app/api/webhooks/supabase/notifications/route.ts`

---

## Coming soon / placeholder surfaces (29 files)

- `app/admin/(dashboard-shell)/teams/[jobId]/page.tsx`
- `app/admin/dashboard/contracts/page.tsx`
- `app/artist/business/marketing/page.tsx`
- `app/artist/events/event-wizard/event-wizard-dialog.tsx`
- `app/collaboration/page.tsx`
- `app/projects/[id]/page.tsx`
- `app/venue/components/epk/epk-upgrade-modal.tsx`
- `app/venue/components/event-details/financials-tab.tsx`
- `app/venue/components/groups/create-group-modal.tsx`
- `app/venue/components/promotions/create-promotion-modal.tsx`
- `app/venue/components/social/post-creator.tsx`
- `app/venue/staff/components/performance-management.tsx`
- `app/venue/staff/components/staff-analytics.tsx`
- `app/venue/staff/components/training-development.tsx`
- `components/admin/lodging-management.tsx`
- `components/content/blog-grid.tsx`
- `components/content/videos-grid.tsx`
- `components/dashboard/artist-analytics-overview.tsx`
- `components/dashboard/dashboard-feed.tsx`
- `components/profile/comprehensive-artist-profile.tsx`
- `components/profile/public-profile-view.tsx`
- `components/settings/enhanced-settings-router.tsx`
- `components/social/social-integrations-manager.tsx`
- `components/ui/coming-soon-banner.tsx`
- `components/venue/epk/epk-upgrade-modal.tsx`
- `components/venue/social/post-creator.tsx`
- `components/venue/staff-onboarding-system.tsx`
- `components/venue/venue/staff-analytics.tsx`
- `lib/artist/build-platform-analytics-from-integrations.ts`

---

## Music-trust flag map

- **lib/music/creator-cooperative/creator-cooperative-flags.ts**: 16 flags — all false via DISABLED_*
- **lib/music/creator-digital-commons/creator-digital-commons-flags.ts**: 20 flags — all false via DISABLED_*
- **lib/music/creator-federation/creator-federation-flags.ts**: 21 flags — all false via DISABLED_*
- **lib/music/creator-protocol-constitution/creator-protocol-constitution-flags.ts**: 21 flags — all false via DISABLED_*
- **lib/music/creator-public-infrastructure/creator-public-infrastructure-flags.ts**: 21 flags — all false via DISABLED_*
- **lib/music/institutional/music-institutional-flags.ts**: 13 flags — all false via DISABLED_*
- **lib/music/licensing/music-licensing-flags.ts**: 14 flags — all false via DISABLED_*
- **lib/music/marketplace/music-marketplace-flags.ts**: 7 flags — all false via DISABLED_*
- **lib/music/music-trust-flags.ts**: 6 flags — all false via DISABLED_*
- **lib/music/rights-admin/music-rights-admin-flags.ts**: 17 flags — all false via DISABLED_*
- **lib/music/rights-intelligence/music-rights-intelligence-flags.ts**: 14 flags — all false via DISABLED_*
- **lib/music/royalties/music-royalties-flags.ts**: 10 flags — all false via DISABLED_*

**Total:** 180 flags, defaults disabled when `feature_flags` empty/error.

---

## Live crawl results (localhost:3000)

Anonymous HTTP (no redirect follow):

| Class | Static pages (259) | Priority targets (123) |
|-------|-------------------:|-----------------------:|
| ok | 35 | 16 |
| auth_redirect | 217 | 67 |
| redirect | 7 | 1 |
| not_found | 0 | 39 |
| server_error | 0 | 0 |

Auth redirects for protected surfaces are **expected** without a session. Authenticated deep walks were covered via persona code-path agents (layout/nav/API wiring). Full click-through login was blocked by absence of dedicated QA credentials in env; use account switcher on a multi-persona test user for a follow-up authenticated browser pass.

### Demo probe
See `docs/audits/demo-probe.json`. Newer music-trust pages 404 on demo while 200 locally — deploy lag.

---

## Prioritized fix backlog

### P0 — fix first (68)
| id | severity | status | persona | path | notes | recommended_fix |
| - | - | - | - | - | - | - |
| AUD-0001 | P0 | dead_end | venue_or_legacy_nav | /(main)/dashboard | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0002 | P0 | dead_end | venue_or_legacy_nav | /(main)/documents | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0003 | P0 | dead_end | venue_or_legacy_nav | /(main)/events | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0004 | P0 | dead_end | venue_or_legacy_nav | /(main)/gallery | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0005 | P0 | dead_end | venue_or_legacy_nav | /(main)/messages | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0006 | P0 | dead_end | venue_or_legacy_nav | /(main)/music | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0007 | P0 | dead_end | venue_or_legacy_nav | /(main)/network | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0008 | P0 | dead_end | venue_or_legacy_nav | /(main)/team | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0009 | P0 | dead_end | venue_or_legacy_nav | /billing | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0010 | P0 | dead_end | venue_or_legacy_nav | /browse | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0011 | P0 | dead_end | venue_or_legacy_nav | /content/blog | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0012 | P0 | dead_end | venue_or_legacy_nav | /content/photos | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0013 | P0 | dead_end | venue_or_legacy_nav | /content/podcasts | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0014 | P0 | dead_end | venue_or_legacy_nav | /content/posts | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0015 | P0 | dead_end | venue_or_legacy_nav | /content/posts/new | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0016 | P0 | dead_end | venue_or_legacy_nav | /content/videos | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0017 | P0 | dead_end | venue_or_legacy_nav | /docs | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0018 | P0 | dead_end | venue_or_legacy_nav | /equipment | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0019 | P0 | dead_end | venue_or_legacy_nav | /fans | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0020 | P0 | dead_end | venue_or_legacy_nav | /features | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0021 | P0 | dead_end | venue_or_legacy_nav | /finances | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0022 | P0 | dead_end | venue_or_legacy_nav | /gallery | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0023 | P0 | dead_end | venue_or_legacy_nav | /help | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0024 | P0 | dead_end | venue_or_legacy_nav | /integrations | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0025 | P0 | dead_end | venue_or_legacy_nav | /integrations/export | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0026 | P0 | dead_end | venue_or_legacy_nav | /integrations/ticketing | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0027 | P0 | dead_end | venue_or_legacy_nav | /network | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0028 | P0 | dead_end | venue_or_legacy_nav | /payments | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0029 | P0 | dead_end | venue_or_legacy_nav | /promotions | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0030 | P0 | dead_end | venue_or_legacy_nav | /promotions/new | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0031 | P0 | dead_end | venue_or_legacy_nav | /subscriptions | Nav href has no matching page.tsx; live crawl returned 404 | Remove or remap href in nav config to a real route |
| AUD-0032 | P0 | dead_end | multi | /analytics/attendance | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0033 | P0 | dead_end | multi | /analytics/audience | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0034 | P0 | dead_end | multi | /analytics/content | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0035 | P0 | dead_end | multi | /analytics/financial | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0036 | P0 | dead_end | multi | /analytics/revenue | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0037 | P0 | dead_end | multi | /artist/features/analytics | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0038 | P0 | dead_end | multi | /artists | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0039 | P0 | dead_end | multi | /collaborations | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0040 | P0 | dead_end | multi | /dashboard/jobs | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0041 | P0 | dead_end | multi | /dashboard/profile | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0042 | P0 | dead_end | multi | /dashboard/profile/portfolio | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0043 | P0 | dead_end | multi | /epk | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0044 | P0 | dead_end | multi | /feedback | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0045 | P0 | dead_end | multi | /groups | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0046 | P0 | dead_end | multi | /music/analytics | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0047 | P0 | dead_end | multi | /music/distribution | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0048 | P0 | dead_end | multi | /music/library | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0049 | P0 | dead_end | multi | /music/playlists | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0050 | P0 | dead_end | multi | /music/promotion | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0051 | P0 | dead_end | multi | /music/upload | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0052 | P0 | dead_end | multi | /teams | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0053 | P0 | dead_end | multi | /teams/crew-profiles | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0054 | P0 | dead_end | multi | /tickets | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0055 | P0 | dead_end | multi | /tickets/create | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0056 | P0 | dead_end | multi | /venue/analytics/audience | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0057 | P0 | dead_end | multi | /venue/analytics/events | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0058 | P0 | dead_end | multi | /venue/analytics/finances | No page.tsx; anonymous hits auth redirect. Will 404 after login. | Remove dead href or implement page |
| AUD-0059 | P0 | not_connected | multi | /api/business/settings | Client calls API with no route.ts; live confirmed 404 | Implement route or remove client call |
| AUD-0060 | P0 | not_connected | multi | /api/demo-accounts | Client calls API with no route.ts; live confirmed 404 | Implement route or remove client call |
| AUD-0061 | P0 | not_connected | multi | /api/demo-accounts/posts | Client calls API with no route.ts; live confirmed 404 | Implement route or remove client call |
| AUD-0062 | P0 | not_connected | multi | /api/posts | Client calls API with no route.ts; live confirmed 404 | Implement route or remove client call |
| AUD-0063 | P0 | not_connected | multi | /api/search/unified | Client calls API with no route.ts; live confirmed 404 | Implement route or remove client call |
| AUD-0064 | P0 | not_connected | multi | /api/venue/staff-onboarding | Client calls API with no route.ts; live confirmed 404 | Implement route or remove client call |
| AUD-0065 | P0 | not_connected | hiring | /api/onboarding/validate-invitation | Invitation onboarding validates against missing API; live 404 | Implement validate-invitation or retire component |
| AUD-0107 | P0 | dead_end | publicAnonymous | /music/verify/* | /music is protected and not in public share allowlist; verify pages not anonymously reachable | Add verify paths to isPublicShareRoute and consider default-on public verification flag |
| AUD-0108 | P0 | dead_end | general | /posts/[id] | Share/copy post link points to missing /posts/[id] page | Add public post page or change share URL |
| AUD-0109 | P0 | dead_end | general | /tickets | Tickets hub missing; only subroutes exist | Add /tickets hub redirecting to my-tickets or purchase |



### P1 — core product gaps (44)
| id | severity | status | persona | path | notes | recommended_fix |
| - | - | - | - | - | - | - |
| AUD-0066 | P1 | needs_improvement | multi | app/admin/(dashboard-shell)/teams/[jobId]/page.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0067 | P1 | needs_improvement | multi | app/admin/dashboard/contracts/page.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0068 | P1 | needs_improvement | multi | app/artist/business/marketing/page.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0069 | P1 | needs_improvement | multi | app/artist/events/event-wizard/event-wizard-dialog.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0070 | P1 | needs_improvement | multi | app/collaboration/page.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0071 | P1 | needs_improvement | multi | app/projects/[id]/page.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0072 | P1 | needs_improvement | multi | app/venue/components/epk/epk-upgrade-modal.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0073 | P1 | needs_improvement | multi | app/venue/components/event-details/financials-tab.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0074 | P1 | needs_improvement | multi | app/venue/components/groups/create-group-modal.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0075 | P1 | needs_improvement | multi | app/venue/components/promotions/create-promotion-modal.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0076 | P1 | needs_improvement | multi | app/venue/components/social/post-creator.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0077 | P1 | needs_improvement | multi | app/venue/staff/components/performance-management.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0078 | P1 | needs_improvement | multi | app/venue/staff/components/staff-analytics.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0079 | P1 | needs_improvement | multi | app/venue/staff/components/training-development.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0080 | P1 | needs_improvement | multi | components/admin/lodging-management.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0081 | P1 | needs_improvement | multi | components/content/blog-grid.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0082 | P1 | needs_improvement | multi | components/content/videos-grid.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0083 | P1 | needs_improvement | multi | components/dashboard/artist-analytics-overview.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0084 | P1 | needs_improvement | multi | components/dashboard/dashboard-feed.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0085 | P1 | needs_improvement | multi | components/profile/comprehensive-artist-profile.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0086 | P1 | needs_improvement | multi | components/profile/public-profile-view.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0087 | P1 | needs_improvement | multi | components/settings/enhanced-settings-router.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0088 | P1 | needs_improvement | multi | components/social/social-integrations-manager.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0089 | P1 | needs_improvement | multi | components/ui/coming-soon-banner.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0090 | P1 | needs_improvement | multi | components/venue/epk/epk-upgrade-modal.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0091 | P1 | needs_improvement | multi | components/venue/social/post-creator.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0092 | P1 | needs_improvement | multi | components/venue/staff-onboarding-system.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0093 | P1 | needs_improvement | multi | components/venue/venue/staff-analytics.tsx | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0094 | P1 | needs_improvement | multi | lib/artist/build-platform-analytics-from-integrations.ts | Coming soon / placeholder UX surface | Ship feature or hide entry points |
| AUD-0095 | P1 | not_connected | admin | /api/admin/events/[id]/communications | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0096 | P1 | not_connected | admin | /api/admin/events/[id]/day-sheet/acknowledge | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0097 | P1 | not_connected | admin | /api/admin/events/[id]/documents | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0098 | P1 | not_connected | admin | /api/admin/events/[id]/group-chats | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0099 | P1 | not_connected | admin | /api/admin/events/[id]/secure-uploads | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0100 | P1 | not_connected | admin | /api/admin/events/[id]/task-messages | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0101 | P1 | not_connected | admin | /api/admin/events/[id]/work-mode | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0102 | P1 | not_connected | admin | /api/admin/logistics/site-maps/[id]/publish-work-mode | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0103 | P1 | not_connected | admin | /api/events/[id]/hq/calendar | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0104 | P1 | not_connected | admin | /api/events/[id]/hq/resources | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0105 | P1 | not_connected | admin | /api/webhooks/supabase/notifications | API returns 501 when tables/migrations missing | Ensure migrations applied or degrade UI gracefully |
| AUD-0110 | P1 | needs_improvement | artist | lib/artist/protected-routes.ts | overview/messages/jobs unprotected segments; service persona may bounce at middleware | Expand ARTIST_APP_SEGMENTS; allow service in middleware artist gate |
| AUD-0111 | P1 | needs_improvement | venue | /venue/dashboard/feed,/venue/dashboard/promotions,/venue/dashboard/social | Routes exist but redirect to dashboard — product dead ends | Implement venue feed/promotions or remove nav affordances |
| AUD-0112 | P1 | dead_end | admin | /admin/dashboard/contracts | Coming soon placeholder; not in sidebar | Implement contracts or remove deep links |
| AUD-0113 | P1 | not_connected | venue | /venue/dashboard/hiring-kanban | Hiring kanban orphaned from live nav | Link from jobs/hiring in ops shell |



### P2 — flag-gated / sandbox (1)
| id | severity | status | persona | path | notes | recommended_fix |
| - | - | - | - | - | - | - |
| AUD-0106 | P2 | not_connected | musicTrust | /licensing,/institutional,/cooperative,/federation,/creator-commons,/protocol-constitution,/public-infrastructure,/rights-admin,/rights-intelligence,/artist/music/marketplace | 180 music-trust flags default disabled; readiness shells only | Enable flags per environment with staged rollout; wire discoverability in nav |



### P3 — polish (1)
| id | severity | status | persona | path | notes | recommended_fix |
| - | - | - | - | - | - | - |
| AUD-0114 | P3 | needs_improvement | organization | /admin/* | Org ops still under /admin naming | Migrate to /org/{slug}/dashboard when ready |



---

## Inventory indexes

- Pages by top-level: see `docs/audits/page-inventory.json`
- APIs by domain: see `docs/audits/api-inventory.json`
- Nav dead links: `docs/audits/nav-dead-links.json`, product filter `nav-dead-links-product.json`
- Client API matrix: `docs/audits/client-api-matrix.json`
- Stubs/flags: `docs/audits/stubs-and-flags.json`, `music-trust-flags.json`
- Live crawl: `docs/audits/live-crawl-results-v2.json`
- Findings machine list: `docs/audits/findings.json`

---

## Recommended next engineering sprints

1. **Nav quarantine** — Delete or gate legacy venue/artist nav trees; keep only `VenueOperationsShell` / `app-sidebar` / admin optimized-sidebar.
2. **Missing APIs** — Implement or remove: search/unified, business/settings, venue/staff-onboarding, demo-accounts, validate-invitation; add `/posts/[id]` or fix share URLs.
3. **Tickets hub** — Add `/tickets` → my-tickets; fix `/auth/login` links to `/login`.
4. **Artist gate hardening** — Expand `ARTIST_APP_SEGMENTS`; allow service in middleware.
5. **Admin event HQ** — Apply/verify work-mode + comms migrations; replace 501 with graceful empty states.
6. **Music-trust** — Decide launch flags per env; add verify paths to public share routes; surface issuer/investor entry points in artist/admin nav when enabled.
7. **Demo deploy** — Ship music-trust pages currently 404 on `demo.tourify.live`.

---

*Audit complete for static coverage + anonymous live crawl + persona code-path scoring.*

## Follow-up: authenticated multi-persona pass (2026-07-18)

See [`AUTHENTICATED_INTERACTION_AUDIT.md`](AUTHENTICATED_INTERACTION_AUDIT.md).

- QA logins in `.env.local`: `qa-multi-a@tourify.test` / `qa-multi-b@tourify.test`
- API: switch + artist/band posts + booking **pass**; DM conversation bootstrap **fail**
- Playwright click-through: **7/7** (dashboard, switcher, artist, bookings, venue, messages, admin)
- Blocker for fresh persona create: `artist_profiles` trigger references missing `owner_user_id` (migration drafted, not applied)
