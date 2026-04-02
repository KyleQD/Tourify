/**
 * Canonical public profile URLs (same paths visitors use).
 * Does not use the legacy "user" placeholder from getProfileUsername(null).
 */

export interface GeneralProfileInput {
  username?: string | null
  metadataUsername?: string | null
  /** Main profile row on general multi-account */
  generalAccountProfileUsername?: string | null
}

export interface VenuePublicInput {
  id: string
  url_slug?: string | null
}

export function getGeneralPublicProfilePath(input: GeneralProfileInput): string | null {
  const u =
    input.username?.trim() ||
    input.metadataUsername?.trim() ||
    input.generalAccountProfileUsername?.trim()
  if (!u) return null
  return `/profile/${encodeURIComponent(u)}`
}

export function getArtistPublicProfilePath(artistName: string | null | undefined): string | null {
  const a = artistName?.trim()
  if (!a) return null
  return `/artist/${encodeURIComponent(a)}`
}

/**
 * Prefer DB url_slug when present; otherwise venue UUID (public API accepts both).
 */
export function getVenuePublicProfilePath(venue: VenuePublicInput): string | null {
  if (!venue?.id) return null
  const segment = (venue.url_slug && String(venue.url_slug).trim()) || venue.id
  return `/venues/${encodeURIComponent(segment)}`
}

export function getOrganizationPublicProfilePath(username: string | null | undefined): string | null {
  const u = username?.trim()
  if (!u) return null
  return `/organization/${encodeURIComponent(u)}`
}
