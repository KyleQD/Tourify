# Data model: Supabase vs Prisma

## Source of truth (production direction)

| Concern | Source of truth |
|--------|-------------------|
| **End-user identity, sessions, email verification** | **Supabase Auth** (`auth.users`) |
| **Profiles, feeds, messaging, RLS-protected app data** | **Supabase Postgres** (`public.*`) via Supabase client and server helpers |
| **Legacy Prisma `User` / NextAuth-style tables** | **Legacy / secondary** — do not create new signups through Prisma-only paths |

New accounts must be created with **`supabase.auth.signUp`** (see login portal and deprecated [`app/api/auth/signup`](../app/api/auth/signup/route.ts) returning 410).

## Prisma (`DATABASE_URL`)

[`prisma/schema.prisma`](../prisma/schema.prisma) still defines a `User` model and uses `DATABASE_URL`. Treat Prisma as:

- **Read/legacy** where it remains in code paths, or
- **Migration target**: gradually move callers to Supabase queries and reduce Prisma surface area.

Avoid maintaining **two parallel user registries** (Prisma `User` rows without `auth.users`) for new features.

## Operational checklist

1. Production Vercel env includes **`DATABASE_URL`** only if Prisma-backed routes run in production.
2. Prefer **Supabase pooler** connection strings for high concurrency serverless (see [postgres-pooler-rls-audit.md](./postgres-pooler-rls-audit.md)).
3. Schema changes for app tables go through **`supabase/migrations/`** and [Supabase migrations CI](./supabase-migrations-ci.md).
