# Admin Tour Planning state

<!-- generated-agent-state:start -->
## Generated queue summary

- Generated at: 2026-09-28T03:22:19.549Z
- Source: task records and TASK_INDEX.json

- `ADMVIEW-TOUR-001` — blocked/queued_postlaunch; MAINTENANCE-DEBT
<!-- generated-agent-state:end -->

- Last reviewed SHA: `unverified`
- Last reviewed at: 2026-09-27
- Confidence: bootstrap only

## Durable facts

- Reports to `admin`; `admin` is the decision owner for child tasks.
- Mission: Own the Admin-facing integration for tour portfolio, lifecycle, builder, stops, routing, holds, collaboration, publication, tour books, and the tour command center.
- Ownership is limited to the Admin-facing integration layer described by `WORKING_SET.json` and the central segment map.
- Canonical domain services, schema, RLS, shared design-system primitives, QA certification, and release operations remain with their existing top-level owners.

## Current focus

- ADMIN-024 landed (2026-09-28): `GET /api/tours/planner/artists` is bound to the verified acting organization. See "Tour planner artist search" below.

## Tour planner artist search (`app/api/tours/planner/artists`)

- **This is the second admin-facing artist search.** `app/api/admin/tours/artists` was repaired by ADMIN-015; this one was the other half and was left "recorded, not changed" in ADMIN-015's own next-steps. It is now repaired (ADMIN-024). Neither route is in `app/api/admin/**`, so **neither is covered by `check:admin-route-registry` or the ADMIN-016 guard proof** — `scripts/ci/check-admin-route-registry.mjs:27` walks `app/api/admin` only. A future repair of either will move no pinned figure, and that is a fact to state rather than assume a registry change is needed.
- **The wrapper supplies no organization.** `withAdminAuth` passes `{ user, supabase }`; `withAdminCapability` is the one that passes `admin`. The route now calls `resolveActingAdminContext(request, { user, supabase })` in the body and returns the denial verbatim. Same pattern as ADMIN-027 on `app/api/admin/communications`. Calling the resolver inside a `withAdminAuth` body does **not** reclassify the method in the ADMIN-016 analyzer (`guardClassFor` returns `read_only_compat` at the `withAdminAuth` branch, before the `AUTH_PRIMITIVES` branch) — moot here, since this route is not in the registry.
- **One rule for "which artists does this organization own":** `resolveOrgArtistRosterScope(supabase, admin)` in `lib/admin/artist-roster-access.ts`. It returns `artistProfileIds` — `artist_profiles.id` values — which map onto this route's own ids with no translation. Do not hand-roll the `organizer_accounts.ops_org_id` -> `organization_artist_members` chain in a route; import the helper.
- **Four mounted consumers, none of which read a profile email:** `components/admin/event-parties-panel.tsx`, `components/admin/event-participants-tab.tsx`, `app/admin/dashboard/events/create/page.tsx`, `app/artist/events/create/page.tsx`. They read `id` / `name` / `location`. `app/admin/dashboard/events/create/page.tsx:201` has an `item?.email` fallback in `normalizeSelection`, but that is a **top-level** `email` the route has never returned (it was nested under `contact`), so removing `contact.email` changed nothing for it. This is why `event-parties-panel.tsx` needed no edit.
- **Residual, recorded not absorbed:** a tour collaborator whose acting context is `scope: 'tour_collaborator'` sees the acting organization's full roster, because the route does not narrow further to `admin.allowedTourIds`. ADMIN-015's directory branch denies collaborators outright. Making that call here would be a second scoping rule; it is routed in `QUESTIONS`/the task record, not decided here.
- **Pre-existing, untouched:** `cleanSearch` strips `,` and `()` but not `%`, `.` or `"` before interpolating into a PostgREST `or=(...)` string. That is a filter-syntax robustness bug, not an organization-boundary defect, and it was left byte-identical rather than fixed in a security repair (DOMAIN-037).


## Known risks

- Prefixes in the default working set guide discovery; a task lease must still name exact files.
- Cross-segment changes can collide unless the parent Admin agent records shared ownership and handoffs.

