/**
 * Canonical public profile URLs (same paths visitors use).
 * Does not use the legacy "user" placeholder from getProfileUsername(null).
 */

import { normalizeAccountType } from '@/lib/accounts/account-types'

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

export interface ResolvePublicProfileInput {
  id: string
  username?: string | null
  account_type?: string | null
  subtype?: string | null
}

export function getGeneralPublicProfilePath(input: GeneralProfileInput): string | null {
  const u =
    input.username?.trim() ||
    input.metadataUsername?.trim() ||
    input.generalAccountProfileUsername?.trim()
  if (!u) return null
  return `/profile/${encodeURIComponent(u)}`
}

/**
 * Build the public artist path. Prefer `artist_profiles.url_slug` (canonical handle).
 * Do not pass a raw display name with spaces when a slug is available.
 */
export function getArtistPublicProfilePath(artistHandle: string | null | undefined): string | null {
  const a = artistHandle?.trim()
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

/**
 * Public organization brand path. Prefer `organizer_accounts.url_slug`.
 */
export function getOrganizationPublicProfilePath(slug: string | null | undefined): string | null {
  const s = slug?.trim()
  if (!s) return null
  return `/organization/${encodeURIComponent(s)}`
}

/**
 * Resolve a public profile path from a social/search user payload.
 * Mirrors getAccountAuthorPath account-type routing with canonical venue paths.
 */
export function resolvePublicProfilePath(input: ResolvePublicProfileInput): string | null {
  const username = input.username?.trim() || null
  if (!username && !input.id) return null

  switch (normalizeAccountType(input.account_type)) {
    case 'artist':
    case 'service':
      return getArtistPublicProfilePath(username)
    case 'venue':
      return getVenuePublicProfilePath({ id: input.id, url_slug: username })
    case 'organization':
      if (input.subtype === 'band') return getArtistPublicProfilePath(username)
      return getOrganizationPublicProfilePath(username)
    default:
      return getGeneralPublicProfilePath({ username })
  }
}
