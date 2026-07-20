/**
 * Normalize push notification deep-link payloads into Expo Router hrefs.
 * Accepts absolute tourify:// / https://tourify.app URLs or relative app paths.
 */
export function resolvePushNotificationHref(rawUrl: unknown): string | null {
  if (typeof rawUrl !== "string") return null

  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("/")) return trimmed

  try {
    if (/^tourify:\/\//i.test(trimmed)) {
      const withoutScheme = trimmed.replace(/^tourify:\/\//i, "")
      const path = withoutScheme.startsWith("/") ? withoutScheme : `/${withoutScheme}`
      return path || "/"
    }

    const parsed = new URL(trimmed)
    if (parsed.protocol === "https:" && parsed.hostname === "tourify.app") {
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
      return path || "/"
    }
  } catch {
    return null
  }

  return null
}
