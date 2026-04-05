interface LogContext {
  feature?: string
  userId?: string
  [key: string]: unknown
}

export function logInfo(message: string, context: LogContext = {}) {
  console.log(`[Mobile] ${message}`, context)
}

export function logError(message: string, error: unknown, context: LogContext = {}) {
  console.error(`[Mobile] ${message}`, { error, ...context })
}

// Hook point for Sentry/Crashlytics integration in production builds.
export function captureException(error: unknown, context: LogContext = {}) {
  console.error("[Mobile] captureException", { error, ...context })
}
