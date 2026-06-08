import * as Sentry from "@sentry/nextjs"
import { validateEnv } from "@/lib/utils/env-check"

export async function register() {
  const { valid, missing } = validateEnv()
  if (!valid) {
    console.error(`[env-check] Missing required environment variables: ${missing.join(', ')}`)
  }

  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config")
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config")
}

export const onRequestError = Sentry.captureRequestError
