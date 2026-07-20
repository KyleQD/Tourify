# Mobile Feature Parity and Portability Matrix

Audit date: 2026-04-09  
Rebaseline: 2026-07-19

## Journey parity matrix

| Journey | Web implementation surface | Mobile implementation surface | Parity | Gap type | Action |
|---|---|---|---|---|---|
| Authentication | Next + Supabase web session patterns across `app/*` and `lib/supabase/server.ts` | Expo auth provider in `apps/mobile/lib/auth/auth-provider.tsx` and secure storage client in `apps/mobile/lib/supabase/client.ts` | partial | contract hardening | Reset-password deep link screen; OAuth/App Links coverage; auth contract tests |
| Home feed | `app/api/feed/posts`, web feed surfaces | `apps/mobile/app/(tabs)/feed.tsx`, `components/dashboard/feed-post-list.tsx`, `lib/api/feed.ts` | strong | performance | expo-image + query cache; keep FlatList pagination |
| Discover + social graph | `app/api/discover/route.ts`, `app/api/follow/route.ts`, plus web discovery pages | Home Discover sub-tab + venue Leads tab; `lib/api/discover.ts`, `lib/api/follow.ts` | strong | response consistency | Normalize error envelopes |
| Music listen/library | Web jukebox + `/api` music routes | `apps/mobile/app/(tabs)/music.tsx`, `providers/music-player-provider.tsx`, `lib/api/music.ts` | strong | no shared queue | Keep mobile player; avoid redundant stream URL fetches |
| Messages / group chats | Web messaging surfaces + APIs | `apps/mobile/app/(tabs)/messages.tsx`, `chat/[id]`, `group-chats/*` | strong | realtime polish | Continue bearer API + list virtualization |
| Connect claim | Web connect + deep links | `apps/mobile/app/connect/index.tsx`, `connect/claim.tsx` | strong | App Links | Keep `tourify://` + `applinks:tourify.app` |
| Events browse / ticketing entry | Events pages + ticketing APIs | `apps/mobile/app/events/*`, checkout stack | partial | payment verify | Server-verify payment status after browser checkout |
| Notifications | `app/api/notifications/route.ts` and notification service layer | Folded into Home → Your Stuff; `lib/api/notifications.ts`, realtime + push registration | strong | push routing | Navigate on notification tap via `data.url` |
| Venue bookings operations | Venue workflows across server actions under `app/venue/actions/*` and route handlers | `apps/mobile/app/(tabs)/bookings.tsx` | weak | missing API boundary | Dedicated booking list/approve/reject API |
| Payments and checkout | `app/api/payment/route.ts` + web callback pages | `apps/mobile/app/checkout/index.tsx` + `lib/api/payments.ts` | partial | verify incomplete | Poll payment/order status; do not mark completed on browser open alone |
| Creator profile capabilities | Web profile/settings pages + server logic | `apps/mobile/app/(tabs)/profile.tsx` + `/api/settings/capabilities` | partial | mixed access pattern | Prefer API for mutating ops; document intentional RLS reads |
| Portfolio uploads | `app/api/portfolio/upload/route.ts` | `apps/mobile/lib/api/uploads.ts` | weak | payload mismatch | Align `kind` + `tos=accepted`; wire into profile/onboarding |
| Staffing/admin workflows | Actions and APIs across `app/actions/staffing/*`, `app/api/admin/*` | No dedicated mobile UI | none | not implemented | Out of scope for v1 |

## Portability matrix (what can be shared)

| Code area | Current portability | Why | Recommendation |
|---|---|---|---|
| Pure domain logic in `lib/hiring/*` and similar TS-only modules | high | No React/Next runtime dependency | Promote to shared package boundary for web + mobile |
| `lib/services/*` modules that import Next/browser auth helpers | medium | Often coupled to `@supabase/auth-helpers-nextjs` or web assumptions | Split into transport-agnostic core + adapter layers |
| App Router pages and server components in `app/**` | low | Next-specific server rendering and routing | Keep web-only, consume APIs from mobile instead |
| Server actions in `app/**/_actions` and `app/**/actions` | low | Next server-action runtime and cookie sessions | Mirror required operations in route handlers/RPC for mobile |
| Mobile `apps/mobile/lib/api/*` wrappers | high | Clear HTTP boundary and bearer token model | Expand as the canonical mobile integration layer |
| `packages/api-contracts` | high | Exercised in mobile CI | Keep as shared contract source |
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
- auth (including reset-password), home feed, discover, follow, music, messages, connect, events entry, notifications (+ push routing), creator capabilities, payment checkout verification, venue booking request ops via API

Defer to v2 unless explicitly required:
- staffing/admin workflows, deep venue ops, forums/thread authoring parity, advanced event management, shared web/mobile jukebox queue
