---
description: >
  Phase 0 addendum for rebuilding Tourify staff hiring onboarding into a universal,
  real-data module shared by Venue, Organization, and Artist hiring profiles.
globs: ["app/**", "components/**", "lib/**", "types/**", "services/**", "supabase/**"]
alwaysApply: true
---

# Tourify Universal Hiring Onboarding — Phase 0 Addendum

## Universal employer scope

Every hiring mutation, dashboard query, onboarding template lookup, onboarding token lookup, candidate update, roster write, and Work Mode assignment must resolve a `HiringEntity` first.

Use:

```ts
interface HiringEntity {
  entityType: "venue" | "organization" | "artist"
  entityId: string
  displayName: string
  scope?: {
    eventId?: string
    tourId?: string
    venueId?: string
  }
}
```

Do not introduce new venue-only APIs or components. Legacy `venue_id` support is allowed only as a migration alias.

## No mock data in production components

No production component may ship with hardcoded fake staff, fake AI insights, fake activity, fake candidates, fake templates, fake dashboard stats, or local-only staffing data.

Empty states must represent real empty Supabase query results.

Demo data may only exist in explicit test fixtures, Storybook stories, or files with `.mock.ts` / `.fixture.ts` naming.

## Onboarding boundary

Platform onboarding and staff hiring onboarding are separate systems:

- Platform onboarding creates identity/persona accounts.
- Staff hiring onboarding turns an approved applicant or invitee into `staff_members` + `employment_assignments`.

Do not create duplicate users or personas during staff onboarding unless the invite/signup path explicitly requires account creation.

## TypeScript rules

- Prefer `interface` for object shapes.
- Use union literals or readonly maps instead of enums.
- Use named exports.
- Use the `function` keyword for pure functions.
- Use RORO arguments for service and auth helpers.
- Validate API and server action inputs with Zod.
- Model expected errors as return values.
