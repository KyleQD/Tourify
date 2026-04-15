import type { NextRequest } from "next/server"

/**
 * Public origin for redirects after auth (email links, OAuth, PKCE callback).
 * Prefer proxy headers on Vercel / behind CDNs so links match the URL users see.
 */
export function getRequestPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
  if (forwardedHost) {
    const proto =
      forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https"
    return `${proto}://${forwardedHost}`
  }
  return request.nextUrl.origin
}
