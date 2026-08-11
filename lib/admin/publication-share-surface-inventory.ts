/**
 * PUB-208 — Share surface inventory and Admin-URL share guard.
 * Tour / event / advance / map / day-sheet sharing must use scoped share tokens
 * (publication `/p/...`, advance `/advance/...`, map `/site-maps/shared/...`)
 * and must never present authenticated Admin routes as the share action.
 */

export const PUBLICATION_SHARE_SURFACES = [
  {
    id: "tour",
    label: "Tour",
    adminPathPattern: "/admin/dashboard/tours/",
    shareMechanism: "publication_share_link",
    publicPathPrefix: "/p/",
    status: "publication_service",
  },
  {
    id: "event",
    label: "Event",
    adminPathPattern: "/admin/dashboard/events/",
    shareMechanism: "publication_share_link",
    publicPathPrefix: "/p/",
    status: "publication_service",
  },
  {
    id: "advance",
    label: "Advance",
    adminPathPattern: "/admin/dashboard/events/",
    shareMechanism: "advance_share_token",
    publicPathPrefix: "/advance/",
    status: "scoped_token",
  },
  {
    id: "map",
    label: "Site map",
    adminPathPattern: "/admin/dashboard/logistics/",
    shareMechanism: "site_map_share_token",
    publicPathPrefix: "/site-maps/shared/",
    status: "scoped_token",
  },
  {
    id: "day_sheet",
    label: "Day sheet",
    adminPathPattern: "/admin/dashboard/events/",
    shareMechanism: "publication_share_link",
    publicPathPrefix: "/p/",
    status: "publication_service",
  },
] as const

export type PublicationShareSurfaceId = (typeof PUBLICATION_SHARE_SURFACES)[number]["id"]

const ALLOWED_PUBLIC_SHARE_PREFIXES = [
  "/p/",
  "/advance/",
  "/site-maps/shared/",
  "/api/publication/shared/",
] as const

/**
 * True when a copied/shared URL is an authenticated Admin dashboard path
 * (misleading as a share link for external recipients).
 */
export function isMisleadingAdminShareUrl(urlOrPath: string): boolean {
  const value = urlOrPath.trim()
  if (!value) return false

  let pathname = value
  try {
    if (/^https?:\/\//i.test(value)) pathname = new URL(value).pathname
  } catch {
    pathname = value.split("?")[0] || value
  }

  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`
  if (ALLOWED_PUBLIC_SHARE_PREFIXES.some((prefix) => normalized.startsWith(prefix)))
    return false

  return (
    normalized.startsWith("/admin/") ||
    normalized.startsWith("/api/admin/")
  )
}

export function assertScopedShareUrl(urlOrPath: string): {
  ok: true
} | { ok: false; reason: "misleading_admin_url" | "empty" } {
  if (!urlOrPath.trim()) return { ok: false, reason: "empty" }
  if (isMisleadingAdminShareUrl(urlOrPath))
    return { ok: false, reason: "misleading_admin_url" }
  return { ok: true }
}

export function resolveAdvanceShareNotificationUrl(input: {
  shareToken?: string | null
  eventId: string
}): string | null {
  const token = input.shareToken?.trim()
  if (token) return `/advance/${token}`
  // Never fall back to an Admin advancing URL for recipient notifications.
  return null
}

export function listPublicationShareSurfaces() {
  return PUBLICATION_SHARE_SURFACES.map((row) => ({ ...row }))
}
