/**
 * Normalize and validate social / link fields for artist profile saves.
 * Handle platforms accept @handles or full URLs; other links expect URLs.
 */

const MAX_GENRES = 8

export const CANONICAL_SOCIAL_FIELDS = [
  'website',
  'instagram',
  'twitter',
  'youtube',
  'tiktok',
  'facebook',
  'spotify',
  'apple_music',
  'soundcloud',
] as const

export type CanonicalSocialField = (typeof CANONICAL_SOCIAL_FIELDS)[number]

export interface CanonicalSocialLinks {
  website: string
  instagram: string
  twitter: string
  youtube: string
  tiktok: string
  facebook: string
  spotify: string
  apple_music: string
  soundcloud: string
}

const HANDLE_FIELDS = new Set<CanonicalSocialField>([
  'instagram',
  'twitter',
  'tiktok',
  'facebook',
])

export function normalizeGenreList(input: unknown): string[] {
  if (Array.isArray(input)) {
    const cleaned = input.map(g => String(g).trim()).filter(Boolean)
    return [...new Set(cleaned)].slice(0, MAX_GENRES)
  }
  if (typeof input === 'string' && input.trim()) {
    return [input.trim()]
  }
  return []
}

/** Strip @ for storage; keep URL as-is */
export function normalizeHandleOrUrl(value: string): string {
  const v = value.trim()
  if (!v) return ''
  if (v.startsWith('@')) return v.slice(1)
  return v
}

function isLikelyHandle(value: string): boolean {
  const v = value.trim()
  if (!v) return false
  if (v.startsWith('@')) return true
  if (!v.includes('://') && !v.includes('.') && /^[a-zA-Z0-9_.]{1,64}$/.test(v)) return true
  return false
}

export function isValidHttpLikeUrl(value: string): boolean {
  if (!value?.trim()) return true
  try {
    const urlToTest =
      value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
    const parsed = new URL(urlToTest)
    if (!parsed.hostname || parsed.hostname.length < 3) return false
    if (!parsed.hostname.includes('.')) return false
    return true
  } catch {
    return false
  }
}

export function validateSocialField(
  field: CanonicalSocialField,
  value: string
): string | null {
  const v = value?.trim() ?? ''
  if (!v) return null
  if (HANDLE_FIELDS.has(field)) {
    if (isLikelyHandle(v)) return null
    return isValidHttpLikeUrl(v) ? null : `Invalid ${field} — use @handle or a full URL`
  }
  return isValidHttpLikeUrl(v) ? null : `Invalid ${field} URL`
}

export function emptyCanonicalSocialLinks(): CanonicalSocialLinks {
  return {
    website: '',
    instagram: '',
    twitter: '',
    youtube: '',
    tiktok: '',
    facebook: '',
    spotify: '',
    apple_music: '',
    soundcloud: '',
  }
}

export function normalizeSocialLinksForStorage(
  input: Partial<CanonicalSocialLinks>
): CanonicalSocialLinks {
  const next = emptyCanonicalSocialLinks()
  for (const field of CANONICAL_SOCIAL_FIELDS) {
    const raw = String(input[field] ?? '').trim()
    next[field] = HANDLE_FIELDS.has(field) ? normalizeHandleOrUrl(raw) : raw
  }
  return next
}

/** Merge existing links with updates so unrelated keys are preserved. */
export function mergeSocialLinksForStorage(
  existing: Record<string, string> | null | undefined,
  updates: Partial<CanonicalSocialLinks>
): Record<string, string> {
  const base = { ...(existing || {}) }
  const normalized = normalizeSocialLinksForStorage({
    ...emptyCanonicalSocialLinks(),
    ...base,
    ...updates,
  })
  return {
    ...base,
    ...normalized,
  }
}
