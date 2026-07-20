import Constants from "expo-constants"

interface LogContext {
  feature?: string
  userId?: string
  [key: string]: unknown
}

interface ReleaseContext {
  appVersion: string
  runtimeVersion: string
  releaseChannel: string
  buildEnvironment: string
}

const releaseContext = buildReleaseContext()

export function logInfo(message: string, context: LogContext = {}) {
  console.log(`[Mobile] ${message}`, mergeContext(context))
}

export function logError(message: string, error: unknown, context: LogContext = {}) {
  console.error(`[Mobile] ${message}`, mergeContext({ ...context, error }))
  captureException(error, { ...context, message })
}

// Hook point for Sentry/Crashlytics integration in production builds.
export function captureException(error: unknown, context: LogContext = {}) {
  const payload = mergeContext({ ...context, error })
  console.error("[Mobile] captureException", payload)

  const sentryCapture = (globalThis as unknown as {
    Sentry?: {
      captureException?: (value: unknown, hint?: unknown) => void
    }
  }).Sentry?.captureException

  if (sentryCapture) {
    sentryCapture(error, {
      tags: {
        appVersion: releaseContext.appVersion,
        runtimeVersion: releaseContext.runtimeVersion,
        releaseChannel: releaseContext.releaseChannel,
        buildEnvironment: releaseContext.buildEnvironment,
        feature: context.feature,
      },
      extra: payload,
      user: context.userId ? { id: String(context.userId) } : undefined,
    })
  }
}

export function getReleaseContext() {
  return releaseContext
}

function mergeContext(context: LogContext) {
  return {
    ...releaseContext,
    ...context,
  }
}

function buildReleaseContext(): ReleaseContext {
  const appVersion = String(Constants.expoConfig?.version || "unknown")
  const runtimeVersion = String(Constants.expoConfig?.runtimeVersion || "unknown")
  const releaseChannel = String(
    Constants.expoConfig?.extra?.eas?.channel ||
      process.env.EXPO_PUBLIC_RELEASE_CHANNEL ||
      "unknown"
  )
  const buildEnvironment = String(process.env.EXPO_PUBLIC_APP_ENV || "development")

  return {
    appVersion,
    runtimeVersion,
    releaseChannel,
    buildEnvironment,
  }
}
