# Personas vs roles

## Public personas (have public brand pages)

| Persona | Public URL | Notes |
|---------|------------|--------|
| **General** | `/profile/{username}` | The human identity (email login). Friends are general↔general. |
| **Artist** | `/artist/{slug}` | Personal creative identity / EPK. Independent of any band. |
| **Venue** | `/venues/{slug}` | Place brand. |
| **Organization** | `/organization/{slug}` | Collective brand. Subtype changes modules (band, label, promoter, agency, production, rental, generic). |

## Organization subtypes

- **Band** — rosters linked Artist personas; artists keep their own pages.
- **Label** — roster of signed artists.
- **Promoter** — public events / tours calendar.
- **Agency / production / rental** — services + open jobs.
- **Generic** — about, posts, jobs.

Follow targets the **organization account** (`account_follows`), not the owner’s personal user graph.

## Roles (not public personas)

| Role | Identity | Access |
|------|----------|--------|
| **Tour manager** | Remains **General** | Authors tours/events, or receives Admin / Work Mode grants on an org, venue, or band via `org_members` + `account_relationships`. No dedicated public type. |
| **Org admin / owner** | General user with grants | Manages roster, events, invites for that organization. |

Signup values like `tour_manager` normalize to `general` (`lib/auth/normalize-account-type.ts`).

## Staffing persona matrix

This is the local-readiness matrix for staffing and hiring. It describes server-side authorization and Supabase RLS; it does not create new public account types. The active migration chain is the authority when this document and an application fallback differ.

| Persona | Scope | Allowed local-ready actions | Explicitly denied | Enforcement evidence |
|---|---|---|---|---|
| Organization owner / admin | Their organization only | Manage hiring, invite and assign staff, manage roster and scheduling; owner/admin may reveal hiring PII | Other organizations; unauthenticated access | `can_manage_hiring`; `can_view_hiring_pii`; `org_members` owner/admin checks in `20260823210000_harden_hiring_onboarding_pii.sql` |
| Operations manager | Granted organization or venue only | Operate events, schedule and manage roster when granted `manage_team` / `scheduling.manage` | Hiring PII and finance authority without a separate grant | `has_perm`; `legacy_venue_workforce_manager`; `20260823072000_shift_rls_hardening.sql` |
| Workforce manager | Granted organization or venue only | Roster, hiring, invitations, work-mode assignment, and schedules when granted the relevant workforce permission | Hiring PII unless owner/admin; cross-entity changes | `can_manage_hiring`; `hiring.manage`, `roster.manage`, `scheduling.manage` in `20260823073000_workforce_permission_granularity.sql` |
| Finance manager | Granted venue or organization only | Finance reads and approved finance actions granted by role | Roster management, hiring, scheduling, and HR-sensitive data by default | `Venue Finance Manager` permission wiring in `20260823050000_venue_rbac_adoption.sql`; granular role catalog |
| Assigned worker | Own active or confirmed assignment | Read own assigned shifts; update own assignment response; worker actions only after their gated migration is applied | Other workers' assignments; roster management; hiring and payroll/HR data | `legacy_assignment_belongs_to_caller`; worker-only update policy in `20260823072000_shift_rls_hardening.sql` |
| Artist / venue staff without a workforce grant | Their own public identity and any separately granted entity role | Only the exact entity permissions granted | Implied staffing access from public persona or account type | `has_entity_permission` and entity-scoped RLS |
| Revoked or ended member | No active entity scope | Nothing through the former entity relationship | Reads and writes for the former organization or venue | Membership/status predicates require active/confirmed assignments |
| Cross-organization member | Each entity independently | Actions in the currently authorized entity only | Data or mutations in another entity merely because another membership exists | Entity id is part of RPC and RLS predicates |
| Unauthenticated visitor | Public surfaces only | Public profiles and public search | Staffing, hiring, shifts, invitations, PII, and operational routes | Supabase RLS plus route authentication guards |

**Local verification:** run the persona/RLS tests after the WS-1.1 migrations are applied to the intended Supabase target. In particular, prove an unrelated authenticated user receives no shift rows, an assigned worker cannot reassign or delete, a workforce manager cannot reveal PII without owner/admin authority, and a revoked member loses access.

## Naming

- Prefer **Organization** for the public brand / persona.
- Prefer **Admin** for the ops dashboard (`/admin/dashboard`) and Work Mode surface.
- Avoid calling the public brand “Admin” or “Organizer” in UI copy.

## Preservation constraints

These behaviors must stay intact while org personas integrate:

| Surface | Constraint |
|---------|------------|
| **Legacy `admin` accounts** | Gate with `isOrganizationType()` (accepts `admin` and `organization`). Never `=== 'organization'` only. |
| **General profiles** | `/profile/{username}` stays the human page even if the user owns orgs. |
| **Friend graph** | User-scoped `follows` / `follow_requests` unchanged. Personas use `account_follows`. |
| **Artist / Venue pages** | `/artist/{slug}` and `/venues/{slug}` ownership and routing unchanged. |
| **Event/tour RBAC roles** | Member role string `admin` is not an account type — do not rewrite. |
| **Session storage** | Normalize at comparison time only; do not rewrite stored `active_account_type` without migration. |

**Type strategy:** UI/API branches → `isOrganizationType`; display/routing → `normalizeAccountType` (maps `admin` / `organizer` / `business` → `organization`); DB search filters keep listing legacy aliases alongside `organization`.

## Demo end-to-end checklist

Manual verification across personas (run on Demo after deploy/migration):

1. Legacy `admin` session still opens Admin with live home data
2. New `organization` account: Admin home + public `/organization/{slug}` + Follow works
3. General `/profile/{owner}` still shows personal identity (not org rewrite)
4. Friend request general↔general still works; Follow org uses `account_follows`
5. Invite tour manager by email → accept → switcher shows org → Admin
6. Invite artist → accept → band roster + artist “Member of”
7. Post as org → org public posts + following feed (no personal bleed)
8. Post job as org → jobs module on public org page
9. Promoter events/tours modules show ops-scoped public items
10. Artist and venue public pages unchanged smoke check
11. `/orgs/create` redirects to `/create?type=organization`
12. Settings for org account load `organizer_accounts` (name/slug/subtype) + public link
