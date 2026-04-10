# Mobile Feature Parity and Portability Matrix

Audit date: 2026-04-09

## Journey parity matrix

| Journey | Web implementation surface | Mobile implementation surface | Parity | Gap type | Action |
|---|---|---|---|---|---|
| Authentication | Next + Supabase web session patterns across `app/*` and `lib/supabase/server.ts` | Expo auth provider in `apps/mobile/lib/auth/auth-provider.tsx` and secure storage client in `apps/mobile/lib/supabase/client.ts` | partial | contract hardening | Add a server-verified session introspection endpoint and mobile auth contract tests |
| Discover + social graph | `app/api/discover/route.ts`, `app/api/follow/route.ts`, plus web discovery pages | `apps/mobile/app/(tabs)/discover.tsx`, `apps/mobile/lib/api/discover.ts`, `apps/mobile/lib/api/follow.ts` | strong | response consistency | Normalize error and response envelopes and add endpoint version labels |
| Notifications | `app/api/notifications/route.ts` and notification service layer | `apps/mobile/app/(tabs)/notifications.tsx`, `apps/mobile/lib/api/notifications.ts`, realtime in `apps/mobile/hooks/use-realtime-notifications.ts` | strong | auth model drift | Remove auth helper drift (service-role vs user-scoped auth path) |
| Venue bookings operations | Venue workflows across server actions under `app/venue/actions/*` and route handlers | `apps/mobile/app/(tabs)/bookings.tsx` uses direct table reads/writes via Supabase client | weak | missing API boundary | Add dedicated booking operations API for list/approve/reject with explicit authorization |
| Payments and checkout | `app/api/payment/route.ts` + web callback pages | Helper exists (`apps/mobile/lib/api/payments.ts`) but not wired into tab UI | weak | flow not connected | Implement checkout entry points in mobile UI and payment status recovery screens |
| Creator profile capabilities | Web profile/settings pages + server logic | `apps/mobile/app/(tabs)/profile.tsx` + `/api/settings/capabilities` client | partial | mixed access pattern | Move venue stats/profile reads to API or formally document direct-RLS mobile contract |
| Portfolio uploads | `app/api/portfolio/upload/route.ts` | `apps/mobile/lib/api/uploads.ts` exists but unused and payload mismatch | weak | payload mismatch | Align request payload (`kind`, `tos`) and wire upload UX into profile flow |
| Staffing/admin workflows | Actions and APIs across `app/actions/staffing/*`, `app/api/admin/*` | No dedicated mobile UI | none | not implemented | Explicitly mark out of scope for v1 mobile and expose reviewer-safe APIs later |

## Portability matrix (what can be shared)

| Code area | Current portability | Why | Recommendation |
|---|---|---|---|
| Pure domain logic in `lib/hiring/*` and similar TS-only modules | high | No React/Next runtime dependency | Promote to shared package boundary for web + mobile |
| `lib/services/*` modules that import Next/browser auth helpers | medium | Often coupled to `@supabase/auth-helpers-nextjs` or web assumptions | Split into transport-agnostic core + adapter layers |
| App Router pages and server components in `app/**` | low | Next-specific server rendering and routing | Keep web-only, consume APIs from mobile instead |
| Server actions in `app/**/_actions` and `app/**/actions` | low | Next server-action runtime and cookie sessions | Mirror required operations in route handlers/RPC for mobile |
| Mobile `apps/mobile/lib/api/*` wrappers | high | Clear HTTP boundary and bearer token model | Expand as the canonical mobile integration layer |
| Form validation logic colocated with web forms | medium | Some schemas are shareable, others mixed with UI | Extract shared Zod schemas into portable modules |

## Server-action-only capability gaps (mobile impact)

These capabilities currently rely on server actions and should not be assumed mobile-available without equivalent API contracts:

- Events operations: `app/events/_actions/*`
- Forums write flows: `app/forums/_actions/*`
- Organization management: `app/orgs/_actions/org-actions.ts`
- Venue operational flows: `app/venue/actions/*`
- Artist event operations: `app/artist/events/actions/*`
- Staffing creation and management: `app/actions/staffing/create-job-posting.ts`, `app/lib/actions/staff.actions.ts`

## Recommended mobile v1 scope boundary

In-scope now:
- auth, discover, follow, notifications, creator capabilities, payment checkout completion

Defer to v2 unless explicitly required:
- staffing/admin workflows, deep venue ops, forums/thread authoring parity, advanced event management
