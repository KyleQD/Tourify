# Tourify Admin — Organization Schema Reconnect Plan

**Prepared:** 2025-07-25
**Author:** Plan mode (Bob)
**Status:** Complete ✅
**Constraint:** `supabase db reset` is FORBIDDEN. All SQL is additive (no DROP TABLE, no TRUNCATE, no destructive ALTER). Never delete working code. Never mock data.

---

## 1. Executive Summary

The admin dashboard has two distinct classes of problems discovered by deep schema audit:

**Class A — Acting Context Not Wired (6 pages)**
Six client pages fire API calls without passing `actingHeaders`, causing 409 errors when no org is selected and (more importantly) silently querying the wrong org's data for users who have multiple accounts. The correct fix pattern is already proven in `tours-page-client.tsx`.

**Class B — Schema Mismatches Between API Routes and Actual Database (4 issues)**
Four API routes reference column names or tables that do not match what is actually in the database. This causes runtime 42703 (column does not exist) or 42P01 (table does not exist) errors that the routes silently absorb and return `{ unavailable: true }` — making entire page sections appear blank even when the user has valid data.

**Class C — Missing Tables Required by API Routes (3 tables)**
Three tables referenced by API routes do not exist in the database: `contracts`, `event_participants`, and `admin_publication_outbox`. The routes already handle the 42P01 error gracefully (returning `unavailable: true`), but the data surfaces are permanently dead until the tables are created.

**Class D — Travel Groups Missing `org_id` Scope Column**
The `travel_groups` table has no `org_id` column but the stats route filters by `org_id`, causing that query to silently fail and return 0 travel metrics for all orgs.

---

## 2. Complete Schema Evidence

### 2.1 Tables That Exist (confirmed)

| Table | Key Columns | Notes |
|---|---|---|
| `organizations` | `id, name, slug` | Core org table |
| `org_members` | `org_id, user_id, role` | Membership, used by acting context |
| `org_role_permissions` | `role, perms[]` | Capability mapping |
| `organizer_accounts` | `id, user_id, ops_org_id, is_active` | Profile ↔ org mapping |
| `tours` | `id, org_id, name, status, revenue` | ✅ Has org_id |
| `events_v2` | `id, org_id, title, status, start_at, capacity` | ✅ Canonical events table |
| `tour_events` | `tour_id, event_id, ordinal` | Join |
| `logistics_tasks` | `id, org_id, event_id, tour_id, type, status, priority, budget, actual_cost` | ✅ Has org_id |
| `financial_transactions` | `id, org_id, event_id, tour_id, type, category, amount` | ✅ Has org_id |
| `budgets` | `id, org_id, event_id, tour_id, category, allocated_amount, spent_amount` | ✅ Has org_id |
| `ticket_types` | `id, event_id, name, price, quantity_available, quantity_sold` | Tied to event |
| `ticket_sales` | `id, event_id, buyer_user_id, quantity, total_amount, payment_status` | No org_id, scoped via event |
| `vendors` | `id, organization_id, name, vendor_type, rating` | ⚠️ Column is `organization_id` NOT `org_id` — see §3 |
| `travel_groups` | `id, event_id, tour_id, status, coordination_status, total_members, confirmed_members` | ⚠️ No `org_id` — see §3 |
| `lodging_providers` | `id, name, type, city, status, rating` | Provider catalog (not booking) |
| `lodging_bookings` | `id, event_id, tour_id, provider_id, total_amount` | ⚠️ No `org_id` — see §3 |
| `rental_agreements` | `id, client_id, event_id, tour_id, subtotal` | ⚠️ No `org_id`, has `subtotal` not `total_amount` |
| `staff_members` | `id, entity_type, entity_id` | Polymorphic |
| `rbac_roles` | `id, name, display_name, scope_type` | ✅ Entity RBAC |
| `rbac_permissions` | `id, name, category` | ✅ |
| `rbac_role_permissions` | `role_id, permission_id` | ✅ |
| `rbac_user_entity_roles` | `id, user_id, entity_type, entity_id, role_id, is_active` | ✅ |
| `feature_flags` | `id, name, enabled` | ✅ |
| `venue_booking_requests` | `id, org_id, status` | ✅ |
| `event_attendance` | `id, event_id, user_id, status` | Exists — replaces `event_participants` |

