import { validateEnv } from "@/lib/utils/env-check"

export async function register() {
  const { valid, missing } = validateEnv()
  if (!valid) {
    console.error(`[env-check] Missing required environment variables: ${missing.join(', ')}`)
  }

  if (process.env.NODE_ENV === "development") return

  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config")
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config")
}

export async function onRequestError(...args: unknown[]) {
  if (process.env.NODE_ENV === "development") return
  const Sentry = await import("@sentry/nextjs")
  return (Sentry.captureRequestError as (...a: unknown[]) => unknown)(...args)
}
