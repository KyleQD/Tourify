# Phase 1 — Information Architecture, Navigation & Auth Consistency

> **Goal:** Make all features discoverable via a condensed, categorized left nav. Establish a single consistent UI shell that every page inherits. Reconcile all auth checks so nothing 403s for legitimate admins.

---

## 1.1 Refactor the sidebar into 6 collapsible categories

**Current state:** `app/admin/dashboard/components/optimized-sidebar.tsx` has a flat list of ~12 top-level items. It already supports `children`, collapsible expansion, collapse-to-icon, keyboard shortcuts, badge counts, and search. The `navItems` array (line ~109) just needs restructuring.

**New structure to implement:**

```
Dashboard                          /admin/dashboard
Operations (collapsible)
  Tours                            /admin/dashboard/tours
  Events                           /admin/dashboard/events
  Calendar                         /admin/dashboard/calendar  (new)
  Logistics & Site Maps            /admin/dashboard/logistics
Workforce (collapsible)
  Staff & Crew                     /admin/dashboard/staff
  Scheduling & Shifts              /admin/dashboard/staff?tab=scheduling
  Jobs & Hiring                    /admin/dashboard/jobs
  Applications                     /admin/(dashboard-shell)/applications
  Roles & Permissions              /admin/dashboard/rbac
  Onboarding                       /admin/dashboard/onboarding
Commerce (collapsible)
  Ticketing                        /admin/dashboard/ticketing
  Finances                         /admin/dashboard/finances
  Marketplace                      /admin/dashboard/marketplace
  Store                            /admin/dashboard/store
  Inventory                        /admin/dashboard/inventory
Network (collapsible)
  Artists                          /admin/dashboard/artists
  Venues                           /admin/dashboard/venues
  Agencies                         /admin/dashboard/agencies
  Connections                      /admin/dashboard/network
Content (collapsible)
  Content Library                  /admin/dashboard/content
  Music                            /admin/dashboard/music
  EPK                              /admin/dashboard/epk
  Website                          /admin/dashboard/website
  Feed                             /admin/dashboard/feed
Insights & System (collapsible)
  Analytics                        /admin/dashboard/analytics
  Connect Telemetry                /admin/dashboard/connect
  Features                         /admin/dashboard/features
  Settings                         /admin/dashboard/settings
```

**Tasks:**

1. Replace the `navItems` array in `optimized-sidebar.tsx` with the 6-category structure above. Each category is a top-level `NavItem` with `children`. Dashboard stays as a standalone non-category top-level item.
2. Preserve all existing functionality: `doesNavHrefMatchLocation`, keyboard shortcuts (`metaShortcutKey`), badge counts from `useAdminStats`, collapse-to-icon mode, mobile hamburger, search filter.
3. Badge counts to keep:
   - Operations > Tours: `stats.totalTours`
   - Operations > Events: `stats.totalEvents`
   - Commerce > Ticketing: `stats.ticketsSold`
   - Workforce > Staff & Crew: `stats.staffMembers`
   - Commerce > Finances: `stats.monthlyRevenue`
4. Categories default to **collapsed**. Persist expanded state in `localStorage` key `admin_sidebar_expanded` so refreshing doesn't collapse them unexpectedly.
5. Auto-expand the category containing the current route on page load.
6. Category rows should have a subtle left border accent in the category's color (Operations = purple, Workforce = cyan, Commerce = green, Network = pink, Content = orange, Insights = blue) when expanded.

**Done when:** Sidebar renders 7 rows collapsed (Dashboard + 6 categories). Expanding any category reveals its children. Active page highlights correctly. Keyboard shortcuts still work.

---

## 1.2 Extract reusable AdminFilterBar component

**Current state:** Every page re-implements search input + status filter + view-toggle (list/grid) inline.

**Tasks:**

