# Supabase migrations via GitHub Actions

Workflow: [`.github/workflows/supabase-migrations-production.yml`](../.github/workflows/supabase-migrations-production.yml).

## Required GitHub Actions secrets

Add these under **Repository → Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
|--------|------------------|
| `SUPABASE_ACCESS_TOKEN` | [Supabase Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens) (not the anon JWT). |
| `SUPABASE_PROJECT_ID` | Project ref from the URL: `https://supabase.com/dashboard/project/<ref>` |
| `SUPABASE_DB_PASSWORD` | **Project Settings → Database → Database password** (reset if unknown; not an API key). |

## Environment protection (recommended)

1. **Settings → Environments → `production`** (create if missing).
2. Enable **Required reviewers** so `db push` does not run without approval.
3. Ensure the workflow job `environment: production` matches that name.

## When it runs

- **Manual:** Actions → **Supabase migrations (production)** → **Run workflow**.
- **Automatic:** Push to `main` that changes files under `supabase/migrations/` (or this workflow file).

## Ordering with Vercel

Apply **backward-compatible** migrations before or with app deploys that depend on new columns. If a migration is breaking, use an expand/contract pattern across two releases.

## Related

- [Data model: Supabase vs Prisma](./data-model-supabase-prisma.md)
- [Postgres pooler + RLS audit](./postgres-pooler-rls-audit.md)
- [Load testing](./load-testing.md)
- [Sentry observability](./observability-sentry.md)

## References

- [Supabase: Managing environments](https://supabase.com/docs/guides/cli/managing-environments)
- [Supabase CLI `db push`](https://supabase.com/docs/reference/cli/supabase-db-push)
