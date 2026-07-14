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
