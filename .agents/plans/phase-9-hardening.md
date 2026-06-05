# Phase 9 — Hardening & Release

> **Goal:** Make the admin section production-grade: locked-down RLS, consistent UX polish across every empty/loading/error state, accessibility compliance, performance at scale, and a test suite that prevents regressions on the critical flows.

---

## 9.1 RLS & tenant isolation audit

**Why this matters:** Misconfigured RLS can allow one organizer to read or modify another organizer's events, finances, or staff. This is a data breach risk.

**Tasks:**

1. **Generate a checklist.** For every admin-facing table, verify there is an RLS policy that scopes reads/writes to the row's `org_id`. Tables to audit:
   ```
   events_v2, tours, ticket_tiers, ticket_purchases, financial_transactions,
   budgets, settlements, staff_members, shifts, zones, site_maps, site_map_elements,
   advancing_documents, day_sheets, notifications, group_threads, messages,
   feature_flags, job_postings, job_applications, event_participants, tour_team_members
   ```
2. For each table: run `SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = '<table>';` in the Supabase SQL editor.
3. Missing RLS policies → write migration: `CREATE POLICY "org_isolation" ON <table> USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()))`.
4. Tables with no `org_id` column that should be scoped: add `org_id uuid NOT NULL REFERENCES orgs(id)` via migration (or scope via join to the owning entity).
5. **Cross-tenant test.** Create two test organizer accounts. Verify that org A cannot read org B's events via any API endpoint — test this manually with Supabase test tokens.
6. **Service-role exposure.** Audit all API routes: ensure no route uses the Supabase `service_role` key for user-facing reads (service role bypasses RLS). Service role should only be used in trusted server contexts (webhooks, cron jobs).

**Done when:** Every admin table has a verified RLS policy; cross-tenant reads return 0 rows.

---

## 9.2 Audit trails

**Tasks:**

1. Create a universal `admin_audit_log` table:
   ```sql
   CREATE TABLE IF NOT EXISTS admin_audit_log (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     actor_id uuid NOT NULL REFERENCES profiles(id),
     org_id uuid NOT NULL,
     action text NOT NULL,           -- 'create', 'update', 'delete', 'publish', 'settle', etc.
     entity_type text NOT NULL,      -- 'event', 'tour', 'transaction', 'staff', etc.
     entity_id uuid,
     old_values jsonb,
     new_values jsonb,
     ip_address inet,
     user_agent text,
     created_at timestamptz DEFAULT now()
   );
   CREATE INDEX ON admin_audit_log (org_id, created_at DESC);
   CREATE INDEX ON admin_audit_log (entity_type, entity_id);
   ```
2. Add audit log writes to all critical mutations:
   - Event publish/unpublish
   - Financial transaction create/edit/delete
   - Settlement create/finalize/pay
   - Staff hire/fire
   - RBAC role assignments
   - Ticket refunds
   - Feature flag changes
3. Create an "Audit Log" page under Settings (`/admin/dashboard/settings/audit`): paginated log with actor name, action, entity, timestamp. Filterable by actor, entity type, date range.
4. RLS: audit log rows are readable only by org admins.

**Done when:** Publishing an event creates an audit log row; the audit log page shows it.

---

## 9.3 Standardize empty/loading/error states

**Problem:** Some pages still render `null`, spinners without text, or raw error strings instead of the design-system components.

**Tasks:**

1. **Audit.** Run a search for patterns that indicate non-standard states:
   ```
   rg "return null\|return <div>Loading\|return <p>Error\|if.*loading.*return" app/admin/
   ```
2. For each match:
   - `return null` → replace with `<AdminPageSkeleton />`
   - `return <div>Loading` → replace with `<AdminPageSkeleton />`
   - `return <p>Error` → replace with `<AdminErrorCard message={error} />`
3. **Empty states.** Run `rg "No.*found\|Nothing here\|coming soon\|0 results" app/admin/` and replace with `<AdminEmptyState icon={...} title="..." description="..." action={<Button>Create First One</Button>} />`.
4. **Specific empty states per section** (tailor message + icon + CTA):
   - Events list: "No events yet" + Calendar icon + "Create Event" button
   - Tours list: "No tours yet" + Globe icon + "Plan a Tour" button
   - Staff list: "No staff added" + Users icon + "Add Staff Member" button
   - Finances: "No transactions recorded" + DollarSign icon + "Add Transaction" button
   - Analytics: "No data yet — create your first event to see analytics"

