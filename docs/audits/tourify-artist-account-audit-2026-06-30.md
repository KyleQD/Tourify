# Tourify Artist Account Audit

Date: 2026-06-30
Scope: Read-only audit of the Artist account, artist routes, visible features, components, APIs, and completion status.

## Account purpose

The Artist account helps a creator manage their public artist identity, music, content, EPK, events, jobs, business tools, audience relationships, and monetization. It solves the problem of making an artist operationally discoverable and bookable while giving them tools to grow and manage their career.

## Inventory

| Metric | Count |
|---|---:|
| Page routes | 51 |
| Artist API routes | 14 |
| Distinct routed component imports | 60 |
| Artist feature page visible items | 15 |
| Artist mobile/sidebar visible items | 13 |
| Artist business hub visible items | 8 |
| Artist quick actions | 3 |
| Page-level marker hits | TODO: 2, mock: 2, placeholder: 100, comingSoon: 2, fallback: 17 |

## Visible components and purpose

| Visible component group | Count | Purpose | Status |
|---|---:|---|---|
| Artist sidebar/mobile navigation | 13 | Gives artists access to their dashboard, feed, content, music, store, community, business, events, EPK, messages, profile | Mostly Built |
| Artist dashboard and quick actions | 3 | Lets artists upload music, manage bookings, and view analytics | Partial |
| Music feature tiles | 4 | Upload, organize, analyze, and distribute music | Partial and mislinked |
| Content feature tiles | 3 | Manage videos, photos, and blog content | Partial and mislinked |
| EPK/public profile | 2 routes | Creates a professional artist presentation surface | Mostly Built |
| Events operations routes | 11 | Manage events, staff, operations, budget, countdown, site map, tasks, ticket sales | Partial |
| Business hub | 8 | Financial dashboard, merch, contracts, marketing, analytics, team, fans, education | Partial |
| Jobs routes | 3 | Lets artists post or apply for music industry work | Partial |
| Store/tickets/community/network/messages | 5 | Monetization and audience/community engagement | Partial |

## Artist feature route health

The primary Artist feature page has 15 visible feature tiles. 8 resolve and 7 are missing or mislinked:

- `/artist/features/music/upload`
- `/artist/features/music/library`
- `/artist/features/music/analytics`
- `/artist/features/distribution`
- `/dashboard/events`
- `/artist/features/videos`
- `/artist/features/photos`

The global Artist feature panel has 21 visible items. 18 resolve and 3 are missing:

- `/artist/music/library`
- `/artist/music/analytics`
- `/artist/music/distribution`

## Page route inventory

Artist root, profile, and public surfaces:

- `/artist`
- `/artist/[username]`
- `/artist/profile`
- `/artist/settings`
- `/artist/debug`
- `/epk/[slug]`

Dashboard, analytics, feed, messaging, network:

- `/artist/dashboard/analytics`
- `/artist/feed`
- `/artist/messages`
- `/artist/network`
- `/artist/community`
- `/artist/collaborations`

Music, content, EPK, store, tickets:

- `/artist/music`
- `/artist/music/upload`
- `/artist/content`
- `/artist/epk`
- `/artist/store`
- `/artist/tickets`

Artist business hub:

- `/artist/business`
- `/artist/business/analytics`
- `/artist/business/collaboration`
- `/artist/business/contracts`
- `/artist/business/education`
- `/artist/business/fans`
- `/artist/business/financial`
- `/artist/business/marketing`

Artist events:

- `/artist/events`
- `/artist/events/[id]`
- `/artist/events/[id]/manage`
- `/artist/events/[id]/site-map`
- `/artist/events/budget`
- `/artist/events/countdown`
- `/artist/events/operations`
- `/artist/events/resource-allocation`
- `/artist/events/staff`
- `/artist/events/tasks`
- `/artist/events/ticket-sales`

Artist features:

- `/artist/features`
- `/artist/features/blog`
- `/artist/features/blog/[id]`
- `/artist/features/fan-engagement`
- `/artist/features/jobs`
- `/artist/features/licensing`
- `/artist/features/merchandise`
- `/artist/features/music`
- `/artist/features/payments`
- `/artist/features/promotions`
- `/artist/features/subscriptions`

Artist jobs:

- `/artist/jobs`
- `/artist/jobs/[id]/apply`
- `/artist/jobs/new`

## API/data dependency inventory

Artist has 14 API routes:

- `/api/artist-jobs`
- `/api/artist-jobs/[id]`
- `/api/artist-jobs/[id]/applications`
- `/api/artist-jobs/[id]/repost`
- `/api/artist-jobs/applications`
- `/api/artist-jobs/categories`
- `/api/artist-jobs/saved`
- `/api/artist/[artistName]`
- `/api/artist/business/overview`
- `/api/artist/music`
- `/api/artist/music/pin`
- `/api/artists`
- `/api/artists/[id]/music`
- `/api/artists/delete`

## Component implementation inventory

Artist has fewer obvious account-owned component files than Venue/Admin and leans on shared dashboard, EPK, marketplace, events, jobs, and feed components.

Observed account-local/component-family counts:

- `components/artist`: 1 file
- `app/artist/events/components`: 13 route-local component files
- Artist pages import 60 distinct routed components/helpers.
- Artist also depends on shared `components/dashboard`, `components/epk`, `components/marketplace`, `components/artist-jobs`, `components/events`, and shared UI primitives.

## Completion estimate

Artist completion: 55-60%.

Artist has a strong product outline and meaningful real surfaces: EPK, public profile, music upload, events, jobs, business hub, feed, and store. The current risk is not lack of vision; it is route/data consistency. Several visible tiles are mislinked, and many business/monetization surfaces need real connected workflows.

## Missing or not fully built

- Correct routes for Artist music library, music analytics, and distribution.
- Correct feature tile destinations for videos/photos and events.
- Full business tool data connection for contracts, marketing, financials, fan engagement, licensing, payments, and subscriptions.
- Clear decision on whether Artists can directly hire crew, or only collaborate/request through Admin/Venue.
- Real monetization flows for store, tickets, payments, subscriptions, licensing.
- Production-ready empty/loading/error states.

## Recommended next steps

1. Fix Artist feature tile links to existing routes or create the missing destination routes.
2. Convert `/business/*` legacy value into `/artist/business/*` where appropriate.
3. Connect Artist business hub cards to real APIs and Supabase tables.
4. Decide whether Artist has direct hiring authority or only request/collaboration authority.
5. Add route guards and permission states for Artist-only tools.

