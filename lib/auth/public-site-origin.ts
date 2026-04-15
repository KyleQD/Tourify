/**
 * Canonical site origin when `window` is unavailable (SSR, API, services).
 * Used for email confirmation `emailRedirectTo` so links match deployed URLs.
 */
export function getConfiguredPublicSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim()
  if (explicit) return explicit

  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "").trim()
  if (vercel) {
    if (vercel.startsWith("http://") || vercel.startsWith("https://")) return vercel
    return `https://${vercel}`
  }

  return "http://localhost:3000"
}
