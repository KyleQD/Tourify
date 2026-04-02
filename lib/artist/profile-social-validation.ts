/**
 * Normalize and validate social / link fields for artist profile saves.
 * Instagram and Twitter accept @handles or full URLs; other links expect URLs.
 */

const MAX_GENRES = 8

export function normalizeGenreList(input: unknown): string[] {
  if (Array.isArray(input)) {
    const cleaned = input.map(g => String(g).trim()).filter(Boolean)
    return [...new Set(cleaned)].slice(0, MAX_GENRES)
  }
  if (typeof input === "string" && input.trim()) {
    return [input.trim()]
  }
  return []
}

/** Strip @ for storage; keep URL as-is */
export function normalizeHandleOrUrl(value: string): string {
  const v = value.trim()
  if (!v) return ""
  if (v.startsWith("@")) return v.slice(1)
  return v
}

function isLikelyHandle(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (v.startsWith("@")) return true
  if (!v.includes("://") && !v.includes(".") && /^[a-zA-Z0-9_]{1,32}$/.test(v)) return true
  return false
}

export function isValidHttpLikeUrl(value: string): boolean {
  if (!value?.trim()) return true
  try {
    const urlToTest =
      value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`
    const parsed = new URL(urlToTest)
    if (!parsed.hostname || parsed.hostname.length < 3) return false
    if (!parsed.hostname.includes(".")) return false
    return true
  } catch {
    return false
  }
}

export function validateSocialField(
  field: "website" | "instagram" | "twitter" | "youtube" | "spotify",
  value: string
): string | null {
  const v = value?.trim() ?? ""
  if (!v) return null
  if (field === "instagram" || field === "twitter") {
    if (isLikelyHandle(v)) return null
    return isValidHttpLikeUrl(v) ? null : `Invalid ${field} — use @handle or a full URL`
  }
  return isValidHttpLikeUrl(v) ? null : `Invalid ${field} URL`
}

export function normalizeSocialLinksForStorage(input: {
  website: string
  instagram: string
  twitter: string
  youtube: string
  spotify: string
}): {
  website: string
  instagram: string
  twitter: string
  youtube: string
  spotify: string
} {
  return {
    website: input.website.trim(),
    instagram: normalizeHandleOrUrl(input.instagram),
    twitter: normalizeHandleOrUrl(input.twitter),
    youtube: input.youtube.trim(),
    spotify: input.spotify.trim()
  }
}
