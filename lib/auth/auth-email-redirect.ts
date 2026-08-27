import { getConfiguredPublicSiteOrigin } from "@/lib/auth/public-site-origin"

function getAuthCallbackSignupPath(redirectTo?: string): string {
  const safeRedirect = redirectTo?.startsWith('/') && !redirectTo.startsWith('//')
    ? redirectTo
    : '/login'
  return `/auth/callback?type=signup&redirectTo=${encodeURIComponent(safeRedirect)}`
}

/**
 * Builds the `emailRedirectTo` URL for Supabase email confirmation / magic links.
 * Prefer NEXT_PUBLIC_SITE_URL when it matches the current host (e.g. apex vs www)
 * so the URL stays on the canonical origin configured in Supabase redirect allow lists.
 */
export function getAuthSignUpEmailRedirectTo(redirectTo?: string): string {
  const callbackPath = getAuthCallbackSignupPath(redirectTo)
  if (typeof window === "undefined")
    return `${getConfiguredPublicSiteOrigin()}${callbackPath}`

  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (envOrigin) {
    try {
      const envHost = new URL(envOrigin).hostname.replace(/^www\./, "")
      const winHost = new URL(window.location.origin).hostname.replace(/^www\./, "")
      if (envHost === winHost) return `${envOrigin}${callbackPath}`
    } catch {
      /* noop */
    }
  }

  return `${window.location.origin}${callbackPath}`
}
