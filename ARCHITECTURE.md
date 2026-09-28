# Tourify architecture

Tourify is a Next.js 15 web platform with an Expo mobile application, Supabase-backed data and authentication, and music-industry domain surfaces.

## Runtime shape

- `app/`: App Router pages, layouts, actions, and API handlers.
- `components/`, `hooks/`, `contexts/`: shared web UI and client behavior.
- `lib/`: services, authorization, contracts, Supabase clients, and integrations.
- `apps/mobile/`: Expo Router mobile client and adapters.
- `supabase/migrations/`: authoritative schema, RLS, functions, triggers, and grants.
- `packages/api-contracts/`: shared payload contracts.
- `scripts/`: CI, workers, QA, migration, release, and agent utilities.

## Request and data flow

```text
Web or mobile client
  -> middleware and route authentication
  -> page, action, or API route
  -> domain service
  -> Supabase Auth, Postgres/RLS, Storage, or Realtime
  -> optional external provider
```

`middleware.ts` performs coarse session gating. Routes and services still enforce resource and tenant authorization. RLS is defense in depth and part of the application contract.

## Sources of truth

| Concern | Source |
| --- | --- |
| Database structure and RLS | `supabase/migrations/` |
| Generated database client types | `lib/database.types.ts` |
| Web routes and handlers | `app/` |
| Mobile routes | `apps/mobile/app/` |
| Runtime configuration | `package.json`, `next.config.ts`, `vercel.json` |
| Launch backlog | `docs/DEVELOPMENT_BACKLOG.md` |
| Task workflow | `docs/DEVELOPMENT_WORKFLOW.md` |
| Bounded engineering memory | `docs/engineering/INDEX.md` |

Generated maps are replaceable SHA-stamped indexes. Existing architecture and feature documents remain incorporated through the engineering index.
