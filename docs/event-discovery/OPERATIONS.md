# Event Discovery — Operations Runbook

## Scheduled jobs

| Job | Schedule | Auth | Purpose |
|---|---|---|---|
| `POST /api/cron/events/sync` | `17 */6 * * *` (Vercel Cron) | `Authorization: Bearer ${CRON_SECRET}` | Claims up to 5 queued `event_sync_jobs`, recovers stale locks (>5 min), executes provider sync, records `event_sync_runs` |

### Enqueue a Ticketmaster market sync

```sql
insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload)
values (
  'ticketmaster',
  'market_sync',
  'ticketmaster:market:las-vegas:2026-09',
  '{"city":"Las Vegas","stateCode":"NV","countryCode":"US","latitude":36.17,"longitude":-115.14,"radiusMiles":25,"maxPages":2}'::jsonb
);
```

Scope markets deliberately — never enqueue a national crawl.

### Enqueue a Bandsintown artist sync

```sql
insert into public.event_sync_jobs (provider, job_type, dedupe_key, payload)
values ('bandsintown', 'artist_sync', 'bandsintown:artist:<connection-id>',
        jsonb_build_object('connectionId', '<connection-id>'));
```

Connections self-schedule via `next_sync_at` after verification; use manual
enqueue only for catch-up.

## Failure handling

- **429 / rate limit**: jobs back off exponentially (1m → 2m → … → 30m cap) and go `dead` after `max_attempts`. No retry storm is possible; the client also honors `Retry-After` once inline.
- **Daily budget exhausted**: limiter returns `-1`; job fails with `RATE_LIMITED` and retries next day. A 500-request reserve is always protected for user-triggered searches.
- **Stale locks**: any `running` job locked >5 min is re-queued automatically at the start of each cron pass.
- **Dead jobs**: inspect in admin → Events → Sync (`/admin/dashboard/events/sync`) or `select * from event_sync_jobs where status='dead'`; fix the cause, then requeue (`status='queued', attempt_count=0`).

## Provider health

- Admin → Events → Providers (`/admin/dashboard/events/providers`): flag state, Bandsintown mode, config issues, live health check (Ticketmaster 1-event probe).
- `validateProviderConfig()` runs at cron entry and returns 503 with issues when a flag is on but its secret is missing.

## Disabling a provider

- Set `EVENT_PROVIDER_TICKETMASTER=false` (or remove the key). Ingest stops; existing canonical events (including imported ones) remain published. Native events are never affected.
- Set `BANDSINTOWN_MODE=disabled`. Connections stop syncing; imported dates remain.

## Index rebuild

The discovery index is rebuilt idempotently:

```ts
// server context (service role)
import { backfillNativeEvents } from "@/lib/events/discovery-index"
await backfillNativeEvents(500) // batched, upsert-based, safe to re-run
```

Per-event reindex happens automatically on ingest. A full provider re-sync
is just another `market_sync` enqueue — upserts are idempotent.

## Source expiration & data removal

- Source records carry `expires_at` (terms-aware refresh window).
- Provider payload storage is the minimal normalized projection only; raw payloads are never stored by default.
- To remove a provider's data entirely: delete from `event_external_sources where provider='<p>'` (cascades nothing to canonical events — verify review first), then re-run the native backfill.

## Monitoring checklist (daily during pilot)

1. `event_sync_runs` — failures and zero-receive runs.
2. `event_sync_jobs` — `dead` count.
3. `rate_limit_remaining` on the latest run per provider.
4. Admin duplicates queue depth (`event_merge_candidates` pending).

## Security checks

- `bash scan-for-secrets.sh`
- `npm run check:service-role-allowlist` (new modules registered in `lib/supabase/service-role-legacy-imports.json`)
- `npm run check:admin-route-registry` (new admin routes registered)
- Provider keys must never appear in client bundles: keys have no `NEXT_PUBLIC_` variant and are read only in `server-only` modules.
