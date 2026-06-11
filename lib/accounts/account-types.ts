/**
 * Canonical account type definitions for Tourify.
 *
 * Single source of truth for ProfileType. Import from here everywhere.
 * Legacy imports from lib/services/account-management.service re-export this.
 */

/**
 * All recognized account / persona types.
 *
 * - general      : The authenticated individual (tied to email login)
 * - artist       : Music / creative persona with own feed and bookings
 * - service      : Service provider persona (photographer, dancer, DJ, etc.)
 * - venue        : Physical / logical space with its own feed and events
 * - organization : Company, vendor, promoter (code alias: 'admin' accepted)
 * - admin        : Legacy alias for organization — accepted in inputs, never emitted
 * - staff        : Deprecated switcher type — maps to Work Mode (Phase 4)
 */
export type ProfileType =
  | 'general'
  | 'artist'
  | 'service'
  | 'venue'
  | 'organization'
  | 'admin'   // legacy alias — normalizes to 'organization'
  | 'staff'   // deprecated — removed from switcher in Phase 4

/** Types that appear as selectable entities in the account switcher (Phase 1). */
export const SWITCHER_ACCOUNT_TYPES = ['general', 'artist', 'service', 'venue', 'organization', 'admin'] as const
export type SwitcherAccountType = (typeof SWITCHER_ACCOUNT_TYPES)[number]

/** Display labels for each type. */
export const ACCOUNT_TYPE_LABELS: Record<ProfileType, string> = {
  general:      'Personal',
  artist:       'Artist',
  service:      'Service Provider',
  venue:        'Venue',
  organization: 'Organization',
  admin:        'Organization', // legacy
  staff:        'Staff',        // deprecated
}

/** Posted-by type used in artist_jobs schema. Maps acting entity to the jobs column. */
export const ACCOUNT_TYPE_TO_POSTED_BY_TYPE: Partial<Record<ProfileType, string>> = {
  artist:       'artist',
  service:      'artist',
  venue:        'venue',
  organization: 'organizer',
  admin:        'organizer',
  general:      'artist', // general posting a gig
}

/**
 * Normalize an incoming account type string to a canonical ProfileType.
 * Converts legacy `admin` to `organization`.
 * Falls back to `general` for unknown values.
 */
export function normalizeAccountType(raw: string | null | undefined): ProfileType {
  if (!raw) return 'general'
  if (raw === 'admin') return 'organization'
  const valid: ProfileType[] = ['general', 'artist', 'service', 'venue', 'organization', 'staff']
  return valid.includes(raw as ProfileType) ? (raw as ProfileType) : 'general'
}

/**
 * Whether a given account type is still the legacy `admin` string.
 * Useful for queries that must search `organizer_accounts` using the DB column name.
 */
export function isOrganizationType(type: string | null | undefined): boolean {
  return type === 'admin' || type === 'organization'
}

/** Whether the type controls a public entity page (artist/venue/org). */
export function isEntityType(type: string | null | undefined): boolean {
  return type === 'artist' || type === 'service' || type === 'venue' || isOrganizationType(type)
}

/** Whether the type can appear as a `posted_by_type` on artist_jobs. */
export function getPostedByType(accountType: string | null | undefined): string {
  return ACCOUNT_TYPE_TO_POSTED_BY_TYPE[normalizeAccountType(accountType)] ?? 'artist'
}
