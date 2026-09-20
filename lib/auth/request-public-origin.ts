import type { NextRequest } from "next/server"
import { getConfiguredPublicSiteOrigin } from "@/lib/auth/public-site-origin"

/**
 * Public origin for redirects after auth (email links, OAuth, PKCE callback).
 * Prefer proxy headers on Vercel / behind CDNs so links match the URL users see.
 */
export function getRequestPublicOrigin(request: NextRequest): string {
  const hasConfiguredOrigin = Boolean(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.VERCEL_URL?.trim(),
  )
  if (hasConfiguredOrigin || process.env.NODE_ENV === "production") {
    return getConfiguredPublicSiteOrigin()
  }

  // Local/test environments commonly run on an ephemeral port. Production
  // never trusts request or forwarded host headers for an auth redirect.
  return request.nextUrl.origin
}
