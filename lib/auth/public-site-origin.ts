/**
 * Canonical site origin when `window` is unavailable (SSR, API, services).
 * Used for email confirmation `emailRedirectTo` so links match deployed URLs.
 */
export function getConfiguredPublicSiteOrigin(): string {
  const explicit = normalizeHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  if (explicit) return explicit

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const normalized = normalizeHttpOrigin(
      vercel.startsWith("http://") || vercel.startsWith("https://")
        ? vercel
        : `https://${vercel}`,
    )
    if (normalized) return normalized
  }

  return "http://localhost:3000"
}

function normalizeHttpOrigin(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  try {
    const parsed = new URL(value.trim())
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    if (parsed.username || parsed.password) return null
    return parsed.origin
  } catch {
    return null
  }
}
