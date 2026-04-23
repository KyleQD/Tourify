import * as Sentry from "@sentry/nextjs"

/** Shared Sentry options for Node, Edge, and browser runtimes. No-op when SENTRY_DSN is unset. */
export function initSentryForRuntime(): void {
  const dsn = (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)?.trim()
  if (!dsn) return

  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.05")
  const sample = Number.isFinite(tracesSampleRate) ? Math.min(1, Math.max(0, tracesSampleRate)) : 0.05

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: sample,
    sendDefaultPii: false,
  })
}
