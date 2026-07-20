import * as Sentry from "@sentry/react-native"
import Constants from "expo-constants"
import { getReleaseContext } from "@/lib/observability/logger"

let isInitialized = false

export function initSentry() {
  if (isInitialized) return

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN
  if (!dsn) {
    console.info("[Mobile] Sentry DSN not configured; crash reporting disabled")
    return
  }

  const release = getReleaseContext()

  Sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    debug: false,
    environment: release.buildEnvironment,
    release: `${Constants.expoConfig?.slug || "tourify-mobile"}@${release.appVersion}`,
    dist: release.runtimeVersion,
    tracesSampleRate: release.buildEnvironment === "production" ? 0.15 : 0.0,
  })

  Sentry.setTags({
    releaseChannel: release.releaseChannel,
    runtimeVersion: release.runtimeVersion,
    buildEnvironment: release.buildEnvironment,
  })

  ;(globalThis as unknown as { Sentry?: typeof Sentry }).Sentry = Sentry
  isInitialized = true
}

export function setSentryUser(user: { id: string; email?: string | null } | null) {
  if (!isInitialized) return
  if (!user) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({ id: user.id, email: user.email || undefined })
}
