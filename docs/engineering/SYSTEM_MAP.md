# System map

Use generated maps for exhaustive indexes. This file describes durable boundaries.

| Area | Primary locations | Notes |
| --- | --- | --- |
| Web shell and routing | app/, middleware.ts, next.config.ts | Next.js App Router; middleware is a coarse gate |
| API surface | app/api/, lib/api/, packages/api-contracts/ | Route-level auth and validation |
| Domain services | lib/services/ and domain folders under lib/ | Prefer services for cross-route behavior |
| Shared UI | components/, hooks/, contexts/ | Use domain manifests to bound callers |
| Admin operations | app/admin/, components/admin/, lib/admin/ | Audit and route-registry checks exist |
| Artist | app/artist/, components/artist*/, lib/artist/ | Artist account and profile surfaces |
| Venue | app/venue/, app/venues/, components/venue*/, lib/venue/ | Account and public profiles |
| Organization and tours | app/organization/, app/orgs/, app/tours/ | Tenant-scoped collaboration |
| Work and hiring | app/work/, app/jobs/, app/staffing/, lib/hiring/ | Jobs, roster, shifts, onboarding |
| Music | app/music/, components/music/, music workers | Media, rights, royalties, outboxes |
| Ticketing | app/tickets/, app/api/ticketing/, lib/ticketing/ | Orders, wallet, transfers, door |
| Social and discovery | news, discover, friends, groups, search | Feed, relationships, messaging |
| Data platform | supabase/migrations/, lib/supabase/ | Migrations and RLS are authoritative |
| Mobile | apps/mobile/ | Expo Router client against shared APIs |
| Delivery | .github/workflows/, vercel.json, docker/ | CI, deploy, cron, observability |

## Cross-cutting flows

- Identity: Supabase session -> middleware -> route or service authorization -> RLS.
- Tenant context: membership -> acting organization, venue, or artist -> scoped query or RPC.
- Writes: validated input -> authorized boundary -> transaction or RPC -> audit, outbox, or notification.
- Mobile: Expo route -> mobile API adapter -> shared server contract and data policy.

Generated detail lives in `docs/engineering/generated/`.
