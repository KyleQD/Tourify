# Load testing (staged + soak)

## Quick smoke (repo script)

[`scripts/load-test-smoke.ts`](../scripts/load-test-smoke.ts) runs concurrent **GET** requests against `BASE_URL` (or `PRODUCTION_BASE_URL`).

```bash
BASE_URL=https://demo.tourify.live CONCURRENCY=20 REQUESTS=200 npm run test:load-smoke
```

Tune `MAX_FAILURE_RATE` (default `0.05`) if you expect occasional 429/503 during stress.

## Staged ramp (recommended next step)

For auth, feed, and messaging you will eventually want **k6**, **Artillery**, or **Grafana k6 Cloud** with:

1. **Ramp** users over minutes (not a step jump).
2. **Soak** at target RPS for 30–120 minutes to catch connection leaks.
3. **Separate** authenticated scenarios (token in env) from anonymous.

Record **p95/p99 latency** and error rate; file a remediation backlog from results.

## Related docs

- [Supabase migrations CI](./supabase-migrations-ci.md)
- [Postgres pooler + RLS audit](./postgres-pooler-rls-audit.md)
- [Async + caching + Realtime](./async-caching-realtime.md)