**Done when:** Every page in the admin section has a designed empty state, loading skeleton, and error card.

---

## 9.4 Accessibility (a11y)

**Tasks:**

1. **Keyboard navigation.** Every interactive element (buttons, links, form fields, dropdown menus, tabs) must be reachable via Tab key. Use `focus-visible:ring-2 focus-visible:ring-purple-500` on all interactive elements.
2. **ARIA labels.** Icon-only buttons need `aria-label`. Run `rg "<Button[^>]*>[^<]*<[A-Za-z]*Icon\|<[A-Za-z]*Icon[^>]*\/>" app/admin/` and add `aria-label` to all icon buttons that lack text.
3. **Form labels.** Every `<Input>` must have a visible `<Label>` or an `aria-label`. Run `rg "<Input" app/admin/` and check each one.
4. **Color contrast.** The `text-slate-400` used for secondary text may not meet WCAG AA (4.5:1) against `bg-slate-950`. Bump to `text-slate-300` where failing.
5. **Dialog focus trap.** Confirm shadcn `<Dialog>` components trap focus (they should — Radix handles this).
6. **Page titles.** Every page should set a `<title>` via Next.js `metadata`. Add metadata exports to all pages missing them.
7. **Skip navigation link.** Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>` in the admin layout.

**Done when:** Tab navigation reaches all interactive elements; axe accessibility scanner shows 0 critical violations on the dashboard, events, tours, and finances pages.

---

## 9.5 Performance pass

**Problem:** Several pages fetch 100+ rows in single queries with no pagination; heavy list components re-render on every keystroke.

**Tasks:**

1. **Pagination.** Any list returning more than 50 rows must use cursor-based or offset pagination. Check: events list, staff roster, ticket purchases list, transaction list, analytics data. Add `?page=<n>&limit=50` params to affected routes.
2. **Add UI paginators.** For each paginated list, add a `<Pagination>` component (already exists at `components/admin/dashboard/components/ui/pagination.tsx`). Show "Page X of Y", prev/next buttons, jump-to-page input.
3. **Memoization.** In the staff page (1384 lines) and events list, wrap expensive computed values with `useMemo`. Wrap list item render functions with `useCallback`. Use `React.memo` on list item components.
4. **Virtual scrolling.** The `virtual-scroll.tsx` component already exists at `app/admin/dashboard/components/virtual-scroll.tsx`. Use it for any list that regularly exceeds 200 rows (ticket purchases, transaction history, audit log).
5. **Query optimization.** For the top 5 slowest queries (identify via Supabase dashboard → Query Performance), add appropriate indexes. Common patterns to index:
   - `financial_transactions(org_id, created_at DESC)`
   - `ticket_purchases(event_id, checked_in)`
   - `staff_members(org_id, status)`
6. **Bundle size.** Run `npm run build` and check the output for large page bundles (>500KB). Heavy pages: events planner (4726 lines), staff page (1384 lines), tour detail (1516 lines). Use `dynamic(() => import(...), { loading: ... })` for tabs that are not the default active tab.

**Done when:** No API call returns more than 50 rows without pagination; pages with 200+ items use virtual scroll.

---

## 9.6 E2E tests for critical flows

**Priority flows to test** (use Playwright):

### Flow 1: Create event → publish → sell ticket → check-in → settle
```
1. Login as organizer
2. Navigate to Events → Planner
3. Fill all 8 steps (use test fixtures)
4. Publish event → assert redirect to event detail, status = 'published'
5. Navigate to Ticketing → find the event → verify tier appears
6. Simulate ticket purchase (call Stripe test checkout or mock webhook)
7. Navigate to event detail → Tickets tab → verify purchaser appears
8. Navigate to check-in page → enter ticket code → verify checked_in = true
9. Navigate to Finances → Settlements → create settlement for this event
10. Mark settlement as paid → verify status = 'paid'
```

### Flow 2: Create tour → add shows → advancing → day sheet
```
1. Login as organizer
2. Navigate to Tours → Planner → fill all steps → publish
3. Navigate to tour detail → add 2 events to the tour
4. Open one event → Advancing tab → fill tech rider + hospitality
5. Generate day sheet → verify fields auto-populated from event data
6. Distribute day sheet → verify email sent (mock email in test env)
```

### Flow 3: Hire staff → schedule shift → notify
```
1. Post a job → verify appears in job board
2. Submit an application (as a different test user)
3. Admin: move application to 'hired' stage → verify staff member created
4. Navigate to Scheduling → add a shift for this staff member
5. Verify shift appears in week view
```

**Setup:**
1. Install Playwright: `npm install -D @playwright/test`
2. Create `tests/e2e/` directory with a `playwright.config.ts`
3. Seed test data: create a `tests/fixtures/seed.ts` that creates a test org, test users, and basic event data via the Supabase admin client
4. CI: add a GitHub Actions workflow `.github/workflows/e2e.yml` that runs `npx playwright test` on PRs

**Done when:** All 3 E2E flows pass in CI against the test database.

---

## 9.7 Integration tests for critical services

**Tasks:**

1. **Services to test** (in `lib/services/`):
   - `admin-onboarding-staff.service.ts` — test that real DB errors throw (not return mock data)
   - `job-board.service.ts` — test posting a job and querying it back
   - `account-management.service.ts` — test multi-account switching
2. Use Vitest (check if already in `package.json`; if not, add `npm install -D vitest @vitest/coverage-v8`).
3. Mock the Supabase client using `vi.mock('@/lib/supabase')` and test service methods with simulated DB responses.
4. Place tests in `__tests__/services/` and run via `npm test`.

**Done when:** `npm test` runs service tests with 0 failures.

---

## 9.8 Update documentation & remove stale references

**Tasks:**

1. **Stale docs to update or delete:**
   - `docs/ENHANCED_ONBOARDING_SYSTEM.md` — update to reflect current onboarding system
   - `docs/ADMIN_DASHBOARD_ENHANCEMENT_IMPLEMENTATION.md` — archive or update
   - Any doc referencing `enhanced-staff-management.service.ts` (deleted in Phase 0.8)
   - Any doc referencing the legacy `events` table (deprecated in Phase 0.1)
2. **Write new docs:**
   - `docs/ADMIN_GUIDE.md` — overview of all admin sections, with screenshots of each major page
   - `docs/ADVANCING_WORKFLOW.md` — how to use the advancing workspace, day sheets, and calendar sync
   - `docs/API_REFERENCE.md` — list all `/api/admin/**` routes with method, params, response shape
3. **Remove stale sidebar links** in any README or doc that references old navigation structure.

**Done when:** All docs reference current file paths and feature names; no doc mentions deleted files.

---

## 9.9 Final pre-release checklist

**Tasks to complete before marking Phase 9 done:**

1. **Environment variables.** Document all required env vars in `.env.example`. Verify each is set in production:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_MAPBOX_TOKEN` (optional, graceful fallback)
   - `NEXT_PUBLIC_ENABLE_ADMIN_FEED`
   - `FEATURE_ENTITY_RBAC`
2. **Remove all console.log debug statements** from production code. Run `rg "console\.log\|console\.error\|console\.warn" app/admin/ app/api/admin/` and remove non-error logs.
3. **Error monitoring.** Ensure `app/api/admin/error-reporting/route.ts` is wired to a real error tracking service (Sentry, etc.) or remove it.
4. **Rate limiting.** Add rate limiting to:
   - `POST /api/ticketing/check-in` (prevent brute-force ticket code guessing)
   - `POST /api/admin/messages/broadcast` (prevent spam)
   Use `@upstash/ratelimit` or a simple in-memory counter.
5. **CORS / CSRF.** Verify all `POST/PATCH/DELETE` admin routes require the correct `withAdminAuth` wrapper (done in Phase 1.7).
6. **Mobile responsiveness.** Test all admin pages at 375px (iPhone SE). Priority: staff scheduling, site map editor, check-in page. Apply responsive breakpoints where needed.

**Done when:** All checklist items confirmed; staging environment passes all E2E tests.

---

## Phase 9 Exit Criteria

- [ ] Every admin table has verified RLS org-scoping policy
- [ ] Cross-tenant reads return 0 rows
- [ ] Audit log writes on all critical mutations
- [ ] Every page has empty state, loading skeleton, and error card
- [ ] Tab navigation reaches all interactive elements
- [ ] All paginated lists use server-side pagination with UI controls
- [ ] 3 E2E flows pass in CI
- [ ] Service integration tests pass
- [ ] Stale documentation updated or deleted
- [ ] No `console.log` in production code paths
- [ ] `npm run build` passes with zero TypeScript errors
