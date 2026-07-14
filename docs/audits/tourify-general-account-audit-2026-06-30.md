# Tourify General Account Audit

Date: 2026-06-30
Scope: Read-only audit of the General account, which is the default account attached to one user/email/login.

## Account purpose

The General account represents the person. It solves the base user problem: identity, profile, feed, social discovery, jobs, applications, settings, onboarding, and access to Work Mode after hiring.

Crew, staff, and volunteers remain General users. Once hired and onboarded, they should see a worker-facing Work Mode dashboard without becoming a separate account type.

## Inventory

| Metric | Count |
|---|---:|
| Page routes | 94 |
| API routes bucketed to General/shared | 269 |
| Distinct routed component imports | 76 |
| Core visible General items | 36 |
| Global feature dialog items | 24 |
| Total visible General/global items audited | 60 |
| Page-level marker hits | mock: 1, placeholder: 133, comingSoon: 6, fallback: 54 |

## Visible components and purpose

| Visible component group | Count | Purpose | Status |
|---|---:|---|---|
| General sidebar: Dashboard, Events, Bookings, Analytics, Settings | 5 | Gives the user a simple personal navigation spine | Mostly Built |
| Dashboard account cards, profile header, stats, activity, insights | 10 | Shows the user their personal activity and account state | Partial |
| Dashboard quick links/actions | 6 | Lets users jump to analytics, events, network, profile, applications, jobs | Partial |
| Feed, Quick Post, Article, activity feed | 4 | Lets the user participate socially and publish content | Partial |
| Jobs, job detail, applications | 3 | Lets General users find work and track applications | Mostly Built |
| Profile/settings/onboarding routes | 14 | Lets the person create identity, preferences, security, billing, notifications, and setup | Mostly Built |
| Work Mode widget entry | 1 | Lets hired users see and activate assignments | Partial |
| Global feature dialog | 24 | Broad platform discovery menu | Shell/Mock and partially mislinked |

## General/global feature dialog route health

The global feature dialog contains 24 items. Only 9 currently resolve to existing page routes. Missing or mislinked items:

- `/music/upload`
- `/music/library`
- `/music/radio`
- `/music/player`
- `/music/playlists`
- `/music/recording`
- `/insights`
- `/network`
- `/share`
- `/following`
- `/tickets`
- `/business/messages`
- `/career`
- `/billing`
- `/security`

Important implementation note: one dialog implementation stores `href` values but renders buttons without using those hrefs, so visible feature items can appear clickable while not navigating.

## Page route inventory

Identity, auth, and setup:

- `/`
- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/verification`
- `/auth-demo`
- `/auth-test`
- `/setup`
- `/privacy`
- `/terms`
- `/faq`

Dashboard, profile, and settings:

- `/dashboard`
- `/dashboard/bookings`
- `/dashboard/store`
- `/profile`
- `/profile/[username]`
- `/settings`
- `/settings/billing`
- `/settings/integrations`
- `/settings/notifications`
- `/settings/profile`
- `/settings/profile-colors`
- `/settings/security`

Jobs, onboarding, and Work Mode entry:

- `/jobs`
- `/jobs/[id]`
- `/jobs/my-applications`
- `/onboarding`
- `/onboarding/[token]`
- `/onboarding/complete`
- `/onboarding/enhanced-onboarding-flow`
- `/onboarding/hire/[token]`
- `/advance/[token]`

Events, tickets, bookings, calendar:

- `/events`
- `/events/[slug]`
- `/events/[slug]/hq`
- `/events/create`
- `/bookings`
- `/calendar`
- `/tickets/cancel`
- `/tickets/success`

Social, discovery, messaging, community:

- `/feed`
- `/messages`
- `/notifications`
- `/discover`
- `/discover/events`
- `/discover/users`
- `/search`
- `/friends/search`
- `/all-users`
- `/test-friend-suggestions`
- `/forums`
- `/forums/all`
- `/forums/create`
- `/forums/new`
- `/forums/[slug]`
- `/forums/[slug]/thread/[id]`
- `/groups/[id]`

Content, projects, commerce, collaboration:

- `/achievements`
- `/analytics`
- `/blog/[slug]`
- `/blog/new`
- `/collaboration`
- `/collaboration/projects`
- `/collaboration/projects/[id]`
- `/connect`
- `/connect/claim`
- `/contracts`
- `/contracts/[id]`
- `/contracts/list`
- `/create`
- `/documents`
- `/marketplace`
- `/marketplace/seller-agreement`
- `/migrations`
- `/migrations/sql`
- `/music`
- `/projects`
- `/projects/[id]`
- `/projects/[id]/settings`
- `/projects/new`
- `/site-maps/shared/[token]`
- `/team`

Debug/test routes:

- `/debug/auth-test`
- `/debug/client-auth`
- `/debug/cookies`
- `/debug/likes-comments-test`
- `/debug/nextjs15`
- `/debug/profile-check`
- `/debug/session`
- `/debug/social-test`
- `/debug/suggested-users`
- `/debug/suggested-users-test`
- `/debug/test-artist-api`

## API/data dependency inventory

General/shared has 269 API routes. Main groups:

- Events: 24
- Marketplace: 17
- Tours: 16
- Music: 13
- Profile: 13
- Hiring: 11
- Social: 10
- Photos: 9
- Settings: 9
- Debug: 8
- Forums: 8
- Feed: 6
- Messages: 6
- Posts: 6
- Ticketing: 6
- Connect: 5
- Notifications: 5
- Staffing: 5
- Workflows: 5
- Agencies, calendar, cron, groups, migrations, onboarding, subscriptions: 4 each
- Many singleton APIs for accounts, assets, jobs, invitations, search, storage, payments, webhooks, health, and upload.

## Component implementation inventory

General relies heavily on shared components:

- `components/dashboard`: 34 files
- `components/account`: 4 files
- `components/hiring`: 45 files, shared with Admin/Venue workforce flows
- `components/settings`: 28 files
- `components/layout`: 8 files
- `components/features`: 2 files

## Completion estimate

General completion: 60-65%.

General is the most mature base account. Identity, profile, settings, jobs, applications, social areas, and dashboard surfaces exist. The biggest gaps are routing cleanup in the global feature dialog, real dashboard data consistency, and the missing full Work Mode dashboard.

## Missing or not fully built

- Dedicated Work Mode dashboard for hired General users.
- Full schedule/task/day-sheet/site-map/communication experience after onboarding.
- Route cleanup for global feature dialog items.
- Consistent route strategy for `/tickets`, `/billing`, `/security`, `/network`, `/share`, and `/following`.
- Fewer fallback/static dashboard values.
- Stronger empty/loading/error states across dashboard cards.
- Clear permission isolation between normal General mode and Work Mode.

## Recommended next steps

1. Build `/dashboard/work` or `/work-mode` as the worker-facing dashboard.
2. Connect Work Mode to assignments, schedules, tasks, communications, site maps, day sheets, travel, payroll info, documents, and contacts.
3. Remove or repair global feature dialog links that do not resolve.
4. Make General dashboard cards consistently data-backed.
5. Add access checks so Work Mode content only appears for accepted/onboarded assignments.