1. Create `app/admin/dashboard/components/admin-filter-bar.tsx`:
   ```tsx
   interface AdminFilterBarProps {
     searchPlaceholder?: string
     searchValue: string
     onSearchChange: (v: string) => void
     statusOptions?: Array<{ value: string; label: string }>
     statusValue?: string
     onStatusChange?: (v: string) => void
     viewMode?: 'list' | 'grid'
     onViewModeChange?: (mode: 'list' | 'grid') => void
     actions?: React.ReactNode   // right-side extra buttons
   }
   ```
2. Match the existing style: `bg-slate-900/40 border border-slate-700/50 rounded-sm p-4 flex flex-wrap gap-3 items-center`.
3. Refactor `app/admin/dashboard/events/page.tsx`, `app/admin/dashboard/tours/page.tsx`, `app/admin/dashboard/staff/page.tsx` to use `AdminFilterBar` and delete their inline implementations.

**Done when:** Three pages use `AdminFilterBar`; filter/search behavior is identical to before.

---

## 1.3 Extract AdminDetailTabs shell

**Current state:** Event detail and tour detail both implement the same Tabs + header pattern inline (~80 lines each).

**Tasks:**

1. Create `app/admin/dashboard/components/admin-detail-tabs.tsx`:
   ```tsx
   interface AdminDetailTabsProps {
     tabs: Array<{ value: string; label: string; icon?: LucideIcon }>
     activeTab: string
     onTabChange: (value: string) => void
     headerLeft: React.ReactNode   // title, badges, breadcrumb
     headerRight: React.ReactNode  // action buttons
     children: React.ReactNode
   }
   ```
2. Refactor `app/admin/dashboard/events/[id]/page.tsx` and `app/admin/dashboard/tours/[id]/page.tsx` to use the shell.
3. The tab trigger style must match the existing `border-b-2 border-purple-500` active state pattern already used.

**Done when:** Both detail pages use the shared shell with zero visual difference.

---

## 1.4 Standardize admin chrome on standalone pages

**Problem:** `app/admin/dashboard/logistics/site-maps-enhanced/page.tsx` and `app/admin/dashboard/agencies/page.tsx` bypass the dashboard shell layout and have their own inconsistent headers.

**Tasks:**

1. Move `site-maps-enhanced/page.tsx` into the dashboard-shell layout by ensuring it's under a route segment that uses `app/admin/dashboard/layout.tsx`. Remove any standalone `<nav>` or `<header>` it renders directly.
2. Same for `agencies/page.tsx` — use `AdminPageHeader` and remove bespoke header markup.
3. Verify both pages still function after layout change (no auth double-renders).

**Done when:** Both pages have the same chrome (sidebar + header) as other dashboard pages.

---

## 1.5 Fix notification bell in admin header

**Problem:** `app/admin/layout.tsx` imports `OptimizedHeader` but may not be using the notification bell integration correctly.

**Tasks:**

1. Read `app/admin/dashboard/components/optimized-header.tsx`. Confirm it renders a notification bell that calls `GET /api/admin/notifications`.
2. Read `app/admin/layout.tsx` and `app/admin/dashboard/layout.tsx` — ensure `OptimizedHeader` is rendered in exactly one place (not duplicated or missing).
3. The bell should show unread count badge, open a dropdown with the last 5 notifications (using `components/notifications/enhanced-notification-center.tsx`), and have a "View all" link.

**Done when:** Bell icon shows unread count; clicking opens notification list.

---

## 1.6 Create missing stub routes

**Problem:** Several links in the UI point to routes that do not exist, causing 404s.

**Tasks — create minimal placeholder pages for each (use `AdminPageHeader` + `AdminEmptyState`):**

