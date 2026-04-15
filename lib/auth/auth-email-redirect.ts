import { getConfiguredPublicSiteOrigin } from "@/lib/auth/public-site-origin"

const AUTH_CALLBACK_SIGNUP_PATH = "/auth/callback?type=signup&redirectTo=%2Flogin"

/**
 * Builds the `emailRedirectTo` URL for Supabase email confirmation / magic links.
 * Prefer NEXT_PUBLIC_SITE_URL when it matches the current host (e.g. apex vs www)
 * so the URL stays on the canonical origin configured in Supabase redirect allow lists.
 */
export function getAuthSignUpEmailRedirectTo(): string {
  if (typeof window === "undefined")
    return `${getConfiguredPublicSiteOrigin()}${AUTH_CALLBACK_SIGNUP_PATH}`

  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (envOrigin) {
    try {
      const envHost = new URL(envOrigin).hostname.replace(/^www\./, "")
      const winHost = new URL(window.location.origin).hostname.replace(/^www\./, "")
      if (envHost === winHost) return `${envOrigin}${AUTH_CALLBACK_SIGNUP_PATH}`
    } catch {
      /* noop */
    }
  }

  return `${window.location.origin}${AUTH_CALLBACK_SIGNUP_PATH}`
}