### 2.2 Tables That Do NOT Exist (confirmed missing)

| Table | Referenced By | Impact |
|---|---|---|
| `contracts` | `/api/admin/contracts/route.ts` | Contracts page shows "unavailable" |
| `event_participants` | `/api/admin/analytics/top-performers/route.ts` | Top performers tab always empty |
| `admin_publication_outbox` | `/api/admin/dashboard/command-center/route.ts` | Command center publication count = 0 |
| `security_audit_events` | `/api/admin/dashboard/command-center/route.ts` | Command center security count = 0 |

### 2.3 Schema Mismatches (column name drift)

| Table | API Expects | Actual Column | Impact |
|---|---|---|---|
| `vendors` | `org_id` | `organization_id` | Vendor master always returns empty |
| `travel_groups` | `org_id` | *(column does not exist)* | Travel stats always 0 |
| `lodging_bookings` | `org_id` | *(column does not exist)* | Lodging stats always 0 |
| `rental_agreements` | `org_id`, `total_amount` | *(no org_id)*, `subtotal` | Rental stats always 0 |

---

## 3. Sub-Tasks

---

### R1 — Fix vendors API: `org_id` → `organization_id`

- **Status:** `[ ] pending`
- **Problem:** `app/api/admin/vendors/route.ts` queries `vendors` with `.eq("org_id", orgId)` and selects `org_id`. The actual table has `organization_id`. The query silently returns empty (no 42P01, just 0 rows) so the vendor panel always renders with 0 vendors and the "fresh" state.
- **Intent:** Patch the vendors route to use `organization_id` in both the `.eq()` filter and the `SELECT` string. Update the normalization to read from `organization_id`. No table changes needed.
- **Acceptance Criteria:**
  - `[ ]` `app/api/admin/vendors/route.ts` `.eq("org_id", orgId)` changed to `.eq("organization_id", orgId)`
  - `[ ]` `SELECT` string updated: `organization_id` replaces `org_id`
  - `[ ]` Normalization `r.org_id` reference updated to `r.organization_id`
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/vendors/route.ts` fully
  2. Replace all `org_id` references with `organization_id` in the query
  3. Run `tsc --noEmit`
- **Key files:** `app/api/admin/vendors/route.ts`

---

### R2 — Fix stats route: column mismatches for travel, lodging, rental

- **Status:** `[ ] pending`
- **Problem:** `app/api/admin/dashboard/stats/route.ts` queries:
  - `travel_groups` with `.eq('org_id', orgId)` — `org_id` does not exist on this table (has `event_id`, `tour_id`, `created_by` only)
  - `lodging_bookings` with `.eq('org_id', orgId)` — `org_id` does not exist on this table
  - `rental_agreements` with `.eq('org_id', orgId)` and `.select('id, status, total_amount')` — `org_id` does not exist; column is `subtotal` not `total_amount`
  These fail silently because `Promise.allSettled` catches the errors.
- **Intent:** Patch the stats route to scope travel_groups, lodging_bookings, and rental_agreements by org indirectly (via the events that belong to the org). For `rental_agreements`, rename `total_amount` to `subtotal` in the select.
- **Acceptance Criteria:**
  - `[ ]` `travel_groups` query scopes by `created_by.eq.${user.id}` when no direct org_id exists (or by org events if orgId known via event_id join)
  - `[ ]` `lodging_bookings` query scopes by `tour_id.in.(orgTourIds)` or falls back to user's event IDs
  - `[ ]` `rental_agreements` select uses `subtotal` instead of `total_amount`; orgId filter removed or replaced with event/tour scoping
  - `[ ]` Stats route still runs `Promise.allSettled` (no regression)
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/dashboard/stats/route.ts` lines 60-100 to see exact query forms
  2. Confirm `travel_groups` columns — it has `event_id`, `tour_id`, `created_by` → use `created_by.eq.${user.id}` as fallback (or skip org filter)
  3. Confirm `lodging_bookings` columns — filter by `tour_id.in.(orgTourIds)` using previously fetched tour IDs
  4. Confirm `rental_agreements` column — use `subtotal`
  5. Apply patch; run `tsc --noEmit`
