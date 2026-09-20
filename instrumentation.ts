import { assertProductionEnvironment } from "@/lib/config/environment-contract"

let productionEnvironmentValidated = false
let operationalReadinessWarned = false

/**
 * Fail-loud operational readiness check: production must not silently run
 * without error tracking or rate limiting (AUDIT C6/L16/H9).
 */
function warnOnMissingOperationalConfig() {
  if (operationalReadinessWarned || process.env.NODE_ENV !== 'production') return
  operationalReadinessWarned = true

  const missing: string[] = []
  if (!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)?.trim()) {
    missing.push('SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN (error tracking is OFF)')
  }
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    missing.push('UPSTASH_REDIS_REST_URL/TOKEN (rate limiting is INACTIVE)')
  }
  if (!process.env.RESEND_API_KEY) {
    missing.push('RESEND_API_KEY (transactional email will be skipped)')
  }
  if (missing.length > 0) {
    console.warn(
      `[ops-readiness] Production is starting with degraded capabilities:\n  - ${missing.join('\n  - ')}`,
    )
  }
}

export async function register() {
  if (process.env.NODE_ENV === "production" && !productionEnvironmentValidated) {
    assertProductionEnvironment("runtime")
    productionEnvironmentValidated = true
  }

  if (process.env.NODE_ENV === "development") return

  warnOnMissingOperationalConfig()

  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config")
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config")
}

export async function onRequestError(...args: unknown[]) {
  if (process.env.NODE_ENV === "development") return
  const Sentry = await import("@sentry/nextjs")
  return (Sentry.captureRequestError as (...a: unknown[]) => unknown)(...args)
}
