# Postgres: pooler, connections, RLS (audit checklist)

Use this for periodic reviews before scaling traffic.

## Connection pooling (Vercel + Supabase)

- [ ] **`DATABASE_URL` / Prisma** uses a **pooled** URI when running on serverless (Supabase **Transaction** or **Session** pooler port), not the direct `5432` string, unless you have very low concurrency.
- [ ] **Supabase JS** does not open raw Postgres per request for normal queries (PostgREST); focus pooling on **Prisma**, **raw `pg`**, or **long-lived workers**.
- [ ] No code path creates a **new** `PrismaClient` or `Pool` per API invocation (singleton pattern).

## RLS

- [ ] Run **Supabase Database → Advisors** (or SQL linter) after material RLS changes.
- [ ] Hot tables (`profiles`, feeds, `messages`, etc.) have **indexes** matching common `WHERE` + `ORDER BY` patterns used under RLS.
- [ ] Policies avoid calling **volatile** or expensive functions per row when a cheaper predicate exists.

## Reads at scale

- [ ] **Read replicas** (Supabase tier permitting) only after metrics show sustained read CPU / latency on primary.
- [ ] Heavy aggregations moved to **materialized views**, **scheduled jobs**, or **async workers**, not synchronous user requests.

## Backups

- [ ] **PITR** enabled on production; restore drill documented in team runbook.
