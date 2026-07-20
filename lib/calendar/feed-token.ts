import { createHmac, timingSafeEqual } from "crypto"

function getCalendarFeedSecret() {
  return (
    process.env.CALENDAR_FEED_SECRET ||
    process.env.CRON_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    null
  )
}

function safeEqualStrings(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function createCalendarFeedToken(resourceType: string, resourceId: string) {
  const secret = getCalendarFeedSecret()
  if (!secret) return null
  return createHmac("sha256", secret)
    .update(`${resourceType}:${resourceId}`)
    .digest("hex")
    .slice(0, 32)
}

export function isValidCalendarFeedToken({
  resourceType,
  resourceId,
  token,
  storedToken,
}: {
  resourceType: string
  resourceId: string
  token: string | null | undefined
  storedToken?: string | null | undefined
}) {
  if (!token) return false

  if (storedToken && safeEqualStrings(token, String(storedToken)))
    return true

  const expected = createCalendarFeedToken(resourceType, resourceId)
  if (!expected) return false
  return safeEqualStrings(token, expected)
}

export function getStoredCalendarToken(settings: unknown) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings))
    return null
  const record = settings as Record<string, unknown>
  const token = record.calendar_token ?? record.ical_token
  return typeof token === "string" && token.length > 0 ? token : null
}
