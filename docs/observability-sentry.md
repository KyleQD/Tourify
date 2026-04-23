# Observability: Sentry

The app initializes **[@sentry/nextjs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)** when a DSN is configured.

## Environment variables (Vercel / local)

| Variable | Where it works | Notes |
|----------|----------------|--------|
| `SENTRY_DSN` | **Server + Edge** | Set in Vercel for API routes and SSR. |
| `NEXT_PUBLIC_SENTRY_DSN` | **Client + server** | Optional; use if you want browser error reporting (DSN is not a secret in the classic sense but exposes your project endpoint). |
| `SENTRY_TRACES_SAMPLE_RATE` | All | Default `0.05`. Set `0` to disable performance traces. |

If **no DSN** is set, Sentry does not initialize (no overhead).

## Files

- [`instrumentation.ts`](../instrumentation.ts) — registers server/edge SDK and `onRequestError`.
- [`sentry.server.config.ts`](../sentry.server.config.ts), [`sentry.edge.config.ts`](../sentry.edge.config.ts), [`sentry.client.config.ts`](../sentry.client.config.ts) — runtime entrypoints.
- [`lib/observability/sentry.shared.ts`](../lib/observability/sentry.shared.ts) — shared `Sentry.init` options.
- [`app/global-error.tsx`](../app/global-error.tsx) — captures non-privacy-related root errors.

## Alerts and dashboards

Configure **alerts** (error rate, new issues) in the Sentry project UI. Complement with **Vercel** deployment logs and **Supabase** project metrics for a full picture.
