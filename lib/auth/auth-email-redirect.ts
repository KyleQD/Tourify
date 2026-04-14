/**
 * Builds the `emailRedirectTo` URL for Supabase email confirmation / magic links.
 * Prefer NEXT_PUBLIC_SITE_URL when it matches the current host (e.g. apex vs www)
 * so the URL stays on the canonical origin configured in Supabase redirect allow lists.
 */
export function getAuthSignUpEmailRedirectTo(): string {
  const path = '/auth/callback?type=signup&redirectTo=%2Flogin'

  if (typeof window === 'undefined') {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://tourify.live'
    return `${base}${path}`
  }

  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (envOrigin) {
    try {
      const envHost = new URL(envOrigin).hostname.replace(/^www\./, '')
      const winHost = new URL(window.location.origin).hostname.replace(/^www\./, '')
      if (envHost === winHost) return `${envOrigin}${path}`
    } catch {
      /* noop */
    }
  }

  return `${window.location.origin}${path}`
}
