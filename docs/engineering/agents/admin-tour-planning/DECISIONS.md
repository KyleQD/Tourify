# Admin Tour Planning decisions

Append durable decisions using:

## ADMTOUR-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision owner: admin
- Decision:
- Evidence:
- Consequences:

Segment-local agents may propose decisions. The parent `admin` agent accepts or rejects decisions that affect more than the assigned bounded task.

## ADMTOUR-001 — An event/tour picker on a `withAdminAuth` route resolves the acting organization inside the handler, and its visible set is the canonical artist roster rather than a second composition of the tour-picker scope

- Date: 2026-09-28
- Status: proposed (parent `admin` owns acceptance; nothing outside this task's working set depends on it)
- Task: ADMIN-024
- Decision owner: admin
- Decision: Two things, both chosen to avoid a second rule for a concept that already has one.
  (1) **The organization.** `withAdminAuth` hands the handler only `{ user, supabase }`, so a route on that wrapper that needs an organization calls the real `resolveActingAdminContext(request, { user, supabase })` in the body and returns its `NextResponse` verbatim. The wrapper is left as `withAdminAuth`; nothing is narrowed by an extra collaborator rule. This reuses ADMIN-027's precedent rather than re-deciding it.
  (2) **The visible set.** It is exactly `resolveOrgArtistRosterScope(supabase, admin).artistProfileIds`, pushed into the reads as `.in('id', ...)` in 100-id chunks. ADMIN-015's `resolveOrganizationArtistUserIds` composes a *second* leg — the organization's own `tour_artists` rows via `tours.org_id` — for a picker whose ids are `profiles.id`. That leg is **not** copied here, because this route's ids are `artist_profiles.id` and copying the composition into a second file is precisely how two subtly different rules for "which artists does this organization own" get created. ADMIN-015's helper is private to its own route, so reuse was not available in the strict sense; reuse of the *rule* was, through `resolveOrgArtistRosterScope`.
- Evidence: `app/api/tours/planner/artists/route.ts:96-101` is the only call site — `const roster = await resolveOrgArtistRosterScope(supabase, admin)` — and the test asserts it both structurally (the import from `@/lib/admin/artist-roster-access` is present, no `.from('organization_artist_members')` and no `.eq('ops_org_id'` appear in the file) and behaviourally (the recorded `organizer_accounts` read carries `eq('ops_org_id', ORG_A)` and the recorded `organization_artist_members` read carries `in('organizer_account_id', [PROFILE_A])` and `neq('status','removed')`). Removing the six `.in('id', chunk)` predicates turns 10 of 19 tests red and returns org B's `Nova Cipher` and the unlinked `Nova Outsider` to an org A admin; restoring the base-SHA source turns 17 of 19 red and additionally returns four profile emails verbatim, including `cipher@orgb.test` and `outsider@platform.test`.
- Consequences: The generalizable form is **an admin picker on a legacy wrapper is still org-bound; the fix is the resolver call, not a wrapper swap.** Narrowing follows the set the helper already defines, and a route with no legitimate second leg does not grow one. Two accepted costs, both stated rather than absorbed: a tour collaborator bound to the acting organization sees that organization's roster (ADMIN-015's directory branch denies collaborators outright, because `requireCollaboratorRequestScope` has no list/search exemption for `/api/admin/tours/artists`; adopting that would be a second scoping rule here, so it is a routed question, not a silent choice), and the picker can no longer discover an artist the organization has not put on its roster. Not adopted deliberately: ADMIN-015's `.eq('role','artist')` on `profiles` — that filter was already present on that route and adding it here would be a narrowing unrelated to the organization boundary.