- **Key files:** `app/api/admin/dashboard/stats/route.ts`

---

### R3 — Fix top-performers: `event_participants` → `event_attendance`

- **Status:** `[ ] pending`
- **Problem:** `app/api/admin/analytics/top-performers/route.ts` queries `event_participants` which does not exist. The correct table is `event_attendance` (columns: `id, event_id, user_id, status`). Because `withAdminAuth` does not catch 42P01, the route crashes and returns 500 (or the error propagates as `{ artists: [], events: [] }`).
- **Intent:** Replace `event_participants` with `event_attendance` and adjust the query to use the correct column names.
- **Acceptance Criteria:**
  - `[ ]` `event_participants` reference replaced with `event_attendance`
  - `[ ]` Select uses `user_id` (same column name — confirmed in `event_attendance`)
  - `[ ]` Date filter changes from `created_at` range to `event_attendance.created_at` range (column exists)
  - `[ ]` Top artists logic unchanged — group by `user_id`, count, resolve names from `artist_profiles` + `profiles`
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/analytics/top-performers/route.ts` fully (already read — 79 lines)
  2. Swap `event_participants` → `event_attendance`
  3. Verify `event_attendance.user_id` is the right column (confirmed ✅)
  4. Run `tsc --noEmit`
- **Key files:** `app/api/admin/analytics/top-performers/route.ts`

---

### R4 — Create missing `contracts` table (additive SQL)

- **Status:** `[ ] pending`
- **Problem:** The Contracts page + `ContractWorkspacePanel` and `ObligationsPanel` call API routes that query a `contracts` table which does not exist. The routes return `{ unavailable: true }` silently. There is no migration for an admin `contracts` table (only `artist_contracts` and `staff_contracts` exist for their respective entity scopes).
- **Intent:** Provide additive SQL that creates an org-scoped `contracts` table and a companion `contract_obligations` table. The user will apply this manually via Supabase Studio (never via `db reset`). The API routes already handle the structure once the table exists.
- **Acceptance Criteria (SQL only — no code change):**
  - `[ ]` SQL creates `contracts` table with: `id uuid PK, org_id uuid → organizations, vendor_id uuid nullable → vendors, counterparty_name text, title text NOT NULL, status text (draft|under_review|signed|expired|terminated), contract_type text, signed_at timestamptz, expires_at timestamptz, created_by uuid → auth.users, created_at timestamptz, updated_at timestamptz`
  - `[ ]` SQL creates `contract_obligations` table (for ObligationsPanel): `id uuid PK, contract_id uuid → contracts, org_id uuid → organizations, obligation_type text, description text, due_date date, status text (pending|in_progress|fulfilled|waived|overdue), responsible_party text, evidence_note text, created_at timestamptz`
  - `[ ]` RLS enabled on both tables: `org_members` can read/write rows where `org_id` matches their org membership
  - `[ ]` SQL is `CREATE TABLE IF NOT EXISTS` so it is idempotent and safe to run multiple times
  - `[ ]` SQL is delivered as a code block in this plan document — not applied automatically
  - `[ ]` After manual application: contracts API returns real data instead of `unavailable: true`
- **SQL to apply manually:**

```sql
-- ============================================================
-- ADDITIVE MIGRATION: admin contracts & obligations tables
-- Apply manually in Supabase Studio → SQL Editor
-- Safe: CREATE TABLE IF NOT EXISTS (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id         uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  counterparty_name text,
  title             text NOT NULL DEFAULT 'Contract',
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','under_review','signed','expired','terminated')),
  contract_type     text,
  signed_at         timestamptz,
  expires_at        timestamptz,
  notes             text,
  document_url      text,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_org_id_idx ON public.contracts(org_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(org_id, status);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'org_members_can_read_contracts'
  ) THEN
    CREATE POLICY org_members_can_read_contracts ON public.contracts
      FOR SELECT USING (
        org_id IN (
          SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'org_members_can_write_contracts'
  ) THEN
    CREATE POLICY org_members_can_write_contracts ON public.contracts
      FOR ALL USING (
        org_id IN (
          SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ---- contract_obligations ----

CREATE TABLE IF NOT EXISTS public.contract_obligations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id        uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
  org_id             uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  obligation_type    text NOT NULL DEFAULT 'general',
  description        text,
  due_date           date,
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','in_progress','fulfilled','waived','overdue')),
  responsible_party  text,
  evidence_note      text,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contract_obligations_org_idx ON public.contract_obligations(org_id);
CREATE INDEX IF NOT EXISTS contract_obligations_contract_idx ON public.contract_obligations(contract_id);

ALTER TABLE public.contract_obligations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contract_obligations' AND policyname = 'org_members_can_read_obligations'
  ) THEN
    CREATE POLICY org_members_can_read_obligations ON public.contract_obligations
      FOR SELECT USING (
        org_id IN (
          SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contract_obligations' AND policyname = 'org_members_can_write_obligations'
  ) THEN
    CREATE POLICY org_members_can_write_obligations ON public.contract_obligations
      FOR ALL USING (
        org_id IN (
          SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;
```

- **Key files:** `app/api/admin/contracts/route.ts` (no change), `app/api/admin/contracts/obligations/route.ts` (check it uses `contract_obligations` or `contracts` — may need minor update)

---

### R5 — Fix contracts obligations API route table name

- **Status:** `[ ] pending`
- **Problem:** The ObligationsPanel calls `/api/admin/contracts/obligations`. This route likely queries a table `contracts/obligations` or a table named differently than the `contract_obligations` table we are creating. Need to verify the route file and ensure the table name matches.
- **Intent:** Read `app/api/admin/contracts/obligations/route.ts`, confirm it queries `contract_obligations` (or whatever the correct name is after R4), and patch if needed.
- **Acceptance Criteria:**
  - `[ ]` `app/api/admin/contracts/obligations/route.ts` queries `contract_obligations` table
  - `[ ]` Route uses `org_id` filter against `admin.orgId`
  - `[ ]` Returns `{ obligations, overdue }` structure expected by `ObligationsPanel`
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/api/admin/contracts/obligations/route.ts` fully
  2. Confirm table name used
  3. Patch if different from `contract_obligations`
  4. Run `tsc --noEmit`
- **Key files:** `app/api/admin/contracts/obligations/route.ts`

---

### R6 — Add `org_id` to `travel_groups`, `lodging_bookings` (additive SQL)

- **Status:** `[ ] pending`
- **Problem:** `travel_groups` and `lodging_bookings` have no `org_id` column, so the stats route cannot scope them by org. The queries always return 0 results even when travel/lodging data exists.
- **Intent:** Add `org_id` column to both tables as a nullable FK. Existing rows get `NULL` (harmless — the stats query wraps in `Promise.allSettled` and falls back to 0). New rows created by the app will be stamped with the org. Also update the stats route to handle the case where `org_id` IS NULL on old rows (filter `org_id = x OR org_id IS NULL` is wrong — instead use `org_id = x`; old rows just won't show until they're updated organically).
- **Acceptance Criteria (SQL only):**
  - `[ ]` SQL adds `org_id uuid REFERENCES public.organizations(id)` to `travel_groups` as nullable with `ALTER TABLE IF EXISTS`
  - `[ ]` SQL adds `org_id uuid REFERENCES public.organizations(id)` to `lodging_bookings` as nullable with `ALTER TABLE IF EXISTS`
  - `[ ]` SQL uses `ADD COLUMN IF NOT EXISTS` (idempotent, Postgres 9.6+)
  - `[ ]` Index created: `CREATE INDEX IF NOT EXISTS` on both new columns
  - `[ ]` SQL provided as code block in plan — not auto-applied
- **SQL to apply manually:**

```sql
-- ============================================================
-- ADDITIVE MIGRATION: add org_id to travel_groups and lodging_bookings
-- Apply manually in Supabase Studio → SQL Editor
-- Safe: ADD COLUMN IF NOT EXISTS (idempotent)
-- ============================================================

ALTER TABLE public.travel_groups
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS travel_groups_org_id_idx ON public.travel_groups(org_id);

ALTER TABLE public.lodging_bookings
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lodging_bookings_org_id_idx ON public.lodging_bookings(org_id);
```

- **Key files:** `app/api/admin/dashboard/stats/route.ts` (the stats route already handles null results gracefully — no code change needed after the column is added)

---

### R7 — Fix acting context headers: Events page

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/events/events-page-client.tsx`
- **Problem:** `buildNoStoreInit()` at line 54–60 returns headers with no acting context. `fetchEvents` at line 72 fires immediately with no `isActingReady` guard. This means: (1) before an org is selected the page 409s, (2) when the org switches the data does NOT refresh.
- **Intent:** Add `useActingContext()`, guard `fetchEvents`, spread `actingHeaders`, re-fetch on `actingContextKey` change, show `AdminEmptyState` when not ready.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported from `@/hooks/use-acting-context`
  - `[ ]` `const { actingContextKey, actingHeaders, isActingReady } = useActingContext()` added to component
  - `[ ]` `buildNoStoreInit` updated to accept `actingHeaders` parameter and spread them
  - `[ ]` `fetchEvents` guards on `if (!isActingReady) return` before any fetch
  - `[ ]` `fetch()` call spreads `actingHeaders` in headers
  - `[ ]` `useEffect` that calls `fetchEvents` depends on `actingContextKey`
  - `[ ]` `if (!isActingReady) return <AdminEmptyState icon={Building2} title="No organization selected" description="Select an organization from the account switcher in the top navigation to continue." />`
  - `[ ]` TypeScript build passes 0 errors
- **Pattern reference:** `app/admin/dashboard/tours/tours-page-client.tsx` lines 108–170
- **Key files:** `app/admin/dashboard/events/events-page-client.tsx`

---

### R8 — Fix acting context headers: Calendar hook

- **Status:** `[ ] pending`
- **File:** `hooks/use-admin-calendar.ts`
- **Problem:** Line 89 — `fetch('/api/admin/calendar?${params}', { credentials: 'include', cache: 'no-store' })` — no acting headers, no `isActingReady` guard.
- **Intent:** Add `useActingContext()` to `useAdminCalendar`; gate refetch on `isActingReady && enabled`; spread `actingHeaders`; expose `isActingReady` in return value; add `actingContextKey` to dependency array.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported and destructured inside `useAdminCalendar`
  - `[ ]` `refetch` callback guards on `if (!isActingReady || !enabled) return`
  - `[ ]` `fetch()` headers spread `...actingHeaders`
  - `[ ]` `actingContextKey` in `useCallback` dependency array
  - `[ ]` `UseAdminCalendarResult` interface gains `isActingReady: boolean`
  - `[ ]` `isActingReady` included in hook return object
  - `[ ]` `components/admin/admin-calendar-view.tsx` reads `isActingReady` from the hook and shows `AdminEmptyState` when false
  - `[ ]` TypeScript build passes 0 errors
- **Key files:** `hooks/use-admin-calendar.ts`, `components/admin/admin-calendar-view.tsx`

---

### R9 — Fix acting context headers: Analytics page

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/analytics/page.tsx`
- **Problem:** No `useActingContext`. `buildNoStoreInit()` at line 154 has no acting headers. `fetchStats` fires on mount with no guard. Direct `supabase` realtime subscriptions at lines 257–281 are fine (they observe global INSERT events, not org-scoped queries — this is acceptable for a live feed).
- **Intent:** Add `useActingContext()`, guard `fetchStats` on `isActingReady`, spread `actingHeaders` into all four fetch calls, add `actingContextKey` to `fetchStats` `useCallback` deps, show `AdminEmptyState` when not ready. Keep the realtime subscription as-is (it is a global monitor feed, not an org-scoped query — removing it would reduce capability, not fix a bug).
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported and destructured
  - `[ ]` `buildNoStoreInit` updated to accept `actingHeaders` and spread them
  - `[ ]` `fetchStats` guards on `if (!isActingReady) return`
  - `[ ]` All four `fetch()` calls in `fetchStats` use `buildNoStoreInit(actingHeaders)`
  - `[ ]` `actingContextKey` in `fetchStats` `useCallback` dependency array
  - `[ ]` When `!isActingReady`, renders `AdminEmptyState` with `Building2` icon
  - `[ ]` Realtime subscription kept as-is (no org filter — global monitor)
  - `[ ]` Direct `supabase` import kept for realtime only (acceptable: realtime is not an org-scoped query)
  - `[ ]` TypeScript build passes 0 errors
- **Key files:** `app/admin/dashboard/analytics/page.tsx`

---

### R10 — Fix acting context headers: Logistics page

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/logistics/logistics-page-client.tsx`
- **Problem:** Uses `useMultiAccount()` → `hiringEntityFromAccount()` to derive `actingOrgId` (line 144–145). Does NOT use `useActingContext()`. Sub-hooks (`useLogistics`, `useLodging`, `useTravelCoordination`, etc.) fire immediately without acting headers. Before org is selected (`currentAccount` is null), `actingOrgId` is null and sub-hooks return empty but no empty state is shown — the page renders a full shell with 0-data panels.
- **Intent:** Add `useActingContext()` to the page. Replace the `useMultiAccount()` → `hiringEntityFromAccount()` derived `actingOrgId` with `actingContextKey` from `useActingContext` (they can coexist). Guard the main page render: when `!isActingReady`, return `AdminEmptyState` before mounting any sub-components that trigger fetches.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported and destructured
  - `[ ]` `isActingReady` guard: when false, return `AdminEmptyState` before the scope bar and tab panels
  - `[ ]` `useMultiAccount` import and `hiringEntityFromAccount` kept intact (still needed for scope URL stamping)
  - `[ ]` TypeScript build passes 0 errors
- **Key files:** `app/admin/dashboard/logistics/logistics-page-client.tsx`

---

### R11 — Fix acting context headers: RBAC page

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/rbac/page.tsx`
- **Problem:** `useRolesAndPermissions()` and `useRoleManagement()` are called at the top of the component with no acting context guard. The hooks fetch `/api/admin/rbac/roles` without acting headers. Before org is selected the route 409s, and `loading` stays true forever.
- **Intent:** Add `useActingContext()`. Render `AdminEmptyState` with `Shield` icon when `!isActingReady`. The `useRolesAndPermissions()` hooks stay at top-level but their fetches are blocked by the early return (React renders the empty state, not the tabs).
- **Note:** The RBAC hooks call fetch inside their own `useEffect`s, so they will still run even with the early return. The correct guard is to wrap the hook calls inside a conditional mount. The simplest approach is a conditional component — render a `<RBACContent />` component only when `isActingReady`.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported and destructured
  - `[ ]` A wrapper `RBACContent` component (or equivalent) conditionally mounts the hooks-heavy content only when `isActingReady`
  - `[ ]` When `!isActingReady`, renders `AdminEmptyState` with `Shield` icon, `"No organization selected"` title
  - `[ ]` No breaking changes to existing tab structure inside `RBACContent`
  - `[ ]` TypeScript build passes 0 errors
- **Key files:** `app/admin/dashboard/rbac/page.tsx`

---

### R12 — Fix acting context headers: Contracts page + vendor panels

- **Status:** `[ ] pending`
- **Files:** `app/admin/dashboard/contracts/page.tsx`, `components/admin/vendors/vendor-master-panel.tsx`, `components/admin/vendors/contract-workspace-panel.tsx`, `components/admin/vendors/obligations-panel.tsx`
- **Problem:** All three panels call `useActingContext()` to trigger re-load on account switch, BUT none pass `actingHeaders` to their `fetch()` calls. The API routes use `withAdminCapability` which calls `resolveActingAdminContext` — without explicit headers the route falls back to the session cookie. This works for single-account users but silently queries the wrong org for multi-account users.
- **Intent:** Add `actingHeaders` spread to each panel's fetch call. Add page-level guard in `contracts/page.tsx`.
- **Acceptance Criteria:**
  - `[ ]` `VendorMasterPanel`: destructures `actingHeaders` from `useActingContext()`; spreads `...actingHeaders` in `fetch('/api/admin/vendors?...')` headers
  - `[ ]` `ContractWorkspacePanel`: same — `actingHeaders` spread in fetch
  - `[ ]` `ObligationsPanel`: same — `actingHeaders` spread in fetch
  - `[ ]` `contracts/page.tsx`: adds `useActingContext()` guard, renders `AdminEmptyState` when `!isActingReady`
  - `[ ]` TypeScript build passes 0 errors
- **Key files:** All four files listed

---

### R13 — Upgrade AdminActingContextBar: account-switch hint

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/components/admin-acting-context-bar.tsx`
- **Problem:** When no org is selected, the bar shows `"No organization selected"` but offers no guidance on *how* to select one.
- **Intent:** Add a small explanatory paragraph below the label when `!actingAccount`.
- **Acceptance Criteria:**
  - `[ ]` When `!actingAccount`, renders `<p className="text-xs text-slate-400 mt-1">Use the account switcher in the top navigation to select an organization.</p>` below the organization label
  - `[ ]` Existing layout, CTA buttons, and badge unchanged when account IS selected
  - `[ ]` TypeScript build passes 0 errors
- **Key files:** `app/admin/dashboard/components/admin-acting-context-bar.tsx`

---

### R14 — Final verification + ledger sync

- **Status:** `[ ] pending`
- **Intent:** Full TypeScript build, spot-check all fixed surfaces, update all plan statuses, append log entries.
- **Acceptance Criteria:**
  - `[ ]` `NODE_OPTIONS='--max-old-space-size=8192' tsc --noEmit` passes 0 errors
  - `[ ]` Events, calendar, analytics, logistics, RBAC, contracts pages all show `AdminEmptyState` when no org is selected
  - `[ ]` Vendor master panel returns real vendors after R1 fix (or `unavailable` if no vendors exist)
  - `[ ]` Stats route travel/lodging/rental metrics no longer fail silently (zero values are real zeros, not query errors)
  - `[ ]` Top performers tab returns real data after R3 fix
  - `[ ]` All plan statuses `[x] done`
  - `[ ]` Append summary to `.agents/admin-feature-spec-builder/TASK_LOG.md`

---

## 4. SQL Summary

Two SQL blocks need to be applied manually by the user in Supabase Studio → SQL Editor (never auto-applied):

| Block | Tables Created/Altered | Task |
|---|---|---|
| Block A | `contracts`, `contract_obligations` (CREATE TABLE IF NOT EXISTS) | R4 |
| Block B | `travel_groups.org_id`, `lodging_bookings.org_id` (ADD COLUMN IF NOT EXISTS) | R6 |

Both blocks are idempotent. Applying them twice has no effect.

---

## 5. Files Changed

| File | Change | Task |
|---|---|---|
| `app/api/admin/vendors/route.ts` | `org_id` → `organization_id` in query + normalization | R1 |
| `app/api/admin/dashboard/stats/route.ts` | Fix travel_groups/lodging_bookings scoping; rental `total_amount` → `subtotal` | R2 |
| `app/api/admin/analytics/top-performers/route.ts` | `event_participants` → `event_attendance` | R3 |
| `app/api/admin/contracts/obligations/route.ts` | Confirm/patch table name to `contract_obligations` | R5 |
| `app/admin/dashboard/events/events-page-client.tsx` | Add `useActingContext` guard + `actingHeaders` | R7 |
| `hooks/use-admin-calendar.ts` | Add `useActingContext` guard + `actingHeaders`, expose `isActingReady` | R8 |
| `components/admin/admin-calendar-view.tsx` | Add no-org empty state using hook's `isActingReady` | R8 |
| `app/admin/dashboard/analytics/page.tsx` | Add `useActingContext` guard + `actingHeaders` | R9 |
| `app/admin/dashboard/logistics/logistics-page-client.tsx` | Add `useActingContext` guard + page-level empty state | R10 |
| `app/admin/dashboard/rbac/page.tsx` | Add `useActingContext` guard + conditional RBACContent mount | R11 |
| `app/admin/dashboard/contracts/page.tsx` | Add `useActingContext` guard | R12 |
| `components/admin/vendors/vendor-master-panel.tsx` | Add `actingHeaders` spread to fetch | R12 |
| `components/admin/vendors/contract-workspace-panel.tsx` | Add `actingHeaders` spread to fetch | R12 |
| `components/admin/vendors/obligations-panel.tsx` | Add `actingHeaders` spread to fetch | R12 |
| `app/admin/dashboard/components/admin-acting-context-bar.tsx` | Add account-switch hint when no org | R13 |

---

## 6. Files NOT Changed

| File | Reason |
|---|---|
| `app/admin/dashboard/tours/tours-page-client.tsx` | ✅ Already has guard — reference implementation |
| `app/admin/dashboard/finances/page.tsx` | ✅ Already has guard + `actingHeaders` |
| `app/admin/dashboard/ticketing/page.tsx` | ✅ Already has guard + `actingHeaders` |
| `app/admin/dashboard/features/page.tsx` | ✅ Already has guard |
| `app/admin/dashboard/hiring/page.tsx` | ✅ Server-side `resolveAdminWorkforceEmployer` guard |
| `app/admin/dashboard/organization/page.tsx` | ✅ Resolves account via `resolveOrganizationDashboardAccount` |
| `hooks/use-admin-capabilities.ts` | ✅ Already guards on `isActingReady` |
| `lib/auth/admin-context.ts` | ✅ Acting context resolution is correct — no change |
| `app/api/admin/effective-capabilities/route.ts` | ✅ Correct — this is the 409-returning route; behavior is intentional |

---

## 7. Completion Checklist

### Schema Fixes (API Routes + SQL)
- `[ ]` R1 — Vendors `org_id` → `organization_id`
- `[ ]` R2 — Stats route travel/lodging/rental column fixes
- `[ ]` R3 — Top performers `event_participants` → `event_attendance`
- `[ ]` R4 — SQL for `contracts` + `contract_obligations` tables (user applies manually)
- `[ ]` R5 — Contracts obligations route table name
- `[ ]` R6 — SQL for `travel_groups.org_id` + `lodging_bookings.org_id` (user applies manually)

### Acting Context Guards (Client Pages)
- `[ ]` R7 — Events page guard
- `[ ]` R8 — Calendar hook guard + headers
- `[ ]` R9 — Analytics page guard
- `[ ]` R10 — Logistics page guard
- `[ ]` R11 — RBAC page guard
- `[ ]` R12 — Contracts page + vendor panels guard + `actingHeaders`
- `[ ]` R13 — Context bar account-switch hint

### Verification
- `[ ]` R14 — Final build + ledger sync
