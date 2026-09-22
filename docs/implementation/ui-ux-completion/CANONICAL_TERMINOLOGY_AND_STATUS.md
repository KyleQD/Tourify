# Canonical Terminology and Status Ownership

This register applies to new UI and compatibility adapters. It does not rewrite
persisted values destructively.

## Product language

| Term | Canonical meaning | Do not silently substitute |
| --- | --- | --- |
| Account | The user-switchable General, Artist, Venue, or Admin context | Organization |
| Organization | The entity managed inside an Admin account | Admin |
| Team | People collaborating within an account or scoped object | Staff |
| Staff member | A person present in an employer roster | User account |
| Worker | A General user acting through an assignment-scoped Work Mode grant | Staff account |
| Job | A published opportunity that accepts applications | Shift |
| Application | A person's response to a job | Assignment |
| Assignment | The worker's authorized employer/event/tour context | Account |
| Shift | A scheduled work window linked to a staff member/assignment | Job |
| Booking | An inquiry and commercial agreement between talent and venue/organizer | Event |
| Event | A scheduled live-production object | Tour stop unless linked |
| Tour | An ordered collection of events/stops | Organization |
| Advance | Operational information requested, reviewed, and approved before show day | Day sheet |
| Day sheet | A versioned published worker-facing show-day document | Advance |

## Account navigation ownership

| Context | Canonical shell |
| --- | --- |
| General | Root application shell and General workspace navigation |
| Artist | Artist workspace shell with compact global account utilities |
| Venue | `VenueOperationsShell` |
| Admin | Admin dashboard shell and optimized sidebar |
| Work Mode | `/work/[view]`, assignment-scoped under the General account |

## Canonical lifecycle mappings

### Employment assignment

`invited → confirmed → active → completed`

`invited|confirmed|active → cancelled`

The canonical stored lifecycle is `EmploymentAssignmentStatus`. Roster, shift,
tour-team, and UI labels map through `lib/admin/workforce-assignment-status.ts`;
they do not introduce a second authoritative lifecycle.

### Request and panel state

Every panel uses the shared meanings below:

| State | Required behavior |
| --- | --- |
| loading | Geometry-preserving skeleton |
| refreshing | Keep current content and show freshness |
| empty | Explain value and provide a permission-aware next action |
| partial | Render valid sources and identify unavailable sources |
| error | Plain-language category, retry, and support reference |
| offline | Preserve drafts/last-known data and explain retry policy |
| forbidden | Explain required access without leaking protected data |
| conflict | Preserve the attempted change and offer reload/resolve |
| stale | Show last update and guard dangerous mutations |
| pending | Prevent duplicate submission |
| success | State what changed, who was notified, and the next action |
| unavailable | Truthfully identify an unconnected capability; never show mock data |

### Cross-domain ownership

- Hiring owns job and application status.
- Onboarding owns candidate checklist/compliance status.
- `employment_assignments` owns Work Mode authorization status.
- Scheduling owns shift timing; it maps to, but does not replace, assignment status.
- Publication snapshots own advance/day-sheet/map version and publish state.
- Finance and ticketing retain separate settlement/reconciliation lifecycles.

Compatibility labels may remain while consumers migrate, but the canonical owner
above wins when values disagree.
