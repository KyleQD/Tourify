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
 * - organization : Public brand (band, label, promoter, agency, …). Subtypes live on organizer_accounts.subtype.
 * - admin        : Legacy alias for organization — accepted in inputs, never emitted
 * - staff        : Deprecated switcher type — maps to Work Mode (Phase 4)
 *
 * Tour manager is not a ProfileType — it is a General user with Admin/Work Mode grants.
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
 * Converts legacy `admin`, `organizer`, and `business` to `organization` for routing/display.
 * Falls back to `general` for unknown values.
 * Do not persist the normalized value back to sessions without a data migration.
 */
export function normalizeAccountType(raw: string | null | undefined): ProfileType {
  if (!raw) return 'general'
  if (raw === 'admin' || raw === 'organizer' || raw === 'business') return 'organization'
  const valid: ProfileType[] = ['general', 'artist', 'service', 'venue', 'organization', 'staff']
  return valid.includes(raw as ProfileType) ? (raw as ProfileType) : 'general'
}

/**
 * Dual-compat org persona gate. Accepts legacy `admin` and canonical `organization`.
 * Also treats DB search aliases `organizer` / `business` as organization for UI/API branches.
 * Never replace with `=== 'organization'` only — legacy sessions still store `admin`.
 */
export function isOrganizationType(type: string | null | undefined): boolean {
  return (
    type === 'admin' ||
    type === 'organization' ||
    type === 'organizer' ||
    type === 'business'
  )
}

/** Account-type values that may appear in `accounts.account_type` for org brands. */
export const ORGANIZATION_ACCOUNT_TYPE_ALIASES = [
  'organization',
  'organizer',
  'business',
  'admin',
] as const

/** Whether the type controls a public entity page (artist/venue/org). */
export function isEntityType(type: string | null | undefined): boolean {
  return type === 'artist' || type === 'service' || type === 'venue' || isOrganizationType(type)
}

/** Whether the type can appear as a `posted_by_type` on artist_jobs. */
export function getPostedByType(accountType: string | null | undefined): string {
  return ACCOUNT_TYPE_TO_POSTED_BY_TYPE[normalizeAccountType(accountType)] ?? 'artist'
}