1. `app/admin/dashboard/artists/[id]/page.tsx` — Artist detail page. Header: artist name. Tabs: Profile, Events, Analytics. For now, show "Full artist management coming in Phase 8."
2. `app/admin/dashboard/artists/new/page.tsx` — Import/create artist. For now, show a form stub with name, genre, email fields that calls `POST /api/admin/artists`.
3. `app/admin/dashboard/venues/[id]/page.tsx` — Venue detail. Same stub pattern.
4. `app/admin/dashboard/marketplace/page.tsx` — Check if exists; if the orders list is missing, create `app/admin/dashboard/marketplace/orders/page.tsx` (separate from the existing `orders/[id]` detail).
5. `app/admin/dashboard/staff-management/page.tsx` — If the sidebar links to this, create a redirect to `/admin/dashboard/staff`.
6. `app/admin/dashboard/jobs/page.tsx` — Check if exists (glob shows it does). Confirm it loads data from `GET /api/admin/job-postings` and renders real rows.
7. `app/admin/dashboard/contracts/page.tsx` — Contracts list stub. Show empty state with "Contract management coming soon."

**Done when:** No 404s from any sidebar link or in-page navigation button.

---

## 1.7 Reconcile admin auth checks + fix account_relationships gap

**Problem 1:** Some `/api/admin/**` routes use `withAdminAuth`, others use `authenticateApiRequest` (which only checks 401, not admin role), some use `withAuth` (not admin), and a few have no auth at all — causing inconsistent 403s for legitimate admins.

**Problem 2 (critical):** `middleware.ts` calls `userHasAdminSurfaceAccess()` which checks three paths: `profiles`, `organizer_accounts`, AND `account_relationships`. But `checkAdminPermissions()` in `lib/auth/api-auth.ts` (used by `withAdminAuth`) only checks `organizer_accounts` + profile — it **does not** check `account_relationships`. A user granted admin access exclusively via `account_relationships` will pass the middleware but get 403 on every `withAdminAuth` API call.

**Tasks:**

1. Open `lib/auth/api-auth.ts`. Find `checkAdminPermissions`. Add the `account_relationships` check:
   ```ts
   // Add alongside existing organizer_accounts check
   const { data: relationship } = await supabase
     .from('account_relationships')
     .select('type')
     .eq('user_id', user.id)
     .eq('type', 'admin')
     .maybeSingle()
   if (relationship) return { isAdmin: true, ... }
   ```
2. Run `rg "withAdminAuth\|profileIndicatesAdminAccess\|authenticateApiRequest\|withAuth" app/api/admin/ --files-with-matches` to catalog all auth variants.
3. Routes using `authenticateApiRequest` only (e.g., `app/api/admin/venues/route.ts`) — add admin check.
4. Routes using `withAuth` instead of `withAdminAuth` (e.g., `app/api/admin/events/[id]/group-chats/route.ts`) — upgrade.
5. Routes with no auth (`app/api/onboarding-templates/` — done in Phase 0.7) — already handled.
6. Also fix the `middleware.ts` line 93–95 that silently allows through on `userHasAdminSurfaceAccess` errors: change `catch { /* allow through */ }` to `catch { return redirect('/dashboard') }`.

**Done when:** A user granted admin via `account_relationships` can access all admin API routes without 403; the middleware error catch redirects rather than allowing through.

---

## 1.8 Fix global search paths

**Problem:** `components/admin/enhanced-global-search.tsx` has hardcoded or incorrect navigation paths for some result types.

**Tasks:**

1. Read the search component and find all `router.push(...)` or `href` values. 
2. Verify each path exists: events → `/admin/dashboard/events/[id]`, tours → `/admin/dashboard/tours/[id]`, artists → `/admin/dashboard/artists/[id]`, venues → `/admin/dashboard/venues/[id]`, staff → `/admin/dashboard/staff`.
3. Fix any paths that point to non-existent routes (use the stub pages from 1.6 as targets).

**Done when:** Searching and clicking any result navigates to a valid page.

---

## Phase 1 Exit Criteria

- [ ] Sidebar shows 7 rows collapsed; expanding categories reveals children
- [ ] Active route highlights correct category + child
- [ ] `AdminFilterBar` used on events, tours, staff pages
- [ ] No duplicate header/nav elements on any page
- [ ] Notification bell shows unread count and dropdown
- [ ] Zero 404s from any sidebar link
- [ ] All `/api/admin/**` routes use `withAdminAuth`
- [ ] Global search results navigate to valid pages
- [ ] `npm run build` passes
